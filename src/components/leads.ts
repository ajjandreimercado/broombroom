import type { ClientLead, Conversation } from '../types.ts';

// Shared by the site and the API server: keep this file free of browser-only code.

export const UNCLAIMED_ALERT_MS = 2 * 60 * 60 * 1000; // admin is told after 2 hours in the pool
export const REPLY_RELEASE_MS = 24 * 60 * 60 * 1000; // an owned client waiting 24 hours for a reply goes back to the pool

export const TAKEOVER_MS = 48 * 60 * 60 * 1000; // the admin may take over a chat the client has waited 2 days in

// When the client's unanswered message in this chat was sent (null = the last word was a reply).
export const unansweredSince = (c: Conversation): number | null => {
  const last = c.messages[c.messages.length - 1];
  return last && !last.isSeller ? t(last.timestamp) : null;
};
export const canTakeOver = (c: Conversation, now: number) => {
  const since = unansweredSince(c);
  return !c.takenOverAt && since !== null && now - since >= TAKEOVER_MS;
};

export const agentSlug = (name: string) => name.toLowerCase().trim().replace(/\s+/g, '-');

const t = (iso?: string) => (iso ? new Date(iso).getTime() : 0);

// When an owned client started waiting for a reply (null = not waiting). The clock starts at claim time
// if the client wrote before the agent took them.
export const waitingSince = (lead: ClientLead): number | null => {
  if (!lead.agentName || !lead.lastClientAt) return null;
  if (t(lead.lastAgentAt) >= t(lead.lastClientAt)) return null;
  return Math.max(t(lead.lastClientAt), t(lead.claimedAt));
};

export const shouldRelease = (lead: ClientLead, now: number) => {
  if (lead.lockedTo) return false; // locked to the agent whose apply link the client used
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
