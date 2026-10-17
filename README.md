# Broom Broom

Vehicle marketplace for the Philippines (cars, motorcycles, trucks, e-bikes, scooters, ATVs), with an agent portal and an admin console.
React 19 + Vite + Tailwind CSS v4 on the front, a Node API (Express + MongoDB) behind it, hosted on Render.

## Three sites, one build

The same build serves three sites. Which one you get depends on the hostname (see `src/portals.ts`):

| Site | Production (placeholder) | Local |
|---|---|---|
| Marketplace (clients) | `broombroom.ph` | http://localhost:3000 |
| Agent portal | `agent.broombroom.ph` | http://localhost:3000/?portal=agent |
| Admin console | `admin.broombroom.ph` | http://localhost:3000/?portal=admin |

Each site keeps its own sign-in, and an account only works on its own site (a client account on the marketplace, an agent on the agent portal, an admin on the admin console).

## Run locally

```bash
npm install
npm run dev
```

One command runs the site and the API together on http://localhost:3000. Without a `MONGODB_URI`, development starts its own local MongoDB in `server/data/mongo` (git-ignored; the first run downloads MongoDB once) and loads the demo data. To use Atlas instead, put `MONGODB_URI=...` in `.env.local`.

Demo sign-ins (local only; set in `server/seed.ts`):

| Site | Email | Password |
|---|---|---|
| Marketplace | `ajjandreimercado@gmail.com` (or sign up) | `Client#2026` |
| Agent portal | `carlo.santos@broombroom.ph` (any agent: `first.last@broombroom.ph`) | `Agent#2026` |
| Admin console | `admin@broombroom.ph` | `Admin#2026` |

To start over with fresh demo data, stop the server and delete `server/data/`.

## Tests

```bash
npm test        # API: sign-in, access control, and every business rule, against a throwaway MongoDB
npm run lint    # type-check
```

## How the backend works

- `server/app.ts`: HTTP routes. Every change goes through `server/services.ts`, which checks who is asking and applies the rules inside a database transaction (approval reserves the car, financing needs every document approved, commissions go receivable → payable after the sale → paid with proof, first-come lead claiming, the 2-hour and 24-hour lead rules, running AR / QT / voucher / OR numbers).
- `server/state.ts`: what each person may see. Clients get only their own records, agents their own clients plus Open leads, admins everything.
- Sign-in: scrypt-hashed passwords, HttpOnly session cookies (one per site), throttled after 10 failed tries. Agents and admins are created in **Admin → Accounts**; clients sign up on the site. Admins reset forgotten passwords there.
- Files: uploads are stored in MongoDB (GridFS). Client documents, payment screenshots and payout proofs are private (owner and admins only); listing photos and videos are public.
- Transactions: each change commits as a whole or not at all (MongoDB transactions), so two agents can never claim the same client.
- Live updates: open pages listen to `/api/events` and refresh when anything changes, across devices.

## Production on Render + MongoDB Atlas

1. **Atlas**: create a cluster (M0 is free), a database user, and in Network Access allow `0.0.0.0/0` (Render has no fixed address on the free plan, so use a long random database password). Copy the connection string.
2. **Render**: New → Web Service → this repo, branch `backend`.
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Health check path: `/api/health`
3. **Environment**: copy `render.env.example` to `.env.render` (git-ignored), fill it in, and use **Environment → Add from .env**. The variables:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string (required; the server refuses to start without it) |
| `MONGODB_DB` | Database name, default `broombroom` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The first admin, created on the very first start only (password 12+ characters) |
| `SEED_DEMO` | `false` in production (no demo accounts or listings) |
| `NODE_VERSION` | `22` |

Render sets `PORT` and `RENDER` itself. Add the three hostnames (`broombroom.ph`, `agent.`, `admin.`) as custom domains of the same service. The free Render plan sleeps after about 15 minutes without visitors (the next visit waits for it to wake); the free Atlas M0 holds 512 MB including uploaded files and has no automatic backups.

The static GitHub Pages deploy (`.github/workflows/deploy.yml`, branch `main`) cannot run the API.

## Still to decide

- **Plans.** Free Render and Atlas are fine for building and demos; for daily business use, a paid Render instance (always on) and Atlas backups.
- **Email.** Password reset and notification emails need an email service; for now admins reset passwords and notifications appear in the app.
- **Privacy.** Client IDs and proof of income are sensitive personal information under the Data Privacy Act (RA 10173): add a privacy notice and consent on the application, and agree how long documents are kept.
