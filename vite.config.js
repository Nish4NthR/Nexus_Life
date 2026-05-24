import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel serves from root `/` so no base path needed.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
