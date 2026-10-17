/// <reference types="node" />
import { AsyncLocalStorage } from 'node:async_hooks';
import { MongoClient, GridFSBucket, type Db, type ClientSession, type Filter, type Document } from 'mongodb';

// MongoDB: Atlas in production (MONGODB_URI), a private local server in development and tests (server/devdb.ts).
// Each record is stored as-is with its id as _id; the server filters on the record's own fields.
let client: MongoClient | undefined;
let database: Db | undefined;
let bucket: GridFSBucket | undefined;

export const COLLECTIONS = [
  'vehicles',
  'applications',
  'conversations',
  'leads',
  'quotations',
  'commissions',
  'listing_requests',
  'reports',
  'notifications',
  'vouchers',
] as const;
export type Table = (typeof COLLECTIONS)[number];

export const connectDb = async (uri: string, dbName = process.env.MONGODB_DB || 'broombroom') => {
  client = new MongoClient(uri, { retryWrites: true });
  await client.connect();
  database = client.db(dbName);
  bucket = new GridFSBucket(database, { bucketName: 'files' });
  // Indexes for what the server looks up (creating them also creates the collections, which transactions need).
  await Promise.all([
    col('vehicles').createIndex({ status: 1 }),
    col('applications').createIndex({ applicantId: 1 }),
    col('applications').createIndex({ sellerName: 1 }),
    col('applications').createIndex({ referenceNo: 1 }),
    col('conversations').createIndex({ buyerId: 1, vehicleId: 1 }),
    col('conversations').createIndex({ sellerName: 1 }),
    col('leads').createIndex({ agentName: 1 }),
    col('quotations').createIndex({ clientId: 1 }),
    col('commissions').createIndex({ agentName: 1 }),
    col('commissions').createIndex({ applicationRef: 1 }),
    col('listing_requests').createIndex({ agentName: 1, status: 1 }),
    col('reports').createIndex({ status: 1 }),
    col('notifications').createIndex({ audience: 1, recipient: 1, createdAt: -1 }),
    col('vouchers').createIndex({ kind: 1, accountId: 1 }),
    raw('users').createIndex({ emailLower: 1 }, { unique: true }),
    raw('users').createIndex({ role: 1, active: 1 }),
    raw('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }), // expired sign-ins delete themselves
    raw('sessions').createIndex({ userId: 1 }),
    raw('uploads').createIndex({ uploadedBy: 1 }),
    // GridFS would build these on the first upload; doing it here keeps that first upload fast.
    raw('files.files').createIndex({ filename: 1, uploadDate: 1 }),
    raw('files.chunks').createIndex({ files_id: 1, n: 1 }, { unique: true }),
  ]);
  return database;
};

export const closeDb = async () => {
  await client?.close();
  client = database = bucket = undefined;
};

const db = () => {
  if (!database) throw new Error('Database not connected');
  return database;
};
export const raw = (name: string) => db().collection<any>(name);
const col = (name: Table) => db().collection<any>(name);
export const files = () => {
  if (!bucket) throw new Error('Database not connected');
  return bucket;
};

// Every database call made inside tx() joins its transaction automatically.
const txSession = new AsyncLocalStorage<ClientSession>();
export const opts = () => {
  const session = txSession.getStore();
  return session ? { session } : {};
};

// Everything in fn commits together or not at all. MongoDB may rerun fn on a write conflict, so fn only touches the database.
export const tx = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (txSession.getStore()) return fn(); // already inside one
  const session = client!.startSession();
  try {
    let out!: T;
    await session.withTransaction(async () => {
      out = await txSession.run(session, fn);
    });
    return out;
  } finally {
    await session.endSession();
  }
};

const strip = <T>(doc: any): T => {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest as T;
};

export const store = {
  async all<T>(table: Table, filter: Filter<Document> = {}, sort?: Record<string, 1 | -1>): Promise<T[]> {
    const cursor = col(table).find(filter, opts());
    if (sort) cursor.sort(sort);
    return (await cursor.toArray()).map((d) => strip<T>(d));
  },
  async one<T>(table: Table, filter: Filter<Document>): Promise<T | undefined> {
    return strip<T>(await col(table).findOne(filter, opts())) ?? undefined;
  },
  async get<T>(table: Table, id: string): Promise<T | undefined> {
    if (typeof id !== 'string') return undefined;
    return strip<T>(await col(table).findOne({ _id: id }, opts())) ?? undefined;
  },
  async put<T extends { id: string }>(table: Table, record: T): Promise<T> {
    // Undefined fields are dropped rather than stored as null.
    const doc = JSON.parse(JSON.stringify(record));
    await col(table).replaceOne({ _id: record.id }, { ...doc, _id: record.id }, { upsert: true, ...opts() });
    return record;
  },
  async remove(table: Table, id: string) {
    await col(table).deleteOne({ _id: id }, opts());
  },
  async removeWhere(table: Table, filter: Filter<Document>) {
    await col(table).deleteMany(filter, opts());
  },
  async count(table: Table): Promise<number> {
    return col(table).countDocuments({}, opts());
  },
};

// Running numbers (AR, QT, PV, CV, OR, application refs) that can never repeat.
export const nextNumber = async (name: string): Promise<number> => {
  const doc = await raw('counters').findOneAndUpdate({ _id: name }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after', ...opts() });
  return doc!.value as number;
};
export const setCounterAtLeast = async (name: string, value: number) => {
  await raw('counters').updateOne({ _id: name }, { $max: { value } }, { upsert: true, ...opts() });
};

export const ping = async () => {
  await db().command({ ping: 1 });
};
