# Design Review: Finde × fairafric demo (design pass, uncommitted)

Reviewed against: `docs/presentation/design-prompt.md` (used as the brief; there is no `DESIGN_BRIEF.md`)
Philosophy: "Ghanaian cocoa": premium, warm and trustworthy. Cocoa and cream on the shopper pages, night green and gold for the brand team. Calm data density.
Date: 2026-11-26
Build reviewed: local dev server (`next dev -p 3100`) with the uncommitted design pass. Screenshots use a bot user agent, so they recorded no page views.

## Screenshots Captured

All screenshots are in `.design/demo-redesign/screenshots/`. Each page was captured full-page at three widths: `-mobile-375` (375×812), `-tablet-768` (768×1024) and `-desktop-1280` (1280×800).

| Screenshot (prefix) | Description |
| --- | --- |
| `review-home-*` | Demo guide: hero, the four steps with test codes, what the labels mean |
| `review-product-*` | Product page, Dark 92% (cocoa hero, actions) |
| `review-feedback-*` | Feedback form, empty |
| `review-thanks-*` | Thank-you page |
| `review-collection-*` | Collection page, Vegan Creamy line |
| `review-login-*` | Login |
| `review-login-error-*` | Login, error "That password did not work." |
| `review-dashboard-product-*` | Dashboard, product view, Dark 92% |
| `review-dashboard-agent-answer-*` | Dashboard with an agent answer and its sources open |
| `review-dashboard-collection-de-*` | Dashboard, collection view, market Germany |
| `review-qr-sheet-*` | QR code sheet |
| `review-product-focus-mobile-375.png` | Product page after two Tab presses (keyboard focus check) |
| `review-feedback-filled-mobile-375.png` | Feedback form with 4 stars, "Nicely intense", textarea focused |

Dark mode: not captured. The app has no dark theme, and the brief does not ask for one.

## Summary

The design pass delivers the brief's direction. The shopper pages feel like a chocolate brand's product: cocoa hero, drawn bars, cream body. The dashboard reads calmly, and every panel and idea keeps its label. The biggest gaps are accessibility and the brief's top UX priority. Small grey text fails WCAG AA contrast in about 30 places. Empty stars are almost invisible. And when a live scan arrives, nothing draws the eye to the number that changed, even though the brief calls that moment "the climax of the demo".

## Must Fix

1. **Small grey text fails AA contrast.** `--color-ink-tertiary` `#8A7D73` measures 3.55:1 on cream and 3.53:1 on canvas. WCAG AA needs 4.5:1 for small text. It is used about 30 times, for example in the notes under Shop and Watch the story, "last 60 days", the stat tile labels, "Data basis", "Useful and accurate?" and the footer. See `review-product-mobile-375.png` and `review-dashboard-product-desktop-1280.png`. _Fix: change the token in `app/globals.css` to `#70645A`. It measures 5.07:1 on canvas, 5.11:1 on cream and 4.57:1 on cream-deep. The token's role stays the same._
2. **Empty rating stars are almost invisible.** `text-cocoa/15` on cream measures about 1.4:1. WCAG 1.4.11 needs 3:1 for a control's boundary. A shopper may not see that there are five stars to tap. See `review-feedback-mobile-375.png`. _Fix: in `components/RatingInput.tsx`, draw empty stars as a caramel outline (stroke `#B8733A`, 3.37:1 on cream) with no fill. Keep the caramel fill for chosen stars._
3. **The live moment has no highlight.** The brief's first UX priority: "make that change visible, for example with a gentle highlight on the number that changed". `LivePanels` replaces the numbers silently every 5 seconds, so a presenter has to point at the number. _Fix: in `components/dashboard/LivePanels.tsx`, keep the previous totals in a ref. When `scans.total.live` or `feedback.total.live` goes up, add a class to that number for about 2 seconds: a green glow plus a "+1 live" tag, announced through the existing `aria-live` region. Under `prefers-reduced-motion`, show the tag without animation._

## Should Fix

