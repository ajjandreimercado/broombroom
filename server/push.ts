/// <reference types="node" />
import webpush from 'web-push';
import { createHash } from 'node:crypto';
import { store, outsideTx } from './db.ts';
import { HttpError, type User } from './auth.ts';

// Phone notifications (Web Push). Every bell notification is also pushed to the person's subscribed phones and
// browsers, even when the site is closed. Without VAPID keys in the environment, push is simply off.
type PushSub = { id: string; userId: string; role: User['role']; name: string; endpoint: string; keys: { p256dh: string; auth: string }; createdAt: string };
export type PushMessage = { title: string; body: string; url: string };

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
let pushEnabled = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (pushEnabled) webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:broombroombookingservices@gmail.com', VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
export const pushPublicKey = () => (VAPID_PUBLIC_KEY && pushEnabled ? VAPID_PUBLIC_KEY : null);

// Tests swap this for a fake; it never runs without keys.
export let sendNotification: (sub: PushSub, payload: string) => Promise<unknown> = (sub, payload) =>
  webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 24 * 3600 });
export const setSender = (fn: typeof sendNotification) => {
  sendNotification = fn;
  pushEnabled = true;
};

const B64URL = /^[A-Za-z0-9_-]{16,200}$/;
const idOf = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex').slice(0, 32);

export const subscribe = async (me: User, sub: any) => {
  const endpoint = sub?.endpoint;
  const keys = sub?.keys;
  if (typeof endpoint !== 'string' || endpoint.length > 1000 || !/^https:\/\/[^\s]+$/.test(endpoint)) throw new HttpError(400, 'That is not a valid push subscription.');
  if (!B64URL.test(keys?.p256dh ?? '') || !B64URL.test(keys?.auth ?? '')) throw new HttpError(400, 'That is not a valid push subscription.');
  // One device belongs to whoever subscribed it last (a shared phone moves to the new account).
  await store.put<PushSub>('push_subs', { id: idOf(endpoint), userId: me.id, role: me.role, name: me.name, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, createdAt: new Date().toISOString() });
};

export const unsubscribe = async (me: User, endpoint: unknown) => {
  if (typeof endpoint !== 'string') return;
  const s = await store.get<PushSub>('push_subs', idOf(endpoint));
  if (s?.userId === me.id) await store.remove('push_subs', s.id);
};

// Who gets it: a client by id; an agent by name (or every agent); every admin.
export const sendPush = async (audience: 'client' | 'agent' | 'admin', recipient: string | undefined, msg: PushMessage) => {
  if (!pushEnabled) return;
  const filter = audience === 'client' ? { role: 'buyer', userId: recipient } : audience === 'agent' ? { role: 'seller', ...(recipient ? { name: recipient } : {}) } : { role: 'admin' };
  if (audience === 'client' && !recipient) return;
  const subs = await store.all<PushSub>('push_subs', filter);
  const payload = JSON.stringify({ ...msg, body: msg.body.slice(0, 180) });
  await Promise.all(
    subs.map((s) =>
      sendNotification(s, payload).catch(async (e: { statusCode?: number }) => {
        // Gone: the phone unsubscribed or the app was removed.
        if (e?.statusCode === 404 || e?.statusCode === 410) await store.remove('push_subs', s.id);
        else console.warn('push failed', e?.statusCode ?? e);
      })
    )
  );
};

// Where a notification opens, matching the bell's links (Navbar.openNotification). ?go= is read on load.
// ponytail: query-mode portals only (?portal=); with agent./admin. subdomains, build absolute portal URLs here.
export const linkFor = (audience: 'client' | 'agent' | 'admin', target?: string) =>
  `/?${audience === 'client' ? '' : `portal=${audience === 'agent' ? 'agent' : 'admin'}&`}go=${encodeURIComponent(target ?? (audience === 'client' ? 'notifications' : 'dashboard'))}`;

// Sends after the current request's database transaction (never inside it), and never fails the caller.
export const pushLater = (audience: 'client' | 'agent' | 'admin', recipient: string | undefined, msg: PushMessage) =>
  void outsideTx(() => setImmediate(() => sendPush(audience, recipient, msg).catch((e) => console.warn('push failed', e))));
