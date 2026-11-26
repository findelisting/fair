# Task: Build a clickable demo prototype for fairafric (on-pack QR and data layer)

## Context
Finde is a Ghana-built SaaS platform. We are preparing a demo for fairafric, a Ghanaian chocolate brand (finished bars, packaging, and marketing; not a cocoa trader). The prototype must show how a QR code on pack links to a product page, how scans and customer feedback are recorded per SKU and campaign, and how an AI "product agent" answers questions across the collected data with sources shown.

This is a prototype for a sales conversation. It is NOT production software. Read SPEC.md in this folder first; it is the source of truth for scope.

## Goal
A working demo, deployable to a demo URL, that a non-technical marketing team can click through in about 10 minutes.

## Scope
REAL (must work end to end):
1. QR redirect: a route like /r/:code looks up the code, records a scan event (SKU, collection, campaign, market, timestamp, device type, language), and redirects to the target page with query parameters ?sku=&campaign=&market=.
2. Target pages: a product page per SKU (demo content) and a feedback form per SKU (three questions: rating 1-5, taste note, optional free text). Feedback is stored with SKU, campaign, and market. Never store names, emails, or raw IP addresses.
3. Store scans and feedback in a simple database (SQLite or Postgres). Seed the QR codes for 2-3 SKUs and one collection code.
4. Shared redirect-link use: one collection code can point to several SKUs.

MOCK (visibly labelled "Synthetic data" in the UI):
5. Website analytics connector: a dashboard panel with sessions, page views, video plays, and shop clicks per SKU, campaign, and market. Generated data, clearly labelled as synthetic.
6. Feedback themes: synthetic themes per SKU (e.g. bitterness, packaging, origin) with counts and one anonymised example each.
7. Dashboard: product view and collection view, with filters for market and campaign. Show scan counts, website metrics, and feedback summary.
8. Product agent: a panel where three prepared questions can be selected, e.g. "Which packaging had the most scans in Austria?", "Which campaign drove visits to the feedback page?", "Which theme comes up most for the 92% bar?". Answers are generated from the seeded data by code (do not call an external LLM for the prototype). Each answer must show the data it used (sources and date).
9. Competitor comparison: a static panel with one or two public product references, each with a source URL and a date. No live scraping.
10. Improvement suggestions: a static list of hypotheses, each marked "Hypothesis, not validated" with its data basis.

NOT IN SCOPE (do not build):
- Video hosting or video embedding. Videos stay on the brand's own site.
- User accounts, login, customer identification, repeat-user tracking.
- Loyalty programmes, vouchers, or payments.
- Real connections to fairafric systems or ad accounts.
- Live competitor scraping.
- Anti-counterfeit or serialised codes.
- Any compliance or certification claims.
- Analytics cookies or third-party trackers on any page.

## Constraints
- Do not modify the Finde production repository. Read it for reference only, if at all.
- Keep the stack simple and easy to deploy. If an existing Finde stack is referenced, match it where practical; otherwise choose one simple stack and say which.
- Every synthetic value, hypothesis, and demo-only feature must be visibly labelled in the UI.
- Put a banner on every page: "Demo prototype, synthetic data".
- Include a seed script and a README that explains how to run, seed, and reset the demo.
- Language: UI copy in English, with German available as a second language only if cheap to add. Keep the product name "Finde" and the brand "fairafric" as given.

## Before writing code
Read SPEC.md. Then list any open questions in one short message (for example: which stack, which demo domain, which SKUs and product photos to use). Proceed with sensible defaults for anything that is not blocking, and state each default you chose.

## Deliverables
- Working app with README (run, seed, reset, deploy).
- Seed data for 3 SKUs and 1 collection.
- A short DEMO_SCRIPT.md that follows the 10-minute demo flow in SPEC.md.
- A checklist mapping each SPEC acceptance criterion to how it is met.

## Acceptance criteria (from SPEC.md)
- A scan of a test code creates a scan event that appears on the dashboard within 10 seconds.
- The redirect reaches the target page with sku and campaign parameters.
- Feedback submitted on the form appears on the dashboard with SKU, campaign, and market.
- Product and collection views work, with a market filter.
- Every agent answer lists its sources.
- Every competitor value shows its source and date.
- All synthetic data and hypotheses are labelled.
- No video is hosted by the app.
- The feedback form stores no names or contact details.

Report back with: what you built, what is mocked, the defaults you chose, and anything that blocks the demo.