/// <reference types="node" />
// A private MongoDB for development and tests, so nobody needs an Atlas account to work on the app.
// The first run downloads the MongoDB server once (into node_modules/.cache). Production sets MONGODB_URI instead.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';

// persistDir: keep the data between restarts (npm run dev). Without it the data is thrown away (tests).
export const startDevMongo = async (persistDir?: string) => {
  if (persistDir) mkdirSync(persistDir, { recursive: true });
  // The saved replica-set config names this member's port, so a saved database must restart on the same one.
  const portFile = persistDir && path.join(persistDir, 'port');
  const port = portFile && existsSync(portFile) ? Number(readFileSync(portFile, 'utf8')) : persistDir ? 27117 : undefined;
  // A one-member replica set: transactions need one, like Atlas has.
  const server = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: persistDir ? [{ dbPath: path.resolve(persistDir), storageEngine: 'wiredTiger', port }] : undefined,
  });
  return { uri: server.getUri(), stop: () => server.stop({ doCleanup: !persistDir, force: false }) };
};
