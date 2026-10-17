// Broom Broom runs as three sites from one build. On any address the portal is picked with ?portal=:
//   https://example.com/                 clients (public marketplace)
//   https://example.com/?portal=agent    agent portal
//   https://example.com/?portal=admin    admin console
// Subdomains also work (agent.example.com, admin.example.com) when those hostnames point at the same service;
// set VITE_AGENT_URL / VITE_ADMIN_URL (and VITE_BUYER_URL) at build time to link between them.

export type Portal = 'buyer' | 'seller' | 'admin';

const PREFIX: Record<Exclude<Portal, 'buyer'>, string> = { seller: 'agent.', admin: 'admin.' };

const detect = (hostname: string): Portal =>
  hostname.startsWith(PREFIX.seller) ? 'seller' : hostname.startsWith(PREFIX.admin) ? 'admin' : 'buyer';

const ENV_URL: Record<Portal, string | undefined> = {
  buyer: import.meta.env.VITE_BUYER_URL,
  seller: import.meta.env.VITE_AGENT_URL,
  admin: import.meta.env.VITE_ADMIN_URL,
};

// One address with ?portal=, unless this is an agent./admin. subdomain or the build names separate portal URLs.
const QUERY_MODE = detect(window.location.hostname) === 'buyer' && !ENV_URL.seller && !ENV_URL.admin;
const QUERY_KEY: Record<Exclude<Portal, 'buyer'>, string> = { seller: 'agent', admin: 'admin' };
const fromQuery = (): Portal => {
  const q = new URLSearchParams(window.location.search).get('portal');
  return q === QUERY_KEY.seller ? 'seller' : q === QUERY_KEY.admin ? 'admin' : 'buyer';
};

export const PORTAL: Portal = QUERY_MODE ? fromQuery() : detect(window.location.hostname);

// The bare domain this site sits under, e.g. "example.com" or "localhost".
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
