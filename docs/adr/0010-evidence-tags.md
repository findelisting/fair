# ADR 0010: Evidence tags (observed, attributed, correlation, reference)

- Status: Accepted (2026-11-27)
- Date: 2026-11-27
- Scope: a second label on dashboard panels, agent answers and ideas, saying how directly each number is known. It sits next to the existing Live / Synthetic data badge, which says where the number comes from.

## Context

Not every source supports product-level attribution. A scan of `d92-at` is observed directly; shop clicks after a campaign are linked to it through a tag; a pattern across markets is only a correlation. The strategy notes (2026-11-27) make this transparency a selling point. Today the dashboard only says Live or Synthetic data. We compared:

- **Option A:** one tag per panel, per agent answer and per idea card, from a fixed mapping in `lib/evidence.ts`, plus a short legend above the panels.
- **Option B:** one tag per metric row inside each panel.

We chose A. B puts a tag on every line, which is noise for a non-technical audience in a 10-minute demo, and each panel in the demo holds one kind of evidence anyway.

### Stress test of option A

| # | Finding | Effect if ignored | Fix |
|---|---|---|---|
| 1 | Two badges per panel confuse (Live/Synthetic and Observed/...) | Viewer cannot tell what each means | Different shape: the data badge is filled, the evidence tag is an outline; a legend line explains the four tags once |
| 2 | "Attributed" overstates what the demo knows | Implied causal proof | Legend says "linked through a code or campaign tag", not "caused by" |
| 3 | Competitor prices are none of the three | Forced into a wrong category | Fourth tag "Public reference" for outside sources |
| 4 | A new question or panel ships without a tag | Unlabelled numbers | Mapping is typed over `QuestionId`; unit test checks every question and every panel id has a tag |
| 5 | Ideas tagged "Correlation" next to "Hypothesis, not validated" read as two warnings | Clutter | Correlation tag sits once in the ideas panel header, not on every idea |

## Decision

1. `lib/evidence.ts`: `EvidenceKind = 'observed' | 'attributed' | 'correlation' | 'reference'`, a label and one-line meaning for each, and fixed mappings for panels and questions.
2. `components/EvidenceTag.tsx`: outline pill with `data-testid="evidence-tag"` and `data-evidence`.
3. Mapping: QR scans, page views and feedback are observed. Website metrics are attributed (linked through campaign tags). Agent: scans by code observed; campaign to feedback visits attributed; themes observed; comparable bars public reference. Ideas panel: correlation.
4. `components/EvidenceLegend.tsx` above the panels: one line per tag.

## Tests

- Unit (`tests/unit/evidence.spec.ts`): every question and panel id has a tag; every kind has a label and meaning; "attributed" is never described as cause.
- Browser (`tests/browser/dashboard.spec.ts`): each live panel shows one evidence tag; the legend lists four tags; an agent answer shows its tag; the ideas panel shows the correlation tag.
