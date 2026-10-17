/// <reference types="node" />
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { UserProfile } from '../src/types.ts';
import { db } from './db.ts';

export type Portal = 'buyer' | 'seller' | 'admin';
export type Role = Portal;
export interface User extends UserProfile {
  role: Role;
  active: boolean;
}

const SESSION_DAYS = 30;
const cookieName = (portal: Portal) => `bb_${portal}`;

export const hashPassword = (password: string) => {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
};
const passwordMatches = (password: string, stored: string) => {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const a = scryptSync(password, Buffer.from(salt, 'hex'), 64);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
};
export const validPassword = (p: unknown): p is string => typeof p === 'string' && p.length >= 8 && p.length <= 200;

const rowToUser = (row: any): User | undefined =>
  row ? { ...JSON.parse(row.data), id: row.id, email: row.email, role: row.role, name: row.name, active: !!row.active } : undefined;

export const users = {
  byId: (id: string) => rowToUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)),
  byEmail: (email: string) => rowToUser(db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim())),
  all: () => (db.prepare('SELECT * FROM users ORDER BY role, name').all() as any[]).map((r) => rowToUser(r)!),
  agents: () => (db.prepare("SELECT * FROM users WHERE role = 'seller' AND active = 1 ORDER BY name").all() as any[]).map((r) => rowToUser(r)!),
  create(u: Omit<User, 'active'> & { password: string }) {
    const { id, email, role, name, password, ...profile } = u;
    db.prepare('INSERT INTO users (id, email, role, name, password_hash, active, created_at, data) VALUES (?, ?, ?, ?, ?, 1, ?, ?)').run(
      id, email.trim(), role, name.trim(), hashPassword(password), new Date().toISOString(), JSON.stringify(profile)
    );
    return users.byId(id)!;
  },
  // Profile fields only; email, role and password change through their own paths.
  saveProfile(u: User) {
    const { id, email, role, name, active, ...profile } = u;
    db.prepare('UPDATE users SET name = ?, data = ? WHERE id = ?').run(name, JSON.stringify(profile), id);
  },
  setPassword(id: string, password: string) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id); // sign out everywhere
  },
  setActive(id: string, active: boolean) {
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
    if (!active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  },
  checkPassword(id: string, password: string) {
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id) as { password_hash: string } | undefined;
    return !!row && passwordMatches(password, row.password_hash);
  },
  verify(email: string, password: string) {
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim()) as any;
    // Hash anyway when the email is unknown, so response time does not reveal which emails exist.
    if (!row) return void passwordMatches(password, `${'0'.repeat(32)}:${'0'.repeat(128)}`);
    return passwordMatches(password, row.password_hash) ? rowToUser(row) : undefined;
  },
};

const tokenHash = (t: string) => createHash('sha256').update(t).digest('hex');

export const startSession = (res: Response, req: Request, user: User, portal: Portal) => {
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, user_id, portal, expires_at) VALUES (?, ?, ?, ?)').run(
    tokenHash(token), user.id, portal, Date.now() + SESSION_DAYS * 864e5
  );
  res.cookie(cookieName(portal), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: SESSION_DAYS * 864e5,
    path: '/',
  });
};

export const endSession = (req: Request, res: Response, portal: Portal) => {
  const token = readCookie(req, cookieName(portal));
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
  res.clearCookie(cookieName(portal), { path: '/' });
};

const readCookie = (req: Request, name: string) => {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
};

export const portalOf = (req: Request): Portal => {
  const p = req.get('x-portal');
  return p === 'seller' || p === 'admin' ? p : 'buyer';
};

// Attaches req.user for the portal the request comes from. A session only works on the portal it was made for,
// and only while the account is active and still has that portal's role.
export const sessionUser = (req: Request, portal: Portal = portalOf(req)): User | undefined => {
  const token = readCookie(req, cookieName(portal));
  if (!token) return undefined;
  const s = db.prepare('SELECT user_id, portal, expires_at FROM sessions WHERE token_hash = ?').get(tokenHash(token)) as
    | { user_id: string; portal: string; expires_at: number }
    | undefined;
  if (!s || s.portal !== portal || s.expires_at < Date.now()) return undefined;
  const user = users.byId(s.user_id);
  return user && user.active && user.role === portal ? user : undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new HttpError(401, 'Please sign in first.'));
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Your account cannot do that.'));
  next();
};

// Simple sign-in throttle: 10 failed tries per email + address per 15 minutes.
const attempts = new Map<string, { n: number; until: number }>();
export const throttle = {
  check(key: string) {
    const a = attempts.get(key);
    if (a && a.until > Date.now() && a.n >= 10) throw new HttpError(429, 'Too many sign-in attempts. Try again in 15 minutes.');
  },
  fail(key: string) {
    const a = attempts.get(key);
    attempts.set(key, a && a.until > Date.now() ? { n: a.n + 1, until: a.until } : { n: 1, until: Date.now() + 15 * 60e3 });
  },
  clear: (key: string) => attempts.delete(key),
};

export const publicUser = (u: User) => {
  const { active, ...rest } = u;
  return rest;
};
