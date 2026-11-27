# Demo script (about 10 minutes)

Follows SPEC.md section 5. Demo URL: `https://fairafric-demo.thefindeapp.com`. Main presentation code: **d92-at** (`docs/presentation/qr-d92-at.png`); the other codes are for showing how campaigns and markets split.

Audience: fairafric's marketing and branding team, non-technical. Say "synthetic data" whenever a number is not from a live scan.

## Before you start

- Printed QR sheet (from the deployed URL), phone charged, mobile data on.
- Laptop: dashboard open and signed in, backup screenshots open in a second window.
- Data reset the day before (see runbook below).

## 1. Problem (2 min)

Say: the pack carries the origin story, the website tells more, but today nothing connects a scan, the visit and what the customer thinks.

Show nothing yet. Hold up the printed bar or the QR sheet.

## 2. Live scan (2 min)

1. Scan code **d92-at** (Dark 92%, wrapper, Austria) with the phone.
2. Point out: the page opened with the product, campaign and market in the address (`?sku=dark-92&campaign=wrapper-2026&market=AT`).
3. Show the product page: banner "Demo prototype, synthetic data", "Shop" opens the real Dark 92% page on fairafricghana.com and "Watch the story" opens fairafric's video on YouTube, both in a new tab; no video is hosted here. Other bars show labelled demo buttons.
4. Scan **fb-d92** (feedback form). Submit a rating, a taste note, and optionally a short comment. Point out: no name, no email, no account.

## 3. Dashboard (3 min)

1. Open `/dashboard` (signed in before the meeting). The live scan from step 2 is in the counts (within 10 seconds).
2. Product view: Dark 92%. Scans, website metrics, feedback themes. Point to the "Synthetic data" badges: history is generated, the scan you just made is live. Then the evidence tags: scans and feedback are "Observed", website metrics "Attributed" (linked through campaign tags). Open "How sure is each number?" if asked.
3. Filter market **Austria**, then campaign **Shelf talker, Q4**.
4. Switch to collection view: **Vegan Creamy line** (one code, two bars).
5. Feedback themes: one example sentence per theme. The feedback you submitted appears with SKU, campaign and market.
6. In the product view, the "Market context" and "Ideas to test" cards: short snippets with sources and dates. "Sources are linked so you can check any detail." Packaging ideas are marked "Suggestion, not validated" (they are also the branding team).

## 4. Agent (2 min)

Frame it first: not a chatbot. Every bar on the shelf feeds one product, and the product agent reports from that memory. Click the prepared questions in turn; read the answer, point to its evidence tag, then open its sources.

1. "Which packaging had the most scans in Austria?" Expected: the Dark 92% wrapper code leads the shelf talker.
2. "Which campaign drove visits to the feedback page?" Expected: the shelf talker.
3. "Which theme comes up most for the 92% bar?" Expected: bitterness.
4. Optional: "What do comparable dark bars cost?" Prices with `~` are estimates from public listings.

Point out: each answer shows the tables, filters, row counts (live and synthetic separately) and the as-of time. No external AI model; answers are counted from the data.

## 5. Competitors and ideas (1 min)

One competitor reference with source link and date, and two hypotheses marked "Hypothesis, not validated".

## 6. Next steps (1 min)

- Questions for fairafric (SPEC.md section 8) and the pilot proposal (section 9).
- Offer: the client can add their logo to the centre of every QR code. For now they send the file and we add it; self-service logo upload is a later feature (put it in the presentation brief).

## Demo-day runbook

**Day before**
- Open the dashboard to wake the database.
- Run `npm run reset`.
- Scan every printed code once and check it appears on the dashboard.
- Run `npm run reset` again, so the demo starts clean and synthetic data ends today.

**One hour before**
- Check the deployed site and dashboard load.
- Charge the phone. Mobile data on as a fallback for venue Wi-Fi.
- Open the backup screenshots on the laptop.

**During**
- If the live scan fails: use the second phone, or type `/r/d92-at` on the laptop, or switch to the screenshots and keep going.
- If the database is down: the QR redirect still works from the built-in catalogue, but counts will not update. Continue with screenshots for the dashboard.

**Never** run `npm run test:e2e` on demo day after the final reset. Its cleanup deletes live page views created since the run started.

## Backup screenshots

Take one per step above on the deployed app after the final reset and keep them on the laptop (not in the app or repo). Take them with the phone and laptop, name them by step:

1. `01-qr-sheet` — printed sheet or `/dashboard/codes`.
2. `02-product-d92` — product page on the phone after scanning d92-at, address bar visible.
3. `03-feedback-form` and `04-feedback-thanks`.
4. `05-dashboard-product` — Dark 92%, no filter.
5. `06-dashboard-at-shelf` — market Austria, campaign Shelf talker.
6. `07-dashboard-collection` — Vegan Creamy line.
7. `08-agent-q1` to `11-agent-q4` — each answer with its sources open.
8. `12-market-ideas` — Market context, Ideas to test and Packaging ideas cards.
