# ADR 0008: Hardening and label audit (slice 10)

Status: accepted, 2026-11-26

## Context
SPEC section 6 and CLAUDE.md set hard rules: a banner on every page, no indexing, no cookies or trackers on public
pages, no hosted video, no contact details stored, every synthetic value labelled, no claim words, secrets server-only.
Each slice tested its own part. Nothing checked the rules across the whole app.

## Decision
Option A: automated checks where a machine can decide, plus a short manual checklist where it cannot.

1. Static checks (`tests/unit/hardening.spec.ts`, no server): no video files tracked; no `<video>` or `<iframe>` in
   `app`, `components` or `lib`; no claim word from `BANNED_CLAIM_WORDS` in app text; no contact or identity column in
   the migrations; no client component references a secret; no `NEXT_PUBLIC_` variable anywhere.
2. Runtime checks (`tests/browser/hardening.spec.ts`, Chromium): every public and gated page shows the banner and
   says `noindex` in both the meta tag and the `X-Robots-Tag` header; public pages set no cookie, make no request to
   another origin and contain no `video`, `iframe`, `embed` or `object`; the feedback form has no contact field; no
   secret value appears in any page or script the browser loads, signed in included.
3. Manual checks in `docs/LABEL_AUDIT.md`: badges and labels read correctly, outbound links, real phone on mobile data.

## Consequences
- The rules are checked on every `npm run test:unit` and `npm run test:e2e`.
- The secret check uses the values in `.env.local`. Against the deployed site (`E2E_BASE_URL`) it only proves
  anything if the same values are exported in the shell; the deployed values differ by design, so the manual list
  covers production.
- Outbound links to fairafric.com (ADR 0003 amendment 1) are navigation, not requests the page makes, so they pass.
