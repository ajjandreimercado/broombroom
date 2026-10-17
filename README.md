# Broom Broom

Vehicle marketplace for the Philippines (cars, motorcycles, trucks, e-bikes, scooters, ATVs), with an agent portal and an admin console.
React 19 + Vite + Tailwind CSS v4 on the front, a Node API (Express + MongoDB) behind it, hosted on Render.

## Three sites, one build

The same build serves three sites on one address; `?portal=` picks the site (see `src/portals.ts`):

| Site | Live (Render) | Local |
|---|---|---|
| Marketplace (clients) | https://broombroom.onrender.com/ | http://localhost:3000 |
| Agent portal | https://broombroom.onrender.com/?portal=agent | http://localhost:3000/?portal=agent |
| Admin console | https://broombroom.onrender.com/?portal=admin | http://localhost:3000/?portal=admin |

With a custom domain the same paths apply (`https://yourdomain.com/?portal=agent`).

Each site keeps its own sign-in, and an account only works on its own site (a client account on the marketplace, an agent on the agent portal, an admin on the admin console).

## Run locally

1. Copy `.env.example` to `.env.local` (git-ignored) and set `ADMIN_PASSWORD` (12+ characters). That admin account is created on the first start.
2. Run:

```bash
npm install
npm run dev
```

One command runs the site and the API together on http://localhost:3000. Without a `MONGODB_URI`, development starts its own local MongoDB in `server/data/mongo` (git-ignored; the first run downloads MongoDB once). To use Atlas instead, put `MONGODB_URI=...` in `.env.local`.

The database starts empty, exactly like production. Sign in to the admin console with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then:

- **Accounts**: add the agents (they sign in on the agent portal with the temporary password you give them).
- **Add listing**: add vehicles with their photos and videos.
- **Accounting → Overview**: add the company's cash, bank and credit accounts.
- Clients sign up themselves on the marketplace.

Site changes (`src/`) show up right away. Changes to the API (`server/`, or `src/` files the server also uses such as `src/data/constants.ts` and `src/components/leads.ts`) need a restart: stop `npm run dev` (Ctrl+C) and run it again. To start over with an empty database, stop the server and delete `server/data/`.

## Tests

```bash
npm test        # API: sign-in, access control, and every business rule, against a throwaway MongoDB
npm run lint    # type-check
```

## How the backend works

- `server/app.ts`: HTTP routes. Every change goes through `server/services.ts`, which checks who is asking and applies the rules inside a database transaction (approval reserves the car, financing needs every document approved, commissions go receivable → payable after the sale → paid with proof, first-come lead claiming, the 2-hour and 24-hour lead rules, running AR / QT / voucher / OR numbers).
- `server/state.ts`: what each person may see. Clients get only their own records, agents their own clients plus Open leads, admins everything.
- Sign-in: scrypt-hashed passwords (8+ characters with letters and numbers), HttpOnly session cookies (one per site, `Secure` over HTTPS), throttled after 10 failed tries. Agents and admins are created in **Admin → Accounts**; clients sign up on the site. Admins reset forgotten passwords there.
- Security: every change needs the `X-Portal` header and a same-site origin (CSRF guard); per-address limits on sign-ups, help messages and listing reports, and per-account limits on uploads; uploads are checked against the file's real contents; production pages send a strict Content-Security-Policy (only the site's own scripts), HSTS and the usual hardening headers.
- Files: uploads are stored in MongoDB (GridFS). Client documents, payment screenshots and payout proofs are private (owner and admins only); listing photos and videos are public. Uploads never attached to anything are deleted after a day.
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
| `BREVO_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME` | Email through Brevo's HTTP API (Render's free plan blocks SMTP). `MAIL_FROM` must be a sender verified in Brevo. Without a key, emails are not sent |
| `SUPPORT_EMAIL` | Optional. Where Help-page messages go; default `broombroombookingservices@gmail.com` |
| `GOOGLE_CLIENT_ID` | Optional. Turns on "Continue with Google" for clients (see below) |
| `APP_URL` | The client site's address, used for links in emails (e.g. `https://broombroom.onrender.com`) |
| `NODE_VERSION` | `22` |

Render sets `PORT` and `RENDER` itself.

**Custom domain:** in Render, open the service → **Settings → Custom Domains → Add**, enter the domain (and `www.` if wanted), and add the DNS records Render shows at the domain's registrar (usually an `A` record for the bare domain and a `CNAME` for `www`). Render issues the HTTPS certificate automatically once DNS points at it. Then set `APP_URL=https://yourdomain.com` on Render (links in emails) and add `https://yourdomain.com` to the Google client ID's JavaScript origins. Nothing in the code needs to change. The free Render plan sleeps after about 15 minutes without visitors (the next visit waits for it to wake); the free Atlas M0 holds 512 MB including uploaded files and has no automatic backups.

### Sign in with Google (clients)

Clients can sign up and sign in with their Google account; agents and admins keep their passwords. A Google account whose email matches an existing client account signs in to that account. The server checks every Google token (Google's signature, this site's client ID, expiry, verified email) before signing anyone in.

1. [Google Cloud Console](https://console.cloud.google.com/) → create a project (e.g. "Broom Broom").
2. **APIs & Services → OAuth consent screen**: External; app name "Broom Broom", support email `broombroombookingservices@gmail.com`, and the Privacy and Terms page addresses. Publish the app (so anyone can sign in, not just test users).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**: type **Web application**. Under **Authorized JavaScript origins** add every address the client site is opened on, e.g. `https://broombroom.onrender.com`, `https://broombroom.ph` and, for development, `http://localhost:3000` and `http://localhost`. No redirect URIs are needed.
4. Copy the **Client ID** (ends in `.apps.googleusercontent.com`; it is not a secret) and set `GOOGLE_CLIENT_ID` on Render (and in `.env.local` for development).

The static GitHub Pages deploy (`.github/workflows/deploy.yml`, branch `main`) cannot run the API.

## Still to decide

- **Plans.** Free Render and Atlas are fine for building and testing; for daily business use, a paid Render instance (always on) and Atlas backups.
- **Legal text.** Have the company's lawyer review the Terms and Privacy pages (`src/views/LegalView.tsx`).
- **Commission rate.** 3% of the sale price, set in `src/data/constants.ts`.
- **Email.** Password reset and notification emails need an email service; for now admins reset passwords and notifications appear in the app.
- **Privacy.** Client IDs and proof of income are sensitive personal information under the Data Privacy Act (RA 10173): add a privacy notice and consent on the application, and agree how long documents are kept.
