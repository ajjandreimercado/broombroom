/// <reference types="node" />
import express, { type Request, type Response, type NextFunction } from 'express';
import { raw, files, ping } from './db.ts';
import { HttpError, sessionUser, requireRole, startSession, endSession, portalOf, users, throttle, publicUser, validPassword, type User, type Portal } from './auth.ts';
import { buildState } from './state.ts';
import { eventStream, broadcastChange } from './events.ts';
import * as svc from './services.ts';

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
const body = (req: Request) => (req.body && typeof req.body === 'object' ? req.body : {});

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
        const viewers = (await Promise.all((['buyer', 'seller', 'admin'] as Portal[]).map((p) => sessionUser(req, p)))).filter(Boolean) as User[];
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
      const buf = req.body as Buffer;
      if (!Buffer.isBuffer(buf) || !buf.length) throw new HttpError(400, 'The file is empty.');
      if (buf.length > maxMb * 1024 * 1024) throw new HttpError(413, `Files of this type can be up to ${maxMb} MB.`);
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
      const user = await svc.registerClient(body(req));
      await startSession(res, req, user, 'buyer');
      res.json({ ok: true, data: publicUser(user) });
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
  api.post('/reports', act((req) => svc.submitReport(req.user, body(req))));
  api.post('/reports/:id/resolve', requireRole('admin'), act((req) => svc.resolveReport(req.params.id, body(req).action)));

  // ---------- applications ----------
  const idx = (req: Request) => {
    const i = Number(req.params.i);
    if (!Number.isInteger(i) || i < 0) throw new HttpError(400, 'Unknown document.');
    return i;
  };
  api.post('/applications', requireRole('buyer'), act((req) => svc.createApplication(me(req), body(req))));
  api.post('/applications/:id/status', requireRole('buyer', 'admin'), act((req) => svc.setApplicationStatus(me(req), req.params.id, body(req).status, body(req).note)));
  api.post('/applications/:id/documents/:i/review', requireRole('admin'), act((req) => svc.reviewDocument(req.params.id, idx(req), !!body(req).approve, body(req).reason)));
  api.post('/applications/:id/documents/:i/file', requireRole('admin'), act((req) => svc.attachDocumentForClient(me(req), req.params.id, idx(req), body(req).fileId)));
  api.post('/applications/:id/payments', requireRole('admin'), act((req) => svc.addPayment(me(req), req.params.id, body(req))));

  // ---------- quotations ----------
  api.post('/quotations', requireRole('buyer'), act((req) => svc.requestQuotation(me(req), body(req))));
  api.patch('/quotations/:id', requireRole('admin'), act((req) => svc.saveQuotation(me(req), req.params.id, body(req).changes, !!body(req).send)));

  // ---------- commissions ----------
  api.post('/commissions/:id/approve', requireRole('admin'), act((req) => svc.approveCommission(req.params.id)));
  api.post('/commissions/:id/pay', requireRole('admin'), act((req) => svc.payCommission(me(req), req.params.id, body(req).fileId)));

  // ---------- chat ----------
  api.post('/conversations', requireRole('buyer'), act((req) => svc.startConversation(me(req), body(req).vehicleId, body(req).ref)));
  api.post('/conversations/:id/messages', requireRole('buyer', 'seller', 'admin'), act((req) => svc.sendMessage(me(req), req.params.id, body(req).text)));
  api.post('/conversations/:id/read', requireRole('buyer', 'seller', 'admin'), act((req) => svc.markConversationRead(me(req), req.params.id)));

  // ---------- notifications ----------
  api.post('/notifications/clear', requireRole('buyer', 'seller', 'admin'), act((req) => svc.clearNotifications(me(req))));
  api.post('/notifications/:id/read', requireRole('buyer', 'seller', 'admin'), act((req) => svc.markNotificationRead(me(req), req.params.id)));

  // ---------- leads ----------
  api.post('/leads/:clientId/claim', requireRole('seller'), act((req) => svc.claimLead(me(req), req.params.clientId)));
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

  // ---------- accounts (admin) ----------
  api.post('/users', requireRole('admin'), act(async (req) => publicUser(await svc.createAccount(body(req)))));
  api.post(
    '/users/:id/password',
    requireRole('admin'),
    act(async (req) => {
      const target = await users.byId(String(req.params.id));
      if (!target) throw new HttpError(404, 'Account not found.');
      if (!validPassword(body(req).password)) throw new HttpError(400, 'The password must be at least 8 characters.');
      await users.setPassword(target.id, body(req).password);
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

// The 2-hour and 24-hour lead rules, every minute.
export const startJobs = () => {
  const run = () =>
    svc
      .runLeadRules()
      .then((changed) => changed && broadcastChange())
      .catch((e) => console.error('lead rules failed', e));
  run();
  return setInterval(run, 60_000);
};
