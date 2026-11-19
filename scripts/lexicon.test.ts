/**
 * The lexicon of the book (PLAN-MOTS, lot 4): where each explained word is written.
 *
 *   - on an invented book: what scripts/lexicon-core.ts finds, and what it prints (numbers);
 *   - on the public map it wrote, data/2026/term-places.json: identifiers only — of sections the
 *     manifest knows and of words data/2026/terms.json holds —, sorted, each once, computed on
 *     the very wordings of the file and on the state of the book the manifest describes. A map
 *     computed before a wording changed is refused: run `npm run lexicon -- --places` again.
 *
 * Run: npx tsx --test scripts/lexicon.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { PrivateItem } from './aec26-types.js';
import { placesOf, placesSummary, unitTexts, wordsOf } from './lexicon-core.js';
import { cardWordings, type TermEntry } from '../src/lib/terms.js';
import { TERM_PLACES_PATH, explainedTerms, wordingsFingerprint } from '../src/lib/words-data.js';

/** Invented entries and an invented book: the rules are tested on words that are in no file. */
const T2A: TermEntry = { id: 't2a', term: 'T2A', plain: 'Un sigle.' };
const CAP: TermEntry = { id: 'cap', term: 'CAP', plain: 'Un diplôme.' };
const MORATOIRE: TermEntry = { id: 'moratoire', term: 'moratoire', plain: 'Une pause.' };
const ALL = [T2A, CAP, MORATOIRE];
const item = (id: string, text: string, subMeasures?: PrivateItem[]): PrivateItem => ({
  id,
  kind: 'measure',
  text,
  hash: '',
  raw: text,
  words: text.split(' ').length,
  inline: [],
  ...(subMeasures === undefined ? {} : { subMeasures }),
});

void test('a section lists the words its title, its items and their points use — each once, sorted', () => {
  const sections = [
    {
      id: 'p1c1-s01',
      title: 'Un moratoire',
      items: [item('p1c1-s01-m01', 'Sortir de la T2A.', [item('p1c1-s01-m01.s1', 'Un CAP.')])],
    },
    { id: 'p1c1-s02', title: 'Rien', items: [item('p1c1-s02-m01', 'Garder le cap.')] },
  ];
  assert.deepEqual(unitTexts('Un titre', sections[0]?.items ?? []), [
    'Un titre',
    'Sortir de la T2A.',
    'Un CAP.',
  ]);
  assert.deepEqual(wordsOf(['Un moratoire, puis la T2A, puis un moratoire.'], ALL), [
    'moratoire',
    't2a',
  ]);
  // A section that uses no word is left out: « cap » is a heading, not the diploma.
  assert.deepEqual(placesOf({ sections }, ALL), {
    'p1c1-s01': ['cap', 'moratoire', 't2a'],
  });
  assert.equal(
    placesSummary({ 'p1c1-s01': ['cap', 'moratoire', 't2a'], 'p1c1-s03': ['t2a'] }),
    '2 sections use explained words — 3 words placed, 3 in a section at most',
  );
});

interface PlacesFile {
  meta: { corpus_version: string; wordings_sha256: string; note_fr: string };
  sections: Record<string, string[]>;
}

void test('the public map holds identifiers only, was computed on these very words, on this state of the book', () => {
  const file = JSON.parse(readFileSync(TERM_PLACES_PATH, 'utf8')) as PlacesFile;
  const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as {
    meta: { corpus_version: string };
    sections: { id: string }[];
  };
  const entries = explainedTerms();
  const cards = cardWordings(
    (
      JSON.parse(readFileSync('data/2026/glossary.json', 'utf8')) as {
        entries: { id: string; term: string }[];
      }
    ).entries,
  );
  assert.equal(file.meta.corpus_version, manifest.meta.corpus_version);
  assert.equal(
    file.meta.wordings_sha256,
    wordingsFingerprint([...cards, ...entries]),
    'the wordings of data/2026/terms.json changed since the map was computed: npm run lexicon -- --places',
  );
  assert.match(file.meta.note_fr, /identifiants/);
  const sections = new Set(manifest.sections.map((section) => section.id));
  const words = new Set(entries.map((entry) => entry.id));
  for (const [id, ids] of Object.entries(file.sections)) {
    assert.ok(sections.has(id), `${id}: not a section of the manifest`);
    assert.ok(ids.length > 0, `${id}: an empty list`);
    assert.deepEqual(ids, [...new Set(ids)].sort(), `${id}: not sorted, or twice`);
    for (const word of ids) assert.ok(words.has(word), `${id}: ${word} is no explained word`);
  }
  assert.deepEqual(Object.keys(file).sort(), ['meta', 'sections']);
});

void test('how the words are found has one fingerprint — and what they say has no part in it', () => {
  const entries = explainedTerms();
  const fingerprint = wordingsFingerprint(entries);
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  const reworded = entries.map((entry) => ({ ...entry, plain: `${entry.plain} Encore.` }));
  assert.equal(wordingsFingerprint(reworded), fingerprint);
  const [first, ...rest] = entries;
  assert.ok(first !== undefined);
  assert.notEqual(
    wordingsFingerprint([{ ...first, aliases: ['un autre mot'] }, ...rest]),
    fingerprint,
  );
});
