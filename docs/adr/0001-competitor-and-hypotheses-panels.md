# ADR 0001: Competitor and hypotheses panels (slice 7), built in parallel with slice 1

- Status: Accepted (2026-11-26, amended: no human review step for the demo)
- Date: 2026-11-26
- Scope: BUILD_PLAN.md slice 7, SPEC.md §6 ("Every competitor value shows its source and date", "All synthetic data and hypotheses are labelled")

## Context

Slice 1 (Foundation) is in progress and not yet committed. BUILD_PLAN.md builds slices strictly in order. Slice 7 has no dependency on the database, the redirect or the dashboard data, and its slowest part is research (finding real public product references), not code. We chose option B: build the code and draft the competitor research now, so the panel is ready for the demo without waiting on research.

Before deciding, we checked the base and tested the build approach:

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | 16 passed |
| `npm run build` | Pass (the first run reported "Another next build process is already running"; a rerun passed, no build process was found running) |
| `npm run test:e2e` | 3 passed |
| Spike: render a component with `react-dom/server` inside a Playwright unit test | **Fails.** Playwright's TSX transform wraps JSX in `{__pw_type, ...}` objects, so React refuses to render them. This also happens when the test file is plain `.ts` and only the imported component is `.tsx` |

## Decision

1. **Run slice 7 alongside slice 1.** Slice 7 touches only new paths (`data/`, `lib/insights.ts`, two components, its tests and one temporary page). It adds no dependency, so `package.json` and the lockfile stay untouched. It is committed with explicit paths, never `git add -A`, so slice 1's uncommitted work is not swept in.

2. **Validation is plain TypeScript, with no JSX, in `lib/insights.ts`.** It loads `data/competitors.json` and `data/hypotheses.json` at module load and throws on any invalid entry. A bad entry therefore fails both `npm run test:unit` and `next build`, not the live demo. No schema library is added.

3. **Every value carries its own source.** Each product has a `sources` map (`url`, `publisher`, `accessedOn`). Each value (price, pack size, packaging note) is `{ value, source }`, and the source key must exist. The validator requires:
   - an `https` URL;
   - an ISO `accessedOn` date that is not in the future.

   Every value shows its source and access date, because SPEC.md §6 requires it. There is no human review step and no "to be verified" label: this is a demo to win buy-in, and a review label would read as extra work for fairafric. The data is reference context, not a requirement for their decisions. Like a chat assistant citing its sources, the panel carries one quiet line under the sources: "Sources are linked so you can check any detail." It is an option, not a task. Review and freshness guardrails (a `verified` flag, a staleness warning) are deferred to the pilot.

4. **Hypotheses quote no numbers yet.** Each hypothesis has a `statement` and a non-empty `basis` list of named metrics, for example "origin theme count, 92% bar" or "scans by campaign". Numbers would need slice 5's synthetic data, so they are added then or left out.

5. **No claims.** A unit test scans both JSON files for banned claim words (climate, carbon, CO2, neutral, certified, certification, compliant, compliance), following APPROACH.md §10.

6. **No images.** The CSP allows `img-src 'self'` only, and hotlinking retailer images also raises copyright questions. Competitor entries are text plus a source link.

7. **Rendering is tested end to end, not in unit tests.** The spike above proved this is necessary. The unit tests cover the validator only. A Playwright e2e test fetches the rendered page over HTTP (as `foundation.spec.ts` already does). It checks that each competitor value shows a source link and a date, and that each hypothesis carries "Hypothesis, not validated".

8. **Temporary preview page.** `app/preview/insights/page.tsx` renders both panels until the dashboard exists. It calls `notFound()` when `NODE_ENV === 'production'`, so it never ships. In slice 4, the panels move to the dashboard, the page is deleted and the e2e test points at the dashboard.

9. **Research rules.** Find 1 or 2 products comparable to the 92% bar or the vegan Creamy bars, sold in DE or AT. Record only values read from the source page. If a page cannot be read, try the manufacturer page or ask the team to paste the listing. A value that is not on the page is recorded as "Not listed", never estimated. Nothing is scraped at runtime: the values are fixed in JSON.

