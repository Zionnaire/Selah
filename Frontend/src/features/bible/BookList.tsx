import { BOOKS, type Book } from '@selah/domain';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function Group({ title, books, current, chapter }: { title: string; books: Book[]; current: string; chapter: number }) {
  return (
    <>
      <h2 className="booklist-group">{title}</h2>
      {books.map((b) =>
        b.id === current ? (
          <div key={b.id} className="booklist-open">
            <Link to={`/bible/${b.id}/1`} className="booklist-item is-current" aria-current="page">
              {b.name}
            </Link>
            <div className="chapter-grid" role="group" aria-label={`${b.name} chapters`}>
              {Array.from({ length: b.chapters }, (_, i) => i + 1).map((c) => (
                <Link
                  key={c}
                  to={`/bible/${b.id}/${c}`}
                  className={c === chapter ? 'is-current' : undefined}
                  aria-current={c === chapter ? 'page' : undefined}
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Link key={b.id} to={`/bible/${b.id}/1`} className="booklist-item">
            {b.name}
          </Link>
        ),
      )}
    </>
  );
}

export function BookList({ current, chapter }: { current: string; chapter: number }) {
  const ref = useRef<HTMLElement>(null);

  // Keep the open book in view when arriving from a search or the overview.
  useEffect(() => {
    ref.current?.querySelector('.booklist-open')?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  return (
    <nav className="booklist" ref={ref} aria-label="Books of the Bible">
      <Group title="Old Testament" books={BOOKS.filter((b) => b.testament === 'OT')} current={current} chapter={chapter} />
      <Group title="New Testament" books={BOOKS.filter((b) => b.testament === 'NT')} current={current} chapter={chapter} />
    </nav>
  );
}
