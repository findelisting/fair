# ADR 0005: Synthetic data (slice 5), TypeScript generator with one replace call

- Status: Accepted (2026-11-26)
- Date: 2026-11-26
- Scope: BUILD_PLAN.md slice 5, generator part only. The web metrics panel on the dashboard waits for slice 4 (the other session builds slice 4).

## Context

The dashboard and the agent need history: about 60 days of scans, page views, feedback with themes, and website metrics. We compared:

- **Option A:** a pure TypeScript generator with a fixed random seed, unit-tested for shape, loaded by the seed script.
- **Option B:** a SQL function with `generate_series` inside the database.

We chose A. The agent answers depend on how the data is shaped, and A lets unit tests prove that shape without a database.

### Stress test of option A

| # | Finding | Effect if ignored | Fix |
|---|---|---|---|
| 1 | **Seed runs twice.** `npm run seed` upserts the catalogue; plain inserts would double the history | Numbers double on every seed | One database function `replace_synthetic(payload)` deletes all `source = 'synthetic'` rows and all `web_aggregates`, then inserts the new rows, in one transaction (decision 2) |
| 2 | **Live rows lost.** A careless delete removes real scans from the demo | The live scan in the room disappears | The function deletes only `source = 'synthetic'`. `web_aggregates` is always synthetic by design (schema comment), so it is cleared whole |
| 3 | **Half-loaded data.** Batched inserts from the client can fail midway | Dashboard shows a gap | One RPC call, one transaction: on failure the old synthetic rows stay |
| 4 | **Data ages.** Dates count back from the generation day | On demo day the last week looks empty | Dates end on "today" in Europe/Berlin. The runbook says reset the day before; the seed prints the end date |
| 5 | **Future timestamps.** Today's rows could land after the current time | "Scans in the future" on the live chart | Rows for today are clipped to the current time |
| 6 | **Agent answers flip by chance.** Random noise could change the top answer | The agent contradicts the slide | Fixed seed, plus unit tests with clear margins (Austria: wrapper code at least 1.5x the shelf code; feedback visits: shelf talker at least 2x any other campaign; 92% bar: bitterness at least 1.5x the next theme) |
| 7 | **Rows outside campaign dates.** A Q4 campaign with September scans | Implausible data a marketer spots | Rows only between a campaign's start date and today |
| 8 | **e2e teardown deletes synthetic rows** | Data loss after a test run | Teardown filters by `language = 'x-e2e'`, `free_text like '[e2e]%'` and `source = 'live'`. Synthetic rows never use those values (unit test) |
| 9 | **Claim words in free text** | Content rule broken | Example sentences checked with `findClaimWords` (unit test) |
| 10 | **Personal data in examples** | Looks like real customer data | Short neutral sentences, no names, no places of residence. Labelled Synthetic data wherever shown |
| 11 | **Payload size.** About 8,000 rows in one RPC | Request too large | About 1.5 MB of JSON, inside the PostgREST limit. Test caps the row count |
| 12 | **Parallel session** adds migrations | Name clash | New migration file with its own timestamp; files committed by path |
| 13 | **Supabase blocks DELETE without WHERE** (safeupdate), found on first push | Seed fails | `delete ... where true` in migration 20261126171000 |

## Decisions

1. **Generator:** `lib/synthetic.ts`, a pure function `generateSynthetic({ today, now })`. Mulberry32 random numbers with a fixed seed. Lives in `lib/` so unit tests and scripts import it the same way (BUILD_PLAN named `scripts/synthetic.ts`; the script there only loads it).
2. **Loading:** migration adds `replace_synthetic(payload jsonb)`. `scripts/synthetic.ts` calls it. `npm run seed` and `npm run reset` both call it after the catalogue step.
3. **Shape:**
   - Scans per code per day, weekends +30%, only from the campaign start. In Austria the wrapper code `d92-at` leads the shelf-talker code `fb-d92`.
   - Page views follow scans: product, collection and feedback pages. Feedback-page visits come mostly from the shelf-talker feedback code, so `shelf-q4-2026` leads.
   - Feedback: about a third of feedback visits submit. Theme weights per SKU; the 92% bar leans to bitterness, the creamy bars to texture and sweetness. Taste notes come from `lib/themes.ts`, so live and synthetic rows share the same choices.
   - Website aggregates per day, SKU, active campaign and market.
4. **One example per theme:** `THEME_EXAMPLES` exported for the themes panel (slice 4).
5. **Labels:** every row has `source = 'synthetic'` (web aggregates are synthetic by table). The dashboard badges come in slice 4.
