# Finde × fairafric: Build Plan

Revised 2026-11-25 for option B (match the Finde stack) and the stress test in APPROACH.md section 15. This plan breaks the demo prototype into build slices. It follows [APPROACH.md](APPROACH.md), and [SPEC.md](SPEC.md) stays the source of truth for scope.

How to use this plan:
- Build the slices in order. Each slice depends only on the slices before it.
- Each slice ends with a working, demoable state and a "Done when" check.
- Do not start a slice until the previous slice passes its check.
- We pick one slice at a time. Nothing is built until the user says go.
- Size: S is under half a day, M is about one day, L is more than one day.

## Decisions so far

| Decision | Choice |
|---|---|
| Stack | Option B: Next.js 16, Supabase (separate demo project, EU), Vercel, Tailwind, Radix/shadcn, Playwright |
| German toggle | Not needed now. Slice 9 is deferred |
| Dashboard order | Panels are built empty first. Synthetic data fills them in slice 5 |
| Reference clones | Read-only. Moved outside this repo. Patterns copied, never imported |
| Dashboard access | One shared demo password, given to the client. Branded sign-in page, session cookie on the dashboard only |
| Database account | New Supabase account and project. No demo tables in the Finde production database |
| Domain | `fairafric-demo.thefindeapp.com` (confirmed 2026-11-26) |

## Project layout

```
app/
  layout.tsx                 banner on every page, noindex
  r/[code]/route.ts          QR redirect (thin; logic in lib/redirect.ts)
  p/[sku]/page.tsx           product page
  c/[collection]/page.tsx    collection page
  f/[sku]/page.tsx           feedback form
  code-inactive/page.tsx     unknown or inactive code
  dashboard/page.tsx         dashboard (product and collection views)
  dashboard/codes/page.tsx   printable QR sheet (demo only)
  api/feedback/route.ts      feedback submit
  api/dashboard/route.ts     dashboard data (polled)
  api/agent/route.ts         agent answers
proxy.ts                     demo password on /dashboard and its APIs
lib/
  supabaseServer.ts          server-only Supabase client (service-role key)
  redirect.ts                redirect logic, testable with a fake store and clock
  rateLimit.ts               in-memory limiter (adapted from Finde)
  (security headers live in next.config.ts, adapted from Finde, no video frame sources)
  ua.ts                      device type, language, bot detection
  tracking.ts                scan and page-view writes, fail open
  themes.ts                  taste note to theme mapping
  queries.ts                 calls to dashboard SQL views and functions
  agent.ts                   agent questions, templates, sources
components/
  DemoBanner.tsx  DataBadge.tsx  HypothesisLabel.tsx  SourceList.tsx  EmptyState.tsx
data/
  competitors.json  hypotheses.json
supabase/
  config.toml
  migrations/                timestamped SQL: tables, RLS, views, functions, reset_demo()
scripts/
  seed.ts  reset.ts  synthetic.ts
tests/
  unit/                      Playwright unit tests
  e2e/                       Playwright end-to-end tests
```

## Slice 0: Repo and accounts setup (S)

Tasks:
1. Move `~/finde-reference` out of the repo to `Desktop/finde-reference`. Do not change its contents.
2. Rename the branch `master` to `main`.
3. Add `.gitignore`: `node_modules`, `.next`, `.env*` (except `.env.example`), `test-results`, `playwright-report`.
4. **User:** create a new Supabase account, then a demo project in the EU. Done: Ireland (`eu-west-1`). Never use the production project.
5. Create a new Vercel project under the Finde team (paid plan), with the function region `dub1` (Dublin), next to the database.
6. **User:** add the DNS record for `fairafric-demo.thefindeapp.com` (confirmed), pointing to the demo Vercel project. The printed QR codes depend on it.
7. Commit CLAUDE.md, SPEC.md, APPROACH.md and BUILD_PLAN.md.

