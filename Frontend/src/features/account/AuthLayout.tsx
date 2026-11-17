import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CloudUpload, MonitorSmartphone, Search, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';

const SIGN_IN = {
  title: 'Your work stays with you.',
  lede: 'Your Bible, studies and sermons are saved on this device first, so SELAH works without internet. An account adds a backup and the same work on every device.',
  points: [
    { icon: CloudUpload, title: 'Backed up for you', text: 'Changes are sent to your account whenever you are online.' },
    { icon: MonitorSmartphone, title: 'The same work on every device', text: 'Start on a laptop, preach from a tablet.' },
    { icon: WifiOff, title: 'Offline never stops working', text: 'No signal at the pulpit is fine. Nothing waits on the internet.' },
  ],
};

const REGISTER = {
  title: 'What an account adds.',
  lede: 'Nothing you already use changes. An account adds safety and convenience on top of a SELAH that already works.',
  points: [
    { icon: CloudUpload, title: 'A backup', text: 'If a device is lost or cleared, your sermons and notes are not.' },
    { icon: MonitorSmartphone, title: 'Every device, one library', text: 'Sign in on a tablet and your work is there.' },
    { icon: Search, title: 'The SELAH assistant', text: 'Up to 25 questions a day. Your own study always comes first.' },
  ],
};

/** The two column frame from the sign in design: a calm navy panel, then the form. */
export function AuthLayout({ side, children }: { side: 'signin' | 'register'; children: ReactNode }) {
  const c = side === 'signin' ? SIGN_IN : REGISTER;
  return (
    <div className="auth">
      <aside className={`auth-side is-${side}`}>
        <span className="auth-ray" aria-hidden />
        <div className="auth-brand">
          <img className="mark" src="/brand/selah-symbol-gold.svg" alt="" />
          <img className="word" src="/brand/selah-wordmark-ivory.svg" alt="SELAH" />
        </div>
        <div className="auth-copy">
          <h2>{c.title}</h2>
          <p className="lede">{c.lede}</p>
          <ul className="auth-points">
            {c.points.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="ic">
                  <Icon size={18} aria-hidden />
                </span>
                <div>
                  <b>{title}</b>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-legal">Scripture is public domain. Cross-references: OpenBible.info, CC BY.</p>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <img className="mark" src="/brand/selah-symbol-gold.svg" alt="" />
          <img className="word" src="/brand/selah-wordmark-ivory.svg" alt="SELAH" />
        </div>
        <div className="auth-theme">
          <ThemeToggle />
        </div>
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}

export function AuthFooter() {
  const here = useLocation().pathname;
  return (
    <div className="auth-foot">
      <Link to="/privacy" state={{ from: here }}>Privacy notice</Link>
      <Link to="/terms" state={{ from: here }}>Terms</Link>
    </div>
  );
}
