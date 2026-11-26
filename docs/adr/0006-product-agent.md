# ADR 0006: Product agent (slice 6), counting in the database

- Status: Accepted (2026-11-26)
- Date: 2026-11-26
- Scope: BUILD_PLAN.md slice 6, CLAUDE.md scope item 8, SPEC.md §6 ("Every agent answer lists its sources"). The dashboard itself (slice 4) belongs to the other session; this slice delivers the agent logic, its API and a panel component the dashboard drops in.
- Spec: [docs/specs/slice-6-product-agent.md](../specs/slice-6-product-agent.md)

## Context

The product agent answers a few prepared questions across the collected data, with no external AI model, and shows the data each answer used. Slice 5 shaped the synthetic data so the core questions have clear answers, and its tests guarantee the margins:

- In Austria, the wrapper code gets at least 1.5 times the scans of the shelf code.
- The shelf talker drives at least 2 times more feedback-page visits than any other campaign.
- For the 92% bar, bitterness leads the themes by at least 1.5 times.

We compared two approaches:

- **Option A:** one SQL function per question counts in the database; TypeScript writes the sentence and the sources.
- **Option B:** TypeScript fetches raw rows and counts them.

We chose A. Supabase returns at most 1,000 rows per request by default, and the demo already holds more than 2,400 scans and 2,500 page views. Option B would risk answers computed from a silently cut-off list: wrong answers with correct-looking sources.

**Fourth question.** ADR 0001 offered "How does the 92% bar compare on price?". We hold no price for fairafric's own bar, so that question cannot be answered honestly. The user decided (2026-11-26) that this is a showcase demo and to use questions the data supports. The fourth question is therefore **"What do comparable dark bars cost?"**, answered from `data/competitors.json`. This amends ADR 0001 amendment 2. The packaging question from ADR 0001 amendment 3 is left out.

### Stress test of option A

| # | Finding | Effect if ignored | Fix (see Decision) |
|---|---|---|---|
| 1 | **Live and synthetic rows mix.** A live scan in the room joins 60 days of synthetic history | The answer is badged "Synthetic" although it includes a live scan, or the reverse | Each function returns live and synthetic counts separately; the badge is Live, Synthetic or "Live + synthetic" (decision 3) |
| 2 | **Bots counted.** Link previews are stored as scans with `is_bot` | Inflated scan counts in the answer | The scan function counts only `is_bot = false` (decision 2) |
| 3 | **Ties.** Two codes with the same count | The "winner" changes between runs | Order by count, then by key; if the top two are equal the answer says so (decision 4) |
| 4 | **No data.** A fresh reset without synthetic data, or a market with no scans | An empty sentence or a crash, or worse, an invented answer | "Not enough data yet" with the sources showing 0 rows (decision 4) |
| 5 | **Causal wording.** "Which campaign drove visits" invites "the shelf talker caused…" | An overclaim a marketer can challenge | Answers describe counts, not causes: "Most feedback-page visits came from…" (decision 5) |
| 6 | **Unclear time window.** "Most scans" since when? | Numbers that look arbitrary | Sources state the date range of the rows used (first to last) and the as-of time in Berlin time (decision 3) |
| 7 | **The agent API is public before the dashboard gate exists** | Anyone could read aggregated numbers | Dev-only (`notFound()` in production) until slice 4's gate covers `/api/agent`, as ADR 0004 did for the QR sheet (decision 7) |
| 8 | **Database functions callable with the public key** | Data readable without the gate | `security invoker`, `search_path = ''`, execute revoked from `anon` and `authenticated`, granted to `service_role`; `check:rls` covers them (decision 2) |
| 9 | **Cached answers.** A cached response would hide the live scan | The live demo moment fails | Dynamic route, `Cache-Control: no-store` (decision 6) |
| 10 | **Free-text input.** A question box would invite questions we cannot answer | Wrong or empty answers in front of the client | Only fixed question IDs; anything else returns 400 (decision 6) |
| 11 | **Tests depend on live data.** Real or test scans change exact counts | Flaky tests | End-to-end tests check the winner and the margin, not exact numbers; they fail with "run npm run seed" if synthetic data is missing (decision 8) |
| 12 | **Testing the panel without a dashboard** | The panel only gets tested once slice 4 lands | A dev-only preview page `/preview/agent`, deleted when the dashboard embeds the panel, as ADR 0001 did (decision 8) |
| 13 | **Competitor prices are estimates** | "~€5.09" read as an exact price | The fourth answer keeps the `~` mark and says prices are estimates from public listings, with each source and access date (decision 5) |

