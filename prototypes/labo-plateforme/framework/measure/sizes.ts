/**
 * Static weights of both builds (perf-budget.md §5.3): raw / gzip -9 per file, initial JS
 * (scripts referenced by index.html, framework included), lazy JS, CSS, HTML, fonts, data;
 * plus the bytes on the wire as served by Static Assets (brotli), fetched from workers.dev.
 *
 * Output: measure/out/sizes.json
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { outDir, VARIANTS, wireSize } from './common.ts';

interface FileSize {
  path: string;
  raw: number;
  gzip: number;
  /** Bytes on the wire from workers.dev (brotli or gzip as negotiated). */
  wire?: number;
  encoding?: string;
  role:
    | 'html'
    | 'js-initial'
    | 'js-lazy'
    | 'css'
    | 'css-unreferenced'
    | 'font-preloaded'
    | 'font'
    | 'data'
    | 'other';
}

interface VariantSizes {
  name: string;
  label: string;
  files: FileSize[];
  totals: {
    htmlRaw: number;
    htmlGzip: number;
    htmlWire: number;
    jsInitialGzip: number;
    jsInitialWire: number;
    jsLazyGzip: number;
    /** 0 when the stylesheet is inlined in the HTML (pass B). */
    cssGzip: number;
    cssWire: number;
    /** Inline <style> bytes in index.html (raw), pass B. */
    cssInlineRaw: number;
    fontsPreloaded: number;
    /** HTML + CSS + preloaded fonts + initial JS, compressed as served (P3 critical path, JS included). */
    criticalPathWire: number;
    /** Everything the initial load fetches, on the wire (HTML, CSS, initial JS, preloaded fonts). */
    initialLoadWire: number;
  };
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const gz = (buf: Buffer): number => gzipSync(buf, { level: 9 }).byteLength;

const results: VariantSizes[] = [];
for (const v of VARIANTS) {
  const html = readFileSync(resolve(v.dist, 'index.html'), 'utf8');
  // Scripts the HTML loads before interactivity: <script type="module" src> and modulepreload links.
  const initialScripts = new Set<string>();
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) initialScripts.add(m[1] ?? '');
  for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g))
    initialScripts.add(m[1] ?? '');
  const preloadedFonts = new Set<string>();
  for (const m of html.matchAll(/<link[^>]+rel="preload"[^>]+href="([^"]+\.woff2)"/g))
    preloadedFonts.add(m[1] ?? '');

  const files: FileSize[] = [];
  for (const abs of walk(v.dist)) {
    const rel = `/${relative(v.dist, abs).split('\\').join('/')}`;
    if (rel === '/_headers') continue;
    const buf = readFileSync(abs);
    let role: FileSize['role'] = 'other';
    if (rel === '/index.html') role = 'html';
    else if (rel.endsWith('.js')) role = initialScripts.has(rel) ? 'js-initial' : 'js-lazy';
    else if (rel.endsWith('.css'))
      role = html.includes(`href="${rel}"`) ? 'css' : 'css-unreferenced';
    else if (rel.endsWith('.woff2')) role = preloadedFonts.has(rel) ? 'font-preloaded' : 'font';
    else if (rel.startsWith('/data/')) role = 'data';
    files.push({ path: rel, raw: statSync(abs).size, gzip: gz(buf), role });
  }
  for (const f of files) {
    if (f.role === 'other' || f.role === 'css-unreferenced') continue;
    const target = f.path === '/index.html' ? v.url : new URL(f.path, v.url).toString();
    const w = await wireSize(target);
    if (w.status !== 200) throw new Error(`${target}: ${String(w.status)}`);
    f.wire = w.bytesOnWire;
    f.encoding = w.encoding;
  }
  const sum = (role: FileSize['role'], key: 'raw' | 'gzip' | 'wire'): number =>
    files.filter((f) => f.role === role).reduce((n, f) => n + (f[key] ?? 0), 0);
  const htmlWire = sum('html', 'wire');
  const cssWire = sum('css', 'wire');
  const jsInitialWire = sum('js-initial', 'wire');
  const fontsPreloaded = sum('font-preloaded', 'wire');
  const cssInlineRaw = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].reduce(
    (n, m) => n + (m[1]?.length ?? 0),
    0,
  );
  results.push({
    name: v.name,
    label: v.label,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    totals: {
      htmlRaw: sum('html', 'raw'),
      htmlGzip: sum('html', 'gzip'),
      htmlWire,
      jsInitialGzip: sum('js-initial', 'gzip'),
      jsInitialWire,
      jsLazyGzip: sum('js-lazy', 'gzip'),
      cssGzip: sum('css', 'gzip'),
      cssWire,
      cssInlineRaw,
      fontsPreloaded,
      criticalPathWire: htmlWire + cssWire + fontsPreloaded + jsInitialWire,
      initialLoadWire: htmlWire + cssWire + fontsPreloaded + jsInitialWire,
    },
  });
}

writeFileSync(
  resolve(outDir, 'sizes.json'),
  JSON.stringify({ measuredAt: new Date().toISOString(), variants: results }, null, 2),
);
for (const r of results) {
  console.log(`\n${r.label}`);
  for (const f of r.files) {
    console.log(
      `  ${f.role.padEnd(14)} ${f.path.padEnd(60)} raw ${String(f.raw).padStart(7)}  gzip ${String(f.gzip).padStart(6)}  wire ${String(f.wire ?? '-').padStart(6)} ${f.encoding ?? ''}`,
    );
  }
  console.log(`  totals: ${JSON.stringify(r.totals)}`);
}
