/**
 * The search of the 2026 edition: one language core for the builder, the browser and the
 * evaluation; an index that holds stems and nothing else; and a measured quality that may not
 * regress (lot D).
 * Run: npx tsx --test scripts/search-2026.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as bench from '../eval/retrieval-core.js';
import {
  STOPWORDS,
  credited,
  expand,
  groupBySection,
  inBookWords,
  processTerm,
  sectionOf,
  spelled,
  terms,
  tokenize,
} from '../src/lib/search-core.js';
import { manifestPropositions } from './aec26-publish.js';
import type { Manifest } from './aec26-types.js';
import {
  SEARCH_EVAL_PATH,
  evaluate,
  searchEval,
  type Questions2026,
  type SynonymsFile,
} from './eval-2026.js';

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const manifest = json('data/2026/manifest.json') as Manifest;

void test('the core cuts words exactly like the bench it was lifted from', () => {
  const questions = (json('eval/questions.json') as { questions: { question: string }[] })
    .questions;
  const faq = (json('data/faq.json') as { entries: { question: string; aliases: string[] }[] })
    .entries;
  const samples = [
    ...questions.map((q) => q.question),
    ...faq.flatMap((e) => [e.question, ...e.aliases]),
    'L’État, c’est aujourd’hui 1 600 euros nets ; jusqu’à 10 000 emplois créés !',
  ];
  for (const text of samples) assert.deepEqual(terms(text), bench.terms(text), text);
  assert.deepEqual([...STOPWORDS].sort(), [...bench.STOPWORDS].sort());
});

void test('a soft hyphen never splits a word (the 2026 text has fifteen)', () => {
  const soft = String.fromCodePoint(0xad);
  assert.deepEqual(tokenize(`déve${soft}loppement durable`), ['developpement', 'durable']);
  assert.deepEqual(terms(`Les salaires augmen${soft}tent`), terms('Les salaires augmentent'));
  assert.equal(processTerm('les'), null);
  assert.equal(processTerm('salaires'), 'salaire');
});

void test('letters typed apart are one word, and the small words of a sentence stay words', () => {
  for (const [typed, read] of [
    ['R.S.A.', 'rsa'],
    ['le R.I.C.', 'le ric'],
    ['S.M.I.C. à combien ?', 'smic a combien'],
    ['T.V.A. à 0', 'tva a 0'],
    ['L.F.I. et la retraite', 'lfi et la retraite'],
    ['l f i', 'lfi'],
    ['L. F. I.', 'lfi'],
    ['l-f-i', 'lfi'],
    ['« l » « f » « i »', 'lfi'],
    ['R N et la retraite', 'rn et la retraite'],
    ['m e l e n c h o n', 'melenchon'],
    // Full-width letters are the letters.
    [String.fromCodePoint(0xff32, 0xff33, 0xff21), 'rsa'],
    // …and what is not initials is left alone.
    ['y a-t-il une mesure ?', 'y a t il une mesure'],
    ['il y a quoi ?', 'il y a quoi'],
    ['qu’a-t-on prévu ?', 'a t on prevu'],
    ['c koi, g pas compris', 'c koi g pas compris'],
    ['la retraite à 60 ans', 'la retraite a 60 ans'],
    ['le 49.3', 'le 49 3'],
  ] as const) {
    assert.equal(spelled(typed).join(' '), read, typed);
  }
  // A question without such letters is cut exactly as the index cuts it.
  for (const typed of ['Les loyers à Lyon, c’est quoi le plan ?', 'l’hôpital et les 32 heures']) {
    assert.deepEqual(spelled(typed), tokenize(typed), typed);
  }
});

void test('synonyms: a phrase of a group brings the others, and only then', () => {
  const groups = [
    ['bac', 'baccalauréat'],
    ['prison', 'détention', 'surpopulation carcérale'],
  ];
  assert.equal(expand('Ils suppriment le bac ?', groups), 'baccalauréat');
  assert.equal(expand('Ils vont vider les prisons ?', groups), 'détention surpopulation carcérale');
  assert.equal(expand('Et les retraites ?', groups), '');
  // Words already in the question are not added twice.
  assert.equal(expand('bac ou baccalauréat ?', groups), '');
});

void test('a phrase the book writes in other words is searched in its words, and nothing else moves (D21.8)', () => {
  const wordings = [{ said: ['exil fiscal', 'exilés fiscaux'], searched: 'évasion fiscale' }];
  // The phrase, wherever it stands and however it is written, gives way to the book's words.
  for (const asked of [
    'exil fiscal',
    'Que dit le programme de l’exil fiscal ?',
    'les EXILÉS FISCAUX et la taxe',
  ]) {
    const searched = terms(inBookWords(asked, wordings).text);
    assert.ok(!searched.includes('exil') && !searched.includes('exile'), asked);
    assert.ok(searched.includes('evasion') && searched.includes('fiscale'), asked);
  }
  assert.deepEqual(terms(inBookWords('les exilés fiscaux et la taxe', wordings).text), [
    'taxe',
    'evasion',
    'fiscale',
  ]);
  // Without the phrase, the question is searched as it came: « exil » alone is the book's word.
  for (const asked of ['exil', 'l’exil des réfugiés', 'fiscal', 'exil et fiscalité']) {
    assert.equal(inBookWords(asked, wordings).text, asked);
  }
  // The words replaced are answered for by the words that replaced them (`strangersIn`).
  const book = inBookWords('exil fiscal', wordings);
  assert.deepEqual([...(book.credit.get('evasion') ?? [])].sort(), ['exil', 'fiscal']);
  assert.deepEqual(credited(['evasion', 'taxe'], book.credit).sort(), [
    'evasion',
    'exil',
    'fiscal',
    'taxe',
  ]);
  assert.deepEqual(credited(['taxe'], book.credit), ['taxe']);
});

void test('the phrases the book writes in other words: a closed list, each with its reason, each finding the book', () => {
  const file = json('data/2026/synonyms.json') as SynonymsFile;
  const index = new Set(
    (
      json('data/2026/search-index.json') as { index: { index: [string, unknown][] } }
    ).index.index.map(([stem]) => stem),
  );
  const wordings = file.book_words ?? [];
  assert.ok(wordings.length <= 5, 'a closed list: each phrase is one the book would mislead');
  for (const wording of wordings) {
    assert.ok(wording.why_fr.length > 40, `${wording.searched}: no reason given`);
    assert.ok(wording.said.length > 0);
    for (const phrase of wording.said) {
      // A phrase, never a lone word: a word alone is the book's own (« exil »).
      assert.ok(terms(phrase).length >= 2, `${phrase}: a phrase has two words at least`);
      assert.ok(phrase.split(/\s+/).length <= 4, `${phrase}: too long`);
    }
    // The book's words are words the index holds: what replaces finds something.
    for (const term of terms(wording.searched)) {
      assert.ok(index.has(term), `${wording.searched}: « ${term} » is not in the index`);
    }
  }
});

void test('ranked propositions are grouped by section, the best proposition first', () => {
  assert.equal(sectionOf('p4c7-s03-m12.s2'), 'p4c7-s03');
  assert.equal(sectionOf('p1c1-s01-k01'), 'p1c1-s01');
  const grouped = groupBySection([
    { id: 'p1c1-s01-m03', score: 10 },
    { id: 'p2c2-s01-k01', score: 9 },
    { id: 'p2c2-s01-m02', score: 8 },
    { id: 'p2c2-s01-m05', score: 2 },
  ]);
  // Two strong measures of one section outrank one stray, slightly stronger hit.
  assert.deepEqual(
    grouped.map((g) => g.sectionId),
    ['p2c2-s01', 'p1c1-s01'],
  );
  assert.deepEqual(grouped[0]?.items, ['p2c2-s01-k01', 'p2c2-s01-m02', 'p2c2-s01-m05']);
});

interface SerialisedIndex {
  documentCount: number;
  documentIds: Record<string, string>;
  storedFields: Record<string, unknown>;
  fieldIds: Record<string, number>;
}

void test('the committed index is the index of the manifest, and stores no field', () => {
  const file = json('data/2026/search-index.json') as {
    meta: { corpus_version: string; documents: number };
    index: SerialisedIndex;
  };
  assert.equal(file.meta.corpus_version, manifest.meta.corpus_version);
  const ids = new Set(Object.values(file.index.documentIds));
  const propositions = manifestPropositions(manifest).map((p) => p.id);
  assert.equal(ids.size, propositions.length);
  for (const id of propositions) assert.ok(ids.has(id), `${id} is not indexed`);
  assert.deepEqual(Object.keys(file.index.fieldIds).sort(), ['prefix', 'text']);
  // Stored fields are how a sentence would travel inside an index: there must be none.
  for (const stored of Object.values(file.index.storedFields)) assert.deepEqual(stored, {});
});

void test('synonyms are ours: short phrases, no group of one', () => {
  const file = json('data/2026/synonyms.json') as SynonymsFile;
  assert.ok(file.groups.length >= 50);
  for (const group of file.groups) {
    assert.ok(group.length >= 2, `a group of one: ${group.join('|')}`);
    for (const phrase of group) {
      // A whole question of the FAQ is a phrase too: the longest has thirteen words.
      assert.ok(phrase.split(/\s+/).length <= 16, `too long to be a synonym: ${phrase}`);
    }
  }
});

void test('search quality on the evaluation set does not regress', () => {
  const file = json('eval/questions-2026.json') as Questions2026;
  assert.equal(file.meta.corpus_version, manifest.meta.corpus_version);
  const sections = new Set(manifest.sections.map((s) => s.id));
  for (const q of file.questions) {
    assert.ok(q.primary.length + q.accepted.length > 0, `${q.id}: nothing expected`);
    for (const id of [...q.primary, ...q.accepted]) assert.ok(sections.has(id), `${q.id}: ${id}`);
  }
  const result = evaluate(file.questions);
  console.log(
    `  ${String(result.evaluated)} questions: hit@1 ${String(result.hit1)}, hit@3 ${String(result.hit3)}, ` +
      `hit@5 ${String(result.hit5)}, recall@3 ${String(result.recall3)}`,
  );
  // Targets of the plan: hit@5 >= 0.95 (met), recall@3 >= 0.90 (measured 0.877 on 12/11/2026 and
  // published as such on /exactitude). The floors below are the measured values, less one question.
  assert.ok(result.evaluated >= 85, 'the evaluation set shrank');
  assert.ok(result.hit5 >= 0.95, `hit@5 ${String(result.hit5)}`);
  assert.ok(result.hit3 >= 0.94, `hit@3 ${String(result.hit3)}`);
  assert.ok(result.hit1 >= 0.79, `hit@1 ${String(result.hit1)}`);
  assert.ok(result.recall3 >= 0.86, `recall@3 ${String(result.recall3)}`);
  // …and below the target, for as long as /exactitude/ prints the target as missed
  // (accuracy.search.miss, « Objectif manqué … pour 90 visés »): the day the search reaches it,
  // this fails, and the page needs the sentence of a met target — a text for the editor
  // (review of 23/11/2026, P5).
  assert.ok(
    result.recall3 < 0.9,
    `recall@3 ${String(result.recall3)} meets its target: /exactitude/ still says « Objectif manqué »`,
  );
});

void test('the figures /exactitude publishes are the ones a fresh evaluation gives', () => {
  const file = json('eval/questions-2026.json') as Questions2026;
  assert.deepEqual(json(SEARCH_EVAL_PATH), searchEval(file), `run eval-2026.ts --write`);
});
