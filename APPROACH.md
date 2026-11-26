# Finde × fairafric: Build Approach for the Demo Prototype

Status: draft, revised 2026-11-25 for option B (match the Finde stack) and a stress test. SPEC.md is the source of truth for scope. CLAUDE.md is the task brief. This document says how we build the prototype and settles the gaps that SPEC.md leaves open. The task-level breakdown is in [BUILD_PLAN.md](BUILD_PLAN.md).

## 1. Purpose

We are building a clickable prototype for the first sales conversation with the fairafric marketing team. A non-technical person must be able to click through it in about 10 minutes. It is not production software. It must, however, survive demo day: a dead database, bad venue Wi-Fi or a link-preview bot must not break it.

## 2. Stack and hosting

We match the Finde frontend stack (read from the reference clone, never imported or changed).

- **App:** Next.js 16 (App Router), React 19, TypeScript, on Node 22 or later. Same major versions as the Finde frontend.
- **UI:** Tailwind CSS, Radix/shadcn components and `lucide-react` icons, as in Finde.
- **Database:** a **separate demo Supabase project** (Postgres), in the EU region (Ireland, `eu-west-1`), under a **new Supabase account** (decided 2026-11-25). Never the Finde production project, and no demo tables in it.
- **Database access:** only from the server, with `@supabase/supabase-js` and the service-role key. The browser never talks to Supabase.
- **Schema:** SQL migrations in `supabase/migrations/`, the same layout as Finde. Grouping and counting happen in SQL views and functions, not in JavaScript.
- **QR images:** the `qrcode` package, as in Finde.
- **Tests:** Playwright for both unit and end-to-end tests, as in Finde.
- **Hosting:** Vercel, function region `dub1` (Dublin), next to the Supabase region. A separate Vercel project, not the Finde production project.
- **Domain:** `fairafric-demo.thefindeapp.com` (confirmed 2026-11-26). The DNS record points to the demo Vercel project only. The Finde production site and its storefront routing (`*.thefinde.com`) are not touched.
- **Not used:** no external LLM, no analytics cookies, no third-party scripts or trackers, no video embeds.

Patterns we copy (and adapt) from the Finde reference clone:
- `lib/shortLinkRedirect.ts`: the redirect logic lives outside the route file so it can be tested with a fake store and clock. It also brings the in-memory rate limiter and the canonical-origin rule.
- `lib/securityHeaders.ts`: security headers for every page. The demo version drops the YouTube and Vimeo frame sources, because the demo embeds no video.
- `supabase/migrations/` with timestamped file names.

## 3. Data model

The model follows SPEC.md section 4, with additions that close the gaps. All timestamps are `timestamptz`, stored in UTC.

| Table | Fields | Notes |
|---|---|---|
| `skus` | id, name, variety, format, description, status | 3 seeded SKUs. Collection membership lives only in `collection_skus`, so there is one source of truth |
| `collections` | id, name | 1 seeded collection |
| `collection_skus` | collection_id, sku_id | A collection points to several SKUs |
| `markets` | code (DE, AT, CH, FR, UK, GH, CZ, SK), name | |
| `campaigns` | id, name, channel (wrapper, shelf talker, influencer, trade fair), start, end | |
| `codes` | id (short slug), target_type (product, feedback, shop, collection), sku_id or collection_id, **campaign_id**, **market**, status | **Added:** each code carries its campaign and market |
| `scan_events` | ts, code_id, sku_id, collection_id, campaign_id, market, device_type, language, is_bot, **source** (live or synthetic) | No IP address stored. **Added:** `source`, because slice 5 adds synthetic scan history and the Live badge must stay true |
| `page_views` | ts, page (product, feedback, collection), sku_id, collection_id, campaign_id, market, **source** | **Added:** counted on the server, no cookies. Supplies agent question 2 |
| `feedback` | ts, sku_id, campaign_id, market, rating, taste_note, free_text, themes, **source** (live or synthetic) | **Added:** `source` keeps live and synthetic rows apart. Free text capped at 500 characters |
| `web_aggregates` | date, sku_id, campaign_id, market, sessions, page_views, video_plays, shop_clicks | Mock connector. Always synthetic |

