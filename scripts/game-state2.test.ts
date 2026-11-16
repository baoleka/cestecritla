/**
 * What the game remembers with the second-generation mascot (src/lib/game-state2.ts; D17.3,
 * D17.14) and what it says of her when a round ends (src/lib/game-goal.ts; D17.5, D17.23) —
 * without a browser. The memory is tried on an INVENTED book; the goal, on the list of words
 * that is committed, because the rounds where she changes are counted on it.
 *
 * Run: npx tsx --test scripts/game-state2.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildGame, gameSources, gameWords } from '../src/lib/game-data.js';
import {
  draw,
  endOfRound,
  type GameData,
  type GameEntry,
  type Standing,
} from '../src/lib/game-engine.js';
import {
  GOAL_OF_STATE,
  lineAtRoundEnd,
  lineAtStart,
  nextRoundChangesHer,
  type HerLine,
} from '../src/lib/game-goal.js';
import {
  KEPT_FIELDS,
  TAB_FIELDS,
  parseKept,
  parseTab,
  serialiseKept,
  serialiseTab,
  type Kept,
  type TabState,
} from '../src/lib/game-state.js';
import {
  KEPT_FIELDS2,
  STORAGE_KEY,
  TAB_FIELDS2,
  fromPhone,
  keptPart2,
  ontoPhone,
  parseKept2,
  parseTab2,
  serialiseKept2,
  serialiseTab2,
  type Kept2,
  type TabState2,
} from '../src/lib/game-state2.js';
import type { MascotTint } from '../src/lib/mascot2.js';
import { STORAGE_MAP, STORAGE_STRINGS, TINT_LABEL } from '../src/lib/storage-map.js';
import { STRINGS_PATH, isMascotPrivacyKey } from './launch.js';

const entry = (slot: number, at: string): GameEntry => ({
  id: `w${String(slot).padStart(3, '0')}`,
  word: `mot${String(slot)}`,
  section: at,
  url: `https://example.org/${at}/`,
  fragment: '',
  places: [at],
  hint: [1, 2, 3],
});
/** Three parts, two chapters each, one section each, and a word in each of the six sections. */
const BOOK: GameData = {
  corpus: 'c0ffee',
  parts: [1, 2, 3].map((part) => ({
    number: part,
    title: `Partie inventée ${String(part)}`,
    chapters: [1, 2].map((chapter) => ({
      id: `p${String(part)}c${String(chapter)}`,
      number: chapter,
      title: `Chapitre inventé ${String(part)}.${String(chapter)}`,
      sections: [{ id: `p${String(part)}c${String(chapter)}-s01`, title: 'Section inventée' }],
    })),
  })),
  words: [1, 2, 3, 1, 2, 3].map((part, slot) =>
    entry(slot, `p${String(part)}c${String(slot < 3 ? 1 : 2)}-s01`),
  ),
};
const ids = (count: number): string[] => BOOK.words.slice(0, count).map((w) => w.id);

const kept = (tint: MascotTint, found = 2): Kept2 => ({
  seen: ids(found),
  depth: 2,
  turtle: 2,
  arcs: [6, 3, 0],
  tint,
});
const tab = (tint: MascotTint): TabState2 => ({
  ...kept(tint),
  corpus: BOOK.corpus,
  round: { words: ids(3), at: 1, shown: true },
  declined: true,
});

void test('the same key, and what the first generation wrote reads back as it was', () => {
  assert.equal(STORAGE_KEY, 'cestecritla.jeu.v1');
  const first: Kept = { seen: ids(4), depth: 3, turtle: 3, arcs: [6, 6, 2] };
  const written = serialiseKept(first);
  assert.deepEqual(parseKept2(written, BOOK), { ...first, tint: 0 });
  const firstTab: TabState = {
    ...first,
    corpus: BOOK.corpus,
    round: { words: ids(3), at: 2, shown: false },
    declined: false,
  };
  assert.deepEqual(parseTab2(serialiseTab(firstTab), BOOK), { ...firstTab, tint: 0 });
});

void test('while no colour is chosen, what is written is what the first generation writes', () => {
  assert.equal(serialiseKept2(kept(0)), serialiseKept(kept(0)));
  assert.equal(serialiseTab2(tab(0)), serialiseTab(tab(0)));
});

void test('one field more, and one only: her colour, once she has one', () => {
  for (const tint of [1, 2, 3, 4, 5, 6, 7] as const) {
    const written = serialiseKept2(kept(tint));
    assert.equal(written, `${serialiseKept(kept(tint)).slice(0, -1)},"tint":${String(tint)}}`);
    assert.deepEqual(parseKept2(written, BOOK), kept(tint));
    const writtenTab = serialiseTab2(tab(tint));
    assert.deepEqual(parseTab2(writtenTab, BOOK), tab(tint));
    // Nothing is ever written that the page does not declare: field by field.
    assert.deepEqual(Object.keys(JSON.parse(written) as object), [...KEPT_FIELDS2]);
    assert.deepEqual(Object.keys(JSON.parse(writtenTab) as object), [...TAB_FIELDS2]);
  }
  assert.deepEqual(KEPT_FIELDS2, [...KEPT_FIELDS, 'tint']);
  assert.deepEqual(TAB_FIELDS2, [...TAB_FIELDS, 'tint']);
  assert.deepEqual(keptPart2(tab(4)), kept(4));
});

