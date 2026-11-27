# ADR 0012: Dashboard redesign, navigation and motion

- Status: Accepted (2026-11-27)
- Date: 2026-11-27
- Scope: the design spec "Finde × fairafric dashboard" (sections 0 to 9), applied to `/dashboard`.

## Context

The spec asks for a presentation change only: a sticky top bar with section links, filters that apply on change, one data-confidence key in place of the per-card evidence pills, a row layout, a journey diagram, and a motion system for numbers and charts. Numbers, data logic, the refresh interval and the agent's logic stay as they are.

Some spec items meet limits of this prototype. Each is decided below so nothing claims more than the demo does.

## Decision

1. **Shared live state.** One client provider (`DashboardLive`) owns the 5-second poll, the last summary, the live events and the filter transition. The top bar, the status line and every number card read from it, so the server-rendered agent and ideas rows can sit between them. The provider is not remounted on a filter change: the new server summary replaces the old one, and numbers tween from their previous value.
2. **Top bar.** Sticky under the demo banner. Title "Product performance", poll status (Live dot, last update, Reconnecting), section links (Overview, Scans, Website, Feedback, Agent, Ideas, Sources) highlighted with IntersectionObserver, Data sources drawer button, QR codes link. On a phone the section links scroll sideways.
3. **Filters.** "One bar" / "All bars" replaces "Product view" / "Collection view" (same URLs). Bar, market and campaign apply on change through a client navigation; a `<noscript>` Apply button keeps the form working without JavaScript. Active filters show as removable chips with "Clear all". Every market and campaign stays in the list; one with no scans for the chosen bar reads "no scans yet" and is disabled (unless it is the current choice). We say "no scans" because the check uses scans only. On a phone the filters fold into a "Filters" panel with an active-count badge.
4. **Data-confidence key.** One key under the filters: Observed (counted directly), Attributed (linked by code or campaign tag), Correlation (pattern, worth testing), Public reference (public source, with link and date), plus a separate Live / Synthetic key. Cards show one small icon next to their title, linked to the key; the icon keeps `data-testid="evidence-tag"` and an accessible name with the full meaning. The Live / Synthetic badge stays on every card. A "How sure?" popover repeats the key.
5. **Rows.** Overview (four KPI cards and the journey), Scans and Website, Feedback and Page views, Product agent (the only dark block), Ideas and market context (one light card per idea, one "Was this useful?" per section), Data sources (compact list; the full list opens in a right-side drawer). Maximum width 1200 px.
6. **Journey.** QR scan, Product page, Feedback, Shop click, each with its count, its evidence icon and its Live / Synthetic label, bar width proportional to the count. No conversion percentages: the stages mix sources and time windows, so a percentage would read as a funnel rate that the data does not support.
7. **Motion.** Tokens in `globals.css`. First load counts numbers up (600 ms) and grows bars from the baseline; a refresh tweens only values that changed (250 ms, green tint on increase), never from zero; a live scan pulses the Live dot and outlines the scans card, at most once per 3 seconds. Under `prefers-reduced-motion: reduce` numbers jump to their value and no transform animation runs.
8. **Agent.** Chips for the prepared questions. The answer is still computed on the server and rendered in full (it works without JavaScript); in the browser it streams at about 40 characters per second after a short "Looking at …" line built from the answer's own sources, with a Stop control. Reduced motion shows it at once. There is no free-text box: the agent answers prepared questions only (ADR 0006), and the spec keeps the agent's logic out of scope. Each answer gets one "Was this helpful?" control.
9. **Insight checks.** Card ids gain `insights:<sku>` (one per Ideas section) and `agent:<question>`; both fit the existing database check, so no migration.

## Not done, and why

- **Change against the previous period** on KPI cards: the summary has no previous period. The spec says show nothing rather than invent one.
- **Lighthouse score**: not run in this pass; contrast uses the existing AA tokens.

## Tests

- Unit: `filterChips`, `optionsWithScans`, `journeySteps`, `agoText`, `starFills`, `agentStatusLine`, new card ids.
- Browser: section nav and key, filters on change with chips, drawer with Escape and focus return, reduced-motion numbers, agent stream and Stop; existing dashboard tests updated for the new labels.
