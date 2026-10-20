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
import { outbox } from './mailer.ts';

process.env.NODE_ENV = 'test'; // emails stay in the outbox (no BREVO_API_KEY in tests)
delete process.env.BREVO_API_KEY;
// Test-only accounts. The database starts empty, like production: the admin comes from these settings, and the
// agents, clients, listings and money accounts below are made through the API.
// The admin and agents start with temporary passwords and set their own on first sign-in, like real staff.
const ADMIN = { email: 'admin@test.local', temporary: 'Admin-temp-2026', password: 'Admin-test-2026' };
const AGENT_TEMP = 'Agent-temp-2026';
const AGENT_PASSWORD = 'Agent-test-2026';
const CLIENT_PASSWORD = 'Client-test-2026';
process.env.ADMIN_EMAIL = ADMIN.email;
process.env.ADMIN_PASSWORD = ADMIN.temporary;

// Sign in with a temporary password and replace it, as the site asks on first sign-in.
const setOwnPassword = async (portal: 'seller' | 'admin', email: string, temporary: string, password: string) => {
  const c = client(portal);
  assert.equal((await c.login(email, temporary)).status, 200);
  const r = await c.post('/api/me/password', { current: temporary, next: password });
  assert.equal(r.status, 200, JSON.stringify(r.json));
};

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
  await setOwnPassword('admin', ADMIN.email, ADMIN.temporary, ADMIN.password);
  const ad = await admin();
  for (const [name, email] of [['Carlo Santos', 'carlo.santos@test.local'], ['Bea Villanueva', 'bea.villanueva@test.local']]) {
    const r = await ad.post('/api/users', { role: 'seller', name, email, password: AGENT_TEMP });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    await setOwnPassword('seller', email, AGENT_TEMP, AGENT_PASSWORD);
  }
  for (const [name, email] of [['Andrei Mercado', 'andrei@test.local'], ['Jessa Ramos', 'jessa@test.local']]) {
    const r = await client('buyer').post('/api/auth/register', { name, email, phone: '0917 000 0000', password: CLIENT_PASSWORD });
    assert.equal(r.status, 200, JSON.stringify(r.json));
  }
});
after(async () => {
  server?.closeAllConnections();
  await new Promise((r) => server?.close(r));
  await closeDb();
  await mongo?.stop();
});

// A tiny client that keeps its own cookies, like one browser on one portal. Each one has its own address (sent the
// way Render's proxy sends it), so per-address limits apply per client.
let clients = 0;
const client = (portal: 'buyer' | 'seller' | 'admin', ip = `10.0.${Math.floor(++clients / 250)}.${clients % 250}`) => {
  let cookie = '';
  const call = async (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'X-Portal': portal, 'X-Forwarded-For': ip, ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}), ...headers },
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
const admin = () => signedIn('admin', ADMIN.email, ADMIN.password);
const carlo = () => signedIn('seller', 'carlo.santos@test.local', AGENT_PASSWORD);
const bea = () => signedIn('seller', 'bea.villanueva@test.local', AGENT_PASSWORD);
let n = 0;
const newClient = async () => {
  const c = client('buyer');
  const email = `client${++n}@example.com`;
  const r = await c.post('/api/auth/register', { name: `Client ${n}`, email, phone: '0917 000 0000', password: CLIENT_PASSWORD });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return Object.assign(c, { email, id: r.data.id as string });
};
const docs = async (c: Awaited<ReturnType<typeof newClient>>, keys: string[]) => {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = (await c.upload(PDF, 'application/pdf', `${k}.pdf`)).data.id;
  return out;
};
const address = { street: '1 Test St', city: 'Taguig', province: 'Metro Manila', region: 'NCR', postalCode: '1634' };
// The admin approves every document on an application (cash or financing) before approving the application.
const approveDocs = async (ad: Awaited<ReturnType<typeof admin>>, appId: string) => {
  const app = (await ad.state()).applications.find((a: any) => a.id === appId);
  for (const [i, d] of (app.documents ?? []).entries()) if (d.fileName && d.status !== 'approved') await ad.post(`/api/applications/${appId}/documents/${i}/review`, { approve: true });
};
// The flow: reserve (reservation AR) -> client's information sheet -> approve -> release with OR/CR.
const SHEET_OK = {
  answers: { 'applicant.firstName': 'Juan', 'applicant.lastName': 'Cruz', 'applicant.birthDate': '1990-01-31', 'applicant.civilStatus': 'Single', 'applicant.presentAddress': '1 Test St, Butuan City', 'residence.type': 'Own house & lot', 'residence.cellphone': '0917 000 0000' },
  dependents: [], purposes: ['Tricycle'], affirmed: true, signature: 'Juan Cruz',
};
const orcrFile = async (ad: Awaited<ReturnType<typeof admin>>) => (await ad.upload(PNG, 'image/png', 'or-cr.png')).data.id;
const reserve = (ad: Awaited<ReturnType<typeof admin>>, appId: string, amount = 5000) => ad.post(`/api/applications/${appId}/reserve`, { amount });
const signQuote = async (ad: Awaited<ReturnType<typeof admin>>, c: Awaited<ReturnType<typeof newClient>>, appId: string) => {
  const q = (await ad.post(`/api/applications/${appId}/quotation`)).data;
  assert.equal((await ad.patch(`/api/quotations/${q.id}`, { changes: {}, send: true })).status, 200);
  const r = await c.post(`/api/quotations/${q.id}/return`, { conforme: 'Juan Cruz' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal((await ad.post(`/api/quotations/${q.id}/confirm`)).status, 200);
  return q.id as string;
};
const toApproved = async (ad: Awaited<ReturnType<typeof admin>>, c: Awaited<ReturnType<typeof newClient>>, appId: string) => {
  await approveDocs(ad, appId);
  assert.equal((await reserve(ad, appId)).status, 200);
  await signQuote(ad, c, appId);
  assert.equal((await c.post(`/api/applications/${appId}/info-sheet`, SHEET_OK)).status, 200);
  assert.equal((await ad.post(`/api/applications/${appId}/status`, { status: 'approved' })).status, 200);
};
// The client presses "Request to apply" (no chat yet). With no agent, the first to claim them (Carlo, or the referring
// agent) sends the apply link with the claim; an existing agent sends it in their chat. Returns the agent's link name.
const linkFor = async (c: Awaited<ReturnType<typeof newClient>>, vehicleId: string, ref?: string) => {
  await c.post('/api/apply-requests', { vehicleId, ref }); // refused for a car no longer available
  let owner = (await c.state()).myAgent as string | undefined;
  if (!owner) {
    owner = ref === 'bea-villanueva' ? 'Bea Villanueva' : 'Carlo Santos';
    await (owner === 'Bea Villanueva' ? await bea() : await carlo()).post(`/api/leads/${c.id}/claim`);
  } else {
    const agent = owner === 'Bea Villanueva' ? await bea() : await carlo();
    const chat = (await agent.state()).conversations.find((x: any) => x.buyerId === c.id);
    if (chat) await agent.post(`/api/conversations/${chat.id}/messages`, { applyVehicleId: vehicleId });
  }
  return owner === 'Bea Villanueva' ? 'bea-villanueva' : 'carlo-santos';
};
const apply = async (c: Awaited<ReturnType<typeof newClient>>, vehicleId: string, extra: any = {}) =>
  c.post('/api/applications', { vehicleId, purchaseMethod: 'cash', documents: await docs(c, ['id-signature']), address, viaAgent: await linkFor(c, vehicleId, extra.ref), ...extra });
// A new listing for each test that needs one (no application can hold it yet).
let units = 0;
const freeVehicle = async () => {
  const r = await (await admin()).post('/api/vehicles', { title: `Test Unit ${++units}`, brand: 'Toyota', model: 'Vios', year: 2024, price: 950000, category: 'cars', condition: 'Surplus / 2nd hand', mileage: 12000, location: 'Taguig City' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.data;
};

// ---------------- auth ----------------
test('sign-in: wrong password, wrong portal, and agents cannot sign up', async () => {
  const c = client('buyer');
  assert.equal((await c.login('andrei@test.local', 'nope')).status, 401);
  assert.equal((await c.login('carlo.santos@test.local', AGENT_PASSWORD)).status, 403);
  assert.equal((await client('seller').post('/api/auth/register', { name: 'X', email: 'x@y.z', phone: '1', password: 'Password1!' })).status, 403);
  const ok = await c.login('andrei@test.local', CLIENT_PASSWORD);
  assert.equal(ok.status, 200);
  assert.equal(ok.data.password_hash, undefined);
  assert.equal((await c.state()).me.name, 'Andrei Mercado');
});

test('sign-in is throttled after 10 failed tries', async () => {
  const c = client('buyer');
  for (let i = 0; i < 10; i++) await c.login('jessa@test.local', 'wrong');
  assert.equal((await c.login('jessa@test.local', CLIENT_PASSWORD)).status, 429);
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
  assert.equal((await b.post('/api/applications', { vehicleId: v2.id, purchaseMethod: 'cash', documents: { 'id-signature': up }, address, viaAgent: await linkFor(b as any, v2.id) })).status, 400);
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
test('financing: needs 2 uploads; documents first; reserve -> information sheet -> approve; no commission before the release', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const base = { vehicleId: v.id, purchaseMethod: 'financing', downPayment: Math.round(v.price * 0.3), financingTermMonths: 36, address };
  assert.equal((await c.post('/api/applications', { ...base, documents: await docs(c, ['id-applicant', 'payslip']) })).status, 400, 'only through an agent link');
  assert.equal((await c.post('/api/applications', { ...base, documents: await docs(c, ['id-applicant', 'payslip']), viaAgent: 'carlo-santos' })).status, 400, 'a link the agent really sent');
  Object.assign(base, { viaAgent: await linkFor(c, v.id) });
  assert.equal((await c.post('/api/applications', { ...base, documents: await docs(c, ['payslip']) })).status, 400);
  const app = (await c.post('/api/applications', { ...base, documents: await docs(c, ['id-applicant', 'payslip']) })).data;
  assert.equal(app.documents.length, 10);
  assert.equal(app.documents.filter((d: any) => d.fileName).length, 2);
  assert.equal(app.sellerName, 'Carlo Santos'); // the agent who claimed them and sent the link
  // the automatic message tells the agent the client finished through their link
  const chat = (await (await carlo()).state()).conversations.find((x: any) => x.buyerId === c.id && x.vehicleId === v.id);
  assert.match(chat.messages.at(-1).text, new RegExp(`finished the application .* through your link \\(${app.referenceNo}\\)`));
  assert.equal(chat.messages.at(-1).auto, true);
  assert.equal((await (await carlo()).state()).leads.find((l: any) => l.clientId === c.id).lockedTo, 'Carlo Santos');

  assert.equal((await reserve(ad, app.id)).status, 400, 'documents first');
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'approved' })).status, 400, 'not straight from review');
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

  assert.equal((await c.post(`/api/applications/${app.id}/reserve`, { amount: 5000 })).status, 403, 'admins only');
  const r = await reserve(ad, app.id, 20000);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.match(r.data.arNo, /^\d{4}-\d{4}$/);
  const s = await ad.state();
  assert.equal(s.vehicles.find((x: any) => x.id === v.id).status, 'reserved');
  const reserved = s.applications.find((a: any) => a.id === app.id);
  assert.equal(reserved.status, 'reserved');
  assert.equal(reserved.payments.length, 1, 'the reservation AR');
  assert.equal(s.commissions.filter((x: any) => x.applicationRef === app.referenceNo).length, 0, 'no commission before approval');
  // the same car can't be reserved twice
  const other = await newClient();
  assert.equal((await apply(other, v.id)).status, 400);

  // quotation first, then the information sheet
  assert.equal((await c.post(`/api/applications/${app.id}/info-sheet`, SHEET_OK)).status, 400, 'sign the quotation first');
  await signQuote(ad, c, app.id);
  assert.ok(outbox.some((m: any) => m.to === c.email && /infosheet=/.test(m.html)), 'client emailed the sheet link once the quotation is back');

  // information sheet: the client's own, checked, then processing
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'approved' })).status, 400, 'sheet first');
  assert.equal((await other.post(`/api/applications/${app.id}/info-sheet`, SHEET_OK)).status, 403);
  const bad = await c.post(`/api/applications/${app.id}/info-sheet`, { ...SHEET_OK, affirmed: false });
  assert.equal(bad.status, 400);
  assert.match(bad.json.error, /Affirmation/);
  assert.equal((await c.post(`/api/applications/${app.id}/info-sheet`, { ...SHEET_OK, answers: { ...SHEET_OK.answers, 'applicant.civilStatus': 'Complicated' } })).status, 400);
  assert.equal((await c.post(`/api/applications/${app.id}/info-sheet`, SHEET_OK)).status, 200);
  assert.equal((await c.post(`/api/applications/${app.id}/info-sheet`, SHEET_OK)).status, 400, 'only once');
  const proc = (await ad.state()).applications.find((a: any) => a.id === app.id);
  assert.equal(proc.status, 'processing');
  assert.equal(proc.infoSheet.answers['applicant.firstName'], 'Juan');

  assert.equal((await ad.post(`/api/applications/${app.id}/release`, { orcrConfirmed: true })).status, 400, 'approve first');
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'approved', note: 'Good standing' })).status, 200);
  const s2 = await ad.state();
  assert.equal(s2.commissions.filter((x: any) => x.applicationRef === app.referenceNo).length, 0, 'commissions start at the release');
  const approved = s2.applications.find((a: any) => a.id === app.id);
  assert.ok(approved.financingApprovedAt);
  assert.equal(approved.ciComments, 'Good standing');
  assert.equal(approved.commissionAmount, Math.round(v.price * 0.03), 'standard rate when the admin leaves it');
});

