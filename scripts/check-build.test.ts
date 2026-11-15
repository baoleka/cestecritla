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
import { join, extname, relative } from 'node:path';
import { test } from 'node:test';
import { appVoiceOnly } from './app-voice.js';
import { builtAskMode } from './build-mode.js';

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

void test('a page opens no origin but ours — none, on any page, whether the site answers questions or not', () => {
  // The security policy of each page is the list of who may be asked for anything (P9, D7.6).
  // Checked on what ships (dist/, in the mode data/2026/ask.json says) and on the test build
  // of the ask screen when it is there (dist-ask/, built as if the mode were open).
  // Until D16.23 the home page of a site that answers questions opened one: Turnstile's. There
  // is no bot check any more, and so no exception: the policy of every page names nobody.
  for (const root of ['dist', 'dist-ask']) {
    const pages = walk(root).filter((f) => f.endsWith('.html'));
    for (const file of pages) {
      const page = relative(root, file);
      const policy =
        /http-equiv="content-security-policy" content="([^"]*)"/i.exec(read(file))?.[1] ?? '';
      assert.notEqual(policy, '', `${file}: no Content-Security-Policy`);
      assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|\*/, `${file}: a policy with a hole`);
      assert.match(policy, /default-src 'none'/, file);
      const origins = [...new Set(policy.match(/https?:\/\/[^\s;'"]+/g) ?? [])];
      assert.deepEqual(origins, [], `${page}: opens ${origins.join(', ')}`);
      assert.doesNotMatch(policy, /frame-src (?!'none')/, `${page}: allows a frame`);
    }
  }
});

void test('a link that leaves the site does not say where the visitor comes from', () => {
  // The header of the pages sends our origin with a link to another site. The links that leave
  // — all of them go to the official site — carry `noreferrer`: that site is not told that
  // its visitor reads this one (security review of 15/11/2026). `noopener` stays with it: the
  // page that opens gets no handle on ours.
  for (const root of ['dist', 'dist-ask', 'dist-gists']) {
    for (const file of walk(root).filter((f) => f.endsWith('.html'))) {
      for (const [tag] of read(file).matchAll(/<a\b[^>]*\bhref="https?:\/\/[^"]*"[^>]*>/g)) {
        const href = /\bhref="([^"]*)"/.exec(tag)?.[1] ?? '';
        assert.match(tag, /\brel="noopener noreferrer"/, `${file}: ${href}`);
      }
    }
  }
});

