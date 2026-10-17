/// <reference types="node" />
// API tests: security and business rules through real HTTP calls against a throwaway MongoDB.
//   npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { startDevMongo } from './devdb.ts';
import { connectDb, closeDb, store } from './db.ts';
import { seedIfEmpty } from './seed.ts';
import { createApp } from './app.ts';
import * as svc from './services.ts';

process.env.SEED_DEMO = 'true';

let server: Server;
let base = '';
let mongo: Awaited<ReturnType<typeof startDevMongo>>;

before(async () => {
  mongo = await startDevMongo(); // in memory, thrown away afterwards
  await connectDb(mongo.uri, 'broombroom_test');
  await seedIfEmpty();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
after(async () => {
  server?.closeAllConnections();
  await new Promise((r) => server?.close(r));
  await closeDb();
  await mongo?.stop();
});

// A tiny client that keeps its own cookies, like one browser on one portal.
const client = (portal: 'buyer' | 'seller' | 'admin') => {
  let cookie = '';
  const call = async (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'X-Portal': portal, ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : body instanceof Uint8Array ? new Blob([body as BlobPart]) : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) cookie = c.split(';')[0].endsWith('=') ? '' : c.split(';')[0];
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json, data: json?.data };
  };
  return {
    get: (u: string) => call('GET', u),
    post: (u: string, b: unknown = {}) => call('POST', u, b),
    patch: (u: string, b: unknown) => call('PATCH', u, b),
    raw: call,
    login: (email: string, password: string) => call('POST', '/api/auth/login', { email, password }),
    state: async () => (await call('GET', '/api/state')).json,
    upload: async (bytes: Uint8Array, mime: string, name: string, visibility = 'private') =>
      (await call('POST', `/api/uploads?visibility=${visibility}&name=${encodeURIComponent(name)}`, bytes, { 'Content-Type': mime })),
  };
};
const PDF = new TextEncoder().encode('%PDF-1.4 test');
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);

