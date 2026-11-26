# Spec: slice 2, QR redirect and scan log

- Status: Accepted (2026-11-26), ADR 0002 accepted
- Decision record: [ADR 0002](../adr/0002-qr-redirect-and-scan-log.md)
- Replaces: BUILD_PLAN.md slice 2 task list
- Build rule: the tests in section 7 are written first and fail, then the code makes them pass.

## 1. Goal

A phone scans a printed code. Finde records the scan and sends the phone to the right page with `sku`, `campaign` and `market` (or `collection`) in the URL. This works even when the database is slow, down or paused. Bots, `HEAD` requests and floods do not inflate the numbers.

## 2. Files

| File | Change |
|---|---|
| `lib/catalog.ts` | **New.** The demo catalogue (moved from `scripts/seedData.ts`): the payload, its types, `validateSeed()`, and `fallbackCode(slug)` for the static lookup |
| `scripts/seedData.ts` | Becomes a re-export of `lib/catalog.ts`, so the scripts keep working |
| `lib/ua.ts` | **New.** `deviceType(ua)`, `isBot(ua)`, `language(acceptLanguage)` |
| `lib/rateLimit.ts` | **New.** `createLimiter()`, adapted from Finde's `lib/shortLinkRedirect.ts` |
| `lib/redirect.ts` | **New.** `createRedirectHandler(deps)`, pure logic with injected dependencies |
| `app/r/[code]/route.ts` | **New.** Wires real dependencies into `lib/redirect.ts`; exports `GET` and `HEAD` |
| `app/code-inactive/page.tsx` | **New.** Minimal page: "This code is not active." Slice 3 styles it |
| `supabase/migrations/<ts>_record_scan.sql` | **New.** The `record_scan` function |
| `scripts/check-rls.ts` | Also checks that the public key cannot call `record_scan` |
| `playwright.config.ts` | Add a global teardown for test-scan cleanup |
| `tests/e2e/global-teardown.ts` | **New.** Deletes scans with `language = 'x-e2e'` |
| `tests/unit/ua.spec.ts`, `tests/unit/rateLimit.spec.ts`, `tests/unit/redirect.spec.ts`, `tests/unit/catalog.spec.ts` | **New** unit tests (section 7) |
| `tests/e2e/redirect.spec.ts` | **New** end-to-end tests (section 7) |

## 3. Request flow

```
GET /r/:code
  1. slug = lowercase(code)
     not ^[a-z0-9-]{3,32}$            -> 302 /code-inactive   X-Finde-Scan: invalid   (no database call)
  2. record = method is GET
              and limiter.allow(address)          (else X-Finde-Scan: rate-limited)
     bot    = isBot(user-agent)                    (empty user agent counts as bot)
  3. call record_scan(slug, record, device, language, bot), wait at most 800 ms
     a. returns { status: 'active', target... } -> 302 target   X-Finde-Scan: recorded | bot | head | rate-limited
     b. returns { status: 'inactive' }          -> 302 /code-inactive   X-Finde-Scan: inactive   (nothing recorded)
     c. returns null (unknown code)             -> 302 /code-inactive   X-Finde-Scan: unknown    (nothing recorded)
     d. throws                                  -> fallbackCode(slug):
                                                   found     -> 302 target         X-Finde-Scan: fallback
                                                   not found -> 302 /code-inactive X-Finde-Scan: unknown
     e. slower than 800 ms                      -> fallbackCode(slug) as in d, X-Finde-Scan: late,
                                                   and the running call is handed to after() (aborted at 5 s)
  4. Every response: status 302, Cache-Control: no-store, no Set-Cookie.
HEAD /r/:code -> same as GET with record = false, X-Finde-Scan: head (or invalid / unknown / inactive)
```

A failed or late call is logged with `console.error`: slug, reason and duration only. No IP address, no user agent.

## 4. Rules

### 4.1 Targets

The incoming query string is always ignored. The origin is `PUBLIC_BASE_URL` when `VERCEL_ENV === 'production'`, otherwise the request's own origin.

