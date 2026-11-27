# Acceptance checklist

Each criterion from SPEC.md section 6 (and CLAUDE.md), how it is met, and how to check it. Status as of 2026-11-26.

| # | Criterion | How it is met | How to check | Status |
|---|---|---|---|---|
| 1 | A test scan appears on the dashboard within 10 seconds | `/r/<code>` writes a live `scan_events` row in one database call (`record_scan`, ADR 0002); the dashboard polls | e2e: request `/r/<code>`, then read the dashboard; manual phone scan | Done. `tests/browser/dashboard.spec.ts` asserts under 10 s |
| 2 | The redirect reaches the target page with sku and campaign parameters | 302 to the target with `?sku=&campaign=&market=` | `tests/e2e/redirect.spec.ts` on every seeded code | Done |
| 3 | Submitted feedback appears with SKU, campaign and market | Feedback stored with checked query parameters, `source = live` (ADR 0003) | e2e submit, then dashboard; manual phone submit | Done. `tests/e2e/dashboard.spec.ts` |
| 4 | Product and collection views with a market filter | Two dashboard views, market and campaign filters | e2e switches views and filters | Done. `tests/e2e/dashboard.spec.ts`, `tests/browser/dashboard.spec.ts` |
| 5 | Every agent answer lists its sources | Sources block per answer: tables, filters, row counts (live and synthetic), as-of time (ADR 0006) | Unit and e2e tests ask every question | Done. `tests/unit/agent.spec.ts`, `tests/e2e/agent.spec.ts`, `tests/browser/agent.spec.ts` |
| 6 | Every competitor value shows its source and date | Loader rejects entries without source and access date (`lib/insights.ts`, ADR 0001) | `tests/unit/insights.spec.ts`, `tests/e2e/insights.spec.ts` | Done |
| 7 | All synthetic data and hypotheses are labelled | Banner "Demo prototype, synthetic data" on every page; every synthetic row has `source = synthetic`; hypothesis and packaging labels | e2e checks the banner; `tests/unit/synthetic.spec.ts` checks the source mark; `tests/browser/hardening.spec.ts` checks the banner on every page; manual pass in `docs/LABEL_AUDIT.md` | Done |
| 8 | No video is hosted by the app | No video files or embeds; links to the brand's own site only | Repo search for video files, `<video` and `<iframe` (`tests/unit/hardening.spec.ts`, `tests/browser/hardening.spec.ts`) | Done |
| 9 | The feedback form stores no names or contact details | No such fields in the form or the `feedback` table; no raw IP stored | Unit tests on the form fields; `hardening.spec.ts` checks form and schema | Done |

## Other requirements from CLAUDE.md

| Requirement | How it is met | Status |
|---|---|---|
| Seed for 3 SKUs and 1 collection | `lib/catalog.ts`, `npm run seed` | Done |
| Shared redirect link for several SKUs | Collection code `vc-de` opens the Vegan Creamy collection page | Done |
| Synthetic website metrics, feedback themes | `lib/synthetic.ts` (ADR 0005), loaded by seed and reset | Done |
| No cookies or trackers on public pages | No `Set-Cookie` on public routes; CSP `img-src 'self'` | Done; `tests/browser/hardening.spec.ts` |
| No compliance or certification claims | Claim-word check on research data and synthetic text | Done; `tests/unit/hardening.spec.ts` and `docs/LABEL_AUDIT.md` |
| README, seed script, demo script | `README.md`, `DEMO_SCRIPT.md` | Done |

## Added after the SPEC

| Item | How it is met | Status |
|---|---|---|
| Data sources panel: what feeds the dashboard and what a pilot could connect (ADR 0009) | Static list in `lib/dataSources.ts`; each available source is labelled "Demo: not connected"; "Request" opens a note, nothing is stored or sent | Done; `tests/unit/dataSources.spec.ts`, `tests/browser/dashboard.spec.ts` (DS-5) |
| Evidence tags: each panel, agent answer and idea says whether it is observed, attributed, a correlation or a public reference (ADR 0010) | Fixed mapping in `lib/evidence.ts`; outline tag next to the Live / Synthetic data badge; legend "How sure is each number?" | Done; `tests/unit/evidence.spec.ts`, `tests/browser/dashboard.spec.ts` (EV-4) |
| UX pass: headline numbers, live activity strip, agent scope, plain source wording, wordmark, product story, thanks-page next steps (ADR 0011) | `lib/dashboard.ts`, `components/dashboard/LivePanels.tsx`, `components/AgentPanel.tsx`, `lib/productStory.ts`; every tile keeps its evidence tag and data label | Done; unit UX-1 to UX-6, browser UX-7 to UX-10 |
