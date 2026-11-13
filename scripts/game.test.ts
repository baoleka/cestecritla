/**
 * The proof of the words of the game (src/lib/game.ts, lot J0): every way a word can be wrong
 * has its test, on an INVENTED book; then the committed list is proven on the real public files.
 *
 * Run: npx tsx --test scripts/game.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  wordlessSections,
  hintParts,
  proveWords,
  sectionsWithoutAncestor,
  type GameSources,
  type GameWord,
  type GameWordsFile,
} from '../src/lib/game.js';
import { buildGame, gameSources } from '../src/lib/game-data.js';
import { terms } from '../src/lib/search-core.js';

// --- an invented book: two parts, three sections, a handful of measures
const MEASURES: Record<string, string> = {
  'p1c1-s01-k01': 'Ouvrir une bibliothèque de quartier dans chaque commune',
  'p1c1-s01-m01': 'Prêter des vélos aux lecteurs de la bibliothèque',
  'p1c1-s01-m02': 'Installer des bancs près des vergers',
  'p1c1-s02-m01': 'Planter des arbres fruitiers et installer des ruches',
  'p2c1-s01-m01': 'Réparer les vélos des écoliers',
  'p2c1-s01-m02': 'Apprendre à rouler aux enfants',
  'p2c1-s02-m01': 'Un sujet grave où les ruches seraient citées',
};
const section = (id: string): string => id.replace(/-[km]\d{2}$/, '');
const sources = (): GameSources => {
  const ids = Object.keys(MEASURES);
  const documentIds = Object.fromEntries(ids.map((id, i) => [String(i), id]));
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
        { id: 'p1', order: 1, title: 'Partie 1 – Lire et jardiner' },
        { id: 'p2', order: 2, title: 'Partie 2 – Rouler' },
      ],
      chapters: [
        { id: 'p1c1', partId: 'p1', number: 1, title: 'Chapitre 1 : Les livres et les arbres' },
        { id: 'p2c1', partId: 'p2', number: 1, title: 'Chapitre 1 : Les routes' },
      ],
      sections: ['p1c1-s01', 'p1c1-s02', 'p2c1-s01', 'p2c1-s02'].map((id) => ({
        id,
        chapterId: id.slice(0, 4),
        partId: id.slice(0, 2),
        title:
          {
            'p1c1-s01': 'Des lieux pour lire',
            'p1c1-s02': 'Des vergers',
            'p2c1-s01': 'Des ateliers',
            'p2c1-s02': 'Un sujet grave',
          }[id] ?? '',
        items: ids
          .filter((item) => section(item) === id)
          .map((item) => ({
            id: item,
            kind: 'measure',
            sha256: `hash-${item}`,
            locator: 'text=…',
          })),
      })),
    },
    index: {
      documentIds,
      fieldIds: { text: 0, prefix: 1 },
      index: [...index].map(([term, docs]) => [term, { '0': docs }]),
    },
    // The grave section is the heir of a sensitive one; p1c1-s02 has no ancestor.
    idMap: { sections: { 'c1-s01': ['p1c1-s01'], 'c2-s01': ['p2c1-s01'], 'c9-s09': ['p2c1-s02'] } },
  };
};
const word = (id: string, text: string, pin: string, slot = 0): GameWord => ({
  slot,
  id,
  word: text,
  pin: { id: pin, sha256: `hash-${pin}` },
});
const list = (
  words: GameWord[],
  overrides: Partial<GameWordsFile['meta']> = {},
): GameWordsFile => ({
  meta: {
    corpus_version: 'c0ffee',
    pool: { sensitive_2025: ['c9-s09'], judged: { 'p1c1-s02': 'play' } },
    pool_reviewed_on: null,
    validated: { on: null, list_sha256: null },
    attested: { list_sha256: null, corpus_version: null, on: null },
    note_fr: '',
    ...overrides,
  },
  words,
});
const problemsOf = (file: GameWordsFile): string => proveWords(file, sources()).problems.join('\n');

void test('a word that can be accounted for is proven, with where else it is written', () => {
  const { proven, problems } = proveWords(list([word('w000', 'vélos', 'p1c1-s01-m01')]), sources());
  assert.deepEqual(problems, []);
  const [bike] = proven;
  assert.ok(bike);
  assert.equal(bike.stem, 'velo');
  assert.deepEqual(
    [bike.part, bike.sectionId, bike.chapterId, bike.partId],
    [1, 'p1c1-s01', 'p1c1', 'p1'],
  );
  // Written in two sections, the second in another part: computed, never typed.
  assert.deepEqual(bike.sections, ['p1c1-s01', 'p2c1-s01']);
  assert.deepEqual(bike.otherParts, [2]);
  assert.ok(bike.hint.includes(1));
});

void test('every way a word can be wrong is named', () => {
  const cases: [GameWordsFile, RegExp][] = [
    [
      list([word('w000', 'vélos', 'p1c1-s01-m01')], { corpus_version: 'decaf' }),
      /written for corpus decaf/,
    ],
    [
      list([word('w000', 'vélos', 'p1c1-s01-m01')], {
        pool: { sensitive_2025: ['c9-s09'], judged: {} },
      }),
      /p1c1-s02 is new in 2026 and not listed/,
    ],
    [list([word('mot1', 'vélos', 'p1c1-s01-m01')]), /not an identifier/],
    [
      list([word('w000', 'vélos', 'p1c1-s01-m01'), word('w000', 'arbres', 'p1c1-s02-m01', 1)]),
      /identifier used twice/,
    ],
    [list([word('w000', 'vélos', 'p1c1-s01-m01', 1)]), /slots are not 0, 1, 2/],
    [list([word('w000', 'Vélos', 'p1c1-s01-m01')]), /not one word in lower case/],
    [list([word('w000', 'arbres fruitiers', 'p1c1-s02-m01')]), /not one word in lower case/],
    [list([word('w000', 'dans', 'p1c1-s01-k01')]), /not a single word of its own/],
    [list([word('w000', 'trottinettes', 'p1c1-s01-m01')]), /in no measure of the index/],
    [list([word('w000', 'vélos', 'p1c1-s01-p01')]), /not a proposition of the manifest/],
    [
      list([
        { ...word('w000', 'vélos', 'p1c1-s01-m01'), pin: { id: 'p1c1-s01-m01', sha256: 'old' } },
      ]),
      /changed since it was pinned/,
    ],
    [list([word('w000', 'vélos', 'p1c1-s01-k01')]), /does not hold the stem/],
    // « ruches » is also written in the heir of a sensitive section.
    [
      list([word('w000', 'ruches', 'p1c1-s02-m01')]),
      /also written in p2c1-s02, which never holds a word of the game/,
    ],
    // A section the editor has not judged, or has judged out, is out.
    [
      list([word('w000', 'arbres', 'p1c1-s02-m01')], {
        pool: { sensitive_2025: [], judged: { 'p1c1-s02': null } },
      }),
      /p1c1-s02, which never holds a word of the game/,
    ],
    [
      list([word('w000', 'arbres', 'p1c1-s02-m01')], {
        pool: { sensitive_2025: [], judged: { 'p1c1-s02': 'exclude' } },
      }),
      /p1c1-s02, which never holds a word of the game/,
    ],
    // A title offered as an answer holds the stem: a chapter of the right part, a sibling section.
    [list([word('w000', 'arbres', 'p1c1-s02-m01')]), /its stem is in the title of p1c1/],
    [list([word('w000', 'vergers', 'p1c1-s01-m02')]), /its stem is in the title of p1c1-s02/],
    [list([word('w000', 'rouler', 'p2c1-s01-m02')]), /its stem is in the title of a part/],
    [
      list([word('w000', 'vélos', 'p1c1-s01-m01'), word('w001', 'vélo', 'p2c1-s01-m01', 1)]),
      /another word of the list has the same stem/,
    ],
    // One word per section: « trois mots, trois endroits » must be true of any round.
    [
      list([word('w000', 'vélos', 'p1c1-s01-m01'), word('w001', 'bancs', 'p1c1-s01-m02', 1)]),
      /another word of the list is shown in p1c1-s01/,
    ],
  ];
  for (const [file, expected] of cases) {
    assert.match(problemsOf(file), expected, JSON.stringify(file.words.map((w) => w.word)));
  }
  // A place the manifest does not know could be counted and never named: refused.
  const orphan = sources();
  orphan.index.documentIds['99'] = 'p7c1-s01-m01';
  const bancs = orphan.index.index.find(([term]) => term === 'banc');
  if (bancs !== undefined) (bancs[1]['0'] ??= {})['99'] = 1;
  assert.match(
    proveWords(list([word('w000', 'bancs', 'p1c1-s01-m02')]), orphan).problems.join('\n'),
    /its stem is in p7c1-s01, which is not a section of the manifest/,
  );
  // A word with a problem is never among the proven ones.
  assert.deepEqual(
    proveWords(list([word('w000', 'trottinettes', 'p1c1-s01-m01')]), sources()).proven,
    [],
  );
});

void test('a measure a link cannot land on is not a place to send a player', () => {
  const book = sources();
  const first = book.manifest.sections[0]?.items[1];
  assert.ok(first);
  first.locator = null;
  const { problems } = proveWords(list([word('w000', 'vélos', 'p1c1-s01-m01')]), book);
  assert.match(problems.join('\n'), /cannot land on the sentence/);
});

void test('the hint points at three tiles, the right one among them, the same way every build', () => {
  for (let right = 1; right <= 6; right += 1) {
    const hint = hintParts('w042', 'c0ffee', right, 6);
    assert.equal(hint.length, 3);
    assert.ok(hint.includes(right));
    assert.deepEqual(
      hint,
      [...hint].sort((a, b) => a - b),
      'in the order of the book',
    );
    assert.deepEqual(hintParts('w042', 'c0ffee', right, 6), hint);
  }
  // Not always the same two companions: the hint would otherwise teach the trick, not the book.
  const seen = new Set(
    Array.from({ length: 40 }, (_, i) =>
      hintParts(`w${String(i).padStart(3, '0')}`, 'c0ffee', 3, 6).join(''),
    ),
  );
  assert.ok(seen.size >= 5, `${String(seen.size)} different hints`);
});

// ---------------------------------------------------------------------------------------------
// The committed list, on the real public files
// ---------------------------------------------------------------------------------------------

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const real: GameSources = {
  manifest: json('data/2026/manifest.json') as GameSources['manifest'],
  index: (json('data/2026/search-index.json') as { index: GameSources['index'] }).index,
  idMap: json('data/2026/id-map-2025.json') as GameSources['idMap'],
};
const committed = json('data/2026/game-words.json') as GameWordsFile;

void test('the pool of the game: rule 11 has fifteen heirs in 2026, and eleven sections wait for a judgement', () => {
  assert.equal(
    committed.meta.pool.sensitive_2025.length,
    14,
    'rule 11 names fourteen sections of 2025',
  );
  const without = sectionsWithoutAncestor(real);
  assert.deepEqual(Object.keys(committed.meta.pool.judged).sort(), [...without].sort());
  assert.equal(without.length, 11);
  const heirs = new Set(
    committed.meta.pool.sensitive_2025.flatMap((id) => real.idMap.sections[id] ?? []),
  );
  assert.equal(heirs.size, 15);
  const excluded = wordlessSections(committed, real);
  for (const heir of heirs) assert.ok(excluded.has(heir), heir);
  // Not judged is out: a section is never in the game by having been forgotten.
  for (const [id, judgement] of Object.entries(committed.meta.pool.judged)) {
    assert.equal(excluded.has(id), judgement !== 'play', id);
  }
  // The pool cannot be called reviewed while a section is still waiting.
  if (committed.meta.pool_reviewed_on !== null) {
    assert.ok(
      Object.values(committed.meta.pool.judged).every((j) => j !== null),
      'a section is not judged',
    );
  }
});

void test('every section is a tile, and none of the sections kept apart lends a word (D16.26)', () => {
  // The tiles are the table of contents of the book, whole: a title left out of them would be
  // a chapter the game hides.
  const { data } = buildGame(committed, gameSources(), null);
  const tiles = data.parts.flatMap((part) => part.chapters.flatMap((chapter) => chapter.sections));
  assert.deepEqual(
    tiles.map((section) => section.id),
    real.manifest.sections.map((section) => section.id),
  );
  assert.equal(data.parts.flatMap((part) => part.chapters).length, real.manifest.chapters.length);
  // …and the sections kept apart are tiles too, with their official title.
  const wordless = wordlessSections(committed, real);
  for (const id of wordless) {
    const title = real.manifest.sections.find((section) => section.id === id)?.title;
    assert.ok(
      tiles.some((tile) => tile.id === id && tile.title === title),
      id,
    );
  }
  // No word of the list is written in one of them — not shown there, not « là aussi » there.
  for (const word of data.words) {
    for (const place of word.places) assert.ok(!wordless.has(place), `${word.id} in ${place}`);
  }
});

void test('every word of the committed list is proven on the public files', () => {
  const { proven, problems } = proveWords(committed, real);
  assert.deepEqual(problems, []);
  assert.equal(proven.length, committed.words.length);
  console.log(`  ${String(proven.length)} word(s) proven`);
});
