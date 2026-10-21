/// <reference types="node" />
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { UserProfile } from '../src/types.ts';
import { raw, opts } from './db.ts';

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
export { goodPassword as validPassword, PASSWORD_RULE } from '../src/components/password.ts';

// Stored as { _id, email, emailLower, role, name, passwordHash, active, createdAt, ...profile }.
const toUser = (doc: any): User | undefined => {
  if (!doc) return undefined;
  const { _id, emailLower, passwordHash, createdAt, googleId, ...rest } = doc;
  return { ...rest, id: _id, active: !!doc.active, googleLinked: !!googleId, hasPassword: !doc.noPassword };
};
const users_ = () => raw('users');
const PROFILE = ['phone', 'address', 'savedVehicleIds', 'recentlyViewedIds', 'memberSince'] as const;

export const users = {
  byId: async (id: string) => toUser(await users_().findOne({ _id: id }, opts())),
  byEmail: async (email: string) => toUser(await users_().findOne({ emailLower: email.trim().toLowerCase() }, opts())),
  byGoogleId: async (sub: string) => toUser(await users_().findOne({ googleId: sub }, opts())),
  // Sign in with Google from now on (the account keeps its password, if it has one).
  linkGoogle: async (id: string, sub: string) => void (await users_().updateOne({ _id: id }, { $set: { googleId: sub } }, opts())),
  // After signing in with Google, a temporary password someone else knows is replaced by an unknown one.
  async retireTemporaryPassword(id: string) {
    await users_().updateOne({ _id: id, mustChangePassword: true }, { $set: { passwordHash: hashPassword(randomBytes(32).toString('base64url')), noPassword: true }, $unset: { mustChangePassword: '' } }, opts());
  },
  // A client account made through Google has no password of its own; it signs in with Google.
  async createWithGoogle(u: Omit<User, 'active'>, sub: string) {
    await users.create({ ...u, password: randomBytes(32).toString('base64url') });
    await users_().updateOne({ _id: u.id }, { $set: { googleId: sub, noPassword: true } }, opts());
    return (await users.byId(u.id))!;
  },
  all: async () => (await users_().find({}, opts()).sort({ role: 1, name: 1 }).toArray()).map((d) => toUser(d)!),
  agents: async () => (await users_().find({ role: 'seller', active: true }, opts()).sort({ name: 1 }).toArray()).map((d) => toUser(d)!),
  // temporary: a password someone else chose (the admin); the person must set their own on first sign-in.
  async create(u: Omit<User, 'active'> & { password: string; temporary?: boolean }) {
    const { id, email, role, name, password } = u;
    const profile = Object.fromEntries(PROFILE.map((k) => [k, (u as any)[k]]));
    await users_().insertOne(
      {
        _id: id, email: email.trim(), emailLower: email.trim().toLowerCase(), role, name: name.trim(), passwordHash: hashPassword(password), active: true, createdAt: new Date(),
        ...(u.temporary ? { mustChangePassword: true } : {}),
        ...profile,
      },
      opts()
    );
    return (await users.byId(id))!;
  },
  // Profile fields only; email, role and password change through their own paths.
  async saveProfile(u: User) {
    const profile = Object.fromEntries(PROFILE.map((k) => [k, (u as any)[k]]));
    await users_().updateOne({ _id: u.id }, { $set: { name: u.name, ...profile } }, opts());
  },
  // temporary = set by the admin (a reset): the person must replace it. Otherwise it is their own password.
  async setPassword(id: string, password: string, temporary = false) {
    await users_().updateOne(
      { _id: id },
      temporary
        ? { $set: { passwordHash: hashPassword(password), mustChangePassword: true }, $unset: { noPassword: '' } }
        : { $set: { passwordHash: hashPassword(password) }, $unset: { noPassword: '', mustChangePassword: '' } },
      opts()
    );
    await raw('sessions').deleteMany({ userId: id }, opts()); // sign out everywhere
  },
  // A new sign-in email. The Google link belonged to the old address, so it is removed (the next Google sign-in with the
  // new address links again).
  async setEmail(id: string, email: string) {
    await users_().updateOne({ _id: id }, { $set: { email: email.trim(), emailLower: email.trim().toLowerCase() }, $unset: { googleId: '' } }, opts());
  },
  async setActive(id: string, active: boolean) {
    await users_().updateOne({ _id: id }, { $set: { active } }, opts());
    if (!active) await raw('sessions').deleteMany({ userId: id }, opts());
  },
  // Permanent deletion: the account and every sign-in session go. Records that name the person (commissions,
  // sales) are kept by the caller under their name, so the books still read correctly.
  async remove(id: string) {
    await users_().deleteOne({ _id: id }, opts());
    await raw('sessions').deleteMany({ userId: id }, opts());
  },
  async checkPassword(id: string, password: string) {
    const doc = await users_().findOne({ _id: id }, { projection: { passwordHash: 1 }, ...opts() });
    return !!doc && passwordMatches(password, doc.passwordHash);
  },
  async verify(email: string, password: string) {
    const doc = await users_().findOne({ emailLower: email.trim().toLowerCase() }, opts());
    // Hash anyway when the email is unknown, so response time does not reveal which emails exist.
    if (!doc) return void passwordMatches(password, `${'0'.repeat(32)}:${'0'.repeat(128)}`);
    return passwordMatches(password, doc.passwordHash) ? toUser(doc) : undefined;
  },
};

const tokenHash = (t: string) => createHash('sha256').update(t).digest('hex');

export const startSession = async (res: Response, req: Request, user: User, portal: Portal) => {
  const token = randomBytes(32).toString('base64url');
  await raw('sessions').insertOne({ _id: tokenHash(token), userId: user.id, portal, expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5) });
  res.cookie(cookieName(portal), token, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: SESSION_DAYS * 864e5, path: '/' });
};

export const endSession = async (req: Request, res: Response, portal: Portal) => {
  const token = readCookie(req, cookieName(portal));
  if (token) await raw('sessions').deleteOne({ _id: tokenHash(token) });
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

// The signed-in user for a portal. A session only works on the portal it was made for,
// and only while the account is active and still has that portal's role.
export const sessionUser = async (req: Request, portal: Portal = portalOf(req)): Promise<User | undefined> => {
  const token = readCookie(req, cookieName(portal));
  if (!token) return undefined;
  const s = await raw('sessions').findOne({ _id: tokenHash(token) });
  if (!s || s.portal !== portal || s.expiresAt < new Date()) return undefined;
  const user = await users.byId(s.userId);
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

// Sign-in throttle: 10 failed tries per email + address per 15 minutes.
// ponytail: kept in this process's memory; with several server instances, store it in the database.
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

// At most `max` actions per key in `windowMs` (sign-ups, support messages, reports, uploads).
// ponytail: kept in this process's memory like the sign-in throttle; move to the database with several server instances.
const hits = new Map<string, number[]>();
export const rateLimit = (key: string, max: number, windowMs: number, message = 'Too many requests. Please try again later.') => {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) throw new HttpError(429, message);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 50_000) hits.clear(); // never grows without bound
};

export const publicUser = (u: User) => {
  const { active, ...rest } = u;
  return rest;
};

