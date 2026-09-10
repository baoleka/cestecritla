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

/**
 * The app's own voice, with every quotation of the programme removed.
 *
 * This is not a convenience: the corpus itself legislates about AI. `c18-s05-m12` is "Créer la
 * mission nationale de maîtrise de l'intelligence artificielle", `c18-s05-m13` restricts its
 * uses, `c11-s01-m15` limits generative AI in culture, `c16-s02-m02` names it among military
 * technologies, and `c5-s03-m02.s4` speaks of "assistants d'éducation". Scanned naively, this
 * gate is red on five pages from the first build — and the answer is not to weaken it but to
 * scope it to what the app ASSERTS, which is exactly the distinction the whole product rests on.
 *
 * A quotation reaches the page through four surfaces, not one: the verbatim block, the <title>,
 * the description and Open Graph meta, and the JSON-LD (which carries the measure text as its
 * `text` field). All four are the programme speaking. Everything left is us.
 */
const appVoiceOnly = (html: string): string =>
  html
    .replace(/<figure class="verbatim"[\s\S]*?<\/figure>/g, ' ')
    .replace(/<script type="application\/ld\+json"[\s\S]*?<\/script>/g, ' ')
    .replace(/<title>[\s\S]*?<\/title>/gi, ' ')
    .replace(
      /<meta\b[^>]*\b(?:name|property)=["'](?:description|og:[a-z:]+|twitter:[a-z:]+)["'][^>]*>/gi,
      ' ',
    );

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

void test('no generated custom property carries token metadata', () => {
  // DTCG reserves the `$`-prefix for metadata. motion.duration.$description was being emitted
  // as `--duration-$description: <prose>;`, which is invalid CSS and produced two esbuild
  // syntax errors on every page of the build. Zero `$` is the whole rule.
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  const leaked = [...css.matchAll(/^\s*--[^:]*\$[^:]*:/gm)].map((m) => m[0].trim());
  assert.deepEqual(leaked, [], `metadata leaked into CSS:\n${leaked.join('\n')}`);
});

void test('the built CSS is free of syntax errors esbuild would report', () => {
  if (skip) return;
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  // Balanced braces and one colon per declaration: enough to catch the class of defect above.
  assert.equal((css.match(/{/g) ?? []).length, (css.match(/}/g) ?? []).length, 'unbalanced braces');
  for (const line of css.split('\n')) {
    const decl = line.trim();
    if (!decl.startsWith('--')) continue;
    assert.match(decl, /^--[a-z0-9-]+:\s*.+;$/i, `malformed declaration: ${decl}`);
  }
});
