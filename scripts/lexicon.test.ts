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
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { PrivateItem } from './aec26-types.js';
import {
  VOCABULARY_PATH,
  coverageProblems,
  partitionProblems,
  placesOf,
  placesSummary,
  uncoveredIn,
  unitTexts,
  vocabularyFingerprint,
  wordsOf,
  type Vocabulary,
} from './lexicon-core.js';
import { terms } from '../src/lib/search-core.js';
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

void test('the judged vocabulary: each stem in one class, each hard stem held by its entries, each hard use inside a wording', () => {
  const vocabulary: Vocabulary = {
    meta: {
      index: { terms: 6, sha256: '' },
      judged_on: '2026-11-20',
      judged_by: 'session',
      second_judge: 'another model',
      note_fr: '—',
    },
    plain: ['garder'],
    explain: { moratoire: ['moratoire'], t2a: ['t2a'] },
    watch: { cap: ['cap'] },
    names: { zucman: 'person' },
  };
  const stems = ['moratoire', 't2a', 'cap', 'garder', 'zucman', '2050'];
  assert.deepEqual(partitionProblems(vocabulary, stems), []);
  assert.deepEqual(coverageProblems(vocabulary, ALL), []);
  // A stem not judged, judged twice, a number judged, a stem of nothing the site shows.
  assert.match(String(partitionProblems(vocabulary, [...stems, 'grue'])), /grue: not judged/);
  assert.match(
    String(partitionProblems({ ...vocabulary, plain: ['garder', 'cap'] }, stems)),
    /cap: judged plain and watch/,
  );
  assert.match(
    String(partitionProblems({ ...vocabulary, plain: ['garder', '2050'] }, stems)),
    /2050: a number/,
  );
  assert.match(
    String(partitionProblems({ ...vocabulary, plain: ['garder', 'zzz'] }, stems)),
    /zzz: a stem of nothing the site shows/,
  );
  // A hard stem held by no entry, by an entry that does not exist, or by one whose wordings do
  // not yield it; a name that is neither an entry nor a kind of name.
  const explain = (held: Record<string, string[]>): string =>
    String(coverageProblems({ ...vocabulary, explain: held }, ALL));
  assert.match(explain({ moratoire: [] }), /no entry holds it/);
  assert.match(explain({ moratoire: ['x'] }), /x is no entry/);
  assert.match(explain({ moratoire: ['t2a'] }), /no wording of t2a yields it/);
  assert.match(
    String(coverageProblems({ ...vocabulary, names: { zucman: 'someone' } }, ALL)),
    /neither an entry nor a kind/,
  );
  // Counted, not placed: a hard word outside every wording given is found, its plural too.
  const hard = new Set(['moratoire', 't2a']);
  assert.deepEqual(uncoveredIn('Un moratoire, puis la T2A.', hard, ALL), []);
  assert.deepEqual(uncoveredIn('Un moratoire, puis la T2A.', hard, [MORATOIRE]), ['t2a']);
  assert.deepEqual(uncoveredIn('Les moratoires.', hard, ALL), []);
  assert.equal(vocabularyFingerprint(['b', 'a']), vocabularyFingerprint(['a', 'b']));
});

/**
 * What the site shows in our own words, and the official titles: the explanations and their
 * examples, our cards, our answers, the sentences of the game, the titles of the book. Read
 * against the judged vocabulary, each must explain the hard words it uses — where a reader meets
 * them, a line explains them.
 */
function ourTexts(): { where: string; text: string }[] {
  const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
  const out: { where: string; text: string }[] = [];
  for (const entry of explainedTerms()) {
    out.push({ where: `terms:${entry.id}`, text: entry.plain });
    if (entry.example !== undefined) {
      out.push({ where: `terms:${entry.id} (example)`, text: entry.example });
    }
  }
  const glossary = read('data/2026/glossary.json') as {
    entries: {
      id: string;
      term: string;
      plain: string;
      why?: string;
      objection?: { text: string; answer: string };
    }[];
  };
  for (const card of glossary.entries) {
    const texts = [card.plain, card.why, card.objection?.text, card.objection?.answer];
    for (const text of texts) if (text !== undefined) out.push({ where: `mot:${card.id}`, text });
  }
  const riposte = read('data/2026/riposte.json') as {
    entries: { slug: string; objection: string; answer: string; avoid: string }[];
  };
  for (const answer of riposte.entries) {
    for (const text of [answer.objection, answer.answer, answer.avoid]) {
      out.push({ where: `r:${answer.slug}`, text });
    }
  }
  const gists = read('data/2026/game-gists.json') as { gists: { id: string; text: string }[] };
  for (const gist of gists.gists) out.push({ where: `jeu:${gist.id}`, text: gist.text });
  const manifest = read('data/2026/manifest.json') as {
    parts: { id: string; title: string }[];
    chapters: { id: string; title: string }[];
    sections: { id: string; title: string }[];
  };
  for (const unit of [...manifest.parts, ...manifest.chapters, ...manifest.sections]) {
    out.push({ where: `titre:${unit.id}`, text: unit.title });
  }
  return out;
}

void test('data/2026/vocabulary.json: every stem the site shows judged once — and, for the new charter, every hard word of our texts explained', () => {
  const charter = (
    JSON.parse(readFileSync('data/2026/terms.json', 'utf8')) as { meta: { charter?: number } }
  ).meta.charter;
  if (!existsSync(VOCABULARY_PATH)) {
    // Judged at lot 9 of PLAN-MOTS; the new charter does not go without it.
    assert.notEqual(charter, 2, `the new charter needs the judged vocabulary: ${VOCABULARY_PATH}`);
    return;
  }
  const vocabulary = JSON.parse(readFileSync(VOCABULARY_PATH, 'utf8')) as Vocabulary;
  const index = (
    JSON.parse(readFileSync('data/2026/search-index.json', 'utf8')) as {
      index: { index: [string, unknown][] };
    }
  ).index.index.map(([stem]) => stem);
  assert.equal(vocabulary.meta.index.terms, index.length);
  assert.equal(
    vocabulary.meta.index.sha256,
    vocabularyFingerprint(index),
    'the vocabulary of the index changed: judge its new stems (npm run lexicon -- --stems)',
  );
  const texts = ourTexts();
  const stems = new Set([...index, ...texts.flatMap(({ text }) => terms(text))]);
  assert.deepEqual(partitionProblems(vocabulary, stems), []);
  if (charter !== 2) return;
  const entries = explainedTerms();
  assert.deepEqual(coverageProblems(vocabulary, entries), []);
  const cards = cardWordings(
    (
      JSON.parse(readFileSync('data/2026/glossary.json', 'utf8')) as {
        entries: { id: string; term: string }[];
      }
    ).entries,
  );
  const hard = new Set(Object.keys(vocabulary.explain));
  const problems = texts.flatMap(({ where, text }) =>
    uncoveredIn(text, hard, [...cards, ...entries]).map((stem) => `${where}: ${stem}`),
  );
  assert.deepEqual(problems, []);
});
