import { env, isProd } from '../Configs/env';
import { logger } from '../Utils/logger';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Sends through Resend's HTTP API. No SDK is needed for one call. */
class ResendMailer implements Mailer {
  constructor(
    private readonly key: string,
    private readonly from: string,
  ) {}

  async send(m: Mail): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [m.to], subject: m.subject, text: m.text, html: m.html }),
    });
    if (!res.ok) throw new Error(`Email provider answered ${res.status}`);
  }
}

/** Used when no key is set. Prints the message in development so the flow can be tried. Never in production. */
class ConsoleMailer implements Mailer {
  async send(m: Mail): Promise<void> {
    if (isProd) {
      logger.error('Email is not configured (EMAIL_API_KEY). A message to a user was not sent.');
      return;
    }
    logger.info({ to: m.to, subject: m.subject }, `Email (not sent, no EMAIL_API_KEY):\n${m.text}`);
  }
}

let active: Mailer =
  env.EMAIL_API_KEY && env.EMAIL_FROM ? new ResendMailer(env.EMAIL_API_KEY, env.EMAIL_FROM) : new ConsoleMailer();

export const mailer = { send: (m: Mail) => active.send(m) };

/** Tests swap in a recorder. */
export const setMailer = (m: Mailer) => {
  active = m;
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function passwordResetEmail(to: string, link: string): Mail {
  const text = [
    'Someone asked to reset the password for your SELAH account.',
    '',
    `Use this link within 30 minutes: ${link}`,
    '',
    'If this was not you, ignore this email and your password stays the same.',
  ].join('\n');
  const html = `<p>Someone asked to reset the password for your SELAH account.</p><p><a href="${escapeHtml(link)}">Choose a new password</a>. The link works for 30 minutes.</p><p>If this was not you, ignore this email and your password stays the same.</p>`;
  return { to, subject: 'Reset your SELAH password', text, html };
}
