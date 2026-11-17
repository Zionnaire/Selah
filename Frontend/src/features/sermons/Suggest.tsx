import {
  SUGGEST_KINDS,
  SUGGEST_LABEL,
  formatReference,
  getBook,
  newBlock,
  type Block,
  type PassageRef,
  type Section,
  type SermonDoc,
  type SuggestKind,
  type SuggestRequest,
  type SuggestResponse,
} from '@selah/domain';
import { Plus, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getDb } from '@/data/client';
import type { VerseRow } from '@/data/types';
import { api, ApiError } from '@/lib/api';
import { useOnline } from '@/lib/useOnline';
import { useAccount } from '@/store/account';
import { Grow } from './Blocks';

interface Card {
  key: string;
  heading: string;
  body: string;
  refs: PassageRef[];
  added: boolean;
}

const refKey = (r: PassageRef) => `${r.book}.${r.chapter}.${r.verseStart}.${r.verseEnd}`;
const uid = () => crypto.randomUUID();

const sectionText = (s: Section): string =>
  s.blocks
    .map((b) => (b.type === 'scripture' ? formatReference(b.ref) : b.type === 'story' ? `${b.title} ${b.text}` : b.text))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The default kind follows the section the preacher is working in. */
const kindFor = (title: string | undefined): SuggestKind =>
  /intro/i.test(title ?? '') ? 'introduction' : /conclu/i.test(title ?? '') ? 'conclusion' : 'point';

/** What the sermon already holds, sent only when the preacher asks. Short excerpts, never the whole manuscript. */
export function buildContext(doc: SermonDoc, active: Section | undefined): Omit<SuggestRequest, 'kind' | 'count'> {
  const seen = new Set<string>();
  const scriptures: PassageRef[] = [];
  for (const s of doc.sections) {
    for (const b of s.blocks) {
      if (b.type !== 'scripture' || seen.has(refKey(b.ref)) || scriptures.length >= 20) continue;
      seen.add(refKey(b.ref));
      scriptures.push(b.ref);
    }
  }
  return {
    topic: doc.topic?.trim() || undefined,
    title: doc.title.trim() || undefined,
    series: doc.series?.trim() || undefined,
    passage: doc.passage,
    scriptures,
    outline: doc.sections.slice(0, 20).map((s) => ({ title: s.title.slice(0, 200), excerpt: sectionText(s).slice(0, 600) })),
    section: active?.title.trim() || undefined,
  };
}

const hasContext = (c: ReturnType<typeof buildContext>) => !!c.topic || !!c.passage || c.scriptures.length > 0;

function describe(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.offline) return 'You are offline. Suggestions need internet. Your sermon is untouched.';
    if (err.status === 401) return 'Your session ended. Sign in again to use suggestions.';
    if (err.status === 429 && err.code === 'ai_limit') return err.message;
    if (err.status === 429) return 'Too many requests. Wait a moment and try again.';
    if (err.status === 502) return err.message;
    if (err.status === 503) return err.code === 'ai_unavailable' && /not (switched on|set up)/.test(err.message) ? err.message : 'Suggestions are not available right now. Try again in a moment.';
  }
  return 'Something went wrong. Try again.';
}

