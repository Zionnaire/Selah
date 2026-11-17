import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';

/** Light or dark from any screen. Match device stays a choice in Settings. */
export function ThemeToggle() {
  const { mode, setPref } = useTheme();
  const next = mode === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} mode`;
  return (
    <button className="icon-btn theme-toggle" aria-label={label} title={label} onClick={() => setPref(next)}>
      {mode === 'dark' ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
    </button>
  );
}
