import { parseReference } from '@selah/domain';
import { CloudOff, Search } from 'lucide-react';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useOnline } from '@/lib/useOnline';

/** A typed reference opens the passage, anything else searches Scripture. */
export function SearchBox() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    const ref = parseReference(q);
    if (ref) {
      const v = ref.verseEnd === 0 ? '' : `?v=${ref.verseStart}${ref.verseEnd > ref.verseStart ? `-${ref.verseEnd}` : ''}`;
      navigate(`/bible/${ref.book}/${ref.chapter}${v}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
    setValue('');
    input.current?.blur();
  };

  return (
    <form className="searchbox" role="search" onSubmit={submit}>
      <Search size={16} aria-hidden />
      <input
        ref={input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Open a passage or search Scripture"
        aria-label="Open a passage or search Scripture"
        data-global-search
      />
    </form>
  );
}

export function PageBar({ title, children }: { title?: string; children?: ReactNode }) {
  const online = useOnline();
  return (
    <header className="pagebar">
      {title && <h1>{title}</h1>}
      {children}
      <div className="spacer" />
      {!online && (
        <span className="chip chip-warn hide-sm">
          <CloudOff size={13} aria-hidden /> Offline
        </span>
      )}
      <SearchBox />
      <ThemeToggle />
    </header>
  );
}
