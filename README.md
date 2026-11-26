# Finde × fairafric demo prototype

A clickable sales demo: a QR code on the pack opens a product page, every scan and feedback answer is recorded per SKU, campaign and market, and a dashboard with a product agent shows what the data says. It is a prototype for a sales conversation, not production software. Scope: [SPEC.md](SPEC.md). Plan: [BUILD_PLAN.md](BUILD_PLAN.md). Decisions: [docs/adr](docs/adr).

> Status (2026-11-26): slices 0 to 3, 5, 7 and 8 are built. The dashboard (slice 4) and the product agent (slice 6) are in progress. Sections that depend on them say "pending".

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · Supabase Postgres (separate demo project, EU) · Vercel (region `dub1`) · Playwright for all tests.

What is real and what is mocked:

| Real | Synthetic or static (labelled in the UI) |
|---|---|
| QR redirect `/r/<code>` and the scan log | 60 days of scan, page-view and feedback history |
| Product, collection and feedback pages | Website metrics (sessions, page views, video plays, shop clicks) |
| Feedback form (no names, no contact details) | Competitor references (with source and date) |
| Dashboard and agent counts over live + synthetic data | Hypotheses and packaging ideas ("not validated") |

No video is hosted, no cookies or trackers are set on public pages, and no external AI model is called.

## Requirements

- Node.js 24 and npm.
- A Supabase project used only for this demo. Never point this app at Finde production.
- The Supabase CLI is run through `npx` by `npm run db:push`; no global install needed.
- On Windows the native Next.js compiler may be blocked; Next falls back to WASM automatically. Keep `next.config.ts` free of local imports.

## Install

```bash
npm install
npx playwright install chromium   # only for the browser tests
cp .env.example .env.local
```

## Environment variables

Set in `.env.local` (local) and in Vercel **production** settings (deploy). All are server-only.

| Variable | What it is | Needed for |
|---|---|---|
| `SUPABASE_URL` | Demo project URL | App, scripts, tests |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...`) | App, scripts, tests |
| `DEMO_SUPABASE_PROJECT_ID` | Project ref; scripts refuse to run if it does not match `SUPABASE_URL` | Scripts, tests |
| `SUPABASE_DB_URL` | Session pooler connection string (not the direct `db.<ref>` host) | `npm run db:push` only, local |
| `SUPABASE_PUBLISHABLE_KEY` | Public key, used only to prove it can read nothing | `npm run check:rls` |
| `PUBLIC_BASE_URL` | Public origin, e.g. `https://fairafric-demo.thefindeapp.com` | QR codes and redirects |
| `DEMO_DASHBOARD_PASSWORD`, `DEMO_SESSION_SECRET` | Dashboard gate | Pending slice 4 |

## Run

```bash
npm run db:push   # apply supabase/migrations to the demo project (once, and after new migrations)
npm run seed      # catalogue + synthetic history
npm run dev       # http://localhost:3000
```

Try a code: open `http://localhost:3000/r/d92-at`. It records a scan and redirects to the Dark 92% product page.

Demo codes (fixed, survive every reset): `d92-at`, `oat-de`, `haz-ch`, `fb-d92` (feedback form), `vc-de` (collection).

Printable QR sheet: `http://localhost:3000/dashboard/codes` (dev only until the dashboard gate exists). Codes printed from localhost point nowhere for others; print from the deployed URL. To put a logo in the centre of the codes, save the client's file as `public/brand/fairafric-logo.svg`.

## Seed and reset

| Command | What it does |
|---|---|
| `npm run seed` | Upserts the catalogue (SKUs, collection, markets, campaigns, codes), then replaces all synthetic rows with fresh history ending today (Europe/Berlin). Live scans and feedback are kept. Safe to run more than once |
| `npm run reset` | Deletes **all** demo data, live included, then seeds again. Use before a demo |
| `npm run check:rls` | Proves the public key can read no table |

Synthetic data ages: its last day is the day you seed. Reset the day before a demo.

Both scripts refuse to run unless `SUPABASE_URL` belongs to `DEMO_SUPABASE_PROJECT_ID`.

## Tests

```bash
npm run typecheck
npm run lint
npm run test:unit    # pure logic, no server, no database
npm run test:e2e     # HTTP tests (project e2e) and Chromium tests (project browser) against a dev server
```

`test:e2e` starts its own dev servers on ports 3100 (normal) and 3101 (database switched off). It writes test scans to the demo database and deletes them afterwards.

**Never run `npm run test:e2e` on demo day after the final reset.** Its cleanup deletes live page views created since the run started.

## Deploy (Vercel + Supabase)

1. Apply migrations: `npm run db:push`.
2. In Vercel, set the environment variables above for **production only**.
3. Attach `fairafric-demo.thefindeapp.com`, check HTTPS, and check functions run in `dub1`.
4. Turn on deployment protection for preview deployments.
5. Deploy, then run `npm run reset` locally against the demo project.
6. Print the QR sheet from the deployed URL and scan each code with a phone.

Full steps: BUILD_PLAN.md slice 12. Demo flow: [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Criteria: [ACCEPTANCE.md](ACCEPTANCE.md).