const signedIn = async (portal: 'buyer' | 'seller' | 'admin', email: string, password: string) => {
  const c = client(portal);
  const r = await c.login(email, password);
  assert.equal(r.status, 200, `login ${email}: ${JSON.stringify(r.json)}`);
  return c;
};
const admin = () => signedIn('admin', 'admin@broombroom.ph', 'Admin#2026');
const carlo = () => signedIn('seller', 'carlo.santos@broombroom.ph', 'Agent#2026');
const bea = () => signedIn('seller', 'bea.villanueva@broombroom.ph', 'Agent#2026');
let n = 0;
const newClient = async () => {
  const c = client('buyer');
  const email = `client${++n}@example.com`;
  const r = await c.post('/api/auth/register', { name: `Client ${n}`, email, phone: '0917 000 0000', password: 'Password1!' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return Object.assign(c, { email, id: r.data.id as string });
};
const docs = async (c: Awaited<ReturnType<typeof newClient>>, keys: string[]) => {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = (await c.upload(PDF, 'application/pdf', `${k}.pdf`)).data.id;
  return out;
};
const address = { street: '1 Test St', city: 'Taguig', province: 'Metro Manila', region: 'NCR', postalCode: '1634' };
const apply = async (c: Awaited<ReturnType<typeof newClient>>, vehicleId: string, extra: any = {}) =>
  c.post('/api/applications', { vehicleId, purchaseMethod: 'cash', documents: await docs(c, ['id-signature']), address, ...extra });
const freeVehicle = async () => {
  const s = await (await admin()).state();
  return s.vehicles.find((v: any) => v.status === 'available' && !s.applications.some((a: any) => a.vehicleId === v.id && ['submitted', 'under_review', 'contacted', 'approved'].includes(a.status)));
};

// ---------------- auth ----------------
test('sign-in: wrong password, wrong portal, and agents cannot sign up', async () => {
  const c = client('buyer');
  assert.equal((await c.login('ajjandreimercado@gmail.com', 'nope')).status, 401);
  assert.equal((await c.login('carlo.santos@broombroom.ph', 'Agent#2026')).status, 403);
  assert.equal((await client('seller').post('/api/auth/register', { name: 'X', email: 'x@y.z', phone: '1', password: 'Password1!' })).status, 403);
  const ok = await c.login('ajjandreimercado@gmail.com', 'Client#2026');
  assert.equal(ok.status, 200);
  assert.equal(ok.data.password_hash, undefined);
  assert.equal((await c.state()).me.name, 'Andrei Mercado');
});

test('sign-in is throttled after 10 failed tries', async () => {
  const c = client('buyer');
  for (let i = 0; i < 10; i++) await c.login('jessa.ramos@example.com', 'wrong');
  assert.equal((await c.login('jessa.ramos@example.com', 'Client#2026')).status, 429);
});

test('a session only works on its own portal', async () => {
  const a = await admin();
  const r = await a.raw('GET', '/api/state', undefined, { 'X-Portal': 'buyer' });
  assert.equal(r.json.me, null);
});

test('cross-site protection: portal header and origin are required', async () => {
  const c = await newClient();
  assert.equal((await c.raw('POST', '/api/me/password', { current: 'x', next: 'y' }, { 'X-Portal': '' })).status, 403);
  assert.equal((await c.raw('POST', '/api/conversations', { vehicleId: 'veh-01' }, { Origin: 'https://evil.example' })).status, 403);
});

test('register: duplicate email and short password are refused', async () => {
  const c = await newClient();
  assert.equal((await client('buyer').post('/api/auth/register', { name: 'Dup', email: c.email, phone: '1', password: 'Password1!' })).status, 400);
  assert.equal((await client('buyer').post('/api/auth/register', { name: 'Short', email: 'short@example.com', phone: '1', password: 'short' })).status, 400);
});

// ---------------- access control ----------------
test('roles: clients and agents cannot call admin actions', async () => {
  const c = await newClient();
  const agent = await carlo();
  for (const who of [c, agent]) {
    assert.equal((await who.post('/api/vouchers', {})).status, 403);
    assert.equal((await who.post('/api/vehicles', { title: 'x', brand: 'y', price: 1 })).status, 403);
    assert.equal((await who.post('/api/users', {})).status, 403);
  }
  assert.equal((await client('buyer').post('/api/applications', {})).status, 401);
});

test('clients only see their own records; private files only for owner and admins', async () => {
  const a = await newClient();
  const b = await newClient();
  const v = await freeVehicle();
  const created = await apply(a, v.id);
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const sb = await b.state();
  assert.equal(sb.applications.length, 0);
  assert.equal(sb.users, undefined);
  const url = created.data.documents[0].url;
  assert.equal((await b.get(url)).status, 403);
  assert.equal((await client('buyer').get(url)).status, 403);
  assert.equal((await (await carlo()).get(url)).status, 403, 'agents cannot open client documents');
  assert.equal((await a.get(url)).status, 200);
  assert.equal((await (await admin()).get(url)).status, 200);
  // the same upload can't be attached twice, or by someone else
  const up = (await a.upload(PDF, 'application/pdf', 'x.pdf')).data.id;
  const v2 = await freeVehicle();
  assert.equal((await b.post('/api/applications', { vehicleId: v2.id, purchaseMethod: 'cash', documents: { 'id-signature': up }, address })).status, 400);
});

test('uploads: clients cannot upload public media or unsupported types', async () => {
  const c = await newClient();
  assert.equal((await c.upload(PNG, 'image/png', 'a.png', 'public')).status, 403);
  assert.equal((await c.upload(new TextEncoder().encode('<script>'), 'text/html', 'a.html')).status, 415);
});

test('public visitors only see active listings', async () => {
  const s = await client('buyer').state();
  assert.ok(s.vehicles.every((v: any) => v.status === 'available' || v.status === 'reserved'));
  assert.equal(s.applications, undefined);
});

// ---------------- applications ----------------
test('financing: needs 2 uploads; approval needs every document approved; approval reserves the car and creates a commission', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const base = { vehicleId: v.id, purchaseMethod: 'financing', downPayment: Math.round(v.price * 0.3), financingTermMonths: 36, address };
  assert.equal((await c.post('/api/applications', { ...base, documents: await docs(c, ['payslip']) })).status, 400);
  const app = (await c.post('/api/applications', { ...base, documents: await docs(c, ['id-applicant', 'payslip']) })).data;
  assert.equal(app.documents.length, 10);
  assert.equal(app.documents.filter((d: any) => d.fileName).length, 2);
  assert.equal(app.sellerName, 'Broom Broom sales team'); // pool lead, nobody owns them yet

  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'approved' })).status, 400);
  // admin files the missing documents the client handed in, then approves all ten
  for (let i = 0; i < 10; i++) {
    if (!app.documents[i].fileName) {
      const up = (await ad.upload(PDF, 'application/pdf', `handed-${i}.pdf`)).data.id;
      assert.equal((await ad.post(`/api/applications/${app.id}/documents/${i}/file`, { fileId: up })).status, 200);
    }
    assert.equal((await ad.post(`/api/applications/${app.id}/documents/${i}/review`, { approve: true })).status, 200);
  }
  // an admin-filed document belongs to the client now
  const after = (await c.state()).applications.find((a: any) => a.id === app.id);
  assert.equal((await c.get(after.documents.find((d: any) => d.addedByAdmin).url)).status, 200);

  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'approved' })).status, 200);
  const s = await ad.state();
  assert.equal(s.vehicles.find((x: any) => x.id === v.id).status, 'reserved');
  const com = s.commissions.find((x: any) => x.applicationRef === app.referenceNo);
  assert.equal(com.status, 'receivable');
  assert.equal(com.amount, Math.round(v.price * 0.03));

  // the same car can't be reserved twice
  const other = await newClient();
  assert.equal((await apply(other, v.id)).status, 400);

  // commission can't be approved before the sale completes
  assert.equal((await ad.post(`/api/commissions/${com.id}/approve`)).status, 400);
});

