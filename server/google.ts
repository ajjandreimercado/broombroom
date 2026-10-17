/// <reference types="node" />
import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';

// "Sign in with Google": the site gets an ID token (a JWT signed by Google) and the server checks it here:
// Google's signature, issued by Google, for this site's client ID (GOOGLE_CLIENT_ID), not expired, verified email.
export type GoogleProfile = { sub: string; email: string; name: string; picture?: string };

type Jwk = JsonWebKey & { kid: string };
type KeySource = () => Promise<Jwk[]>;

// Google's public keys rotate; they are cached for as long as Google's Cache-Control says (max 1 day).
let cache: { keys: Jwk[]; until: number } | undefined;
const googleKeys: KeySource = async () => {
  if (cache && cache.until > Date.now()) return cache.keys;
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!res.ok) throw new Error(`Google keys: HTTP ${res.status}`);
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] ?? 3600);
  cache = { keys: ((await res.json()) as { keys: Jwk[] }).keys, until: Date.now() + Math.min(maxAge, 86400) * 1000 };
  return cache.keys;
};

const part = (s: string) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

// Returns the profile, or undefined when the token is not a valid Google sign-in for this site.
export const verifyGoogleToken = async (token: unknown, clientId: string, keys: KeySource = googleKeys, now = Date.now()): Promise<GoogleProfile | undefined> => {
  if (typeof token !== 'string' || token.length > 4096) return undefined;
  const [h, p, sig] = token.split('.');
  if (!h || !p || !sig) return undefined;
  try {
    const header = part(h);
    if (header.alg !== 'RS256') return undefined;
    const jwk = (await keys()).find((k) => k.kid === header.kid);
    if (!jwk) return undefined;
    const ok = verify('RSA-SHA256', Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(sig, 'base64url'));
    if (!ok) return undefined;
    const c = part(p);
    if (c.iss !== 'accounts.google.com' && c.iss !== 'https://accounts.google.com') return undefined;
    if (c.aud !== clientId) return undefined;
    if (typeof c.exp !== 'number' || c.exp * 1000 < now - 60_000) return undefined; // one minute of clock skew
    if (c.email_verified !== true || typeof c.email !== 'string' || typeof c.sub !== 'string') return undefined;
    return { sub: c.sub, email: c.email.toLowerCase(), name: String(c.name || c.email.split('@')[0]).slice(0, 120), picture: typeof c.picture === 'string' ? c.picture : undefined };
  } catch {
    return undefined;
  }
};
