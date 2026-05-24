import { useThemeStore } from '../../store/useThemeStore.js';

/**
 * Sun / moon button. Flips app-wide theme via useThemeStore.
 * Same visual footprint as the surrounding nav buttons so it slots into
 * the Navbar cleanly.
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
      className={`rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-slate-300 transition hover:border-nebula-violet/60 hover:text-nebula-violet ${className}`}
    >
      <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
    </button>
  );
}
