import { defineConfig } from 'astro/config';

// Static output, no adapter (D7.2): every page is HTML at build time and is served by
// Static Assets. The Worker (src/worker/index.ts) only handles /api/*.
//
// Measured in prototypes/labo-plateforme/framework (9/9/2026, Lighthouse CPU x4, Slow 4G):
// Astro static with inlined CSS = LCP 935 ms, 1 517 o of initial JS, critical path 54 894 o,
// against React 19 + Vite CSR at 2 059 ms / 64 726 o / 118 231 o. Inlining the stylesheet is
// worth -525 ms of LCP on its own (perf-budget.md §1.2).
export default defineConfig({
  output: 'static',
  site: 'https://cestecritla.fr',
  compressHTML: true,
  trailingSlash: 'always',
  build: {
    inlineStylesheets: 'always',
    format: 'directory',
  },

  // Astro computes SHA-256 hashes for every inline style and script and emits them in a
  // <meta http-equiv="content-security-policy">. This is what lets us inline the stylesheet
  // (the -525 ms above) WITHOUT 'unsafe-inline' (H-PLA-15, security §14).
  //
  // Header-only directives (frame-ancestors, base-uri, form-action) live in public/_headers
  // instead: a <meta> CSP cannot express frame-ancestors. The two policies are enforced
  // independently, so they must not both constrain the same directive.
  experimental: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
      ],
    },
  },

  vite: {
    json: { stringify: true },
    build: { target: 'es2022', modulePreload: { polyfill: false }, sourcemap: false },
  },
});
