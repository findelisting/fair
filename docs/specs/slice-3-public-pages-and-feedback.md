# Spec: slice 3, public pages and feedback

- Status: Accepted (2026-11-26), ADR 0003 accepted
- Decision record: [ADR 0003](../adr/0003-public-pages-and-feedback.md)
- Replaces: BUILD_PLAN.md slice 3 task list
- Build rule: the tests in section 8 are written first and fail, then the code makes them pass. The first test to write is the no-JavaScript form test (B-FB-2), because ADR 0003 decision 8 depends on it.

## 1. Goal

After a scan, the phone shows a clear product, collection or feedback page within moments, even on weak mobile data. Feedback is stored with SKU, campaign and market, once, without contact details, and a failed save is never hidden. Page views are counted honestly.

## 2. Files

| File | Change |
|---|---|
| `lib/themes.ts` | **New.** The fixed taste-note choices and their themes |
| `lib/feedback.ts` | **New.** `validateFeedback(form)`, `redactContacts(text)`. Pure logic, no imports from `server-only` code |
| `lib/params.ts` | **New.** `cleanParams(searchParams)`: keeps only known campaign IDs and market codes |
| `lib/pageViews.ts` | **New.** `shouldCountView(headers)` (pure) and `recordPageView(...)` (server-only, fail open) |
| `lib/catalog.ts` | Add lookups: `skuById`, `collectionById`, `skusInCollection`, `isCampaign`, `isMarket` |
| `app/p/[sku]/page.tsx` | **New.** Product page |
| `app/c/[collection]/page.tsx` | **New.** Collection page |
| `app/f/[sku]/page.tsx` | **New.** Feedback page (Server Component, renders the form with a fresh token) |
| `app/f/[sku]/actions.ts` | **New.** `submitFeedback` Server Action (`'use server'`) |
| `app/f/[sku]/thanks/page.tsx` | **New.** Thank-you page |
| `components/FeedbackForm.tsx` | **New.** Client component with `useActionState` |
| `components/RatingInput.tsx` | **New.** Five styled radio buttons in a `fieldset` (no JavaScript needed) |
| `components/ProductImage.tsx` | **New.** Inline SVG placeholder |
| `app/code-inactive/page.tsx` | Styled to match the other pages |
| `app/not-found.tsx` | **New.** Friendly not-found page with the banner |
| `supabase/migrations/<ts>_feedback_submission_id.sql` | **New.** `feedback.submission_id uuid unique` (nullable) |
| `playwright.config.ts` | Add a `browser` project (Chromium) for `tests/browser`, and a global setup that stores the run start time |
| `tests/e2e/global-setup.ts` | **New.** Records the run start time for page-view cleanup |
| `tests/e2e/global-teardown.ts` | Also deletes `[e2e]` feedback and page views created since the run started |
| `tests/unit/themes.spec.ts`, `feedback.spec.ts`, `params.spec.ts`, `pageViews.spec.ts`, `catalog.spec.ts` (extended) | Unit tests (section 8) |
| `tests/browser/pages.spec.ts`, `tests/browser/feedback.spec.ts` | **New.** Browser tests (section 8) |
| `DEMO_SCRIPT.md` runbook note (slice 11) | "Never run end-to-end tests during a live demo" |

## 3. Pages

All pages: the demo banner (root layout), `noindex`, mobile first (tested at 390 × 844), large tap targets (at least 44 px), no external requests, no cookies.

### 3.1 Product page `/p/[sku]`

- Unknown SKU: not-found page (404).
- Shows: name, variety, format, demo description, placeholder image.
- **Give feedback**: `<a href="/f/<sku>?sku=&campaign=&market=">`, carrying the cleaned campaign and market.
- **Shop**: a button labelled "Shop" with the note "Demo: links to the brand's own shop in the pilot". Not a link. Highlighted when `intent=shop`.
- **Watch the story**: a button with the note "Demo: the video stays on the brand's own site". Not a link, no embed.
- Records a `product` page view (section 5).

### 3.2 Collection page `/c/[collection]`

- Unknown collection: 404.
- Shows the collection name and one card per SKU, in `position` order. Each card is an `<a href="/p/<sku>?sku=&campaign=&market=">`.
- Records a `collection` page view with `collection_id`.

### 3.3 Feedback page `/f/[sku]`

