import { ArrowLeft } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LEGAL, legalIsComplete } from './config';

/** Where a legal page sends the reader back to: the page they came from, or the front page. */
function useBack(): string {
  const from = (useLocation().state as { from?: string } | null)?.from;
  return from && from.startsWith('/') ? from : '/welcome';
}

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  const back = useBack();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="legal">
      <header className="legal-top">
        <Link className="legal-back" to={back}>
          <ArrowLeft size={15} aria-hidden /> Back
        </Link>
        <img className="legal-logo" src="/brand/selah-wordmark-navy.svg" alt="SELAH" />
        <ThemeToggle />
      </header>
      <main className="legal-body">
        <h1>{title}</h1>
        <p className="muted small">Last updated {LEGAL.updated}</p>
        {!legalIsComplete() && (
          <p className="legal-draft" role="note">
            This is a draft. The name of the person or organisation that runs SELAH and a contact address are added before launch.
          </p>
        )}
        {children}
        <p className="legal-nav">
          <Link to="/privacy" state={{ from: back }}>Privacy notice</Link>
          <Link to="/terms" state={{ from: back }}>Terms</Link>
        </p>
      </main>
    </div>
  );
}

/** How to reach whoever runs SELAH. Says so plainly when that is not set yet. */
export function Contact() {
  return LEGAL.contactEmail ? <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> : <span>the contact address, which is added before launch</span>;
}
