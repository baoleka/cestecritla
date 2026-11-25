/**
 * The leak gates of the 2026 edition (D15.6, D15.7).
 *
 *   structure   what CI can prove without the corpus: the published files have no field a
 *               sentence could hide in, and the words they let out stay under the ceilings;
 *   content     what only the machine holding private/ can prove: no tracked file, no file of
 *               a commit not yet pushed, no commit message and no built page contains nine
 *               words in a row of the 2026 edition; no page's title or preview holds any run of
 *               the book; and none of our sentences that the game does not publish is in a
 *               public file. Skipped — and said so — where private/ is absent; failing, not
 *               skipped, where private/ is and the file it reads is not (review 16, N22).
 *
 * Run: npx tsx --test scripts/leak.test.ts
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Dataset } from './aec-types.js';
import { flatItems } from './aec26-core.js';
import {
  ceilingViolations,
  measureExposure,
  validateManifest,
  validateQuotes,
} from './aec26-publish.js';
import type { ExposurePolicy, Manifest, PrivateCorpus, QuotesFile } from './aec26-types.js';
import { VERDICTS_PATH, readVerdicts } from './gists-core.js';
import { PRIVATE_CORPUS_PATH } from './ingest-2026.js';
import {
  buildLeakIndex,
  leakTokens,
  readable,
  scanForLeaks,
  type LeakSource,
} from './leak-scan.js';

// The paths of their writers, never a copy: a path that moved turned these tests into skips,
// and the run into a pass (review 16, N22).
const PRIVATE_CORPUS = PRIVATE_CORPUS_PATH;
const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

// ---------------------------------------------------------------------------------------------
// The scanner itself, on text that is free to print (2025, CC BY-NC-SA)
// ---------------------------------------------------------------------------------------------

const dataset = json('data/aec-2025.json') as Dataset;
const sample: LeakSource[] = dataset.sections
  .flatMap((s) => s.items)
  .filter((i) => i.kind !== 'paragraph')
  .map((i) => ({ id: i.id, text: i.text }));

void test('scanner: nine words in a row are found through markup, encoding and typography', () => {
  const index = buildLeakIndex(sample, []);
  const victim = sample.find((s) => leakTokens(s.text).length >= 14);
  assert.ok(victim);
  const words = victim.text.split(' ');
  const nine = words.slice(2, 11).join(' ');
  const found = (content: string): string[] => scanForLeaks(content, index).map((h) => h.id);

  assert.ok(found(`Un fichier de notes. ${nine} Fin.`).includes(victim.id), 'plain text');
  assert.ok(
    found(
      `<p>${words.slice(2, 6).join(' ')} <em>${words.slice(6, 11).join(' ')}</em></p>`,
    ).includes(victim.id),
    'across tags',
  );
  assert.ok(
    found(`href="#x:~:text=${encodeURIComponent(nine)}"`).includes(victim.id),
    'percent-encoded',
  );
  assert.ok(
    found(nine.toUpperCase().replace(/ /g, String.fromCodePoint(0xa0))).includes(victim.id),
    'capitals, no-break spaces',
  );
  assert.ok(found(JSON.stringify({ note: nine })).includes(victim.id), 'inside JSON');

  // A word that is nothing but a mark is a word, as the policy counts it (review 16, N4).
  const marked = buildLeakIndex(
    [{ id: 'm', text: 'une garantie de deux % sur le patrimoine de chacun' }],
    [],
  );
  assert.equal(scanForLeaks('Note : une garantie de deux % sur le patrimoine', marked).length, 0);
  assert.equal(
    scanForLeaks('une garantie de deux\u00a0% sur le patrimoine de chacun', marked).length,
    1,
  );
  // A lone « < » before the words and a « > » after them hide nothing (review 16, N1).
  assert.ok(found(`p95 < 3 000 ms. ${nine} => fin`).includes(victim.id), 'between < and >');
  assert.ok(found(`for (i = 0; i < n; i += 1) { ${nine} } x => y`).includes(victim.id));

  // Eight words — the most an incipit or a locator may carry — are not a leak.
  assert.deepEqual(found(words.slice(0, 8).join(' ')), []);
  // The same words in another order are not the book.
  assert.deepEqual(found([...words.slice(2, 11)].reverse().join(' ')), []);
  // An allowed item (a quotation, where quotations live) is not reported.
  assert.deepEqual(scanForLeaks(nine, index, new Set([victim.id])), []);
});

void test('scanner: short propositions are looked for whole, known text is subtracted', () => {
  const short = sample.find((s) => {
    const n = leakTokens(s.text).length;
    return n >= 5 && n <= 8;
  });
  assert.ok(short, 'the 2025 corpus has propositions under nine words');
  const index = buildLeakIndex(sample, []);
  assert.ok(scanForLeaks(`Avant. ${short.text} Après.`, index).some((h) => h.id === short.id));
  const half = short.text.split(' ').slice(0, 3).join(' ');
  assert.equal(
    scanForLeaks(half, index).some((h) => h.id === short.id),
    false,
  );

  // Everything known is subtracted: with the corpus itself as "known", nothing is distinctive.
  const nothing = buildLeakIndex(
    sample,
    sample.map((s) => s.text),
  );
  assert.equal(nothing.shingles.size, 0);
  assert.equal(nothing.covered, 0);
  assert.equal(index.covered > sample.length * 0.9, true, 'almost every proposition is covered');
});

void test('scanner: reports identifiers and counts, never words', () => {
  const index = buildLeakIndex(sample, []);
  const victim = sample.find((s) => leakTokens(s.text).length >= 20);
  assert.ok(victim);
  const hits = scanForLeaks(victim.text, index);
  assert.ok(hits.length > 0);
  for (const hit of hits) assert.deepEqual(Object.keys(hit).sort(), ['id', 'windows']);
  assert.equal(readable('a%20b%E2%80%99c &amp; <b>d</b>'), 'a b’c &  d ');
  // A quotation stops at an ellipsis and at the end of its block: no window spans either.
  const index9 = buildLeakIndex(
    [{ id: 'x', text: 'un deux trois quatre cinq six sept huit neuf dix' }],
    [],
  );
  assert.equal(scanForLeaks('un deux trois quatre cinq six sept huit neuf', index9).length, 1);
  assert.equal(scanForLeaks('un deux trois quatre cinq six sept huit… neuf', index9).length, 0);
  assert.equal(
    scanForLeaks('<p>un deux trois quatre cinq six sept huit</p><p>neuf</p>', index9).length,
    0,
  );
});

// ---------------------------------------------------------------------------------------------
// Structure — runs everywhere
// ---------------------------------------------------------------------------------------------

const manifest = json('data/2026/manifest.json') as Manifest;
const policy = json('data/2026/exposure-policy.json') as ExposurePolicy;
const quotes = json('data/2026/quotes.json') as QuotesFile;

void test('structure: the published manifest passes its gate under the committed policy', () => {
  assert.deepEqual(validateManifest(manifest, policy), []);
  assert.deepEqual(validateQuotes(quotes, manifest), []);
  assert.equal(manifest.meta.license.statement_sha256, policy.license_statement_sha256);
});

void test('structure: the words let out are the ones declared, and under the ceilings', () => {
  const quoted = new Set(quotes.quotes.map((q) => q.id));
  const exposure = measureExposure(manifest, quoted);
  assert.deepEqual(exposure, manifest.meta.exposure, 'meta.exposure is not what the file contains');
  assert.deepEqual(ceilingViolations(exposure, quoted.size, policy), []);
});

/**
 * Files of data/2026 whose long strings are our own words: the editorial texts — our answers
 * and cards, published on the editor's word without a re-reading line by line (« accepted »,
 * D16.79) —, the synonyms, and the explained words (terms.json, D16.62): general knowledge an
 * AI wrote, with nothing of the book in it. The content gate below reads them like any other
 * file, where the private corpus is (review 16, N25).
 */
