import { registerSchema } from '@selah/domain';
import { CircleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/lib/api';
import { describeAuthError, useAccount } from '@/store/account';
import { AuthFooter, AuthLayout } from './AuthLayout';
import { Checkbox, PasswordField, PasswordRules, TextField } from './fields';

export function Register() {
  const navigate = useNavigate();
  const state = useLocation().state as { from?: string } | null;
  const register = useAccount((s) => s.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [church, setChurch] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFailure(null);
    setEmailTaken(false);

    const parsed = registerSchema.safeParse({ name, email, password, church: church.trim() || undefined });
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        next[key] ??=
          key === 'name' ? 'Tell us what to call you.'
          : key === 'email' ? 'Enter a full email address, for example name@example.org.'
          : key === 'password' ? 'Use at least 10 characters, with letters and a number.'
          : issue.message;
      }
    }
    if (!agreed) next.agreed = 'Please confirm you have read the Privacy notice and agree to the Terms.';
    setErrors(next);
    if (!parsed.success || next.agreed) return;

    setBusy(true);
    try {
      await register(parsed.data);
      navigate(state?.from ?? '/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setEmailTaken(true);
      else setFailure(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout side="register">
      <h1>Create your account</h1>
      <p className="sub">It takes a minute. If you already have work on this device, it comes with you.</p>

      {failure && (
        <p className="aalert is-err" role="alert">
          <CircleAlert size={16} aria-hidden /> <span>{failure}</span>
        </p>
      )}

      <form className="aform" onSubmit={submit} noValidate>
        <TextField label="Your name" autoComplete="name" value={name} onChange={setName} error={errors.name} autoFocus />
        <div>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(v) => (setEmail(v), setEmailTaken(false))}
            error={errors.email ?? (emailTaken ? 'An account with this email already exists.' : undefined)}
          />
          {emailTaken && (
            <p className="ahint">
              <Link className="alink" to="/sign-in" state={state}>
                Sign in instead
              </Link>
            </p>
          )}
        </div>
        <div>
          <PasswordField label="Password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} />
          <PasswordRules value={password} />
        </div>
        <TextField label="Church or ministry" optional autoComplete="organization" value={church} onChange={setChurch} hint="Shown on your profile and on exported sermons." />
        <div>
          <Checkbox checked={agreed} onChange={setAgreed}>
            I have read the{' '}
            <a className="alink" href="/privacy" target="_blank" rel="noopener">
              Privacy notice
            </a>{' '}
            and agree to the{' '}
            <a className="alink" href="/terms" target="_blank" rel="noopener">
              Terms
            </a>
            .
          </Checkbox>
          {errors.agreed && (
            <p className="aerr" role="alert">
              {errors.agreed}
            </p>
          )}
        </div>
        <button className="btn btn-primary abtn" type="submit" disabled={busy}>
          {busy ? 'Creating your account' : 'Create account'}
        </button>
      </form>

      <p className="aswitch">
        Already have an account?{' '}
        <Link className="alink" to="/sign-in" state={state}>
          Sign in
        </Link>
      </p>
      <AuthFooter />
    </AuthLayout>
  );
}
