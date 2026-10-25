/// <reference types="node" />
import { randomBytes } from 'node:crypto';
import type {
  Vehicle,
  VehicleApplication,
  ApplicationStatus,
  ApplicationDocument,
  Conversation,
  ChatMessage,
  Commission,
  ListingRequest,
  VehicleReport,
  AppNotification,
  Expense,
  ExpenseLine,
  PaymentReceipt,
  Quotation,
  ClientLead,
  VehicleStatus,
  ManualReceipt,
  ReceiptLine,
  SalesEntry,
  Referral,
  ReferralStatus,
  ApplyRequest,
  LedgerAccount,
} from '../src/types.ts';
import { TEAM_NAME, COMMISSION_RATE, generateVehicleSvg } from '../src/data/constants.ts';
import { agentSlug, canTakeOver, shouldAlertUnclaimed, shouldRelease } from '../src/components/leads.ts';
import { DEFAULT_RATE, DEFAULT_VALID_DAYS, QUOTE_TERMS, daysFromToday, isExpired } from '../src/components/quote.ts';
import { DOCS, MIN_UPLOADS } from '../src/components/requirements.ts';
import { accountBalance, creditAvailable } from '../src/components/accounting/ledger.ts';
import { store, tx, nextNumber, raw, opts, files } from './db.ts';
import { users, HttpError, validPassword, PASSWORD_RULE, rateLimit, type User } from './auth.ts';
import type { GoogleProfile } from './google.ts';
import { cleanInfoSheet, type InfoSheet } from '../src/components/infoSheet.ts';

