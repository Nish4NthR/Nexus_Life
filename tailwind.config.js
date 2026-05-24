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
        // Values remapped to the github.com dark palette.
        nebula: {
          violet: '#58a6ff', // GitHub link blue — primary accent
          cyan: '#79c0ff',   // GitHub light blue — hover / light accent
          amber: '#d29922',  // GitHub yellow — warnings
          red: '#f85149',    // GitHub red — danger
          green: '#238636',  // GitHub primary-button green — success
        },
        space: {
          900: '#010409', // outermost canvas
          800: '#0d1117', // page background
          700: '#161b22', // card / surface
        },
      },
      boxShadow: {
        // Flat 1px borders, no glow. Class names preserved for compatibility.
        glow: '0 0 0 1px #30363d',
        'glow-cyan': '0 0 0 1px #30363d',
        'glow-red': '0 0 0 1px #f85149',
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
          '0%, 100%': { borderColor: '#30363d' },
          '50%': { borderColor: '#58a6ff' },
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