| `target_type` | Location |
|---|---|
| `product` | `/p/<sku>?sku=<sku>&campaign=<campaign>&market=<market>` |
| `feedback` | `/f/<sku>?sku=<sku>&campaign=<campaign>&market=<market>` |
| `shop` | `/p/<sku>?sku=<sku>&campaign=<campaign>&market=<market>&intent=shop` (no external shop URL exists yet) |
| `collection` | `/c/<collection>?collection=<collection>&campaign=<campaign>&market=<market>` |

Values are encoded with `URLSearchParams`. Parameter order is fixed as above.

### 4.2 Device type (`deviceType(ua)`)

- `tablet`: `iPad`, or `Android` without `Mobile`, or `Tablet`.
- `mobile`: `iPhone`, `iPod`, `Android` with `Mobile`, `Mobile`, `Windows Phone`.
- `desktop`: `Windows NT`, `Macintosh`, `X11`, `CrOS`.
- `unknown`: anything else, including empty.
- Known limit: iPads in desktop mode report `Macintosh` and count as `desktop`.

### 4.3 Bots (`isBot(ua)`)

`true` when the user agent is missing or empty, or matches (case-insensitive) any of:
`WhatsApp`, `facebookexternalhit`, `Facebot`, `Twitterbot` (also used by iMessage previews), `Slackbot`, `Slack-ImgProxy`, `TelegramBot`, `Discordbot`, `LinkedInBot`, `SkypeUriPreview` (Teams and Skype), `Microsoft Office`, `Googlebot`, `bingbot`, `Applebot`, `curl`, `wget`, `python-requests`, `HeadlessChrome`, or the generic words `bot`, `crawler`, `spider`, `preview`.

### 4.4 Language (`language(header)`)

The first tag of `Accept-Language`, without its `;q=` weight, lowercased, then:
- kept when it matches `^[a-z]{2,3}(-[a-z0-9]{2,8})?$` (for example `de`, `de-at`, `en-gb`);
- kept when it is exactly `x-e2e` (test marker, section 4.6);
- otherwise `null`.

### 4.5 Rate limit