Every table has row-level security switched on and **no policies**. The anon key can therefore read and write nothing. Only the server, with the service-role key, reaches the data.

## 4. Redirect rules

- `/r/:code` looks up the code, records a scan event, then returns a **302** redirect with `Cache-Control: no-store`. We do not use 301, because phones and browsers cache it and later scans would skip Finde.
- A SKU code redirects to its target page with `?sku=&campaign=&market=`.
- The collection code redirects to `/c/:collection?collection=&campaign=&market=`. That page lists the SKUs in the collection, and each SKU link carries `sku=`, `campaign=` and `market=`.
- The redirect target is always built from the canonical site origin and the code's stored target, never from the `Host` header or the query string. This blocks open redirects.
- **Market** comes from the code, not from a location lookup. In a live demo everyone scans from the same room, so a location lookup would give every scan the same country.
- **Language** comes from the `Accept-Language` header. **Device type** comes from the user agent.
- Link previews (WhatsApp, iMessage, Slack, Teams, Telegram, Facebook) and crawlers fetch URLs before the user does. Their user agents get `is_bot = true`, and the dashboard leaves them out. `HEAD` requests are not counted.
- **Fail open:** if the scan write fails or takes longer than about one second, the redirect still happens and the error is logged. A database problem must never stop a customer from reaching the product page.
- An unknown or inactive code shows a friendly "code not active" page and records nothing.

## 5. Feedback form

- The form has three questions:
  1. Rating from 1 to 5.
  2. Taste note, as a fixed choice.
  3. Optional free text, up to 500 characters.
- Each taste-note choice maps to a theme, for example "too bitter" maps to bitterness and "loved the wrapper" maps to packaging. This tags live feedback with the same themes as the synthetic data.
- The form says how answers are used: anonymous, for product improvement only.
- The form has no name, email, phone or other contact fields. The free-text field asks people not to enter personal details.
- SKU, campaign and market come from the query parameters. The server checks them against the database before it stores the answer.
- Spam protection: a hidden honeypot field and the in-memory rate limiter. The rate limiter keeps the IP address in memory only for one minute and never stores it.

## 6. Live and synthetic labelling

- Every page shows the banner "Demo prototype, synthetic data".
- Every dashboard panel carries a badge: **Live** (scans, page views, live feedback) or **Synthetic data** (web connector, synthetic feedback).
- The feedback panel shows live and synthetic answers separately, with their own counts.
- Each hypothesis carries the label "Hypothesis, not validated" and states its data basis.
- Demo-only features are labelled as such.
- Every page sends `noindex`, so no demo page can show up in search as a real fairafric page.

## 7. Dashboard

- **Views:** product view (one SKU) and collection view (all SKUs in the collection).
- **Filters:** market and campaign, kept in the URL.
- **Panels:**
  - Scan counts over time.
  - Scans by campaign and market.
  - Web metrics: sessions, page views, video plays, shop clicks.
  - Feedback summary: average rating and count.
  - Feedback themes, with counts and one anonymised example each.
- The page polls an API route every 5 seconds. A new scan therefore shows up within 10 seconds, which meets the acceptance criterion.
- Each panel has an empty state. Panels are built empty first, and synthetic data fills them in a later slice.
- If a poll fails, the panel keeps the last data and shows "Reconnecting". It does not go blank.
- Access (decided 2026-11-25): the dashboard and the QR sheet sit behind one shared demo password, which we give to the client. This is not a user account.
  - It keeps live free-text feedback and the demo tools away from anyone who finds the URL. It also shows the client that we take security seriously.
  - It is a branded Finde sign-in page, not the browser's grey Basic Auth pop-up, because the pop-up looks unfinished in front of a client.
  - A correct password sets one signed, `HttpOnly`, `Secure` session cookie, valid for 7 days, for the dashboard only. It is a strictly necessary cookie, not an analytics cookie. The public pages still set no cookies.
  - Wrong passwords are rate limited.
  - The password lives only in the `DEMO_DASHBOARD_PASSWORD` environment variable, never in the repo or the docs. It is shared with the client outside the repo and changed after the demo period.
  - The public pages (redirect, product, collection, feedback) stay open.

