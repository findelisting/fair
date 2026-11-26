# Acceptance checklist

Each criterion from SPEC.md section 6 (and CLAUDE.md), how it is met, and how to check it. Status as of 2026-11-26.

| # | Criterion | How it is met | How to check | Status |
|---|---|---|---|---|
| 1 | A test scan appears on the dashboard within 10 seconds | `/r/<code>` writes a live `scan_events` row in one database call (`record_scan`, ADR 0002); the dashboard polls | e2e: request `/r/<code>`, then read the dashboard; manual phone scan | Scan log done (slice 2). Dashboard pending slice 4 |
| 2 | The redirect reaches the target page with sku and campaign parameters | 302 to the target with `?sku=&campaign=&market=` | `tests/e2e/redirect.spec.ts` on every seeded code | Done |
| 3 | Submitted feedback appears with SKU, campaign and market | Feedback stored with checked query parameters, `source = live` (ADR 0003) | e2e submit, then dashboard; manual phone submit | Storing done (slice 3). Dashboard pending slice 4 |
| 4 | Product and collection views with a market filter | Two dashboard views, market and campaign filters | e2e switches views and filters | Pending slice 4 |
| 5 | Every agent answer lists its sources | Sources block per answer: tables, filters, row counts (live and synthetic), as-of time (ADR 0006) | Unit and e2e tests ask every question | Pending slice 6 |
| 6 | Every competitor value shows its source and date | Loader rejects entries without source and access date (`lib/insights.ts`, ADR 0001) | `tests/unit/insights.spec.ts`, `tests/e2e/insights.spec.ts` | Done (panels placed on the dashboard in slice 4) |
| 7 | All synthetic data and hypotheses are labelled | Banner "Demo prototype, synthetic data" on every page; every synthetic row has `source = synthetic`; hypothesis and packaging labels | e2e checks the banner; `tests/unit/synthetic.spec.ts` checks the source mark; manual label pass in slice 10 | Banner, data marks and labels done. Dashboard badges pending slice 4 |
| 8 | No video is hosted by the app | No video files or embeds; links to the brand's own site only | Repo search for video files, `<video` and `<iframe` (automated in slice 10) | Done; automated check pending slice 10 |
| 9 | The feedback form stores no names or contact details | No such fields in the form or the `feedback` table; no raw IP stored | Unit tests on the form fields; schema review | Done |

## Other requirements from CLAUDE.md

| Requirement | How it is met | Status |
|---|---|---|
| Seed for 3 SKUs and 1 collection | `lib/catalog.ts`, `npm run seed` | Done |
| Shared redirect link for several SKUs | Collection code `vc-de` opens the Vegan Creamy collection page | Done |
| Synthetic website metrics, feedback themes | `lib/synthetic.ts` (ADR 0005), loaded by seed and reset | Data done; panels pending slice 4 |
| No cookies or trackers on public pages | No `Set-Cookie` on public routes; CSP `img-src 'self'` | Done; automated check in slice 10 |
| No compliance or certification claims | Claim-word check on research data and synthetic text | Done; manual pass in slice 10 |
| README, seed script, demo script | `README.md`, `DEMO_SCRIPT.md` | Drafts done; finalise after slices 4 and 6 |