// ---------- small helpers ----------
const now = () => new Date().toISOString();
const year = () => new Date().getFullYear();
const pad4 = (n: number) => String(n).padStart(4, '0');
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
const bad = (msg: string): never => {
  throw new HttpError(400, msg);
};
const forbidden = (msg = 'Your account cannot do that.'): never => {
  throw new HttpError(403, msg);
};
const need = <T>(x: T | undefined, what = 'Record'): T => {
  if (x === undefined || x === null) throw new HttpError(404, `${what} not found.`);
  return x;
};
const text = (v: unknown, field: string, max = 500, required = true): string => {
  if (v === undefined || v === null || v === '') {
    if (required) bad(`${field} is required.`);
    return '';
  }
  if (typeof v !== 'string') bad(`${field} must be text.`);
  const t = (v as string).trim();
  if (required && !t) bad(`${field} is required.`);
  if (t.length > max) bad(`${field} is too long (max ${max} characters).`);
  return t;
};
const money = (v: unknown, field: string, { min = 0, allowZero = false } = {}): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  if (typeof n !== 'number' || !Number.isFinite(n)) bad(`${field} must be a number.`);
  if (n < min || (!allowZero && n === 0)) bad(`${field} must be more than ${min}.`);
  if (n > 1e10) bad(`${field} is too large.`);
  return Math.round(n * 100) / 100;
};
const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Media a listing may point at: our own files, the bundled photos, or http(s) images. Never javascript: or data: URLs.
const safeMediaUrl = (u: unknown) => typeof u === 'string' && /^(\/files\/[\w-]+|\.\/vehicles\/[\w.-]+|\/vehicles\/[\w.-]+|https:\/\/[^\s"'<>]+)$/.test(u);
// Ids from the browser are only ever compared as strings (never as query objects).
const idOf = (v: unknown) => (typeof v === 'string' ? v : '');

export const notify = (audience: 'client' | 'agent' | 'admin', title: string, message: string, linkTarget?: string, recipient?: string) =>
  store.put<AppNotification>('notifications', {
    id: newId('notif'),
    audience,
    recipient,
    title,
    message,
    type: 'system',
    linkTarget,
    read: false,
    createdAt: now(),
  });

// ---------- uploads ----------
type UploadRow = { _id: string; ownerId: string; uploadedBy: string; visibility: string; mime: string; name: string; size: number; attached: boolean };
const fileUrl = (id: string) => `/files/${id}`;
// Ties an uploaded file to a record. Only the person who uploaded it can attach it, once; ownership then moves to
// whoever may view it (the client for their documents, the agent for a payout proof).
const attachUpload = async (fileId: unknown, me: User, ownerId: string, accept: RegExp): Promise<UploadRow> => {
  if (typeof fileId !== 'string') bad('File missing.');
  const row = (await raw('uploads').findOne({ _id: fileId as string }, opts())) as UploadRow | null;
  if (!row || row.uploadedBy !== me.id) bad('That upload was not found. Upload the file again.');
  if (row!.attached) bad('That file is already attached to something else. Upload it again.');
  if (!accept.test(row!.mime)) bad(`${row!.name} is not an accepted file type.`);
  await raw('uploads').updateOne({ _id: row!._id }, { $set: { attached: true, ownerId } }, opts());
  return row!;
};
const IMG_OR_PDF = /^(image\/(png|jpeg|webp|gif|heic|heif)|application\/pdf)$/;
const IMG = /^image\/(png|jpeg|webp|gif|heic|heif)$/;

// Files uploaded but never attached to anything (a form left half-way) are deleted after a day.
export const removeAbandonedUploads = async () => {
  const old = await raw('uploads').find({ attached: false, createdAt: { $lt: new Date(Date.now() - 864e5) } }, { projection: { _id: 1 } }).limit(200).toArray();
  for (const u of old) {
    await files().delete(u._id as any).catch(() => {}); // already gone is fine
    await raw('uploads').deleteOne({ _id: u._id });
  }
};

// ---------- leads (who each client belongs to) ----------
const agentBySlug = async (slug: unknown) =>
  typeof slug === 'string' && slug ? (await users.agents()).find((a) => agentSlug(a.name) === slug.toLowerCase())?.name : undefined;
export const ownerOf = async (clientId: string) => (await store.get<ClientLead>('leads', clientId))?.agentName;

// A client's chats, open applications and not-yet-earned commissions follow their owner (or go back to the team).
const moveClient = async (clientId: string, owner: string | undefined) => {
  const name = owner ?? TEAM_NAME;
  for (const c of await store.all<Conversation>('conversations', { buyerId: clientId, closedAt: { $exists: false } }))
    await store.put('conversations', { ...c, sellerName: name, sellerId: owner ? agentSlug(owner) : 'team' });
  const apps = await store.all<VehicleApplication>('applications', { applicantId: clientId });
  for (const a of apps) if (!['completed', 'declined', 'withdrawn'].includes(a.status)) await store.put('applications', { ...a, sellerName: name });
  if (owner) {
    const refs = apps.filter((a) => a.status !== 'completed').map((a) => a.referenceNo);
    for (const c of await store.all<Commission>('commissions', { applicationRef: { $in: refs }, transactionCompleted: { $ne: true } }))
      await store.put('commissions', { ...c, agentName: owner });
  }
};

// The client did something (first message, application). New clients always go to Open leads: an agent must claim
// them before any chat reaches that agent. A referral link only tells that agent to claim them.
// Only a chat message starts the 24-hour reply clock.
const touchLead = async (client: User, interest: string, isMessage: boolean, refSlug: unknown): Promise<string | undefined> => {
  const existing = await store.get<ClientLead>('leads', client.id);
  if (existing) {
    if (isMessage) await store.put('leads', { ...existing, lastClientAt: now() });
    return existing.agentName;
  }
  const referrer = await agentBySlug(refSlug);
  const at = now();
  await store.put<ClientLead>('leads', {
    id: client.id,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    agentName: undefined,
    source: 'pool',
    createdAt: at,
    pooledAt: at,
    interest,
    lastClientAt: isMessage ? at : undefined,
    history: [{ at, text: referrer ? `Entered Open leads through ${referrer}'s link` : 'Entered Open leads' }],
  });
  if (referrer) await notify('agent', 'Client from your link', `${client.name} came through your link about the ${interest}. Claim them in Open leads to start the chat.`, 'leads', referrer);
  await notify('agent', 'New lead', `${client.name} is asking about the ${interest}. Claim them in Open leads.`, 'leads');
  return undefined;
};

// Two agents claiming at once: both transactions write the same lead, MongoDB lets one commit and reruns the other,
// which then finds the lead taken.
export const claimLead = (me: User, clientId: string) =>
  tx(async () => {
    const open = (await store.all<ApplyRequest>('apply_requests', { clientId: idOf(clientId), claimedBy: null, doneAt: { $exists: false } }, { createdAt: 1 }))[0];
    if (open) return claimRequest(me, open.id);
    const lead = need(await store.get<ClientLead>('leads', idOf(clientId)), 'Lead');
    if (lead.agentName) throw new HttpError(409, `${lead.clientName} is already ${lead.agentName === me.name ? 'your' : `${lead.agentName}'s`} client.`);
    const at = now();
    // First come, first served: a client who asked to apply goes to the first agent who claims them, the apply link is
    // sent in the new chat, and the client stays with that agent (locked) while they apply.
    const wanted = lead.applyVehicleId ? await store.get<Vehicle>('vehicles', lead.applyVehicleId) : undefined;
    const sendLink = wanted?.status === 'available';
    await store.put<ClientLead>('leads', {
      ...lead,
      agentName: me.name,
      source: 'pool',
      claimedAt: at,
      escalatedAt: undefined,
      ...(sendLink ? { lockedTo: me.name, lockedRef: `request:${wanted!.id}`, lockedAt: at } : {}),
      history: [...lead.history, { at, text: sendLink ? `Claimed by ${me.name}, who sent the apply link for the ${wanted!.title}` : `Claimed by ${me.name}` }],
    });
    await moveClient(lead.clientId, me.name);
    const conversationId = await introduceAgent(lead.clientId, me.name);
    if (sendLink && conversationId) await sendMessage(me, conversationId, { applyVehicleId: wanted!.id });
    await notify('admin', 'Lead claimed', `${me.name} claimed ${lead.clientName} (${lead.interest}).`, 'leads');
    return { clientName: lead.clientName, conversationId };
  });

// Admin: give a client to an agent, or put them back in Open leads (null). Also used by the 24-hour rule.
export const assignLead = (clientId: string, agentName: string | null, reason?: string) =>
  tx(async () => {
    const lead = need(await store.get<ClientLead>('leads', idOf(clientId)), 'Lead');
    if (lead.lockedTo) bad(`${lead.clientName} is locked to ${lead.lockedTo} (applied through their link). Unlock first if you really need to move them.`);
    if (agentName && !(await users.agents()).some((a) => a.name === agentName)) bad('Choose an active agent.');
    if ((lead.agentName ?? null) === agentName) return;
    const at = now();
    const note = agentName ? `Assigned to ${agentName} by the admin` : reason || 'Returned to Open leads by the admin';
    await store.put<ClientLead>('leads', {
      ...lead,
      agentName: agentName ?? undefined,
      source: agentName ? 'admin' : 'pool',
      claimedAt: agentName ? at : undefined,
      pooledAt: agentName ? lead.pooledAt : at,
      escalatedAt: undefined,
      history: [...lead.history, { at, text: note }],
    });
    await moveClient(lead.clientId, agentName ?? undefined);
    if (lead.agentName) await notify('agent', 'Client reassigned', `${lead.clientName} is no longer your client. ${note}.`, 'leads', lead.agentName);
    if (agentName) await notify('agent', 'New client assigned', `${lead.clientName} (${lead.interest}) is now your client.`, 'leads', agentName);
    else await notify('agent', 'New lead', `${lead.clientName} is back in Open leads (${lead.interest}).`, 'leads');
  });

// Admin, as the top authority: remove an apply-link lock so the client can be reassigned.
export const unlockLead = (clientId: string) =>
  tx(async () => {
    const lead = need(await store.get<ClientLead>('leads', idOf(clientId)), 'Lead');
    if (!lead.lockedTo) return;
    const at = now();
    await store.put<ClientLead>('leads', { ...lead, lockedTo: undefined, lockedRef: undefined, lockedAt: undefined, history: [...lead.history, { at, text: `Unlocked from ${lead.lockedTo} by the admin` }] });
    await notify('agent', 'Client unlocked', `The admin unlocked ${lead.clientName}; they can now be reassigned.`, 'leads', lead.lockedTo);
  });

// A finished application ends the lock it created.
const releaseLock = async (app: VehicleApplication) => {
  const lead = await store.get<ClientLead>('leads', app.applicantId);
  if (lead?.lockedTo && lead.lockedRef === app.referenceNo)
    await store.put<ClientLead>('leads', { ...lead, lockedTo: undefined, lockedRef: undefined, lockedAt: undefined, history: [...lead.history, { at: now(), text: `Lock ended (${app.referenceNo} ${app.status})` }] });
};

// The 2-hour and 24-hour rules. Runs every minute on the server.
export const runLeadRules = async (): Promise<boolean> => {
  const t = Date.now();
  let changed = false;
  for (const l of await store.all<ClientLead>('leads')) {
    if (shouldRelease(l, t)) {
      await assignLead(l.clientId, null, `No reply from ${l.agentName} within 24 hours`);
      await notify('admin', 'Client released', `${l.clientName} waited 24 hours for ${l.agentName} and is back in Open leads.`, 'leads');
      changed = true;
    } else if (shouldAlertUnclaimed(l, t)) {
      await store.put('leads', { ...l, escalatedAt: now() });
      await notify('admin', 'Lead waiting', `${l.clientName} has been in Open leads for over 2 hours (${l.interest}).`, 'leads');
      changed = true;
    }
  }
  return changed;
};

// ---------- vehicles and listing requests ----------
const LISTING_FIELDS = ['title', 'brand', 'model', 'variant', 'year', 'category', 'price', 'mileage', 'condition', 'transmission', 'fuel', 'bodyType', 'color', 'location', 'description', 'financingAvailable', 'images', 'videos'] as const;
const CATEGORIES = ['cars', 'motorcycles', 'trucks', 'ebikes', 'scooters', 'atvs'];
const cleanListing = (input: any, partial: boolean): Partial<Vehicle> => {
  const out: any = {};
  for (const k of LISTING_FIELDS) if (input?.[k] !== undefined) out[k] = input[k];
  if (!partial || out.title !== undefined) out.title = text(out.title, 'Title', 120);
  if (!partial || out.brand !== undefined) out.brand = text(out.brand, 'Brand', 60);
  if (out.model !== undefined) out.model = text(out.model, 'Model', 80, false);
  if (out.variant !== undefined) out.variant = text(out.variant, 'Variant', 80, false);
  if (!partial || out.price !== undefined) out.price = money(out.price, 'Price', { min: 1 });
  if (out.mileage !== undefined) out.mileage = money(out.mileage, 'Mileage', { allowZero: true });
  if (out.year !== undefined && (!Number.isInteger(out.year) || out.year < 1950 || out.year > year() + 1)) bad('Enter a valid year.');
  if (out.category !== undefined && !CATEGORIES.includes(out.category)) bad('Choose a category.');
  if (out.condition !== undefined && !['New', 'Surplus / 2nd hand'].includes(out.condition)) bad('Condition must be New or Surplus / 2nd hand.');
  if (out.location !== undefined) out.location = text(out.location, 'Location', 120, false);
  if (out.description !== undefined) out.description = text(out.description, 'Description', 4000, false);
  for (const k of ['transmission', 'fuel', 'bodyType', 'color'] as const) if (out[k] !== undefined) out[k] = text(out[k], k, 60, false);
  if (out.financingAvailable !== undefined) out.financingAvailable = !!out.financingAvailable;
  for (const k of ['images', 'videos'] as const) {
    if (out[k] === undefined) continue;
    if (!Array.isArray(out[k]) || out[k].length > (k === 'images' ? 8 : 3) || !out[k].every(safeMediaUrl)) bad(`Check the listing ${k === 'images' ? 'photos' : 'videos'}.`);
  }
  return out;
};
const markMediaAttached = async (urls: string[] = []) => {
  const ids = urls.map((u) => u.match(/^\/files\/([\w-]+)$/)?.[1]).filter(Boolean) as string[];
  if (ids.length) await raw('uploads').updateMany({ _id: { $in: ids } }, { $set: { attached: true } }, opts());
};

const buildVehicle = (data: Partial<Vehicle>, status: VehicleStatus): Vehicle => {
  const category = (data.category || 'cars') as Vehicle['category'];
  return {
    id: newId('veh'),
    title: data.title!,
    brand: data.brand!,
    model: data.model || data.title!,
    variant: data.variant || undefined,
    year: data.year || year(),
    category,
    price: data.price!,
    mileage: data.mileage ?? 0,
    condition: data.condition || 'Surplus / 2nd hand',
    transmission: (data.transmission || 'Automatic') as Vehicle['transmission'],
    fuel: (data.fuel || 'Gasoline') as Vehicle['fuel'],
    bodyType: data.bodyType || 'Sedan',
    color: data.color || '',
    location: data.location || 'Philippines',
    province: '',
    region: '',
    sellerId: 'team',
    sellerName: TEAM_NAME,
    sellerLocation: data.location || 'Philippines',
    description: data.description || '',
    images: data.images?.length ? data.images : [generateVehicleSvg(category === 'motorcycles' ? 'bike' : 'car', '#111827', data.title!)],
    videos: data.videos?.length ? data.videos : undefined,
    specs: { engine: '', horsepower: '', seating: '', doors: '' },
    financingAvailable: data.financingAvailable ?? true,
    minMonthlyPayment: Math.round(data.price! * 0.018),
    status,
    featured: false,
    createdAt: now(),
    viewsCount: 0,
  };
};

export const createVehicle = (input: any) =>
  tx(async () => {
    const data = cleanListing(input, false);
    const v = await store.put('vehicles', buildVehicle(data, input?.status === 'unpublished' ? 'unpublished' : 'available'));
    await markMediaAttached([...(v.images || []), ...(v.videos || [])]);
    return v;
  });

export const updateVehicle = (id: string, input: any) =>
  tx(async () => {
    const v = need(await store.get<Vehicle>('vehicles', idOf(id)), 'Listing');
    const changes = cleanListing(input, true);
    await markMediaAttached([...(changes.images || []), ...(changes.videos || [])]);
    // Every photo removed: back to the drawn placeholder. No videos: none.
    if (changes.images && !changes.images.length) changes.images = [generateVehicleSvg((changes.category ?? v.category) === 'motorcycles' ? 'bike' : 'car', '#111827', changes.title ?? v.title)];
    if (changes.videos && !changes.videos.length) changes.videos = undefined;
    if (changes.location !== undefined) changes.sellerLocation = changes.location || 'Philippines';
    return store.put('vehicles', { ...v, ...changes, minMonthlyPayment: Math.round((changes.price ?? v.price) * 0.018) });
  });

export const setVehicleStatus = (id: string, status: unknown) =>
  tx(async () => {
    if (!['available', 'reserved', 'sold', 'unpublished'].includes(status as string)) bad('Unknown status.');
    const v = need(await store.get<Vehicle>('vehicles', idOf(id)), 'Listing');
    return store.put('vehicles', { ...v, status: status as VehicleStatus });
  });

// Statuses that hold the vehicle for a client.
const HOLDING: ApplicationStatus[] = ['reserved', 'processing', 'approved'];
const isReserved = async (vehicleId: string) => !!(await store.one('applications', { vehicleId, status: { $in: HOLDING } }));

export const deleteVehicle = (id: string) =>
  tx(async () => {
    need(await store.get<Vehicle>('vehicles', idOf(id)), 'Listing');
    if (await isReserved(id)) bad('This vehicle is reserved for a client. Complete or cancel that application first.');
    await store.remove('vehicles', id);
  });

export const submitListingRequest = (me: User, input: any) =>
  tx(async () => {
    const type = input?.type;
    if (!['add', 'edit'].includes(type)) bad('Agents can request a new listing or an edit.');
    let vehicleTitle: string;
    let changes: Partial<Vehicle> | undefined;
    if (type === 'add') {
      changes = cleanListing(input.changes, false);
      vehicleTitle = changes.title!;
    } else {
      const v = need(await store.get<Vehicle>('vehicles', idOf(input.vehicleId)), 'Listing');
      vehicleTitle = v.title;
      if (type === 'edit') {
        changes = cleanListing(input.changes, true);
        if (!Object.keys(changes).length) bad('Change at least one detail.');
      }
      if (await store.one('listing_requests', { status: 'pending', vehicleId: v.id, agentName: me.name })) bad('You already have a pending request for this listing.');
    }
    const req = await store.put<ListingRequest>('listing_requests', {
      id: newId('req'),
      type,
      agentName: me.name,
      vehicleId: type === 'add' ? undefined : input.vehicleId,
      vehicleTitle,
      changes,
      note: text(input.note, 'Note', 1000, false),
      status: 'pending',
      createdAt: now(),
    });
    const what = type === 'add' ? `asked to add "${vehicleTitle}"` : `asked to change ${Object.keys(changes!).join(', ')} on "${vehicleTitle}"`;
    await notify('admin', 'Agent request', `${me.name} ${what}.${req.note ? ` Note: ${req.note}` : ''}`, 'approvals');
    return req;
  });

export const decideListingRequest = (id: string, approve: boolean, reason: unknown) =>
  tx(async () => {
    const req = need(await store.get<ListingRequest>('listing_requests', idOf(id)), 'Request');
    if (req.status !== 'pending') bad('This request was already decided.');
    const why = approve ? undefined : text(reason, 'Reason', 500);
    if (approve) {
      if (req.type === 'add') await store.put('vehicles', buildVehicle(cleanListing(req.changes, false), 'available'));
      if (req.type === 'edit' && req.vehicleId) {
        const v = need(await store.get<Vehicle>('vehicles', req.vehicleId), 'Listing');
        await store.put('vehicles', { ...v, ...cleanListing(req.changes, true) });
      }
      if (req.type === 'remove' && req.vehicleId) {
        if (await isReserved(req.vehicleId)) bad('This vehicle is reserved for a client, so it cannot be removed yet.');
        await store.remove('vehicles', req.vehicleId);
      }
    }
    await store.put('listing_requests', { ...req, status: approve ? 'approved' : 'rejected', reason: why, decidedAt: now() });
    await notify(
      'agent',
      approve ? 'Listing request approved' : 'Listing request rejected',
      approve ? `Your ${req.type} request for "${req.vehicleTitle}" was applied.` : `Your ${req.type} request for "${req.vehicleTitle}" was rejected: ${why}`,
      'vehicles',
      req.agentName
    );
  });

// ---------- safety reports ----------
const REPORT_REASONS: VehicleReport['reason'][] = ['Misleading information', 'Suspicious listing', 'Incorrect price', 'Incorrect vehicle information', 'Prohibited content', 'Other'];
// Anyone may flag a listing, signed in or not.
export const submitReport = (me: User | undefined, input: any) =>
  tx(async () => {
    const v = need(await store.get<Vehicle>('vehicles', idOf(input?.vehicleId)), 'Listing');
    if (!REPORT_REASONS.includes(input.reason)) bad('Choose a reason.');
    const email = text(input.reportedEmail ?? me?.email, 'Email', 200, false);
    if (email && !EMAIL.test(email)) bad('Enter a valid email, or leave it empty.');
    const r = await store.put<VehicleReport>('reports', {
      id: newId('rep'),
      vehicleId: v.id,
      vehicleTitle: v.title,
      reportedBy: me?.name ?? 'Anonymous visitor',
      reportedEmail: email,
      reason: input.reason,
      details: text(input.details, 'Details', 2000),
      status: 'pending',
      createdAt: now(),
    });
    await notify('admin', 'Listing reported', `${v.title}: ${r.reason}.`, 'reports');
    return r;
  });

export const resolveReport = (id: string, action: unknown) =>
  tx(async () => {
    const r = need(await store.get<VehicleReport>('reports', idOf(id)), 'Report');
    if (action !== 'dismiss' && action !== 'unpublish_vehicle') bad('Unknown action.');
    if (action === 'unpublish_vehicle') {
      const v = await store.get<Vehicle>('vehicles', r.vehicleId);
      if (v) await store.put('vehicles', { ...v, status: 'unpublished' });
    }
    await store.put('reports', { ...r, status: action === 'dismiss' ? 'dismissed' : 'resolved' });
  });

// ---------- applications ----------
const OPEN: ApplicationStatus[] = ['submitted', 'under_review', 'contacted'];
// Review -> reserved (reservation AR) -> processing (information sheet in) -> approved -> completed (released with OR/CR).
const NEXT: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: [],
  submitted: ['under_review', 'contacted', 'reserved', 'declined', 'withdrawn'],
  under_review: ['contacted', 'reserved', 'declined', 'withdrawn'],
  contacted: ['under_review', 'reserved', 'declined', 'withdrawn'],
  reserved: ['processing', 'declined', 'withdrawn'],
  processing: ['approved', 'declined', 'withdrawn'],
  approved: ['completed', 'declined', 'withdrawn'],
  completed: [],
  declined: [],
  withdrawn: [],
};

export const createApplication = (me: User, input: any) =>
  tx(async () => {
    const v = need(await store.get<Vehicle>('vehicles', idOf(input?.vehicleId)), 'Listing');
    if (v.status !== 'available') bad('This vehicle is no longer available.');
    if (await store.one('applications', { applicantId: me.id, vehicleId: v.id, status: { $in: [...OPEN, ...HOLDING] } })) bad('You already have an open application for this vehicle.');
    const method = input.purchaseMethod;
    if (method !== 'cash' && method !== 'financing') bad('Choose cash or financing.');

    // A sent, unexpired quotation for this vehicle fixes the price.
    let quote: Quotation | undefined;
    if (input.quotationId) {
      quote = need(await store.get<Quotation>('quotations', idOf(input.quotationId)), 'Quotation');
      if (quote.clientId !== me.id || quote.vehicleId !== v.id || quote.status !== 'sent' || isExpired(quote)) bad('That quotation can no longer be used.');
    }
    const price = quote?.unitPrice ?? v.price;
    let downPayment: number | undefined;
    let term: number | undefined;
    if (method === 'financing') {
      downPayment = money(input.downPayment, 'Down payment', { min: 1 });
      if (downPayment >= price) bad('The down payment must be less than the price.');
      term = Number(input.financingTermMonths);
      if (!QUOTE_TERMS.includes(term)) bad('Choose a loan term.');
    }

    // Documents: the required list for the method; at least MIN_UPLOADS (or all, if fewer) must be uploaded now.
    const required = DOCS[method as 'cash' | 'financing'].flatMap((g) => g.items);
    const given: Record<string, unknown> = input.documents && typeof input.documents === 'object' ? input.documents : {};
    const documents: ApplicationDocument[] = [];
    for (const d of required) {
      const fileId = given[d.key];
      if (!fileId) {
        documents.push({ label: d.label, fileName: '' });
        continue;
      }
      const up = await attachUpload(fileId, me, me.id, IMG_OR_PDF);
      documents.push({ label: d.label, fileName: up.name, url: fileUrl(up._id), status: 'pending' });
    }
    const uploaded = documents.filter((d) => d.fileName).length;
    if (uploaded < Math.min(MIN_UPLOADS, required.length)) bad(`Upload at least ${Math.min(MIN_UPLOADS, required.length)} document${required.length > 1 ? 's' : ''}.`);

    const a = input.address || {};
    // Clients apply only through the apply link their agent sent them in the chat, for this vehicle.
    // Finishing it makes the client that agent's (locked below) and sends the agent an automatic message.
    const viaAgent = await agentBySlug(input.viaAgent);
    const linkChat = viaAgent ? await store.one<Conversation>('conversations', { buyerId: me.id, sellerName: viaAgent, 'messages.applyVehicleId': v.id }) : undefined;
    if (!viaAgent || !linkChat) bad('Apply through the application link your agent sends you in Messages.');
    if (linkChat!.closedAt) bad('That chat has ended. Press "Request to apply" on the vehicle again.');
    // The agent who sent this link handles this application (a client may have other agents for other vehicles).
    const leadOwner = await touchLead(me, v.title, false, input.viaAgent);
    if (!leadOwner) await assignLead(me.id, viaAgent!, `Applied through ${viaAgent}'s link`);
    const owner = viaAgent;
    const locked = !leadOwner || leadOwner === viaAgent; // the client's main agent is locked to them while they apply
    const app = await store.put<VehicleApplication>('applications', {
      id: newId('app'),
      referenceNo: `GB-${year()}-${pad4(await nextNumber(`app-${year()}`))}`,
      vehicleId: v.id,
      vehicleTitle: v.title,
      vehiclePrice: price,
      vehicleImage: v.images[0],
      vehicleLocation: v.location,
      sellerId: owner ? agentSlug(owner) : 'team',
      sellerName: owner ?? TEAM_NAME,
      applicantId: me.id,
      applicantName: text(input.applicantName ?? me.name, 'Full name', 120),
      applicantEmail: text(input.applicantEmail ?? me.email, 'Email', 200),
      applicantPhone: text(input.applicantPhone ?? me.phone, 'Phone', 40),
      address: {
        street: text(a.street, 'Street', 200),
        barangay: text(a.barangay, 'Barangay', 120, false),
        city: text(a.city, 'City', 120),
        province: text(a.province, 'Province', 120, false),
        region: text(a.region, 'Region', 60, false),
        postalCode: text(a.postalCode, 'Postal code', 12, false),
        country: 'Philippines',
      },
      purchaseMethod: method,
      financingTermMonths: term,
      downPayment,
      status: 'submitted',
      submittedAt: now(),
      notes: text(input.notes, 'Notes', 2000, false),
      documents,
      quotationNo: quote?.quoteNo,
      viaAgentLink: locked ? viaAgent : undefined,
    });
    if (locked) {
      const lead = (await store.get<ClientLead>('leads', me.id))!;
      const at = now();
      await store.put<ClientLead>('leads', { ...lead, lockedTo: viaAgent, lockedRef: app.referenceNo, lockedAt: at, history: [...lead.history, { at, text: `Locked to ${viaAgent}: applied through their link (${app.referenceNo})` }] });
      await notify('agent', 'Client locked to you', `${me.name} applied for the ${v.title} through your link (${app.referenceNo}). They are locked to you.`, 'leads', viaAgent);
    }
    {
      // The automatic message in the chat where the link was sent.
      const at = now();
      const chat = (await store.get<Conversation>('conversations', linkChat!.id))!;
      const t = `I have finished the application for the ${v.title} through your link (${app.referenceNo}). You are now my agent for this purchase.`;
      await store.put<Conversation>('conversations', {
        ...chat,
        lastMessage: t,
        updatedAt: at,
        unreadSeller: chat.unreadSeller + 1,
        messages: [...chat.messages, { id: newId('msg'), senderId: me.id, senderName: me.name, text: t, timestamp: at, isSeller: false, auto: true }],
      });
    }
    if (quote) {
      await store.put('quotations', { ...quote, status: 'accepted', applicationRef: app.referenceNo });
      await notify('admin', 'Quotation accepted', `${me.name} applied for the ${v.title} using ${quote.quoteNo} (${app.referenceNo}).`, 'applications');
    }
    await notify('client', 'Application received', `Your application ${app.referenceNo} for the ${app.vehicleTitle} is complete. Nothing more to fill in for now: we will notify you when the vehicle is reserved and your quotation is ready.`, 'applications', me.id);
    if (owner) await notify('agent', 'Your client applied', `${app.applicantName} applied for the ${app.vehicleTitle} (${method}).`, 'messages', owner);
    await notify('admin', 'Application to review', `${app.referenceNo}: ${app.applicantName} applied for the ${app.vehicleTitle}.`, 'applications');
    return app;
  });

// The agent's commission on a sale, set by the admin; without one it is the standard rate of the price.
const commissionAmount = (app: VehicleApplication, v: unknown) =>
  v === undefined || v === null || v === '' ? Math.round(app.vehiclePrice * COMMISSION_RATE) : money(v, 'Agent commission', { allowZero: true });

// Admin: reserve the vehicle for the client. Their documents must be approved; the reservation payment is confirmed
// and released as an acknowledgement receipt in the client's name. The client then fills in the information sheet.
export const reserveApplication = (me: User, id: string, input: any) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(id)), 'Application');
    if (!NEXT[app.status]?.includes('reserved')) bad(`An application that is ${app.status.replace('_', ' ')} cannot be reserved.`);
    if ((app.documents || []).some((d) => d.status !== 'approved')) bad('Approve every document before reserving the vehicle.');
    const vehicle = await store.get<Vehicle>('vehicles', app.vehicleId);
    if (!vehicle || vehicle.status === 'sold') bad('This vehicle is no longer available.');
    if (await store.one('applications', { vehicleId: app.vehicleId, status: { $in: HOLDING }, id: { $ne: app.id } })) bad('This vehicle is already reserved for another client.');
    await store.put('vehicles', { ...vehicle!, status: 'reserved' });
    await store.put<VehicleApplication>('applications', { ...app, status: 'reserved', reservedAt: now() });
    const receipt = await addPayment(me, app.id, { amount: input?.amount, description: input?.description || `Reservation fee for ${app.vehicleTitle}`, remarks: input?.remarks, fileId: input?.fileId });
    await notify('client', 'Vehicle reserved', `The ${app.vehicleTitle} is reserved for you (${app.referenceNo}). Next: the admin team sends you a quotation to sign.`, 'applications', app.applicantId);
    return receipt;
  });