void test('`hidden` hides, whatever display a rule gives the element', () => {
  if (skip) return;
  // Every button of the site is an inline-flex: without this rule the browser's own
  // `[hidden] { display: none }` loses to it, and what a script hid stays on screen.
  for (const file of textFiles.filter((f) => f.endsWith('.html'))) {
    assert.match(
      read(file),
      /\[hidden\]\{display:none!important\}/,
      `${file}: no rule makes the hidden attribute final`,
    );
  }
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

void test('what the search downloads stays small enough for a phone on a slow network', () => {
  if (skip) return;
  const data = files.filter((f) => /dist\/data\/.*\.json$/.test(f));
  if (data.length === 0) return; // holding build: no search
  const total = data.reduce((n, f) => n + gzipSync(readFileSync(f), { level: 9 }).byteLength, 0);
  // Measured 12/11/2026: index 64 KB + titles and locators 33 KB, gzip. Fetched once, on the
  // first search, then cached for a year under a versioned name.
  const budget = 130 * 1024;
  assert.ok(total <= budget, `search data ${String(total)} B gzip > ${String(budget)} B`);
  console.log(`  search data: ${String(total)} B gzip of ${String(budget)} B`);
});

void test('initial JS stays under the P2 budget of 100 KB gzip', () => {
  if (skip) return;
  const js = files.filter((f) => f.endsWith('.js'));
  const total = js.reduce((n, f) => n + gzipSync(readFileSync(f), { level: 9 }).byteLength, 0);
  const budget = 100 * 1024;
  assert.ok(total <= budget, `initial JS ${String(total)} B gzip > ${String(budget)} B`);
  console.log(`  JS gzip: ${String(total)} B of ${String(budget)} B (${String(js.length)} files)`);
});

void test('no script the phone loads holds a look-behind: Safari before 16.4 refuses the pattern, and the script with it', () => {
  // Found on 15/11/2026, before the sheet opened anywhere: three modules of the sheet wrote
  // `(?<!…)` to find the start of a word. A browser that does not know the syntax throws when
  // the pattern is built — at the load of the script — and « Demander » then does nothing,
  // without a word. The Worker may write them (src/lib/ask-validate.ts); a page may not.
  let read = 0;
  for (const root of ['dist', 'dist-ask', 'dist-gists', 'dist-scrutin']) {
    for (const file of walk(root).filter((f) => /\.(?:js|mjs|html)$/.test(f))) {
      read += 1;
      assert.doesNotMatch(readFileSync(file, 'utf8'), /\(\?<[=!]/, `${file} holds a look-behind`);
    }
  }
  if (read === 0) console.log('  (skipped: no build)');
});

void test('a site that answers no question ships nothing of the sheet: not a script, not a text, not a word', () => {
  if (skip || !existsSync('dist/sommaire/index.html')) return; // no build, or the holding one
  // dist/ is the build of the mode data/2026/ask.json says for the host it was made for
  // (scripts/build-mode.ts, `builtAskMode`). While that mode is "off" the home page does not
  // even import the sheet (astro.config.ts, `__CEL_CHAT__`).
  if (builtAskMode() === 'chat') return;
  assert.deepEqual(
    files.filter((f) => /\/_astro\/chat\.|\/data\/clair-/.test(f)),
    [],
    'the script or the texts of the sheet are in dist/',
  );
  for (const file of textFiles.filter((f) => /\.(?:html|js)$/.test(f))) {
    assert.doesNotMatch(
      read(file),
      /api\/chat|api\/gists|chat-sheet|chat-config|chat-offer|c-offer/,
      `${relative('dist', file)} carries a piece of the sheet`,
    );
  }
});

void test('nothing typed can leave by a form: no field has a name, and no form is submitted natively', () => {
  // A named control is what a browser sends when it submits a form by itself — in the address,
  // for a form without a method. Both fields of the site are in the page before the script
  // that answers Enter: unnamed, they are never sent (security review of 14/11/2026). Checked on
  // every page that ships, and on the test build of the sheet.
  for (const root of ['dist', 'dist-ask']) {
    const pages = walk(root).filter((f) => f.endsWith('.html'));
    if (pages.length === 0) continue;
    for (const page of pages) {
      const html = read(page);
      assert.doesNotMatch(
        html,
        /<(?:input|textarea|select|button)\b[^>]*\sname=/i,
        `${relative(root, page)}: a named control`,
      );
      // The only forms that submit themselves are the ones that close a dialog: they go nowhere.
      for (const form of html.match(/<form\b[^>]*>/gi) ?? []) {
        assert.doesNotMatch(form, /\saction=/i, `${relative(root, page)}: ${form}`);
        if (/\smethod=/i.test(form)) {
          assert.match(form, /\smethod="dialog"/i, `${relative(root, page)}: ${form}`);
        }
      }
    }
  }
  // …and the host refuses any native submission, whatever a page holds.
  const headers = read('public/_headers');
  assert.match(headers, /^ {2}Content-Security-Policy: .*form-action 'none'/m);
  assert.doesNotMatch(headers, /form-action 'self'/);
});

void test('the script of the sheet is small, and fetched at the first press — never announced before', () => {
  const sheet = walk('dist-ask/_astro').filter((f) => /\/chat\.[^/]+\.js$/.test(f));
  if (sheet.length === 0) {
    console.log('  (skipped: no dist-ask/ — run `npm run build:ask` first)');
    return;
  }
  assert.equal(sheet.length, 1, 'one script for the sheet');
  const [script = ''] = sheet;
  const gz = gzipSync(readFileSync(script), { level: 9 }).byteLength;
  // PLAN-CHAT §8 said 12 KB at most, and on 14/11/2026 the script weighed a third of it. On
  // 15/11 it weighs 15.7 KB: what the phone decides by itself grew — which questions are
  // refused, which are about the site, which name someone and get links (D16.64 to D16.67),
  // which words are explained, when a sensitive subject is asked alone (D16.70), what a date
  // or letters typed apart are (D16.71), what hate in words of the book is (D16.72). None of it
  // can move to a server: the question never leaves the phone (D16.53), so the phone is where
  // it is read. The ceiling was raised to
  // 14 KB that night « once », and that word did not hold: the rule a sixth review asked for
  // weighs 1.6 KB, and it is the one that closes what five lists of words did not. So: 16 KB,
  // said plainly (D16.70) — the script is fetched at the first press, never with the page; the
  // lists of words are data, fetched with the texts of the sheet, and only the ways of reading
  // a question are code. It stays a ceiling, and a quarter of a KB is left under it: the
  // titles, the faces and the small words of people left the code for the data on 15/11
  // (D16.72), which paid for the rules of that pass; the next rule comes in the same way.
  const budget = 16 * 1024;
  assert.ok(gz <= budget, `the sheet's script: ${String(gz)} B gzip > ${String(budget)} B`);
  console.log(`  sheet script: ${String(gz)} B gzip of ${String(budget)} B`);
  // No page names it: neither as a script, nor as a preload. The search's script imports it
  // when the button is pressed, and that import is the only mention of it anywhere.
  const name = script.slice(script.lastIndexOf('/') + 1);
  for (const page of walk('dist-ask').filter((f) => f.endsWith('.html'))) {
    assert.ok(!read(page).includes(name), `${relative('dist-ask', page)} names ${name}`);
  }
  const importers = walk('dist-ask/_astro').filter((f) => f !== script && read(f).includes(name));
  assert.equal(importers.length, 1, importers.join(', '));
  assert.match(importers[0] ?? '', /Search\.astro/);
});

void test('the sheet is told, for each of our fifteen answers, the measures it rests on', () => {
  // A recognised objection shows these measures, not what its words find (src/lib/chat-local.ts,
  // `measuresFor`). Read in the test build of the sheet, where the configuration is in the page.
  const home = 'dist-gists/index.html';
  if (!existsSync(home)) return;
  const island = /<script type="application\/json" id="chat-config">([^<]*)<\/script>/.exec(
    read(home),
  )?.[1];
  assert.ok(island !== undefined, 'the configuration of the sheet is not in the page');
  const config = JSON.parse(island) as { objections: { slug: string; supports: string[] }[] };
  const manifest = JSON.parse(read('data/2026/manifest.json')) as {
    sections: { items: { id: string; kind: string }[] }[];
  };
  const measures = new Set(
    manifest.sections.flatMap((section) =>
      section.items.filter((item) => item.kind !== 'paragraph').map((item) => item.id),
    ),
  );
  assert.equal(config.objections.length, 15);
  for (const { slug, supports } of config.objections) {
    assert.ok(supports.length >= 2, `${slug}: ${String(supports.length)} measure(s)`);
    for (const id of supports) assert.ok(measures.has(id), `${slug}: ${id} is not a measure`);
  }
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
  const page = 'dist/s/p1c1-s01/index.html';
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
