import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

// In development the API runs inside the Vite server, so the site and /api share one address (localhost:3000).
// Imported here, not at the top, so "vite build" never opens the database.
const api = (): Plugin => ({
  name: 'broombroom-api',
  async configureServer(server) {
    const {createApp, startJobs} = await import('./server/app.ts');
    const app = createApp();
    const timer = startJobs();
    server.httpServer?.once('close', () => clearInterval(timer));
    server.middlewares.use((req, res, next) => (req.url?.startsWith('/api/') || req.url?.startsWith('/files/') ? app(req as any, res as any, next) : next()));
  },
});

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), api()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