// Client: the Applicant's Information Sheet, after the reservation. Sending it moves the application to processing.
export const submitInfoSheet = (me: User, id: string, input: any) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(id)), 'Application');
    if (app.applicantId !== me.id) forbidden();
    if (app.status !== 'reserved') bad(app.infoSheet ? 'Your information sheet is already in.' : 'The information sheet opens once the vehicle is reserved for you.');
    if (!(await store.one('quotations', { ...quoteFilter(app), status: 'confirmed' }))) bad('The information sheet opens once the admin team confirms your signed quotation.');
    const sheet = cleanInfoSheet(input);
    if (typeof sheet === 'string') bad(sheet);
    const sketch = input?.sketchFileId ? await attachUpload(input.sketchFileId, me, me.id, IMG) : undefined;
    const saved = await store.put<VehicleApplication>('applications', {
      ...app,
      status: 'processing',
      infoSheet: { ...(sheet as InfoSheet), sketchUrl: sketch ? fileUrl(sketch._id) : undefined },
      infoSheetSubmittedAt: now(),
    });
    await notify('admin', 'Information sheet submitted', `${app.applicantName} sent the information sheet for ${app.referenceNo}. Review it, then approve or disapprove.`, 'applications');
    return saved;
  });

// After a release the client is free again: no agent, no lock, not in Open leads (until they ask to apply again), and
// their chats with that agent end (read-only for the client, gone from the agent's list). The agent keeps the commission.
const endAgentLink = async (clientId: string, agent: string, ref: string, vehicleId?: string) => {
  const at = now();
  for (const r of await store.all<ApplyRequest>('apply_requests', { clientId, doneAt: { $exists: false }, ...(vehicleId ? { vehicleId } : { claimedBy: agent }) }))
    await store.put<ApplyRequest>('apply_requests', { ...r, doneAt: at });
  for (const c of await store.all<Conversation>('conversations', { buyerId: clientId, sellerName: agent, closedAt: { $exists: false } }))
    await store.put<Conversation>('conversations', { ...c, closedAt: at, unreadSeller: 0 });
  const lead = await store.get<ClientLead>('leads', clientId);
  if (lead && (!lead.agentName || lead.agentName === agent)) {
    await store.put<ClientLead>('leads', {
      ...lead,
      agentName: undefined,
      lockedTo: undefined,
      lockedRef: undefined,
      lockedAt: undefined,
      applyVehicleId: undefined,
      escalatedAt: undefined,
      doneAt: at,
      history: [...lead.history, { at, text: `Vehicle released (${ref}): ${agent}'s chat ended; the client can ask to apply again` }],
    });
  }
};