test('decline needs a reason, frees the car and drops the receivable commission', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await apply(c, v.id)).data;
  const early = await reserve(ad, app.id);
  assert.equal(early.status, 400, "a cash buyer's ID is checked first");
  assert.match(early.json.error, /Approve every document/);
  await toApproved(ad, c, app.id);
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'declined' })).status, 400);
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'declined', note: 'Could not verify ID' })).status, 200);
  const s = await ad.state();
  assert.equal(s.vehicles.find((x: any) => x.id === v.id).status, 'available');
  assert.equal(s.commissions.filter((x: any) => x.applicationRef === app.referenceNo).length, 0);
  // finished applications can't be reopened
  assert.equal((await reserve(ad, app.id)).status, 400);
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
  await toApproved(ad, c, app.id); // the reservation AR is the first payment
  const shot = (await ad.upload(PNG, 'image/png', 'gcash.png')).data.id;
  const p1 = await ad.post(`/api/applications/${app.id}/payments`, { amount: 50000, description: 'Reservation', fileId: shot });
  const p2 = await ad.post(`/api/applications/${app.id}/payments`, { amount: 1000.5, description: 'Partial' });
  assert.equal(p1.status, 200);
  assert.equal(Number(p2.data.arNo.slice(5)), Number(p1.data.arNo.slice(5)) + 1);
  assert.equal((await ad.post(`/api/applications/${app.id}/payments`, { amount: v.price, description: 'Too much' })).status, 400);
  assert.equal((await c.get(p1.data.attachment)).status, 200); // the client can open their payment screenshot

  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'completed' })).status, 400, 'release has its own step');
  const orcr = await orcrFile(ad);
  assert.equal((await ad.post(`/api/applications/${app.id}/release`, { orcrFileId: orcr })).status, 400, 'OR/CR must be confirmed');
  assert.equal((await ad.post(`/api/applications/${app.id}/release`, { orcrConfirmed: true })).status, 400, 'OR/CR file required');
  assert.equal((await ad.post(`/api/applications/${app.id}/release`, { orcrConfirmed: true, orcrFileId: orcr, commission: -5 })).status, 400, 'no negative commission');
  assert.equal((await ad.post(`/api/applications/${app.id}/release`, { orcrConfirmed: true, orcrFileId: orcr, commission: 25000 })).status, 200);
  let s = await ad.state();
  const rel = s.applications.find((a: any) => a.id === app.id);
  assert.equal(rel.status, 'completed');
  assert.equal(rel.orcrConfirmed, true);
  assert.equal((await c.get(rel.orcrUrl)).status, 200, 'the client can open the OR/CR');
  assert.equal(s.vehicles.find((x: any) => x.id === v.id).status, 'sold');
  const com = s.commissions.find((x: any) => x.applicationRef === app.referenceNo);
  assert.equal(com.transactionCompleted, true);
  // on release the agent gets the full commission the admin set, payable at once
  assert.equal(com.amount, 25000);
  assert.equal(com.status, 'payable');
  assert.equal((await ad.post(`/api/commissions/${com.id}/pay`, {})).status, 400); // proof required
  const proof = (await ad.upload(PNG, 'image/png', 'transfer.png')).data.id;
  assert.equal((await ad.post(`/api/commissions/${com.id}/pay`, { fileId: proof })).status, 200);
  s = await ad.state();
  const paid = s.commissions.find((x: any) => x.id === com.id);
  assert.equal(paid.status, 'paid');
  assert.match(paid.receiptNo, /^BB-OR-\d{4}-\d{4}$/);
});

