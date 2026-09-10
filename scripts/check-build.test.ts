/**
 * Ban list and weight gates on the BUILT output (§9 BAN LIST, P2/P3/P8/P9, A2, D12.3).
 *
 * The ban list was checked once, by hand, on the mockups (05-direction-artistique.md §1.1) and
 * never versioned as a gate: nothing failed if a Google Fonts request, a third-party script,
 * Montserrat or #0098B6 reappeared in a build. These read dist/, because what matters is what
 * ships.
 *
 * Run: npx tsx --test scripts/check-build.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, extname } from 'node:path';
import { test } from 'node:test';

const walk = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
};

const files = walk('dist');
const textFiles = files.filter((f) => ['.html', '.css', '.js', '.json'].includes(extname(f)));
const skip = files.length === 0;
const read = (f: string): string => readFileSync(f, 'utf8');

/** Only what the app itself asserts: the corpus is a citation, not our voice. */
const appVoiceOnly = (html: string): string =>
  html.replace(/<figure class="verbatim"[\s\S]*?<\/figure>/g, ' ');

interface Ban {
  readonly what: string;
  readonly pattern: RegExp;
  readonly why: string;
}

const BANS: readonly Ban[] = [
  { what: 'Montserrat', pattern: /\bMontserrat\b/i, why: 'typographie bannie (§9)' },
  { what: 'Roboto Slab', pattern: /Roboto\s*Slab/i, why: 'typographie bannie' },
  { what: 'Union Gothic', pattern: /Union\s*Gothic/i, why: 'typographie bannie' },
  { what: 'Stack Sans', pattern: /Stack\s*Sans/i, why: 'typographie bannie' },
  {
    what: 'Config',
    pattern: /font-family:[^;]*\bConfig\b/i,
    why: 'police commerciale de la charte',
  },
  { what: '#0098B6', pattern: /#0098B6/i, why: 'couleur bannie' },
  { what: '#0e8a9c', pattern: /#0E8A9C/i, why: 'couleur bannie' },
  { what: '#C9462C', pattern: /#C9462C/i, why: 'ocre banni' },
  { what: '#8B24D9', pattern: /#8B24D9/i, why: 'couleur bannie' },
  {
    what: 'Google Fonts',
    pattern: /fonts\.(googleapis|gstatic)\.com/i,
    why: 'témoin mesuré : LCP 2 445 ms',
  },
  {
    what: 'WebGL / Three.js',
    pattern: /\bthree\.min\.js|getContext\(\s*["']webgl/i,
    why: 'budget perf et a11y',
  },
  {
    what: 'cookie banner',
    pattern: /bandeau\s+cookies|cookie[- ]consent|tarteaucitron/i,
    why: 'aucun traceur à consentir',
  },
  {
    what: 'maximum-scale < 5',
    pattern: /maximum-scale\s*=\s*[1-4](?!\d)/i,
    why: 'A2 : le zoom reste possible',
  },
  { what: 'user-scalable=no', pattern: /user-scalable\s*=\s*no/i, why: 'A2' },
  { what: 'text-size-adjust:none', pattern: /-webkit-text-size-adjust\s*:\s*none/i, why: 'A2' },
];

void test('no banned font, colour, script or pattern reaches the build', () => {
  if (skip) {
    console.log('  (skipped: no dist/ — run `npm run build` first)');
    return;
  }
  const offenders: string[] = [];
  for (const file of textFiles) {
    const body = file.endsWith('.html') ? appVoiceOnly(read(file)) : read(file);
    for (const ban of BANS) {
      if (ban.pattern.test(body)) offenders.push(`${file}: ${ban.what} — ${ban.why}`);
    }
  }
  assert.deepEqual(offenders, [], `ban list hits:\n${offenders.join('\n')}`);
});

void test('no request leaves the origin (P9, D0.22: zero third party)', () => {
  if (skip) return;
  const offenders: string[] = [];
  // src/href pointing at another origin. Link targets in prose are fine; fetched subresources
  // are not — those are what cost a request and leak a referrer.
  const subresource =
    /<(?:script|link|img|iframe|source|video|audio)\b[^>]*\b(?:src|href)=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  for (const file of textFiles.filter((f) => f.endsWith('.html'))) {
    for (const m of read(file).matchAll(subresource)) {
      const url = m[1] ?? '';
      // A stylesheet or script from elsewhere is the defect; rel=canonical/alternate is not one.
      if (/rel=["']?(canonical|alternate|me)\b/i.test(m[0])) continue;
      offenders.push(`${file}: ${url}`);
    }
  }
  assert.deepEqual(offenders, [], `third-party subresources:\n${offenders.join('\n')}`);
});

void test('media queries use em or rem, never px (A2)', () => {
  if (skip) return;
  const offenders: string[] = [];
  const media = /@media[^{]*\((?:min|max)-(?:width|height)\s*:\s*([\d.]+)(px)\s*\)/gi;
  for (const file of textFiles.filter((f) => f.endsWith('.css') || f.endsWith('.html'))) {
    for (const m of read(file).matchAll(media)) {
      offenders.push(`${file}: ${m[1] ?? ''}${m[2] ?? ''}`);
    }
  }
  // Chrome Android M113+ applies the system font size as a page zoom: a px breakpoint ignores
  // it for ~40 % of users and reproduces the measured M4 overflow.
  assert.deepEqual(offenders, [], `px breakpoints:\n${offenders.join('\n')}`);
});

void test('initial JS stays under the P2 budget of 100 KB gzip', () => {
  if (skip) return;
  const js = files.filter((f) => f.endsWith('.js'));
  const total = js.reduce((n, f) => n + gzipSync(readFileSync(f), { level: 9 }).byteLength, 0);
  const budget = 100 * 1024;
  assert.ok(total <= budget, `initial JS ${String(total)} B gzip > ${String(budget)} B`);
  console.log(`  JS gzip: ${String(total)} B of ${String(budget)} B (${String(js.length)} files)`);
});

void test('fonts delivered stay under the P8 budget of 75 KB', () => {
  if (skip) return;
  const fonts = files.filter((f) => f.endsWith('.woff2') || f.endsWith('.woff'));
  const total = fonts.reduce((n, f) => n + statSync(f).size, 0);
  const budget = 75 * 1024;
  assert.ok(total <= budget, `fonts ${String(total)} B > ${String(budget)} B`);
  console.log(`  fonts: ${String(total)} B of ${String(budget)} B (${String(fonts.length)} files)`);
});

void test('a section page stays under the P3 critical-path budget', () => {
  if (skip) return;
  const page = 'dist/s/c1-s02/index.html';
  if (!existsSync(page)) return;
  // CSS is inlined, so the HTML carries the critical path on its own.
  const gz = gzipSync(readFileSync(page), { level: 9 }).byteLength;
  const budget = 150 * 1024;
  assert.ok(gz <= budget, `critical path ${String(gz)} B gzip > ${String(budget)} B`);
  console.log(`  section page: ${String(gz)} B gzip of ${String(budget)} B`);
});
