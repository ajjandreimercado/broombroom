/// <reference types="node" />
import type { Vehicle, VehicleApplication, Conversation, Commission, ListingRequest, VehicleReport, AppNotification, Expense, Quotation, ClientLead } from '../src/types.ts';
import { store } from './db.ts';
import { users, publicUser, type User } from './auth.ts';
import { notificationScope, ownerOf } from './services.ts';

const newestFirst = <T>(rows: T[], key: (r: T) => string | undefined) => rows.sort((a, b) => (key(b) ?? '').localeCompare(key(a) ?? ''));

// Everything one person may see, in one response. The site refetches it whenever the server announces a change.
// ponytail: whole-state refetch is fine for a dealership's volume; page large lists (notifications, chats) when they grow.
export const buildState = (me?: User) => {
  const role = me?.role;
  const vehicles = newestFirst(
    store.all<Vehicle>('vehicles', role === 'admin' || role === 'seller' ? '' : "status IN ('available', 'reserved')"),
    (v) => v.createdAt
  );
  const base = { me: me ? publicUser(me) : null, vehicles };
  if (!me) return base;

  const [where, params] = notificationScope(me);
  const notifications = newestFirst(store.all<AppNotification>('notifications', where, ...params), (n) => n.createdAt).slice(0, 200);

  if (role === 'buyer') {
    return {
      ...base,
      notifications,
      applications: newestFirst(store.all<VehicleApplication>('applications', 'applicant_id = ?', me.id), (a) => a.submittedAt),
      conversations: newestFirst(store.all<Conversation>('conversations', 'buyer_id = ?', me.id), (c) => c.updatedAt),
      quotations: newestFirst(store.all<Quotation>('quotations', 'client_id = ?', me.id), (q) => q.requestedAt),
      myAgent: ownerOf(me.id) ?? null,
    };
  }

  const agents = users.agents().map((a) => a.name);

  if (role === 'seller') {
    const conversations = newestFirst(store.all<Conversation>('conversations', 'seller_name = ?', me.name), (c) => c.updatedAt);
    // Open leads show the client's latest message so agents know what they are claiming.
    const leads = store.all<ClientLead>('leads', 'agent_name IS NULL OR agent_name = ?', me.name).map((l) => {
      if (l.agentName) return l;
      const last = store
        .all<Conversation>('conversations', 'buyer_id = ?', l.clientId)
        .flatMap((c) => c.messages.filter((m) => !m.isSeller))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      return { ...l, preview: last?.text };
    });
    return {
      ...base,
      notifications,
      agents,
      conversations,
      leads,
      applications: newestFirst(store.all<VehicleApplication>('applications', 'seller_name = ?', me.name), (a) => a.submittedAt),
      commissions: newestFirst(store.all<Commission>('commissions', 'agent_name = ?', me.name), (c) => c.createdAt),
      listingRequests: newestFirst(store.all<ListingRequest>('listing_requests', 'agent_name = ?', me.name), (r) => r.createdAt),
    };
  }

  // Admin: everything, plus the account list (never password hashes).
  return {
    ...base,
    notifications,
    agents,
    users: users.all().map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, phone: u.phone, memberSince: u.memberSince })),
    applications: newestFirst(store.all<VehicleApplication>('applications'), (a) => a.submittedAt),
    conversations: newestFirst(store.all<Conversation>('conversations'), (c) => c.updatedAt),
    leads: newestFirst(store.all<ClientLead>('leads'), (l) => l.createdAt),
    commissions: newestFirst(store.all<Commission>('commissions'), (c) => c.createdAt),
    listingRequests: newestFirst(store.all<ListingRequest>('listing_requests'), (r) => r.createdAt),
    reports: newestFirst(store.all<VehicleReport>('reports'), (r) => r.createdAt),
    quotations: newestFirst(store.all<Quotation>('quotations'), (q) => q.requestedAt),
    expenses: newestFirst(store.all<Expense>('vouchers', "kind = 'expense'"), (e) => e.paymentDate),
    credits: newestFirst(store.all<Expense>('vouchers', "kind = 'credit'"), (e) => e.paymentDate),
  };
};
