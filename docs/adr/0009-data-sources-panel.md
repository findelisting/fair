# ADR 0009: Data sources panel on the dashboard

- Status: Accepted (2026-11-27)
- Date: 2026-11-27
- Scope: a "Data sources" panel on `/dashboard` that shows what feeds the dashboard today and which other sources Finde could connect in a pilot.

## Context

The fairafric team asked to see an option to connect other data sources from the dashboard. SPEC.md rules out real connections to fairafric systems or ad accounts, so the panel has to be a clearly labelled mock. We compared:

- **Option A:** a static panel. "Connected" lists the three sources the demo really uses (QR scans and feedback, live; website analytics, synthetic). "Available in a pilot" lists other sources, each with a "Request" button that opens a short note. Nothing is stored.
- **Option B:** option A plus a simulated connect flow that marks a source as connected and adds synthetic numbers to the dashboard and agent.

We chose A. B needs a table, a reset hook and new synthetic data, and a fake "Connected" state can be mistaken for a real integration in front of the client.

### Stress test of option A

| # | Finding | Effect if ignored | Fix |
|---|---|---|---|
| 1 | A "Connect" button that does nothing reads as broken | Looks like a bug in the demo | The button says "Request" and opens an inline note: not connected in this demo, set up read-only in a pilot |
| 2 | A listed source looks already integrated | Implied promise of a finished integration | Every available source carries a "Demo: not connected" label; the panel footer repeats it |
| 3 | Brand logos of third-party products | Looks like an endorsement or partnership | Text names only, written as examples ("e.g. Shopify"), no logos |
| 4 | Collecting requests would add a new data store | New personal-data surface | Nothing is stored or sent; the note is static HTML (`<details>`), works without JavaScript |
| 5 | New sources imply customer-level data | Conflicts with SPEC: no customer identification | Each source states it brings aggregated numbers only; a unit test checks no source mentions emails or names as data |
| 6 | Claim words slip into copy | Compliance or certification claims | Copy lives in `lib/dataSources.ts`, covered by the existing claim-word check (H-7) |

## Decision

1. Source list in `lib/dataSources.ts`: id, name, what it adds, status (`live`, `synthetic`, `available`).
2. `components/DataSourcesPanel.tsx`, a server component, rendered at the bottom of both dashboard views, reachable from a "Data sources" link in the filter bar.
3. Connected sources use the existing `DataBadge` (Live or Synthetic data). Available sources use a "Demo: not connected" label and a `<details>` "Request" note.
4. No API route, no table, no client JavaScript.

## Tests

- Unit (`tests/unit/dataSources.spec.ts`): connected sources match what the demo really uses; every available source is labelled and has a pilot note; no source lists personal data; ids are unique.
- Browser (`tests/browser/dashboard.spec.ts`): the panel renders on the dashboard, every available source shows "Demo: not connected", and "Request" opens the note.