test('decline needs a reason, frees the car and drops the receivable commission', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await apply(c, v.id)).data;
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'approved' })).status, 200);
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'declined' })).status, 400);
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'declined', note: 'Could not verify ID' })).status, 200);
  const s = await ad.state();
  assert.equal(s.vehicles.find((x: any) => x.id === v.id).status, 'available');
  assert.equal(s.commissions.filter((x: any) => x.applicationRef === app.referenceNo).length, 0);
  // finished applications can't be reopened
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'approved' })).status, 400);
  // a client can only withdraw, and only their own
  const other = await newClient();
  const app2 = (await apply(other, v.id)).data;
  assert.equal((await c.post(`/api/applications/${app2.id}/status`, { status: 'withdrawn' })).status, 403);
  assert.equal((await other.post(`/api/applications/${app2.id}/status`, { status: 'approved' })).status, 403);
  assert.equal((await other.post(`/api/applications/${app2.id}/status`, { status: 'withdrawn' })).status, 200);
});

test('payments: running AR numbers, cannot exceed the price; sale completion; commission payout with proof', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await apply(c, v.id)).data;
  await ad.post(`/api/applications/${app.id}/status`, { status: 'approved' });
  const shot = (await ad.upload(PNG, 'image/png', 'gcash.png')).data.id;
  const p1 = await ad.post(`/api/applications/${app.id}/payments`, { amount: 50000, description: 'Reservation', fileId: shot });
  const p2 = await ad.post(`/api/applications/${app.id}/payments`, { amount: 1000.5, description: 'Partial' });
  assert.equal(p1.status, 200);
  assert.equal(Number(p2.data.arNo.slice(5)), Number(p1.data.arNo.slice(5)) + 1);
  assert.equal((await ad.post(`/api/applications/${app.id}/payments`, { amount: v.price, description: 'Too much' })).status, 400);
  assert.equal((await c.get(p1.data.attachment)).status, 200); // the client can open their payment screenshot

  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'completed' })).status, 200);
  let s = await ad.state();
  assert.equal(s.vehicles.find((x: any) => x.id === v.id).status, 'sold');
  const com = s.commissions.find((x: any) => x.applicationRef === app.referenceNo);
  assert.equal(com.transactionCompleted, true);
  assert.equal((await ad.post(`/api/commissions/${com.id}/pay`, {})).status, 400); // must be approved first
  assert.equal((await ad.post(`/api/commissions/${com.id}/approve`)).status, 200);
  assert.equal((await ad.post(`/api/commissions/${com.id}/pay`, {})).status, 400); // proof required
  const proof = (await ad.upload(PNG, 'image/png', 'transfer.png')).data.id;
  assert.equal((await ad.post(`/api/commissions/${com.id}/pay`, { fileId: proof })).status, 200);
  s = await ad.state();
  const paid = s.commissions.find((x: any) => x.id === com.id);
  assert.equal(paid.status, 'paid');
  assert.match(paid.receiptNo, /^BB-OR-\d{4}-\d{4}$/);
});