Needs from the user:
- The new Supabase project URL, project ID and service-role key. Put them in `.env.local` yourself; do not paste the key into chat.
- Access to the Finde Vercel team.
- DNS access for `thefindeapp.com`.

Done when:
- `git status` is clean on `main`.
- No production code is inside the repo.
- Both demo projects exist.

## Slice 1: Foundation (M)

Tasks:
- Scaffold Next.js 16 with App Router, TypeScript and Tailwind. Match the Finde frontend versions and its ESLint config.
- Add shadcn/Radix, `lucide-react` and `@supabase/supabase-js`.
- Write `lib/supabaseServer.ts`:
  - Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, server-only.
  - Imports `server-only` so a client import fails the build.
- Write the first migration in `supabase/migrations/`:
  - All tables from APPROACH.md section 3.
  - RLS on for every table, with no policies.
  - The `reset_demo()` function, which empties the data in one transaction.
- Write `scripts/seed.ts` for the catalogue only: 3 SKUs, 1 collection, 8 markets, 4 campaigns, and codes with fixed slugs.
- Write `scripts/reset.ts`. It refuses to run unless the Supabase project ID matches `DEMO_SUPABASE_PROJECT_ID`, then calls `reset_demo()` and the seed.
- Add the scripts `npm run seed`, `npm run reset`, `npm run test:unit` and `npm run test:e2e`.
- Add `.env.example` listing every variable with no values.
- Add `vercel.json` with `"regions": ["dub1"]`. This pins the function region in code, so it does not depend on the Vercel dashboard setting.
- Adapt `lib/securityHeaders.ts` from Finde (no video frame sources) and wire it up in `next.config.ts`.
- Build the shared UI:
  - `DemoBanner` ("Demo prototype, synthetic data") and `noindex` in the root layout.
  - `DataBadge` (Live or Synthetic data), `HypothesisLabel`, `SourceList`, `EmptyState`.

Done when:
- `npm run reset` builds the catalogue in the demo Supabase project.
- With a wrong project ID, `npm run reset` refuses to run.
- A query with the anon key returns no rows.
- `npm run dev` shows a home page with the banner.

## Slice 2: QR redirect and scan log (M)

> **Superseded (ADR 0002 accepted 2026-11-26):** the detailed design, stress test and tests for this slice are in [docs/adr/0002-qr-redirect-and-scan-log.md](docs/adr/0002-qr-redirect-and-scan-log.md) and [docs/specs/slice-2-qr-redirect.md](docs/specs/slice-2-qr-redirect.md). The task list below is the original sketch.

Tasks:
- Write `lib/ua.ts`:
  - Device type: mobile, tablet or desktop.
  - Language: the first entry of `Accept-Language`.
  - Bot flag: a list of link-preview user agents (WhatsApp, iMessage, Slack, Teams, Telegram, Facebook) and crawlers.
- Write `lib/rateLimit.ts`, adapted from Finde's `createLimiter`.
- Write `lib/redirect.ts`, following Finde's `shortLinkRedirect.ts` pattern with injected store and clock:
  1. Look up the code (short TTL cache). If it is unknown or inactive, go to `/code-inactive` and record nothing.
  2. Write the scan event (no IP). If the write fails or takes longer than about one second, log the error and redirect anyway.
  3. Build the target from the canonical origin and the stored code only.
  4. Return a 302 with `Cache-Control: no-store`. Do not count `HEAD` requests.
- `app/r/[code]/route.ts` only wires up `lib/redirect.ts`.
- Unit tests:
  - `ua.ts`: device types and every bot user agent in the list.
  - `redirect.ts`: valid code, unknown code, inactive code, slow store (still redirects), failing store (still redirects), forged `Host` header (target unchanged).

Done when:
- Opening `/r/<code>` creates a scan row and lands on the target with the right parameters.
- A WhatsApp user agent is stored with `is_bot = true`.
- With the database switched off, the redirect still works.
- All tests pass.