1. **The collection view leaves out a bar with no scans.** With the market set to Germany, "By bar" lists Vegan Creamy Oat and Collection code, but not Hazelnut, whose only code is for Switzerland. The brief asks for "Oat compared with Hazelnut". See `review-dashboard-collection-de-desktop-1280.png`. _Fix: build the "By bar" rows from `skusInCollection()` and fill in missing bars with 0, so both bars always appear._
2. **Long campaign names get cut off.** "On-pack wrapper co…" in the QR scans panel, at every width. See `review-dashboard-product-desktop-1280.png`. _Fix: in `Bars`, let the label wrap to two lines (`line-clamp-2` instead of `truncate`), or widen the label column to `minmax(6rem, 11rem)`._
3. **Focus styles are inconsistent.** Give feedback, the code cards and the collection cards have a caramel or green focus outline. Send feedback, Shop, Watch the story, the dashboard question links and the thumbs buttons rely on the browser default. `review-product-focus-mobile-375.png` shows no clear focus after two Tab presses. _Fix: set one focus rule in `globals.css`, for example `:where(a, button, select, textarea):focus-visible { outline: 2px solid var(--color-caramel or green); outline-offset: 2px }`, scoped by page theme, and drop the one-off outline classes._
4. **Tap targets are below the brief's 48 px.** The taste chips use `min-h-11` (44 px). The brief asks for at least 48 px on mobile. _Fix: `min-h-12` on the chips in `components/FeedbackForm.tsx`._
5. **No logo spot.** The brief asks for a neutral placeholder box labelled "fairafric logo". The pages use the text "fairafric" as an eyebrow instead. _Fix: add a small dashed placeholder box in the cocoa hero on the product page and in the home page header, ready to swap for the logo file._
6. **Feedback reassurance copy.** The brief's line is "No name, no email, no account." The form opens with three sentences instead. _Fix: keep the privacy sentence for the record, but lead with the brief's short line in bold._
7. **Feedback panel coverage.** The brief asks for one example quote per theme and the last 5 comments. The panel shows one example, for the top theme only. _Fix: show the example quote when a theme row is expanded (`<details>`), and check that the recent-feedback query returns 5 rows._

## Could Improve

1. **"Updated just now".** The brief's wording is friendlier than "Updated 19:27:19". _Suggestion: show "Updated just now" when the last poll is under 10 s old, and the exact time on hover._
2. **Product page on tablet and desktop.** The cream area under the actions is empty (`review-product-tablet-768.png`). _Suggestion: when fairafric's story arrives, use that space for the story and a "What other shoppers say" teaser (live data, labelled)._
3. **Daily charts.** The brief mentions a 60-day line chart. The build uses stacked daily columns, which show live and synthetic per day more clearly. Keep the columns, and say so in the design notes so it does not read as a deviation.
4. **Shadows.** The login card is the only element with a strong shadow. Every other surface uses a 1 px ring. That fits the calm direction. Record it as a rule: rings for surfaces, shadow only for floating layers.

## What Works Well

- **Split look.** The cocoa and cream shopper pages and the night-green dashboard feel like one product with two audiences, which is the brief's intent (`review-product-mobile-375.png`, `review-dashboard-product-desktop-1280.png`).
- **Live vs synthetic at a glance.** Solid green against striped purple, with a legend at the top. The pair passed the dataviz palette validator, and the stripes mean colour is never the only cue. Synthetic data looks deliberate, not broken.
- **Honest labelling everywhere.** The banner, data badges, "Demo content", "DEMO IMAGE" on the drawn bars, the hypothesis and suggestion labels, "~" on estimated prices, and sources with dates under each agent answer (`review-dashboard-agent-answer-desktop-1280.png`).
- **Home page as a guide.** A presenter working alone can run the demo from it: numbered steps, tappable test codes, and the labels explained in plain words.
- **Layout.** The independent dashboard columns removed the half-empty Page views card. On mobile, the dashboard stacks cleanly and the filters are full width.
- **Contrast passes on the strong pairs:** caramel on cocoa 4.70:1, mist on night 8.95:1, night on gold 6.63:1, synthetic purple on its surface 5.10:1, green on canvas 5.48:1.
- **Brief compliance:**
  - None of the banned words (climate, carbon, CO2, neutral, certification, compliance) appear in `app/` or `components/`.
  - No video is embedded.
  - The feedback form asks for no personal data.
  - All 35 browser tests pass, including "no cookies and no requests to other sites" and "every public page fits a phone and has large tap targets".

## Status after fixes (2026-11-26)

All Must Fix and Should Fix items are done:

- `--color-ink-tertiary` is now `#70645A` (AA).
- Empty stars are drawn as caramel outlines.
- A new live scan or answer makes the number glow and shows "+N live", and the status line says "New live scan". Checked with a test-tagged scan: `fix-live-flash-desktop-1280.png`.
- The collection view lists every bar, with 0 when a bar has no scans. See `fix-collection-de-desktop-1280.png`.
- Bar labels wrap to two lines instead of being cut off.
- There is one focus style for every control, through `--focus-ring`.
- Taste chips are 48 px tall.
- A "fairafric logo" placeholder sits on the home, product and collection pages.
- The feedback form leads with "No name, no email, no account." (`fix-feedback-mobile-375.png`).
- The Feedback panel has an example for every theme.

Tests: 139 unit tests, and 69 end-to-end and browser tests, pass.

Screenshots stay local (`.design/*/screenshots/` is git-ignored).
