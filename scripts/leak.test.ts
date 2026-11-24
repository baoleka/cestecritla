/**
 * The leak gates of the 2026 edition (D15.6, D15.7).
 *
 *   structure   what CI can prove without the corpus: the published files have no field a
 *               sentence could hide in, and the words they let out stay under the ceilings;
 *   content     what only the machine holding private/ can prove: no tracked file, no commit
 *               message and no built page contains nine words in a row of the 2026 edition.
 *               Skipped — and said so — where the corpus is absent.
 *
 * Run: npx tsx --test scripts/leak.test.ts
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
import {
  buildLeakIndex,
  leakTokens,
  readable,
  scanForLeaks,
  type LeakSource,
} from './leak-scan.js';

const PRIVATE_CORPUS = 'private/corpus/aec-2026.json';
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
 * Files of data/2026 whose long strings are our own words: the editorial texts a person
 * re-read, the synonyms — and the explained words (terms.json, D16.62): general knowledge an
 * AI wrote, with nothing of the book in it. The content gate below reads them like any other
 * file, where the private corpus is.
 */
const EDITORIAL = new Set(['riposte.json', 'glossary.json', 'synonyms.json', 'terms.json']);
/** Keys allowed to hold more than eight words in the generated files. */
const LONG_OK = new Set(['title', 'id_scheme', 'hash_rule', 'note_fr', 'attribution']);

/**
 * The sentences of the game (D19.2): the one file of data/2026 that holds sentences ABOUT
 * measures of the book — our words, published for the words of the game and for them only. It
 * is not waved through with the editorial files, whose invariant is « nothing of the book in
 * it »: it has a rule of its own, right below, and the content gate reads it like any other
 * file where the private corpus is — tracked or not.
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
      'the sentences of the game are not on this machine yet (the editor’s go)',
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
    // In `meta`, our own notice and title may be long; nothing else may.
    for (const [key, value] of Object.entries(file.meta)) {
      if (typeof value !== 'string' || LONG_OK.has(key)) continue;
      const count = value.split(/\s+/).filter((w) => w !== '').length;
      assert.ok(count <= 8, `meta.${key} holds ${String(count)} words`);
    }
  },
);

// ---------------------------------------------------------------------------------------------
// Content — only where the private corpus is
// ---------------------------------------------------------------------------------------------

const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|zip|gz|br|mp4|webm|wasm)$/i;

function walkDir(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walkDir(path) : [path];
  });
}

const skip = existsSync(PRIVATE_CORPUS)
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
  const candidates = [...changed].filter((f) => f !== '' && !BINARY.test(f) && existsSync(f));
  const built = walkDir('dist').filter((f) => !BINARY.test(f));
  const findings: string[] = [];
  for (const file of [...candidates, ...built]) {
    if (statSync(file).size > 8 * 1024 * 1024) continue;
    const allowed =
      file === 'data/2026/quotes.json' || file.startsWith('dist/') ? quoted : undefined;
    for (const hit of scanForLeaks(readFileSync(file, 'utf8'), index, allowed)) {
      findings.push(`${file}: ${hit.id} (${String(hit.windows)} window(s))`);
    }
  }
  for (const hit of scanForLeaks(git('log', '--format=%B', `${FREEZE}..HEAD`), index)) {
    findings.push(`a commit message: ${hit.id} (${String(hit.windows)} window(s))`);
  }
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
    `leak gate: ${String(candidates.length)} changed file(s), ${String(built.length)} built file(s), ` +
      `${String(index.shingles.size)} windows, ${String(index.covered)}/${String(index.items)} items covered`,
  );
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
const VERDICTS = 'private/gists/verdicts.jsonl';
void test(
  'content: no tracked file, and no built file, holds a sentence of ours that the game does not publish',
  { skip: !existsSync(VERDICTS) && 'no sentences on this machine' },
  () => {
    const kept = new Map<string, string>();
    for (const line of readFileSync(VERDICTS, 'utf8').split('\n')) {
      if (line.trim() === '') continue;
      const row = JSON.parse(line) as { id?: unknown; text?: unknown };
      if (typeof row.id === 'string' && typeof row.text === 'string') kept.set(row.id, row.text);
    }
    assert.ok(kept.size > 1000, `only ${String(kept.size)} sentences were found`);
    const tracked = git('ls-files', '-z')
      .split('\0')
      .filter((f) => f !== '' && !BINARY.test(f) && existsSync(f));
    // The sentences the game publishes: those of its file — once that file is in the repository.
    const gamePath = join('data/2026', GAME_SENTENCES);
    const published = new Set<string>(
      tracked.includes(gamePath)
        ? (json(gamePath) as { gists: { id: string }[] }).gists.map((gist) => gist.id)
        : [],
    );
    const bare = (text: string): string[] =>
      text
        .normalize('NFC')
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word !== '');
    const SIZE = 12;
    const windows = new Map<string, string>();
    const sizes = new Set<number>();
    /** How many windows each sentence was cut in. */
    const cut = new Map<string, number>();
    for (const [id, text] of kept) {
      if (published.has(id)) continue;
      const words = bare(text);
      const size = Math.min(SIZE, words.length);
      if (size === 0) continue;
      sizes.add(size);
      cut.set(id, words.length - size + 1);
      for (let at = 0; at + size <= words.length; at += 1) {
        windows.set(words.slice(at, at + size).join(' '), id);
      }
    }
    const found = (text: string): string[] => {
      const hits = new Map<string, Set<string>>();
      const words = bare(text);
      for (const size of sizes) {
        for (let at = 0; at + size <= words.length; at += 1) {
          const window = words.slice(at, at + size).join(' ');
          const id = windows.get(window);
          if (id === undefined) continue;
          const seen = hits.get(id) ?? new Set<string>();
          seen.add(window);
          hits.set(id, seen);
        }
      }
      // More than half of a sentence's windows: the sentence is there.
      return [...hits].filter(([id, seen]) => seen.size * 2 > (cut.get(id) ?? 0)).map(([id]) => id);
    };
    // The gate can fail: a sentence that is not published, quoted and re-wrapped, is found.
    const [sampleId, sample] = [...kept].find(([id]) => !published.has(id)) ?? ['', ''];
    assert.deepEqual(found(`> « ${sample.replace(/ /g, '\n  ')} »`), [sampleId]);
    const findings: string[] = [];
    for (const file of [...tracked, ...walkDir('dist').filter((f) => !BINARY.test(f))]) {
      if (statSync(file).size > 8 * 1024 * 1024) continue;
      const hits = found(readFileSync(file, 'utf8'));
      if (hits.length > 0) findings.push(`${file}: ${hits.join(', ')}`);
    }
    assert.deepEqual(findings, [], 'a sentence the game does not publish is in a public file');
    console.log(
      `sentences gate: ${String(kept.size - published.size)} of ${String(kept.size)} sentences are not published; ` +
        `none is in ${String(tracked.length)} tracked file(s) nor in dist/`,
    );
  },
);
