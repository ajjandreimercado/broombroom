/// <reference types="node" />
import type { Vehicle, Expense } from '../src/types.ts';
import {
  INITIAL_VEHICLES,
  INITIAL_APPLICATIONS,
  INITIAL_CONVERSATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTS,
  INITIAL_COMMISSIONS,
  INITIAL_LISTING_REQUESTS,
  INITIAL_EXPENSES,
  INITIAL_CREDITS,
  INITIAL_QUOTATIONS,
  INITIAL_LEADS,
  INITIAL_USER,
  AGENTS,
  TEAM_NAME,
} from '../src/data/mockData.ts';
import { agentSlug } from '../src/components/leads.ts';
import { db, store, tx, setCounterAtLeast } from './db.ts';
import { users } from './auth.ts';

// Local demo sign-ins (development only; SEED_DEMO=false skips them). Change or remove before going live.
export const DEMO_PASSWORDS = { buyer: 'Client#2026', seller: 'Agent#2026', admin: 'Admin#2026' } as const;
export const DEMO_ADMIN_EMAIL = 'admin@broombroom.ph';
export const agentEmail = (name: string) => `${agentSlug(name).replace(/-/g, '.')}@broombroom.ph`;

const blankAddress = { street: '', barangay: '', city: '', province: '', region: '', postalCode: '', country: 'Philippines' };
const num = (s: string | undefined) => Number(s?.match(/(\d+)$/)?.[1] ?? 0);

export const seedIfEmpty = () => {
  const empty = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n === 0;
  if (!empty) return;
  const demo = process.env.SEED_DEMO !== 'false';

  tx(() => {
    if (!demo) {
      // Production: one admin from the environment, everything else is entered through the app.
      const email = process.env.ADMIN_EMAIL;
      const password = process.env.ADMIN_PASSWORD;
      if (!email || !password || password.length < 12) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) for the first start.');
      users.create({ id: 'admin-01', email, role: 'admin', name: 'Administrator', password, phone: '', address: blankAddress, savedVehicleIds: [], recentlyViewedIds: [], memberSince: new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) });
      return;
    }

    users.create({ ...INITIAL_USER, role: 'buyer', password: DEMO_PASSWORDS.buyer });
    users.create({
      id: 'usr-buyer-02', email: 'jessa.ramos@example.com', role: 'buyer', name: 'Jessa Ramos', password: DEMO_PASSWORDS.buyer,
      phone: '+63 918 555 0142', address: { ...blankAddress, city: 'Quezon City', province: 'Metro Manila', region: 'NCR' },
      savedVehicleIds: [], recentlyViewedIds: [], memberSince: 'October 2026',
    });
    for (const name of AGENTS) {
      users.create({
        id: `agent-${agentSlug(name)}`, email: agentEmail(name), role: 'seller', name, password: DEMO_PASSWORDS.seller,
        phone: '', address: blankAddress, savedVehicleIds: [], recentlyViewedIds: [], memberSince: 'January 2026',
      });
    }
    users.create({
      id: 'admin-01', email: DEMO_ADMIN_EMAIL, role: 'admin', name: 'Broom Broom Admin', password: DEMO_PASSWORDS.admin,
      phone: '', address: blankAddress, savedVehicleIds: [], recentlyViewedIds: [], memberSince: 'January 2026',
    });

    for (const v of INITIAL_VEHICLES) store.put<Vehicle>('vehicles', { ...v, sellerName: TEAM_NAME, sellerId: 'team' });
    INITIAL_APPLICATIONS.forEach((a) => store.put('applications', a));
    INITIAL_CONVERSATIONS.forEach((c) => store.put('conversations', c));
    INITIAL_REPORTS.forEach((r) => store.put('reports', r));
    INITIAL_COMMISSIONS.forEach((c) => store.put('commissions', c));
    INITIAL_LISTING_REQUESTS.forEach((r) => store.put('listing_requests', r));
    INITIAL_QUOTATIONS.forEach((q) => store.put('quotations', q));
    INITIAL_LEADS.forEach((l) => store.put('leads', { ...l, id: l.clientId }));
    [...INITIAL_EXPENSES, ...INITIAL_CREDITS].forEach((e: Expense) => store.put('vouchers', e));
    // Older demo notices were meant for the demo client.
    INITIAL_NOTIFICATIONS.forEach((n) =>
      store.put('notifications', (n.audience ?? 'client') === 'client' ? { ...n, audience: 'client', recipient: n.recipient ?? INITIAL_USER.id } : n)
    );

    // Running numbers continue after the demo records.
    const year = new Date().getFullYear();
    setCounterAtLeast(`app-${year}`, Math.max(...INITIAL_APPLICATIONS.map((a) => num(a.referenceNo))));
    setCounterAtLeast(`pv-${year}`, Math.max(0, ...INITIAL_EXPENSES.map((e) => num(e.voucherNo))));
    setCounterAtLeast(`cv-${year}`, Math.max(0, ...INITIAL_CREDITS.map((e) => num(e.voucherNo))));
    setCounterAtLeast(`or-${year}`, Math.max(0, ...INITIAL_COMMISSIONS.map((c) => num(c.receiptNo))));
  });
};
