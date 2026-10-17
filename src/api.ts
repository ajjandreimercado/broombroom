import { PORTAL } from './portals.ts';

// Talks to the Broom Broom API (server/). Every call says which portal it comes from: the server keeps a
// separate sign-in per portal and rejects calls without this header (cross-site protection).
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const read = async (res: Response) => {
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, res.status >= 500 ? 'The server had a problem. Please try again.' : 'Unexpected reply from the server.');
  }
  if (!res.ok || json?.ok === false) throw new ApiError(res.status, json?.error || 'Something went wrong. Please try again.');
  return json && 'data' in json ? json.data : json;
};

export const api = async <T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      credentials: 'same-origin',
      headers: { 'X-Portal': PORTAL, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  return read(res);
};

export type Uploaded = { id: string; url: string; name: string; mime: string };

// Sends one file. Private files (documents, receipts) can only be opened by their owner and admins;
// public files (listing photos and videos) by anyone.
export const uploadFile = async (file: Blob, name: string, visibility: 'public' | 'private' = 'private'): Promise<Uploaded> => {
  let res: Response;
  try {
    res = await fetch(`/api/uploads?visibility=${visibility}&name=${encodeURIComponent(name)}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-Portal': PORTAL, 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  return read(res);
};

export const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();
