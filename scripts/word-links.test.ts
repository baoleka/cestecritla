/**
 * The word of the game, lit up in the official page (lot J4) — what the build believes of
 * data/2026/word-links.json, and what it writes in a link.
 *
 * The browsers themselves are asked by scripts/verify-2026.ts --words, on the stored pages
 * (local) and on the synthetic site (CI). Here: the rules that need no browser.
 *
 * Run: npx tsx --test scripts/word-links.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildGame, gameSources, gameWords } from '../src/lib/game-data.js';
import {
  WORD_LINKS_PATH,
  WORD_LINK_ENGINES,
  encodeDirectiveText,
  highlightedWords,
  wordFragment,
  wordsFingerprint,
  type WordLinksFile,
} from '../src/lib/word-links.js';
import { encodeDirectiveText as encodeLocator } from './locator.js';

const LOCATOR = 'text=Ouvrir%20une%20biblioth%C3%A8que';

void test('a link lights up the word only where it was seen lit, after the start of its measure', () => {
  assert.equal(wordFragment(LOCATOR, 'bibliothèque', false), LOCATOR);
  assert.equal(wordFragment(LOCATOR, 'bibliothèque', true), `${LOCATOR}&text=biblioth%C3%A8que`);
  // The measure comes first: it is where the page scrolls.
  assert.ok(wordFragment(LOCATOR, 'îles', true).startsWith(`${LOCATOR}&text=`));
  // No locator, no directive at all: the word alone would scroll wherever it is written first.
  assert.equal(wordFragment('', 'bibliothèque', true), '');
});

void test('the text of a directive is written as the locators write theirs', () => {
  for (const sample of ['îles', 'porte-monnaie', 'eau, air & feu', 'l’école', 'cœur', 'a-b-c']) {
    assert.equal(encodeDirectiveText(sample), encodeLocator(sample), sample);
    // `-`, `,` and `&` are the syntax of a directive: none is left as written.
    assert.doesNotMatch(encodeDirectiveText(sample), /[-,&]/);
  }
});

void test('the fingerprint moves with a word, its spelling or its measure — and with nothing else', () => {
  const words = [
    { slot: 0, id: 'w000', word: 'mot', pin: { id: 'p1c1-s01-m01', sha256: 'aa' } },
    { slot: 1, id: 'w001', word: 'autre', pin: { id: 'p1c1-s02-m03', sha256: 'bb' } },
  ];
  const base = wordsFingerprint(words);
  assert.match(base, /^[0-9a-f]{64}$/);
  assert.equal(wordsFingerprint([...words].reverse()), base, 'the order is not a fact');
  assert.equal(wordsFingerprint(words.map((w) => ({ ...w, slot: w.slot + 5 }))), base);
  const moved = (change: (w: (typeof words)[number]) => (typeof words)[number]): string =>
    wordsFingerprint(words.map((w, i) => (i === 0 ? change(w) : w)));
  assert.notEqual(
    moved((w) => ({ ...w, word: 'mots' })),
    base,
  );
  assert.notEqual(
    moved((w) => ({ ...w, pin: { ...w.pin, id: 'p1c1-s01-m02' } })),
    base,
  );
  assert.notEqual(
    moved((w) => ({ ...w, pin: { ...w.pin, sha256: 'cc' } })),
    base,
  );
  assert.notEqual(wordsFingerprint(words.slice(0, 1)), base);
});

void test('the file is believed for its list, its book and three engines — or not at all', () => {
  const expected = { corpus: 'c0ffee', words: 'feed' };
  const file: WordLinksFile = {
    corpus_version: 'c0ffee',
    words_sha256: 'feed',
    verified_on: '2026-11-13',
    engines: WORD_LINK_ENGINES.map((name) => ({ name, version: '1' })),
    highlighted: ['w000', 'w002'],
    measure_only: ['w001'],
  };
  const believed = highlightedWords(file, expected);
  assert.equal(believed.stale, null);
  assert.deepEqual([...believed.ids], ['w000', 'w002']);
  const stale: [string, unknown, RegExp][] = [
    ['never followed', null, /never followed/],
    ['another book', { ...file, corpus_version: 'decaf' }, /another corpus/],
    ['another list', { ...file, words_sha256: 'beef' }, /another list/],
    ['two engines', { ...file, engines: file.engines.slice(0, 2) }, /not followed in webkit/],
    ['no engine', { ...file, engines: 'chromium' }, /not followed in chromium, firefox, webkit/],
  ];
  for (const [what, given, why] of stale) {
    const refused = highlightedWords(given, expected);
    assert.equal(refused.ids.size, 0, what);
    assert.match(refused.stale ?? '', why, what);
  }
  // Identifiers that are not strings are not identifiers.
  assert.deepEqual(
    [...highlightedWords({ ...file, highlighted: ['w000', 7, null] }, expected).ids],
    ['w000'],
  );
});

void test('the published file names words of the list, each once, and nothing of a page', () => {
  if (!existsSync(WORD_LINKS_PATH)) return;
  const raw = readFileSync(WORD_LINKS_PATH, 'utf8');
  const file = JSON.parse(raw) as WordLinksFile;
  assert.deepEqual(Object.keys(file).sort(), [
    'corpus_version',
    'engines',
    'highlighted',
    'measure_only',
    'verified_on',
    'words_sha256',
  ]);
  // Identifiers, versions, fingerprints and a date: no sentence fits in this file.
  assert.doesNotMatch(raw, /\p{L}{3,}\s+\p{L}{3,}\s+\p{L}{3,}/u);
  const both = [...file.highlighted, ...file.measure_only];
  assert.equal(new Set(both).size, both.length, 'a word is lit, or it is not');
  for (const id of both) assert.match(id, /^w\d{3}$/);
  // When it is the file of this list, it speaks of every word of it.
  const words = gameWords().words;
  if (file.words_sha256 === wordsFingerprint(words)) {
    assert.deepEqual([...both].sort(), words.map((w) => w.id).sort());
    assert.deepEqual(
      file.engines.map((engine) => engine.name),
      [...WORD_LINK_ENGINES],
    );
  }
});

void test('the game is built with the word lit where the file says, and the locator alone elsewhere', () => {
  const file = gameWords();
  const sources = gameSources();
  const corpus = sources.manifest.meta.corpus_version;
  const ids = file.words.map((w) => w.id);
  const lit = ids.filter((_, index) => index % 2 === 0);
  const links: WordLinksFile = {
    corpus_version: corpus,
    words_sha256: wordsFingerprint(file.words),
    verified_on: '2026-11-13',
    engines: WORD_LINK_ENGINES.map((name) => ({ name, version: '1' })),
    highlighted: lit,
    measure_only: ids.filter((id) => !lit.includes(id)),
  };
  const built = buildGame(file, sources, links).data.words;
  for (const word of built) {
    const second = `&text=${encodeDirectiveText(word.word)}`;
    assert.match(word.fragment, /^text=[^&]+/, word.id);
    assert.equal(word.fragment.endsWith(second), lit.includes(word.id), word.id);
    assert.equal(word.fragment.split('&').length, lit.includes(word.id) ? 2 : 1, word.id);
  }
  // A file made on another list, or missing: every link keeps what it had before.
  const plain = buildGame(file, sources, null).data.words;
  const other = buildGame(file, sources, { ...links, words_sha256: 'another' }).data.words;
  for (const words of [plain, other]) {
    for (const word of words) assert.doesNotMatch(word.fragment, /&/, word.id);
  }
  // A new answer of the browsers is a new file of the game: never stale bytes under one name.
  assert.notEqual(
    buildGame(file, sources, links).fingerprint,
    buildGame(file, sources, null).fingerprint,
  );
});
