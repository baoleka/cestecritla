/**
 * « En clair » — recognising a concept card or an objection in a question (src/lib/notions.ts),
 * held on the five cards as they are published and on the evaluation set.
 *
 * Run: npx tsx --test scripts/notions.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { ReviewedEntry } from '../src/lib/ask-reviewed.js';
import {
  MAX_NOTIONS,
  foldRanks,
  notionsIn,
  recognise,
  type NotionEntry,
} from '../src/lib/notions.js';
import { loadAskSet } from './ask-set.js';

const cards = (
  JSON.parse(readFileSync('data/2026/glossary.json', 'utf8')) as { entries: NotionEntry[] }
).entries;
const objections = (
  JSON.parse(readFileSync('data/2026/riposte.json', 'utf8')) as { entries: ReviewedEntry[] }
).entries;
const set = loadAskSet();

void test('each card is recognised by its term: as written, retyped, in the plural, inside a question', () => {
  assert.equal(cards.length, 5);
  for (const card of cards) {
    assert.deepEqual(notionsIn(card.term, cards), [card.id], card.term);
    const retyped = card.term
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .toUpperCase();
    assert.deepEqual(notionsIn(retyped, cards), [card.id], retyped);
    assert.deepEqual(notionsIn(`c’est quoi, ${card.term} ?`, cards), [card.id], card.term);
    assert.deepEqual(notionsIn(`Ils parlent de « ${card.term} » : ça veut dire quoi ?`, cards), [
      card.id,
    ]);
  }
  assert.deepEqual(notionsIn('les règles vertes', cards), ['regle-verte']);
  assert.deepEqual(notionsIn('un écocide, des écocides', cards), ['ecocide']);
  // Small words between the words of a term do not hide it; another form of a word neither.
  assert.deepEqual(notionsIn('la planification de l’écologie', cards), [
    'planification-ecologique',
  ]);
});

void test('a rank is a rank however it is typed — and a word is not a rank', () => {
  for (const typed of [
    'la 6e République',
    'la 6ème république',
    'la 6eme republique',
    'la 6ième République',
    'la sixième République',
    'la sixieme republique',
    'la VIe République',
    'la VIème République',
  ]) {
    assert.deepEqual(notionsIn(typed, cards), ['6e-republique'], typed);
  }
  assert.equal(
    foldRanks('la VIe et la Ve, la 2ème et la dixième'),
    'la 6e et la 5e, la 2e et la 10e',
  );
  // « vie », « Vie », « VIE », « 6 », « 60 ans », « 1er »: nothing of a rank.
  for (const text of [
    'la vie',
    'Vie chère',
    'VIE PUBLIQUE',
    'les 6 parties',
    'à 60 ans',
    'le 1er mai',
  ]) {
    assert.equal(foldRanks(text), text);
  }
  for (const typed of [
    'la vie de la République',
    'la 5e République',
    'la République',
    'le 6e arrondissement',
  ]) {
    assert.deepEqual(notionsIn(typed, cards), [], typed);
  }
});

void test('the term itself, in a row and in its order — not its words scattered, not half of it', () => {
  for (const question of [
    'une énergie verte et une règle d’or',
    'la verte règle',
    'quelle règle pour les espaces verts ?',
    'la transition écologique',
    'une bifurcation sur la ligne de train',
    'planifier ses vacances écologiques',
    'la règle',
    '',
    'Bonjour',
  ]) {
    assert.deepEqual(notionsIn(question, cards), [], question);
  }
});

void test('two cards at most, in the order the question names them; each once', () => {
  assert.equal(MAX_NOTIONS, 2);
  assert.deepEqual(
    notionsIn('écocide, règle verte et planification écologique : quelle différence ?', cards),
    ['ecocide', 'regle-verte'],
  );
  assert.deepEqual(notionsIn('la règle verte, encore la règle verte', cards), ['regle-verte']);
  // Another wording of a term is recognised like the term, when a card declares one.
  const withAlias: NotionEntry[] = [
    { id: 'regle-verte', term: 'règle verte', aliases: ['règle écologique'] },
  ];
  assert.deepEqual(notionsIn('c’est quoi la règle écologique ?', withAlias), ['regle-verte']);
  // A card whose term folds to nothing is never recognised.
  assert.deepEqual(notionsIn('et le la les', [{ id: 'x', term: 'le la' }]), []);
});

void test('an objection and a card are two recognitions of the same question', () => {
  const eighth = objections.find((entry) => entry.slug === 'institutions');
  assert.ok(eighth !== undefined);
  assert.deepEqual(recognise(eighth.objection, { objections, cards }), {
    objection: 'institutions',
    cards: ['6e-republique'],
  });
  assert.deepEqual(recognise('La règle verte, c’est quoi ?', { objections, cards }), {
    objection: null,
    cards: ['regle-verte'],
  });
  assert.deepEqual(recognise('Et le nucléaire ?', { objections, cards }), {
    objection: null,
    cards: [],
  });
});

void test('on the evaluation set, every question that names a card opens it', () => {
  // The questions of the dossier that carry a term, found here by its plainest spelling.
  const spelled = (question: string, card: NotionEntry): boolean =>
    question.toLowerCase().replace(/’/g, "'").includes(card.term.toLowerCase());
  const opened: string[] = [];
  for (const item of set.items) {
    const found = notionsIn(item.question, cards);
    for (const card of cards) {
      if (spelled(item.question, card)) {
        assert.ok(
          found.includes(card.id),
          `${item.id} names « ${card.term} » and does not open it`,
        );
      }
    }
    if (found.length > 0) opened.push(`${item.id}:${found.join('+')}`);
  }
  assert.ok(opened.length >= 15, `only ${String(opened.length)} questions open a card`);
  console.log(`  cards opened: ${opened.join(', ')}`);
});
