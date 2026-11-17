import { STUDY_KIND_LABEL, formatReference, newStudy, parseReference, type Study, type StudyKind } from '@selah/domain';
import { ArrowRight, Languages, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { relativeTime } from '@/lib/format';
import { studyRepo } from './repo';

const EXAMPLES: Record<StudyKind, string[]> = {
  passage: ['Romans 12:1-2', 'Psalm 23', 'John 15:1-8'],
  topic: ['renewal of the mind', 'mercy', 'waiting on the Lord'],
};

/** Jump straight to the original words of one verse. */
function WordLookup() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const go = (e: FormEvent) => {
    e.preventDefault();
    const ref = parseReference(text.trim());
    if (!ref) return setError('Type a verse, for example Romans 12:2.');
    // A range or a whole chapter opens at its first verse.
    navigate(`/words/${ref.book}/${ref.chapter}/${ref.verseStart}`);
  };
  return (
    <form className="card study-tools" onSubmit={go}>
      <h2 className="card-title">Original words</h2>
      <p className="muted small">See the Hebrew or Greek behind any verse, word by word, with what each word means and where else it appears.</p>
      <div className="study-input">
        <label className="searchbox">
          <Languages size={16} aria-hidden />
          <input value={text} onChange={(e) => (setText(e.target.value), setError(''))} placeholder="Romans 12:2" aria-label="Verse" aria-invalid={!!error} />
        </label>
        <button className="btn" type="submit">Open</button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </form>
  );
}

export function StudyHome() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<StudyKind>('passage');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [studies, setStudies] = useState<Study[] | null>(null);

  useEffect(() => {
    void studyRepo.list().then(setStudies);
  }, []);

  const start = async (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return setError(kind === 'passage' ? 'Type a passage, for example Romans 12:1-2.' : 'Type a topic or a question.');
    let doc;
    if (kind === 'passage') {
      const ref = parseReference(value);
      if (!ref) return setError('That reference is not in the Bible. Try Romans 12:1-2.');
      doc = newStudy({ kind, passage: ref }, () => crypto.randomUUID());
    } else {
      doc = newStudy({ kind, topic: value }, () => crypto.randomUUID());
    }
    navigate(`/study/${await studyRepo.create(doc)}`);
  };

  return (
    <>
      <PageBar title="Study & Research" />
      <div className="page study-home">
        <h2 className="page-title">What would you like to understand?</h2>
        <p className="muted lead">Start with a passage or a topic. Your findings and your words stay yours, on this device.</p>

        <form className="study-start card" onSubmit={start}>
          <div className="segmented" role="group" aria-label="Approach">
            {(['passage', 'topic'] as const).map((k) => (
              <button type="button" key={k} aria-pressed={kind === k} onClick={() => (setKind(k), setError(''))}>
                {k === 'passage' ? 'Passage' : 'Topic'}
              </button>
            ))}
          </div>
          <div className="study-input">
            <label className="searchbox">
              <Search size={16} aria-hidden />
              <input
                value={text}
                onChange={(e) => (setText(e.target.value), setError(''))}
                placeholder={kind === 'passage' ? 'Romans 12:1-2' : 'What does Scripture say about...'}
                aria-label={kind === 'passage' ? 'Passage' : 'Topic'}
                aria-invalid={!!error}
              />
            </label>
            <button className="btn btn-primary" type="submit">
              Start study <ArrowRight size={16} aria-hidden />
            </button>
          </div>
          {error && <p className="field-error">{error}</p>}
          <p className="muted small">
            Try:{' '}
            {EXAMPLES[kind].map((x, i) => (
              <button type="button" key={x} className="link-btn" onClick={() => (setText(x), setError(''))}>
                {x}
                {i < EXAMPLES[kind].length - 1 ? ', ' : ''}
              </button>
            ))}
          </p>
        </form>

        <WordLookup />

        <Link to="/reference" className="card study-tools ref-card">
          <h2 className="card-title">Bible dictionary</h2>
          <p className="muted small">People, places and things in the Bible, from Smith's 1884 dictionary. Historic reference, labelled as such.</p>
          <span className="btn">Open the dictionary <ArrowRight size={16} aria-hidden /></span>
        </Link>

        <section className="card">
          <h2 className="card-title">Your studies</h2>
          {studies === null ? (
            <div className="skeleton" style={{ height: 80 }} aria-busy="true" />
          ) : studies.length === 0 ? (
            <div className="empty">
              <h3>No studies yet</h3>
              <p>Each study keeps the verses you collect and what you write about them.</p>
            </div>
          ) : (
            <ul className="recent-list">
              {studies.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <Link to={`/study/${s.id}`}>
                    <span>
                      <strong>{s.title}</strong>
                      <small className="muted">
                        {STUDY_KIND_LABEL[s.kind]}
                        {s.passage ? `, ${formatReference(s.passage)}` : ''}, {s.verses.length} verse{s.verses.length === 1 ? '' : 's'} collected, edited {relativeTime(s.updatedAt).toLowerCase()}
                      </small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