// ---------------- leads ----------------
test('request to apply: no chat and no agent until the first claim, which sends the apply link and keeps the client', async () => {
  const c = await newClient();
  const v = await freeVehicle();
  // clients cannot start a chat on their own
  assert.equal((await c.post('/api/conversations', { vehicleId: v.id, text: 'Hi' })).status, 400);
  assert.equal((await c.post('/api/apply-requests', { vehicleId: v.id, ref: 'bea-villanueva' })).status, 200);
  const st = await c.state();
  assert.equal(st.myAgent, null, 'not assigned to anyone');
  assert.equal(st.conversations.length, 0, 'no chat yet');
  const lead = (await (await carlo()).state()).leads.find((l: any) => l.clientId === c.id);
  assert.equal(lead.applyVehicleId, v.id, 'agents see which car');
  assert.ok((await (await bea()).state()).notifications.some((n: any) => n.title === 'Client from your link'));
  assert.equal((await (await bea()).post(`/api/leads/${c.id}/claim`)).status, 200);
  const convs = (await c.state()).conversations;
  assert.equal(convs.length, 1, 'the claim opened the chat');
  const conv = { data: convs[0] };
  assert.equal(conv.data.sellerName, 'Bea Villanueva');
  assert.equal(conv.data.vehicleId, v.id);
  assert.equal(conv.data.messages.at(-1).applyVehicleId, v.id, 'with the apply link');
  assert.equal((await (await admin()).post(`/api/leads/${c.id}/assign`, { agentName: 'Carlo Santos' })).status, 400, 'kept by Bea (locked)');
  const again = await apply(c, (await freeVehicle()).id, { ref: 'carlo-santos' });
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
  await c.post('/api/apply-requests', { vehicleId: v.id });
  const [a, b] = [await carlo(), await bea()];
  assert.ok((await a.state()).leads.some((l: any) => l.clientId === c.id && !l.agentName));
  const results = await Promise.all([a.post(`/api/leads/${c.id}/claim`), b.post(`/api/leads/${c.id}/claim`)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const winner = results[0].status === 200 ? 'Carlo Santos' : 'Bea Villanueva';
  assert.equal((await c.state()).conversations[0].sellerName, winner);
});

test('commission: the admin sets it on approval; on release the client’s agent gets it in full', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await apply(c, v.id, { ref: 'bea-villanueva' })).data;
  await approveDocs(ad, app.id);
  assert.equal((await reserve(ad, app.id)).status, 200);
  await signQuote(ad, c, app.id);
  assert.equal((await c.post(`/api/applications/${app.id}/info-sheet`, SHEET_OK)).status, 200);
  assert.equal((await c.post(`/api/applications/${app.id}/status`, { status: 'approved', commission: 1 })).status, 403);
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'approved', commission: 18000 })).status, 200);
  assert.equal((await ad.state()).commissions.find((x: any) => x.applicationRef === app.referenceNo), undefined, 'nothing until the release');
  // release without a new amount keeps the admin's figure
  assert.equal((await ad.post(`/api/applications/${app.id}/release`, { orcrConfirmed: true, orcrFileId: await orcrFile(ad) })).status, 200);
  const com = (await ad.state()).commissions.find((x: any) => x.applicationRef === app.referenceNo);
  assert.equal(com.amount, 18000);
  assert.equal(com.agentName, 'Bea Villanueva');
  assert.equal(com.status, 'payable');
  const b = await bea();
  assert.ok((await b.state()).commissions.some((x: any) => x.id === com.id && x.status === 'payable'), 'the agent sees it');
  assert.ok((await b.state()).notifications.some((n: any) => n.title === 'Vehicle released: full commission' && /18,000/.test(n.message)));
});

test('referrals: admin only; status set by hand; every change kept', async () => {
  const ad = await admin();
  assert.equal((await (await carlo()).post('/api/referrals', { referredBy: 'X', clientName: 'Y' })).status, 403);
  assert.equal((await ad.post('/api/referrals', { referredBy: 'Carlo Santos' })).status, 400, 'client name required');
  const r = (await ad.post('/api/referrals', { referredBy: 'Carlo Santos', clientName: 'Maria Lopez' })).data;
  assert.equal(r.status, 'receivable');
  assert.equal((await ad.post(`/api/referrals/${r.id}/status`, { status: 'paid' })).status, 400);
  for (const st of ['processing', 'approved', 'disapproved']) assert.equal((await ad.post(`/api/referrals/${r.id}/status`, { status: st })).status, 200);
  const saved = (await ad.state()).referrals.find((x: any) => x.id === r.id);
  assert.equal(saved.status, 'disapproved');
  assert.deepEqual(saved.history.map((h: any) => h.text), ['Added as receivable', 'receivable → processing', 'processing → approved', 'approved → disapproved']);
  assert.equal((await (await carlo()).state()).referrals, undefined, 'agents do not get the list');
});

test('reassigning: the release pays the client’s current agent; 24-hour rule returns a waiting client to the pool', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await apply(c, v.id, { ref: 'carlo-santos' })).data;
  assert.equal(app.sellerName, 'Carlo Santos');
  await toApproved(ad, c, app.id);
  assert.equal((await ad.post(`/api/leads/${c.id}/assign`, { agentName: 'Nobody Here' })).status, 400);
  assert.equal((await ad.post(`/api/leads/${c.id}/assign`, { agentName: 'Bea Villanueva' })).status, 400, 'locked to Carlo: applied through his link');
  assert.equal((await ad.post(`/api/leads/${c.id}/unlock`)).status, 200);
  assert.equal((await ad.post(`/api/leads/${c.id}/assign`, { agentName: 'Bea Villanueva' })).status, 200);
  assert.equal((await ad.post(`/api/applications/${app.id}/release`, { orcrConfirmed: true, orcrFileId: await orcrFile(ad) })).status, 200);
  let s = await ad.state();
  assert.equal(s.commissions.find((x: any) => x.applicationRef === app.referenceNo).agentName, 'Bea Villanueva');

  // after the release the client is free; they ask to apply for another car, Bea claims them, then does not reply for 25 hours
  await c.post('/api/apply-requests', { vehicleId: (await freeVehicle()).id });
  assert.equal((await (await bea()).post(`/api/leads/${c.id}/claim`)).status, 200);
  await ad.post(`/api/leads/${c.id}/unlock`); // the 24-hour rule applies to unlocked clients
  const lead = await store.get<any>('leads', c.id);
  const t = new Date(Date.now() - 25 * 3600e3).toISOString();
  await store.put('leads', { ...lead, lastClientAt: t, claimedAt: t, lastAgentAt: undefined });
  assert.equal(await svc.runLeadRules(), true);
  s = await ad.state();
  const after = s.leads.find((l: any) => l.clientId === c.id);
  assert.equal(after.agentName, undefined);
  assert.match(after.history.at(-1).text, /No reply from Bea Villanueva within 24 hours/);
  assert.equal(await svc.runLeadRules(), false, 'fires once');
});

// ---------------- quotations ----------------
test('quotations: the admin makes one from a reserved application; numbered when sent', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await apply(c, v.id)).data;
  assert.equal((await c.post('/api/quotations', { vehicleId: v.id, method: 'cash', termMonths: 36 })).status, 404, 'clients no longer request one');
  assert.equal((await ad.post(`/api/applications/${app.id}/quotation`)).status, 400, 'after the reservation');
  await approveDocs(ad, app.id);
  assert.equal((await reserve(ad, app.id)).status, 200);
  assert.equal((await c.post(`/api/applications/${app.id}/quotation`)).status, 403, 'admins only');
  const q = (await ad.post(`/api/applications/${app.id}/quotation`)).data;
  assert.equal(q.method, 'cash');
  assert.equal(q.clientName, app.applicantName);
  assert.equal(q.unitPrice, v.price);
  assert.equal((await ad.post(`/api/applications/${app.id}/quotation`)).status, 400, 'one open quotation per car');
  assert.equal((await ad.patch(`/api/quotations/${q.id}`, { changes: { validUntil: '2000-01-01' }, send: true })).status, 400);
  const sent = (await ad.patch(`/api/quotations/${q.id}`, { changes: { unitPrice: v.price - 50000, engineNo: 'abc123' }, send: true })).data;
  assert.match(sent.quoteNo, /^QT-\d{4}-\d{4}$/);
  assert.equal(sent.engineNo, 'ABC123');
  assert.equal((await c.state()).quotations.find((x: any) => x.id === q.id).status, 'sent', 'the client sees it');
  // the client signs it and sends it back
  assert.equal((await (await newClient()).post(`/api/quotations/${q.id}/return`, { conforme: 'X' })).status, 403);
  assert.equal((await c.post(`/api/quotations/${q.id}/return`, {})).status, 400, 'conforme required');
  assert.equal((await c.post(`/api/quotations/${q.id}/return`, { conforme: 'Client Name', note: 'Please use 36 months' })).status, 200);
  assert.equal((await c.post(`/api/quotations/${q.id}/return`, { conforme: 'Client Name' })).status, 400, 'once');
  const back = (await ad.state()).quotations.find((x: any) => x.id === q.id);
  assert.equal(back.status, 'returned');
  assert.equal(back.conforme, 'Client Name');
  assert.equal(back.clientReply, 'Please use 36 months');
  assert.ok((await ad.state()).notifications.some((n: any) => n.title === 'Quotation returned'));
  // the admin reviews it: the client cannot fill in the sheet before it is confirmed, nor confirm it themselves
  assert.equal((await c.post(`/api/applications/${app.id}/info-sheet`, SHEET_OK)).status, 400, 'not before the admin confirms');
  assert.equal((await c.post(`/api/quotations/${q.id}/confirm`)).status, 403, 'admins only');
  // the admin changes and resends it: the client signs again
  const resend = (await ad.patch(`/api/quotations/${q.id}`, { changes: { remarks: 'x' }, send: true })).data;
  assert.equal(resend.quoteNo, sent.quoteNo);
  assert.equal(resend.status, 'sent');
  assert.equal(resend.conforme, undefined);
  assert.equal((await ad.post(`/api/quotations/${q.id}/confirm`)).status, 400, 'only a returned one');
  // the client signs the revised one; the admin confirms it as final; now the sheet opens
  assert.equal((await c.post(`/api/quotations/${q.id}/return`, { conforme: 'Client Name' })).status, 200);
  const sentMails = outbox.length;
  assert.equal((await ad.post(`/api/quotations/${q.id}/confirm`)).status, 200);
  assert.equal((await ad.state()).quotations.find((x: any) => x.id === q.id).status, 'confirmed');
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(outbox.slice(sentMails).some((m: any) => m.to === c.email && /infosheet=/.test(m.html)), 'the sheet link is emailed on confirmation');
  assert.equal((await c.post(`/api/applications/${app.id}/info-sheet`, SHEET_OK)).status, 200);
});

