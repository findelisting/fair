# ADR 0002: QR redirect and scan log (slice 2), record first, then redirect

- Status: Accepted (2026-11-26)
- Date: 2026-11-26
- Scope: BUILD_PLAN.md slice 2, SPEC.md §6 ("A scan of a test code creates a scan event that appears on the dashboard within 10 seconds", "The redirect reaches the target page with sku and campaign parameters")
- Spec: [docs/specs/slice-2-qr-redirect.md](../specs/slice-2-qr-redirect.md)

## Context

Every demo starts with a phone scanning a printed code. The scan must reach the product page every time, and it must appear on the dashboard within 10 seconds. We compared two approaches:

- **Option A:** save the scan, then send the redirect.
- **Option B:** send the redirect at once and save the scan afterwards with Next.js `after()`.

We chose option A. The live scan appearing on the dashboard is the key moment of the demo, so the write must be reliable and visible when it fails. Option B would save about 50 ms that nobody notices.

Before writing this ADR we stress-tested option A as first sketched in BUILD_PLAN.md slice 2: look up the code, write the scan with a one-second limit, then redirect. The test found 4 problems that would break the demo and 8 smaller ones.

### Stress test of the first sketch

| # | Finding | Effect if ignored | Fix (see Decision) |
|---|---|---|---|
| 1 | **The lookup also needs the database.** "Fail open" only covered the write. If the database is down, the lookup fails, and we do not know where to send the phone | Every scan fails exactly when the database has a problem, which is the case fail-open was meant to cover | Static fallback table of codes (decision 3) |
| 2 | **Two round trips** (lookup, then write) in a row | Double the wait, and double the chance of hitting the timeout | One database function does both (decision 2) |
| 3 | **A timeout drops the write.** After the timeout we redirect, and on Vercel the function may stop before the slow write finishes | Scans silently lost on a slow day | Keep the write alive with `after()` after a timeout (decision 4) |
| 4 | **`HEAD` requests.** If only `GET` is defined, a `HEAD` may be answered by the `GET` handler and record a scan | Link checkers and some preview bots add fake scans | Define `HEAD` explicitly; it never records (decision 6) |
| 5 | The plan said "rate limiter" but not what happens on the limit. A 429 sends a real customer to an error page | A busy room of phones on one Wi-Fi address could be blocked | Over the limit: still redirect, just do not record (decision 7) |
| 6 | Bad slugs (`/r/<script>`, 5,000 characters) go to the database | Pointless load; easy to flood | Check the slug shape first; reject without a database call (decision 5) |
| 7 | Query strings on the incoming URL (`/r/d92-at?sku=evil`) | Parameter injection into the target page | Ignore incoming query strings; build the target only from stored data (decision 8) |
| 8 | Missing or empty user agent (scripts, some scanners) | Unclear whether to count it | Empty user agent counts as a bot (decision 6) |
| 9 | Apple iMessage previews use a Facebook/Twitter user agent, not "Apple" | A plain "iMessage" match would miss them | Bot list matches the real preview user agents (spec section 4) |
| 10 | **End-to-end tests write real scans into the only demo database** (the free plan allows no second project) | Test scans appear on the dashboard in front of the client | Tag test scans and delete them after each run (decision 10) |
| 11 | `/code-inactive` is a slice 3 page, but slice 2 redirects to it | Redirect to a 404 | Move a minimal `/code-inactive` page into slice 2 |
| 12 | The seed data lives in `scripts/`, but the app now needs it for the fallback table | App code importing from scripts | Move the catalogue to `lib/catalog.ts`; scripts import from there |

Known limits we accept:

- **Deactivated code while the database is down.** The fallback table cannot know about a code that was switched off in the database. It still redirects. Acceptable for a demo: codes are only switched off by hand.
- **No de-duplication.** De-duplicating scans would need an identifier per phone, which the privacy rules forbid. A phone that scans twice counts twice.
- **iPads report themselves as Macs.** They show as `desktop`. Acceptable.

## Decision

