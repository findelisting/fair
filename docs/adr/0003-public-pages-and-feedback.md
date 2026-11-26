# ADR 0003: Public pages and feedback (slice 3), server-first

- Status: Accepted (2026-11-26)
- Date: 2026-11-26
- Scope: BUILD_PLAN.md slice 3, SPEC.md §6 ("Feedback submitted on the form appears on the dashboard with SKU, campaign and market", "The feedback form stores no names or contact details", "No video is hosted by the app")
- Spec: [docs/specs/slice-3-public-pages-and-feedback.md](../specs/slice-3-public-pages-and-feedback.md)

## Context

After a scan, the phone lands on one of three pages: the product page `/p/[sku]`, the collection page `/c/[collection]` or the feedback form `/f/[sku]`. Each page view is counted, and feedback is stored with SKU, campaign and market. The phone is often on weak mobile data in a shop or at a trade fair.

We compared two approaches:

- **Option A (server-first):** server-rendered pages, the feedback form sent through a Next.js Server Action, and page views recorded on the server.
- **Option B (client):** a client form posting JSON to `/api/feedback`, and page views sent from the browser.

We chose option A. A form that works without JavaScript is the most reliable on a weak connection. It also needs no extra public API route.

Before writing this ADR we checked the Next.js 16 docs shipped in `node_modules/next/dist/docs/`:
- Forms that call Server Actions submit even when JavaScript has not loaded or is off (`01-getting-started/07-mutating-data.md`).
- Server Actions accept only `POST` and reject requests whose `Origin` does not match the host (`02-guides/data-security.md`).
- Automatic link prefetching runs **only in production** (`02-guides/prefetching.md`).

### Stress test of option A as first sketched

| # | Finding | Effect if ignored | Fix (see Decision) |
|---|---|---|---|
| 1 | **Link prefetch counts fake page views.** The collection page links to product pages, and product pages link to the feedback form. In production, Next prefetches those pages when the links scroll into view, and the server render would record a view | Inflated page views, and the agent's "visits to the feedback page" question gives wrong answers. Invisible in dev, because prefetch only runs in production | Plain `<a>` links between tracked pages, and the prefetch header is ignored (decision 4) |
| 2 | **Contact details in the free text.** People type "email me at ..." or a phone number | The app stores contact details, which breaks a SPEC §6 criterion, and they show up on the dashboard in front of the client | Redact emails, phone numbers and links before storing (decision 6) |
| 3 | **Double submit.** Without JavaScript, a double tap or a page refresh sends the form twice | Duplicate feedback rows | A one-time token per form render, unique in the database (decision 7) |
| 4 | **A failed save looks like success.** If the database is down and the form still says "Thanks", the answer is lost silently, which is the same problem we rejected option B for | Lost feedback in the live demo | The form shows "Could not save, please try again" and keeps what was typed (decision 8) |
| 5 | **Error messages without JavaScript.** A plain server form can only show errors after a full page reload, and putting typed text in the URL would leak free text into logs | Either no error messages, or free text in URLs | `useActionState` in one small client component: errors and typed values come back in the response, never in the URL, with and without JavaScript (decision 8). Proven by a no-JavaScript browser test |
| 6 | **Untrusted query parameters.** `campaign` and `market` come from the URL and can be edited | Fake labels stored with feedback and page views | Only known campaign IDs and market codes are kept; anything else is stored as empty (decision 5) |
| 7 | **The pages depend on the database.** If the product page reads the SKU from the database, a database outage shows an error page right after a scan | A broken first impression, even though the redirect survived | Page content comes from `lib/catalog.ts`, the same static catalogue the redirect falls back on (decision 2) |
| 8 | **Page views from bots.** Link previews fetch the product page too | Inflated page views | The slice 2 bot filter applies: bots are not counted (decision 4) |
| 9 | **Spam.** The form is public | Junk feedback in the demo | Hidden honeypot field and a rate limit (decision 9) |
| 10 | **End-to-end tests write into the demo database** | Test feedback and page views appear on the dashboard | Test feedback is marked and test page views are removed after each run (decision 11) |
| 11 | **Shop and video links.** We have no confirmed fairafric shop or video URLs | A wrong or dead link in front of the client | Shown as clearly labelled demo buttons, not links, until fairafric gives URLs (decision 3) |
| 12 | **Testing the form needs a real browser.** A Server Action cannot be called with a plain HTTP request, and rendering React in Playwright unit tests fails (ADR 0001) | The most important path stays untested | Install Playwright's Chromium once, and test the form with JavaScript on and off (decision 10) |

Known limits we accept:

- **Names in free text** cannot be detected reliably. The form asks people not to enter personal details, and names are not redacted.
- **`HEAD` requests** to pages cannot be told apart in a Server Component. Most come from link checkers, which the bot filter already catches.
- **A refresh of the product page** counts as a second view, as on any website.