// ---------------- accounting & listings ----------------
test('vouchers: server total, balance check, running numbers', async () => {
  const ad = await admin();
  const line = { category: 'Utilities', description: 'Power', amount: 1234.5, party: 'Meralco' };
  const cash = (await ad.post('/api/ledger-accounts', { kind: 'payment', name: 'Cash on hand', method: 'cash', amount: 850000 })).data;
  const r1 = await ad.post('/api/vouchers', { kind: 'expense', payee: 'Meralco', accountId: cash.id, paymentDate: '2026-10-10', method: 'cash', lines: [line, line] });
  assert.equal(r1.status, 200, JSON.stringify(r1.json));
  assert.equal(r1.data.total, 2469);
  const r2 = await ad.post('/api/vouchers', { kind: 'expense', payee: 'X', accountId: cash.id, paymentDate: '2026-10-10', lines: [line] });
  assert.equal(Number(r2.data.voucherNo.slice(-4)), Number(r1.data.voucherNo.slice(-4)) + 1);
  assert.equal((await ad.post('/api/vouchers', { kind: 'expense', payee: 'Big', accountId: cash.id, paymentDate: '2026-10-10', lines: [{ ...line, amount: 1e9 }] })).status, 400);
  assert.equal((await ad.post('/api/vouchers', { kind: 'credit', payee: 'X', accountId: cash.id, paymentDate: '2026-10-10', lines: [line] })).status, 400, 'credit needs a credit account');
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
  assert.ok((await ad.state()).notifications.some((n: any) => n.message === 'Carlo Santos asked to change price on "Hidden Unit". Note: Price drop'), 'admin told what to change');
  assert.equal((await agent.post('/api/listing-requests', { type: 'remove', vehicleId: hidden.data.id, note: 'Sold elsewhere' })).status, 400, 'agents cannot ask for removals');
  assert.equal((await agent.post('/api/listing-requests', { type: 'edit', vehicleId: hidden.data.id, changes: { price: 1 } })).status, 400, 'one pending request per listing');
  assert.equal((await ad.post(`/api/listing-requests/${req.data.id}/decide`, { approve: false })).status, 400, 'reject needs a reason');
  assert.equal((await ad.post(`/api/listing-requests/${req.data.id}/decide`, { approve: true })).status, 200);
  assert.equal((await ad.state()).vehicles.find((v: any) => v.id === hidden.data.id).price, 450000);
});

test('accounts: admin creates an agent who can then sign in; disabling signs them out', async () => {
  const ad = await admin();
  assert.equal((await ad.post('/api/users', { name: 'New Agent', email: 'new.agent@test.local', role: 'buyer', password: 'Password1!' })).status, 400);
  const made = await ad.post('/api/users', { name: 'New Agent', email: 'new.agent@test.local', role: 'seller', password: 'Password1!' });
  assert.equal(made.status, 200);
  const agent = await signedIn('seller', 'new.agent@test.local', 'Password1!');
  // a temporary password: nothing to see or do until they set their own
  let st = await agent.state();
  assert.equal(st.me.mustChangePassword, true);
  assert.equal(st.conversations, undefined);
  assert.equal(st.leads, undefined);
  assert.equal((await agent.post(`/api/leads/x/claim`)).status, 403);
  assert.equal((await agent.post('/api/me/password', { current: 'Password1!', next: 'Password1!' })).status, 400, 'not the temporary one again');
  assert.equal((await agent.post('/api/me/password', { current: 'Password1!', next: 'MyOwnPass99' })).status, 200);
  st = await agent.state();
  assert.equal(st.me.mustChangePassword, undefined);
  assert.ok(Array.isArray(st.leads), 'works normally now');
  assert.ok((await ad.state()).agents.includes('New Agent'));
  await ad.post(`/api/users/${made.data.id}/active`, { active: false });
  assert.equal((await agent.state()).me, null);
  assert.equal((await client('seller').login('new.agent@test.local', 'MyOwnPass99')).status, 401);
  await ad.post(`/api/users/${made.data.id}/active`, { active: true });

  // an admin reset is temporary again
  assert.equal((await ad.post(`/api/users/${made.data.id}/password`, { password: 'ResetPass11' })).status, 200);
  const again = await signedIn('seller', 'new.agent@test.local', 'ResetPass11');
  assert.equal((await again.state()).me.mustChangePassword, true);
  assert.equal((await again.post('/api/me/password', { current: 'ResetPass11', next: 'MyOwnPass100' })).status, 200);
});

test('password change needs the current password and signs out other sessions', async () => {
  const c = await newClient();
  const other = client('buyer');
  await other.login(c.email, CLIENT_PASSWORD);
  assert.equal((await c.post('/api/me/password', { current: 'wrong', next: 'NewPassword1!' })).status, 400);
  assert.equal((await c.post('/api/me/password', { current: CLIENT_PASSWORD, next: 'NewPassword1!' })).status, 200);
  assert.ok((await c.state()).me, 'the session that changed it stays signed in');
  assert.equal((await other.state()).me, null);
});

// ---------- re-submitting rejected documents ----------
test('rejecting a document emails the client a re-upload link; only they can send a new copy, and only for rejected or missing ones', async () => {
  const c = await newClient();
  const other = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await c.post('/api/applications', {
    vehicleId: v.id, purchaseMethod: 'financing', downPayment: Math.round(v.price / 3), financingTermMonths: 36,
    documents: await docs(c, ['id-applicant', 'payslip']), address, viaAgent: await linkFor(c, v.id),
  })).data;
  const sent = outbox.length;
  assert.equal((await ad.post(`/api/applications/${app.id}/documents/0/review`, { approve: false })).status, 400, 'a rejection needs a reason');
  assert.equal((await ad.post(`/api/applications/${app.id}/documents/0/review`, { approve: false, reason: 'Blurry photo, the ID number cannot be read' })).status, 200);
  await new Promise((r) => setTimeout(r, 50)); // the email is sent right after the reply
  const mail = outbox[sent];
  assert.ok(mail, 'an email was sent');
  assert.equal(mail.to, c.email);
  assert.match(mail.subject, new RegExp(app.referenceNo));
  assert.match(mail.html, /Blurry photo, the ID number cannot be read/);
  assert.ok(mail.html.includes(`/?resubmit=${app.id}`), 'the email links to the application');
  assert.ok((await c.state()).notifications.some((n: any) => n.title === 'Document needs attention'), 'and an in-app notice');
  // approving does not email
  // documents: 0 = applicant ID, 1 = co-maker 1 (not uploaded), 4 = payslip
  assert.equal((await ad.post(`/api/applications/${app.id}/documents/4/review`, { approve: true })).status, 200);
  assert.equal(outbox.length, sent + 1);

  const newCopy = async (who: any, i: number) => who.post(`/api/applications/${app.id}/documents/${i}/resubmit`, { fileId: (await who.upload(PDF, 'application/pdf', `copy-${i}.pdf`)).data.id });
  assert.equal((await newCopy(other, 0)).status, 403, 'not their application');
  assert.equal((await ad.post(`/api/applications/${app.id}/documents/0/resubmit`, {})).status, 403, 'clients only');
  assert.equal((await newCopy(c, 4)).status, 400, 'an approved document does not need a new copy');
  assert.equal((await newCopy(c, 0)).status, 200);
  assert.equal((await newCopy(c, 1)).status, 200, 'a missing document can be added too');
  const after = (await c.state()).applications.find((a: any) => a.id === app.id);
  assert.equal(after.documents[0].status, 'pending');
  assert.equal(after.documents[0].reason, undefined);
  assert.ok(after.documents[0].resubmittedAt);
  assert.ok(after.documents[1].fileName);
  assert.ok((await ad.state()).notifications.some((n: any) => n.title === 'Document re-submitted'));
});