60 recorded scans per minute per address, fixed window, in memory, at most 10,000 tracked addresses (Finde's `createLimiter`). The address is the first entry of `x-forwarded-for`, else `x-real-ip`, else `unknown`. Over the limit the phone is still redirected, with no record.

### 4.6 Test marker

End-to-end tests send `Accept-Language: x-e2e`. The teardown deletes `scan_events` where `language = 'x-e2e'`. Nothing else produces that value.

## 5. Database: `record_scan`

```sql
record_scan(p_code text, p_record boolean, p_device text, p_language text, p_is_bot boolean)
returns table (status text, target_type text, sku_id text, collection_id text, campaign_id text, market text)
```

- Looks up `codes` by id. Unknown: returns no row. Inactive: returns the row with `status = 'inactive'` and records nothing.
- Active and `p_record` true: inserts one `scan_events` row (`source = 'live'`, `ts = now()`) with the code's SKU, collection, campaign and market. Then returns the row.
- `security invoker`, `set search_path = ''`. Execute revoked from `public`, `anon`, `authenticated`; granted to `service_role`.
- Inputs are checked by the table constraints (device type list, language length).

## 6. Out of scope for slice 2

- The target pages `/p`, `/f`, `/c` (slice 3). Until then the redirect lands on a 404; tests check the `Location` header only.
- Page views (slice 3), dashboard (slice 4), QR images (slice 8).
- Styling `/code-inactive` (slice 3).

## 7. Tests (written first)

### 7.1 Unit: `tests/unit/ua.spec.ts`

| ID | Case | Expected |
|---|---|---|
| U-UA-1 | iPhone Safari | `mobile`, not bot |
| U-UA-2 | Android phone Chrome (`Mobile`) | `mobile` |
| U-UA-3 | Android tablet (no `Mobile`) | `tablet` |
| U-UA-4 | iPad | `tablet` |
| U-UA-5 | Windows Chrome, macOS Safari | `desktop` |
| U-UA-6 | Empty or missing user agent | `unknown`, bot |
| U-UA-7 | Each preview agent in section 4.3 (real strings, including the iMessage one) | bot |
| U-UA-8 | `de-AT,de;q=0.9,en;q=0.8` | `de-at` |
| U-UA-9 | `*`, `de_AT`, 40-character junk, empty | `null` |
| U-UA-10 | `x-e2e` | `x-e2e` |

### 7.2 Unit: `tests/unit/rateLimit.spec.ts`

| ID | Case | Expected |
|---|---|---|
| U-RL-1 | 60 calls in one window | all allowed |
| U-RL-2 | 61st call in the same window | refused |
| U-RL-3 | After the window ends (fake clock) | allowed again |
| U-RL-4 | Two addresses | counted separately |
| U-RL-5 | 10,001 addresses | memory stays bounded, no crash |

### 7.3 Unit: `tests/unit/redirect.spec.ts` (fake database, clock and scheduler)

| ID | Case | Expected |
|---|---|---|
| U-RD-1 | Active product code, GET | 302 to `/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT`, `recorded`, `record_scan` called with `p_record = true` |
| U-RD-2 | Feedback, shop and collection codes | Locations as in section 4.1 |
| U-RD-3 | Uppercase slug `D92-AT` | Same as lowercase |
| U-RD-4 | Invalid slugs (`a`, 33 characters, `<script>`, `d92_at`) | `/code-inactive`, `invalid`, database **not** called |
| U-RD-5 | Unknown code | `/code-inactive`, `unknown` |
| U-RD-6 | Inactive code | `/code-inactive`, `inactive` |
| U-RD-7 | HEAD | Redirect, `head`, `p_record = false` |
| U-RD-8 | Bot user agent | Redirect, `bot`, `p_is_bot = true` |
| U-RD-9 | Over the rate limit | Redirect (not 429), `rate-limited`, `p_record = false` |
| U-RD-10 | Database throws, code in fallback table | Redirect to the fallback target, `fallback`, error logged |
| U-RD-11 | Database throws, code not in fallback table | `/code-inactive`, `unknown` |
| U-RD-12 | Database answers after 2 s | Response at 800 ms with `late`; the pending call is passed to the scheduler (`after`) |
| U-RD-13 | Database never answers | Call aborted at 5 s; nothing hangs |
| U-RD-14 | Incoming `?sku=evil&market=XX` | Ignored; target from stored data only |
| U-RD-15 | Forged `Host: evil.com` in production | Location origin is `PUBLIC_BASE_URL` |
| U-RD-16 | Every response | `Cache-Control: no-store`, no `Set-Cookie` |
| U-RD-17 | Logged error text | Contains no IP address and no user agent |

### 7.4 Unit: `tests/unit/catalog.spec.ts`

| ID | Case | Expected |
|---|---|---|
| U-CAT-1 | `fallbackCode` for every seeded code | Same target data as the seed |
| U-CAT-2 | `fallbackCode('nope')` | `null` |
| U-CAT-3 | Existing seed tests | Still pass after the move |

### 7.5 End-to-end: `tests/e2e/redirect.spec.ts` (real database, `Accept-Language: x-e2e`, redirects not followed)

| ID | Case | Expected |
|---|---|---|
| E-RD-1 | Each of the 5 seeded codes | 302 with the Location from section 4.1, `recorded` |
| E-RD-2 | After E-RD-1 | Each code has a new `scan_events` row with the right SKU or collection, campaign, market, `source = 'live'` |
| E-RD-3 | WhatsApp user agent | Row stored with `is_bot = true` |
| E-RD-4 | HEAD | No new row |
| E-RD-5 | Unknown code | `/code-inactive`, no row |
| E-RD-6 | `/code-inactive` | 200, shows "not active" and the demo banner |
| E-RD-7 | Timing | Location returned in under 1 second (local), row visible to a query within 10 seconds |
| E-RD-8 | Teardown | No `x-e2e` rows remain |

### 7.6 Manual check (after the build)

With the dev server running, set `SUPABASE_URL` to an unreachable host and open `/r/d92-at`. Expected: redirect to the product URL with `X-Finde-Scan: fallback`.

## 8. Done when

- All tests in section 7 pass, along with the existing 16 unit and 3 end-to-end tests.
- `npm run check:rls` still passes, and also shows that the public key cannot call `record_scan`.
- `npm run typecheck`, `npm run lint` and `npm run build` pass.
- The manual check in 7.6 passes.
- No `x-e2e` rows remain in the demo database.
