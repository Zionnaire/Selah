import { emailSchema } from '@selah/domain';
import { CircleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/lib/api';
import { describeAuthError, useAccount } from '@/store/account';
import { AuthFooter, AuthLayout } from './AuthLayout';
import { Checkbox, PasswordField, TextField } from './fields';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; notice?: string } | null;
  const signIn = useAccount((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [failure, setFailure] = useState<{ text: string; offline: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const leave = () => navigate(state?.from && state.from !== '/sign-in' ? state.from : '/', { replace: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const parsed = emailSchema.safeParse(email);
    const next = {
      email: parsed.success ? undefined : 'Enter a full email address, for example name@example.org.',
      password: password ? undefined : 'Enter your password.',
    };
    setErrors(next);
    setFailure(null);
    if (next.email || next.password) return;

    setBusy(true);
    try {
      await signIn({ email: parsed.data!, password, remember });
      leave();
    } catch (err) {
      setFailure({ text: describeAuthError(err), offline: err instanceof ApiError && err.offline });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout side="signin">
      <h1>Sign in</h1>
      <p className="sub">Welcome back. Pick up where you left off.</p>

      {state?.notice && (
        <p className="aalert is-ok" role="status">
          {state.notice}
        </p>
      )}
      {failure && (
        <p className="aalert is-err" role="alert">
          <CircleAlert size={16} aria-hidden /> <span>{failure.text}</span>
        </p>
      )}

      <form className="aform" onSubmit={submit} noValidate>
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={setEmail} error={errors.email} autoFocus />
        <PasswordField label="Password" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password} />
        <div className="arow">
          <Checkbox checked={remember} onChange={setRemember}>
            Stay signed in on this device
          </Checkbox>
          <Link className="alink" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <button className="btn btn-primary abtn" type="submit" disabled={busy}>
          {busy ? 'Signing in' : 'Sign in'}
        </button>
        <div className="adivider">or</div>
        <div>
          <button className="btn abtn" type="button" onClick={() => navigate(state?.from ?? '/', { replace: true })}>
            Continue without an account
          </button>
          <p className="anote">Everything works on this device. Create an account later and nothing is lost.</p>
        </div>
      </form>

      <p className="aswitch">
        New to SELAH?{' '}
        <Link className="alink" to="/create-account" state={state}>
          Create an account
        </Link>
      </p>
      <AuthFooter />
    </AuthLayout>
  );
}
