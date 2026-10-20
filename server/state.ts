/// <reference types="node" />
import type { Vehicle, VehicleApplication, Conversation, Commission, ListingRequest, VehicleReport, AppNotification, Expense, Quotation, ClientLead, ManualReceipt, SalesEntry, LedgerAccount, Referral } from '../src/types.ts';
import { store } from './db.ts';
import { users, publicUser, type User } from './auth.ts';
import { notificationScope, ownerOf } from './services.ts';

const NEWEST = (field: string) => ({ [field]: -1 as const });

// Everything one person may see, in one response. The site refetches it whenever the server announces a change.
// ponytail: whole-state refetch is fine for a dealership's volume; page large lists (notifications, chats) when they grow.
export const buildState = async (me?: User) => {
  const role = me?.role;
  const vehicles = await store.all<Vehicle>('vehicles', role === 'admin' || role === 'seller' ? {} : { status: { $in: ['available', 'reserved'] } }, NEWEST('createdAt'));
  // The Google client ID is public (it is in every Google button); the site shows the button only when it is set.
  const base = { me: me ? publicUser(me) : null, vehicles, googleClientId: process.env.GOOGLE_CLIENT_ID || null };
  // A temporary password shows nothing until the person sets their own.
  if (me?.mustChangePassword) return { ...base, vehicles: [] };
  if (!me) return base;

  const notifications = (await store.all<AppNotification>('notifications', notificationScope(me), NEWEST('createdAt'))).slice(0, 200);

  if (role === 'buyer') {
    const [applications, conversations, quotations, myAgent] = await Promise.all([
      store.all<VehicleApplication>('applications', { applicantId: me.id }, NEWEST('submittedAt')),
      store.all<Conversation>('conversations', { buyerId: me.id }, NEWEST('updatedAt')),
      store.all<Quotation>('quotations', { clientId: me.id }, NEWEST('requestedAt')),
      ownerOf(me.id),
    ]);
    return { ...base, notifications, applications, conversations, quotations, myAgent: myAgent ?? null };
  }

  const agents = (await users.agents()).map((a) => a.name);

  if (role === 'seller') {
    const [conversations, rawLeads, applications, commissions, listingRequests] = await Promise.all([
      store.all<Conversation>('conversations', { sellerName: me.name }, NEWEST('updatedAt')),
      store.all<ClientLead>('leads', { agentName: { $in: [null, me.name] } }),
      store.all<VehicleApplication>('applications', { sellerName: me.name }, NEWEST('submittedAt')),
      store.all<Commission>('commissions', { agentName: me.name }, NEWEST('createdAt')),
      store.all<ListingRequest>('listing_requests', { agentName: me.name }, NEWEST('createdAt')),
    ]);
    // Open leads show the client's latest message so agents know what they are claiming.
    const leads = await Promise.all(
      rawLeads.map(async (l) => {
        if (l.agentName) return l;
        const last = (await store.all<Conversation>('conversations', { buyerId: l.clientId }))
          .flatMap((c) => c.messages.filter((m) => !m.isSeller))
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
        return { ...l, preview: last?.text };
      })
    );
    return { ...base, notifications, agents, conversations, leads, applications: applications.map(({ infoSheet, ciComments, ...a }) => a), commissions, listingRequests };
  }

  // Admin: everything, plus the account list (never password hashes).
  const [accounts, applications, conversations, leads, commissions, listingRequests, reports, quotations, expenses, credits, receipts, salesEntries, ledgerAccounts, referrals] = await Promise.all([
    users.all(),
    store.all<VehicleApplication>('applications', {}, NEWEST('submittedAt')),
    store.all<Conversation>('conversations', {}, NEWEST('updatedAt')),
    store.all<ClientLead>('leads', {}, NEWEST('createdAt')),
    store.all<Commission>('commissions', {}, NEWEST('createdAt')),
    store.all<ListingRequest>('listing_requests', {}, NEWEST('createdAt')),
    store.all<VehicleReport>('reports', {}, NEWEST('createdAt')),
    store.all<Quotation>('quotations', {}, NEWEST('requestedAt')),
    store.all<Expense>('vouchers', { kind: 'expense' }, NEWEST('paymentDate')),
    store.all<Expense>('vouchers', { kind: 'credit' }, NEWEST('paymentDate')),
    store.all<ManualReceipt>('receipts', {}, NEWEST('date')),
    store.all<SalesEntry>('sales_entries', {}, NEWEST('date')),
    store.all<LedgerAccount>('ledger_accounts', {}, { createdAt: 1 }),
    store.all<Referral>('referrals', {}, NEWEST('createdAt')),
  ]);
  return {
    ...base,
    notifications,
    agents,
    users: accounts.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, phone: u.phone, memberSince: u.memberSince })),
    applications,
    conversations,
    leads,
    commissions,
    listingRequests,
    reports,
    quotations,
    expenses,
    credits,
    receipts,
    salesEntries,
    ledgerAccounts,
    referrals,
  };
};
