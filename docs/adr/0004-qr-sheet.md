# ADR 0004: QR sheet (slice 8), dashboard page with branded codes

- Status: Accepted (2026-11-26)
- Date: 2026-11-26
- Scope: BUILD_PLAN.md slice 8. Done when a printed sheet scans correctly from a phone against the deployed URL.

## Context

The demo starts with a printed code. Slice 8 builds the page that prints them. We compared:

- **Option A:** a page at `/dashboard/codes`, QR codes rendered on the server as inline SVG.
- **Option B:** a script that writes print files.

We chose A: printing codes from the dashboard is part of Finde's story, and the page is reused after the demo. The user also asked for the fairafric logo in the centre of each code, with the visual design done in Claude Design (prompt below).

### Stress test of option A

| # | Finding | Effect if ignored | Fix |
|---|---|---|---|
| 1 | **A logo covers modules.** A centre logo hides part of the code | Codes that do not scan | Error correction level `H` (30%). Logo covers at most 20% of the code's width squared, on a white pad (decision 3) |
| 2 | **Wrong base URL in print.** Codes printed from localhost or a Vercel preview point nowhere for the client | A printed sheet that is useless on demo day | Big warning, and the "print-ready" mark only shows for an `https` URL that is not localhost and not `*.vercel.app` (decision 4) |
| 3 | **Too small in print.** With a logo and level `H`, small codes fail on older phones | Missed scans in the room | Printed at 35 mm, set in CSS `mm` units; never below 25 mm (decision 5) |
| 4 | **Quiet zone eaten by the frame or text** | Codes that do not scan | 4-module quiet zone kept white; call-to-action and label sit outside it (decision 5) |
| 5 | **"Does the logo break it?" is only checked by eye** | We find out on demo day | A browser test decodes every rendered code with `jsQR` and checks it gives the exact URL (decision 7) |
| 6 | **Logo file.** We must not redraw or imitate fairafric's logo | Brand misuse | Use only an official logo file from fairafric or their press kit, kept in `public/brand/`. Until it arrives, a neutral placeholder marked "Logo" (decision 3) |
| 7 | **The code list is not public.** Anyone with it can make fake scans | Polluted live numbers | Dev-only until slice 4; slice 4 puts `/dashboard/codes` behind the demo password (decision 6) |
| 8 | **Colour and dark mode in print.** Browsers drop backgrounds; dark themes invert | Low contrast, failed scans | Codes are always dark modules on white, with `print-color-adjust: exact` (decision 5) |
| 9 | **CSP.** `img-src 'self'` only | External images blocked | Codes are inline SVG; the logo is a local file or inline SVG |
| 10 | **Shared `package.json`** with the other session | Merge clash | Add `qrcode` and dev-only `jsqr`, commit those two files at once, by name |

## Decision

1. **Page:** `app/dashboard/codes/page.tsx`, a server component. One card per code from `lib/catalog.ts` (read only). Inactive codes are shown greyed out with "Inactive".
2. **Logic in `lib/qrSheet.ts`:** builds the URL `${PUBLIC_BASE_URL}/r/${code}`, renders the SVG with `qrcode` (`errorCorrectionLevel: 'H'`, margin 4) and checks the base URL. Unit-tested.
3. **Logo:** centred on a white rounded pad, at most 20% of the code's width. Official file only (`public/brand/fairafric-logo.svg`, supplied by the user); a neutral placeholder until then.
4. **Base URL check:** `ok` for `https` and not localhost or `*.vercel.app`; otherwise a warning banner and no "print-ready" mark.
5. **Print layout:** A4, a grid of cards, 35 mm codes, white quiet zone, a short call to action above ("Scan for the story behind this bar"), and a label below (SKU or collection, campaign, market, code). Every card says "Demo only". Cut guides. Black on white, `print-color-adjust: exact`.
6. **Access:** dev-only (`notFound()` in production) until slice 4 adds the password gate, then gated.
7. **Tests:** unit tests for URL building and the base-URL check; a Chromium browser test that decodes each rendered code with `jsQR` and compares it with the expected URL; manual phone scan of a printed sheet against the deployed URL (Done when).
8. **Visual design:** from Claude Design, applied as styles only. The QR modules always come from `qrcode`, never from a designed image.

## Consequences

- Every printed code is proven to decode, logo included.
- Two new packages: `qrcode` (runtime) and `jsqr` (development only).
- The real logo must come from fairafric or their press kit before printing for the demo.
- Slice 4 adds `/dashboard/codes` to the password gate and removes the dev-only guard.

## Amendment 1 (2026-11-26): plain codes, logo on request

The Claude Design QR designs were not good enough. Decision: the sheet prints plain, standard QR codes (black on white, level H, 4-module quiet zone). No logo placeholder is shown. A screen-only note tells the client they can upload their logo; once a logo file is placed at `public/brand/fairafric-logo.svg`, it is added in the centre with the same 20% limit and the decode test still applies. Level H stays, so adding a logo later needs no other change.