// Admin: release the vehicle to the client, confirming it now has its OR and CR. Completes the sale.
export const releaseVehicle = (me: User, id: string, input: any) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(id)), 'Application');
    if (app.status !== 'approved') bad('Only an approved application can be released.');
    if (input?.orcrConfirmed !== true) bad('Confirm that the vehicle now has its OR and CR.');
    if (!input?.orcrFileId) bad('Upload the OR/CR of the vehicle before releasing it.');
    const orcr = await attachUpload(input.orcrFileId, me, app.applicantId, IMG_OR_PDF); // the client can open it too
    const vehicle = await store.get<Vehicle>('vehicles', app.vehicleId);
    if (vehicle) await store.put('vehicles', { ...vehicle, status: 'sold' });
    // The commission exists only from the release: the agent who has the client gets it in full, payable at once.
    const existing = await store.one<Commission>('commissions', { applicationRef: app.referenceNo }); // older sales had one from approval
    const amount = input?.commission === undefined ? (app.commissionAmount ?? existing?.amount ?? commissionAmount(app, undefined)) : commissionAmount(app, input.commission);
    const agent = app.sellerName !== TEAM_NAME ? app.sellerName : (await ownerOf(app.applicantId)) ?? existing?.agentName ?? app.sellerName;
    const c: Commission = existing ?? {
      id: newId('com'),
      agentName: agent,
      applicationRef: app.referenceNo,
      vehicleTitle: app.vehicleTitle,
      clientName: app.applicantName,
      salePrice: app.vehiclePrice,
      rate: 0,
      amount,
      status: 'payable',
      transactionCompleted: true,
      createdAt: now(),
    };
    await store.put<Commission>('commissions', {
      ...c,
      agentName: agent,
      amount,
      rate: app.vehiclePrice ? amount / app.vehiclePrice : 0,
      status: c.status === 'paid' ? 'paid' : 'payable',
      transactionCompleted: true,
      completedAt: now(),
      approvedAt: c.approvedAt ?? now(),
    });
    const saved = await store.put<VehicleApplication>('applications', { ...app, status: 'completed', releasedAt: now(), orcrConfirmed: true, orcrUrl: fileUrl(orcr._id), orcrFileName: orcr.name, commissionAmount: amount });
    await releaseLock(saved);
    await endAgentLink(app.applicantId, agent, app.referenceNo, app.vehicleId);
    await notify('agent', 'Vehicle released: full commission', `The ${app.vehicleTitle} was released to ${app.applicantName}. Your full commission of ₱${amount.toLocaleString()} is approved and awaiting the cash transfer.`, 'commissions', agent);
    await notify('client', 'Vehicle released', `Your ${app.vehicleTitle} has been released to you with its OR and CR. Thank you for choosing Broom Broom.`, 'applications', app.applicantId);
    return saved;
  });

export const setApplicationStatus = (me: User, id: string, status: ApplicationStatus, note?: unknown, commission?: unknown) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(id)), 'Application');
    if (me.role === 'buyer' && (app.applicantId !== me.id || status !== 'withdrawn')) forbidden();
    if (!NEXT[app.status]?.includes(status)) bad(`An application that is ${app.status.replace('_', ' ')} cannot become ${String(status).replace('_', ' ')}.`);
    const reason = text(note, 'Reason', 1000, status === 'declined');

    const vehicle = await store.get<Vehicle>('vehicles', app.vehicleId);
    const setVehicle = async (s: VehicleStatus) => {
      if (vehicle) await store.put('vehicles', { ...vehicle, status: s });
    };

    // Reserving, the information sheet and the release have their own steps (they need more than a status).
    if (status === 'reserved') bad('Reserve the vehicle with the reservation payment.');
    if (status === 'processing') bad('The application moves to processing when the client sends the information sheet.');
    if (status === 'completed') bad('Release the vehicle, confirming its OR and CR.');

    let extra: Partial<VehicleApplication> = {};
    if (status === 'approved') {
      // After the information sheet: the commission is receivable from now (cash and financing).
      extra = { commissionAmount: commissionAmount(app, commission), approvedAt: now(), ciComments: reason || undefined, ...(app.purchaseMethod === 'financing' ? { financingApprovedAt: now() } : {}) };
      await notify('client', 'Application approved', `${app.referenceNo} for the ${app.vehicleTitle} was approved. We will tell you when the vehicle is ready for release.`, 'applications', app.applicantId);
    } else if (status === 'declined' || status === 'withdrawn') {
      if (HOLDING.includes(app.status)) await setVehicle('available');
      await store.removeWhere('commissions', { applicationRef: app.referenceNo, status: 'receivable' });
      if (status === 'declined') await notify('client', app.status === 'processing' ? 'Application disapproved' : 'Application declined', `${app.referenceNo} was ${app.status === 'processing' ? 'disapproved' : 'declined'}.${reason ? ` Reason: ${reason}` : ''}`, 'applications', app.applicantId);
      else await notify('admin', 'Application withdrawn', `${app.applicantName} withdrew ${app.referenceNo}.`, 'applications');
    } else {
      await notify('client', 'Application update', `${app.referenceNo} is now ${status.replace('_', ' ')}.`, 'applications', app.applicantId);
    }
    const saved = await store.put('applications', { ...app, ...extra, status, sellerNotes: status === 'approved' ? app.sellerNotes : reason || app.sellerNotes });
    if (['declined', 'withdrawn'].includes(status)) await releaseLock(saved);
    return saved;
  });

const docAt = (app: VehicleApplication, i: number) => {
  const d = app.documents?.[i];
  if (!d) throw new HttpError(404, 'Document not found.');
  return d;
};

export const reviewDocument = (appId: string, i: number, approve: boolean, reason: unknown) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(appId)), 'Application');
    const d = docAt(app, i);
    if (!d.fileName) bad('This document has not been submitted yet.');
    const why = approve ? undefined : text(reason, 'Reason', 500);
    const documents = app.documents!.map((x, k) => (k === i ? { ...x, status: approve ? ('approved' as const) : ('rejected' as const), reason: why } : x));
    await store.put('applications', { ...app, documents });
    if (approve) {
      if (documents.every((x) => x.status === 'approved')) await notify('client', 'Documents approved', `All documents for ${app.referenceNo} were approved.`, 'applications', app.applicantId);
      return null;
    }
    await notify('client', 'Document needs attention', `${d.label} for ${app.referenceNo} was not accepted: ${why}. Upload a new copy from My Applications.`, 'applications', app.applicantId);
    // The route emails the client (after this commits) with every document still waiting for a new copy.
    const client = await users.byId(app.applicantId);
    return {
      to: client?.email ?? app.applicantEmail,
      name: app.applicantName,
      appId: app.id,
      referenceNo: app.referenceNo,
      vehicle: app.vehicleTitle,
      docs: documents.filter((x) => x.status === 'rejected').map((x) => ({ label: x.label, reason: x.reason || 'Please upload a clearer copy.' })),
    };
  });

// The client uploads a new copy of a rejected document (or one they had not submitted yet), e.g. from the
// re-submission email. It goes back to the admin for review.
export const resubmitDocument = (me: User, appId: string, i: number, fileId: unknown) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(appId)), 'Application');
    if (app.applicantId !== me.id) forbidden();
    if (['declined', 'withdrawn', 'completed'].includes(app.status)) bad('This application is closed, so documents can no longer be changed.');
    const d = docAt(app, i);
    if (d.fileName && d.status !== 'rejected') bad('This document is already on file and does not need a new copy.');
    const up = await attachUpload(fileId, me, me.id, IMG_OR_PDF);
    const documents = app.documents!.map((x, k) =>
      k === i ? { ...x, fileName: up.name, url: fileUrl(up._id), status: 'pending' as const, reason: undefined, addedByAdmin: false, resubmittedAt: now() } : x
    );
    await store.put('applications', { ...app, documents });
    await notify('admin', 'Document re-submitted', `${app.applicantName} uploaded a new ${d.label} for ${app.referenceNo}.`, 'financing');
  });

// The client handed a document to the admin, who files it on their application; it then waits for review like any other.
export const attachDocumentForClient = (me: User, appId: string, i: number, fileId: unknown) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(appId)), 'Application');
    const d = docAt(app, i);
    if (d.fileName && d.status !== 'rejected') bad('This document is already on file.');
    const up = await attachUpload(fileId, me, app.applicantId, IMG_OR_PDF);
    const documents = app.documents!.map((x, k) => (k === i ? { ...x, fileName: up.name, url: fileUrl(up._id), status: 'pending' as const, reason: undefined, addedByAdmin: true } : x));
    await store.put('applications', { ...app, documents });
    await notify('client', 'Document received', `The admin team added your ${d.label} to ${app.referenceNo}.`, 'applications', app.applicantId);
  });

