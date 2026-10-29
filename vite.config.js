import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api requests are forwarded to the Node server.
// In production the Node server serves the built files itself, so no proxy is needed.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
});
