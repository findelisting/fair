# Slice 4 spec: dashboard with live data and demo password

Implements [ADR 0007](../adr/0007-dashboard.md).

## Gate

| Id | Behaviour |
|---|---|
| G-1 | Without a valid session cookie, `/dashboard`, `/dashboard/codes` and any `/dashboard/...` page redirect (307) to `/login?next=<path>` |
| G-2 | Without a valid cookie, `/api/dashboard`, `/api/agent` and `/api/insight-check` return 401 JSON `{ error: 'sign in required' }` |
| G-3 | Correct password: one cookie `finde_demo_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 7 days, `Secure` in production; then redirect to `next` |
| G-4 | Wrong password: same message "That password did not work." every time; after 5 tries per minute per address: "Too many tries. Wait a minute." |
| G-5 | `next` is followed only when it starts with one `/` (not `//`, not `/\`); otherwise `/dashboard` |
| G-6 | Tampered, expired, malformed or empty cookie is rejected |
| G-7 | Password or secret not set: login shows "Dashboard not configured." and never signs in |
| G-8 | Public pages (`/p`, `/c`, `/f`, `/r`) set no cookie and need no password |

## Data

| Id | Behaviour |
|---|---|
| D-1 | `dashboard_summary(p_view, p_id, p_market, p_campaign)` returns one JSON object: `scans`, `pageViews`, `feedback`, `web`, `asOf` |
| D-2 | Every count is split `{ live, synthetic }`; bots excluded; last 60 days; days in Europe/Berlin |
| D-3 | Product view: rows for that SKU. Collection view: rows for the collection's own code plus its member SKUs, with a per-SKU breakdown |
| D-4 | Optional market and campaign filters narrow every block, web metrics included |
| D-5 | Feedback block: count, average rating, theme counts, last 5 live comments (ts, rating, taste note, free text cut to 140 characters, campaign, market) |
| D-6 | `GET /api/dashboard`: params checked against the catalogue; bad view, id, market or campaign returns 400; `Cache-Control: no-store` |

## Page

| Id | Behaviour |
|---|---|
| P-1 | Defaults: product view, `dark-92`, no filters. Unknown params fall back to defaults |
| P-2 | View switch, picker and filters as a GET form; values kept in the URL |
| P-3 | Panels: Scans (total, by day, by campaign, by market; by SKU in collection view), Page views, Feedback (themes with one example each, recent comments), Website metrics. Each has a `DataBadge` from its own live/synthetic split; Website metrics is always "Synthetic data" |
| P-4 | Polls every 5 s. A failed poll keeps the last numbers and shows "Reconnecting"; the next good poll clears it. A 401 sends the browser to `/login` |
| P-5 | A panel with zero rows shows `EmptyState` |
| P-6 | Product view shows Market context, Ideas to test and Packaging ideas for the selected SKU; each card has "Useful and accurate?" with 👍 and 👎, once per card per browser session |
| P-7 | `POST /api/insight-check { cardId, answer: 'up' | 'down' }` stores card id, answer and time; unknown card or answer returns 400 |
| P-8 | `/dashboard/codes` works in production behind the gate (no dev-only guard) |

## Tests

- Unit `tests/unit/session.spec.ts`: G-3 token round trip, G-5, G-6, password compare.
- Unit `tests/unit/dashboard.spec.ts`: P-1 params, D-6 checks, badge kind, summary normalising, insight card ids.
- e2e `tests/e2e/dashboard.spec.ts`: G-1, G-2, G-3, G-4, G-8, D-6, test feedback appears, collection view and filters, P-7, P-8. G-7 is covered by `gateConfig()` and checked by hand (the test servers are configured).
- Browser `tests/browser/dashboard.spec.ts`: login flow; panels and badges; a test scan shows on the open dashboard within 10 s (runs after the redirect tests, which count scans per code); filters in the URL; "Reconnecting" when `/api/dashboard` fails, last numbers kept; insight check once per card.
- Slice 6 handover: `tests/browser/agent.spec.ts` now runs on the dashboard; `/preview/agent` deleted; `/api/agent` guard removed.
- e2e `tests/e2e/insights.spec.ts`: moved from `/preview/insights` to the dashboard.