test("agent apply link: applying through it locks the client to that agent until the application ends or the admin unlocks", async () => {
  const c = await newClient();
  const [ca, ad] = [await carlo(), await admin()];
  const v = await freeVehicle();
  await c.post('/api/apply-requests', { vehicleId: v.id });
  const claimed = await ca.post(`/api/leads/${c.id}/claim`);
  assert.equal(claimed.status, 200);
  const conv = { id: claimed.data.conversationId };
  assert.equal((await c.post(`/api/conversations/${conv.id}/messages`, { applyVehicleId: v.id })).status, 403, 'only the agent sends apply links');
  const sent = await ca.post(`/api/conversations/${conv.id}/messages`, { applyVehicleId: v.id });
  assert.equal(sent.status, 200, JSON.stringify(sent.json));
  const msg = (await c.state()).conversations.find((x: any) => x.id === conv.id).messages.at(-1);
  assert.equal(msg.applyVehicleId, v.id);
  assert.equal(msg.applyAgent, 'carlo-santos');

  const lead = async () => (await ad.state()).leads.find((l: any) => l.clientId === c.id);
  const app = (await apply(c, v.id, { viaAgent: 'carlo-santos' })).data;
  assert.equal((await lead()).lockedTo, 'Carlo Santos');
  assert.equal((await lead()).lockedRef, app.referenceNo);
  assert.equal((await ad.post(`/api/leads/${c.id}/assign`, { agentName: 'Bea Villanueva' })).status, 400, 'admin must unlock first');
  // the 24-hour no-reply rule does not release a locked client
  const l = await store.get<any>('leads', c.id);
  await store.put('leads', { ...l, lastClientAt: new Date(Date.now() - 48 * 3600e3).toISOString(), lastAgentAt: undefined });
  await svc.runLeadRules();
  assert.equal((await lead()).agentName, 'Carlo Santos');
  // the lock ends with its application
  assert.equal((await ad.post(`/api/applications/${app.id}/status`, { status: 'declined', note: 'test' })).status, 200);
  assert.equal((await lead()).lockedTo, undefined);

  // a second application through the link locks again; the admin can unlock and then reassign
  const v2 = await freeVehicle();
  await apply(c, v2.id, { viaAgent: 'carlo-santos' });
  assert.equal((await lead()).lockedTo, 'Carlo Santos');
  assert.equal((await ad.post(`/api/leads/${c.id}/unlock`)).status, 200);
  assert.equal((await ad.post(`/api/leads/${c.id}/assign`, { agentName: 'Bea Villanueva' })).status, 200);
  // a link from an agent who is not theirs does not lock or move them
  await apply(c, (await freeVehicle()).id, { viaAgent: 'carlo-santos' });
  assert.equal((await lead()).agentName, 'Bea Villanueva');
  assert.equal((await lead()).lockedTo, undefined);
});

test('ARs: payment receipts take remarks and can be edited or deleted; hand-written ARs share the running number', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await apply(c, v.id)).data;
  const pay = await ad.post(`/api/applications/${app.id}/payments`, { amount: 1000, description: 'Reservation fee', remarks: 'GCash ref 123' });
  assert.equal(pay.status, 200, JSON.stringify(pay.json));
  assert.equal(pay.data.remarks, 'GCash ref 123');
  const ar = pay.data.arNo;
  const edited = await ad.patch(`/api/applications/${app.id}/payments/${ar}`, { amount: 1500, description: 'Reservation fee (corrected)', remarks: '' });
  assert.equal(edited.status, 200, JSON.stringify(edited.json));
  assert.equal(edited.data.arNo, ar, 'the AR number stays');
  assert.equal(edited.data.amount, 1500);
  assert.equal(edited.data.remarks, undefined);
  assert.equal((await ad.patch(`/api/applications/${app.id}/payments/${ar}`, { amount: v.price + 1, description: 'x' })).status, 400, 'balance still checked');
  assert.equal((await c.patch(`/api/applications/${app.id}/payments/${ar}`, { amount: 1, description: 'x' })).status, 403);

  const lines = [{ description: 'Detailing package', qty: 2, price: 2500 }, { description: 'Tint', qty: 1, price: 4000 }];
  assert.equal((await ad.post('/api/receipts', { date: '2026-10-17', receivedFrom: 'Walk-in', lines: [] })).status, 400, 'needs a line');
  assert.equal((await ad.post('/api/receipts', { date: '2026-10-17', receivedFrom: 'Walk-in', lines: [{ description: 'x', qty: 1.5, price: 1 }] })).status, 400, 'whole quantities');
  assert.equal((await c.post('/api/receipts', { date: '2026-10-17', receivedFrom: 'Walk-in', lines })).status, 403);
  const r = await ad.post('/api/receipts', { date: '2026-10-17', receivedFrom: 'Walk-in', lines, remarks: 'Paid cash' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const [y, n] = ar.split('-');
  assert.equal(r.data.arNo, `${y}-${String(Number(n) + 1).padStart(4, '0')}`, 'next AR number after the payment one');
  const r2 = await ad.patch(`/api/receipts/${r.data.id}`, { date: '2026-10-18', receivedFrom: 'Walk-in client', lines: lines.slice(0, 1) });
  assert.equal(r2.status, 200);
  assert.equal(r2.data.arNo, r.data.arNo);
  assert.equal(r2.data.lines.length, 1);
  assert.ok((await ad.state()).receipts.some((x: any) => x.id === r.data.id));
  assert.equal((await ad.raw('DELETE', `/api/receipts/${r.data.id}`)).status, 200);
  assert.equal((await ad.raw('DELETE', `/api/applications/${app.id}/payments/${ar}`)).status, 200);
  assert.equal((await ad.state()).applications.find((a: any) => a.id === app.id).payments.length, 0);
});

test('sales report: the admin can add and remove a sale entered by hand', async () => {
  const ad = await admin();
  assert.equal((await ad.post('/api/sales-entries', { date: '10/17/2026', vehicle: 'X', client: 'Y', amount: 1 })).status, 400, 'yyyy-mm-dd only');
  assert.equal((await (await carlo()).post('/api/sales-entries', { date: '2026-10-17', vehicle: 'X', client: 'Y', amount: 1 })).status, 403);
  const e = await ad.post('/api/sales-entries', { date: '2026-10-17', vehicle: '2022 Ford Ranger', client: 'Walk-in', agent: 'Carlo Santos', amount: 1250000 });
  assert.equal(e.status, 200, JSON.stringify(e.json));
  assert.ok((await ad.state()).salesEntries.some((x: any) => x.id === e.data.id));
  assert.equal((await ad.raw('DELETE', `/api/sales-entries/${e.data.id}`)).status, 200);
  assert.ok(!(await ad.state()).salesEntries.some((x: any) => x.id === e.data.id));
});

test('takeover: the admin reads silently, and can answer only after the client waited 2 days and the chat is taken over', async () => {
  const c = await newClient();
  const [ca, ad] = [await carlo(), await admin()];
  const v = (await ad.state()).vehicles.find((x: any) => x.status === 'available'); // a chat needs any listed car
  await c.post('/api/apply-requests', { vehicleId: v.id });
  const conv = { id: (await ca.post(`/api/leads/${c.id}/claim`)).data.conversationId };
  assert.equal((await c.post(`/api/conversations/${conv.id}/messages`, { text: 'Is it still available?' })).status, 200);
  const unread = async () => (await ca.state()).conversations.find((x: any) => x.id === conv.id).unreadSeller;
  const before = await unread();
  assert.ok(before > 0);
  await ad.post(`/api/conversations/${conv.id}/read`);
  assert.equal(await unread(), before, 'the admin reading does not mark it read');
  assert.equal((await ad.post(`/api/conversations/${conv.id}/takeover`)).status, 400, 'too early');
  assert.equal((await ad.post(`/api/conversations/${conv.id}/messages`, { text: 'Hi' })).status, 403);
  // the client has now waited 3 days
  const row = await store.get<any>('conversations', conv.id);
  row.messages.at(-1).timestamp = new Date(Date.now() - 72 * 3600e3).toISOString();
  await store.put('conversations', row);
  assert.equal((await ca.post(`/api/conversations/${conv.id}/takeover`)).status, 403, 'admins only');
  assert.equal((await ad.post(`/api/conversations/${conv.id}/takeover`)).status, 200);
  assert.ok((await ca.state()).notifications.some((n: any) => n.title === 'Chat taken over'), 'the agent is told');
  assert.equal((await ad.post(`/api/conversations/${conv.id}/messages`, { text: 'Yes it is! How can we help?' })).status, 200);
  const msg = (await c.state()).conversations.find((x: any) => x.id === conv.id).messages.at(-1);
  assert.equal(msg.senderName, 'Broom Broom');
  assert.equal(msg.isSeller, true);
  assert.equal(msg.byAdmin, true);
  assert.equal((await ad.post(`/api/conversations/${conv.id}/end-takeover`)).status, 200);
  assert.equal((await ad.post(`/api/conversations/${conv.id}/messages`, { text: 'again' })).status, 403);
});

