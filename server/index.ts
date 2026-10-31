/// <reference types="node" />
// Production entry (Render: build "npm install && npm run build", start "npm start"):
// one Node process serves the built site (dist/) and the API.
import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { boot } from './boot.ts';
import { createApp, startJobs } from './app.ts';

const dist = path.resolve(process.cwd(), 'dist');
if (!existsSync(dist)) throw new Error('dist/ is missing. Run "npm run build" first.');

const production = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
await boot({ production });
if (production && !process.env.APP_URL && !process.env.RENDER_EXTERNAL_URL) console.warn('APP_URL is not set: links in emails use the address of the request instead.');
if (production && !process.env.BREVO_API_KEY) console.warn('BREVO_API_KEY is not set: emails (document re-submission, help messages) are not sent.');
const app = createApp();
// Content-Security-Policy for the site: only this site's own scripts run (no inline or injected code), plus Google's
// sign-in script. Styles may be inline (React style attributes); fonts come from Google Fonts; listing photos may be
// any https address.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com/gsi/client",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
  "frame-src 'self' https://accounts.google.com/gsi/",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https://*.r2.cloudflarestorage.com", // listing videos play straight from R2
  "connect-src 'self' https://accounts.google.com/gsi/",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  next();
});
// Built scripts and styles have their content hash in the name, so browsers keep them for a year and returning
// visitors download nothing again (Render's free bandwidth is 5 GB a month). index.html is revalidated each visit.
app.use('/assets', express.static(path.join(dist, 'assets'), { index: false, immutable: true, maxAge: '1y', fallthrough: false }));
app.use(express.static(dist, { index: false, maxAge: '1h' }));
// Single-page app: every other path gets index.html.
app.get(/^(?!\/(api|files)\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

startJobs();
const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Broom Broom running on port ${port}`));
