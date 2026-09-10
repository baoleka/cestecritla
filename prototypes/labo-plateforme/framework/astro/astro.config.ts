import { defineConfig } from 'astro/config';

// Static output (no adapter): the whole page is HTML at build time; the only script is the
// search island. Pass A measured the default 'auto' (external stylesheet above 4 KB); pass B
// inlines the stylesheet ('always'), one round trip less before first paint (perf-budget.md §1.2).
export default defineConfig({
  output: 'static',
  site: 'https://aec-lab-fw-astro.baoleka.workers.dev',
  compressHTML: true,
  build: { inlineStylesheets: 'always' },
  vite: {
    json: { stringify: true },
    build: { target: 'es2022', modulePreload: { polyfill: false }, sourcemap: false },
    server: { fs: { allow: ['..'] } },
  },
});
