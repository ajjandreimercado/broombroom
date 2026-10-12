// Broom Broom runs as three sites from one build, told apart by hostname:
//   broombroom.ph        buyers (public marketplace)
//   sell.broombroom.ph   salesperson portal
//   admin.broombroom.ph  admin console
// Locally the same split works on localhost, sell.localhost and admin.localhost.
// Set VITE_BUYER_URL / VITE_SELLER_URL / VITE_ADMIN_URL to override the derived URLs.

export type Portal = 'buyer' | 'seller' | 'admin';

const PREFIX: Record<Exclude<Portal, 'buyer'>, string> = { seller: 'sell.', admin: 'admin.' };

const detect = (hostname: string): Portal =>
  hostname.startsWith(PREFIX.seller) ? 'seller' : hostname.startsWith(PREFIX.admin) ? 'admin' : 'buyer';

export const PORTAL: Portal = detect(window.location.hostname);

const ENV_URL: Record<Portal, string | undefined> = {
  buyer: import.meta.env.VITE_BUYER_URL,
  seller: import.meta.env.VITE_SELLER_URL,
  admin: import.meta.env.VITE_ADMIN_URL,
};

// The bare domain this site sits under, e.g. "broombroom.ph" or "localhost".
const baseHost = () => {
  const { hostname } = window.location;
  return PORTAL === 'buyer' ? hostname : hostname.slice(PREFIX[PORTAL].length);
};

export const portalUrl = (portal: Portal, query = ''): string => {
  const env = ENV_URL[portal];
  const { protocol, port } = window.location;
  const origin = env
    ? env.replace(/\/$/, '')
    : `${protocol}//${portal === 'buyer' ? '' : PREFIX[portal]}${baseHost()}${port ? `:${port}` : ''}`;
  return `${origin}/${query}`;
};

export const PORTAL_LABEL: Record<Portal, string> = {
  buyer: 'Marketplace',
  seller: 'Salesperson portal',
  admin: 'Admin console',
};