1. **Record first, then redirect** (option A). `app/r/[code]/route.ts` stays thin. The logic lives in `lib/redirect.ts`, with the database call, clock, rate limiter and scheduler passed in, following Finde's `lib/shortLinkRedirect.ts`. This makes every branch testable with fakes.

2. **One round trip.** A new database function `record_scan(...)` looks up the code, writes the scan when the code is active and recording is wanted, and returns the target. It runs as the service role only; `anon` and `authenticated` cannot call it. It records nothing for unknown or inactive codes.

3. **Static fallback for the lookup.** The seeded codes are fixed, so the app ships with the same table (`lib/catalog.ts`, the one source for both the seed and the fallback). If `record_scan` fails or times out, the route finds the target in that table and redirects. The scan is then lost or late, and the reason is logged. A code that is in neither the database nor the table goes to `/code-inactive`.

4. **Timeout budget: 800 ms, then hand over.** The route waits at most 800 ms for `record_scan`. If it is slower, the route redirects using the fallback table and passes the still-running call to `after()`, so the write can still finish. The call is aborted after 5 seconds in total. The demo keeps its scan on a slow day, and the phone never waits more than 800 ms.

5. **Check the slug before the database.** Lowercase it, then require `^[a-z0-9-]{3,32}$`. Anything else goes straight to `/code-inactive` with no database call.

6. **Counting rules.**
   - `GET` records a scan.
   - `HEAD` is defined explicitly. It returns the same redirect and never records.
   - Bot user agents, including an empty one, are recorded with `is_bot = true`. The dashboard leaves them out.
   - Device type and language come from headers. No IP address is read into the database or the logs.

7. **Rate limit without blocking.** The in-memory limiter from Finde (60 per minute per address) decides only whether to record. Over the limit, the phone is still redirected, with no record. The address is used in memory only, for one minute, and never stored or logged.

8. **Targets come only from stored data.** The incoming query string is ignored. The target is built from the code's target type, SKU or collection, campaign and market. The origin is `PUBLIC_BASE_URL` in production, never the `Host` header. Locally and on previews it is the request's own origin, as in Finde's `redirectOrigin()`.

9. **Response.** A 302 with `Cache-Control: no-store`. A diagnostic header `X-Finde-Scan` says what happened (`recorded`, `bot`, `head`, `rate-limited`, `fallback`, `late`, `invalid`, `unknown`, `inactive`). It holds no personal data and makes the tests and the demo runbook simple.

10. **Tests never pollute the demo data.** End-to-end requests send `Accept-Language: x-e2e`, a private-use language tag. A Playwright global teardown deletes every scan with `language = 'x-e2e'`. Nothing else in the app produces that value.

## Consequences

- A scan reaches the product page even when the database is down, slow or paused.
- On a slow day the phone waits at most 800 ms, and the scan usually still lands through `after()`.
- Bots, `HEAD` requests and floods do not inflate the numbers, and no customer is ever blocked.
- One new migration (`record_scan`) and one new shared module (`lib/catalog.ts`). `scripts/seedData.ts` becomes a thin re-export, so `npm run seed` and `npm run reset` keep working.
- A minimal `/code-inactive` page moves from slice 3 into slice 2. Slice 3 styles it.
- The redirect targets (`/p`, `/f`, `/c`) do not exist until slice 3. Slice 2 tests check the `Location` header, not the page behind it.
- **Plan change:** BUILD_PLAN.md slice 2 is replaced by the spec. Slice 3 loses the `/code-inactive` task.

## Alternatives considered

- **Option B: redirect first, write with `after()` only.** Fastest, but a failed write is invisible, and the write can be cut off. Rejected; its useful part survives as the slow-path hand-over in decision 4.
- **Two queries (lookup, then insert) from the route.** Simpler SQL, but two round trips. Rejected (finding 2).
- **Return 429 over the rate limit.** Protects the database but can block real customers in a busy room. Rejected (finding 5).
- **A separate test database for end-to-end tests.** Cleanest, but the free plan allows no second project. Rejected in favour of tagging and cleanup (decision 10).
- **De-duplicate scans per phone.** Needs an identifier, which the privacy rules forbid. Rejected.