- Unknown SKU: 404.
- Usage notice at the top: "Your answer is anonymous. We use it only to improve this product. Please don't enter names, email addresses or phone numbers."
- Form fields:
  - `rating`: required, 1 to 5, radio buttons with labels "1 star" to "5 stars".
  - `taste_note`: required, one of the fixed choices (section 4).
  - `free_text`: optional textarea, `maxlength=500`, with a live character count only when JavaScript runs.
  - Hidden: `sku`, `campaign`, `market`, `submission_id` (fresh UUID per render), `website` (honeypot, visually hidden, `tabindex=-1`, `autocomplete=off`).
- Submit button: "Send feedback". Shows "Sending…" and is disabled while pending (with JavaScript).
- Records a `feedback` page view.

### 3.4 Thank-you page `/f/[sku]/thanks`

- "Thank you! Your feedback helps improve this chocolate." and a link back to the product page (campaign and market carried).
- Not counted as a page view.

### 3.5 `/code-inactive` and not-found

Styled, with a short explanation. Not counted as page views.

## 4. Taste notes and themes (`lib/themes.ts`)

| Value | Label | Theme |
|---|---|---|
| `too-bitter` | Too bitter for me | bitterness |
| `nicely-intense` | Nicely intense | bitterness |
| `too-sweet` | Too sweet | sweetness |
| `not-sweet-enough` | Not sweet enough | sweetness |
| `smooth-creamy` | Smooth and creamy | texture |
| `grainy-waxy` | Grainy or waxy | texture |
| `love-wrapper` | Love the wrapper | packaging |
| `origin-story` | The origin story caught my eye | origin |

`themes` is stored as an array with one theme. Slice 5 uses the same five themes.

## 5. Page-view rules (`lib/pageViews.ts`)

- `shouldCountView(headers)` is false when:
  - `isBot(user-agent)` is true (slice 2 rules);
  - the request carries `next-router-prefetch` or `purpose: prefetch` / `sec-purpose: prefetch`.
- `recordPageView({ page, sku_id, collection_id, campaign_id, market })`:
  - runs inside `after()`;
  - inserts one `page_views` row with `source = 'live'`;
  - catches and logs errors (page, reason, duration; no IP, no user agent).

## 6. Submitting feedback (`submitFeedback`)

Order of checks; the first failing one decides the answer:

1. **Honeypot** `website` is not empty: redirect to thanks, store nothing.
2. **Rate limit** (20 per minute per address, slice 2 limiter): return `{ error: 'rate-limited' }`.
3. **Validation** (`validateFeedback`):
   - `sku` must be a known, active SKU;
   - `rating` must be an integer from 1 to 5;
   - `taste_note` must be one of the section 4 values;
   - `free_text` is optional; trimmed and control characters removed; redacted (section 7); then at most 500 characters;
   - `submission_id` must be a UUID;
   - `campaign` and `market` are cleaned (unknown values become empty).
   Errors: `{ error: 'invalid', fields: { rating?: 'Choose 1 to 5 stars', taste_note?: 'Choose one option', ... }, values }`.
4. **Save**: upsert into `feedback` with `onConflict: 'submission_id'` and `ignoreDuplicates: true`, `source = 'live'`, `themes = [theme of taste_note]`. On a database error: `{ error: 'unavailable', values }`.
5. **Success**: `redirect('/f/<sku>/thanks?sku=&campaign=&market=')`.

`values` returns the typed rating, taste note and free text, so the form can show them again. Never in the URL.

## 7. Contact redaction (`redactContacts`)

Replace with `[removed]`:
- email: `[^\s@]+@[^\s@]+\.[^\s@]+`;
- phone: a run of at least 7 digits, allowing a leading `+` and single spaces, dots, dashes or brackets between digits;
- links: `https?://\S+` and `www\.\S+`.

Ordinary numbers such as "92%" or "80 g" stay.

## 8. Tests (written first)

### 8.1 Unit

