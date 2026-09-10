/**
 * Post-build step (pass B "inline-css"): inline the single Vite stylesheet into dist/index.html so
 * that the first paint needs one round trip less on Slow 4G (perf-budget.md §1.2). Astro does the
 * same with `build.inlineStylesheets: 'always'`. The hashed CSS file stays in dist (unused).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const htmlPath = resolve(dist, 'index.html');
const html = readFileSync(htmlPath, 'utf8');
const match = /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)">/.exec(html);
if (match === null || match[1] === undefined)
  throw new Error('stylesheet link not found in dist/index.html');
const css = readFileSync(resolve(dist, `.${match[1]}`), 'utf8').trim();
writeFileSync(htmlPath, html.replace(match[0], `<style>${css}</style>`));
console.log(`inlined ${match[1]} (${String(css.length)} B) into index.html`);