## 8. Product agent

- The agent offers three fixed questions:
  1. "Which packaging had the most scans in Austria?"
  2. "Which campaign drove visits to the feedback page?"
  3. "Which theme comes up most for the 92% bar?"
- Each answer is a fixed SQL function plus a text template. No LLM is called.
- Each answer shows its sources: the tables used, the filters, the row counts, the as-of time (shown in Europe/Berlin time), and whether the data is live, synthetic or both.
- Live scans count in. Question 1 can therefore change during the demo after a live scan, which is a good demo moment.

## 9. Competitor panel and hypotheses

- Competitor data lives in a static JSON file. Each value has a source URL and an access date.
- One or two public product references (retailer listing, price, packaging) are added and checked by hand before the demo. Until then, the values are clearly marked placeholders. No value is made up or generated by AI, and nothing is scraped.
- Two or three improvement hypotheses, each marked "Hypothesis, not validated", each with its data basis. Example: "Test the origin story on the 92% wrapper", based on the origin theme count and the scan rate.

## 10. Content rules

- No claims of climate neutrality, carbon offsets, compliance or certification on any page. The EU EmpCo rules apply from 27.09.2026, and fairafric reviews its own claims.
- Placeholder product images unless fairafric supplies photos cleared for use. No farm photos or photos of people without written consent.
- No video hosting or embedding. Product pages link to videos on fairafric's own site.

## 11. Seed and reset

- `npm run seed` loads:
  - 3 SKUs: the 92% bar and two vegan Creamy bars.
  - 1 collection: the vegan Creamy line.
  - The 8 markets and 4 campaigns, one per channel.
  - Codes: one per SKU, one feedback code, one collection code.
  - Synthetic data (added in slice 5): about 60 days of web aggregates, scan history and feedback with themes.
- Synthetic dates are **relative to the reset day**, so the charts always end "today" on demo day. The generator uses a fixed random seed, so every reset gives the same picture.
- `npm run reset` deletes all data, including live scans and live feedback, then reseeds. It runs one SQL function (`reset_demo()`) in a single transaction, so a failed reset leaves the old data in place.
- The reset refuses to run unless the Supabase project ID matches the demo project ID in `.env`. This stops a reset against the wrong database.
- Codes are seeded with fixed slugs, so printed QR codes keep working after every reset.

## 12. Language

The UI is in English. A German toggle is not needed now and is deferred (decided 2026-11-25).

## 13. Build order

We build in vertical slices. Each slice works on its own before the next one starts. See [BUILD_PLAN.md](BUILD_PLAN.md).

## 14. Acceptance mapping

| SPEC §6 criterion | How it is met | How to check |
|---|---|---|
| A test scan shows on the dashboard within 10 s | Scan written in `/r/:code`; dashboard polls every 5 s | Playwright test, then a phone scan |
| Redirect reaches the target page with sku and campaign | 302 with `?sku=&campaign=&market=` | Playwright test on every seeded code |
| Feedback shows with SKU, campaign and market | Stored from checked query parameters, marked live | Playwright test, then a phone submit |
| Product and collection views with market filter | Two dashboard views, market and campaign filters | Playwright test switches views and filters |
| Every agent answer lists its sources | Sources block under each answer | Playwright test asks all three questions |
| Every competitor value has a source and date | Loader rejects entries without them | Unit test on the loader |
| All synthetic data and hypotheses are labelled | Banner, panel badges, hypothesis labels | Playwright test checks the banner on every route, then a manual pass |
| No video hosted by the app | No video files or embeds; links out only | Repo search in CI for video files, `<video` and `<iframe` |
| The feedback form stores no names or contact details | No such fields in the form or table | Unit test on the schema and form fields |

