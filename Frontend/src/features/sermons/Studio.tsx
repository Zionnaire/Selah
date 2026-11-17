import {
  SERMON_STATUSES,
  STATUS_LABEL,
  formatReference,
  type SermonStatus,
} from '@selah/domain';
import { BookOpen, FileSearch, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { relativeTime, shortDate } from '@/lib/format';
import { useSermonList } from './hooks';
import { pickNext, type SermonListItem } from './repo';

export const StatusChip = ({ status }: { status: SermonStatus }) => (
  <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>
);

const passageOf = (s: SermonListItem) => (s.passage ? formatReference(s.passage) : 'No passage');

function NextCard({ s }: { s: SermonListItem }) {
  const pct = s.sectionsTotal ? (s.sectionsStarted / s.sectionsTotal) * 100 : 0;
  return (
    <section className="next-card" aria-label="Preaching next">
      <p className="eyebrow">Preaching {shortDate(s.preachDate)}</p>
      <h2>{s.title}</h2>
      <p className="next-ref">{passageOf(s)}</p>
      <div className="next-progress">
        <div className="progress on-navy" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p>
          {s.sectionsStarted} of {s.sectionsTotal} sections written, about {Math.round(s.writtenMinutes)} of{' '}
          {s.targetMinutes} min
        </p>
      </div>
      <div className="next-actions">
        <Link className="btn btn-on-navy" to={`/sermons/${s.id}`}>
          Continue writing
        </Link>
        <Link className="btn btn-gilt" to={`/pulpit/${s.id}`}>
          Prepare for pulpit
        </Link>
      </div>
    </section>
  );
}

export function Studio() {
  const { items } = useSermonList();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SermonStatus | 'all'>('all');
  const [query, setQuery] = useState('');

  const next = useMemo(() => (items ? pickNext(items) : undefined), [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items?.length ?? 0 };
    for (const s of items ?? []) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(
      (s) =>
        (filter === 'all' || s.status === filter) &&
        (!q || s.title.toLowerCase().includes(q) || passageOf(s).toLowerCase().includes(q)),
    );
  }, [items, filter, query]);

  return (
    <>
      <PageBar title="Sermon Studio" />
      <div className="page">
        <div className="studio-head">
          <div>
            <h2 className="page-title">Your sermons</h2>
            <p className="muted">Prepare your next message with clarity and conviction.</p>
          </div>
          <Link className="btn btn-primary" to="/sermons/new">
            <Plus size={16} aria-hidden /> New sermon
          </Link>
        </div>

        {items === null ? (
          <div className="skeleton" style={{ height: 220 }} aria-busy="true" />
        ) : items.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="empty-icon">
                <FileSearch size={20} aria-hidden />
              </div>
              <h3>Start your first sermon</h3>
              <p>Begin from a passage and SELAH sets up the outline and time budget. You can change anything later.</p>
              <div className="actions">
                <Link className="btn btn-primary" to="/sermons/new">
                  <Plus size={16} aria-hidden /> New sermon
                </Link>
                <Link className="btn" to="/bible">
                  <BookOpen size={16} aria-hidden /> Read Scripture first
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {next && (
              <>
                <h3 className="section-label">Preaching next</h3>
                <NextCard s={next} />
              </>
            )}

            <div className="library-bar">
              <div className="segmented" role="group" aria-label="Filter by status">
                <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                  All <span className="count">{counts.all}</span>
                </button>
                {SERMON_STATUSES.map((st) => (
                  <button key={st} aria-pressed={filter === st} onClick={() => setFilter(st)}>
                    {STATUS_LABEL[st]} <span className="count">{counts[st] ?? 0}</span>
                  </button>
                ))}
              </div>
              <label className="searchbox library-search">
                <Search size={16} aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a sermon by title or passage"
                  aria-label="Find a sermon by title or passage"
                />
              </label>
            </div>

            {shown.length === 0 ? (
              <div className="card">
                <div className="empty">
                  <h3>No sermons match</h3>
                  <p>Try another status or clear the search.</p>
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="sermon-table">
                  <thead>
                    <tr>
                      <th>Sermon</th>
                      <th>Passage</th>
                      <th>Status</th>
                      <th>Last edited</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((s) => (
                      <tr key={s.id} onClick={() => navigate(`/sermons/${s.id}`)}>
                        <td>
                          <Link className="sermon-title" to={`/sermons/${s.id}`} onClick={(e) => e.stopPropagation()}>
                            {s.title}
                          </Link>
                        </td>
                        <td className="ref">{passageOf(s)}</td>
                        <td>
                          <StatusChip status={s.status} />
                        </td>
                        <td className="muted">{relativeTime(s.updatedAt)}</td>
                        <td className="muted">{shortDate(s.preachDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
