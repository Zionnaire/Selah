import { BookOpen, CloudOff, Lectern, Library, PenLine, Search, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAccount } from '@/store/account';
import { HeroSlides } from './HeroSlides';
import { markWelcomed } from './welcome';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Read and compare',
    text: 'Four public domain translations on your device, side by side, with 89,000 cross-references and the Hebrew and Greek behind every word.',
  },
  {
    icon: Search,
    title: 'Study in your own words',
    text: 'Passage and topic studies where you write the conclusions. Your verses and notes stay together.',
  },
  {
    icon: PenLine,
    title: 'Sermon Studio',
    text: 'Outline, time budget and manuscript in one place. When you want ideas, ask SELAH to suggest points and conclusions, then edit them. Beta.',
  },
  {
    icon: Lectern,
    title: 'Pulpit Mode',
    text: 'Large, calm type with a timer and the Scripture for each section. It works with no signal.',
  },
] as const;

const TRUST = [
  { icon: CloudOff, title: 'Offline first', text: 'What you write is saved on your device first. The internet is only for signing in, backup and sync.' },
  { icon: UserRound, title: 'Yours, with or without an account', text: 'Start as a guest. Add an account later for a backup and the same work on every device.' },
  { icon: ShieldCheck, title: 'Scripture stays Scripture', text: 'Public domain translations only. Anything SELAH suggests is labelled, editable and never shown as Scripture.' },
] as const;

/**
 * The front door. Shown the first time someone opens SELAH, and any time from Settings.
 * It describes only what the app does today, and shows the real screens.
 */
export function Landing() {
  const navigate = useNavigate();
  const signedIn = useAccount((s) => s.status === 'signedIn');
  const go = (to: string) => {
    markWelcomed();
    navigate(to);
  };

  return (
    <div className="landing" id="top">
      <header className="lp-top">
        <a className="lp-brand" href="#top" aria-label="SELAH, study deeply, prepare faithfully">
          <img className="lp-mark" src="/brand/selah-symbol-gold.svg" alt="" />
          <span className="lp-brand-text">
            <img className="lp-word" src="/brand/selah-wordmark-ivory.svg" alt="SELAH" />
            <span className="lp-tag">Study deeply. Prepare faithfully.</span>
          </span>
        </a>
        <nav aria-label="On this page" className="lp-sections">
          <a href="#lp-what">What it does</a>
          <a href="#lp-sermon">Sermon Studio</a>
          <a href="#lp-pulpit">Pulpit Mode</a>
          <a href="#lp-trust">Your work, your data</a>
        </nav>
        <nav aria-label="Account" className="lp-nav">
          <ThemeToggle />
          {!signedIn && (
            <Link className="lp-link" to="/sign-in" onClick={markWelcomed}>
              Sign in
            </Link>
          )}
          <button className="lp-open" onClick={() => go('/')}>
            Open SELAH
          </button>
        </nav>
      </header>

      <section className="lp-hero" aria-labelledby="lp-title">
        <HeroSlides>
          <h1 id="lp-title" className="sr-only">Study deeply. Prepare faithfully.</h1>
          <div className="lp-hero-bar">
            <p className="lp-lede">
              A Scripture study and sermon preparation companion for ministers, teachers and Bible students. It works without internet, and no account is needed to begin.
            </p>
            <div className="lp-actions">
              <button className="btn btn-gilt lp-cta" onClick={() => go('/')}>
                <BookOpen size={17} aria-hidden /> Open SELAH
              </button>
              {!signedIn && (
                <button className="btn lp-secondary" onClick={() => go('/create-account')}>
                  Create an account
                </button>
              )}
            </div>
          </div>
        </HeroSlides>
      </section>

      <section className="lp-verse-band" aria-label="Scripture">
        <figure className="scripture lp-verse">
          <blockquote>For Ezra had prepared his heart to seek the law of the LORD, and to do it, and to teach in Israel statutes and judgments.</blockquote>
          <figcaption>Ezra 7:10, KJV</figcaption>
        </figure>
      </section>

      <section className="lp-shot" id="lp-sermon" aria-label="The sermon editor">
        <figure>
          <img src="/landing/editor.jpg" width={1440} height={900} alt="The Sermon Studio editor: a sermon outline on the left, the manuscript in the middle, and SELAH's suggested points with supporting Scripture on the right." />
          <figcaption>Sermon Studio. Suggestions are labelled, editable, and added only when you choose.</figcaption>
        </figure>
      </section>

      <section className="lp-section" aria-labelledby="lp-what">
        <h2 id="lp-what">From Scripture to the pulpit</h2>
        <ul className="lp-features">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="lp-ic">
                <Icon size={20} aria-hidden />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="lp-section lp-split" aria-labelledby="lp-pulpit">
        <div>
          <h2 id="lp-pulpit">Ready when the signal is not</h2>
          <p>
            Prepare at your desk, then preach from the same screen. Pulpit Mode keeps a copy on the device, shows how long you have left, and lets you
            find a verse without leaving your place.
          </p>
          <p className="muted">
            <Library size={15} aria-hidden /> Your sermons, studies, notes and bookmarks live in one library, and sync when you are online.
          </p>
        </div>
        <figure>
          <img src="/landing/pulpit.jpg" width={1440} height={900} loading="lazy" alt="Pulpit Mode showing the Introduction section in large type, with a timer and next section button." />
        </figure>
      </section>

      <section className="lp-section" aria-labelledby="lp-trust">
        <h2 id="lp-trust">Built to be trusted</h2>
        <ul className="lp-trust">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Icon size={20} aria-hidden />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="lp-final">
        <h2>Begin where you are</h2>
        <div className="lp-actions">
          <button className="btn btn-primary" onClick={() => go('/')}>
            Open SELAH
          </button>
          {!signedIn && (
            <button className="btn" onClick={() => go('/sign-in')}>
              Sign in
            </button>
          )}
        </div>
      </section>

      <footer className="lp-foot">
        <p className="lp-legal">
          <Link to="/privacy" state={{ from: '/welcome' }}>Privacy notice</Link>
          <Link to="/terms" state={{ from: '/welcome' }}>Terms</Link>
        </p>
        <p>
          Scripture is public domain. Cross-references: OpenBible.info, CC BY. Original language data: STEPBible and OpenScriptures, CC BY 4.0.
        </p>
      </footer>
    </div>
  );
}
