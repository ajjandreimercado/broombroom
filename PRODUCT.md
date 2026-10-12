# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Buyers in the Philippines** browsing for a car, motorcycle, truck, e-bike, scooter or ATV. They filter, compare, save, apply to buy (cash or financing), and message sellers.
- **Sellers** (dealers and private) list vehicles, review applications, chat with buyers and read sales reports in the seller dashboard.
- **Admins** moderate listings, users and reports in the admin dashboard.

## Product Purpose

A vehicle marketplace where browsing, comparing, applying and messaging happen in one place, so a buyer goes from search to an approved purchase application without leaving the site. This is a school/demo project running on mock data (`src/data/mockData.ts`).

## Positioning

All vehicle types (cars through ATVs) across Philippine regions in one marketplace, with an in-site purchase application (cash or financing with term and down payment) instead of a "contact seller" dead end.

## Operating Context

- Prices are in Philippine pesos (₱). Locations are Philippine cities, provinces and regions; addresses include barangay.
- Single-page React app; views are switched through `currentView` in `src/context/AppContext.tsx`, not URL routes.
- Views: intro (landing), marketplace, deals, vehicle detail, application wizard, account, seller dashboard, admin dashboard, how it works, help, terms, privacy. Overlays: auth, report, compare dock and modal, toasts.

## Capabilities and Constraints

- Stack: Vite + React 19 + Tailwind CSS v4, `motion` and `lucide-react` installed.
- All data is mock. Do not invent real customer counts, ratings, partners or financing rates beyond what the mock data holds.

## Brand Commitments

- Logo: `public/broom-broom-logo.png` (green "Broom" with motorcycle, blue "Broom" with sports car). The logo reads "Broom Broom"; site copy still says "Groom Broom" (unresolved).
- The brand palette follows the new Broom Broom logo (`public/broom-broom-logo.png`): blue for actions, green for stamped states. The old orange `#E8541A` is retired.
- The user asked for a minimalist, clean, professional look, with bold creativity inside that.

## Evidence on Hand

- Vehicle photos: `public/vehicles/*.jpg` (6 photos). The other listings use the image URLs in the mock data.
- No real testimonials, press, partners or sales figures exist; none may be invented.

## Product Principles

1. Vehicles first: the photo, price and location of a listing outrank chrome.
2. Every path ends in an action a buyer can take on the site (apply, message, compare).
3. One system across buyer, seller and admin surfaces.