## Slice 3: Public pages and feedback (M)

> **Superseded (ADR 0003 accepted 2026-11-26):** the design, stress test and tests for this slice are in [docs/adr/0003-public-pages-and-feedback.md](docs/adr/0003-public-pages-and-feedback.md) and [docs/specs/slice-3-public-pages-and-feedback.md](docs/specs/slice-3-public-pages-and-feedback.md). The feedback form uses a Server Action, not `/api/feedback`. The task list below is the original sketch.

Tasks:
- Product page `/p/[sku]`:
  - Demo content and a placeholder image.
  - Links to the feedback form and the shop. The shop link is a demo link.
  - A link out to the brand's video page. No embed.
- Collection page `/c/[collection]`: lists its SKUs. Each link carries the campaign and market.
- Feedback form `/f/[sku]`:
  - Fields: rating 1–5, taste note (fixed choice) and optional free text (500 characters).
  - A usage notice, and a hint not to enter personal details.
  - A hidden honeypot field.
  - No name, email or contact fields.
- Write `lib/themes.ts`, which maps each taste note to a theme.
- `api/feedback`:
  - Check SKU, campaign and market against the database, check the field values, and apply the rate limiter and honeypot.
  - Store the answer with its themes and `source = live`, then show a thank-you state.
- Write `lib/tracking.ts`. Product, collection and feedback pages record a server-side page view, with no cookies, and fail open.
- Style the `/code-inactive` page (a minimal version is built in slice 2, see ADR 0002).
- Mobile layout first. These pages are opened from a phone scan.
- End-to-end test: scan to product page to feedback submit, then check the stored row.

Done when (checkpoint A):
- Scan, product page, feedback form and submit work end to end on a phone.
- The feedback row holds SKU, campaign and market.
- Page views are recorded.
- No page sets a cookie.

## Slice 4: Dashboard with live data (L)

Tasks:
- Migration: SQL views and functions for the dashboard numbers (scans by day, campaign and market; page views; feedback summary and themes). Bots are left out in SQL.
- Demo password gate:
  - A branded `/login` page with one password field and the demo banner.
  - On a correct password, set one signed, `HttpOnly`, `Secure`, `SameSite=Lax` session cookie, valid for 7 days.
  - `proxy.ts` checks the cookie on `/dashboard`, `/api/dashboard` and `/api/agent`. Without it, pages go to `/login` and APIs return 401.
  - Wrong passwords are rate limited. The compare is constant-time.
  - The password comes from `DEMO_DASHBOARD_PASSWORD`, and the cookie is signed with `DEMO_SESSION_SECRET`.
  - Unit tests: right password, wrong password, rate limit, tampered cookie, expired cookie.
- `api/dashboard` takes these parameters:
  - `view`: product or collection.
  - `id`.
  - `market` and `campaign`: optional filters.
- It returns the scan totals, scans over time, scans by campaign and market, page views by page, and the feedback summary and themes, split by live and synthetic.
- `dashboard/page.tsx`:
  - A view switch (product or collection) and a SKU or collection picker.
  - Market and campaign filters, kept in the URL.
  - Panels for scans, page views and feedback, each with a `DataBadge`.
  - Polls every 5 seconds. If a poll fails, keep the last data and show "Reconnecting".
- Charts: simple bars and lines. Keep them light.
- Gate `/dashboard/codes` (slice 8) with the demo password and remove its dev-only `notFound()` guard (ADR 0004).
- Product view: place `CompetitorPanel`, `HypothesesPanel` and `PackagingPanel` with the selected `sku` (ADR 0001, amendment 2). Delete `app/preview/insights` and point `tests/e2e/insights.spec.ts` at the dashboard.
- "Useful and accurate?" check: one-tap thumbs up or down at the end of each insight card, at most once per card per session, optional. Store card id, answer and timestamp only, no user identity (ADR 0001, amendment 2).
- Panels start empty until slice 5 adds synthetic data. Each panel shows a clear `EmptyState`.
- End-to-end test: a request to `/r/<code>` shows up on the dashboard within 10 seconds.

