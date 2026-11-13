/**
 * What the local tool checks where the text is (scripts/words-2026.ts, lot J2) — on an INVENTED
 * book: the real text never enters a test. One test per check, and one for the forms a word
 * takes.
 *
 * Run: npx tsx --test scripts/words-2026.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCAL_CHECKS, type GameSources, type GameWord } from '../src/lib/game.js';
import { terms } from '../src/lib/search-core.js';
import type { PrivateCorpus, PrivateItem } from './aec26-types.js';
import { formsOf, localCheck, problemsOf } from './words-2026.js';

// --- an invented book: its measures, and the prose around them
const MEASURES: Record<string, string> = {
  'p1c1-s01-m01': 'Ouvrir des bibliothèques dans chaque commune',
  'p1c1-s01-m02': 'Interdire la fermeture des bibliothèques de quartier',
  'p1c1-s01-m03': 'Relier les communes par un tram-train',
  'p1c1-s01-m04': 'Prendre le train plutôt que la route',
  'p1c1-s02-m01': 'Planter des vergers et ouvrir des marchés couverts',
  'p1c1-s02-m02': 'Encourager la marche à pied',
  'p1c1-s02-m03': 'Loger les sans-abri',
  'p2c1-s01-m01': 'Réparer les vélos des écoliers',
};
const PROSE: Record<string, string> = {
  'p1c1-s01-p01': 'Les bibliothèques sont des lieux pour tous.',
  'p2c1-s01-p01': 'Ici, il est question de vergers, que nulle mesure de cette section ne nomme.',
};
const sectionOfId = (id: string): string => id.replace(/-[kmp]\d{2}$/, '');
const SECTIONS = ['p1c1-s01', 'p1c1-s02', 'p2c1-s01'];

const item = (id: string, kind: string, text: string): PrivateItem =>
  ({ id, kind, text, words: text.split(/\s+/).length }) as unknown as PrivateItem;

const corpus = {
  meta: { corpus_version: 'c0ffee' },
  introduction: { id: 'p0', title: 'Introduction', items: [] },
  parts: [
    { id: 'p1', title: 'Partie 1 – Lire', items: [] },
    { id: 'p2', title: 'Partie 2 – Rouler', items: [] },
  ],
  chapters: [
    { id: 'p1c1', title: 'Chapitre 1 : Les livres', items: [] },
    { id: 'p2c1', title: 'Chapitre 1 : Les routes', items: [] },
  ],
  sections: SECTIONS.map((id) => ({
    id,
    title: { 'p1c1-s01': 'Des lieux pour lire', 'p1c1-s02': 'Dehors', 'p2c1-s01': 'Des ateliers' }[
      id
    ],
    items: [
      ...Object.entries(PROSE)
        .filter(([key]) => sectionOfId(key) === id)
        .map(([key, text]) => item(key, 'paragraph', text)),
      ...Object.entries(MEASURES)
        .filter(([key]) => sectionOfId(key) === id)
        .map(([key, text]) => item(key, 'measure', text)),
    ],
  })),
} as unknown as PrivateCorpus;

const sources = (): GameSources => {
  const ids = Object.keys(MEASURES);
  const index = new Map<string, Record<string, number>>();
  ids.forEach((id, i) => {
    for (const stem of terms(MEASURES[id] ?? '')) {
      index.set(stem, { ...(index.get(stem) ?? {}), [String(i)]: 1 });
    }
  });
  return {
    manifest: {
      meta: { corpus_version: 'c0ffee' },
      parts: [
        { id: 'p1', order: 1, title: 'Partie 1 – Lire' },
        { id: 'p2', order: 2, title: 'Partie 2 – Rouler' },
      ],
      chapters: [
        { id: 'p1c1', partId: 'p1', number: 1, title: 'Chapitre 1 : Les livres' },
        { id: 'p2c1', partId: 'p2', number: 1, title: 'Chapitre 1 : Les routes' },
      ],
      sections: SECTIONS.map((id) => ({
        id,
        chapterId: id.slice(0, 4),
        partId: id.slice(0, 2),
        title: '',
        items: ids
          .filter((key) => sectionOfId(key) === id)
          .map((key) => ({ id: key, kind: 'measure', sha256: `hash-${key}`, locator: 'text=…' })),
      })),
    },
    index: {
      documentIds: Object.fromEntries(ids.map((id, i) => [String(i), id])),
      fieldIds: { text: 0, prefix: 1 },
      index: [...index].map(([term, docs]) => [term, { '0': docs }]),
    },
    idMap: { sections: {} },
  };
};
const word = (text: string, pin: string): GameWord => ({
  slot: 0,
  id: 'w000',
  word: text,
  pin: { id: pin, sha256: `hash-${pin}` },
});
const check = (text: string, pin: string): ReturnType<typeof localCheck> =>
  localCheck(corpus, sources(), word(text, pin));

void test('a word written as listed, in a measure that forbids nothing, passes every check', () => {
  const seen = check('bibliothèques', 'p1c1-s01-m01');
  assert.deepEqual(problemsOf(seen), []);
  // The attestation names the checks it went through: this file has a test for each.
  assert.deepEqual([...LOCAL_CHECKS], ['written', 'affirm', 'prose', 'same', 'alone']);
});

void test('written: the list must write the word as the measure does', () => {
  assert.equal(check('bibliothèque', 'p1c1-s01-m01').written, false);
  assert.equal(check('bibliotheques', 'p1c1-s01-m01').written, false);
  assert.match(
    problemsOf(check('bibliothèque', 'p1c1-s01-m01')).join(' | '),
    /not written as such/,
  );
});

void test('affirm: a measure that opens on a prohibition lends no word', () => {
  const seen = check('bibliothèques', 'p1c1-s01-m02');
  assert.equal(seen.written, true);
  assert.equal(seen.affirm, false);
  assert.match(problemsOf(seen).join(' | '), /opens on a prohibition/);
});

void test('prose: a word a paragraph writes outside the sections of its measures is refused', () => {
  // « vergers » is in a measure of p1c1-s02 only, and in a paragraph of p2c1-s01.
  const seen = check('vergers', 'p1c1-s02-m01');
  assert.deepEqual(seen.prose, ['p2c1-s01-p01']);
  // …whereas the paragraph of a section whose measures hold the word says nothing new.
  assert.deepEqual(check('bibliothèques', 'p1c1-s01-m01').prose, []);
});

void test('same: a stem shared with another word is refused', () => {
  // « marchés » and « marche » fold to one stem; the second measure does not write the first.
  const seen = check('marchés', 'p1c1-s02-m01');
  assert.deepEqual(seen.others, ['p1c1-s02-m02']);
  assert.match(problemsOf(seen).join(' | '), /where the word itself is not written/);
});

void test('alone: a word the measure only writes glued to another is not a word of its own', () => {
  // « tram-train »: neither half is a word the book writes there.
  const tram = check('tram', 'p1c1-s01-m03');
  assert.equal(tram.written, true, 'the letters are there');
  assert.equal(tram.alone, false);
  assert.match(problemsOf(tram).join(' | '), /only written glued to another word/);
  assert.equal(check('abri', 'p1c1-s02-m03').alone, false);
  // The same word, free-standing in another measure, may be pinned there…
  const train = check('train', 'p1c1-s01-m04');
  assert.equal(train.alone, true);
  // …and the measure where it is glued still counts as a place where it is written: a reader
  // who searches the page for it finds it there.
  assert.deepEqual(train.others, []);
  assert.deepEqual(problemsOf(train), []);
});

void test('the forms of a word are its singular and plural, never another word', () => {
  assert.ok(formsOf('bocaux').includes('bocal'));
  assert.ok(formsOf('bateau').includes('bateaux'));
  assert.ok(formsOf('gare').includes('gares'));
  assert.ok(formsOf('gare').includes('Gare'));
  assert.ok(!formsOf('marchés').includes('marche'));
});
