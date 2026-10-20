/// <reference types="node" />
import express, { type Request, type Response, type NextFunction } from 'express';
import { raw, files, ping } from './db.ts';
import { HttpError, sessionUser, requireRole, startSession, endSession, portalOf, users, throttle, publicUser, validPassword, PASSWORD_RULE, rateLimit, type User, type Portal } from './auth.ts';
import { buildState } from './state.ts';
import { eventStream, broadcastChange } from './events.ts';
import * as svc from './services.ts';
import { sendMail, resubmitEmail, supportEmail, infoSheetEmail } from './mailer.ts';
import { CONTACT_EMAIL } from '../src/data/constants.ts';
import { verifyGoogleToken } from './google.ts';

type Handler = (req: Request, res: Response) => unknown;
// Runs a change, tells every open portal to refresh, and replies with the result.
const act = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve()
    .then(() => fn(req, res))
    .then((out) => {
      broadcastChange();
      if (!res.headersSent) res.json({ ok: true, data: out ?? null });
    })
    .catch(next);
};
// Express 4 does not catch rejected promises by itself.
const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};
const me = (req: Request) => req.user as User;
// The client site's address for links in emails: APP_URL when set, otherwise this request's site without the
// agent./admin. prefix (in single-address mode the client site is the same address).
const clientSiteUrl = (req: Request) => {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const host = String(req.get('host') || 'localhost').replace(/^(agent|admin)\./, '');
  return `${req.protocol}://${host}`;
};
const TEMP_ALLOWED = new Set(['GET /state', 'GET /events', 'POST /me/password', 'POST /auth/logout', 'POST /auth/login', 'POST /auth/google']);
const body = (req: Request) => (req.body && typeof req.body === 'object' ? req.body : {});

// Each upload must really be the type it claims: checked against the file's first bytes.
const SIGNATURE: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/gif': (b) => b.subarray(0, 4).toString('latin1') === 'GIF8',
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  'image/heic': (b) => b.subarray(4, 8).toString('latin1') === 'ftyp',
  'image/heif': (b) => b.subarray(4, 8).toString('latin1') === 'ftyp',
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  'video/mp4': (b) => b.subarray(4, 8).toString('latin1') === 'ftyp',
  'video/quicktime': (b) => ['ftyp', 'moov', 'mdat', 'wide', 'free'].includes(b.subarray(4, 8).toString('latin1')),
  'video/webm': (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
};

const UPLOAD_TYPES: Record<string, number> = {
  'image/jpeg': 10, 'image/png': 10, 'image/webp': 10, 'image/gif': 10, 'image/heic': 10, 'image/heif': 10,
  'application/pdf': 10,
  'video/mp4': 100, 'video/webm': 100, 'video/quicktime': 100,
};

