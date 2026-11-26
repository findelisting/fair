# Label audit (manual, slice 10)

Do this on the deployed site after each deploy that changes text, and once the day before the demo.
The automated part runs in `npm run test:unit` and `npm run test:e2e` (ADR 0008).

## Every page
- [ ] Banner "Demo prototype, synthetic data" visible at the top, on phone and laptop.

## Product, collection and feedback pages (phone)
- [ ] Dark 92%: "Shop" opens fairafricghana.com/products/92-dark-chocolate and "Watch the story" opens the YouTube video, both in a new tab. Nothing plays inside the demo.
- [ ] Other bars: "Shop" and "Watch the story" are demo buttons with a "Demo:" note.
- [ ] Feedback form asks only rating, taste note and optional free text. No name, email or phone.
- [ ] Thank-you page appears after sending.

## Dashboard
- [ ] Each panel has a badge: "Live", "Synthetic data" or mixed, matching its numbers.
- [ ] Website metrics always say "Synthetic data".
- [ ] Market context: every value shows a source link and a date; prices marked "~" where estimated.
- [ ] Ideas to test and Packaging ideas: each item says "Hypothesis, not validated" and shows its data basis.
- [ ] Each agent answer lists its sources and the date of the data.

## Words
- [ ] No claim about climate, carbon, CO2, "neutral", certification or compliance anywhere on screen.

## Real phone
- [ ] Wi-Fi off, mobile data on. Scan `d92-at`: product page opens in under 3 seconds.
- [ ] The scan shows on the dashboard within 10 seconds.
- [ ] Scan every printed code once.

Checked by: ____________  Date: ____________