// A confirmed partial payment releases the next acknowledgement receipt (AR) to the client.
export const addPayment = (me: User, appId: string, input: any) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(appId)), 'Application');
    if (app.status === 'declined' || app.status === 'withdrawn' || app.status === 'completed') bad('Payments can only be recorded on an open or approved application.');
    const amount = money(input?.amount, 'Amount', { min: 0 });
    const paid = (app.payments ?? []).reduce((s, p) => s + p.amount, 0);
    if (paid + amount > app.vehiclePrice) bad(`That is more than the balance of ${peso(app.vehiclePrice - paid)}.`);
    const shot = input?.fileId ? await attachUpload(input.fileId, me, app.applicantId, IMG) : undefined;
    const receipt: PaymentReceipt = {
      arNo: `${year()}-${pad4(await nextNumber(`ar-${year()}`))}`,
      date: now(),
      description: text(input?.description, 'Description', 200),
      amount,
      receivedBy: me.name,
      attachment: shot ? fileUrl(shot._id) : undefined,
      attachmentName: shot?.name,
      remarks: text(input?.remarks, 'Remarks', 500, false) || undefined,
    };
    await store.put('applications', { ...app, payments: [...(app.payments ?? []), receipt] });
    await notify('client', 'Payment received', `Your payment of ${peso(amount)} for ${app.referenceNo} was confirmed. Acknowledgement receipt ${receipt.arNo} is ready.`, 'applications', app.applicantId);
    return receipt;
  });

// Admin corrections to a released AR: amount, description, remarks, or a new screenshot. The AR number stays.
export const updatePayment = (me: User, appId: string, arNo: string, input: any) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(appId)), 'Application');
    const old = need((app.payments ?? []).find((p) => p.arNo === arNo), 'Receipt');
    const amount = money(input?.amount, 'Amount', { min: 0 });
    const others = (app.payments ?? []).filter((p) => p.arNo !== arNo).reduce((s, p) => s + p.amount, 0);
    if (others + amount > app.vehiclePrice) bad(`That is more than the balance of ${peso(app.vehiclePrice - others)}.`);
    const shot = input?.fileId ? await attachUpload(input.fileId, me, app.applicantId, IMG) : undefined;
    const p: PaymentReceipt = {
      ...old,
      amount,
      description: text(input?.description, 'Description', 200),
      remarks: text(input?.remarks, 'Remarks', 500, false) || undefined,
      ...(shot ? { attachment: fileUrl(shot._id), attachmentName: shot.name } : {}),
      editedAt: now(),
    };
    await store.put('applications', { ...app, payments: (app.payments ?? []).map((x) => (x.arNo === arNo ? p : x)) });
    return p;
  });

export const deletePayment = (appId: string, arNo: string) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(appId)), 'Application');
    need((app.payments ?? []).find((p) => p.arNo === arNo), 'Receipt');
    await store.put('applications', { ...app, payments: (app.payments ?? []).filter((p) => p.arNo !== arNo) });
  });

// ---------- acknowledgement receipts written by hand ----------
const receiptInput = (input: any) => {
  const lines: ReceiptLine[] = Array.isArray(input?.lines) ? input.lines : [];
  if (!lines.length) bad('Add at least one line.');
  if (lines.length > 8) bad('An acknowledgement receipt has room for 8 lines.');
  const ymd = typeof input?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : bad('Pick the date.');
  return {
    date: new Date(`${ymd}T12:00:00`).toISOString(),
    receivedFrom: text(input?.receivedFrom, 'Received from', 120),
    lines: lines.map((l, i) => {
      const qty = Number(l?.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 9999) bad(`Line ${i + 1}: quantity must be a whole number.`);
      return { description: text(l?.description, `Line ${i + 1} description`, 200), qty, price: money(l?.price, `Line ${i + 1} price`) };
    }),
    remarks: text(input?.remarks, 'Remarks', 500, false) || undefined,
  };
};

export const createReceipt = (me: User, input: any) =>
  tx(async () => {
    const shot = input?.fileId ? await attachUpload(input.fileId, me, me.id, IMG) : undefined;
    const at = now();
    const r: ManualReceipt = {
      id: newId('ar'),
      arNo: `${year()}-${pad4(await nextNumber(`ar-${year()}`))}`,
      ...receiptInput(input),
      receivedBy: me.name,
      attachment: shot ? fileUrl(shot._id) : undefined,
      attachmentName: shot?.name,
      createdAt: at,
    };
    return store.put('receipts', r);
  });

export const updateReceipt = (me: User, id: string, input: any) =>
  tx(async () => {
    const old = need(await store.get<ManualReceipt>('receipts', idOf(id)), 'Receipt');
    const shot = input?.fileId ? await attachUpload(input.fileId, me, me.id, IMG) : undefined;
    return store.put<ManualReceipt>('receipts', {
      ...old,
      ...receiptInput(input),
      ...(shot ? { attachment: fileUrl(shot._id), attachmentName: shot.name } : {}),
      editedAt: now(),
    });
  });

export const deleteReceipt = (id: string) =>
  tx(async () => {
    need(await store.get<ManualReceipt>('receipts', idOf(id)), 'Receipt');
    await store.remove('receipts', idOf(id));
  });

// ---------- referrals the admin tracks by hand ----------
const REFERRAL_STATUS: ReferralStatus[] = ['receivable', 'processing', 'approved', 'disapproved'];
export const addReferral = (me: User, input: any) =>
  tx(async () => {
    const r: Referral = {
      id: newId('ref'),
      referredBy: text(input?.referredBy, 'Referred by', 120),
      clientName: text(input?.clientName, 'Client name', 120),
      status: 'receivable',
      history: [{ at: now(), by: me.name, text: 'Added as receivable' }],
      createdBy: me.name,
      createdAt: now(),
    };
    return store.put('referrals', r);
  });

export const setReferralStatus = (me: User, id: string, status: unknown) =>
  tx(async () => {
    const r = need(await store.get<Referral>('referrals', idOf(id)), 'Referral');
    if (!REFERRAL_STATUS.includes(status as ReferralStatus)) bad('Unknown referral status.');
    if (r.status === status) return r;
    return store.put<Referral>('referrals', { ...r, status: status as ReferralStatus, history: [...r.history, { at: now(), by: me.name, text: `${r.status} → ${status}` }] });
  });

// ---------- sales entered by hand in the sales report ----------
export const addSalesEntry = (me: User, input: any) =>
  tx(async () => {
    const date = typeof input?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : bad('Pick the date of the sale.');
    const e: SalesEntry = {
      id: newId('sale'),
      date,
      vehicle: text(input?.vehicle, 'Vehicle', 160),
      client: text(input?.client, 'Client', 120),
      agent: text(input?.agent, 'Agent', 120, false) || undefined,
      amount: money(input?.amount, 'Amount'),
      notes: text(input?.notes, 'Notes', 500, false) || undefined,
      createdBy: me.name,
      createdAt: now(),
    };
    return store.put('sales_entries', e);
  });

export const deleteSalesEntry = (id: string) =>
  tx(async () => {
    need(await store.get<SalesEntry>('sales_entries', idOf(id)), 'Sale');
    await store.remove('sales_entries', idOf(id));
  });

// ---------- quotations ----------
// The quotation of one application: by its reference; older quotations without one, by the same client and car.
const quoteFilter = (app: VehicleApplication) => ({
  $or: [{ applicationRef: app.referenceNo }, { applicationRef: { $exists: false }, clientId: app.applicantId, vehicleId: app.vehicleId }],
});

// Admin: after reserving, prepare the client's quotation from their application. It is edited and sent from Quotations.
export const quoteApplication = (id: string) =>
  tx(async () => {
    const app = need(await store.get<VehicleApplication>('applications', idOf(id)), 'Application');
    if (app.status !== 'reserved') bad('A quotation is made after the vehicle is reserved and before processing.');
    if (await store.one('quotations', { ...quoteFilter(app), status: { $in: ['requested', 'sent', 'returned', 'confirmed'] } })) bad('This application already has a quotation.');
    const v = need(await store.get<Vehicle>('vehicles', app.vehicleId), 'Listing');
    const me = need(await users.byId(app.applicantId), 'Client');
    const method = app.purchaseMethod;
    const downPayment = method === 'financing' ? app.downPayment ?? 0 : 0;
    // Applications made when longer terms existed fall back to the longest term now offered (36).
    const termMonths = QUOTE_TERMS.includes(app.financingTermMonths ?? 0) ? app.financingTermMonths! : QUOTE_TERMS[QUOTE_TERMS.length - 1];
    const a = me.address;
    const q = await store.put<Quotation>('quotations', {
      id: newId('qt'),
      status: 'requested',
      requestedAt: now(),
      vehicleId: v.id,
      vehicleTitle: v.title,
      vehicleImage: v.images[0],
      clientId: me.id,
      clientName: app.applicantName,
      clientEmail: app.applicantEmail || me.email,
      clientPhone: app.applicantPhone || me.phone,
      clientAddress: [a?.street, a?.barangay, a?.city, a?.province].filter(Boolean).join(', ') + (a?.postalCode ? ` ${a.postalCode}` : ''),
      method,
      clientNote: `For ${app.referenceNo}`,
      applicationRef: app.referenceNo,
      unitType: `${v.year} ${v.brand} ${v.model}`,
      variant: '',
      engineNo: '',
      chassisNo: '',
      color: v.color,
      transmission: v.transmission,
      unitPrice: app.vehiclePrice,
      downPayment,
      termMonths,
      annualRate: DEFAULT_RATE,
      insurance: 0,
      registration: 0,
      chattelMortgage: 0,
      remarks: '',
    });
    return q;
  });

export const saveQuotation = (me: User, id: string, input: any, send: boolean) =>
  tx(async () => {
    const q = need(await store.get<Quotation>('quotations', idOf(id)), 'Quotation');
    const c = input || {};
    const method = c.method ?? q.method;
    if (method !== 'cash' && method !== 'financing') bad('Choose cash or financing.');
    const updated: Quotation = {
      ...q,
      clientName: text(c.clientName ?? q.clientName, 'Client name', 120),
      clientAddress: text(c.clientAddress ?? q.clientAddress, 'Address', 300, false),
      unitType: text(c.unitType ?? q.unitType, 'Unit type', 120),
      variant: text(c.variant ?? q.variant, 'Variant', 120, false),
      engineNo: text(c.engineNo ?? q.engineNo, 'Engine number', 60, false).toUpperCase(),
      chassisNo: text(c.chassisNo ?? q.chassisNo, 'Chassis number', 60, false).toUpperCase(),
      color: text(c.color ?? q.color, 'Color', 80, false),
      transmission: text(c.transmission ?? q.transmission, 'Transmission', 60, false),
      method,
      unitPrice: money(c.unitPrice ?? q.unitPrice, 'Unit price', { min: 1 }),
      downPayment: method === 'financing' ? money(c.downPayment ?? q.downPayment, 'Down payment', { min: 1 }) : 0,
      termMonths: Number(c.termMonths ?? q.termMonths),
      annualRate: money(c.annualRate ?? q.annualRate, 'Interest rate', { allowZero: true }),
      insurance: money(c.insurance ?? q.insurance, 'Insurance', { allowZero: true }),
      registration: money(c.registration ?? q.registration, 'Registration', { allowZero: true }),
      chattelMortgage: money(c.chattelMortgage ?? q.chattelMortgage, 'Chattel mortgage', { allowZero: true }),
      remarks: text(c.remarks ?? q.remarks, 'Remarks', 1000, false),
      validUntil: c.validUntil ?? q.validUntil,
    };
    if (method === 'financing' && updated.downPayment >= updated.unitPrice) bad('The down payment must be less than the unit price.');
    // Quotations written when longer terms existed move to the longest term now offered (36) when next saved.
    if (!QUOTE_TERMS.includes(updated.termMonths)) {
      if (updated.termMonths === q.termMonths) updated.termMonths = QUOTE_TERMS[QUOTE_TERMS.length - 1];
      else bad('Choose a term.');
    }
    if (updated.annualRate > 60) bad('Check the interest rate.');
    if (send) {
      updated.validUntil = updated.validUntil || daysFromToday(DEFAULT_VALID_DAYS);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(updated.validUntil) || updated.validUntil < daysFromToday(0)) bad('Set a "valid until" date from today onward.');
      updated.quoteNo = q.quoteNo ?? `QT-${year()}-${pad4(await nextNumber(`qt-${year()}`))}`;
      updated.status = q.status === 'accepted' ? 'accepted' : 'sent'; // a returned one goes back to the client to sign again
      if (q.status === 'returned' || q.status === 'confirmed') Object.assign(updated, { status: 'sent', conforme: undefined, clientReply: undefined, returnedAt: undefined, confirmedAt: undefined });
      updated.sentAt = now();
      updated.preparedBy = me.name;
      await notify(
        'client',
        q.quoteNo ? 'Quotation updated' : 'Quotation ready',
        `Quotation ${updated.quoteNo} for the ${q.vehicleTitle} is ready. It is valid until ${new Date(`${updated.validUntil}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
        'quotations',
        q.clientId
      );
    }
    return store.put('quotations', updated);
  });

