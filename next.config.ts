import type { NextConfig } from "next";

// Security headers for every response. Adapted from the Finde frontend (lib/securityHeaders.ts),
// with two changes:
// - No frame or media sources: the demo embeds no video and no third-party content.
// - The browser never talks to Supabase (all data access is server-side), so connect-src is 'self'.
//
// As in Finde, the full CSP ships as Report-Only first, and a small policy that cannot break
// anything is enforced now. Next.js injects inline bootstrap scripts, so script-src needs
// 'unsafe-inline' until nonces are wired in.
//
// Kept inline in this file on purpose: on machines where Windows blocks the native SWC binary,
// Next falls back to WASM, which cannot resolve extensionless imports from next.config.ts.

const isDev = process.env.NODE_ENV !== "production";

const reportOnlyCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const enforcedCsp = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'";

const securityHeaders = [
  { key: "Content-Security-Policy", value: enforcedCsp },
  { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=(), payment=()" },
  // Demo pages must never show up in search as real fairafric pages (APPROACH.md section 6).
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  // The browser tests run a second dev server (database down) with its own build folder,
  // so the two servers never share .next (see playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
