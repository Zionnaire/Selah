import { emailSchema, passwordSchema } from '@selah/domain';
import { ArrowLeft, CircleAlert, Info, KeyRound, Lock, Mail, TriangleAlert } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { describeAuthError, useAccount } from '@/store/account';
import { AuthLayout } from './AuthLayout';
import { PasswordField, PasswordRules, TextField } from './fields';

const RESEND_SECONDS = 60;

/** Steps 1 and 2: ask for a link, then check your email. The wording never says whether the address has an account. */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    const parsed = emailSchema.safeParse(sentTo ?? email);
    if (!parsed.success) return setError('Enter a full email address, for example name@example.org.');
    setError(undefined);
    setFailure(null);
    setBusy(true);
    try {
      await api('/api/v1/auth/forgot', { method: 'POST', body: { email: parsed.data }, auth: false });
      setSentTo(parsed.data);
      setWait(RESEND_SECONDS);
    } catch (err) {
      setFailure(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout side="signin">
      {sentTo ? (
        <div className="acentre">
          <div className="abadge is-ok">
            <Mail size={22} aria-hidden />
          </div>
          <h1>Check your email</h1>
          <p className="sub">
            If an account exists for <b>{sentTo}</b>, a link is on its way. It works for 30 minutes.
          </p>
          <p className="aalert is-info">
            <Info size={16} aria-hidden /> <span>Nothing arrived? Check your spam folder, and make sure the address is spelled correctly.</span>
          </p>
          {failure && (
            <p className="aalert is-err" role="alert">
              <CircleAlert size={16} aria-hidden /> <span>{failure}</span>
            </p>
          )}
          <button className="btn abtn" type="button" disabled={wait > 0 || busy} onClick={() => void send()}>
            {wait > 0 ? `Send again in 0:${String(wait).padStart(2, '0')}` : 'Send again'}
          </button>
          <p className="anote">
            <button type="button" className="alink linklike" onClick={() => (setSentTo(null), setWait(0))}>
              Use a different email
            </button>
          </p>
        </div>
      ) : (
        <>
          <div className="abadge">
            <KeyRound size={22} aria-hidden />
          </div>
          <h1>Reset your password</h1>
          <p className="sub">Enter the email you signed up with and we will send you a link.</p>
          {failure && (
            <p className="aalert is-err" role="alert">
              <CircleAlert size={16} aria-hidden /> <span>{failure}</span>
            </p>
          )}
          <form className="aform" onSubmit={send} noValidate>
            <TextField label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={setEmail} error={error} autoFocus />
            <button className="btn btn-primary abtn" type="submit" disabled={busy}>
              {busy ? 'Sending' : 'Send reset link'}
            </button>
            <Link className="alink acentre-link" to="/sign-in">
              <ArrowLeft size={14} aria-hidden /> Back to sign in
            </Link>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

/** Step 3: choose a new password. Finishing ends every session, and says so first. */
export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [failure, setFailure] = useState<{ text: string; expired: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next = {
      password: passwordSchema.safeParse(password).success ? undefined : 'Use at least 10 characters, with letters and a number.',
      confirm: confirm === password ? undefined : 'The two passwords do not match.',
    };
    setErrors(next);
    setFailure(null);
    if (next.password || next.confirm) return;

    setBusy(true);
    try {
      await api('/api/v1/auth/reset', { method: 'POST', body: { token, password }, auth: false });
      // Every session ended on the server. Make this device match, without touching its work.
      await useAccount.getState().signOut();
      navigate('/sign-in', { replace: true, state: { notice: 'Password changed. Sign in with your new password.' } });
    } catch (err) {
      const text = describeAuthError(err);
      setFailure({ text, expired: /expired|already used/i.test(text) });
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout side="signin">
        <h1>This link is not complete</h1>
        <p className="sub">Open the link from your email again, or ask for a new one.</p>
        <Link className="btn btn-primary abtn" to="/forgot-password">
          Ask for a new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout side="signin">
      <div className="abadge">
        <Lock size={22} aria-hidden />
      </div>
      <h1>Choose a new password</h1>
      <p className="sub">Pick something you do not use anywhere else.</p>
      {failure && (
        <p className="aalert is-err" role="alert">
          <CircleAlert size={16} aria-hidden />{' '}
          <span>
            {failure.text}{' '}
            {failure.expired && (
              <Link className="alink" to="/forgot-password">
                Ask for a new link
              </Link>
            )}
          </span>
        </p>
      )}
      <form className="aform" onSubmit={submit} noValidate>
        <div>
          <PasswordField label="New password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} autoFocus />
          <PasswordRules value={password} />
        </div>
        <PasswordField label="Confirm new password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
        <p className="aalert is-warn">
          <TriangleAlert size={16} aria-hidden /> <span>Saving signs you out of SELAH on every other device. Work saved on those devices is kept.</span>
        </p>
        <button className="btn btn-primary abtn" type="submit" disabled={busy}>
          {busy ? 'Saving' : 'Save password'}
        </button>
      </form>
    </AuthLayout>
  );
}