## 15. Stress test (2026-11-25)

We reviewed option B for what could break on demo day or cause harm. Each finding and its fix is below. The fixes are already written into the sections above and into BUILD_PLAN.md.

| # | Risk | Effect if ignored | Fix |
|---|---|---|---|
| 1 | Supabase free projects pause after about a week without use | Database is asleep on demo day, every page fails | Wake and check the database the day before (runbook). Consider the paid plan for the demo period |
| 2 | Scan write fails or is slow | Customer scan hangs or errors in front of the client | Fail open: redirect anyway after about one second (section 4) |
| 3 | Vercel and Supabase in different regions | Slow redirect, every scan feels laggy | Supabase in Ireland (`eu-west-1`), Vercel functions in `dub1` |
| 4 | Service-role key leaks to the browser | Anyone can read or wipe the database | Key is server-only, never `NEXT_PUBLIC_`. RLS on, no policies |
| 5 | Dashboard public on the open internet | Live free text visible to anyone; reset abuse | Branded password page on dashboard and QR sheet, rate limited (section 7) |
| 5b | Demo tables inside the Finde production database | A demo leak reaches live orders and payments | New, separate Supabase account and project (section 2) |
| 6 | Feedback and scan spam | Fake data in the demo | Honeypot field, rate limiter, input checks |
| 7 | Open redirect via forged `Host` or query | Demo URL used for phishing | Target built only from canonical origin and stored code (section 4) |
| 8 | Link-preview bots | Fake scans when a code is shared in chat | Bot flag, `HEAD` not counted |
| 9 | Synthetic data dated in the past | Charts end weeks before demo day and look stale | Dates relative to the reset day (section 11) |
| 10 | Reset run against the wrong project, or fails halfway | Data lost, or demo half-empty | Project-ID guard and one transaction (section 11) |
| 11 | Printed QR codes point to a URL that changes | Printed codes go dead | Fix the demo domain before printing; slugs fixed by the seed |
| 12 | Vercel preview deployments write to the demo database | Test data mixed into the demo | Database keys set for production only; previews protected |
| 13 | Bad venue Wi-Fi or mobile signal | Live scan fails in front of the client | Runbook backup: a phone on mobile data, plus screenshots of each step on the laptop |
| 14 | Demo pages indexed by search engines | A page looks like a real fairafric page in search results | `noindex` on every page, demo banner on every page |
| 15 | Poll error blanks the dashboard | Panels flash empty in front of the client | Keep last data, show "Reconnecting" (section 7) |
| 16 | Vercel Hobby plan is for non-commercial use only | A sales demo breaks the plan's terms | Deploy under the Finde team's paid Vercel account |
| 17 | Reference clones inside the repo | Production code committed to the demo repo, or changed by mistake | Move the clones outside the repo before the first commit |

## 16. Demo-day runbook (summary)

The full checklist goes into DEMO_SCRIPT.md (slice 11).

- **Day before:** open the dashboard to wake the database. Run `npm run reset`. Scan every printed code once and check that it appears. Then reset again.
- **One hour before:** check the dashboard loads. Charge the phone. Turn on mobile data as a fallback. Open the backup screenshots on the laptop.
- **During:** if the live scan fails, switch to the second phone or the screenshots and keep going.

## 17. Open questions

- Which real SKU names do we use, and are there cleared product photos?
- Which competitor products do we compare?
- Which Vercel team hosts the demo project? Default: the Finde team (paid plan).
- How do we describe fairafric's origin: "Ghanaian chocolate brand" or "German company, made in Ghana"? Confirm before anything client-facing.

## 18. Repo housekeeping

- The `~/` folder in the repo root holds read-only clones of the Finde production repos. Do not delete or change it. Move it outside this repo before the first commit.
- Work on `main`. Rename `master` to `main` before the first commit.