test('money accounts: the admin adds, edits and deletes them; expenses are checked against the real balance', async () => {
  const ad = await admin();
  assert.equal((await (await carlo()).post('/api/ledger-accounts', { kind: 'payment', name: 'X', amount: 1 })).status, 403);
  assert.equal((await ad.post('/api/ledger-accounts', { kind: 'other', name: 'X', amount: 1 })).status, 400);
  const acct = await ad.post('/api/ledger-accounts', { kind: 'payment', name: 'Metrobank payroll', method: 'bank', amount: 5000 });
  assert.equal(acct.status, 200, JSON.stringify(acct.json));
  assert.equal((await ad.post('/api/ledger-accounts', { kind: 'payment', name: 'metrobank PAYROLL', amount: 1 })).status, 400, 'names are unique');
  const voucher = (amount: number) => ad.post('/api/vouchers', { kind: 'expense', payee: 'Meralco', accountId: acct.data.id, paymentDate: '2026-10-18', method: 'bank', lines: [{ category: 'Utilities', description: 'Electric bill', amount }] });
  assert.equal((await voucher(6000)).status, 400, 'more than the opening balance');
  assert.equal((await ad.post('/api/vouchers', { kind: 'credit', payee: 'X', accountId: acct.data.id, paymentDate: '2026-10-18', lines: [{ category: 'Other', description: 'x', amount: 1 }] })).status, 400, 'a cash/bank account is not a credit line');
  assert.equal((await voucher(4000)).status, 200);
  const edited = await ad.patch(`/api/ledger-accounts/${acct.data.id}`, { name: 'Metrobank payroll account', amount: 8000, kind: 'credit' });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.kind, 'payment', 'the kind cannot change');
  assert.equal(edited.data.amount, 8000);
  assert.equal((await ad.raw('DELETE', `/api/ledger-accounts/${acct.data.id}`)).status, 400, 'in use');
  const spare = await ad.post('/api/ledger-accounts', { kind: 'credit', name: 'Spare card', amount: 0 });
  assert.equal((await ad.raw('DELETE', `/api/ledger-accounts/${spare.data.id}`)).status, 200);
  const s = await ad.state();
  assert.ok(s.ledgerAccounts.some((a: any) => a.id === acct.data.id));
});

test('limits: sign-ups, help messages and listing reports per address; uploads must be the type they claim', async () => {
  const from = '10.9.9.9';
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await client('buyer', from).post('/api/auth/register', { name: `Spam ${i}`, email: `spam${i}@test.local`, phone: '1', password: CLIENT_PASSWORD })).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  assert.equal((await client('buyer').post('/api/auth/register', { name: 'Weak', email: 'weak@test.local', phone: '1', password: 'abcdefgh' })).status, 400, 'needs a number');

  const help = client('buyer', '10.9.9.10');
  assert.equal((await help.post('/api/support', { name: 'Ana', email: 'not-an-email', topic: 'Documents', message: 'Hi' })).status, 400);
  const sent = outbox.length;
  assert.equal((await help.post('/api/support', { name: 'Ana <b>', email: 'ana@test.local', topic: 'Documents', message: 'Where do I upload my ID?' })).status, 200);
  const mail = outbox[sent];
  assert.equal(mail.to, 'broombroombookingservices@gmail.com');
  assert.equal(mail.replyTo, 'ana@test.local');
  assert.ok(mail.html.includes('Ana &lt;b&gt;') && !mail.html.includes('<b>'), 'escaped');
  for (let i = 0; i < 4; i++) await help.post('/api/support', { name: 'Ana', email: 'ana@test.local', topic: 'Documents', message: 'again' });
  assert.equal((await help.post('/api/support', { name: 'Ana', email: 'ana@test.local', topic: 'Documents', message: 'again' })).status, 429);

  const c = await newClient();
  assert.equal((await c.upload(new TextEncoder().encode('<script>alert(1)</script>'), 'image/png', 'x.png')).status, 415, 'not really a PNG');
  assert.equal((await c.upload(new TextEncoder().encode('<html>'), 'application/pdf', 'x.pdf')).status, 415, 'not really a PDF');
});

// ---------- Google sign-in ----------
test('Google tokens: only a genuine, unexpired token for this site with a verified email is accepted', async () => {
  const { generateKeyPairSync, sign } = await import('node:crypto');
  const { verifyGoogleToken } = await import('./google.ts');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const keys = async () => [{ ...(publicKey.export({ format: 'jwk' }) as any), kid: 'k1' }];
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Date.now();
  const claims = { iss: 'https://accounts.google.com', aud: 'my-client', sub: 'g-123', email: 'Juan@Gmail.com', email_verified: true, name: 'Juan dela Cruz', exp: Math.floor(now / 1000) + 3600 };
  const token = (c: object, key = privateKey, alg = 'RS256') => {
    const head = `${b64({ alg, kid: 'k1', typ: 'JWT' })}.${b64(c)}`;
    return `${head}.${sign('RSA-SHA256', Buffer.from(head), key).toString('base64url')}`;
  };
  const check = (t: string) => verifyGoogleToken(t, 'my-client', keys, now);
  assert.deepEqual(await check(token(claims)), { sub: 'g-123', email: 'juan@gmail.com', name: 'Juan dela Cruz', picture: undefined });
  assert.equal(await check(token({ ...claims, aud: 'someone-else' })), undefined, 'another site');
  assert.equal(await check(token({ ...claims, iss: 'https://evil.example' })), undefined, 'not Google');
  assert.equal(await check(token({ ...claims, exp: Math.floor(now / 1000) - 3600 })), undefined, 'expired');
  assert.equal(await check(token({ ...claims, email_verified: false })), undefined, 'unverified email');
  assert.equal(await check(token(claims, other)), undefined, 'forged signature');
  assert.equal(await check(token(claims, privateKey, 'none')), undefined, 'alg none');
  const t = token(claims);
  assert.equal(await check(`${t.split('.')[0]}.${b64({ ...claims, email: 'admin@test.local' })}.${t.split('.')[2]}`), undefined, 'changed claims');
  assert.equal(await check('not-a-token'), undefined);
});

test('Google sign-in: new clients are created, existing clients are linked, staff and disabled accounts are refused', async () => {
  // the route: client site only, and off until GOOGLE_CLIENT_ID is set
  assert.equal((await client('buyer').post('/api/auth/google', { credential: 'x.y.z' })).status, 503);
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  assert.equal((await client('seller').post('/api/auth/google', { credential: 'x.y.z' })).status, 401, 'staff portals verify the token too');
  assert.equal((await client('buyer').post('/api/auth/google', { credential: 'x.y.z' })).status, 401, 'a bad token is refused');
  delete process.env.GOOGLE_CLIENT_ID;

  const fresh = await svc.googleSignIn({ sub: 'g-new', email: 'newgoogle@test.local', name: 'New Google User' });
  assert.equal(fresh.created, true);
  assert.equal(fresh.user.role, 'buyer');
  assert.equal(fresh.user.hasPassword, false);
  assert.equal(fresh.user.googleLinked, true);
  const again = await svc.googleSignIn({ sub: 'g-new', email: 'newgoogle@test.local', name: 'New Google User' });
  assert.equal(again.created, false);
  assert.equal(again.user.id, fresh.user.id, 'same account the second time');

  const c = await newClient();
  const linked = await svc.googleSignIn({ sub: 'g-existing', email: c.email, name: 'Whatever' });
  assert.equal(linked.user.id, c.id, 'the existing client account');
  assert.equal(linked.user.hasPassword, true, 'keeps its password');
  assert.equal((await client('buyer').login(c.email, CLIENT_PASSWORD)).status, 200, 'password still works');

  await assert.rejects(svc.googleSignIn({ sub: 'g-staff', email: 'carlo.santos@test.local', name: 'X' }), /staff account/);
  const ad = await admin();
  await ad.post(`/api/users/${c.id}/active`, { active: false });
  await assert.rejects(svc.googleSignIn({ sub: 'g-existing', email: c.email, name: 'X' }), /disabled/);
  await ad.post(`/api/users/${c.id}/active`, { active: true });

  // an account made with Google can set its first password without a current one
  await assert.doesNotReject(svc.changePassword(fresh.user, undefined, 'FirstPass123'));
  assert.ok(await (await import('./auth.ts')).users.verify('newgoogle@test.local', 'FirstPass123'));
});