void test('a step back loses her colour and nothing else: the first generation reads what this one wrote', () => {
  const was = kept(5);
  const progress: Kept = { seen: was.seen, depth: was.depth, turtle: was.turtle, arcs: was.arcs };
  assert.deepEqual(parseKept(serialiseKept2(was), BOOK), progress);
  const wasTab = tab(5);
  const tabProgress: TabState = {
    ...progress,
    corpus: wasTab.corpus,
    round: wasTab.round,
    declined: wasTab.declined,
  };
  assert.deepEqual(parseTab(serialiseTab2(wasTab), BOOK), tabProgress);
});

void test('a damaged colour is no colour, and never a crash', () => {
  const base = serialiseKept(kept(0)).slice(0, -1);
  for (const value of ['"3"', '8', '-1', '2.5', 'null', '[3]', '{"n":3}', 'true', '1e3']) {
    assert.equal(parseKept2(`${base},"tint":${value}}`, BOOK).tint, 0, value);
  }
  for (const raw of [null, '', 'not json', '[]', '7', '{"tint":3', 'x'.repeat(20_001)]) {
    assert.equal(parseKept2(raw, BOOK).tint, 0, String(raw).slice(0, 12));
    assert.deepEqual(parseKept2(raw, BOOK).seen, []);
  }
  // A colour alone, with nothing of a game around it, is still her colour.
  assert.equal(parseKept2('{"tint":6}', BOOK).tint, 6);
});

void test('nothing goes back, whichever way two memories are joined', () => {
  // A small generator with a fixed seed: the same memories on every run.
  let seed = 20261115;
  const next = (below: number): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % below;
  };
  const some = (): Kept2 => ({
    seen: ids(next(7)),
    depth: (1 + next(3)) as 1 | 2 | 3,
    turtle: next(5) as 0 | 1 | 2 | 3 | 4,
    arcs: [next(7), next(7), next(7)],
    tint: next(8) as MascotTint,
  });
  for (let i = 0; i < 400; i += 1) {
    const [a, b] = [some(), some()];
    for (const joined of [fromPhone(a, b), ontoPhone(a, b)]) {
      for (const one of [a, b]) {
        assert.ok(one.seen.every((id) => joined.seen.includes(id)));
        assert.ok(joined.depth >= one.depth && joined.turtle >= one.turtle);
        assert.ok(joined.arcs.every((steps, arc) => steps >= (one.arcs[arc] ?? 0)));
      }
      // Her colour is one of the two, never a third.
      assert.ok(joined.tint === a.tint || joined.tint === b.tint);
    }
  }
});

void test('her colour: the last gesture wins', () => {
  // A page that opens on a phone that keeps her: the phone holds the last gesture of any tab.
  assert.equal(fromPhone(kept(3), kept(5)).tint, 5);
  assert.equal(fromPhone(kept(0), kept(5)).tint, 5);
  // …unless nothing was ever chosen there.
  assert.equal(fromPhone(kept(3), kept(0)).tint, 3);
  // « Garder ta tortue », or a colour just chosen: the gesture is this tab's.
  assert.equal(ontoPhone(kept(3), kept(5)).tint, 3);
  assert.equal(ontoPhone(kept(0), kept(5)).tint, 5);
  // « Sans couleur » is a choice, and wins like one.
  assert.equal(fromPhone(kept(2), kept(7)).tint, 7);
  assert.equal(ontoPhone(kept(7), kept(2)).tint, 7);
  assert.equal(fromPhone(kept(0), kept(0)).tint, 0);
});

// ---------------------------------------------------------------------------------------------
// Her goal, in words (D17.5, D17.23)
// ---------------------------------------------------------------------------------------------

/** The game, played to the end and once round again: what each round does to her. */
function played(data: GameData): { passages: number[]; announced: number[]; lines: HerLine[] } {
  const passages: number[] = [];
  const announced: number[] = [];
  const lines: HerLine[] = [];
  let standing: Standing = { depth: 1, state: 0, arcs: [0, 0, 0] };
  let seen: string[] = [];
  let after: string | null = null;
  const rounds = Math.ceil(data.words.length / 3) + 1;
  for (let round = 1; round <= rounds; round += 1) {
    // Said at the end of the round before: this one will change her.
    if (nextRoundChangesHer(data, standing, seen, after)) announced.push(round);
    const words = draw(data, seen, after);
    seen = [...seen, ...words.filter((id) => !seen.includes(id))];
    after = words.at(-1) ?? null;
    const end = endOfRound(data, standing, seen);
    if (end.passage) passages.push(round);
    lines.push(lineAtRoundEnd(end, nextRoundChangesHer(data, end, seen, after)));
    standing = end;
  }
  return { passages, announced, lines };
}