## Decision

1. **Four fixed questions.** IDs and wording:
   - `top-packaging-at`: "Which packaging had the most scans in Austria?"
   - `feedback-visits-by-campaign`: "Which campaign drove visits to the feedback page?"
   - `top-theme-dark-92`: "Which theme comes up most for the 92% bar?"
   - `comparable-dark-bars`: "What do comparable dark bars cost?"

2. **One SQL function per data question**, all with the same row shape `(key, label, total, live, synthetic, first_ts, last_ts)`, ordered by `total` descending then `key`:
   - `agent_scans_by_code(p_market text)`: scans with `is_bot = false` in that market, grouped by code, labelled with the code label and channel.
   - `agent_feedback_visits_by_campaign()`: `page_views` with `page = 'feedback'`, grouped by campaign (no campaign counts as "No campaign").
   - `agent_themes_for_sku(p_sku text)`: themes of that SKU's feedback, one count per theme per answer.
   All `security invoker`, `set search_path = ''`, service role only.

3. **Sources on every answer.** Each answer lists one source per table it used, with:
   - the table in plain words ("QR scans", "Feedback page visits", "Feedback answers", "Public retailer listings");
   - the filter ("market Austria, bots excluded");
   - the row count, split into live and synthetic;
   - the date range of those rows and the as-of time in Europe/Berlin;
   - a badge: Live, Synthetic data, or Live + synthetic data.
   The fourth answer lists each retailer listing with its link and access date.

4. **Ties and empty data.** If the top two totals are equal, the answer names both ("tied"). With no rows, the answer is "Not enough data yet for this question." and the sources show 0 rows. The agent never invents a value.

5. **Wording.** Plain, count-based sentences with the runner-up for context, for example: "The Dark 92% wrapper code had the most scans in Austria: 412, against 198 for the shelf talker." No causal claims, no claim words (APPROACH.md §10). Estimated prices keep their `~` and the answer says "Prices with ~ are estimates from public listings."

6. **API.** `GET /api/agent?q=<id>` returns `{ id, question, answer, sources, asOf }`. Unknown IDs return 400. Dynamic, `Cache-Control: no-store`. Logic lives in `lib/agent.ts` (pure templates, unit-tested) and `lib/agentData.ts` (server-only database calls).

7. **Access.** Until slice 4's gate covers `/api/agent` and the dashboard, the API and the preview page call `notFound()` in production. Slice 4 removes that guard when it adds the gate (handover note in the spec).

8. **Panel and tests.**
   - `components/AgentPanel.tsx` is a Server Component: the questions are links (`?ask=<id>`), the answer and its `SourceList` render on the server. It works without JavaScript and needs no client code. The dashboard passes a function that builds the link, so its own filters stay in the URL.
   - A dev-only `/preview/agent` page shows the panel until the dashboard embeds it; slice 4 deletes the page.
   - Unit tests cover templates, ties, empty data, badges and wording. End-to-end tests check each answer against the slice 5 margins and that a live scan changes the live count. A browser test checks the panel with JavaScript off.

## Consequences

- Answers are exact however much data there is, and every number shows where it came from.
- A live scan in Austria shows up in the first answer's live count within seconds, which is the demo moment.
- Three new database functions (one migration). No new dependency. No external AI model.
- **Handover to slice 4 (other session):** embed `AgentPanel` in the dashboard, put `/api/agent` behind the gate, remove the production guards, and delete `/preview/agent`.
- **Amends ADR 0001:** the fourth question is reworded; the packaging question is dropped.

## Alternatives considered

- **Option B: count in TypeScript.** Fully unit-testable, but exposed to the 1,000-row limit. Rejected.
- **"How does the 92% bar compare on price?"** Needs a fairafric price we do not have. Rejected by the user in favour of data that works.
- **A free-text question box with keyword matching.** Looks smarter, but answers unpredictably in front of the client. Rejected.
- **A client-side panel calling the API.** Needs JavaScript for a feature that does not need it. Rejected; the API stays for tests and later use.
