/** @type {import('tailwindcss').Config} */
const SYSTEM_STACK = [
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Helvetica',
  'Arial',
  'sans-serif',
];

const MONO_STACK = [
  '"JetBrains Mono"',
  'ui-monospace',
  'SFMono-Regular',
  '"SF Mono"',
  'Menlo',
  'Consolas',
  'monospace',
];

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // `font-display` and `font-sans` resolve to Inter + system stack.
        // `font-mono` provides JetBrains Mono for numbers/stats/counters.
        display: SYSTEM_STACK,
        sans: SYSTEM_STACK,
        mono: MONO_STACK,
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
          600: 'rgb(var(--space-600) / <alpha-value>)',
        },
      },
      boxShadow: {
        // Neon glow utilities. Class names preserved.
        glow:        '0 0 10px rgba(57, 255, 20, 0.25)',
        'glow-cyan': '0 0 10px rgba(0, 204, 68, 0.30)',
        'glow-red':  '0 0 10px rgba(248, 81, 73, 0.30)',
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
        // Soft neon border-color pulse — used by the UPI tray.
        pulseGlow: {
          '0%, 100%': {
            borderColor: 'var(--border-subtle)',
            boxShadow: '0 0 0 rgba(57, 255, 20, 0)',
          },
          '50%': {
            borderColor: 'rgb(var(--nebula-violet))',
            boxShadow: '0 0 14px rgba(57, 255, 20, 0.35)',
          },
        },
        caretBlink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
      animation: {
        shake: 'shake 0.45s ease-in-out',
        orbit: 'orbit 2.4s linear infinite',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'caret-blink': 'caretBlink 1s steps(1, end) infinite',
      },
    },
  },
  plugins: [],
};