## Consequences

- The competitor panel is demo-ready before checkpoint C, with no review step.
- Accepted risk: a researched price or pack size may be wrong or out of date on demo day. Every value still links to its source page, so it can be checked live if asked.
- Bad competitor data fails the build, not the sales meeting.
- One throwaway page exists until slice 4. It is dev-only and tracked by this ADR.
- **Slice 10 note:** the competitor panel links to external sites. The slice 10 check "no third-party requests" must allow plain `<a href>` navigation links on the dashboard. The current home-page regex in `foundation.spec.ts` would flag them if reused there unchanged.
- **Plan change:** BUILD_PLAN.md's "build slices in order" rule gets this one exception, recorded here.

## Alternatives considered

- **Option A (placeholders only, no research).** Faster, but it leaves the slowest task for checkpoint C. Rejected.
- **Render tests in unit tests with `react-dom/server`.** Rejected after the spike failed under Playwright's transform. Adding Vitest or Jest only for this would add a second test runner that Finde does not use.
- **One source per product instead of per value.** Simpler, but it does not prove "every competitor value shows its source" when values come from different pages. Rejected.
- **A schema library (zod).** Not needed for two small files, and adding it would touch `package.json`, which slice 1 also edits. Rejected.

## Amendment 2 (2026-11-26): presentation, estimates and related products

Decided with the user after the first build.

- **Where:** inside the dashboard product view, not a separate page or tab. Each SKU shows a "Market context" card (its competitors only) and an "Ideas to test" card (its hypotheses only). Market context next to their own numbers is more convincing than a research page they must visit.
- **When:** both passive and on request, never a pop-up or a message on each login.
  - Passive: the cards sit in the product view, collapsed to one line per product.
  - On request: a fourth agent question in slice 6, "How does the 92% bar compare on price?", answers with the same snippet and its sources.
- **Snippet format:** one line per product (`Brand Product  ~€5.09 / 100 g  Publisher · date`). Clicking expands every value with its own source and date. Built with `<details>`, so no client JavaScript.
- **Close matches:** when there is no exact equivalent, the closest public product is used (for example, a 60% date-sweetened dark bar against the vegan Creamy Oat bar).
- **Estimates:** a source marked `estimate: true` (values read from a search result because the retailer blocks automated reads) shows its prices with `~`. The card then says "Prices with ~ are estimates from public listings."
- **Related products:** an "Also worth a look" line lists variations and other approaches as links only, with no values, filtered per SKU.
- **"Useful and accurate?" check:** a one-tap 👍/👎 at the end of each card, shown at most once per card per session, optional, and never worded as a task. Stored anonymously against the card, with no user identity. It needs the dashboard session and the database, so it is built in slice 4.
- **Empty SKUs:** a card with nothing for the selected SKU is not shown.

## Amendment 3 (2026-11-26): packaging ideas for the branding team

fairafric's marketing contacts are also the branding team, so the product view gets a third card, "Packaging ideas".

- **What:** short, research-backed suggestions about the pack (QR call to action, where codes link to, cocoa % on the front, price per 100 g on shelf talkers, a wrapper A/B test with two codes). Text only: no artwork or mock-ups.
- **Each idea has:** a one-line statement, a data basis from Finde's data (scans, themes, Market context) and zero or more public sources, each with a one-line takeaway, an https link and an access date.
- **Label:** every idea carries "Suggestion, not validated". It is offered as research and inspiration, not as a task.
- **Scope per SKU:** an idea is tied to one SKU or to `all`. The product view shows its own ideas plus the `all` ones.
- **Format:** the same snippet style as the other cards. One line per idea; the basis and sources are one click away.
- **Limits:** no sustainability, recyclability or certification claims (APPROACH.md §10). The claim-word check runs on `data/packaging.json` at build time.
- **Evidence quality:** the sources are a standards body (GS1 UK) and trade press reporting an industry study. No controlled study on QR calls to action was found, so the ideas stay labelled as suggestions.
- **Optional slice 6 question:** "What packaging changes could lift scans?", answered from the same data.
