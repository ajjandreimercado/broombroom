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
} from '../src/types.ts';
import { TEAM_NAME, COMMISSION_RATE, PAYMENT_ACCOUNTS, CREDIT_ACCOUNTS, generateVehicleSvg } from '../src/data/mockData.ts';
import { agentSlug, shouldAlertUnclaimed, shouldRelease } from '../src/components/leads.ts';
import { DEFAULT_RATE, DEFAULT_VALID_DAYS, QUOTE_TERMS, daysFromToday, isExpired } from '../src/components/quote.ts';
import { DOCS, MIN_UPLOADS } from '../src/components/requirements.ts';
import { accountBalance, creditAvailable } from '../src/components/accounting/ledger.ts';
import { store, tx, nextNumber, db } from './db.ts';
import { users, HttpError, validPassword, type User } from './auth.ts';

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
type UploadRow = { id: string; owner_id: string; uploaded_by: string; visibility: string; mime: string; name: string; size: number; attached: number };
const fileUrl = (id: string) => `/files/${id}`;
// Ties an uploaded file to a record. Only the person who uploaded it can attach it, once; ownership then moves to
// whoever may view it (the client for their documents, the agent for a payout proof).
const attachUpload = (fileId: unknown, me: User, ownerId: string, accept: RegExp): UploadRow => {
  if (typeof fileId !== 'string') bad('File missing.');
  const row = db.prepare('SELECT * FROM uploads WHERE id = ?').get(fileId as string) as UploadRow | undefined;
  if (!row || row.uploaded_by !== me.id) bad('That upload was not found. Upload the file again.');
  if (row!.attached) bad('That file is already attached to something else. Upload it again.');
  if (!accept.test(row!.mime)) bad(`${row!.name} is not an accepted file type.`);
  db.prepare('UPDATE uploads SET attached = 1, owner_id = ? WHERE id = ?').run(ownerId, row!.id);
  return row!;
};
const IMG_OR_PDF = /^(image\/(png|jpeg|webp|gif|heic|heif)|application\/pdf)$/;
const IMG = /^image\/(png|jpeg|webp|gif|heic|heif)$/;

// ---------- leads (who each client belongs to) ----------
const agentBySlug = (slug: unknown) =>
  typeof slug === 'string' && slug ? users.agents().find((a) => agentSlug(a.name) === slug.toLowerCase())?.name : undefined;
export const ownerOf = (clientId: string) => store.get<ClientLead>('leads', clientId)?.agentName;

// A client's chats, open applications and not-yet-earned commissions follow their owner (or go back to the team).
const moveClient = (clientId: string, owner: string | undefined) => {
  const name = owner ?? TEAM_NAME;
  for (const c of store.all<Conversation>('conversations', 'buyer_id = ?', clientId))
    store.put('conversations', { ...c, sellerName: name, sellerId: owner ? agentSlug(owner) : 'team' });
  const apps = store.all<VehicleApplication>('applications', 'applicant_id = ?', clientId);
  for (const a of apps)
    if (!['completed', 'declined', 'withdrawn'].includes(a.status)) store.put('applications', { ...a, sellerName: name });
  if (owner) {
    const refs = new Set(apps.filter((a) => a.status !== 'completed').map((a) => a.referenceNo));
    for (const c of store.all<Commission>('commissions'))
      if (refs.has(c.applicationRef) && !c.transactionCompleted) store.put('commissions', { ...c, agentName: owner });
  }
};

// The client did something (first message, application, quotation request). New clients go to the agent whose link
// they came through, otherwise into Open leads. Only a chat message starts the 24-hour reply clock.
const touchLead = (client: User, interest: string, isMessage: boolean, refSlug: unknown): string | undefined => {
  const existing = store.get<ClientLead>('leads', client.id);
  if (existing) {
    if (isMessage) store.put('leads', { ...existing, lastClientAt: now() });
    return existing.agentName;
  }
  const agent = agentBySlug(refSlug);
  const at = now();
  store.put<ClientLead>('leads', {
    id: client.id,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    agentName: agent,
    source: agent ? 'link' : 'pool',
    createdAt: at,
    pooledAt: agent ? undefined : at,
    claimedAt: agent ? at : undefined,
    interest,
    lastClientAt: isMessage ? at : undefined,
    history: [{ at, text: agent ? `Came through ${agent}'s link` : 'Entered Open leads' }],
  });
  if (agent) notify('agent', 'New client from your link', `${client.name} contacted you about the ${interest}.`, 'leads', agent);
  else notify('agent', 'New lead', `${client.name} is asking about the ${interest}. Claim them in Open leads.`, 'leads');
  return agent;
};

