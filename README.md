# Broom Broom

Vehicle marketplace for the Philippines (cars, motorcycles, trucks, e-bikes, scooters, ATVs), with an agent portal and an admin console.
React 19 + Vite + Tailwind CSS v4 on the front, a Node API (Express + SQLite) behind it.

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

One command runs the site and the API together on http://localhost:3000. On the first start the API creates `server/data/` (database and uploaded files, git-ignored) and loads the demo data.

Demo sign-ins (local only; set in `server/seed.ts`):

| Site | Email | Password |
|---|---|---|
| Marketplace | `ajjandreimercado@gmail.com` (or sign up) | `Client#2026` |
| Agent portal | `carlo.santos@broombroom.ph` (any agent: `first.last@broombroom.ph`) | `Agent#2026` |
| Admin console | `admin@broombroom.ph` | `Admin#2026` |

To start over with fresh demo data, stop the server and delete `server/data/`.

## Tests

```bash
npm test        # API: sign-in, access control, and every business rule, against a throwaway database
npm run lint    # type-check
```

## How the backend works

- `server/app.ts`: HTTP routes. Every change goes through `server/services.ts`, which checks who is asking and applies the rules inside a database transaction (approval reserves the car, financing needs every document approved, commissions go receivable → payable after the sale → paid with proof, first-come lead claiming, the 2-hour and 24-hour lead rules, running AR / QT / voucher / OR numbers).
- `server/state.ts`: what each person may see. Clients get only their own records, agents their own clients plus Open leads, admins everything.
- Sign-in: scrypt-hashed passwords, HttpOnly session cookies (one per site), throttled after 10 failed tries. Agents and admins are created in **Admin → Accounts**; clients sign up on the site. Admins reset forgotten passwords there.
- Files: uploads are stored under `server/data/uploads`. Client documents, payment screenshots and payout proofs are private (owner and admins only); listing photos and videos are public.
- Live updates: open pages listen to `/api/events` and refresh when anything changes, across devices.

## Production

```bash
npm run build
SEED_DEMO=false ADMIN_EMAIL=you@company.ph ADMIN_PASSWORD='at-least-12-characters' PORT=3000 npm start
```

- `npm start` serves the built site and the API from one Node process. Point all three hostnames at it.
- With `SEED_DEMO=false` the first start creates only that admin; everything else is entered in the app. Never run production with the demo passwords.
- `BB_DATA_DIR` sets where the database and uploads live. Put it on a persistent disk and back it up (copy the folder while the server is stopped, or use `sqlite3 .backup`).
- Serve it over HTTPS (cookies are marked Secure when the request is HTTPS behind a proxy).
- The static GitHub Pages deploy (`.github/workflows/deploy.yml`) cannot run the API; use a Node host instead.

## Still to decide

- **Hosting and database.** SQLite on one server is fine to start. Moving to Postgres later is a table-by-table copy (each table already has the columns the server filters on, plus the record as JSON).
- **Email.** Password reset and notification emails need an email service; for now admins reset passwords and notifications appear in the app.
- **Privacy.** Client IDs and proof of income are sensitive personal information under the Data Privacy Act (RA 10173): add a privacy notice and consent on the application, and agree how long documents are kept.