const EDITORIAL = new Set(['riposte.json', 'glossary.json', 'synonyms.json', 'terms.json']);
/** Keys allowed to hold more than eight words in the generated files. */
const LONG_OK = new Set(['title', 'id_scheme', 'hash_rule', 'note_fr', 'attribution']);

/**
 * The sentences of the game (D19.2): our sentences about measures of the book, one per word of
 * the game — published for them and for them only (our answers describe measures too, in
 * riposte.json). It is not waved through with the editorial files, whose invariant is « nothing
 * of the book in it »: it has a rule of its own, right below, and the content gate reads it
 * like any other file where the private corpus is — tracked since D19.22.
 */
const GAME_SENTENCES = 'game-gists.json';

void test('structure: no generated file of data/2026 has room for a sentence', () => {
  for (const name of readdirSync('data/2026').filter((f) => f.endsWith('.json'))) {
    if (EDITORIAL.has(name) || name === GAME_SENTENCES) continue;
    const walk = (value: unknown, path: string, key: string): void => {
      if (typeof value === 'string') {
        const words = value.split(/\s+/).filter((w) => w !== '').length;
        const isQuote = name === 'quotes.json' && key === 'text';
        if (words > 8 && !LONG_OK.has(key) && !isQuote) {
          assert.fail(`${name}: ${path} holds ${String(words)} words`);
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((v, i) => {
          walk(v, `${path}[${String(i)}]`, key);
        });
        return;
      }
      if (typeof value === 'object' && value !== null) {
        for (const [k, v] of Object.entries(value)) {
          // `text` as a key is fine when it names a field (the index maps field names to
          // numbers); it is a leak when it holds a string.
          const holdsText = typeof v === 'string' && name !== 'quotes.json';
          if (['raw', 'html', 'inline'].includes(k) || (k === 'text' && holdsText)) {
            assert.fail(`${name}: ${path}.${k} — a field that carries text`);
          }
          walk(v, `${path}.${k}`, k);
        }
      }
    };
    walk(json(join('data/2026', name)), name, '');
  }
});

void test(
  'structure: the file of the game’s sentences holds one line per word of the game, and nothing else that is long',
  {
    skip:
      !existsSync(join('data/2026', GAME_SENTENCES)) &&
      'no file of the game’s sentences here (tracked since D19.22: a checkout without it is broken)',
  },
  () => {
    const file = json(join('data/2026', GAME_SENTENCES)) as {
      meta: Record<string, unknown>;
      gists: Record<string, unknown>[];
    };
    const words = (
      json('data/2026/game-words.json') as { words: { pin: { id: string } }[] }
    ).words.map((word) => word.pin.id);
    // Two keys, and no room anywhere else: a third would be a place to put text.
    assert.deepEqual(Object.keys(file).sort(), ['gists', 'meta']);
    assert.ok(file.gists.length <= words.length, 'more sentences than the game has words');
    for (const gist of file.gists) {
      const keys = Object.keys(gist).sort();
      assert.ok(
        keys.join() === 'id,sha256,text' || keys.join() === 'id,lead_sha256,sha256,text',
        `a sentence with other fields: ${keys.join()}`,
      );
      assert.ok(
        words.includes(String(gist['id'])),
        `${String(gist['id'])}: no word is pinned to it`,
      );
      // One sentence: what a card can hold, on one line.
      const text = String(gist['text']);
      assert.ok(text.length <= 300 && !/[\r\n]/.test(text), `${String(gist['id'])}: not one line`);
    }
    // In `meta`, our own notice and title may be long; nothing else may — at any depth: a
    // nested object or list had room for a sentence the editor kept out (review 16, N16).
    const shallow = (value: unknown, path: string, key: string): void => {
      if (typeof value === 'string') {
        if (path.split('.').length === 2 && LONG_OK.has(key)) return;
        const count = value.split(/\s+/).filter((w) => w !== '').length;
        assert.ok(count <= 8, `${path} holds ${String(count)} words`);
      } else if (Array.isArray(value)) {
        value.forEach((item, at) => {
          shallow(item, `${path}[${String(at)}]`, key);
        });
      } else if (typeof value === 'object' && value !== null) {
        for (const [name, item] of Object.entries(value)) shallow(item, `${path}.${name}`, name);
      }
    };
    shallow(file.meta, 'meta', '');
  },
);

// ---------------------------------------------------------------------------------------------
// Content — only where the private corpus is
// ---------------------------------------------------------------------------------------------

const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|zip|gz|br|mp4|webm|wasm)$/i;

