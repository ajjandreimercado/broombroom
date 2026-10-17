/// <reference types="node" />
import path from 'node:path';
import { connectDb } from './db.ts';
import { seedIfEmpty } from './seed.ts';

// Connects to MongoDB and loads the first data. MONGODB_URI (Atlas) wins; without it, development gets a local
// MongoDB kept in server/data/mongo. Production refuses to start without MONGODB_URI, so data is never lost by accident.
export const boot = async ({ production = false } = {}) => {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    if (production) throw new Error('Set MONGODB_URI (your MongoDB Atlas connection string) before starting the server.');
    const { startDevMongo } = await import('./devdb.ts');
    // Vite restarts its server (and boots again) when a server file changes: reuse the database already running.
    const g = globalThis as { __bbDevMongoUri?: Promise<string> };
    uri = await (g.__bbDevMongoUri ||= startDevMongo(path.join(process.cwd(), 'server', 'data', 'mongo')).then((m) => m.uri));
    console.log('Using the local development database in server/data/mongo');
  }
  await connectDb(uri);
  await seedIfEmpty();
};
