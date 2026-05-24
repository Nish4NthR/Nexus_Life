import { useThemeStore } from '../../store/useThemeStore.js';

/**
 * Sun / moon button. Flips app-wide theme via useThemeStore.
 * Sits cleanly in the Navbar alongside the logout button.
 */
export default function ThemeToggle({ className = '' }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`rounded-md border border-nebula-violet/15 bg-black px-3 py-1.5 font-mono text-sm text-[color:var(--text-muted)] transition hover:border-nebula-violet/60 hover:text-nebula-violet hover:shadow-glow ${className}`}
    >
      <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
    </button>
  );
}
