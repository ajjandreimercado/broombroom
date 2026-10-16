import type { ClientLead } from '../types.ts';
import { AGENTS } from '../data/mockData.ts';
import { portalUrl } from '../portals.ts';

export const UNCLAIMED_ALERT_MS = 2 * 60 * 60 * 1000; // admin is told after 2 hours in the pool
export const REPLY_RELEASE_MS = 24 * 60 * 60 * 1000; // an owned client waiting 24 hours for a reply goes back to the pool

export const agentSlug = (name: string) => name.toLowerCase().trim().replace(/\s+/g, '-');
export const agentFromSlug = (slug: string | null) => (slug ? AGENTS.find((a) => agentSlug(a) === slug.toLowerCase()) : undefined);

// An agent's personal link to a listing; clients who arrive through it become that agent's clients.
export const referralLink = (vehicleId: string, agentName: string) => portalUrl('buyer', `?vehicle=${vehicleId}&agent=${agentSlug(agentName)}`);

const t = (iso?: string) => (iso ? new Date(iso).getTime() : 0);

// When an owned client started waiting for a reply (null = not waiting). The clock starts at claim time
// if the client wrote before the agent took them.
export const waitingSince = (lead: ClientLead): number | null => {
  if (!lead.agentName || !lead.lastClientAt) return null;
  if (t(lead.lastAgentAt) >= t(lead.lastClientAt)) return null;
  return Math.max(t(lead.lastClientAt), t(lead.claimedAt));
};

export const shouldRelease = (lead: ClientLead, now: number) => {
  const since = waitingSince(lead);
  return since !== null && now - since >= REPLY_RELEASE_MS;
};

export const shouldAlertUnclaimed = (lead: ClientLead, now: number) =>
  !lead.agentName && !lead.escalatedAt && now - t(lead.pooledAt ?? lead.createdAt) >= UNCLAIMED_ALERT_MS;

// "5h 12m", "45m"
export const duration = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
};