test('staff Google sign-in: only accounts the admin made, for that portal; a temporary password stops working', async () => {
  const ad = await admin();
  const made = await ad.post('/api/users', { name: 'Google Agent', email: 'google.agent@test.local', role: 'seller', password: 'TempPass123' });
  assert.equal(made.status, 200);
  // nobody else can get in with Google
  await assert.rejects(svc.googleStaffSignIn({ sub: 'g-stranger', email: 'stranger@test.local', name: 'X' }, 'seller'), /No agent account/);
  await assert.rejects(svc.googleStaffSignIn({ sub: 'g-ga', email: 'google.agent@test.local', name: 'X' }, 'admin'), /No admin account/, 'an agent is not an admin');
  const c = await newClient();
  await assert.rejects(svc.googleStaffSignIn({ sub: 'g-client', email: c.email, name: 'X' }, 'seller'), /No agent account/, 'a client is not an agent');

  const u = await svc.googleStaffSignIn({ sub: 'g-ga', email: 'google.agent@test.local', name: 'Whatever' }, 'seller');
  assert.equal(u.id, made.data.id);
  assert.equal(u.googleLinked, true);
  assert.equal(u.mustChangePassword, undefined, 'no password to change');
  assert.equal((await client('seller').login('google.agent@test.local', 'TempPass123')).status, 401, 'the temporary password stopped working');
  // the linked Google account keeps working; another Google account with the same email does not
  assert.equal((await svc.googleStaffSignIn({ sub: 'g-ga', email: 'google.agent@test.local', name: 'X' }, 'seller')).id, made.data.id);
  await assert.rejects(svc.googleStaffSignIn({ sub: 'g-other', email: 'google.agent@test.local', name: 'X' }, 'seller'), /different Google account/);
  // disabled staff are refused
  await ad.post(`/api/users/${made.data.id}/active`, { active: false });
  await assert.rejects(svc.googleStaffSignIn({ sub: 'g-ga', email: 'google.agent@test.local', name: 'X' }, 'seller'), /disabled/);
});

test('change email: an address held by a client can be freed and given to an admin, who then signs in with Google', async () => {
  const ad = await admin();
  // a client made with Google holds the company Gmail
  const { user: clientAcct } = await svc.googleSignIn({ sub: 'g-company', email: 'company@test.local', name: 'Company Gmail' });
  const second = await ad.post('/api/users', { name: 'Second Admin', email: 'second.admin@test.local', role: 'admin', password: 'TempAdmin123' });
  assert.equal((await ad.post(`/api/users/${second.data.id}/email`, { email: 'company@test.local' })).status, 400, 'still taken');
  assert.equal((await (await carlo()).post(`/api/users/${clientAcct.id}/email`, { email: 'x@test.local' })).status, 403, 'admins only');
  assert.equal((await ad.post(`/api/users/${clientAcct.id}/email`, { email: 'not an email' })).status, 400);
  // free it: the client account gets another address and loses its Google link
  assert.equal((await ad.post(`/api/users/${clientAcct.id}/email`, { email: 'company.client@test.local' })).status, 200);
  assert.equal((await ad.post(`/api/users/${second.data.id}/email`, { email: 'company@test.local' })).status, 200);
  const u = await svc.googleStaffSignIn({ sub: 'g-company', email: 'company@test.local', name: 'X' }, 'admin');
  assert.equal(u.id, second.data.id, 'the Google account now opens the admin account');
  assert.equal((await client('admin').login('company@test.local', 'TempAdmin123')).status, 401, 'its temporary password was retired');
});

test('conversations: claiming a client starts a chat with the agent; clients can write to their agent about anything', async () => {
  const ca = await carlo();
  // a client who asked to apply has no chat until an agent claims them; the claim starts it
  const c = await newClient();
  const v = await freeVehicle();
  await c.post('/api/apply-requests', { vehicleId: v.id });
  assert.equal((await c.state()).conversations.length, 0);
  assert.equal((await ca.post(`/api/leads/${c.id}/claim`)).status, 200);
  let convs = (await c.state()).conversations;
  assert.equal(convs.length, 1);
  assert.equal(convs[0].sellerName, 'Carlo Santos');
  assert.equal(convs[0].vehicleId, v.id, 'about the vehicle they applied for');
  assert.match(convs[0].messages.at(-2).text, /I'm Carlo Santos, your Broom Broom agent/);
  assert.equal(convs[0].messages.at(-1).applyVehicleId, v.id, 'then the apply link');
  assert.equal(convs[0].messages.at(-1).isSeller, true);
  assert.ok((await c.state()).notifications.some((n: any) => n.title === 'Your agent'));
  assert.ok((await ca.state()).conversations.some((x: any) => x.id === convs[0].id), 'the agent sees it');

  // the client writes to their agent without a listing: a general chat, reused next time
  assert.equal((await c.post('/api/conversations', { text: '' })).status, 400, 'needs a message');
  const g = await c.post('/api/conversations', { text: 'Do you accept trade-ins?' });
  assert.equal(g.status, 200, JSON.stringify(g.json));
  assert.equal(g.data.vehicleId, '');
  assert.equal(g.data.vehicleTitle, 'General inquiry');
  assert.equal(g.data.sellerName, 'Carlo Santos', 'goes to their agent');
  const g2 = await c.post('/api/conversations', { text: 'Also, what are your hours?' });
  assert.equal(g2.data.id, g.data.id, 'same general chat');
  assert.equal(g2.data.messages.length, 2);
  // about a listing, with their own first message
  const other = await freeVehicle();
  const l = await c.post('/api/conversations', { vehicleId: other.id, text: 'Is the price negotiable?' });
  assert.equal(l.data.messages[0].text, 'Is the price negotiable?');
  assert.equal((await ca.state()).conversations.filter((x: any) => x.buyerId === c.id).length, 3);
  // a client with no agent cannot write at all
  const lone = await newClient();
  assert.equal((await lone.post('/api/conversations', { text: 'Hello?' })).status, 400);
});

test('editing a listing: details, photos and videos change; removing every photo brings back the placeholder', async () => {
  const ad = await admin();
  const v = await freeVehicle();
  const img = (await ad.upload(PNG, 'image/png', 'car.png', 'public')).data;
  const e1 = await ad.patch(`/api/vehicles/${v.id}`, { title: 'Test Unit Edited', price: 899000, description: 'Fresh tires', location: 'Pasig City', images: [img.url], videos: [] });
  assert.equal(e1.status, 200, JSON.stringify(e1.json));
  assert.equal(e1.data.title, 'Test Unit Edited');
  assert.equal(e1.data.price, 899000);
  assert.deepEqual(e1.data.images, [img.url]);
  assert.equal(e1.data.videos, undefined);
  assert.equal(e1.data.sellerLocation, 'Pasig City');
  assert.equal(e1.data.status, v.status, 'status unchanged');
  const e2 = await ad.patch(`/api/vehicles/${v.id}`, { images: [] });
  assert.equal(e2.data.images.length, 1);
  assert.ok(e2.data.images[0].startsWith('data:image/svg+xml'), 'placeholder');
  assert.equal((await ad.patch(`/api/vehicles/${v.id}`, { images: ['javascript:alert(1)'] })).status, 400);
  assert.equal((await ad.patch(`/api/vehicles/${v.id}`, { price: -5 })).status, 400);
  assert.equal((await (await carlo()).patch(`/api/vehicles/${v.id}`, { price: 1 })).status, 403, 'admins only');
});

test('agents start the chat: claiming returns it, and Message client opens or starts one for their own clients', async () => {
  const ca = await carlo();
  const c = await newClient();
  await c.post('/api/apply-requests', { vehicleId: (await freeVehicle()).id });
  const claimed = await ca.post(`/api/leads/${c.id}/claim`);
  assert.equal(claimed.status, 200);
  const convId = claimed.data.conversationId;
  assert.ok(convId, 'the claim returns the chat it started');
  assert.equal((await ca.post(`/api/leads/${c.id}/conversation`)).data.conversationId, convId, 'Message client opens the same chat');
  assert.equal((await (await bea()).post(`/api/leads/${c.id}/conversation`)).status, 403, 'not her client');
  // a client the admin assigned (no chat yet): Message client starts one with the agent's introduction
  const d = await newClient();
  await d.post('/api/apply-requests', { vehicleId: (await freeVehicle()).id });
  assert.equal((await (await admin()).post(`/api/leads/${d.id}/assign`, { agentName: 'Carlo Santos' })).status, 200);
  const started = await ca.post(`/api/leads/${d.id}/conversation`);
  assert.equal(started.status, 200);
  const conv = (await d.state()).conversations.find((x: any) => x.id === started.data.conversationId);
  assert.equal(conv.sellerName, 'Carlo Santos');
  assert.match(conv.messages[0].text, /your Broom Broom agent/);
});

// ---------------- security (OWASP) ----------------
test('security: agents never get info sheets; bad Origin refused; oversized uploads refused early; stored files sandboxed', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await apply(c, v.id)).data;
  await toApproved(ad, c, app.id); // has an information sheet now
  const agentApps = (await (await carlo()).state()).applications;
  const mine = agentApps.find((a: any) => a.id === app.id);
  assert.ok(mine, 'the agent still sees the application');
  assert.equal(mine.infoSheet, undefined, 'but not the information sheet');
  assert.ok((await ad.state()).applications.find((a: any) => a.id === app.id).infoSheet, 'the admin does');

  assert.equal((await c.raw('POST', '/api/auth/logout', {}, { Origin: 'null' })).status, 403);
  assert.equal((await c.raw('POST', '/api/auth/logout', {}, { Origin: 'not a url' })).status, 403);
  assert.equal((await c.raw('POST', '/api/auth/logout', {}, { Origin: 'https://evil.example' })).status, 403);

  const big = await c.raw('POST', '/api/uploads?name=big.pdf', new Uint8Array(16), { 'Content-Type': 'application/pdf', 'Content-Length': String(50 * 1024 * 1024) }).catch(() => ({ status: 413 }));
  assert.equal(big.status, 413);

  const up = (await c.upload(PDF, 'application/pdf', 'x.pdf')).data;
  const res = await fetch(base + up.url, { headers: { 'X-Portal': 'buyer', Cookie: '' } });
  assert.equal(res.status, 403, 'private files need the owner or an admin');
});

