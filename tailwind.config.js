/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Class names kept (nebula-*) so existing JSX continues to work.
        // Values remapped to a deep-emerald / nature palette.
        nebula: {
          violet: '#059669', // emerald 600 — primary accent (was purple)
          cyan: '#34D399',   // emerald 400 — light accent (was cyan)
          amber: '#F59E0B',  // amber — budget warnings, kept
          red: '#EF4444',    // red — danger, kept
          green: '#22C55E',  // green-500 — success, slightly brighter
        },
        space: {
          900: '#050a08',
          800: '#0a1410',
          700: '#0e1b16',
        },
      },
      boxShadow: {
        glow: '0 0 24px rgba(5, 150, 105, 0.40)',
        'glow-cyan': '0 0 24px rgba(52, 211, 153, 0.40)',
        'glow-red': '0 0 24px rgba(239, 68, 68, 0.55)',
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
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 16px rgba(5,150,105,0.30)' },
          '50%': { boxShadow: '0 0 32px rgba(52,211,153,0.60)' },
        },
        drift: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        shake: 'shake 0.45s ease-in-out',
        orbit: 'orbit 2.4s linear infinite',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        drift: 'drift 4s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};