export const claimLead = (me: User, clientId: string) =>
  tx(() => {
    const lead = need(store.get<ClientLead>('leads', clientId), 'Lead');
    if (lead.agentName) throw new HttpError(409, `${lead.clientName} is already ${lead.agentName === me.name ? 'your' : `${lead.agentName}'s`} client.`);
    const at = now();
    store.put('leads', { ...lead, agentName: me.name, source: 'pool', claimedAt: at, escalatedAt: undefined, history: [...lead.history, { at, text: `Claimed by ${me.name}` }] });
    moveClient(clientId, me.name);
    notify('admin', 'Lead claimed', `${me.name} claimed ${lead.clientName} (${lead.interest}).`, 'leads');
    return lead.clientName;
  });

// Admin: give a client to an agent, or put them back in Open leads (null). Also used by the 24-hour rule.
export const assignLead = (clientId: string, agentName: string | null, reason?: string) =>
  tx(() => {
    const lead = need(store.get<ClientLead>('leads', clientId), 'Lead');
    if (agentName && !users.agents().some((a) => a.name === agentName)) bad('Choose an active agent.');
    if ((lead.agentName ?? null) === agentName) return;
    const at = now();
    const note = agentName ? `Assigned to ${agentName} by the admin` : reason || 'Returned to Open leads by the admin';
    store.put<ClientLead>('leads', {
      ...lead,
      agentName: agentName ?? undefined,
      source: agentName ? 'admin' : 'pool',
      claimedAt: agentName ? at : undefined,
      pooledAt: agentName ? lead.pooledAt : at,
      escalatedAt: undefined,
      history: [...lead.history, { at, text: note }],
    });
    moveClient(clientId, agentName ?? undefined);
    if (lead.agentName) notify('agent', 'Client reassigned', `${lead.clientName} is no longer your client. ${note}.`, 'leads', lead.agentName);
    if (agentName) notify('agent', 'New client assigned', `${lead.clientName} (${lead.interest}) is now your client.`, 'leads', agentName);
    else notify('agent', 'New lead', `${lead.clientName} is back in Open leads (${lead.interest}).`, 'leads');
  });

// The 2-hour and 24-hour rules. Runs every minute on the server.
export const runLeadRules = (): boolean => {
  const t = Date.now();
  let changed = false;
  for (const l of store.all<ClientLead>('leads')) {
    if (shouldRelease(l, t)) {
      assignLead(l.clientId, null, `No reply from ${l.agentName} within 24 hours`);
      notify('admin', 'Client released', `${l.clientName} waited 24 hours for ${l.agentName} and is back in Open leads.`, 'leads');
      changed = true;
    } else if (shouldAlertUnclaimed(l, t)) {
      store.put('leads', { ...l, escalatedAt: now() });
      notify('admin', 'Lead waiting', `${l.clientName} has been in Open leads for over 2 hours (${l.interest}).`, 'leads');
      changed = true;
    }
  }
  return changed;
};

// ---------- vehicles and listing requests ----------
const LISTING_FIELDS = ['title', 'brand', 'model', 'year', 'category', 'price', 'mileage', 'condition', 'transmission', 'fuel', 'bodyType', 'color', 'location', 'description', 'financingAvailable', 'images', 'videos'] as const;
const CATEGORIES = ['cars', 'motorcycles', 'trucks', 'ebikes', 'scooters', 'atvs'];
const cleanListing = (input: any, partial: boolean): Partial<Vehicle> => {
  const out: any = {};
  for (const k of LISTING_FIELDS) if (input?.[k] !== undefined) out[k] = input[k];
  if (!partial || out.title !== undefined) out.title = text(out.title, 'Title', 120);
  if (!partial || out.brand !== undefined) out.brand = text(out.brand, 'Brand', 60);
  if (out.model !== undefined) out.model = text(out.model, 'Model', 80, false);
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
const markMediaAttached = (urls: string[] = []) => {
  for (const u of urls) {
    const id = u.match(/^\/files\/([\w-]+)$/)?.[1];
    if (id) db.prepare('UPDATE uploads SET attached = 1 WHERE id = ?').run(id);
  }
};

const buildVehicle = (data: Partial<Vehicle>, status: VehicleStatus): Vehicle => {
  const category = (data.category || 'cars') as Vehicle['category'];
  return {
    id: newId('veh'),
    title: data.title!,
    brand: data.brand!,
    model: data.model || data.title!,
    year: data.year || year(),
    category,
    price: data.price!,
    mileage: data.mileage ?? 0,
    condition: data.condition || 'Surplus / 2nd hand',
    transmission: (data.transmission || 'Automatic') as Vehicle['transmission'],
    fuel: (data.fuel || 'Gasoline') as Vehicle['fuel'],
    bodyType: data.bodyType || 'Sedan',
    color: data.color || '',
    drivetrain: 'Front-Wheel Drive',
    location: data.location || 'Philippines',
    province: 'Metro Manila',
    region: 'NCR',
    sellerId: 'team',
    sellerName: TEAM_NAME,
    sellerLocation: 'Metro Manila, Philippines',
    sellerRating: 5,
    sellerReviewCount: 1,
    sellerVerified: true,
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
  tx(() => {
    const data = cleanListing(input, false);
    const v = store.put('vehicles', buildVehicle(data, input?.status === 'unpublished' ? 'unpublished' : 'available'));
    markMediaAttached([...(v.images || []), ...(v.videos || [])]);
    return v;
  });

export const updateVehicle = (id: string, input: any) =>
  tx(() => {
    const v = need(store.get<Vehicle>('vehicles', id), 'Listing');
    const changes = cleanListing(input, true);
    markMediaAttached([...(changes.images || []), ...(changes.videos || [])]);
    return store.put('vehicles', { ...v, ...changes, minMonthlyPayment: Math.round((changes.price ?? v.price) * 0.018) });
  });

export const setVehicleStatus = (id: string, status: unknown) =>
  tx(() => {
    if (!['available', 'reserved', 'sold', 'unpublished'].includes(status as string)) bad('Unknown status.');
    const v = need(store.get<Vehicle>('vehicles', id), 'Listing');
    return store.put('vehicles', { ...v, status: status as VehicleStatus });
  });

export const deleteVehicle = (id: string) =>
  tx(() => {
    need(store.get<Vehicle>('vehicles', id), 'Listing');
    const active = store.all<VehicleApplication>('applications').some((a) => a.vehicleId === id && ['approved'].includes(a.status));
    if (active) bad('This vehicle is reserved for a client. Complete or cancel that application first.');
    store.remove('vehicles', id);
  });

export const submitListingRequest = (me: User, input: any) =>
  tx(() => {
    const type = input?.type;
    if (!['add', 'edit', 'remove'].includes(type)) bad('Unknown request type.');
    let vehicleTitle: string;
    let changes: Partial<Vehicle> | undefined;
    if (type === 'add') {
      changes = cleanListing(input.changes, false);
      vehicleTitle = changes.title!;
    } else {
      const v = need(store.get<Vehicle>('vehicles', input.vehicleId), 'Listing');
      vehicleTitle = v.title;
      if (type === 'edit') {
        changes = cleanListing(input.changes, true);
        if (!Object.keys(changes).length) bad('Change at least one detail.');
      }
      if (store.all<ListingRequest>('listing_requests', "status = 'pending'").some((r) => r.vehicleId === v.id && r.agentName === me.name))
        bad('You already have a pending request for this listing.');
    }
    const req = store.put<ListingRequest>('listing_requests', {
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
    notify('admin', 'Listing request', `${me.name} asked to ${type} "${vehicleTitle}".`, 'approvals');
    return req;
  });

export const decideListingRequest = (id: string, approve: boolean, reason: unknown) =>
  tx(() => {
    const req = need(store.get<ListingRequest>('listing_requests', id), 'Request');
    if (req.status !== 'pending') bad('This request was already decided.');
    const why = approve ? undefined : text(reason, 'Reason', 500);
    if (approve) {
      if (req.type === 'add') store.put('vehicles', buildVehicle(cleanListing(req.changes, false), 'available'));
      if (req.type === 'edit' && req.vehicleId) {
        const v = need(store.get<Vehicle>('vehicles', req.vehicleId), 'Listing');
        store.put('vehicles', { ...v, ...cleanListing(req.changes, true) });
      }
      if (req.type === 'remove' && req.vehicleId) {
        if (store.all<VehicleApplication>('applications').some((a) => a.vehicleId === req.vehicleId && a.status === 'approved'))
          bad('This vehicle is reserved for a client, so it cannot be removed yet.');
        store.remove('vehicles', req.vehicleId);
      }
    }
    store.put('listing_requests', { ...req, status: approve ? 'approved' : 'rejected', reason: why, decidedAt: now() });
    notify(
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
  tx(() => {
    const v = need(store.get<Vehicle>('vehicles', input?.vehicleId), 'Listing');
    if (!REPORT_REASONS.includes(input.reason)) bad('Choose a reason.');
    const email = text(input.reportedEmail ?? me?.email, 'Email', 200, false);
    const r = store.put<VehicleReport>('reports', {
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
    notify('admin', 'Listing reported', `${v.title}: ${r.reason}.`, 'reports');
    return r;
  });

export const resolveReport = (id: string, action: unknown) =>
  tx(() => {
    const r = need(store.get<VehicleReport>('reports', id), 'Report');
    if (action !== 'dismiss' && action !== 'unpublish_vehicle') bad('Unknown action.');
    if (action === 'unpublish_vehicle') {
      const v = store.get<Vehicle>('vehicles', r.vehicleId);
      if (v) store.put('vehicles', { ...v, status: 'unpublished' });
    }
    store.put('reports', { ...r, status: action === 'dismiss' ? 'dismissed' : 'resolved' });
  });

// ---------- applications ----------
const OPEN: ApplicationStatus[] = ['submitted', 'under_review', 'contacted'];
const NEXT: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: [],
  submitted: ['under_review', 'contacted', 'approved', 'declined', 'withdrawn'],
  under_review: ['contacted', 'approved', 'declined', 'withdrawn'],
  contacted: ['under_review', 'approved', 'declined', 'withdrawn'],
  approved: ['completed', 'declined', 'withdrawn'],
  completed: [],
  declined: [],
  withdrawn: [],
};

export const createApplication = (me: User, input: any) =>
  tx(() => {
    const v = need(store.get<Vehicle>('vehicles', input?.vehicleId), 'Listing');
    if (v.status !== 'available') bad('This vehicle is no longer available.');
    if (store.all<VehicleApplication>('applications', 'applicant_id = ?', me.id).some((a) => a.vehicleId === v.id && [...OPEN, 'approved'].includes(a.status)))
      bad('You already have an open application for this vehicle.');
    const method = input.purchaseMethod;
    if (method !== 'cash' && method !== 'financing') bad('Choose cash or financing.');

    // A sent, unexpired quotation for this vehicle fixes the price.
    let quote: Quotation | undefined;
    if (input.quotationId) {
      quote = need(store.get<Quotation>('quotations', input.quotationId), 'Quotation');
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
    const documents: ApplicationDocument[] = required.map((d) => {
      const fileId = given[d.key];
      if (!fileId) return { label: d.label, fileName: '' };
      const up = attachUpload(fileId, me, me.id, IMG_OR_PDF);
      return { label: d.label, fileName: up.name, url: fileUrl(up.id), status: 'pending' };
    });
    const uploaded = documents.filter((d) => d.fileName).length;
    if (uploaded < Math.min(MIN_UPLOADS, required.length)) bad(`Upload at least ${Math.min(MIN_UPLOADS, required.length)} document${required.length > 1 ? 's' : ''}.`);

    const a = input.address || {};
    const owner = touchLead(me, v.title, false, input.ref);
    const app = store.put<VehicleApplication>('applications', {
      id: newId('app'),
      referenceNo: `GB-${year()}-${pad4(nextNumber(`app-${year()}`, 1000))}`,
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
    });
    if (quote) {
      store.put('quotations', { ...quote, status: 'accepted', applicationRef: app.referenceNo });
      notify('admin', 'Quotation accepted', `${me.name} applied for the ${v.title} using ${quote.quoteNo} (${app.referenceNo}).`, 'applications');
    }
    notify('client', 'Application received', `Your application ${app.referenceNo} for ${app.vehicleTitle} is with the admin team for review.`, 'applications', me.id);
    if (owner) notify('agent', 'Your client applied', `${app.applicantName} applied for the ${app.vehicleTitle} (${method}).`, 'messages', owner);
    notify('admin', 'Application to review', `${app.referenceNo}: ${app.applicantName} applied for the ${app.vehicleTitle}.`, 'applications');
    return app;
  });

export const setApplicationStatus = (me: User, id: string, status: ApplicationStatus, note?: unknown) =>
  tx(() => {
    const app = need(store.get<VehicleApplication>('applications', id), 'Application');
    if (me.role === 'buyer' && (app.applicantId !== me.id || status !== 'withdrawn')) forbidden();
    if (!NEXT[app.status]?.includes(status)) bad(`An application that is ${app.status.replace('_', ' ')} cannot become ${status.replace('_', ' ')}.`);
    const reason = text(note, 'Reason', 1000, status === 'declined');

    const vehicle = store.get<Vehicle>('vehicles', app.vehicleId);
    const setVehicle = (s: VehicleStatus) => vehicle && store.put('vehicles', { ...vehicle, status: s });

    if (status === 'approved') {
      if (app.purchaseMethod === 'financing') {
        const docs = app.documents || [];
        if (!docs.length || docs.some((d) => d.status !== 'approved')) bad('Approve every financing document before approving this application.');
      }
      if (!vehicle || vehicle.status === 'sold') bad('This vehicle is no longer available.');
      if (vehicle!.status === 'reserved' && store.all<VehicleApplication>('applications').some((a) => a.vehicleId === app.vehicleId && a.status === 'approved' && a.id !== app.id))
        bad('This vehicle is already reserved for another client.');
      setVehicle('reserved'); // Rule: an approved application reserves the vehicle.
      if (!store.all<Commission>('commissions', 'application_ref = ?', app.referenceNo).length) {
        const amount = Math.round(app.vehiclePrice * COMMISSION_RATE);
        const agent = ownerOf(app.applicantId) ?? app.sellerName;
        store.put<Commission>('commissions', {
          id: newId('com'),
          agentName: agent,
          applicationRef: app.referenceNo,
          vehicleTitle: app.vehicleTitle,
          clientName: app.applicantName,
          salePrice: app.vehiclePrice,
          rate: COMMISSION_RATE,
          amount,
          status: 'receivable',
          transactionCompleted: false,
          createdAt: now(),
        });
        notify('agent', 'Commission receivable', `₱${amount.toLocaleString()} for the ${app.vehicleTitle} sale to ${app.applicantName}. It becomes payable once the transaction is complete.`, 'commissions', agent);
      }
      notify('client', 'Application approved', `${app.referenceNo} was approved. The ${app.vehicleTitle} is now reserved for you.`, 'applications', app.applicantId);
    } else if (status === 'completed') {
      setVehicle('sold');
      const owner = ownerOf(app.applicantId);
      for (const c of store.all<Commission>('commissions', 'application_ref = ?', app.referenceNo))
        store.put('commissions', { ...c, agentName: owner ?? c.agentName, transactionCompleted: true, completedAt: now() });
      notify('agent', 'Sale completed', `The ${app.vehicleTitle} sale to ${app.applicantName} is complete. Your commission can now be approved for payout.`, 'commissions', owner ?? app.sellerName);
      notify('client', 'Purchase completed', `The ${app.vehicleTitle} has been released to you. Thank you for choosing Broom Broom.`, 'applications', app.applicantId);
    } else if (status === 'declined' || status === 'withdrawn') {
      if (app.status === 'approved') setVehicle('available');
      for (const c of store.all<Commission>('commissions', 'application_ref = ?', app.referenceNo)) if (c.status === 'receivable') store.remove('commissions', c.id);
      if (status === 'declined') notify('client', 'Application declined', `${app.referenceNo} was declined.${reason ? ` Reason: ${reason}` : ''}`, 'applications', app.applicantId);
      else notify('admin', 'Application withdrawn', `${app.applicantName} withdrew ${app.referenceNo}.`, 'applications');
    } else {
      notify('client', 'Application update', `${app.referenceNo} is now ${status.replace('_', ' ')}.`, 'applications', app.applicantId);
    }
    return store.put('applications', { ...app, status, sellerNotes: reason || app.sellerNotes });
  });

const docAt = (app: VehicleApplication, i: number) => {
  const d = app.documents?.[i];
  if (!d) throw new HttpError(404, 'Document not found.');
  return d;
};

export const reviewDocument = (appId: string, i: number, approve: boolean, reason: unknown) =>
  tx(() => {
    const app = need(store.get<VehicleApplication>('applications', appId), 'Application');
    const d = docAt(app, i);
    if (!d.fileName) bad('This document has not been submitted yet.');
    const why = approve ? undefined : text(reason, 'Reason', 500);
    const documents = app.documents!.map((x, k) => (k === i ? { ...x, status: approve ? ('approved' as const) : ('rejected' as const), reason: why } : x));
    store.put('applications', { ...app, documents });
    if (!approve) notify('client', 'Document needs attention', `${d.label} for ${app.referenceNo} was not accepted: ${why}`, 'applications', app.applicantId);
    else if (documents.every((x) => x.status === 'approved')) notify('client', 'Documents approved', `All financing documents for ${app.referenceNo} were approved.`, 'applications', app.applicantId);
  });

// The client handed a document to the admin, who files it on their application; it then waits for review like any other.
export const attachDocumentForClient = (me: User, appId: string, i: number, fileId: unknown) =>
  tx(() => {
    const app = need(store.get<VehicleApplication>('applications', appId), 'Application');
    const d = docAt(app, i);
    if (d.fileName && d.status !== 'rejected') bad('This document is already on file.');
    const up = attachUpload(fileId, me, app.applicantId, IMG_OR_PDF);
    const documents = app.documents!.map((x, k) => (k === i ? { ...x, fileName: up.name, url: fileUrl(up.id), status: 'pending' as const, reason: undefined, addedByAdmin: true } : x));
    store.put('applications', { ...app, documents });
    notify('client', 'Document received', `The admin team added your ${d.label} to ${app.referenceNo}.`, 'applications', app.applicantId);
  });

// A confirmed partial payment releases the next acknowledgement receipt (AR) to the client.
export const addPayment = (me: User, appId: string, input: any) =>
  tx(() => {
    const app = need(store.get<VehicleApplication>('applications', appId), 'Application');
    if (app.status === 'declined' || app.status === 'withdrawn' || app.status === 'completed') bad('Payments can only be recorded on an open or approved application.');
    const amount = money(input?.amount, 'Amount', { min: 0 });
    const paid = (app.payments ?? []).reduce((s, p) => s + p.amount, 0);
    if (paid + amount > app.vehiclePrice) bad(`That is more than the balance of ${peso(app.vehiclePrice - paid)}.`);
    const shot = input?.fileId ? attachUpload(input.fileId, me, app.applicantId, IMG) : undefined;
    const receipt: PaymentReceipt = {
      arNo: `${year()}-${pad4(nextNumber(`ar-${year()}`))}`,
      date: now(),
      description: text(input?.description, 'Description', 200),
      amount,
      receivedBy: me.name,
      attachment: shot ? fileUrl(shot.id) : undefined,
      attachmentName: shot?.name,
    };
    store.put('applications', { ...app, payments: [...(app.payments ?? []), receipt] });
    notify('client', 'Payment received', `Your payment of ${peso(amount)} for ${app.referenceNo} was confirmed. Acknowledgement receipt ${receipt.arNo} is ready.`, 'applications', app.applicantId);
    return receipt;
  });

// ---------- quotations ----------
export const requestQuotation = (me: User, input: any) =>
  tx(() => {
    const v = need(store.get<Vehicle>('vehicles', input?.vehicleId), 'Listing');
    if (v.status !== 'available') bad('This vehicle is no longer available.');
    const open = store.all<Quotation>('quotations', 'client_id = ?', me.id).find((q) => q.vehicleId === v.id && (q.status === 'requested' || (q.status === 'sent' && !isExpired(q))));
    if (open) bad('You already have a quotation for this vehicle. See My Quotations.');
    const method = input.method;
    if (method !== 'cash' && method !== 'financing') bad('Choose cash or financing.');
    const downPayment = method === 'financing' ? money(input.downPayment, 'Down payment', { min: 1 }) : 0;
    if (method === 'financing' && downPayment >= v.price) bad('Enter a down payment below the price.');
    const termMonths = Number(input.termMonths);
    if (!QUOTE_TERMS.includes(termMonths)) bad('Choose a term.');
    touchLead(me, v.title, false, input.ref);
    const a = me.address;
    const q = store.put<Quotation>('quotations', {
      id: newId('qt'),
      status: 'requested',
      requestedAt: now(),
      vehicleId: v.id,
      vehicleTitle: v.title,
      vehicleImage: v.images[0],
      clientId: me.id,
      clientName: me.name,
      clientEmail: me.email,
      clientPhone: me.phone,
      clientAddress: [a?.street, a?.barangay, a?.city, a?.province].filter(Boolean).join(', ') + (a?.postalCode ? ` ${a.postalCode}` : ''),
      method,
      clientNote: text(input.note, 'Note', 1000, false) || undefined,
      unitType: `${v.year} ${v.brand} ${v.model}`,
      variant: '',
      engineNo: '',
      chassisNo: '',
      color: v.color,
      transmission: v.transmission,
      unitPrice: v.price,
      downPayment,
      termMonths,
      annualRate: DEFAULT_RATE,
      insurance: 0,
      registration: 0,
      chattelMortgage: 0,
      remarks: '',
    });
    notify('admin', 'Quotation requested', `${me.name} asked for a ${method} quotation on the ${v.title}.`, 'quotations');
    return q;
  });

export const saveQuotation = (me: User, id: string, input: any, send: boolean) =>
  tx(() => {
    const q = need(store.get<Quotation>('quotations', id), 'Quotation');
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
    if (!QUOTE_TERMS.includes(updated.termMonths)) bad('Choose a term.');
    if (updated.annualRate > 60) bad('Check the interest rate.');
    if (send) {
      updated.validUntil = updated.validUntil || daysFromToday(DEFAULT_VALID_DAYS);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(updated.validUntil) || updated.validUntil < daysFromToday(0)) bad('Set a "valid until" date from today onward.');
      updated.quoteNo = q.quoteNo ?? `QT-${year()}-${pad4(nextNumber(`qt-${year()}`))}`;
      updated.status = q.status === 'accepted' ? 'accepted' : 'sent';
      updated.sentAt = now();
      updated.preparedBy = me.name;
      notify(
        'client',
        q.quoteNo ? 'Quotation updated' : 'Quotation ready',
        `Quotation ${updated.quoteNo} for the ${q.vehicleTitle} is ready. It is valid until ${new Date(`${updated.validUntil}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
        'quotations',
        q.clientId
      );
    }
    return store.put('quotations', updated);
  });

// ---------- commissions: receivable -> payable (sale completed) -> paid (with proof) ----------
export const approveCommission = (id: string) =>
  tx(() => {
    const c = need(store.get<Commission>('commissions', id), 'Commission');
    if (c.status !== 'receivable') bad('Only a receivable commission can be approved.');
    if (!c.transactionCompleted) bad('A commission can only be approved after the sale is completed.');
    store.put('commissions', { ...c, status: 'payable', approvedAt: now() });
    notify('agent', 'Commission payable', `₱${c.amount.toLocaleString()} for the ${c.vehicleTitle} was approved and is awaiting cash transfer.`, 'commissions', c.agentName);
  });

export const payCommission = (me: User, id: string, fileId: unknown) =>
  tx(() => {
    const c = need(store.get<Commission>('commissions', id), 'Commission');
    if (c.status !== 'payable') bad('Only a payable commission can be paid.');
    const agent = users.agents().find((a) => a.name === c.agentName) ?? users.all().find((u) => u.name === c.agentName);
    const proof = attachUpload(fileId, me, agent?.id ?? me.id, IMG_OR_PDF);
    const receiptNo = `BB-OR-${year()}-${pad4(nextNumber(`or-${year()}`))}`;
    store.put<Commission>('commissions', {
      ...c,
      status: 'paid',
      proofFileName: proof.name,
      proofImage: IMG.test(proof.mime) ? fileUrl(proof.id) : undefined,
      receiptNo,
      paidAt: now(),
    });
    notify('agent', 'Cash transferred', `₱${c.amount.toLocaleString()} for the ${c.vehicleTitle} was sent. Your receipt ${receiptNo} is ready.`, 'commissions', c.agentName);
  });

// ---------- chat ----------
export const startConversation = (me: User, vehicleId: unknown, ref: unknown) =>
  tx(() => {
    const v = need(store.get<Vehicle>('vehicles', vehicleId as string), 'Listing');
    const existing = store.all<Conversation>('conversations', 'buyer_id = ? AND vehicle_id = ?', me.id, v.id)[0];
    if (existing) return existing;
    const owner = touchLead(me, v.title, true, ref);
    const at = now();
    return store.put<Conversation>('conversations', {
      id: newId('conv'),
      vehicleId: v.id,
      vehicleTitle: v.title,
      vehiclePrice: v.price,
      vehicleImage: v.images[0],
      buyerId: me.id,
      buyerName: me.name,
      sellerId: owner ? agentSlug(owner) : 'team',
      sellerName: owner ?? TEAM_NAME,
      lastMessage: `Inquiry regarding ${v.title}`,
      updatedAt: at,
      unreadBuyer: 0,
      unreadSeller: 1,
      messages: [{ id: newId('msg'), senderId: me.id, senderName: me.name, text: `Hi${owner ? ` ${owner}` : ''}, I am interested in the ${v.title}. Is it still available for a viewing?`, timestamp: at, isSeller: false }],
    });
  });

export const sendMessage = (me: User, convId: string, body: unknown) =>
  tx(() => {
    const conv = need(store.get<Conversation>('conversations', convId), 'Conversation');
    const isAgent = me.role === 'seller';
    if (me.role === 'buyer' && conv.buyerId !== me.id) forbidden();
    if (isAgent && conv.sellerName !== me.name) forbidden('This client is not yours. Claim them in Open leads first.');
    if (me.role === 'admin') forbidden('Admins can read conversations but not reply in them.');
    const t = text(body, 'Message', 2000);
    const at = now();
    const msg: ChatMessage = { id: newId('msg'), senderId: me.id, senderName: me.name, text: t, timestamp: at, isSeller: isAgent };
    store.put('conversations', {
      ...conv,
      lastMessage: t,
      updatedAt: at,
      unreadBuyer: isAgent ? conv.unreadBuyer + 1 : 0,
      unreadSeller: isAgent ? 0 : conv.unreadSeller + 1,
      messages: [...conv.messages, msg],
    });
    // Track who is waiting on whom for the 24-hour reply rule.
    const lead = store.get<ClientLead>('leads', conv.buyerId);
    if (lead) store.put('leads', isAgent ? (lead.agentName === me.name ? { ...lead, lastAgentAt: at } : lead) : { ...lead, lastClientAt: at });
    if (isAgent) notify('client', 'New message', `${me.name} replied about the ${conv.vehicleTitle}.`, 'messages', conv.buyerId);
  });

export const markConversationRead = (me: User, convId: string) =>
  tx(() => {
    const conv = need(store.get<Conversation>('conversations', convId), 'Conversation');
    if (me.role === 'buyer' && conv.buyerId === me.id) store.put('conversations', { ...conv, unreadBuyer: 0 });
    if (me.role === 'seller' && conv.sellerName === me.name) store.put('conversations', { ...conv, unreadSeller: 0 });
  });

// ---------- notifications ----------
// Which notifications belong to this user.
export const notificationScope = (me: User): [string, (string | null)[]] =>
  me.role === 'buyer'
    ? ["audience = 'client' AND recipient = ?", [me.id]]
    : me.role === 'seller'
    ? ["audience = 'agent' AND (recipient IS NULL OR recipient = ?)", [me.name]]
    : ["audience = 'admin'", []];

export const markNotificationRead = (me: User, id: string) =>
  tx(() => {
    const [where, params] = notificationScope(me);
    const n = store.all<AppNotification>('notifications', `id = ? AND ${where}`, id, ...params)[0];
    if (n) store.put('notifications', { ...n, read: true });
  });

// Shared notices (to all agents) are only marked read, so clearing them does not remove them for everyone else.
export const clearNotifications = (me: User) =>
  tx(() => {
    const [where, params] = notificationScope(me);
    if (me.role === 'seller') {
      db.prepare(`DELETE FROM notifications WHERE audience = 'agent' AND recipient = ?`).run(me.name);
    } else {
      db.prepare(`DELETE FROM notifications WHERE ${where}`).run(...params);
    }
  });

// ---------- accounting vouchers ----------
export const addVoucher = (me: User, input: any) =>
  tx(() => {
    const kind = input?.kind;
    if (kind !== 'expense' && kind !== 'credit') bad('Unknown voucher type.');
    const accounts = kind === 'credit' ? CREDIT_ACCOUNTS : PAYMENT_ACCOUNTS;
    const account = accounts.find((a) => a.id === input.accountId);
    if (!account) bad('Choose an account.');
    if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 50) bad('Add at least one line.');
    const lines: ExpenseLine[] = input.lines.map((l: any, i: number) => {
      const att = l.fileId ? attachUpload(l.fileId, me, me.id, IMG_OR_PDF) : undefined;
      return {
        category: text(l.category, `Line ${i + 1} category`, 80),
        description: text(l.description, `Line ${i + 1} description`, 300),
        amount: money(l.amount, `Line ${i + 1} amount`, { min: 0 }),
        party: text(l.party, `Line ${i + 1} ${kind === 'credit' ? 'creditor' : 'vendor'}`, 120, false),
        attachment: att?.name,
        attachmentUrl: att ? fileUrl(att.id) : undefined,
      };
    });
    const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    const all = store.all<Expense>('vouchers', 'kind = ?', kind);
    const room = kind === 'credit' ? creditAvailable(account!.id, all) : accountBalance(account!.id, all);
    if (total > room) bad(`The total ${peso(total)} is more than the ${kind === 'credit' ? 'available credit' : 'account balance'} of ${peso(room)}.`);
    const paymentDate = text(input.paymentDate, 'Payment date', 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) bad('Enter a valid payment date.');
    const prefix = kind === 'credit' ? 'CV' : 'PV';
    return store.put<Expense>('vouchers', {
      id: newId(kind === 'credit' ? 'cr' : 'exp'),
      kind,
      voucherNo: `${prefix}-${year()}-${pad4(nextNumber(`${prefix.toLowerCase()}-${year()}`))}`,
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
export const updateProfile = (me: User, input: any) =>
  tx(() => {
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
    users.saveProfile(updated);
    return users.byId(me.id)!;
  });

export const changePassword = (me: User, current: unknown, next: unknown) => {
  if (typeof current !== 'string' || !users.checkPassword(me.id, current)) bad('Your current password is not correct.');
  if (!validPassword(next)) bad('The new password must be at least 8 characters.');
  users.setPassword(me.id, next as string);
};

export const createAccount = (input: any) =>
  tx(() => {
    const role = input?.role;
    if (role !== 'seller' && role !== 'admin') bad('Accounts made here are for agents or admins.');
    const email = text(input.email, 'Email', 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad('Enter a valid email.');
    if (users.byEmail(email)) bad('That email already has an account.');
    const name = text(input.name, 'Name', 120);
    if (role === 'seller' && users.all().some((u) => u.role === 'seller' && u.name.toLowerCase() === name.toLowerCase())) bad('An agent with that name already exists.');
    if (!validPassword(input.password)) bad('The password must be at least 8 characters.');
    return users.create({
      id: newId(role === 'seller' ? 'agent' : 'admin'),
      email,
      role,
      name,
      password: input.password,
      phone: text(input.phone, 'Phone', 40, false),
      address: { street: '', barangay: '', city: '', province: '', region: '', postalCode: '', country: 'Philippines' },
      savedVehicleIds: [],
      recentlyViewedIds: [],
      memberSince: new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
    });
  });

export const registerClient = (input: any) =>
  tx(() => {
    const email = text(input?.email, 'Email', 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad('Enter a valid email.');
    if (users.byEmail(email)) bad('That email already has an account. Sign in instead.');
    if (!validPassword(input.password)) bad('The password must be at least 8 characters.');
    return users.create({
      id: newId('usr'),
      email,
      role: 'buyer',
      name: text(input.name, 'Full name', 120),
      password: input.password,
      phone: text(input.phone, 'Phone', 40),
      address: { street: '', barangay: '', city: '', province: 'Metro Manila', region: 'NCR', postalCode: '', country: 'Philippines' },
      savedVehicleIds: [],
      recentlyViewedIds: [],
      memberSince: new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
    });
  });
