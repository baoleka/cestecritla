/**
 * The files of the explained words (src/lib/words-data.ts; PLAN-MOTS, lot 3): what each one
 * holds, and what it does not — computed from data/2026/terms.json, a public file.
 *
 *   - the finder says how a word is found, never what it says: every question fetches it;
 *   - the texts — meanings, examples — are by identifier, typeset as the pages are, and each
 *     file says who wrote them (D16.59);
 *   - one fingerprint for the three, and names that never depend on a word (D20.13).
 *
 * Run: npx tsx --test scripts/words-data.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseTerms } from '../src/lib/terms.js';
import { builtWords, wordsNames } from '../src/lib/words-data.js';

const entries = parseTerms(JSON.parse(readFileSync('data/2026/terms.json', 'utf8')));
const built = builtWords();
const typeset = (text: string): string => text.replace(/'/g, '’');

void test('the finder holds how each word is found, and nothing of what it says', () => {
  assert.deepEqual(
    built.finder.terms.map((wording) => wording.id),
    entries.map((entry) => entry.id),
  );
  built.finder.terms.forEach((wording, at) => {
    const entry = entries[at];
    assert.ok(entry !== undefined);
    assert.deepEqual(wording, {
      id: entry.id,
      term: entry.term,
      ...(entry.aliases === undefined ? {} : { aliases: entry.aliases }),
      ...(entry.anyCase === true ? { anyCase: true } : {}),
    });
  });
  const finder = JSON.stringify(built.finder);
  for (const entry of entries) {
    assert.ok(
      !finder.includes(entry.plain.slice(0, 30)),
      `${entry.id}: its meaning is in the finder`,
    );
  }
});

void test('every word has its meaning, and only a word with an example has one — typeset as the pages are', () => {
  assert.deepEqual(
    Object.keys(built.meanings.texts),
    entries.map((entry) => entry.id),
  );
  for (const entry of entries) {
    assert.equal(built.meanings.texts[entry.id], typeset(entry.plain), entry.id);
  }
  assert.deepEqual(
    Object.keys(built.examples.texts),
    entries.filter((entry) => entry.example !== undefined).map((entry) => entry.id),
  );
  for (const entry of entries) {
    if (entry.example !== undefined) {
      assert.equal(built.examples.texts[entry.id], typeset(entry.example), entry.id);
    }
  }
});

void test('each file of texts says who wrote it: an AI, and no person read them one by one (D16.59)', () => {
  for (const file of [built.meanings, built.examples]) {
    assert.equal(file.written_by, 'ai');
    assert.equal(file.read_by_a_person, false);
  }
});

void test('one fingerprint for the three files, and names that never depend on a word (D20.13)', () => {
  assert.match(built.fingerprint, /^[0-9a-f]{16}$/);
  assert.equal(builtWords().fingerprint, built.fingerprint);
  assert.deepEqual(wordsNames(built.fingerprint), {
    finder: `mots-${built.fingerprint}`,
    meanings: `mots-${built.fingerprint}-sens`,
    examples: `mots-${built.fingerprint}-exemples`,
  });
});
