import { api } from './api.ts';

// Phone notifications (Web Push) and installing the site as an app. iPhones only allow push for the installed app
// (Share → Add to Home Screen, iOS 16.4+).
export const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
export const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
export const local = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
};

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export const currentSub = async () => (supported() ? (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription() ?? null : null);

export const enablePush = async (): Promise<'on' | 'denied' | 'unavailable'> => {
  if (!supported()) return 'unavailable';
  const { key } = await api<{ key: string | null }>('/push/key');
  if (!key) return 'unavailable';
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
  await api('/push/subscribe', { body: { subscription: sub.toJSON() } });
  return 'on';
};

// Signing out takes this phone off the account, so the next person on it gets nothing meant for the last one.
export const disablePush = async () => {
  const sub = await currentSub().catch(() => null);
  if (!sub) return;
  await api('/push/unsubscribe', { body: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
};