## Decision

1. **Server-first pages** (option A). Product, collection, feedback, thank-you and `/code-inactive` pages are Server Components, rendered on each request.

2. **Content from the static catalogue.** SKU names, varieties, formats and collection members come from `lib/catalog.ts`. An unknown SKU or collection shows the not-found page. The pages never wait for the database.

3. **Product page.**
   - It shows name, variety, format, a short demo description and a placeholder image (inline SVG, nothing external).
   - Buttons: **Give feedback** (a link to the form, carrying campaign and market), **Shop** and **Watch the story**. Shop and Watch the story are labelled "Demo: links to the brand's own site in the pilot". They are not links, so there is no wrong URL and no video. When the code was a shop code (`intent=shop`), the Shop button is highlighted.

4. **Page views.**
   - Recorded on the server with `after()`, so the page never waits, and only on product, collection and feedback pages.
   - Not recorded for bots (slice 2 filter), or when the request carries Next's prefetch header.
   - All links between tracked pages are plain `<a>` elements, so nothing is prefetched.
   - A failed write is logged and never shown.

5. **Parameters.**
   - `campaign` is kept only if it is a known campaign ID, and `market` only if it is a known market code. Otherwise they are stored as empty.
   - The page passes them on to its links and to the form. Nothing from the URL is ever shown as text.

6. **Contact redaction.** Before storing, the free text is trimmed, control characters are removed, and these are replaced with `[removed]`:
   - email addresses;
   - phone numbers (7 or more digits, allowing spaces, dots, dashes, brackets and a leading `+`);
   - links (`http`, `https`, `www.`).

   The 500-character limit applies after redaction.

7. **One answer per form.** Each form render includes a random token (`crypto.randomUUID()`). A new nullable unique column `feedback.submission_id` stores it. A second submit with the same token is ignored and still shows "Thanks". The token is random per form, so it cannot link answers to a person.

8. **Form handling.**
   - One small client component (`FeedbackForm`) uses `useActionState` with a Server Action.
   - On success the action redirects to `/f/[sku]/thanks` (post, redirect, get), so a refresh cannot resend.
   - On a validation error or a database error, the action returns the errors and the typed values. The form shows them inline and keeps what was typed. A database error reads "Could not save your answer. Please try again."
   - This works with and without JavaScript. A no-JavaScript browser test proves it. **If that test fails**, we fall back to a server-only form that redirects back with an error code (typed values are then lost, never put in the URL), and record it here.
   - The star rating is five styled radio buttons inside a `fieldset`, usable by keyboard and screen reader.

9. **Spam protection.**
   - A hidden honeypot field: if it is filled, the action shows "Thanks" and stores nothing.
   - A rate limit of 20 answers per minute per address, using the slice 2 limiter. Over the limit, the form says "Too many answers from this network. Please try again in a minute." Real people get a clear message rather than silent loss.

10. **Tests.**
    - Pure logic (validation, redaction, themes, parameter checks, page-view rules) gets Playwright unit tests.
    - Pages and the form get Playwright browser tests in Chromium, with JavaScript on and off. This needs a one-time `npx playwright install chromium` (about 150 MB, development only).
    - The existing `foundation` and `insights` end-to-end tests are unchanged.

11. **Test data never reaches the dashboard.**
    - Test feedback starts its free text with `[e2e]`. The global teardown deletes those rows.
    - Test page views are deleted by time window: rows created since the test run started. **So end-to-end tests must never run during a live demo.** This is written into the runbook.

## Consequences

- Product and collection pages render even with the database down. Only the page view and the feedback save need it.
- Feedback cannot be lost silently, stored twice, or carry an email address or phone number.
- Page views are not inflated by prefetching or bots, so agent question 2 stays honest.
- One migration: `feedback.submission_id`. One new client component. No new runtime dependency. Chromium is a development download only.
- Shop and video stay labelled demo buttons until fairafric provides URLs (open question in APPROACH.md section 17).
- **Plan change:** BUILD_PLAN.md slice 3 is replaced by the spec. `/api/feedback` is not built; the Server Action replaces it.

## Alternatives considered

- **Option B: client form and `/api/feedback`.** Slicker, but the form needs JavaScript and a good connection at the moment of tapping, and it adds a public API route. Rejected.
- **Browser-side page-view signal** (from option B). Filters bots and prefetch by itself, but needs JavaScript, and is lost when the phone leaves quickly. Rejected; decision 4 handles prefetch and bots on the server.
- **Pure server form with errors in the URL.** Works without JavaScript, but typed free text would end up in URLs and logs. Rejected, kept only as the fallback in decision 8.
- **Reading SKU content from the database.** One source of truth, but the page breaks when the database does. Rejected (finding 7).
- **Redact nothing, rely on the hint.** Simplest, but one email address in a live demo breaks a SPEC criterion. Rejected.
