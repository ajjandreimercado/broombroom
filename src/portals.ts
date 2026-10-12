// Broom Broom runs as three sites from one build, told apart by hostname:
//   broombroom.ph        clients (public marketplace)
//   agent.broombroom.ph  agent portal
//   admin.broombroom.ph  admin console
// Locally the same split works on localhost, agent.localhost and admin.localhost.
// Set VITE_BUYER_URL / VITE_AGENT_URL / VITE_ADMIN_URL to override the derived URLs.

export type Portal = 'buyer' | 'seller' | 'admin';

const PREFIX: Record<Exclude<Portal, 'buyer'>, string> = { seller: 'agent.', admin: 'admin.' };

const detect = (hostname: string): Portal =>
  hostname.startsWith(PREFIX.seller) ? 'seller' : hostname.startsWith(PREFIX.admin) ? 'admin' : 'buyer';

// GitHub Pages (the demo host) can't serve subdomains, so there the portal comes from ?portal=agent|admin.
const QUERY_MODE = window.location.hostname.endsWith('github.io');
const QUERY_KEY: Record<Exclude<Portal, 'buyer'>, string> = { seller: 'agent', admin: 'admin' };
const fromQuery = (): Portal => {
  const q = new URLSearchParams(window.location.search).get('portal');
  return q === QUERY_KEY.seller ? 'seller' : q === QUERY_KEY.admin ? 'admin' : 'buyer';
};

export const PORTAL: Portal = QUERY_MODE ? fromQuery() : detect(window.location.hostname);

const ENV_URL: Record<Portal, string | undefined> = {
  buyer: import.meta.env.VITE_BUYER_URL,
  seller: import.meta.env.VITE_AGENT_URL,
  admin: import.meta.env.VITE_ADMIN_URL,
};

// The bare domain this site sits under, e.g. "broombroom.ph" or "localhost".
const baseHost = () => {
  const { hostname } = window.location;
  return PORTAL === 'buyer' ? hostname : hostname.slice(PREFIX[PORTAL].length);
};

export const portalUrl = (portal: Portal, query = ''): string => {
  if (QUERY_MODE) {
    const page = window.location.origin + window.location.pathname;
    return portal === 'buyer' ? page + query : `${page}?portal=${QUERY_KEY[portal]}`;
  }
  const env = ENV_URL[portal];
  const { protocol, port } = window.location;
  const origin = env
    ? env.replace(/\/$/, '')
    : `${protocol}//${portal === 'buyer' ? '' : PREFIX[portal]}${baseHost()}${port ? `:${port}` : ''}`;
  return `${origin}/${query}`;
};

export const PORTAL_LABEL: Record<Portal, string> = {
  buyer: 'Marketplace',
  seller: 'Agent portal',
  admin: 'Admin console',
};