| ID | Area | Case | Expected |
|---|---|---|---|
| U-TH-1 | themes | Every choice | Has a label and one of the 5 themes |
| U-TH-2 | themes | Values are unique | No duplicates |
| U-FB-1 | validate | A complete, valid form | OK, theme set, `source = 'live'` fields ready |
| U-FB-2 | validate | Rating 0, 6, 2.5, "abc", missing | `rating` error |
| U-FB-3 | validate | Unknown or missing taste note | `taste_note` error |
| U-FB-4 | validate | Unknown SKU, inactive SKU | Invalid |
| U-FB-5 | validate | Free text of 600 characters | Cut to 500 after redaction |
| U-FB-6 | validate | Free text with control characters and spaces around it | Trimmed and cleaned |
| U-FB-7 | validate | `submission_id` not a UUID | Invalid |
| U-FB-8 | validate | Unknown campaign and market | Stored as empty, form still valid |
| U-FB-9 | validate | Errors return the typed values | Values present, nothing else |
| U-RX-1 | redact | `mail me: anna.k@example.de` | Email replaced |
| U-RX-2 | redact | `+49 170 1234567`, `0170-123 45 67`, `(030) 1234567` | Replaced |
| U-RX-3 | redact | `see https://x.example/a` and `www.example.com` | Replaced |
| U-RX-4 | redact | `92% is great, 80 g bar, 3 stars` | Unchanged |
| U-PR-1 | params | Known campaign and market | Kept |
| U-PR-2 | params | Unknown, empty, repeated, very long, `<script>` | Empty |
| U-PV-1 | page views | iPhone user agent | Counted |
| U-PV-2 | page views | Bot user agent, empty user agent | Not counted |
| U-PV-3 | page views | `next-router-prefetch: 1`, `sec-purpose: prefetch` | Not counted |
| U-CAT-4 | catalog | `skusInCollection('vegan-creamy')` | 2 SKUs in position order |
| U-CAT-5 | catalog | Unknown SKU or collection | null |

### 8.2 Browser (Chromium; real database; test feedback marked `[e2e]`)

| ID | Case | Expected |
|---|---|---|
| B-PG-1 | `/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT` | Name, variety, format, banner; feedback link carries campaign and market; Shop and Watch the story are labelled demo and are not links |
| B-PG-2 | Same URL with `&intent=shop` | Shop button highlighted |
| B-PG-3 | `/p/nope` | 404 with banner |
| B-PG-4 | `/c/vegan-creamy?collection=vegan-creamy&campaign=influencer-q4-2026&market=DE` | Two product cards in order, links carry campaign and market |
| B-PG-5 | Visit product, collection and feedback pages | One page-view row each, right page type, SKU or collection, campaign, market, `source = 'live'` |
| B-PG-6 | Visit with a bot user agent | No page-view row |
| B-PG-7 | Collection page: links | Plain `<a>` elements, no Next prefetch |
| B-PG-8 | Every public page at 390 × 844 | No horizontal scroll; buttons at least 44 px tall |
| B-PG-9 | Every public page | No cookie set; no request to another origin |
| B-FB-1 | Fill and send with JavaScript on | Lands on thanks; one feedback row with SKU, campaign, market, rating, taste note, theme, `source = 'live'` |
| B-FB-2 | **Same with JavaScript off** | Same result (proves ADR 0003 decision 8) |
| B-FB-3 | Send without rating (JavaScript on and off) | Inline error; typed free text still in the box; nothing stored |
| B-FB-4 | Free text with an email address and a phone number | Stored text contains `[removed]`, not the email or number |
| B-FB-5 | Send twice with the same token (back, then send again) | One row only |
| B-FB-6 | Honeypot filled | Thanks shown; nothing stored |
| B-FB-7 | Database unreachable (server started with a bad `SUPABASE_URL`) | "Could not save your answer. Please try again."; typed text kept |
| B-FB-8 | The form has no name, email or phone fields | Only rating, taste note, free text and hidden fields |
| B-FB-9 | Keyboard only | Stars and choices reachable with Tab and arrow keys; each has a label |

### 8.3 Teardown

| ID | Case | Expected |
|---|---|---|
| E-TD-1 | After the run | No feedback with `[e2e]`; no page views created since the run started; no `x-e2e` scans |

## 9. Out of scope

- Dashboard panels for page views and feedback (slice 4).
- Synthetic feedback and themes (slice 5).
- Real shop and video URLs (open question; demo buttons until then).
- German text (deferred).

## 10. Done when

- All tests in section 8 pass, plus all existing unit and end-to-end tests.
- `npm run typecheck`, `npm run lint`, `npm run build` and `npm run check:rls` pass.
- Manual check on a real phone over mobile data: scan the `d92-at` code on screen, land on the product page, send feedback, see the thank-you page.
- No test data remains in the demo database.
