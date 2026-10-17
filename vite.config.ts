import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// In development the API runs inside the Vite server, so the site and /api share one address (localhost:3000).
// Imported here, not at the top, so "vite build" never opens the database.
const api = (): Plugin => ({
  name: 'broombroom-api',
  async configureServer(server) {
    // Server settings (ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI, BREVO_API_KEY...) may come from .env.local.
    // Without MONGODB_URI a local development database starts.
    for (const [k, v] of Object.entries(loadEnv('development', process.cwd(), ''))) process.env[k] ??= v;
    const {boot} = await import('./server/boot.ts');
    const {createApp, startJobs} = await import('./server/app.ts');
    await boot();
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
      // DISABLE_HMR=true turns off live reload and file watching.
      hmr: process.env.DISABLE_HMR !== 'true',
      // server/data holds the dev database and saved emails; changes there are not code changes.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/server/data/**'] },
    },
  };
});
