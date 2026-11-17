import { formatReference } from '@selah/domain';
import { Lectern, PenLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { shortDate } from '@/lib/format';
import { useSermonList } from '../sermons/hooks';
import { StatusChip } from '../sermons/Studio';

export function PulpitList() {
  const { items } = useSermonList();
  const ready = (items ?? []).filter((s) => s.sectionsStarted > 0 || s.status !== 'idea');

  return (
    <>
      <PageBar title="Pulpit" />
      <div className="page">
        <h2 className="page-title">Choose a sermon to preach</h2>
        <p className="muted lead">Pulpit Mode works fully offline. Prepare once, then enter.</p>

        {items === null ? (
          <div className="skeleton" style={{ height: 160 }} aria-busy="true" />
        ) : ready.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="empty-icon">
                <Lectern size={20} aria-hidden />
              </div>
              <h3>Nothing to preach from yet</h3>
              <p>Write at least one section of a sermon and it will appear here, ready to take to the pulpit.</p>
              <div className="actions">
                <Link className="btn btn-primary" to="/sermons">
                  <PenLine size={16} aria-hidden /> Open Sermon Studio
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <ul className="pulpit-list">
            {ready.map((s) => (
              <li key={s.id} className="card">
                <div>
                  <h3 className="sermon-title">{s.title}</h3>
                  <p className="muted small">
                    <span className="ref">{s.passage ? formatReference(s.passage) : 'No passage'}</span> ·{' '}
                    {shortDate(s.preachDate)} · {s.targetMinutes} min
                  </p>
                  <StatusChip status={s.status} />
                </div>
                <Link className="btn btn-primary" to={`/pulpit/${s.id}`}>
                  <Lectern size={16} aria-hidden /> Prepare
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