// Client: sign the quotation (type your full name as conforme) and send it back. Then the information sheet opens.
export const returnQuotation = (me: User, id: string, input: any) =>
  tx(async () => {
    const q = need(await store.get<Quotation>('quotations', idOf(id)), 'Quotation');
    if (q.clientId !== me.id) forbidden();
    if (q.status !== 'sent') bad(q.status === 'returned' || q.status === 'confirmed' ? 'You already sent this quotation back.' : 'This quotation cannot be signed now.');
    if (isExpired(q)) bad('This quotation has expired. Ask your agent for an updated one.');
    const saved = await store.put<Quotation>('quotations', {
      ...q,
      status: 'returned',
      conforme: text(input?.conforme, 'Conforme (your full name)', 120),
      clientReply: text(input?.note, 'Note', 1000, false) || undefined,
      returnedAt: now(),
    });
    await notify('admin', 'Quotation returned', `${me.name} signed and sent back ${q.quoteNo} for the ${q.vehicleTitle}${saved.clientReply ? ` with a note: ${saved.clientReply}` : ''}. Review it: confirm it as final, or edit and resend it.`, 'applications');
    await notify('client', 'Quotation sent back', `Thank you. The admin team is reviewing ${q.quoteNo}; we will tell you when it is confirmed.`, 'quotations', me.id);
    return { quotation: saved, email: undefined };
  });

