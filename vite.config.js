import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` matters for GitHub Pages: production builds serve from
// `/Nexus_Life/` (the repo path), localhost dev stays on `/`.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Nexus_Life/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
}));
