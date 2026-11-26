# Slice 8 spec: QR sheet

Implements [ADR 0004](../adr/0004-qr-sheet.md).

## Behaviour

| Id | Behaviour |
|---|---|
| Q-1 | `/dashboard/codes` lists one card per code in `lib/catalog.ts`, in catalogue order |
| Q-2 | Each code encodes exactly `${PUBLIC_BASE_URL}/r/${code}`, with no trailing slash doubling and no query string |
| Q-3 | Codes use error correction level `H` and a 4-module quiet zone, rendered as inline SVG |
| Q-4 | A logo sits in the centre on a white pad, no wider than 20% of the code. Until `public/brand/fairafric-logo.svg` exists, a neutral placeholder marked "Logo" is used |
| Q-5 | Each card shows a call to action above, and below: label, campaign, market and code. Each card says "Demo only". Inactive codes are greyed out and say "Inactive" |
| Q-6 | Base URL: `PUBLIC_BASE_URL`, or in dev when unset, the request's own origin. Check: `ok` only for `https` and not `localhost`, `127.0.0.1` or `*.vercel.app`. Otherwise a warning banner "Not print-ready: these codes point to a test address." and no print-ready mark. Missing or unparsable URL is `invalid` |
| Q-7 | Print: A4, codes 35 mm wide, cut guides, black on white, `print-color-adjust: exact`. Screen-only controls hidden in print |
| Q-8 | Dev-only: `notFound()` when `NODE_ENV === 'production'`, until slice 4 gates `/dashboard` |
| Q-9 | The page records no scan and no page view, and sets no cookie |

## Tests

- Unit (`tests/unit/qrSheet.spec.ts`): Q-2 URL building, including a trailing slash on the base URL; Q-3 SVG output and level `H`; Q-6 every URL class; every catalogue code gets a card.
- Browser (`tests/browser/qrSheet.spec.ts`): every rendered code, logo included, decodes with `jsQR` to its expected URL; labels and "Demo only" present; warning shown in dev (localhost); no `Set-Cookie`.
- Manual (Done when): print the sheet from the deployed URL and scan each code with a phone.