// ---------------- leads ----------------
test('agent link: a new client belongs to that agent; links do not move existing clients', async () => {
  const c = await newClient();
  const v = await freeVehicle();
  const conv = await c.post('/api/conversations', { vehicleId: v.id, ref: 'bea-villanueva' });
  assert.equal(conv.data.sellerName, 'Bea Villanueva');
  const again = await c.post('/api/quotations', { vehicleId: v.id, method: 'cash', termMonths: 36, ref: 'carlo-santos' });
  assert.equal(again.status, 200);
  assert.equal((await c.state()).myAgent, 'Bea Villanueva');
  // an agent can't reply to another agent's client; admins only read
  assert.equal((await (await carlo()).post(`/api/conversations/${conv.data.id}/messages`, { text: 'hi' })).status, 403);
  assert.equal((await (await admin()).post(`/api/conversations/${conv.data.id}/messages`, { text: 'hi' })).status, 403);
  assert.equal((await (await bea()).post(`/api/conversations/${conv.data.id}/messages`, { text: 'Hello!' })).status, 200);
});

test('open leads: two agents claiming at once, only one wins', async () => {
  const c = await newClient();
  const v = await freeVehicle();
  await c.post('/api/conversations', { vehicleId: v.id });
  const [a, b] = [await carlo(), await bea()];
  assert.ok((await a.state()).leads.some((l: any) => l.clientId === c.id && !l.agentName && l.preview));
  const results = await Promise.all([a.post(`/api/leads/${c.id}/claim`), b.post(`/api/leads/${c.id}/claim`)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const winner = results[0].status === 200 ? 'Carlo Santos' : 'Bea Villanueva';
  assert.equal((await c.state()).conversations[0].sellerName, winner);
});

test('reassigning moves unearned commissions; 24-hour rule returns a waiting client to the pool', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await apply(c, v.id, { ref: 'carlo-santos' })).data;
  assert.equal(app.sellerName, 'Carlo Santos');
  await ad.post(`/api/applications/${app.id}/status`, { status: 'approved' });
  assert.equal((await ad.post(`/api/leads/${c.id}/assign`, { agentName: 'Nobody Here' })).status, 400);
  assert.equal((await ad.post(`/api/leads/${c.id}/assign`, { agentName: 'Joy Mendoza' })).status, 200);
  let s = await ad.state();
  assert.equal(s.commissions.find((x: any) => x.applicationRef === app.referenceNo).agentName, 'Joy Mendoza');

  // the client writes, Joy does not reply for 25 hours
  await c.post('/api/conversations', { vehicleId: v.id });
  const lead = await store.get<any>('leads', c.id);
  const t = new Date(Date.now() - 25 * 3600e3).toISOString();
  await store.put('leads', { ...lead, lastClientAt: t, claimedAt: t, lastAgentAt: undefined });
  assert.equal(await svc.runLeadRules(), true);
  s = await ad.state();
  const after = s.leads.find((l: any) => l.clientId === c.id);
  assert.equal(after.agentName, undefined);
  assert.match(after.history.at(-1).text, /No reply from Joy Mendoza within 24 hours/);
  assert.equal(await svc.runLeadRules(), false, 'fires once');
});

// ---------------- quotations ----------------
test('quotations: numbered when sent; applying with one fixes the price and marks it accepted', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const q = (await c.post('/api/quotations', { vehicleId: v.id, method: 'financing', downPayment: Math.round(v.price / 4), termMonths: 48 })).data;
  assert.equal((await c.post('/api/quotations', { vehicleId: v.id, method: 'cash', termMonths: 36 })).status, 400, 'one open quotation per car');
  assert.equal((await ad.patch(`/api/quotations/${q.id}`, { changes: { validUntil: '2000-01-01' }, send: true })).status, 400);
  const sent = (await ad.patch(`/api/quotations/${q.id}`, { changes: { unitPrice: v.price - 50000, engineNo: 'abc123' }, send: true })).data;
  assert.match(sent.quoteNo, /^QT-\d{4}-\d{4}$/);
  assert.equal(sent.engineNo, 'ABC123');
  const app = (await c.post('/api/applications', {
    vehicleId: v.id, purchaseMethod: 'financing', downPayment: Math.round(v.price / 4), financingTermMonths: 48,
    documents: await docs(c, ['id-applicant', 'billing']), address, quotationId: q.id,
  })).data;
  assert.equal(app.vehiclePrice, v.price - 50000);
  assert.equal(app.quotationNo, sent.quoteNo);
  assert.equal((await c.state()).quotations.find((x: any) => x.id === q.id).status, 'accepted');
  const resend = (await ad.patch(`/api/quotations/${q.id}`, { changes: { remarks: 'x' }, send: true })).data;
  assert.equal(resend.quoteNo, sent.quoteNo);
});