function walkDir(dir: string): string[] {
  if (!existsSync(dir)) return [];
  // Links are not followed: a dangling one threw, and a link to a directory read as a file
  // (review 16, N24).
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walkDir(path) : entry.isFile() ? [path] : [];
  });
}

/**
 * The text of a file, or null when it is not UTF-8: read as UTF-8 anyway, a UTF-16 or Latin-1
 * file gave tokens nothing matches, and passed as clean (review 16, N18).
 */
function textOf(bytes: Buffer): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

// Where private/ is, the files it should hold are read, or the test fails: skipped there, it
// passed (review 16, N22).
const skip =
  existsSync(PRIVATE_CORPUS) || existsSync('private')
    ? false
    : 'no private corpus on this machine: only the structural gate runs here';

/**
 * The last commit before the 2026 edition existed (10 September 2026; the book came out on
 * 5 November). Whatever the repository held then cannot have been copied from it.
 */
const FREEZE = 'f403d86';

const git = (...args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

void test('content: nothing added since the freeze holds the 2026 text', { skip }, () => {
  const corpus = json(PRIVATE_CORPUS) as PrivateCorpus;
  const items: LeakSource[] = [
    ...flatItems(corpus.introduction.items),
    ...corpus.parts.flatMap((p) => flatItems(p.items)),
    ...corpus.chapters.flatMap((c) => flatItems(c.items)),
    ...corpus.sections.flatMap((s) => flatItems(s.items)),
  ].map((i) => ({ id: i.id, text: i.text }));
  const frozenData = git('ls-tree', '-r', '--name-only', FREEZE, '--', 'data')
    .split('\n')
    .filter((f) => f.endsWith('.json'))
    .map((f) => git('show', `${FREEZE}:${f}`));
  const known = [
    ...frozenData,
    // The official titles of 2026: shown on purpose.
    ...corpus.parts.map((p) => p.title),
    ...corpus.chapters.map((c) => c.title),
    ...corpus.sections.map((s) => s.title),
  ];
  const index = buildLeakIndex(items, known);
  assert.ok(
    index.shingles.size > 10_000,
    `only ${String(index.shingles.size)} distinctive windows`,
  );

  // The gate must be able to fail: a sentence planted in memory is found.
  const planted = [...index.shingles.keys()][Math.floor(index.shingles.size / 2)] ?? '';
  assert.equal(
    scanForLeaks(`<li>${planted}</li>`, index).length,
    1,
    'the control was not detected',
  );

  const quoted = new Set(quotes.quotes.map((q) => q.id));
  // Everything that is new or changed since the freeze, committed or not.
  const changed = new Set([
    ...git('diff', '--name-only', '-z', FREEZE).split('\0'),
    ...git('ls-files', '-o', '--exclude-standard', '-z').split('\0'),
  ]);
  // The sentences of the game are written on this machine before they are tracked, and may be
  // kept out of `git status` meanwhile: they are read here whatever git says of them.
  changed.add(join('data/2026', GAME_SENTENCES));
  // Files only, links and directories aside (review 16, N24).
  const candidates = [...changed].filter(
    (f) => f !== '' && !BINARY.test(f) && existsSync(f) && lstatSync(f).isFile(),
  );
  // The pages scanned are a finished build of the app (review 16, N6): without one, or with
  // another build in dist/, the scan of pages passed on what was there.
  const marker = existsSync('build/last-build.json')
    ? (json('build/last-build.json') as { mode?: unknown; complete?: unknown })
    : null;
  assert.ok(
    existsSync('dist/index.html') && marker?.mode === 'app' && marker.complete === true,
    'dist/ holds no finished build of the app: run `npm run build` first',
  );
  const built = walkDir('dist').filter((f) => !BINARY.test(f));
  const findings: string[] = [];
  /**
   * Where, in a JSON file, the words of an item are: the field — by the `id` of the object that
   * holds it when there is one (« rip-13.answer ») — so that a finding in our own texts can be
   * placed without a word of the book being printed (review 16).
   */
  const fieldsOf = (text: string, id: string, allowed?: ReadonlySet<string>): string[] => {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return [];
    }
    const out: string[] = [];
    const walk = (value: unknown, path: string): void => {
      if (typeof value === 'string') {
        if (scanForLeaks(value, index, allowed).some((hit) => hit.id === id)) out.push(path);
      } else if (Array.isArray(value)) {
        value.forEach((item, at) => {
          walk(item, `${path}[${String(at)}]`);
        });
      } else if (typeof value === 'object' && value !== null) {
        const record = value as Record<string, unknown>;
        const named = typeof record['id'] === 'string' ? record['id'] : null;
        for (const [key, item] of Object.entries(record)) {
          walk(item, named === null ? `${path}.${key}` : `${named}.${key}`);
        }
      }
    };
    walk(data, '');
    return out;
  };
  const scan = (name: string, bytes: Buffer, allowed?: ReadonlySet<string>): void => {
    const text = textOf(bytes);
    if (text === null) {
      findings.push(`${name}: not UTF-8 — nothing in it can be read, so nothing in it is known`);
      return;
    }
    for (const hit of scanForLeaks(text, index, allowed)) {
      const where = name.endsWith('.json') ? fieldsOf(text, hit.id, allowed) : [];
      findings.push(
        `${name}: ${hit.id} (${String(hit.windows)} window(s))` +
          (where.length === 0 ? '' : ` — in ${where.slice(0, 3).join(', ')}`),
      );
    }
  };
  for (const file of [...candidates, ...built]) {
    if (statSync(file).size > 8 * 1024 * 1024) {
      findings.push(`${file}: over 8 MiB, not read — read it in parts, or keep it out`);
      continue;
    }
    const allowed =
      file === 'data/2026/quotes.json' || file.startsWith('dist/') ? quoted : undefined;
    scan(file, readFileSync(file), allowed);
  }
  // What a push publishes is commits, not the working tree: the files of every commit not yet
  // on origin/main as committed, and the index as staged — a text committed, then rewritten
  // before this test ran, went out unread (review 16, N2).
  let unpushed: string[] = [];
  try {
    unpushed = git('rev-list', 'origin/main..HEAD')
      .split('\n')
      .filter((commit) => commit !== '');
  } catch {
    // No origin/main here: the working tree is all there is to read.
  }
  const blobs: [string, string][] = [];
  for (const commit of unpushed) {
    const paths = git(
      'diff-tree',
      '--no-commit-id',
      '-r',
      '--name-only',
      '--diff-filter=AM',
      '-z',
      commit,
    );
    for (const path of paths.split('\0')) {
      if (path !== '' && !BINARY.test(path))
        blobs.push([`${path} at ${commit.slice(0, 7)}`, `${commit}:${path}`]);
    }
  }
  for (const path of git('diff', '--cached', '--name-only', '--diff-filter=AM', '-z').split('\0')) {
    if (path !== '' && !BINARY.test(path)) blobs.push([`${path} (staged)`, `:${path}`]);
  }
  // Only what a push ADDS: a blob that repeats what origin/main already holds publishes nothing
  // new — the earlier wording of an answer, rewritten since, is in history either way, and the
  // scan of the working tree above is what says it must change.
  const show = (object: string): Buffer | null => {
    try {
      return execFileSync('git', ['show', object], {
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      return null;
    }
  };
  for (const [name, object] of blobs) {
    const bytes = show(object);
    if (bytes === null) continue;
    const allowed = name.startsWith('data/2026/quotes.json') ? quoted : undefined;
    const path = object.slice(object.indexOf(':') + 1);
    const before = show(`origin/main:${path}`);
    const text = before === null ? null : textOf(before);
    const held = new Map(
      (text === null ? [] : scanForLeaks(text, index, allowed)).map((hit) => [hit.id, hit.windows]),
    );
    const now = textOf(bytes);
    if (now === null) {
      findings.push(`${name}: not UTF-8 — nothing in it can be read, so nothing in it is known`);
      continue;
    }
    for (const hit of scanForLeaks(now, index, allowed)) {
      if (hit.windows > (held.get(hit.id) ?? 0)) {
        findings.push(`${name}: ${hit.id} (${String(hit.windows)} window(s), new to origin/main)`);
      }
    }
  }
  // Each message on its own: one string, a « < » in one and a « > » in another hid what lay
  // between (review 16, N1).
  const messages = git('log', '--format=%B%x00', `${FREEZE}..HEAD`).split('\0');
  for (const message of messages) {
    for (const hit of scanForLeaks(message, index)) {
      findings.push(`a commit message: ${hit.id} (${String(hit.windows)} window(s))`);
    }
  }
  // What is not read is said: images, archives and documents added since the freeze (review 16,
  // N12) — a capture of a card, a recording of a session, read by no gate.
  const unread = [...changed].filter((f) => f !== '' && BINARY.test(f) && existsSync(f));
  // A page's title and its link previews hold no text of the book at all (D15.7) — not even
  // what the 2025 edition already wrote, which the scan above subtracts, nor a quoted measure,
  // which it lets pass on a page: three answers put 9 to 14 words of the book in their previews
  // (review of 24/11/2026, L11; reworded on the editor's word, D21.21).
  const headIndex = buildLeakIndex(items, [
    ...corpus.parts.map((p) => p.title),
    ...corpus.chapters.map((c) => c.title),
    ...corpus.sections.map((s) => s.title),
  ]);
  const HEAD =
    /<title>([^<]*)<\/title>|<meta (?:name|property)="(?:description|og:title|og:description|twitter:title|twitter:description)" content="([^"]*)"/g;
  // What a page's title and previews say, out of their tags: the scanner reads a page without
  // its tags, and a preview lives in one.
  const headOf = (html: string): string =>
    [...html.matchAll(HEAD)].map((match) => match[1] ?? match[2] ?? '').join('\n');
  // The control goes the way of a page: a window that only the subtraction of the 2025 edition
  // hides, planted in a preview, is found.
  const shared = [...headIndex.shingles.keys()].find((window) => !index.shingles.has(window));
  assert.ok(
    shared !== undefined &&
      scanForLeaks(headOf(`<meta name="description" content="${shared}">`), headIndex).length === 1,
    'the control of the previews was not detected',
  );
  for (const file of built.filter((f) => f.endsWith('.html'))) {
    for (const hit of scanForLeaks(headOf(readFileSync(file, 'utf8')), headIndex)) {
      findings.push(
        `${file}, its title or a preview: ${hit.id} (${String(hit.windows)} window(s))`,
      );
    }
  }
  assert.deepEqual(
    findings,
    [],
    `${String(candidates.length)} file(s) changed since ${FREEZE} and ${String(built.length)} built ` +
      `file(s) scanned against ${String(index.shingles.size)} windows covering ` +
      `${String(index.covered)} of ${String(index.items)} items`,
  );
  console.log(
    `leak gate: ${String(candidates.length)} changed file(s), ${String(blobs.length)} file(s) of ` +
      `${String(unpushed.length)} commit(s) not pushed or staged, ${String(messages.length)} ` +
      `message(s), ${String(built.length)} built file(s) of the app, ` +
      `${String(index.shingles.size)} windows, ${String(index.covered)}/${String(index.items)} items covered`,
  );
  if (unread.length > 0) {
    console.log(
      `  not read — ${String(unread.length)} image(s), archive(s) or document(s) added since the ` +
        `freeze: look at them before a push (${unread.slice(0, 5).join(', ')}` +
        `${unread.length > 5 ? ', …' : ''})`,
    );
  }
});

