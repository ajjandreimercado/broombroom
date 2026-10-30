/// <reference types="node" />
// Where uploaded files (photos, videos, client documents) are kept. With the R2_* settings present they go to a private
// Cloudflare R2 bucket (free storage far above MongoDB's 512 MB); without them (development, tests) they stay in MongoDB
// GridFS as before. Each file's `uploads` row says where it lives (`store: 'r2'`), so both kinds can coexist while the
// existing files are moved over.
import { Readable } from 'node:stream';
import { AwsClient } from 'aws4fetch';
import { files } from './db.ts';

export type StoredRow = { _id: string; store?: 'r2' };

const cfg = () => {
  const { R2_ACCOUNT_ID: account, R2_ACCESS_KEY_ID: key, R2_SECRET_ACCESS_KEY: secret, R2_BUCKET: bucket, R2_ENDPOINT: endpoint } = process.env;
  return key && secret && bucket && (account || endpoint) ? { key, secret, bucket, base: (endpoint || `https://${account}.r2.cloudflarestorage.com`).replace(/\/$/, '') } : undefined;
};
export const r2Enabled = () => !!cfg();

let client: { id: string; aws: AwsClient } | undefined;
const r2 = () => {
  const c = cfg();
  if (!c) throw new Error('R2 is not configured');
  if (client?.id !== c.key + c.secret) client = { id: c.key + c.secret, aws: new AwsClient({ accessKeyId: c.key, secretAccessKey: c.secret, service: 's3', region: 'auto' }) };
  return { aws: client.aws, url: (id: string) => `${c.base}/${c.bucket}/${encodeURIComponent(id)}` };
};

// Saves a file; returns where it went.
export const putFile = async (id: string, name: string, mime: string, buf: Buffer): Promise<'r2' | undefined> => {
  if (r2Enabled()) {
    const { aws, url } = r2();
    // Payload hash is skipped over HTTPS (R2 allows it), so a 100 MB video is not hashed in memory first.
    const res = await aws.fetch(url(id), { method: 'PUT', body: buf as unknown as BodyInit, headers: { 'Content-Type': mime, 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD' } });
    if (!res.ok) throw new Error(`R2 upload failed: HTTP ${res.status}`);
    return 'r2';
  }
  await new Promise<void>((resolve, reject) => {
    files().openUploadStreamWithId(id as any, name, { metadata: { mime } }).on('finish', () => resolve()).on('error', reject).end(buf);
  });
  return undefined;
};

export const deleteFile = async (row: StoredRow) => {
  if (row.store === 'r2') {
    const { aws, url } = r2();
    const res = await aws.fetch(url(row._id), { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed: HTTP ${res.status}`);
  } else await files().delete(row._id as any).catch(() => {}); // already gone is fine
};

// A signed link that lets the browser download a public file straight from R2 (Cloudflare does not charge for R2
// downloads; streaming through this server used up the host's bandwidth). Signed as of the start of the UTC day, so
// the link stays the same all day and browsers cache the file; it works for two days.
export const r2Link = async (row: StoredRow) => {
  const { aws, url } = r2();
  const u = new URL(url(row._id));
  u.searchParams.set('X-Amz-Expires', String(2 * 86400));
  u.searchParams.set('response-cache-control', 'public, max-age=86400');
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '') + 'T000000Z';
  return (await aws.sign(u.toString(), { method: 'GET', aws: { signQuery: true, datetime: day } })).url;
};

// A file's bytes, with the status and headers to send. `range` (e.g. "bytes=0-1023") is passed through for R2 so videos can seek.
export const readFile = async (row: StoredRow, range?: string): Promise<{ status: number; headers: Record<string, string>; stream: Readable } | undefined> => {
  if (row.store === 'r2') {
    const { aws, url } = r2();
    const res = await aws.fetch(url(row._id), { headers: range ? { Range: range } : {} });
    if (res.status === 404 || !res.body) return undefined;
    if (!res.ok && res.status !== 206) throw new Error(`R2 read failed: HTTP ${res.status}`);
    const headers: Record<string, string> = { 'Accept-Ranges': 'bytes' };
    for (const h of ['content-length', 'content-range']) if (res.headers.get(h)) headers[h] = res.headers.get(h)!;
    return { status: res.status, headers, stream: Readable.fromWeb(res.body as any) };
  }
  return { status: 200, headers: {}, stream: files().openDownloadStream(row._id as any) };
};