/** One supporting reference. Opening it shows the full verses from the Bible on this device. */
function RefChip({ r, translation, onRemove }: { r: PassageRef; translation: string; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [verses, setVerses] = useState<VerseRow[] | null>(null);

  useEffect(() => {
    if (!open || verses) return;
    const book = getBook(r.book);
    if (!book) return;
    void getDb()
      .verses([translation], book.order, r.chapter, r.verseStart, r.verseEnd === 0 ? 200 : r.verseEnd)
      .then((rows) => setVerses(rows.map(({ verse, text }) => ({ verse, text }))));
  }, [open, verses, r, translation]);

  return (
    <li className="sg-ref">
      <div className="sg-ref-row">
        <button className="sg-ref-open" aria-expanded={open} onClick={() => setOpen(!open)}>
          {formatReference(r)}
        </button>
        <button className="icon-btn" aria-label={`Remove ${formatReference(r)}`} onClick={onRemove}>
          <X size={14} aria-hidden />
        </button>
      </div>
      {open && (
        <blockquote className="sg-verses" aria-label={formatReference(r)}>
          {verses === null ? (
            <span className="muted small">Loading</span>
          ) : (
            verses.map((v) => (
              <p key={v.verse}>
                <sup>{v.verse}</sup> {v.text}
              </p>
            ))
          )}
        </blockquote>
      )}
    </li>
  );
}

interface Props {
  header: ReactNode;
  hidden: boolean;
  sheet: boolean;
  doc: SermonDoc;
  active: Section | undefined;
  translation: string;
  onAdd: (blocks: Block[]) => void;
}

/**
 * Suggested points, introductions and conclusions. Everything here is a proposal in the SELAH style:
 * editable, with each supporting passage open to read in full, and nothing enters the sermon until
 * the preacher presses Add.
 */
export function SuggestPanel({ header, hidden, sheet, doc, active, translation, onAdd }: Props) {
  const status = useAccount((s) => s.status);
  const online = useOnline();
  const location = useLocation();
  const [kind, setKind] = useState<SuggestKind>(() => kindFor(active?.title));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [left, setLeft] = useState<{ remaining: number; limit: number } | null>(null);

  useEffect(() => {
    if (!touched) setKind(kindFor(active?.title));
  }, [active?.title, touched]);

  const context = useMemo(() => buildContext(doc, active), [doc, active]);
  const ready = hasContext(context);

  const ask = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api<SuggestResponse>('/api/v1/ai/suggest', { method: 'POST', body: { ...context, kind, count: 3 } });
      // A reference only counts if its verses are in the Bible on this device, so the preacher can always read it.
      const checked = await Promise.all(
        res.suggestions.map(async (s) => {
          const refs: PassageRef[] = [];
          for (const r of s.refs) {
            const book = getBook(r.book);
            if (!book) continue;
            const rows = await getDb().verses([translation], book.order, r.chapter, r.verseStart, r.verseEnd === 0 ? 200 : r.verseEnd);
            if (rows.length) refs.push(r);
          }
          return { key: uid(), heading: s.heading, body: s.body, refs, added: false } satisfies Card;
        }),
      );
      setCards(checked);
      setLeft({ remaining: res.remaining, limit: res.limit });
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  };

  const patch = (key: string, change: Partial<Card>) => setCards((list) => list.map((c) => (c.key === key ? { ...c, ...change } : c)));

  /** The text becomes the preacher's own paragraph, followed by each Scripture they kept. */
  const add = (c: Card) => {
    const text = newBlock('text', uid());
    const blocks: Block[] = [
      { ...text, text: [c.heading.trim(), c.body.trim()].filter(Boolean).join('\n\n') } as Block,
      ...c.refs.map((r) => newBlock('scripture', uid(), r)),
    ];
    onAdd(blocks);
    patch(c.key, { added: true });
  };

  let body: ReactNode;
  if (status !== 'signedIn') {
    body = (
      <div className="sg-note">
        <h3>Sign in to use SELAH suggestions</h3>
        <p className="muted small">
          Suggestions use a daily allowance that belongs to an account. Everything else in SELAH works without one, and your sermon stays on this device.
        </p>
        <Link className="btn btn-primary" to="/sign-in" state={{ from: location.pathname }}>
          Sign in
        </Link>
        <Link className="btn btn-ghost" to="/create-account" state={{ from: location.pathname }}>
          Create an account
        </Link>
      </div>
    );
  } else {
    body = (
      <>
        <div className="sg-intro">
          <span className="sg-label"><Sparkles size={13} aria-hidden /> SELAH suggests <span className="chip chip-warn">Beta</span></span>
          <p className="muted small">
            Ideas for you to edit, built from your topic, passage and what you have written. They are not Scripture and not a finished sermon.
          </p>
        </div>

        <div className="segmented" role="group" aria-label="What to suggest">
          {SUGGEST_KINDS.map((k) => (
            <button key={k} aria-pressed={kind === k} onClick={() => (setKind(k), setTouched(true))}>
              {k === 'point' ? 'Point' : k === 'introduction' ? 'Introduction' : 'Conclusion'}
            </button>
          ))}
        </div>

        <p className="muted small sg-using">
          {ready
            ? `Using ${[context.topic && 'your topic', context.passage && formatReference(context.passage), context.scriptures.length > 0 && `${context.scriptures.length} Scripture ${context.scriptures.length === 1 ? 'block' : 'blocks'}`, context.outline.some((o) => o.excerpt) && 'a short excerpt of each section'].filter(Boolean).join(', ')}.`
            : 'Add a topic or a passage above first. SELAH works from what you give it.'}
        </p>

        <button className="btn btn-primary sg-ask" disabled={busy || !ready || !online} onClick={() => void ask()}>
          <Sparkles size={15} aria-hidden /> {busy ? 'Thinking' : cards.length ? 'Suggest again' : `Suggest ${SUGGEST_LABEL[kind].toLowerCase()}`}
        </button>
        {!online && <p className="field-error">You are offline. Suggestions need internet.</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
        {left && <p className="muted small">{left.remaining} of {left.limit} suggestions left today.</p>}

        <ul className="sg-cards" aria-live="polite">
          {cards.map((c) => (
            <li key={c.key} className={`sg-card${c.added ? ' is-added' : ''}`}>
              <span className="sg-label"><Sparkles size={12} aria-hidden /> SELAH suggests</span>
              <Grow className="sg-heading" value={c.heading} label="Suggested heading" placeholder="Heading" onChange={(heading) => patch(c.key, { heading })} />
              <Grow className="sg-body" value={c.body} label="Suggested explanation" placeholder="What this draws from the text" onChange={(b) => patch(c.key, { body: b })} />
              {c.refs.length > 0 ? (
                <>
                  <h4 className="sg-refs-title">Supporting Scripture</h4>
                  <ul className="sg-refs">
                    {c.refs.map((r) => (
                      <RefChip key={refKey(r)} r={r} translation={translation} onRemove={() => patch(c.key, { refs: c.refs.filter((x) => refKey(x) !== refKey(r)) })} />
                    ))}
                  </ul>
                </>
              ) : (
                <p className="muted small">No supporting passage was kept for this idea.</p>
              )}
              <div className="sg-actions">
                <button className="btn btn-primary btn-sm" disabled={c.added || !c.heading.trim()} onClick={() => add(c)}>
                  <Plus size={14} aria-hidden /> {c.added ? 'Added' : `Add to ${active?.title.trim() || 'this section'}`}
                </button>
                {!c.added && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setCards((l) => l.filter((x) => x.key !== c.key))}>
                    Dismiss
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="muted small">When you ask, your topic, passage and a short excerpt of each section are sent to Groq, a third party AI service, to answer. SELAH does not store the question or the answer.</p>
      </>
    );
  }

  return (
    <aside className={`editor-panel${sheet ? ' is-sheet' : ''}`} aria-label="SELAH suggestions" hidden={hidden}>
      {header}
      <div className="panel-pad sg-panel">{body}</div>
    </aside>
  );
}