// Admin: accept the client's signed quotation as final. Then the client fills in the information sheet.
export const confirmQuotation = (id: string) =>
  tx(async () => {
    const q = need(await store.get<Quotation>('quotations', idOf(id)), 'Quotation');
    if (q.status !== 'returned') bad('Only a quotation the client signed and sent back can be confirmed.');
    const saved = await store.put<Quotation>('quotations', { ...q, status: 'confirmed', confirmedAt: now() });
    const app = await store.one<VehicleApplication>('applications', q.applicationRef ? { referenceNo: q.applicationRef, status: 'reserved' } : { applicantId: q.clientId, vehicleId: q.vehicleId, status: 'reserved' });
    const client = await users.byId(q.clientId);
    await notify('client', 'Quotation confirmed', `${q.quoteNo} is final.${app ? ` Next: fill in the Applicant's Information Sheet for ${app.referenceNo}.` : ''}`, 'applications', q.clientId);
    return { quotation: saved, email: app && client ? { to: client.email, name: client.name, appId: app.id, referenceNo: app.referenceNo, vehicle: app.vehicleTitle } : undefined };
  });

// ---------- commissions: payable (from the release) -> paid (with proof) ----------

export const payCommission = (me: User, id: string, fileId: unknown) =>
  tx(async () => {
    const c = need(await store.get<Commission>('commissions', idOf(id)), 'Commission');
    if (c.status !== 'payable') bad('Only a payable commission can be paid.');
    const agent = (await users.agents()).find((a) => a.name === c.agentName) ?? (await users.all()).find((u) => u.name === c.agentName);
    const proof = await attachUpload(fileId, me, agent?.id ?? me.id, IMG_OR_PDF);
    const receiptNo = `BB-OR-${year()}-${pad4(await nextNumber(`or-${year()}`))}`;
    await store.put<Commission>('commissions', {
      ...c,
      status: 'paid',
      proofFileName: proof.name,
      proofImage: IMG.test(proof.mime) ? fileUrl(proof._id) : undefined,
      receiptNo,
      paidAt: now(),
    });
    await notify('agent', 'Cash transferred', `₱${c.amount.toLocaleString()} for the ${c.vehicleTitle} was sent. Your receipt ${receiptNo} is ready.`, 'commissions', c.agentName);
  });

// ---------- chat ----------
// A chat that is not about one listing (vehicleId '').
export const GENERAL_TOPIC = 'General inquiry';

// A client opens a chat with their agent (or the sales team, before they have one): about a listing, or a general
// question when vehicleId is empty. With a message it is sent as the first message (or added to the existing chat).
const NEEDS_AGENT = 'You can chat once an agent takes you on. Press "Request to apply" on a vehicle; the agent who claims you starts the chat.';
export const startConversation = (me: User, vehicleId: unknown, ref: unknown, message?: unknown) =>
  tx(async () => {
    if (!(await ownerOf(me.id))) bad(NEEDS_AGENT);
    const v = vehicleId ? need(await store.get<Vehicle>('vehicles', idOf(vehicleId)), 'Listing') : undefined;
    const first = text(message, 'Message', 2000, false);
    const existing = await store.one<Conversation>('conversations', { buyerId: me.id, vehicleId: v?.id ?? '', closedAt: { $exists: false } });
    if (existing) {
      if (first) await sendMessage(me, existing.id, { text: first });
      return (await store.get<Conversation>('conversations', existing.id))!;
    }
    if (!v && !first) bad('Write your message.');
    const owner = await touchLead(me, v?.title ?? GENERAL_TOPIC, true, ref);
    const at = now();
    const t = first || `Hi${owner ? ` ${owner}` : ''}, I am interested in the ${v!.title}. Is it still available for a viewing?`;
    return store.put<Conversation>('conversations', {
      id: newId('conv'),
      vehicleId: v?.id ?? '',
      vehicleTitle: v?.title ?? GENERAL_TOPIC,
      vehiclePrice: v?.price ?? 0,
      vehicleImage: v?.images[0] ?? '',
      buyerId: me.id,
      buyerName: me.name,
      sellerId: owner ? agentSlug(owner) : 'team',
      sellerName: owner ?? TEAM_NAME,
      lastMessage: t,
      updatedAt: at,
      unreadBuyer: 0,
      unreadSeller: 1,
      messages: [{ id: newId('msg'), senderId: me.id, senderName: me.name, text: t, timestamp: at, isSeller: false }],
    });
  });

// When an agent takes a client, the agent's introduction starts (or continues) their chat: in the client's latest
// chat, or a new one about the vehicle they applied for or asked a quotation on (else a general chat).
// The introduction does not count as a reply for the 24-hour rule: the client's own questions still need an answer.
const introduceAgent = async (clientId: string, agent: string): Promise<string | undefined> => {
  const client = await users.byId(clientId);
  if (!client) return undefined;
  const wanted = (await store.get<ClientLead>('leads', clientId))?.applyVehicleId;
  let conv = wanted
    ? await store.one<Conversation>('conversations', { buyerId: clientId, vehicleId: wanted, closedAt: { $exists: false } })
    : (await store.all<Conversation>('conversations', { buyerId: clientId, closedAt: { $exists: false } }, { updatedAt: -1 }))[0];
  if (!conv) {
    const app = (await store.all<VehicleApplication>('applications', { applicantId: clientId }, { submittedAt: -1 }))[0];
    const quote = (await store.all<Quotation>('quotations', { clientId }, { requestedAt: -1 }))[0];
    const vid = wanted ?? app?.vehicleId ?? quote?.vehicleId;
    const v = vid ? await store.get<Vehicle>('vehicles', vid) : undefined;
    conv = {
      id: newId('conv'), vehicleId: v?.id ?? '', vehicleTitle: v?.title ?? GENERAL_TOPIC, vehiclePrice: v?.price ?? 0, vehicleImage: v?.images[0] ?? '',
      buyerId: clientId, buyerName: client.name, sellerId: agentSlug(agent), sellerName: agent, lastMessage: '', updatedAt: now(), unreadBuyer: 0, unreadSeller: 0, messages: [],
    };
  }
  const at = now();
  const t = `Hi ${client.name.split(' ')[0]}! I'm ${agent}, your Broom Broom agent${conv.vehicleId ? ` for the ${conv.vehicleTitle}` : ''}. I can help you with viewings, quotations and your application. How can I help?`;
  const agentId = (await users.agents()).find((a) => a.name === agent)?.id ?? agentSlug(agent);
  await store.put<Conversation>('conversations', {
    ...conv,
    sellerId: agentSlug(agent),
    sellerName: agent,
    lastMessage: t,
    updatedAt: at,
    unreadBuyer: conv.unreadBuyer + 1,
    messages: [...conv.messages, { id: newId('msg'), senderId: agentId, senderName: agent, text: t, timestamp: at, isSeller: true }],
  });
  await notify('client', 'Your agent', `${agent} is now your Broom Broom agent and sent you a message.`, 'messages', clientId);
  return conv.id;
};

// The agent opens a chat with one of their clients: their latest chat together, or a new one started with the agent's
// introduction (e.g. a client the admin assigned who never wrote). The agent does not wait for the client to write.
export const agentConversation = (me: User, clientId: string) =>
  tx(async () => {
    const lead = need(await store.get<ClientLead>('leads', idOf(clientId)), 'Client');
    if (lead.agentName !== me.name) forbidden('This client is not yours. Claim them in Open leads first.');
    const existing = (await store.all<Conversation>('conversations', { buyerId: lead.clientId, sellerName: me.name }, { updatedAt: -1 }))[0];
    return { conversationId: existing?.id ?? (await introduceAgent(lead.clientId, me.name)) };
  });

// input: { text } or, from the client's agent, { applyVehicleId, text? } for an apply link.
export const sendMessage = (me: User, convId: string, input: any) =>
  tx(async () => {
    const conv = need(await store.get<Conversation>('conversations', idOf(convId)), 'Conversation');
    const isAgent = me.role === 'seller';
    if (me.role === 'buyer' && conv.buyerId !== me.id) forbidden();
    if (conv.closedAt) bad('This chat ended when your vehicle was released. Press "Request to apply" on a vehicle to get an agent again.');
    if (me.role === 'buyer' && conv.sellerName === TEAM_NAME && !conv.takenOverAt) bad(NEEDS_AGENT);
    if (isAgent && conv.sellerName !== me.name) forbidden('This client is not yours. Claim them in Open leads first.');
    if (me.role === 'admin' && !conv.takenOverAt) forbidden('Admins can read conversations but not reply in them. Take over the chat first.');
    let link: Pick<ChatMessage, 'applyVehicleId' | 'applyVehicleTitle' | 'applyAgent'> = {};
    if (input?.applyVehicleId) {
      if (!isAgent) forbidden('Only the agent can send an apply link.');
      const v = need(await store.get<Vehicle>('vehicles', idOf(input.applyVehicleId)), 'Listing');
      if (v.status !== 'available') bad('That vehicle is not available to apply for.');
      link = { applyVehicleId: v.id, applyVehicleTitle: v.title, applyAgent: agentSlug(me.name) };
    }
    const t = link.applyVehicleId
      ? text(input.text, 'Message', 2000, false) || `Here is the link to apply for the ${link.applyVehicleTitle}. Fill it in and I will take care of the rest.`
      : text(input?.text, 'Message', 2000);
    const at = now();
    const isAdmin = me.role === 'admin';
    const reply = isAgent || isAdmin;
    const msg: ChatMessage = { id: newId('msg'), senderId: me.id, senderName: isAdmin ? 'Broom Broom' : me.name, text: t, timestamp: at, isSeller: reply, ...link, ...(isAdmin ? { byAdmin: true } : {}) };
    await store.put('conversations', {
      ...conv,
      lastMessage: t,
      updatedAt: at,
      unreadBuyer: reply ? conv.unreadBuyer + 1 : 0,
      unreadSeller: isAgent ? 0 : conv.unreadSeller + 1,
      messages: [...conv.messages, msg],
    });
    // Track who is waiting on whom for the 24-hour reply rule.
    const lead = await store.get<ClientLead>('leads', conv.buyerId);
    if (lead) await store.put('leads', reply ? (isAdmin || lead.agentName === me.name ? { ...lead, lastAgentAt: at } : lead) : { ...lead, lastClientAt: at });
    if (reply) await notify('client', 'New message', `${msg.senderName} replied about the ${conv.vehicleTitle}.`, 'messages', conv.buyerId);
  });

// Client: "Request to apply". No chat yet: the client waits in Open leads (or their agent is told) with the vehicle noted.
// The agent who claims them starts the chat about it and sends the apply link there.
export const requestToApply = (me: User, input: any) =>
  tx(async () => {
    rateLimit(`applyreq|${me.id}`, 10, 60 * 60e3, 'Too many requests. Please try again later.');
    const v = need(await store.get<Vehicle>('vehicles', idOf(input?.vehicleId)), 'Listing');
    if (v.status !== 'available') bad('This vehicle is no longer available.');
    let before = await store.get<ClientLead>('leads', me.id);
    // Still with the agent of a purchase that was already released (nothing else in progress, e.g. released before the
    // release freed clients): end that link first, so this request goes to Open leads like any other.
    const last = (await store.all<VehicleApplication>('applications', { applicantId: me.id, status: 'completed' }, { releasedAt: -1 }))[0];
    if (before?.agentName && last?.releasedAt && (before.claimedAt ?? before.createdAt) <= last.releasedAt) {
      // Only an application sent after that release keeps the agent.
      if (!(await store.one('applications', { applicantId: me.id, status: { $in: [...OPEN, ...HOLDING] }, submittedAt: { $gt: last.releasedAt } }))) {
        await endAgentLink(me.id, before.agentName, last.referenceNo);
        before = await store.get<ClientLead>('leads', me.id);
      }
    }
    if (await store.one('apply_requests', { clientId: me.id, vehicleId: v.id, doneAt: { $exists: false } })) bad('You already asked to apply for this vehicle. An agent will message you.');
    if (before?.doneAt) await store.put<ClientLead>('leads', { ...before, doneAt: undefined, pooledAt: now(), escalatedAt: undefined });
    const isNew = !before;
    await touchLead(me, v.title, false, input?.ref);
    const lead = (await store.get<ClientLead>('leads', me.id))!;
    const at = now();
    await store.put<ClientLead>('leads', { ...lead, interest: v.title, lastClientAt: at, history: [...lead.history, { at, text: `Asked to apply for the ${v.title}` }] });
    await store.put<ApplyRequest>('apply_requests', { id: newId('ar'), clientId: me.id, clientName: me.name, vehicleId: v.id, vehicleTitle: v.title, createdAt: at });
    if (!isNew) await notify('agent', 'New lead', `${me.name} wants to apply for the ${v.title}. Claim them in Open leads.`, 'leads');
    return { agent: null };
  });

// Agent: claim a request to apply. First come, first served: the winner opens the chat about that vehicle (with
// their introduction) and sends the apply link there. The client keeps any other agents for other vehicles.
export const claimRequest = (me: User, id: string) =>
  tx(async () => {
    const r = need(await store.get<ApplyRequest>('apply_requests', idOf(id)), 'Request');
    if (r.doneAt) bad('This request is closed.');
    if (r.claimedBy) throw new HttpError(409, `${r.clientName}'s request for the ${r.vehicleTitle} was already claimed${r.claimedBy === me.name ? ' by you' : ` by ${r.claimedBy}`}.`);
    const v = await store.get<Vehicle>('vehicles', r.vehicleId);
    const client = need(await users.byId(r.clientId), 'Client');
    const at = now();
    const lead = await store.get<ClientLead>('leads', r.clientId);
    // A client with no agent yet gets this one as their main agent, locked while they apply.
    if (lead && !lead.agentName)
      await store.put<ClientLead>('leads', {
        ...lead, agentName: me.name, source: 'pool', claimedAt: at, escalatedAt: undefined, doneAt: undefined,
        lockedTo: me.name, lockedRef: `request:${r.vehicleId}`, lockedAt: at,
        history: [...lead.history, { at, text: `Claimed by ${me.name} for the ${r.vehicleTitle}` }],
      });
    else if (lead) await store.put<ClientLead>('leads', { ...lead, history: [...lead.history, { at, text: `${me.name} claimed the request for the ${r.vehicleTitle}` }] });
    // The chat about this vehicle, now with this agent.
    let conv = await store.one<Conversation>('conversations', { buyerId: r.clientId, vehicleId: r.vehicleId, closedAt: { $exists: false }, sellerName: { $in: [TEAM_NAME, me.name] } });
    if (!conv)
      conv = {
        id: newId('conv'), vehicleId: r.vehicleId, vehicleTitle: r.vehicleTitle, vehiclePrice: v?.price ?? 0, vehicleImage: v?.images[0] ?? '',
        buyerId: r.clientId, buyerName: client.name, sellerId: agentSlug(me.name), sellerName: me.name, lastMessage: '', updatedAt: at, unreadBuyer: 0, unreadSeller: 0, messages: [],
      };
    const t = `Hi ${client.name.split(' ')[0]}! I'm ${me.name}, your Broom Broom agent for the ${r.vehicleTitle}. I can help you with viewings, quotations and your application. How can I help?`;
    await store.put<Conversation>('conversations', {
      ...conv, sellerId: agentSlug(me.name), sellerName: me.name, lastMessage: t, updatedAt: at, unreadBuyer: conv.unreadBuyer + 1,
      messages: [...conv.messages, { id: newId('msg'), senderId: me.id, senderName: me.name, text: t, timestamp: at, isSeller: true }],
    });
    if (v?.status === 'available') await sendMessage(me, conv.id, { applyVehicleId: v.id });
    await store.put<ApplyRequest>('apply_requests', { ...r, claimedBy: me.name, claimedAt: at, conversationId: conv.id });
    await notify('client', 'Your agent', `${me.name} is your Broom Broom agent for the ${r.vehicleTitle} and sent you the application link.`, 'messages', r.clientId);
    await notify('admin', 'Lead claimed', `${me.name} claimed ${r.clientName}'s request for the ${r.vehicleTitle}.`, 'leads');
    return { clientName: r.clientName, conversationId: conv.id };
  });

// Admin: answer a client who has waited 2 days in a chat. Reading chats stays silent; a takeover is told to the agent.
export const takeOverConversation = (convId: string) =>
  tx(async () => {
    const conv = need(await store.get<Conversation>('conversations', idOf(convId)), 'Conversation');
    if (conv.takenOverAt) return conv;
    if (!canTakeOver(conv, Date.now())) bad('You can take over once the client has waited 2 days for a reply.');
    const saved = await store.put<Conversation>('conversations', { ...conv, takenOverAt: now() });
    if (conv.sellerName !== TEAM_NAME) await notify('agent', 'Chat taken over', `The admin is now answering ${conv.buyerName} about the ${conv.vehicleTitle} (no reply for 2 days).`, 'messages', conv.sellerName);
    return saved;
  });

export const endTakeover = (convId: string) =>
  tx(async () => {
    const conv = need(await store.get<Conversation>('conversations', idOf(convId)), 'Conversation');
    return store.put<Conversation>('conversations', { ...conv, takenOverAt: undefined });
  });

export const markConversationRead = (me: User, convId: string) =>
  tx(async () => {
    const conv = need(await store.get<Conversation>('conversations', idOf(convId)), 'Conversation');
    if (me.role === 'buyer' && conv.buyerId === me.id) await store.put('conversations', { ...conv, unreadBuyer: 0 });
    if (me.role === 'seller' && conv.sellerName === me.name) await store.put('conversations', { ...conv, unreadSeller: 0 });
  });

// ---------- notifications ----------
// Which notifications belong to this user. (A missing recipient matches null: shared notices to all agents.)
export const notificationScope = (me: User) =>
  me.role === 'buyer'
    ? { audience: 'client', recipient: me.id }
    : me.role === 'seller'
    ? { audience: 'agent', recipient: { $in: [null, me.name] } }
    : { audience: 'admin' };

export const markNotificationRead = (me: User, id: string) =>
  tx(async () => {
    const n = await store.one<AppNotification>('notifications', { ...notificationScope(me), id: idOf(id) });
    if (n) await store.put('notifications', { ...n, read: true });
  });

// Shared notices (to all agents) stay, so clearing them does not remove them for every other agent.
export const clearNotifications = (me: User) =>
  me.role === 'seller' ? store.removeWhere('notifications', { audience: 'agent', recipient: me.name }) : store.removeWhere('notifications', notificationScope(me));

// ---------- money accounts (cash, bank, credit lines) ----------
// Create: { kind, name, method?, amount }. Edit: { name, method?, amount } (the kind stays).
export const saveLedgerAccount = (id: string | null, input: any) =>
  tx(async () => {
    const old = id ? need(await store.get<LedgerAccount>('ledger_accounts', idOf(id)), 'Account') : undefined;
    const kind = old?.kind ?? input?.kind;
    if (kind !== 'payment' && kind !== 'credit') bad('Choose cash/bank or credit.');
    const name = text(input?.name, 'Account name', 80);
    const others = await store.all<LedgerAccount>('ledger_accounts', {});
    if (others.some((a) => a.id !== old?.id && a.name.toLowerCase() === name.toLowerCase())) bad('An account with that name already exists.');
    return store.put<LedgerAccount>('ledger_accounts', {
      id: old?.id ?? newId('acct'),
      kind,
      name,
      method: kind === 'payment' ? (input?.method === 'cash' ? 'cash' : 'bank') : undefined,
      amount: money(input?.amount, kind === 'credit' ? 'Credit limit' : 'Opening balance', { allowZero: true }),
      createdAt: old?.createdAt ?? now(),
    });
  });

export const deleteLedgerAccount = (id: string) =>
  tx(async () => {
    need(await store.get<LedgerAccount>('ledger_accounts', idOf(id)), 'Account');
    if (await raw('vouchers').countDocuments({ accountId: idOf(id) }, opts())) bad('Vouchers were recorded on this account, so it cannot be deleted. Rename it instead.');
    await store.remove('ledger_accounts', idOf(id));
  });

// ---------- accounting vouchers ----------
export const addVoucher = (me: User, input: any) =>
  tx(async () => {
    const kind = input?.kind;
    if (kind !== 'expense' && kind !== 'credit') bad('Unknown voucher type.');
    const account = await store.get<LedgerAccount>('ledger_accounts', idOf(input.accountId));
    if (!account || account.kind !== (kind === 'credit' ? 'credit' : 'payment')) bad('Choose an account.');
    if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 50) bad('Add at least one line.');
    const lines: ExpenseLine[] = [];
    for (const [i, l] of (input.lines as any[]).entries()) {
      const att = l.fileId ? await attachUpload(l.fileId, me, me.id, IMG_OR_PDF) : undefined;
      lines.push({
        category: text(l.category, `Line ${i + 1} category`, 80),
        description: text(l.description, `Line ${i + 1} description`, 300),
        amount: money(l.amount, `Line ${i + 1} amount`, { min: 0 }),
        party: text(l.party, `Line ${i + 1} ${kind === 'credit' ? 'creditor' : 'vendor'}`, 120, false),
        attachment: att?.name,
        attachmentUrl: att ? fileUrl(att._id) : undefined,
      });
    }
    const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    const all = await store.all<Expense>('vouchers', { kind });
    const room = kind === 'credit' ? creditAvailable(account!, all) : accountBalance(account!, all);
    if (total > room) bad(`The total ${peso(total)} is more than the ${kind === 'credit' ? 'available credit' : 'account balance'} of ${peso(room)}.`);
    const paymentDate = text(input.paymentDate, 'Payment date', 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) bad('Enter a valid payment date.');
    const prefix = kind === 'credit' ? 'CV' : 'PV';
    return store.put<Expense>('vouchers', {
      id: newId(kind === 'credit' ? 'cr' : 'exp'),
      kind,
      voucherNo: `${prefix}-${year()}-${pad4(await nextNumber(`${prefix.toLowerCase()}-${year()}`))}`,
      payee: text(input.payee, 'Payee', 120),
      accountId: account!.id,
      paymentDate,
      method: input.method === 'cash' ? 'cash' : 'bank',
      refNo: text(input.refNo, 'Ref. no.', 60, false),
      lines,
      remarks: text(input.remarks, 'Remarks', 1000, false),
      total,
      createdAt: now(),
    });
  });