void test('on the committed list: the rounds where she changes, and the rounds that say so before', () => {
  const { data } = buildGame(gameWords(), gameSources(), null);
  const { passages, announced, lines } = played(data);
  console.log(`  she changes at the end of rounds ${passages.join(', ')}`);
  // D17.1 names these rounds to the editor: a list that moves them is a list to show him.
  assert.deepEqual(passages, [1, 2, 7, 16]);
  // « À la prochaine manche, elle change » is said exactly when it is true: never a promise
  // the game does not keep, never a change it did not announce.
  assert.deepEqual(announced, passages);

  const said = (round: number): HerLine => lines[round - 1] ?? { passage: null, goal: null };
  // Round 1: she takes the wave, and the next round changes her again.
  assert.deepEqual(said(1), { passage: 1, goal: 'next_again' });
  assert.deepEqual(said(2), { passage: 2, goal: null });
  for (const round of [3, 4, 5]) assert.deepEqual(said(round), { passage: null, goal: 'chapters' });
  assert.deepEqual(said(6), { passage: null, goal: 'next' });
  assert.deepEqual(said(7), { passage: 3, goal: null });
  for (let round = 8; round <= 14; round += 1) {
    assert.deepEqual(said(round), { passage: null, goal: 'words' });
  }
  assert.deepEqual(said(15), { passage: null, goal: 'next' });
  assert.deepEqual(said(16), { passage: 4, goal: null });
  // Everything is found: the game goes on, and she has nothing more to become.
  assert.deepEqual(said(17), { passage: null, goal: 'done' });
});

void test('what is said of her is one sentence, two at most, and never about a choice', () => {
  // Before a word is found, and then only.
  assert.equal(lineAtStart(0), 'start');
  for (const state of [1, 2, 3, 4] as const) assert.equal(lineAtStart(state), null);
  assert.deepEqual(GOAL_OF_STATE, { 0: 'start', 1: 'parts', 2: 'chapters', 3: 'words', 4: 'done' });
  // No passage: what will make her change — or that the next round will.
  for (const state of [1, 2, 3, 4] as const) {
    assert.deepEqual(lineAtRoundEnd({ state, passage: false }, false), {
      passage: null,
      goal: GOAL_OF_STATE[state],
    });
    assert.deepEqual(lineAtRoundEnd({ state, passage: false }, true), {
      passage: null,
      goal: 'next',
    });
    // A passage: its own sentence first.
    assert.deepEqual(lineAtRoundEnd({ state, passage: true }, false), {
      passage: state,
      goal: null,
    });
    assert.deepEqual(lineAtRoundEnd({ state, passage: true }, true), {
      passage: state,
      goal: 'next_again',
    });
  }
  // On an invented book the same holds: announced exactly when true.
  const invented = played(BOOK);
  assert.deepEqual(invented.announced, invented.passages);
  // Nothing of a choice goes in: the function is told what was found, and nothing else.
  assert.equal(nextRoundChangesHer.length, 4);
});

// ---------------------------------------------------------------------------------------------
// What the privacy page lists (D17.3; docs/discovery/PLAN-TORTUE.md §9)
// ---------------------------------------------------------------------------------------------

void test('the map of what is written on a phone: the fields of the first generation, and her colour', () => {
  assert.equal(STORAGE_MAP.length, 2);
  for (const entry of STORAGE_MAP) {
    // The same key in both storages, as before her: nobody loses their turtle.
    assert.equal(entry.key, STORAGE_KEY);
    // Every field the first generation wrote, in its place, and one more at the end.
    const before = entry.storage === 'localStorage' ? KEPT_FIELDS : TAB_FIELDS;
    assert.deepEqual(
      entry.fields.slice(0, -1).map((f) => f.name),
      [...before],
    );
    assert.deepEqual(entry.fields.at(-1), { name: 'tint', label: TINT_LABEL });
  }
  // The fields the map lists are the fields her memory writes — the same lists, not a copy.
  assert.deepEqual(
    STORAGE_MAP.map((entry) => entry.fields.map((f) => f.name)),
    [[...TAB_FIELDS2], [...KEPT_FIELDS2]],
  );

  // Every sentence the map points at exists, and is one a reader can be shown.
  const kit = JSON.parse(readFileSync(STRINGS_PATH, 'utf8')) as Record<string, unknown>;
  for (const key of STORAGE_STRINGS) {
    assert.ok(typeof kit[key] === 'string' && kit[key].length > 0, `the kit has no ${key}`);
  }
  // Her line is the one the launch gate reads apart (`privacy_mascot`) — and the only one.
  assert.deepEqual(
    STORAGE_STRINGS.filter((key) => isMascotPrivacyKey(key)),
    [TINT_LABEL],
  );
});
