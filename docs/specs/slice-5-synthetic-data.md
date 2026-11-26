# Slice 5 spec: synthetic data (generator)

Implements [ADR 0005](../adr/0005-synthetic-data.md). The web metrics panel is out of scope here and follows slice 4.

## Behaviour

| Id | Behaviour |
|---|---|
| S-1 | `generateSynthetic({ today, now })` returns the same rows for the same inputs |
| S-2 | Dates cover the 60 days ending `today`. No row is after `now`, and no row is before its campaign's start date |
| S-3 | Every scan, page view and feedback row has `source = 'synthetic'`; codes, SKUs, campaigns and markets exist in `lib/catalog.ts` and match the code's own campaign and market |
| S-4 | Austria: code `d92-at` has at least 1.5x the scans of any other Austrian code |
| S-5 | Feedback-page views: `shelf-q4-2026` has at least 2x the views of any other campaign |
| S-6 | Dark 92% feedback: `bitterness` has at least 1.5x the count of the next theme |
| S-7 | Feedback uses taste notes from `lib/themes.ts` with their theme; ratings 1 to 5; free text has no claim words and never starts with `[e2e]`; language is never `x-e2e` |
| S-8 | One example sentence per theme (`THEME_EXAMPLES`), no claim words |
| S-9 | `web_aggregates` keys are unique; page views and sessions are non-negative and `page_views >= sessions` |
| S-10 | Total rows stay under 12,000 |
| S-11 | `npm run seed` and `npm run reset` replace synthetic rows in one transaction and keep live rows |

## Tests

- Unit (`tests/unit/synthetic.spec.ts`): S-1 to S-10.
- Manual: run `npm run seed` twice; row counts stay the same; a live scan made before survives.