Done when:
- A phone scan appears on the dashboard within 10 seconds.
- Submitted feedback appears with SKU, campaign and market.
- Both views and both filters work.
- The dashboard asks for the demo password; the public pages do not.

## Slice 5: Synthetic data (M)

Tasks:
- `scripts/synthetic.ts`, a deterministic generator with a fixed random seed. All dates are relative to the reset day:
  - About 60 days of `web_aggregates`: sessions, page views, video plays and shop clicks per SKU, campaign and market.
  - Synthetic scan history and page views.
  - Synthetic feedback with themes (bitterness, packaging, origin, sweetness, texture), `source = synthetic`, and one anonymised example sentence per theme.
- Shape the data so the three agent questions have clear answers. For example, Austria leans to one wrapper, and the 92% bar leans to bitterness.
- Hook the generator into `npm run seed`.
- Add the web metrics panel to the dashboard, marked Synthetic data.

Done when (checkpoint B):
- After a reset, every dashboard panel shows data that ends today.
- Every synthetic panel carries the Synthetic data badge.

## Slice 6: Product agent (M)
> **Superseded (ADR 0006 accepted 2026-11-26):** design, stress test and tests are in [docs/adr/0006-product-agent.md](docs/adr/0006-product-agent.md) and [docs/specs/slice-6-product-agent.md](docs/specs/slice-6-product-agent.md). Four questions; the fourth is "What do comparable dark bars cost?". The task list below is the original sketch.

Tasks:
- Migration: one SQL function per agent question.
- `lib/agent.ts` holds four fixed questions: the three from SPEC, plus "How does the 92% bar compare on price?", answered from `lib/insights.ts` as a snippet with its sources (ADR 0001, amendment 2). Optional fifth: "What packaging changes could lift scans?" (amendment 3). Each has:
  - Its SQL function.
  - A text template for the answer.
  - A sources object: tables, filters, row counts, as-of time (Europe/Berlin), and live, synthetic or both.
- `api/agent` takes a question id and returns the answer and its sources.
- An agent panel on the dashboard: three question buttons, the answer, and a `SourceList` under it.
- Unit tests: each question returns an answer and at least one source.

Done when:
- All four questions answer with sources.
- A new live scan in Austria can change the answer to question 1.

## Slice 7: Competitor panel and hypotheses (S)

Tasks:
- `data/competitors.json` holds one or two products. Each has the product, retailer, price, pack size, packaging note, source URL and access date.
- The loader rejects any entry without a source URL and date. Unit test for this.
- Researched values are shown as they are, with source and date. No human review step for the demo (ADR 0001); review guardrails come with the pilot.
- `data/hypotheses.json` holds two or three hypotheses, each with a statement and its data basis.
- A third card, "Packaging ideas", from `data/packaging.json`: research-backed suggestions for the branding team, each labelled "Suggestion, not validated" with its data basis and linked sources (ADR 0001, amendment 3).
- All three are snippet cards in the dashboard product view, filtered per SKU. Every hypothesis carries a `HypothesisLabel`. Prices read from search results show with `~`; related products appear as "Also worth a look" links (ADR 0001, amendment 2).

Done when (checkpoint C):
- Every competitor value shows a source and date.
- Every hypothesis is labelled "Hypothesis, not validated".
- Every step of the 10-minute demo works locally.

## Slice 8: QR sheet (S)

Tasks:
- `dashboard/codes`: a printable page with one QR image per code. Use the `qrcode` package, built from `PUBLIC_BASE_URL`.
- Each QR shows its label (SKU or collection, campaign, market) and a "Demo only" note.
- The page warns if `PUBLIC_BASE_URL` is a localhost or preview URL.

