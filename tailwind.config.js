/** @type {import('tailwindcss').Config} */
const SYSTEM_STACK = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Helvetica',
  'Arial',
  'sans-serif',
];

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Both `display` and `sans` resolve to the OS system stack so the app
        // reads like github.com. Class names like `font-display` still work.
        display: SYSTEM_STACK,
        sans: SYSTEM_STACK,
      },
      colors: {
        // Class names kept (nebula-*, space-*) so existing JSX continues to work.
        // The underlying CSS vars are SPACE-SEPARATED RGB CHANNELS (defined in
        // src/styles/global.css), which lets Tailwind compose alpha modifiers:
        //   `bg-nebula-violet/40` -> rgb(var(--nebula-violet) / 0.4)
        // Values flip between dark/light when <html data-theme="..."> changes.
        nebula: {
          violet: 'rgb(var(--nebula-violet) / <alpha-value>)',
          cyan:   'rgb(var(--nebula-cyan) / <alpha-value>)',
          amber:  'rgb(var(--nebula-amber) / <alpha-value>)',
          red:    'rgb(var(--nebula-red) / <alpha-value>)',
          green:  'rgb(var(--nebula-green) / <alpha-value>)',
        },
        space: {
          900: 'rgb(var(--space-900) / <alpha-value>)',
          800: 'rgb(var(--space-800) / <alpha-value>)',
          700: 'rgb(var(--space-700) / <alpha-value>)',
        },
      },
      boxShadow: {
        // Flat 1px borders, no glow. Class names preserved for compatibility.
        glow: '0 0 0 1px var(--border-subtle)',
        'glow-cyan': '0 0 0 1px var(--border-subtle)',
        'glow-red': '0 0 0 1px var(--nebula-red)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // Soft border-color pulse — replaces the old emerald glow pulse.
        // Class name preserved (animate-pulse-glow) for the UPI tray.
        pulseGlow: {
          '0%, 100%': { borderColor: 'var(--border-subtle)' },
          '50%': { borderColor: 'var(--nebula-violet)' },
        },
      },
      animation: {
        shake: 'shake 0.45s ease-in-out',
        orbit: 'orbit 2.4s linear infinite',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
