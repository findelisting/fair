# ADR 0007: Dashboard with live data and demo password (slice 4)

- Status: Accepted (2026-11-26)
- Date: 2026-11-26
- Scope: BUILD_PLAN.md slice 4, plus the handovers from slice 5 (web metrics panel), slice 6 (agent panel, gate on `/api/agent`), slice 7 (insight cards in the product view, "Useful and accurate?" check) and slice 8 (gate on `/dashboard/codes`).
- Spec: [docs/specs/slice-4-dashboard.md](../specs/slice-4-dashboard.md)

## Context

The dashboard is where the demo lands: a phone scan must show up within 10 seconds, without the screen ever going blank. We compared:

- **Option A:** the whole page renders on the server and redraws itself when something changes.
- **Option B:** the server renders the shell, the agent panel and the insight cards, with the first numbers filled in. One client component refreshes the number panels from `/api/dashboard` every 5 seconds and keeps the last data when a poll fails.

We chose B. With A, a database error during a redraw replaces the page with an error screen in front of the client.

### Stress test of option B

| # | Finding | Effect if ignored | Fix |
|---|---|---|---|
| 1 | **Gate fails open.** Password or secret missing on Vercel | Dashboard open to anyone | Fails closed: without both variables, `/login` says "Dashboard not configured" and nothing gets in (decision 1) |
| 2 | **Password guessing** | Brute force | 5 tries per minute per address, same generic message for every failure (decision 1) |
| 3 | **Timing leak** in the password compare | Password found byte by byte | Both sides hashed with HMAC, then compared in constant time |
| 4 | **Forged or old cookie** | Access without the password | Cookie holds an expiry and an HMAC-SHA256 signature over it; tampered, expired or malformed cookies are rejected. Changing `DEMO_SESSION_SECRET` signs everyone out |
| 5 | **Open redirect** via `?next=` on the login page | Phishing hop on our domain | Only same-site paths starting with a single `/` are followed; anything else goes to `/dashboard` |
| 6 | **Proxy matcher misses a path** (trailing slash, sub-path, `/api/agent`) | Data readable without the gate | Matcher covers `/dashboard/:path*`, `/api/dashboard/:path*`, `/api/agent/:path*`, `/api/insight-check/:path*`; e2e test hits each one without a cookie |
| 7 | **Cookie leaks to public pages** or public pages set cookies | Breaks "no cookies on public pages" | Only the login action sets a cookie. `HttpOnly`, `SameSite=Lax`, `Secure` in production. Public-page no-cookie tests stay |
| 8 | **Poll fails** (database blip, wifi) | Panels flash empty | Keep the last data, show "Reconnecting", retry on the next tick (decision 4) |
| 9 | **Initial render fails** | Blank page | Page still renders; panels show "Reconnecting" and the poller fills them when the database answers |
| 10 | **Stale numbers** from caching | Live scan never appears | `force-dynamic` page, `Cache-Control: no-store` API, polling every 5 s |
| 11 | **Poll storm** (several tabs, overlapping slow polls) | Database load | One RPC per poll; skip a tick while a poll is in flight; 4 s timeout; pause when the tab is hidden |
| 12 | **Supabase 1,000-row cap** | Silently short counts | All counting in one SQL function that returns a single JSON object (decision 2) |
| 13 | **Day buckets in UTC** | Evening scans land on the wrong day | Days grouped in Europe/Berlin in SQL |
| 14 | **Bots counted** | Inflated scans | `is_bot = false` in SQL |
| 15 | **Live and synthetic mixed without saying so** | Breaks the labelling rule | Every count split live/synthetic; each panel gets a `DataBadge` from its own split; web metrics always "Synthetic data" |
| 16 | **Bad parameters** (`?id=` unknown, SQL text) | Errors or injection | View, id, market and campaign checked against `lib/catalog.ts`; unknown values fall back on the page and return 400 from the API; SQL takes parameters only |
| 17 | **Free text on screen** | Script injection; personal text shown | React escapes all text, no `dangerouslySetInnerHTML`; only the last 5 live comments, cut at 140 characters, behind the gate |
| 18 | **"Useful and accurate?" abuse** | Junk rows, a cookie on the client | Behind the gate, rate limited, card id must exist in the research data; "once per card" kept in `sessionStorage`, not a cookie. Stores card id, answer and time only |
| 19 | **Other session's slice 6 still uncommitted** | Editing their files | The proxy covers `/api/agent` now. Embedding `AgentPanel`, deleting `/preview/agent` and pointing its tests at the dashboard happen after slice 6 is committed |
| 20 | **Tests need the password** | Gated tests fail | Tests read `DEMO_DASHBOARD_PASSWORD` from `.env.local` and sign in through the real login form or API; a shared helper `tests/e2e/support/auth.ts` |
| 21 | **Insights preview page left behind** | A second, ungated copy of the cards | Delete `app/preview/insights`; its e2e test moves to the dashboard |

## Decisions

1. **Gate.** `proxy.ts` checks a signed session cookie (`finde_demo_session`, 7 days) on the matched paths. Pages without it redirect to `/login?next=<path>`; APIs return 401 JSON. `/login` is a branded page with one password field and a Server Action. Logic in `lib/session.ts` (Web Crypto, pure, unit-tested).
2. **Data.** Migration adds `dashboard_summary(p_view, p_id, p_market, p_campaign)`: one call returns scans (totals, by day, by campaign, by market, by SKU), page views by page, feedback (count, average rating, themes, last 5 live comments) and web metrics (totals and sessions by day), each split live/synthetic, over the last 60 days. Collection view counts the collection's own code plus its member SKUs. Service role only.
3. **API.** `GET /api/dashboard?view=&id=&market=&campaign=` returns that object, `no-store`, rate limited.
4. **Page.** `app/dashboard/page.tsx` (Server Component): view switch, SKU or collection picker, market and campaign filters as a GET form (works without JavaScript, filters stay in the URL). `components/dashboard/LivePanels.tsx` (client) polls every 5 s and draws scans, page views, feedback and web metrics with light SVG/CSS bars. Product view adds `CompetitorPanel`, `HypothesesPanel` and `PackagingPanel` for the selected SKU, each with a "Useful and accurate?" 👍/👎.
5. **Insight check.** Table `insight_checks (id, ts, card_id, answer)`; `POST /api/insight-check`.
6. **QR sheet** loses its dev-only guard; the proxy gates it.
7. **Slice 6 handover** (after the other session commits): embed `AgentPanel`, remove the `notFound()` guard from `/api/agent`, delete `/preview/agent`, point its tests at the dashboard.
