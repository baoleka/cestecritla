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

/** Files of data/2026 whose long strings are our own words, reviewed as editorial content. */
const EDITORIAL = new Set(['riposte.json', 'glossary.json', 'synonyms.json']);
/** Keys allowed to hold more than eight words in the generated files. */
const LONG_OK = new Set(['title', 'id_scheme', 'hash_rule', 'note_fr', 'attribution']);

void test('structure: no generated file of data/2026 has room for a sentence', () => {
  for (const name of readdirSync('data/2026').filter((f) => f.endsWith('.json'))) {
    if (EDITORIAL.has(name)) continue;
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
const FREEZE = '16023da';

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