/**
 * Our own sentences — one per measure, written ahead — live in a private base and are served
 * three at most by request: « never published in a file », but for those of the game, and
 * those only (D16.49, D19.2). The editor decides, card by card, which sentences the file of
 * the game holds (D19.20, D19.21): a sentence he left out must not reach the public
 * repository by another door — a note, a test report, a copy of what a reviewer was shown.
 *
 * Read where the sentences are (private/gists/verdicts.jsonl): every sentence that is NOT in
 * the file of the game as tracked — all of them, while that file is not tracked — is searched
 * for in every tracked text file and in what a deployable build publishes, by windows of
 * twelve words (or the whole sentence when it is shorter). A file HOLDS a sentence when more
 * than half of its windows are there: a list of nouns the book already wrote in 2025 — « de
 * l'eau, l'air, la forêt… », fourteen words that the public archive of that edition holds
 * too — is one or two windows of a sentence, not the sentence.
 */
const VERDICTS = VERDICTS_PATH;
void test(
  'content: no tracked file, and no built file, holds a sentence of ours that the game does not publish',
  { skip: !existsSync(VERDICTS) && !existsSync('private') && 'no sentences on this machine' },
  () => {
    // Every wording a reader kept, not the last alone: an earlier one is what a reviewer was
    // shown (review 16, N7). Read as the tool reads the file: a last line cut short by a write
    // under way is not a line yet (N23).
    const kept = new Map<string, Set<string>>();
    for (const row of readVerdicts(VERDICTS)) {
      if (row.verdict !== 'read' || row.text === null) continue;
      const texts = kept.get(row.id) ?? new Set<string>();
      texts.add(row.text);
      kept.set(row.id, texts);
    }
    assert.ok(kept.size > 1000, `only ${String(kept.size)} sentences were found`);
    const tracked = git('ls-files', '-z')
      .split('\0')
      .filter((f) => f !== '' && !BINARY.test(f) && existsSync(f));
    // The sentences the game publishes: the (measure, sentence) pairs of its file as COMMITTED —
    // a new wording of a measure it publishes is not published (review 16, N14).
    const gamePath = join('data/2026', GAME_SENTENCES);
    let committed: { gists: { id: string; text: string }[] } = { gists: [] };
    try {
      committed = JSON.parse(git('show', `HEAD:${gamePath}`)) as typeof committed;
    } catch {
      // Not committed: none is published.
    }
    const published = new Set(committed.gists.map((gist) => `${gist.id}\n${gist.text}`));
    // What the game publishes is public: its windows are no one's secret — an earlier wording
    // of a published sentence, nearly the same, was found « in » the file that publishes it.
    const publicWindows = new Set<string>();
    // Read as the scanner reads a page — entities, escapes and tags undone, accents folded — so
    // that a copy escaped in HTML or JSON, or a word set in <em>, is the sentence (review 16, N8).
    const bare = (text: string): string[] =>
      readable(text)
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word !== '' && word !== 'xxbreakxx');
    const SIZE = 12;
    /** A window → every sentence that holds it: shared, it counts for each (review 16, N15). */
    const windows = new Map<string, Set<string>>();
    const sizes = new Set<number>();
    /** How many windows each sentence was cut in, by its key (measure and wording). */
    const cut = new Map<string, number>();
    const label = new Map<string, string>();
    for (const gist of committed.gists) {
      const words = bare(gist.text);
      for (let size = 1; size <= SIZE; size += 1) {
        for (let at = 0; at + size <= words.length; at += 1) {
          publicWindows.add(words.slice(at, at + size).join(' '));
        }
      }
    }
    let unpublished = 0;
    for (const [id, texts] of kept) {
      for (const text of texts) {
        const key = `${id}\n${text}`;
        if (published.has(key)) continue;
        const words = bare(text);
        const size = Math.min(SIZE, words.length);
        if (size === 0) continue;
        // Only the windows that are this wording's own: those a published sentence holds too
        // are public already (and a wording with none of its own is public in substance).
        const own: string[] = [];
        for (let at = 0; at + size <= words.length; at += 1) {
          const window = words.slice(at, at + size).join(' ');
          if (!publicWindows.has(window)) own.push(window);
        }
        if (own.length === 0) continue;
        unpublished += 1;
        sizes.add(size);
        cut.set(key, own.length);
        label.set(key, id);
        for (const window of own) {
          const holders = windows.get(window) ?? new Set<string>();
          holders.add(key);
          windows.set(window, holders);
        }
      }
    }
    const found = (text: string): string[] => {
      const hits = new Map<string, Set<string>>();
      const words = bare(text);
      for (const size of sizes) {
        for (let at = 0; at + size <= words.length; at += 1) {
          const window = words.slice(at, at + size).join(' ');
          for (const key of windows.get(window) ?? []) {
            const seen = hits.get(key) ?? new Set<string>();
            seen.add(window);
            hits.set(key, seen);
          }
        }
      }
      // More than half of a sentence's windows: the sentence is there.
      return [
        ...new Set(
          [...hits]
            .filter(([key, seen]) => seen.size * 2 > (cut.get(key) ?? 0))
            .map(([key]) => label.get(key) ?? ''),
        ),
      ];
    };
    // The gate can fail: every sentence that is not published, quoted and re-wrapped, escaped as
    // HTML would, is found — only the ids that fail are printed (review 16, N15, N8).
    const missed: string[] = [];
    for (const [key, id] of label) {
      const sentence = key.slice(key.indexOf('\n') + 1);
      const wrapped = `> « ${sentence.replace(/ /g, '\n  ').replace(/'/g, '&#39;')} »`;
      if (!found(wrapped).includes(id)) missed.push(id);
    }
    assert.deepEqual(
      missed.slice(0, 10),
      [],
      `${String(missed.length)} sentence(s) cannot be found`,
    );
    const findings: string[] = [];
    for (const file of [...tracked, ...walkDir('dist').filter((f) => !BINARY.test(f))]) {
      if (!lstatSync(file).isFile()) continue;
      if (statSync(file).size > 8 * 1024 * 1024) {
        findings.push(`${file}: over 8 MiB, not read`);
        continue;
      }
      const hits = found(readFileSync(file, 'utf8'));
      if (hits.length > 0) findings.push(`${file}: ${hits.join(', ')}`);
    }
    // The messages of the commits too: a fix that quotes the sentence it changes (review 16, N3).
    for (const message of git('log', '--format=%B%x00', `${FREEZE}..HEAD`).split('\0')) {
      const hits = found(message);
      if (hits.length > 0) findings.push(`a commit message: ${hits.join(', ')}`);
    }
    assert.deepEqual(findings, [], 'a sentence the game does not publish is in a public file');
    console.log(
      `sentences gate: ${String(unpublished)} wording(s) of ${String(kept.size)} sentences are not ` +
        `published; none is in ${String(tracked.length)} tracked file(s), in dist/, nor in a commit message`,
    );
  },
);
