import { BookOpen, House, Lectern, Library, PanelLeftClose, PanelLeftOpen, PenLine, Search, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useOnline } from '@/lib/useOnline';
import { useStoredFlag } from '@/lib/useStoredFlag';
import { useAccount } from '@/store/account';
import { Avatar } from '@/components/Avatar';
import { useSyncView } from '@/features/sync/status';
import { useApp } from '@/store/app';

const NAV = [
  { to: '/', label: 'Overview', icon: House, end: true },
  { to: '/bible', label: 'Bible', icon: BookOpen },
  { to: '/study', label: 'Study & Research', icon: Search },
  { to: '/sermons', label: 'Sermon Studio', icon: PenLine },
  { to: '/pulpit', label: 'Pulpit', icon: Lectern },
  { to: '/library', label: 'My Library', icon: Library },
] as const;

const TABS = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/bible', label: 'Bible', icon: BookOpen },
  { to: '/study', label: 'Study', icon: Search },
  { to: '/sermons', label: 'Sermons', icon: PenLine },
  { to: '/library', label: 'Library', icon: Library },
] as const;

/** Who is using SELAH. A guest is a first class state, with a quiet way to back up their work. */
function AccountLine() {
  const { status, user } = useAccount();
  const here = useLocation().pathname;
  if (status === 'signedIn' && user) {
    return (
      <NavLink to="/settings#account" className="rail-user" title="Account">
        <Avatar name={user.name} src={user.avatar} />
        <div>
          {user.name}
          <small>{user.church ?? user.email}</small>
        </div>
      </NavLink>
    );
  }
  return (
    <div className="rail-user">
      <div className="avatar" aria-hidden>
        G
      </div>
      <div>
        Guest
        <small>Working on this device</small>
        <Link className="guest-link" to="/create-account" state={{ from: here }}>
          Back up your work
        </Link>
      </div>
    </div>
  );
}

function Rail({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const online = useOnline();
  const mode = useApp((s) => s.db?.mode);
  const sync = useSyncView();
  return (
    <aside className="rail">
      <NavLink to="/" className="rail-brand" aria-label="SELAH home">
        <img className="mark" src="/brand/selah-symbol-gold.svg" alt="" />
        <img className="word" src="/brand/selah-wordmark-ivory.svg" alt="SELAH" />
      </NavLink>

      <nav className="rail-nav" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink key={to} to={to} className="rail-link" title={label} {...rest}>
            <Icon size={18} strokeWidth={1.7} aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="rail-divider" />
        <NavLink to="/settings" className="rail-link" title="Settings">
          <Settings size={18} strokeWidth={1.7} aria-hidden />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="rail-foot">
        <button className="rail-toggle" onClick={onToggle} aria-pressed={open} aria-label={open ? 'Collapse the navigation' : 'Expand the navigation'} title={open ? 'Collapse the navigation' : 'Expand the navigation'}>
          {open ? <PanelLeftClose size={17} aria-hidden /> : <PanelLeftOpen size={17} aria-hidden />}
          <span className="label">Collapse</span>
        </button>
        <div className="sync-line" role="status">
          <span className={`sync-dot is-${mode === 'memory' ? 'problem' : sync.key}${online ? '' : ' offline'}`} aria-hidden />
          <span className="label">{mode === 'memory' ? 'Storage unavailable' : sync.label}</span>
        </div>
        <AccountLine />
      </div>
    </aside>
  );
}

function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="toast" role="status">
      A new version of SELAH is ready.
      <button className="btn btn-sm btn-on-navy" onClick={() => updateServiceWorker(true)}>
        Reload
      </button>
      <button className="btn btn-sm btn-on-navy" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}

/** Press / anywhere outside a field to jump to search. */
function useSearchShortcut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[data-global-search]')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function Shell() {
  useSearchShortcut();
  const [railOpen, setRailOpen] = useStoredFlag('selah.rail', true);
  return (
    <div className={`app${railOpen ? '' : ' rail-collapsed'}`}>
      <Rail open={railOpen} onToggle={() => setRailOpen(!railOpen)} />
      <main className="main" id="main">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink key={to} to={to} {...rest}>
            <Icon size={20} strokeWidth={1.7} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <UpdateToast />
    </div>
  );
}
