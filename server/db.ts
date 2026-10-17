/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// SQLite file under server/data (git-ignored). Each record keeps its full JSON in `data` plus the columns the
// server filters on, so moving to Postgres later is a column-for-column copy (data becomes jsonb).
// Paths are from the project folder (npm runs scripts there; Vite bundles this file into its config).
export const DATA_DIR = path.resolve(process.env.BB_DATA_DIR || path.join(process.cwd(), 'server', 'data'));
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(process.env.BB_DB_FILE || path.join(DATA_DIR, 'broombroom.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Indexed columns per table, read from the record when it is saved.
const TABLES = {
  vehicles: { status: (r: any) => r.status },
  applications: { applicant_id: (r: any) => r.applicantId, seller_name: (r: any) => r.sellerName, status: (r: any) => r.status, reference_no: (r: any) => r.referenceNo },
  conversations: { buyer_id: (r: any) => r.buyerId, seller_name: (r: any) => r.sellerName, vehicle_id: (r: any) => r.vehicleId },
  leads: { client_id: (r: any) => r.clientId, agent_name: (r: any) => r.agentName ?? null },
  quotations: { client_id: (r: any) => r.clientId, status: (r: any) => r.status },
  commissions: { agent_name: (r: any) => r.agentName, application_ref: (r: any) => r.applicationRef, status: (r: any) => r.status },
  listing_requests: { agent_name: (r: any) => r.agentName, status: (r: any) => r.status },
  reports: { status: (r: any) => r.status },
  notifications: { audience: (r: any) => r.audience ?? 'client', recipient: (r: any) => r.recipient ?? null, created_at: (r: any) => r.createdAt },
  vouchers: { kind: (r: any) => r.kind, account_id: (r: any) => r.accountId },
} as const;
export type Table = keyof typeof TABLES;

for (const [name, cols] of Object.entries(TABLES)) {
  const extra = Object.keys(cols).map((c) => `${c} TEXT`).join(', ');
  db.exec(`CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY, ${extra}, data TEXT NOT NULL)`);
  for (const c of Object.keys(cols)) db.exec(`CREATE INDEX IF NOT EXISTS ${name}_${c} ON ${name}(${c})`);
}
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL CHECK (role IN ('buyer', 'seller', 'admin')),
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portal TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
    mime TEXT NOT NULL,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    attached INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
`);

const json = (row: any) => (row ? JSON.parse(row.data) : undefined);

export const store = {
  all<T>(table: Table, where = '', ...params: (string | number | null)[]): T[] {
    return db.prepare(`SELECT data FROM ${table} ${where ? `WHERE ${where}` : ''}`).all(...params).map(json) as T[];
  },
  get<T>(table: Table, id: string): T | undefined {
    return json(db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id));
  },
  put<T extends { id: string }>(table: Table, record: T): T {
    const cols = TABLES[table] as Record<string, (r: any) => unknown>;
    const names = Object.keys(cols);
    db.prepare(
      `INSERT INTO ${table} (id, ${names.join(', ')}, data) VALUES (?, ${names.map(() => '?').join(', ')}, ?)
       ON CONFLICT(id) DO UPDATE SET ${names.map((n) => `${n} = excluded.${n}`).join(', ')}, data = excluded.data`
    ).run(record.id, ...names.map((n) => (cols[n](record) ?? null) as string | null), JSON.stringify(record));
    return record;
  },
  remove(table: Table, id: string) {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  },
  count(table: Table): number {
    return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
  },
};

// Everything in fn commits together or not at all.
export const tx = <T>(fn: () => T): T => {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
};

// Running numbers (AR, QT, PV, CV, OR, application refs) that can never repeat.
export const nextNumber = (name: string, startAfter = 0): number => {
  db.prepare('INSERT INTO counters (name, value) VALUES (?, ?) ON CONFLICT(name) DO NOTHING').run(name, startAfter);
  return (db.prepare('UPDATE counters SET value = value + 1 WHERE name = ? RETURNING value').get(name) as { value: number }).value;
};
export const setCounterAtLeast = (name: string, value: number) => {
  db.prepare('INSERT INTO counters (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = MAX(value, excluded.value)').run(name, value);
};