Built per [ADR 0004](docs/adr/0004-qr-sheet.md) and [the slice 8 spec](docs/specs/slice-8-qr-sheet.md): fairafric logo on a white centre pad (official file at `public/brand/fairafric-logo.svg`, placeholder until supplied), level H, every code decoded by a `jsQR` browser test. Dev-only until slice 4 gates `/dashboard`.

Done when: a printed sheet scans correctly from a phone against the deployed URL.

## Slice 9: German toggle (deferred, not in the current build)

Decision (2026-11-25): not needed now. Skip this slice. The tasks below stay for later reference.

Tasks:
- `lib/i18n.ts` with English and German strings for the public pages and the dashboard.
- A language switch, kept in a query parameter. No cookie.
- "Finde" and "fairafric" are never translated.

## Slice 10: Hardening and label audit (S)

Tasks:
- Automated checks (Playwright and CI):
  - The banner and `noindex` on every route.
  - No `Set-Cookie` header and no third-party requests on the public pages.
  - No `<video`, `<iframe` or video files in the repo.
  - No contact fields in the feedback form or schema.
  - The service-role key never appears in the browser bundle.
- Manual pass:
  - Every panel badge and hypothesis label.
  - No claims (climate, compliance, certification) in any text.
  - Test on a real phone over mobile data.

Done when: every SPEC §6 criterion passes, automated where possible.

## Slice 11: Docs (S)

Tasks:
- `README.md`: requirements, install, environment variables, run, seed, reset, tests, and Vercel and Supabase deploy.
- `DEMO_SCRIPT.md`:
  - The 10-minute flow from SPEC section 5, with exact clicks and the three agent questions.
  - The demo-day runbook from APPROACH.md section 16: day before, one hour before, and fallbacks.
- `ACCEPTANCE.md`: each SPEC §6 criterion, how it is met, and how to check it. Use the table in APPROACH.md section 14.
- Backup screenshots of each demo step, kept on the laptop (not in the app).

Done when: a person who has never seen the repo can run, seed and reset the demo from the README alone.

## Slice 12: Deploy (S)

Tasks:
1. Apply the migrations to the demo Supabase project.
2. Set the environment variables on Vercel for **production only**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_SUPABASE_PROJECT_ID`, `DEMO_DASHBOARD_PASSWORD`, `DEMO_SESSION_SECRET`, `PUBLIC_BASE_URL` (the `thefindeapp.com` subdomain).
3. Attach the `thefindeapp.com` subdomain to the Vercel project and check HTTPS works. Check in the deployment details that functions run in `dub1`.
4. Turn on deployment protection for preview deployments.
5. Deploy, then run `npm run reset` against the demo project.
6. Print the QR sheet from the deployed URL.
7. Run the full demo script once on the deployed app, including the fallbacks.

Done when (checkpoint D): the full demo runs on the deployed URL from a printed code.

## Order and checkpoints

| Checkpoint | After slice | What we can show |
|---|---|---|
| A | 3 | Scan, redirect, product page, feedback on a phone |
| B | 5 | Live dashboard with synthetic context |
| C | 7 | All demo steps from SPEC section 5, locally |
| D | 12 | Deployed demo with printed codes |

Review with the team at each checkpoint before the next slice.

## Needed before or during the build

| Item | Needed by | Default if not answered |
|---|---|---|
| New Supabase account and demo project | Slice 0 | None. The user creates it |
| Vercel team access | Slice 0 | Finde team, paid plan |
| DNS record for `fairafric-demo.thefindeapp.com` | Slice 0 (before printing in slice 8) | Subdomain confirmed; DNS record still to add |
| Real SKU names | Slice 1 | 92% bar and two vegan Creamy bars, with generic names |
| Cleared product photos | Slice 3 | Neutral placeholder images |
| Competitor products | Slice 7 | Researched by Claude, shown with source and date, no review step (ADR 0001) |