// Call connectDb() and seedIfEmpty() before this (see server/index.ts).
export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups'); // the receipt and quotation tabs stay ours
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // ---------- files (stored in MongoDB GridFS) ----------
  // Any portal's session may open a file: public files are for everyone, private ones only for their owner and admins.
  app.get(
    '/files/:id',
    handle(async (req, res) => {
      const row = await raw('uploads').findOne({ _id: String(req.params.id) });
      if (!row) return void res.status(404).send('Not found');
      if (row.visibility === 'private') {
        const viewers = ((await Promise.all((['buyer', 'seller', 'admin'] as Portal[]).map((p) => sessionUser(req, p)))).filter(Boolean) as User[]).filter((u) => !u.mustChangePassword);
        if (!viewers.some((u) => u.role === 'admin' || u.id === row.ownerId)) return void res.status(403).send('Not allowed');
        res.setHeader('Cache-Control', 'private, no-store');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      res.setHeader('Content-Type', row.mime);
      res.setHeader('Content-Length', String(row.size));
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.name)}"`);
      files()
        .openDownloadStream(row._id as any)
        .on('error', () => (res.headersSent ? res.end() : res.status(404).send('Not found')))
        .pipe(res);
    })
  );

  // ---------- API ----------
  const api = express.Router();
  // Render checks this to know the server is up (and the database reachable).
  api.get(
    '/health',
    handle(async (_req, res) => {
      await ping();
      res.json({ ok: true });
    })
  );
  // CSRF guard: every API call must carry X-Portal (a cross-site form cannot set it) and come from this site.
  api.use((req, _res, next) => {
    if (req.method !== 'GET') {
      if (!req.get('x-portal')) return next(new HttpError(403, 'Missing portal header.'));
      const origin = req.get('origin');
      if (origin && new URL(origin).host !== req.get('host')) return next(new HttpError(403, 'Cross-site request blocked.'));
    }
    sessionUser(req)
      .then((u) => {
        req.user = u;
        // Signed in with a temporary password: only setting their own password (or signing out) is allowed.
        if (u?.mustChangePassword && !TEMP_ALLOWED.has(`${req.method} ${req.path}`)) return next(new HttpError(403, 'Set your own password first.'));
        next();
      })
      .catch(next);
  });

  api.get('/events', eventStream);
  api.get('/state', handle(async (req, res) => void res.json(await buildState(req.user))));

  // Uploads come as the raw file body; the record they belong to is attached in a later call.
  api.post(
    '/uploads',
    express.raw({ type: () => true, limit: '101mb' }),
    handle(async (req, res) => {
      const u = req.user;
      const visibility = req.query.visibility === 'public' ? 'public' : 'private';
      if (!u) throw new HttpError(401, 'Please sign in first.');
      if (visibility === 'public' && u.role === 'buyer') throw new HttpError(403, 'Your account cannot upload listing media.');
      const mime = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const maxMb = UPLOAD_TYPES[mime];
      if (!maxMb) throw new HttpError(415, 'Use a photo (JPG, PNG, WebP), a PDF, or a video (MP4, MOV, WebM).');
      if (mime.startsWith('video/') && u.role === 'buyer') throw new HttpError(415, 'Upload a photo or a PDF.');
      rateLimit(`upload|${u.id}`, 120, 60 * 60e3, 'Too many uploads in the last hour. Please try again later.');
      const buf = req.body as Buffer;
      if (!Buffer.isBuffer(buf) || !buf.length) throw new HttpError(400, 'The file is empty.');
      if (buf.length > maxMb * 1024 * 1024) throw new HttpError(413, `Files of this type can be up to ${maxMb} MB.`);
      if (!SIGNATURE[mime](buf)) throw new HttpError(415, 'That file is damaged or is not the type its name says. Try another file.');
      const name = String(req.query.name || 'file').replace(/[\\/\r\n"]/g, '_').slice(0, 150);
      const id = svc.newId('f');
      await new Promise<void>((resolve, reject) => {
        files()
          .openUploadStreamWithId(id as any, name, { metadata: { mime } })
          .on('finish', () => resolve())
          .on('error', reject)
          .end(buf);
      });
      await raw('uploads').insertOne({ _id: id, ownerId: u.id, uploadedBy: u.id, visibility, mime, name, size: buf.length, attached: false, createdAt: new Date() });
      res.json({ ok: true, data: { id, url: `/files/${id}`, name, mime } });
    })
  );

  api.use(express.json({ limit: '1mb' }));

  // ---------- auth ----------
  api.post(
    '/auth/login',
    handle(async (req, res) => {
      const { email, password } = body(req);
      const portal = portalOf(req);
      if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) throw new HttpError(400, 'Enter your email and password.');
      const key = `${req.ip}|${email.trim().toLowerCase()}`;
      throttle.check(key);
      const user = await users.verify(email, password);
      if (!user || !user.active) {
        throttle.fail(key);
        throw new HttpError(401, user && !user.active ? 'This account is disabled. Contact the admin team.' : 'Wrong email or password.');
      }
      if (user.role !== portal) {
        throttle.fail(key);
        const where = { buyer: 'the client site', seller: 'the agent portal', admin: 'the admin console' }[user.role];
        throw new HttpError(403, `This account signs in on ${where}.`);
      }
      throttle.clear(key);
      await startSession(res, req, user, portal);
      res.json({ ok: true, data: publicUser(user) });
    })
  );
  api.post(
    '/auth/register',
    handle(async (req, res) => {
      if (portalOf(req) !== 'buyer') throw new HttpError(403, 'Agent and admin accounts are created by the admin team.');
      rateLimit(`register|${req.ip}`, 5, 60 * 60e3, 'Too many new accounts from this connection. Please try again later.');
      const user = await svc.registerClient(body(req));
      await startSession(res, req, user, 'buyer');
      res.json({ ok: true, data: publicUser(user) });
    })
  );
  // Sign in with Google. Clients may also sign up this way; agents and admins only sign in to accounts the admin made.
  // The token is checked on the server before anything else.
  api.post(
    '/auth/google',
    handle(async (req, res) => {
      const portal = portalOf(req);
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) throw new HttpError(503, 'Google sign-in is not set up yet. Sign in with your email and password.');
      rateLimit(`google|${req.ip}`, 30, 15 * 60e3, 'Too many sign-in attempts. Try again in a few minutes.');
      const profile = await verifyGoogleToken(body(req).credential, clientId);
      if (!profile) throw new HttpError(401, 'Google sign-in did not go through. Please try again.');
      const { user, created } = portal === 'buyer' ? await svc.googleSignIn(profile) : { user: await svc.googleStaffSignIn(profile, portal), created: false };
      await startSession(res, req, user, portal);
      res.json({ ok: true, data: { ...publicUser(user), created } });
    })
  );
  api.post(
    '/auth/logout',
    handle(async (req, res) => {
      await endSession(req, res, portalOf(req));
      res.json({ ok: true });
    })
  );

  // ---------- my account ----------
  api.patch('/me', requireRole('buyer', 'seller', 'admin'), act(async (req) => publicUser(await svc.updateProfile(me(req), body(req)))));
  api.post(
    '/me/password',
    requireRole('buyer', 'seller', 'admin'),
    handle(async (req, res) => {
      await svc.changePassword(me(req), body(req).current, body(req).next);
      await startSession(res, req, (await users.byId(me(req).id))!, portalOf(req)); // other sessions were signed out
      res.json({ ok: true });
    })
  );

  // ---------- listings ----------
  api.post('/vehicles', requireRole('admin'), act((req) => svc.createVehicle(body(req))));
  api.patch('/vehicles/:id', requireRole('admin'), act((req) => svc.updateVehicle(req.params.id, body(req))));
  api.post('/vehicles/:id/status', requireRole('admin'), act((req) => svc.setVehicleStatus(req.params.id, body(req).status)));
  api.delete('/vehicles/:id', requireRole('admin'), act((req) => svc.deleteVehicle(req.params.id)));
  api.post('/listing-requests', requireRole('seller'), act((req) => svc.submitListingRequest(me(req), body(req))));
  api.post('/listing-requests/:id/decide', requireRole('admin'), act((req) => svc.decideListingRequest(req.params.id, !!body(req).approve, body(req).reason)));
  api.post(
    '/reports',
    act((req) => {
      rateLimit(`report|${req.ip}`, 10, 60 * 60e3, 'Too many reports from this connection. Please try again later.');
      return svc.submitReport(req.user, body(req));
    })
  );

  // ---------- help page ----------
  // Anyone can write to the company inbox (SUPPORT_EMAIL, or the contact address); replying answers the sender.
  api.post(
    '/support',
    handle(async (req, res) => {
      const b = body(req);
      const field = (v: unknown, name: string, max: number) => {
        const t = typeof v === 'string' ? v.trim() : '';
        if (!t) throw new HttpError(400, `${name} is required.`);
        if (t.length > max) throw new HttpError(400, `${name} is too long (max ${max} characters).`);
        return t;
      };
      const name = field(b.name, 'Your name', 120);
      const email = field(b.email, 'Email', 200);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email so we can reply.');
      const topic = field(b.topic, 'Topic', 80);
      const message = field(b.message, 'Message', 4000);
      rateLimit(`support|${req.ip}`, 5, 60 * 60e3, 'Too many messages from this connection. Please email us directly instead.');
      const sent = await sendMail(supportEmail({ to: process.env.SUPPORT_EMAIL || CONTACT_EMAIL, name, email, topic, message }));
      // In development without an email service the message is saved to server/data/outbox instead.
      const production = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
      if (!sent && (process.env.BREVO_API_KEY || production)) throw new HttpError(502, `Your message could not be sent. Please email ${CONTACT_EMAIL} directly.`);
      res.json({ ok: true });
    })
  );
  api.post('/reports/:id/resolve', requireRole('admin'), act((req) => svc.resolveReport(req.params.id, body(req).action)));

  // ---------- applications ----------
  const idx = (req: Request) => {
    const i = Number(req.params.i);
    if (!Number.isInteger(i) || i < 0) throw new HttpError(400, 'Unknown document.');
    return i;
  };
  api.post('/applications', requireRole('buyer'), act((req) => svc.createApplication(me(req), body(req))));
  api.post('/applications/:id/status', requireRole('buyer', 'admin'), act((req) => svc.setApplicationStatus(me(req), req.params.id, body(req).status, body(req).note, me(req).role === 'admin' ? body(req).commission : undefined)));
  api.post(
    '/applications/:id/documents/:i/review',
    requireRole('admin'),
    act(async (req) => {
      const rejected = await svc.reviewDocument(req.params.id, idx(req), !!body(req).approve, body(req).reason);
      // Sent after the change is saved; a failed email never undoes the rejection (the client also gets an in-app notice).
      if (rejected) void sendMail(resubmitEmail({ ...rejected, link: `${clientSiteUrl(req)}/?resubmit=${encodeURIComponent(rejected.appId)}` }));
    })
  );
  api.post('/applications/:id/documents/:i/resubmit', requireRole('buyer'), act((req) => svc.resubmitDocument(me(req), req.params.id, idx(req), body(req).fileId)));
  api.post('/applications/:id/documents/:i/file', requireRole('admin'), act((req) => svc.attachDocumentForClient(me(req), req.params.id, idx(req), body(req).fileId)));
  api.post('/applications/:id/payments', requireRole('admin'), act((req) => svc.addPayment(me(req), req.params.id, body(req))));
  api.post(
    '/applications/:id/reserve',
    requireRole('admin'),
    act(async (req) => {
      const { receipt, email } = await svc.reserveApplication(me(req), req.params.id, body(req));
      // Sent after the change is saved; the client also gets an in-app notice.
      void sendMail(infoSheetEmail({ ...email, link: `${clientSiteUrl(req)}/?infosheet=${encodeURIComponent(email.appId)}` }));
      return receipt;
    })
  );
  api.post('/applications/:id/info-sheet', requireRole('buyer'), act((req) => svc.submitInfoSheet(me(req), req.params.id, body(req))));
  api.post('/applications/:id/release', requireRole('admin'), act((req) => svc.releaseVehicle(me(req), req.params.id, body(req))));
  api.patch('/applications/:id/payments/:arNo', requireRole('admin'), act((req) => svc.updatePayment(me(req), req.params.id, req.params.arNo, body(req))));
  api.delete('/applications/:id/payments/:arNo', requireRole('admin'), act((req) => svc.deletePayment(req.params.id, req.params.arNo)));

  // ---------- quotations ----------
  api.post('/quotations', requireRole('buyer'), act((req) => svc.requestQuotation(me(req), body(req))));
  api.patch('/quotations/:id', requireRole('admin'), act((req) => svc.saveQuotation(me(req), req.params.id, body(req).changes, !!body(req).send)));

  // ---------- commissions ----------
  api.post('/commissions/:id/pay', requireRole('admin'), act((req) => svc.payCommission(me(req), req.params.id, body(req).fileId)));

  // ---------- chat ----------
  api.post('/conversations', requireRole('buyer'), act((req) => svc.startConversation(me(req), body(req).vehicleId, body(req).ref, body(req).text)));
  api.post('/conversations/:id/messages', requireRole('buyer', 'seller', 'admin'), act((req) => svc.sendMessage(me(req), req.params.id, body(req))));
  api.post('/conversations/:id/read', requireRole('buyer', 'seller', 'admin'), act((req) => svc.markConversationRead(me(req), req.params.id)));

  // ---------- notifications ----------
  api.post('/notifications/clear', requireRole('buyer', 'seller', 'admin'), act((req) => svc.clearNotifications(me(req))));
  api.post('/notifications/:id/read', requireRole('buyer', 'seller', 'admin'), act((req) => svc.markNotificationRead(me(req), req.params.id)));

  // ---------- leads ----------
  api.post('/leads/:clientId/claim', requireRole('seller'), act((req) => svc.claimLead(me(req), req.params.clientId)));
  api.post('/leads/:clientId/unlock', requireRole('admin'), act((req) => svc.unlockLead(req.params.clientId)));
  api.post('/leads/:clientId/conversation', requireRole('seller'), act((req) => svc.agentConversation(me(req), req.params.clientId)));
  api.post(
    '/leads/:clientId/assign',
    requireRole('admin'),
    act((req) => {
      const agent = body(req).agentName;
      return svc.assignLead(req.params.clientId, typeof agent === 'string' && agent ? agent : null);
    })
  );

  // ---------- accounting ----------
  api.post('/vouchers', requireRole('admin'), act((req) => svc.addVoucher(me(req), body(req))));
  api.post('/ledger-accounts', requireRole('admin'), act((req) => svc.saveLedgerAccount(null, body(req))));
  api.patch('/ledger-accounts/:id', requireRole('admin'), act((req) => svc.saveLedgerAccount(req.params.id, body(req))));
  api.delete('/ledger-accounts/:id', requireRole('admin'), act((req) => svc.deleteLedgerAccount(req.params.id)));
  api.post('/receipts', requireRole('admin'), act((req) => svc.createReceipt(me(req), body(req))));
  api.patch('/receipts/:id', requireRole('admin'), act((req) => svc.updateReceipt(me(req), req.params.id, body(req))));
  api.delete('/receipts/:id', requireRole('admin'), act((req) => svc.deleteReceipt(req.params.id)));
  api.post('/referrals', requireRole('admin'), act((req) => svc.addReferral(me(req), body(req))));
  api.post('/referrals/:id/status', requireRole('admin'), act((req) => svc.setReferralStatus(me(req), req.params.id, body(req).status)));
  api.post('/sales-entries', requireRole('admin'), act((req) => svc.addSalesEntry(me(req), body(req))));
  api.delete('/sales-entries/:id', requireRole('admin'), act((req) => svc.deleteSalesEntry(req.params.id)));
  api.post('/conversations/:id/takeover', requireRole('admin'), act((req) => svc.takeOverConversation(req.params.id)));
  api.post('/conversations/:id/end-takeover', requireRole('admin'), act((req) => svc.endTakeover(req.params.id)));

  // ---------- accounts (admin) ----------
  api.post('/users', requireRole('admin'), act(async (req) => publicUser(await svc.createAccount(body(req)))));
  api.post(
    '/users/:id/password',
    requireRole('admin'),
    act(async (req) => {
      const target = await users.byId(String(req.params.id));
      if (!target) throw new HttpError(404, 'Account not found.');
      if (!validPassword(body(req).password)) throw new HttpError(400, PASSWORD_RULE);
      await users.setPassword(target.id, body(req).password, true); // they must replace it on their next sign-in
    })
  );
  api.post(
    '/users/:id/email',
    requireRole('admin'),
    act(async (req) => {
      const target = await users.byId(String(req.params.id));
      if (!target) throw new HttpError(404, 'Account not found.');
      const email = typeof body(req).email === 'string' ? body(req).email.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new HttpError(400, 'Enter a valid email.');
      const other = await users.byEmail(email);
      if (other && other.id !== target.id) throw new HttpError(400, `${email} already belongs to another account (${other.name}). Change or disable that one first.`);
      await users.setEmail(target.id, email);
    })
  );
  api.post(
    '/users/:id/active',
    requireRole('admin'),
    act(async (req) => {
      const target = await users.byId(String(req.params.id));
      if (!target) throw new HttpError(404, 'Account not found.');
      if (target.id === me(req).id) throw new HttpError(400, 'You cannot disable your own account.');
      await users.setActive(target.id, !!body(req).active);
    })
  );

  api.use((_req, _res, next) => next(new HttpError(404, 'Unknown API route.')));
  app.use('/api', api);

  // Errors: known ones carry their message to the user; anything else is logged and kept vague.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ ok: false, error: err.message });
    if (err?.type === 'entity.too.large') return res.status(413).json({ ok: false, error: 'That file is too large.' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ ok: false, error: 'The request could not be read.' });
    console.error(err);
    res.status(500).json({ ok: false, error: 'Something went wrong on the server. Please try again.' });
  });

  return app;
};

// The 2-hour and 24-hour lead rules and the upload clean-up, every minute.
export const startJobs = () => {
  const run = () =>
    svc
      .runLeadRules()
      .then((changed) => changed && broadcastChange())
      .then(() => svc.removeAbandonedUploads())
      .catch((e) => console.error('background jobs failed', e));
  run();
  return setInterval(run, 60_000);
};