// ---------- accounts ----------
export const updateProfile = async (me: User, input: any) => {
  const a = input?.address;
  const ids = (v: unknown, field: string) => {
    if (v === undefined) return undefined;
    if (!Array.isArray(v) || v.length > 200 || !v.every((x) => typeof x === 'string' && x.length < 80)) bad(`Check ${field}.`);
    return v as string[];
  };
  const updated: User = {
    ...me,
    name: input?.name !== undefined ? text(input.name, 'Name', 120) : me.name,
    phone: input?.phone !== undefined ? text(input.phone, 'Phone', 40, false) : me.phone,
    address: a
      ? {
          street: text(a.street, 'Street', 200, false),
          barangay: text(a.barangay, 'Barangay', 120, false),
          city: text(a.city, 'City', 120, false),
          province: text(a.province, 'Province', 120, false),
          region: text(a.region, 'Region', 60, false),
          postalCode: text(a.postalCode, 'Postal code', 12, false),
          country: 'Philippines',
        }
      : me.address,
    savedVehicleIds: ids(input?.savedVehicleIds, 'saved vehicles') ?? me.savedVehicleIds,
    recentlyViewedIds: (ids(input?.recentlyViewedIds, 'recently viewed') ?? me.recentlyViewedIds ?? []).slice(0, 10),
  };
  await users.saveProfile(updated);
  return (await users.byId(me.id))!;
};

export const changePassword = async (me: User, current: unknown, next: unknown) => {
  // An account made with Google sets its first password without one (it is already signed in through Google).
  if (me.hasPassword !== false && (typeof current !== 'string' || !(await users.checkPassword(me.id, current)))) bad('Your current password is not correct.');
  if (!validPassword(next)) bad(PASSWORD_RULE);
  if (next === current) bad(me.mustChangePassword ? 'Choose your own password, not the temporary one.' : 'Choose a password different from the current one.');
  await users.setPassword(me.id, next as string);
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign in (or sign up) a client with a verified Google profile. The same email as an existing client account signs
// in to that account; agent and admin accounts keep signing in with their password on their own portal.
// The account a Google profile belongs to: the one linked to that Google account, else the one with its email
// (unless that one is already linked to a different Google account).
const accountForGoogle = async (g: GoogleProfile) => {
  const bySub = await users.byGoogleId(g.sub);
  if (bySub) return bySub;
  const byMail = await users.byEmail(g.email);
  if (byMail?.googleLinked) bad('This email is linked to a different Google account.');
  return byMail;
};
// Link the Google account; a temporary password (which the admin knows) stops working once Google is used.
const signedInWithGoogle = async (u: User, sub: string) => {
  if (!u.active) forbidden('This account is disabled. Contact the admin team.');
  if (!u.googleLinked) await users.linkGoogle(u.id, sub);
  if (u.mustChangePassword) await users.retireTemporaryPassword(u.id);
  return (await users.byId(u.id))!;
};

// Agents and admins: only accounts the admin already made, for that portal. Google never creates a staff account.
export const googleStaffSignIn = async (g: GoogleProfile, portal: 'seller' | 'admin') => {
  const u = await accountForGoogle(g);
  if (!u || u.role !== portal)
    forbidden(`No ${portal === 'seller' ? 'agent' : 'admin'} account uses ${g.email}. Ask the admin to add this email, or sign in with your password.`);
  return signedInWithGoogle(u!, g.sub);
};

export const googleSignIn = async (g: GoogleProfile): Promise<{ user: User; created: boolean }> => {
  const existing = await accountForGoogle(g);
  if (existing) {
    if (existing.role !== 'buyer') bad('This email belongs to a staff account. Sign in on your portal instead.');
    return { user: await signedInWithGoogle(existing, g.sub), created: false };
  }
  try {
    const user = await users.createWithGoogle(
      {
        id: newId('usr'),
        email: g.email,
        role: 'buyer',
        name: g.name,
        phone: '',
        address: { street: '', barangay: '', city: '', province: '', region: '', postalCode: '', country: 'Philippines' },
        savedVehicleIds: [],
        recentlyViewedIds: [],
        memberSince: new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
      },
      g.sub
    );
    return { user, created: true };
  } catch (e: any) {
    if (e?.code === 11000) return googleSignIn(g); // the same person signing in twice at once
    throw e;
  }
};

export const createAccount = async (input: any) => {
  const role = input?.role;
  if (role !== 'seller' && role !== 'admin') bad('Accounts made here are for agents or admins.');
  const email = text(input.email, 'Email', 200).toLowerCase();
  if (!EMAIL.test(email)) bad('Enter a valid email.');
  if (await users.byEmail(email)) bad('That email already has an account.');
  const name = text(input.name, 'Name', 120);
  if (role === 'seller' && (await users.all()).some((u) => u.role === 'seller' && u.name.toLowerCase() === name.toLowerCase())) bad('An agent with that name already exists.');
  if (!validPassword(input.password)) bad(PASSWORD_RULE);
  return users.create({
    id: newId(role === 'seller' ? 'agent' : 'admin'),
    email,
    role,
    name,
    password: input.password,
    temporary: true, // they set their own on first sign-in (or sign in with Google)
    phone: text(input.phone, 'Phone', 40, false),
    address: { street: '', barangay: '', city: '', province: '', region: '', postalCode: '', country: 'Philippines' },
    savedVehicleIds: [],
    recentlyViewedIds: [],
    memberSince: new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
  });
};

// Admin: delete an agent's account, after reviewing their report in Accounts. Their clients go back to Open
// leads (open chats and applications move to the sales team, like any reassignment to nobody), claimed apply
// requests reopen, pending listing requests are rejected, and they are signed out everywhere. Completed sales
// and commissions stay on record under their name: the money is still owed and the books must still balance.
export const deleteAgentAccount = (id: string) =>
  tx(async () => {
    const target = need(await users.byId(idOf(id)), 'Account');
    if (target.role !== 'seller') bad('Only agent accounts can be deleted here. Disable other accounts instead.');
    const name = target.name;
    const at = now();
    const leads = await store.all<ClientLead>('leads', { $or: [{ agentName: name }, { lockedTo: name }] });
    for (const lead of leads) {
      if (lead.doneAt) {
        await store.put<ClientLead>('leads', { ...lead, agentName: undefined, lockedTo: undefined, lockedRef: undefined, lockedAt: undefined });
        continue;
      }
      await store.put<ClientLead>('leads', {
        ...lead,
        agentName: undefined,
        lockedTo: undefined,
        lockedRef: undefined,
        lockedAt: undefined,
        claimedAt: undefined,
        source: 'pool',
        pooledAt: at,
        escalatedAt: undefined,
        history: [...lead.history, { at, text: `${name}'s account was deleted; returned to Open leads` }],
      });
      await moveClient(lead.clientId, undefined);
    }
    // Anything still naming them without a lead row (older records) goes to the sales team too.
    for (const c of await store.all<Conversation>('conversations', { sellerName: name, closedAt: { $exists: false } }))
      await store.put('conversations', { ...c, sellerName: TEAM_NAME, sellerId: 'team' });
    for (const a of await store.all<VehicleApplication>('applications', { sellerName: name, status: { $nin: ['completed', 'declined', 'withdrawn'] } }))
      await store.put('applications', { ...a, sellerName: TEAM_NAME });
    for (const r of await store.all<ApplyRequest>('apply_requests', { claimedBy: name, doneAt: { $exists: false } }))
      await store.put<ApplyRequest>('apply_requests', { ...r, claimedBy: undefined, claimedAt: undefined, conversationId: undefined });
    for (const r of await store.all<ListingRequest>('listing_requests', { agentName: name, status: 'pending' }))
      await store.put<ListingRequest>('listing_requests', { ...r, status: 'rejected', reason: 'Agent account deleted', decidedAt: at });
    await store.removeWhere('notifications', { audience: 'agent', recipient: name });
    await users.remove(target.id);
    const clientsReturned = leads.filter((l) => !l.doneAt).length;
    await notify('admin', 'Agent account deleted', `${name} (${target.email}) was deleted. ${clientsReturned} client${clientsReturned === 1 ? '' : 's'} returned to Open leads; sales and commission records were kept under their name.`, 'accounts');
    return { name, clientsReturned };
  });

export const registerClient = async (input: any) => {
  const email = text(input?.email, 'Email', 200).toLowerCase();
  if (!EMAIL.test(email)) bad('Enter a valid email.');
  if (await users.byEmail(email)) bad('That email already has an account. Sign in instead.');
  if (!validPassword(input.password)) bad(PASSWORD_RULE);
  try {
    return await users.create({
      id: newId('usr'),
      email,
      role: 'buyer',
      name: text(input.name, 'Full name', 120),
      password: input.password,
      phone: text(input.phone, 'Phone', 40),
      address: { street: '', barangay: '', city: '', province: '', region: '', postalCode: '', country: 'Philippines' },
      savedVehicleIds: [],
      recentlyViewedIds: [],
      memberSince: new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
    });
  } catch (e: any) {
    if (e?.code === 11000) bad('That email already has an account. Sign in instead.'); // two sign-ups at once
    throw e;
  }
};
