import { Check, Eye, EyeOff } from 'lucide-react';
import { useId, useState, type InputHTMLAttributes } from 'react';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  optional?: boolean;
}

export function TextField({ label, value, onChange, error, hint, optional, ...rest }: FieldProps) {
  const id = useId();
  return (
    <div className="afield">
      <label htmlFor={id}>
        {label} {optional && <span className="opt">(optional)</span>}
      </label>
      <input
        id={id}
        className={`ainput${error ? ' is-err' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${id}-e`} className="aerr" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-h`} className="ahint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function PasswordField({ label, value, onChange, error, hint, ...rest }: Omit<FieldProps, 'type' | 'optional'>) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="afield">
      <label htmlFor={id}>{label}</label>
      <div className="apw">
        <input
          id={id}
          className={`ainput${error ? ' is-err' : ''}`}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined}
          {...rest}
        />
        <button type="button" className="aeye" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}>
          {shown ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
      {error && (
        <p id={`${id}-e`} className="aerr" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-h`} className="ahint">
          {hint}
        </p>
      )}
    </div>
  );
}

/** The same two rules the server enforces, shown as the person types. */
export const passwordRules = (pw: string) => [
  { ok: pw.length >= 10, text: 'At least 10 characters' },
  { ok: /[a-z]/i.test(pw) && /\d/.test(pw), text: 'Letters and a number' },
];

export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="arules" aria-label="Password rules">
      {passwordRules(value).map((r) => (
        <li key={r.text} className={r.ok ? 'is-ok' : undefined}>
          <span className="tick" aria-hidden>
            {r.ok && <Check size={11} />}
          </span>
          {r.text}
          <span className="sr-only">{r.ok ? ', done' : ', not yet'}</span>
        </li>
      ))}
    </ul>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  const id = useId();
  return (
    <label className="acheck" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="box" aria-hidden>
        {checked && <Check size={12} />}
      </span>
      <span>{children}</span>
    </label>
  );
}
