import { Bookmark, FileText, Library as LibraryIcon, PenLine, Search, Trash2 } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { SideToggle } from '@/components/SideToggle';
import { useStoredFlag } from '@/lib/useStoredFlag';

const SECTIONS = [
  { to: '/library', label: 'All items', icon: LibraryIcon, end: true },
  { to: '/library/sermons', label: 'Sermons', icon: PenLine },
  { to: '/library/studies', label: 'Studies', icon: Search },
  { to: '/library/notes', label: 'Notes', icon: FileText },
  { to: '/library/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/library/deleted', label: 'Recently deleted', icon: Trash2 },
] as const;

/** Frame for every library screen: the section list on the left, the section on the right. */
export function Library() {
  const [navOpen, setNavOpen] = useStoredFlag('selah.library.nav', true);
  return (
    <>
      <PageBar title="My Library">
        <SideToggle side="left" open={navOpen} onToggle={() => setNavOpen(!navOpen)} label="the library sections" />
      </PageBar>
      <div className={`library${navOpen ? '' : ' nav-collapsed'}`}>
        <nav className="library-nav" aria-label="Library sections">
          {SECTIONS.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink key={to} to={to} {...rest}>
              <Icon size={17} strokeWidth={1.7} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="library-main">
          <Outlet />
        </div>
      </div>
    </>
  );
}
