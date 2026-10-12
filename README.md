# Broom Broom

Vehicle marketplace for the Philippines (cars, motorcycles, trucks, e-bikes, scooters, ATVs).
Vite + React 19 + Tailwind CSS v4. Demo data only; there is no backend yet.

## Three sites, one build

The same build serves three sites. Which one you get depends on the hostname (see `src/portals.ts`):

| Site | Production (placeholder) | Local |
|---|---|---|
| Marketplace (clients) | `broombroom.ph` | http://localhost:3000 |
| Agent portal | `agent.broombroom.ph` | http://localhost:3000/?portal=agent |
| Admin console | `admin.broombroom.ph` | http://localhost:3000/?portal=admin |

The portals have no links from the public site except "Sell on Broom Broom" (footer). The admin console is reachable only by its own address.

## Run locally

```bash
npm install
npm run dev
```

Then open the three local addresses above. Locally (and on GitHub Pages) the portals share one address so they share the demo data and update live across tabs; real domains use the subdomains.

## Deploy

1. Build once with `npm run build`, which writes `dist/`.
2. Serve `dist/` on all three hostnames. Point `broombroom.ph`, `agent.broombroom.ph` and `admin.broombroom.ph` at the same static host (for example Cloudflare Pages or Netlify, adding each hostname as a custom domain).
3. Only if the portals sit on unrelated domains, set the `VITE_*_URL` values from `.env.example` before building.

## Before this is truly production-ready

- **Backend and real auth.** Sign-in is mocked, and data lives in each site's own browser storage. Because each subdomain is a separate origin, the three sites do not share data yet: an application sent on the marketplace will not appear in the agent portal until a shared API and database exist.
- **Server-side access control.** The admin console is hidden only by its address. Real admin access must be enforced by the backend, for example by role checks on every API call and by restricting the admin hostname (Cloudflare Access or similar).
