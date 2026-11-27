# ADR 0011: UX pass on the dashboard and shopper pages

- Status: Accepted (2026-11-27)
- Date: 2026-11-27
- Scope: the eleven changes the user approved after the UI/UX review of 2026-11-27 (review items 1 to 8, 13, 14 and 16).

## Context

A screenshot review of every screen at 390 px and 1440 px found that the dashboard, where the demo is won, has no headline numbers, hides the live-scan moment, and shows agent answers that contradict the filters. The shopper pages show a dashed "fairafric logo" box and almost no product story. The audience is fairafric's marketing and branding team.

Two ways to deliver the live-scan moment were compared:

- **Option A:** derive "what just arrived" in the browser from the change in live counts between two polls (market, campaign and bar whose live count went up). No database change.
- **Option B:** extend `dashboard_summary()` to return the last few live scans with their code, market and time.

We chose A: no migration, no new personal data, and the poll already carries live counts per market, campaign and bar. Its limit (two scans in one 5-second poll are shown as one line with a count) is fine for a demo.

### Stress test

| # | Finding | Effect if ignored | Fix |
|---|---|---|---|
| 1 | Headline tiles drop the Live / Synthetic label | Unlabelled synthetic numbers (SPEC §6) | Each tile carries its evidence tag and a short data label |
| 2 | Live activity shows a scan that was not live | False "live" claim | Built only from increases in `live` counts, never synthetic |
| 3 | Agent answer scope still unclear | Viewer compares 889 to the filtered 313 | Each question states its scope; when filters are set, a line says they do not apply to the answer |
| 4 | Product-only questions in the collection view | Off-topic answer | Collection view lists only the two questions that span products |
| 5 | Hiding a breakdown hides data | Viewer misses a split | Only hidden when the filter leaves exactly that one value |
| 6 | Product story text makes product claims | Claims not cleared by the brand | Copy is short, marked "Demo content", passes the claim-word check, and says fairafric writes the real text in a pilot |
| 7 | Text wordmark looks like the brand's logo | Imitation of the brand mark | Plain text in the demo's own font, no shapes or colours from the brand's logo |
| 8 | Thanks page links reach outside the demo | Unexpected exits | Same outbound rules as the product page: new tab, no referrer |

## Decision

1. `lib/dashboard.ts`: `headlineNumbers()`, `newLiveScan()` and `breakdownsToShow()`, pure and unit-tested.
2. `LivePanels`: a row of four headline tiles (scans, page visits, shop clicks, feedback answers); a "Live activity" strip that lists new live scans and answers since the page opened; breakdowns hidden when a filter leaves one value; "Collection code, no bar chosen" label; one legend row holding the Live / Synthetic key and the evidence-tag explainer.
3. `lib/agent.ts`: each question gets a `scope` line; source detail reads in plain words ("610 scans (2 live, 608 synthetic)").
4. `AgentPanel`: shows the scope on each answer, a note when dashboard filters are set, and only spanning questions in the collection view.
5. Shopper pages: `LogoSlot` becomes a plain text wordmark; the product page gets a short labelled story and tasting notes from `lib/productStory.ts`; the thanks page gets Shop and Watch the story.

## Tests

- Unit: `tests/unit/dashboard.spec.ts` (headline numbers, new live scan, breakdowns), `tests/unit/agent.spec.ts` (scope, plain source detail), `tests/unit/productStory.spec.ts` (every active bar has a story; no claim words).
- Browser: dashboard shows four headline tiles each with a label; live activity line appears after a test scan; collection view shows two agent questions; product page shows the story with "Demo content"; thanks page shows the brand links.
