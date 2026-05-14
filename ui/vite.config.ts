import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev/preview keep base='/' so Playwright and local workflows are unchanged.
// The production build uses '/rem-waste/' so it can be served from GitHub Pages
// at https://henrik-hung-pham.github.io/rem-waste/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/rem-waste/' : '/',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
}));
