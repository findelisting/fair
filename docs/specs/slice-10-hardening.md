# Slice 10 spec: hardening and label audit

Implements [ADR 0008](../adr/0008-hardening-and-label-audit.md).

| Id | Behaviour | Test |
|---|---|---|
| H-1 | Every page shows "Demo prototype, synthetic data" | browser |
| H-2 | Every page is `noindex` (meta tag and `X-Robots-Tag`) | browser |
| H-3 | Public pages set no cookie (no `Set-Cookie`, empty `document.cookie`) | browser |
| H-4 | Public pages make no request to another origin | browser |
| H-5 | No video files, no `<video>`, `<iframe>`, `<embed>` or `<object>` | unit + browser |
| H-6 | No contact or identity field in the feedback form or the schema | unit + browser |
| H-7 | No claim word (`BANNED_CLAIM_WORDS`) in app text | unit + manual |
| H-8 | No secret in client code or in anything the browser loads | unit + browser |
| H-9 | Badges, hypothesis labels, sources and dates read correctly | manual (`docs/LABEL_AUDIT.md`) |
| H-10 | Works on a real phone over mobile data | manual |
