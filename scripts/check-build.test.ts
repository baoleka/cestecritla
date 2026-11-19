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
  // Checked on what ships (dist/, in the mode data/2026/ask.json says) and on the test build of
  // the ask screen when it is there (dist-ask/, built as if the mode were open).
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
      // No script may hand a string to the HTML parser or to a script loader, and no policy
      // can be created to let one through (D16.80).
      assert.match(policy, /require-trusted-types-for 'script'/, `${page}: Trusted Types`);
      assert.match(policy, /trusted-types 'none'/, `${page}: a policy could be created`);
    }
  }
});

void test('no script we ship does what the policy of the pages forbids: a string handed to the parser or to a loader (D16.80)', () => {
  // `require-trusted-types-for 'script'` makes these calls throw in the browsers that know
  // it — and a page that throws there is a page that breaks only for them. So what ships is
  // read: the sinks the directive guards appear in none of our scripts, inline ones included.
  const SINKS =
    /\.(?:innerHTML|outerHTML|srcdoc)\s*=(?!=)|\binsertAdjacentHTML\(|\bdocument\.write(?:ln)?\(|\bcreateContextualFragment\(|\bparseFromString\(|\bnew Function\(|(?<![\w.])eval\(|\bimportScripts\(|\bserviceWorker\.register\(|\bnew (?:Shared)?Worker\(|\bcreateElement\(\s*["'`]script["'`]\s*\)|\bset(?:Timeout|Interval)\(\s*["'`]/;
  for (const root of ['dist', 'dist-ask']) {
    for (const file of walk(root)) {
      if (file.endsWith('.js') || file.endsWith('.mjs')) {
        assert.doesNotMatch(read(file), SINKS, `${file}: a sink Trusted Types refuses`);
      } else if (file.endsWith('.html')) {
        const inline = [
          ...read(file).matchAll(
            /<script(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g,
          ),
        ];
        for (const script of inline) {
          assert.doesNotMatch(script[1] ?? '', SINKS, `${file}: an inline script with a sink`);
        }
      }
    }
  }
});

void test('no page says a person re-read our own texts unless their files say one did (D16.79)', () => {
  // The fifteen answers and the five cards each carry their state (data/2026/riposte.json,
  // glossary.json): « accepted » is published on the editor's word, without a line-by-line
  // re-reading. While one of them is not « reviewed », no page names a reader — the site said
  // « relu par Baoleka » until 15/11/2026, on dates written by default (14-risques.md, R44).
  const states = ['data/2026/riposte.json', 'data/2026/glossary.json'].flatMap((path) =>
    (JSON.parse(read(path)) as { entries: { review: { status: string } }[] }).entries.map(
      (entry) => entry.review.status,
    ),
  );
  assert.ok(states.length > 0);
  if (states.every((status) => status === 'reviewed')) return;
  const CLAIM = /relu(?:e|es|s)? par (?:Baoleka|l['’]éditeur|une personne|un humain)/i;
  for (const root of ['dist', 'dist-ask']) {
    for (const file of walk(root).filter((f) => f.endsWith('.html'))) {
      assert.doesNotMatch(read(file), CLAIM, `${file}: claims a re-reading by a person`);
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

void test('what a visit downloads stays small enough for a phone on a slow network — gesture by gesture (D20.12)', () => {
  if (skip) return;
  const data = files.filter((f) => /dist\/data\/.*\.json$/.test(f));
  if (data.length === 0) return; // holding build: no search
  const gz = (file: string): number => gzipSync(readFileSync(file), { level: 9 }).byteLength;
  const nameOf = (file: string): string => file.slice(file.lastIndexOf('/') + 1);
  const sum = (list: readonly string[]): number => list.reduce((n, f) => n + gz(f), 0);
  // What a visit fetches before it opens any explanation: the index and the titles (the first
  // search), the game, the texts of « En clair » and how the explained words are found (the
  // first question). Measured 12/11/2026: index 64 KB + titles and locators 33 KB, gzip. Each
  // is fetched once, then cached for a year under a versioned name. The ceiling has not moved
  // since; on 19/11/2026 the texts of the explained words left it for files of their own,
  // fetched the first time one is opened, each with a ceiling of its own (PLAN-MOTS, D20.12).
  const firstUse = data.filter((f) =>
    /^(?:(?:index|meta|jeu|clair)-[0-9a-f]{16}|mots-[0-9a-f]{16})\.json$/.test(nameOf(f)),
  );
  const meanings = data.filter((f) => /^mots-[0-9a-f]{16}-sens\.json$/.test(nameOf(f)));
  const examples = data.filter((f) => /^mots-[0-9a-f]{16}-exemples\.json$/.test(nameOf(f)));
  const pages = data.filter((f) => /^mots-[0-9a-f]{16}-[scr]-[a-z0-9-]+\.json$/.test(nameOf(f)));
  const known = new Set([...firstUse, ...meanings, ...examples, ...pages]);
  assert.deepEqual(
    data.filter((f) => !known.has(f)),
    [],
    'a file of data that no budget knows',
  );
  const budget = 130 * 1024;
  const total = sum(firstUse);
  assert.ok(
    total <= budget,
    `data before any explanation ${String(total)} B gzip > ${String(budget)} B`,
  );
  console.log(`  data before any explanation: ${String(total)} B gzip of ${String(budget)} B`);
  for (const [list, ceiling, what] of [
    [meanings, 52 * 1024, 'what the words mean'],
    [examples, 44 * 1024, 'the examples of the words'],
    [pages, 6 * 1024, 'the words of a page'],
  ] as const) {
    for (const file of list) {
      const weight = gz(file);
      assert.ok(
        weight <= ceiling,
        `${what}, ${nameOf(file)}: ${String(weight)} B gzip > ${String(ceiling)} B`,
      );
    }
    if (list.length > 0 && list !== pages) {
      console.log(`  ${what}: ${String(sum(list))} B gzip of ${String(ceiling)} B`);
    }
  }
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
  // …nor anything of the explained words: they follow the mode of the site (D20.11).
  assert.deepEqual(
    files.filter((f) => /\/_astro\/(?:chat|words)\.|\/data\/(?:clair|mots)-/.test(f)),
    [],
    'the script or the texts of the sheet are in dist/',
  );
  for (const file of textFiles.filter((f) => /\.(?:html|js)$/.test(f))) {
    assert.doesNotMatch(
      read(file),
      /api\/chat|api\/gists|chat-sheet|chat-config|chat-offer|c-offer|data-words/,
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
  // a question are code. It stays a ceiling: the titles, the faces and the small words of
  // people left the code for the data on 15/11 (D16.72, D16.73), which paid for the rules of
  // those passes; the next rule comes in the same way. On 19/11/2026 the reading of the
  // explained words left it for a module of its own (PLAN-MOTS, lot 1, test below): 15.2 KB.
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

void test('the explained words are a module of their own, asked for by the sheet’s script and named by no page', () => {
  const found = walk('dist-ask/_astro').filter((f) => /\/words\.[^/]+\.js$/.test(f));
  if (found.length === 0) {
    console.log('  (skipped: no dist-ask/ — run `npm run build:ask` first)');
    return;
  }
  assert.equal(found.length, 1, 'one module for the explained words');
  const [script = ''] = found;
  const gz = gzipSync(readFileSync(script), { level: 9 }).byteLength;
  // PLAN-MOTS, lot 1 (19/11/2026): how the terms are found and drawn left the sheet's script,
  // which asks for this module as soon as it runs. Lot 3 gave it the fetching of the files of
  // the words — how they are found, then their texts on demand — and its ceiling (D20.12): its
  // measure then, 2 234 B, plus a fifth.
  const budget = 2_681;
  assert.ok(gz <= budget, `the explained words: ${String(gz)} B gzip > ${String(budget)} B`);
  console.log(`  explained words: ${String(gz)} B gzip of ${String(budget)} B`);
  const name = script.slice(script.lastIndexOf('/') + 1);
  for (const page of walk('dist-ask').filter((f) => f.endsWith('.html'))) {
    assert.ok(!read(page).includes(name), `${relative('dist-ask', page)} names ${name}`);
  }
  // The sheet's script asks for it — and, since lot 6, the line of the search
  // (src/scripts/words-search.ts), where the build says when what is typed is an explained word.
  // No other script, and no page.
  const importers = walk('dist-ask/_astro').filter((f) => f !== script && read(f).includes(name));
  assert.ok(
    importers.length >= 1 && importers.every((f) => /\/(?:chat|words-search)\.[^/]*\.js$/.test(f)),
    importers.join(', '),
  );
  assert.ok(
    importers.some((f) => /\/chat\.[^/]+\.js$/.test(f)),
    'the sheet does not ask for it',
  );
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
