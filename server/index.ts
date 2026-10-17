/// <reference types="node" />
// Production entry: one Node process serves the built site (dist/) and the API.
//   npm run build && npm start
import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createApp, startJobs } from './app.ts';

const app = createApp();
const dist = path.resolve(process.cwd(), 'dist');
if (!existsSync(dist)) throw new Error('dist/ is missing. Run "npm run build" first.');
app.use(express.static(dist, { index: false, maxAge: '1h' }));
// Single-page app: every other path gets index.html.
app.get(/^(?!\/(api|files)\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

startJobs();
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Broom Broom running on http://localhost:${port}`));
