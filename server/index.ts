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

await boot({ production: process.env.NODE_ENV === 'production' || !!process.env.RENDER });
const app = createApp();
app.use(express.static(dist, { index: false, maxAge: '1h' }));
// Single-page app: every other path gets index.html.
app.get(/^(?!\/(api|files)\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

startJobs();
const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Broom Broom running on port ${port}`));