test('two applications for the same car: each has its own quotation; the release pays the right client and the approved commission', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  // first application (written as "AJ Jandrei"), reserved with a quotation, then cancelled
  const first = (await apply(c, v.id, { applicantName: 'AJ Jandrei' })).data;
  await approveDocs(ad, first.id);
  assert.equal((await reserve(ad, first.id)).status, 200);
  const q1 = await signQuote(ad, c, first.id);
  assert.equal((await ad.post(`/api/applications/${first.id}/status`, { status: 'declined', note: 'Changed buyer' })).status, 200);
  // second application for the same car (written as "Kent Magtibay")
  const second = (await apply(c, v.id, { applicantName: 'Kent Magtibay' })).data;
  await approveDocs(ad, second.id);
  assert.equal((await reserve(ad, second.id)).status, 200);
  assert.equal((await c.post(`/api/applications/${second.id}/info-sheet`, SHEET_OK)).status, 400, 'the first application’s signed quotation does not count');
  const q2 = (await ad.post(`/api/applications/${second.id}/quotation`)).data;
  assert.notEqual(q2.id, q1);
  assert.equal(q2.applicationRef, second.referenceNo);
  assert.equal(q2.clientName, 'Kent Magtibay', 'the name on this application');
  await ad.patch(`/api/quotations/${q2.id}`, { changes: {}, send: true });
  assert.equal((await c.post(`/api/quotations/${q2.id}/return`, { conforme: 'Kent Magtibay' })).status, 200);
  assert.equal((await ad.post(`/api/quotations/${q2.id}/confirm`)).status, 200);
  assert.equal((await c.post(`/api/applications/${second.id}/info-sheet`, SHEET_OK)).status, 200);
  assert.equal((await ad.post(`/api/applications/${second.id}/status`, { status: 'approved', commission: 40000 })).status, 200);
  assert.equal((await ad.post(`/api/applications/${second.id}/release`, { orcrConfirmed: true, orcrFileId: await orcrFile(ad) })).status, 200);
  const coms = (await ad.state()).commissions.filter((x: any) => x.applicationRef === second.referenceNo || x.applicationRef === first.referenceNo);
  assert.equal(coms.length, 1, 'one commission, for the released application only');
  assert.equal(coms[0].applicationRef, second.referenceNo);
  assert.equal(coms[0].clientName, 'Kent Magtibay');
  assert.equal(coms[0].amount, 40000);
});

test('release frees the client: no agent or lock, the chat with that agent ends, and they can ask to apply again for anyone to claim', async () => {
  const c = await newClient();
  const ad = await admin();
  const v = await freeVehicle();
  const app = (await apply(c, v.id)).data; // Carlo claims and sends the link
  await toApproved(ad, c, app.id);
  const conv = (await c.state()).conversations[0];
  assert.equal((await ad.post(`/api/applications/${app.id}/release`, { orcrConfirmed: true, orcrFileId: await orcrFile(ad) })).status, 200);
  assert.equal((await ad.state()).commissions.find((x: any) => x.applicationRef === app.referenceNo).agentName, 'Carlo Santos', 'Carlo is still paid');
  const st = await c.state();
  assert.equal(st.myAgent, null, 'no agent any more');
  assert.ok(st.conversations.find((x: any) => x.id === conv.id).closedAt, 'the chat ended');
  assert.equal((await c.post(`/api/conversations/${conv.id}/messages`, { text: 'hi' })).status, 400, 'read-only');
  const ca = await carlo();
  assert.ok(!(await ca.state()).conversations.some((x: any) => x.id === conv.id), 'gone from the agent');
  assert.equal((await ca.post(`/api/conversations/${conv.id}/messages`, { text: 'hi' })).status, 400);
  const lead = (await ad.state()).leads.find((l: any) => l.clientId === c.id);
  assert.equal(lead.agentName, undefined);
  assert.equal(lead.lockedTo, undefined);
  assert.ok(!(await (await bea()).state()).leads.some((l: any) => l.clientId === c.id), 'not in Open leads until they ask again');
  // a new vehicle: back in Open leads, and another agent may claim them
  const v2 = await freeVehicle();
  assert.equal((await c.post('/api/apply-requests', { vehicleId: v2.id })).status, 200);
  assert.ok((await (await bea()).state()).leads.some((l: any) => l.clientId === c.id && !l.agentName), 'back in Open leads');
  assert.equal((await (await bea()).post(`/api/leads/${c.id}/claim`)).status, 200);
  const chats = (await c.state()).conversations;
  const fresh = chats.find((x: any) => !x.closedAt);
  assert.equal(fresh.sellerName, 'Bea Villanueva');
  assert.equal(fresh.vehicleId, v2.id);
  assert.equal(fresh.messages.at(-1).applyVehicleId, v2.id, 'the claim sent the apply link again');
  assert.equal((await ad.state()).leads.find((l: any) => l.clientId === c.id).lockedTo, 'Bea Villanueva', 'and Bea keeps the client');
  assert.equal((await (await carlo()).post(`/api/leads/${c.id}/claim`)).status, 409, 'first come, first served');
  assert.equal(chats.find((x: any) => x.id === conv.id).sellerName, 'Carlo Santos', 'the old chat stays as it was');
});

test('release always frees the client (even with an older application still open); stale locks from earlier releases are cleared on the next request', async () => {
  const ad = await admin();
  // an older application left open does not keep the lock after a release
  const c = await newClient();
  const old = (await apply(c, (await freeVehicle()).id)).data; // Carlo claims; this one stays "submitted"
  const v = await freeVehicle();
  const app = (await apply(c, v.id)).data;
  await toApproved(ad, c, app.id);
  assert.equal((await ad.post(`/api/applications/${app.id}/release`, { orcrConfirmed: true, orcrFileId: await orcrFile(ad) })).status, 200);
  let lead = (await ad.state()).leads.find((l: any) => l.clientId === c.id);
  assert.equal(lead.agentName, undefined, 'free, although ' + old.referenceNo + ' is still open');
  assert.equal(lead.lockedTo, undefined);

  // a client released before this rule existed: still locked to their old agent in the data
  const d = await newClient();
  const dv = await freeVehicle();
  const dapp = (await apply(d, dv.id)).data;
  await toApproved(ad, d, dapp.id);
  assert.equal((await ad.post(`/api/applications/${dapp.id}/release`, { orcrConfirmed: true, orcrFileId: await orcrFile(ad) })).status, 200);
  const row = await store.get<any>('leads', d.id);
  const claimedAt = new Date(Date.now() - 3600e3).toISOString();
  await store.put('leads', { ...row, agentName: 'Carlo Santos', lockedTo: 'Carlo Santos', lockedRef: dapp.referenceNo, claimedAt, doneAt: undefined });
  assert.equal((await d.state()).myAgent, 'Carlo Santos', 'stale lock in place');
  assert.equal((await d.post('/api/apply-requests', { vehicleId: (await freeVehicle()).id })).status, 200);
  lead = (await ad.state()).leads.find((l: any) => l.clientId === d.id);
  assert.equal(lead.agentName, undefined, 'back in Open leads');
  assert.equal(lead.lockedTo, undefined);
  assert.ok((await (await bea()).state()).leads.some((l: any) => l.clientId === d.id && !l.agentName), 'every agent sees them');
  assert.equal((await (await bea()).post(`/api/leads/${d.id}/claim`)).status, 200, 'any agent can be first');
  assert.equal((await d.state()).myAgent, 'Bea Villanueva');
});