// ---------------- accounting & listings ----------------
test('vouchers: server total, balance check, running numbers', async () => {
  const ad = await admin();
  const line = { category: 'Utilities', description: 'Power', amount: 1234.5, party: 'Meralco' };
  const r1 = await ad.post('/api/vouchers', { kind: 'expense', payee: 'Meralco', accountId: 'cash-on-hand', paymentDate: '2026-10-10', method: 'cash', lines: [line, line] });
  assert.equal(r1.status, 200, JSON.stringify(r1.json));
  assert.equal(r1.data.total, 2469);
  const r2 = await ad.post('/api/vouchers', { kind: 'expense', payee: 'X', accountId: 'cash-on-hand', paymentDate: '2026-10-10', lines: [line] });
  assert.equal(Number(r2.data.voucherNo.slice(-4)), Number(r1.data.voucherNo.slice(-4)) + 1);
  assert.equal((await ad.post('/api/vouchers', { kind: 'expense', payee: 'Big', accountId: 'cash-on-hand', paymentDate: '2026-10-10', lines: [{ ...line, amount: 1e9 }] })).status, 400);
  assert.equal((await ad.post('/api/vouchers', { kind: 'credit', payee: 'X', accountId: 'cash-on-hand', paymentDate: '2026-10-10', lines: [line] })).status, 400, 'credit needs a credit account');
});

test('listings: unsafe media URLs refused; "save hidden" stays hidden; agent requests apply on approval', async () => {
  const ad = await admin();
  assert.equal((await ad.post('/api/vehicles', { title: 'Bad', brand: 'X', price: 100, images: ['javascript:alert(1)'] })).status, 400);
  const hidden = await ad.post('/api/vehicles', { title: 'Hidden Unit', brand: 'Toyota', price: 500000, status: 'unpublished' });
  assert.equal(hidden.data.status, 'unpublished');
  assert.ok(!(await client('buyer').state()).vehicles.some((v: any) => v.id === hidden.data.id));
  const agent = await carlo();
  const req = await agent.post('/api/listing-requests', { type: 'edit', vehicleId: hidden.data.id, changes: { price: 450000 }, note: 'Price drop' });
  assert.equal(req.status, 200);
  assert.equal((await agent.post('/api/listing-requests', { type: 'edit', vehicleId: hidden.data.id, changes: { price: 1 } })).status, 400, 'one pending request per listing');
  assert.equal((await ad.post(`/api/listing-requests/${req.data.id}/decide`, { approve: false })).status, 400, 'reject needs a reason');
  assert.equal((await ad.post(`/api/listing-requests/${req.data.id}/decide`, { approve: true })).status, 200);
  assert.equal((await ad.state()).vehicles.find((v: any) => v.id === hidden.data.id).price, 450000);
});

test('accounts: admin creates an agent who can then sign in; disabling signs them out', async () => {
  const ad = await admin();
  assert.equal((await ad.post('/api/users', { name: 'New Agent', email: 'new.agent@broombroom.ph', role: 'buyer', password: 'Password1!' })).status, 400);
  const made = await ad.post('/api/users', { name: 'New Agent', email: 'new.agent@broombroom.ph', role: 'seller', password: 'Password1!' });
  assert.equal(made.status, 200);
  const agent = await signedIn('seller', 'new.agent@broombroom.ph', 'Password1!');
  assert.ok((await ad.state()).agents.includes('New Agent'));
  await ad.post(`/api/users/${made.data.id}/active`, { active: false });
  assert.equal((await agent.state()).me, null);
  assert.equal((await client('seller').login('new.agent@broombroom.ph', 'Password1!')).status, 401);
});

test('password change needs the current password and signs out other sessions', async () => {
  const c = await newClient();
  const other = client('buyer');
  await other.login(c.email, 'Password1!');
  assert.equal((await c.post('/api/me/password', { current: 'wrong', next: 'NewPassword1!' })).status, 400);
  assert.equal((await c.post('/api/me/password', { current: 'Password1!', next: 'NewPassword1!' })).status, 200);
  assert.ok((await c.state()).me, 'the session that changed it stays signed in');
  assert.equal((await other.state()).me, null);
});
