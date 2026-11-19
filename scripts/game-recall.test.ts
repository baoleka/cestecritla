/**
 * « Tu te souviens ? » (src/lib/game-recall.ts): the two words the end of a round offers again —
 * on an INVENTED list of twelve words that are in no programme, then on the list of the game as
 * committed (public: data/2026/game-words.json).
 *
 * Run: npx tsx --test scripts/game-recall.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGame, gameSources, gameWords } from '../src/lib/game-data.js';
import { ROUND, draw, type GameData } from '../src/lib/game-engine.js';
import { recallFor } from '../src/lib/game-recall.js';

const id = (slot: number): string => `w${String(slot).padStart(3, '0')}`;
const LIST: GameData = {
  corpus: 'c0ffee',
  parts: [],
  words: Array.from({ length: 12 }, (_, slot) => ({
    id: id(slot),
    word: `mot${String(slot)}`,
    section: 'p1c1-s01',
    url: 'https://example.org/',
    fragment: '',
    places: ['p1c1-s01'],
    hint: [1, 2, 3],
  })),
};
const ids = (from: number, to: number): string[] =>
  Array.from({ length: to - from }, (_, i) => id(from + i));

void test('the end of a round offers its first word again, and an earlier one whose distance grows', () => {
  // The first round: nothing is earlier yet — one word to see again, its own first.
  assert.deepEqual(recallFor(LIST, ids(0, 3), ids(0, 3)), { fresh: id(0), old: null });
  // The second: the first word of the list — one round back.
  assert.deepEqual(recallFor(LIST, ids(0, 6), ids(3, 6)), { fresh: id(3), old: id(0) });
  // Then two words further at each round, while the game goes three: the wait grows.
  assert.deepEqual(recallFor(LIST, ids(0, 9), ids(6, 9)), { fresh: id(6), old: id(2) });
  assert.deepEqual(recallFor(LIST, ids(0, 12), ids(9, 12)), { fresh: id(9), old: id(4) });
  // Whether the round's own words are already counted as found or not changes nothing.
  assert.deepEqual(recallFor(LIST, ids(0, 3), ids(3, 6)), recallFor(LIST, ids(0, 6), ids(3, 6)));
});

void test('it reads the order of the list, never the order things were found in', () => {
  const round = ids(6, 9);
  const found = ids(0, 9);
  const expected = recallFor(LIST, found, round);
  // Two tabs that merged, a phone that kept a game: the same words, found in another order.
  assert.deepEqual(recallFor(LIST, [...found].reverse(), round), expected);
  assert.deepEqual(
    recallFor(LIST, [id(5), id(0), id(8), id(3), id(1), id(7), id(2), id(6), id(4)], round),
    expected,
  );
  // Twice the same word, or a word of no list: neither is a word to offer.
  assert.deepEqual(recallFor(LIST, [...found, id(0), 'w999'], round), expected);
  // The old word is never one of the round, and always one that was found.
  for (let from = 0; from < 12; from += ROUND) {
    const { fresh, old } = recallFor(LIST, ids(0, from + ROUND), ids(from, from + ROUND));
    assert.equal(fresh, id(from));
    if (old !== null) {
      assert.ok(!ids(from, from + ROUND).includes(old), `round at ${String(from)}`);
      assert.ok(ids(0, from).includes(old), `round at ${String(from)}`);
    }
  }
});

void test('a round that is not one, a link followed to a word, a game that goes round again', () => {
  // No word: nothing to offer.
  assert.deepEqual(recallFor(LIST, ids(0, 6), []), { fresh: null, old: null });
  assert.deepEqual(recallFor(LIST, ids(0, 6), ['w999']), { fresh: null, old: null });
  // A link that put the second word at the head of the first round: still nothing earlier.
  assert.deepEqual(recallFor(LIST, [id(1), id(0), id(2)], [id(1), id(0), id(2)]), {
    fresh: id(1),
    old: null,
  });
  // Something found in another tab before the first round here: it is earlier, and offered.
  assert.deepEqual(recallFor(LIST, [id(7), ...ids(0, 3)], ids(0, 3)), { fresh: id(0), old: id(7) });
  // Everything found, and the game goes round again: there is always an old word, never one of
  // the round, and it is not the same at every round.
  const all = ids(0, 12);
  const olds = [0, 3, 6, 9].map((from) => recallFor(LIST, all, ids(from, from + ROUND)));
  for (const [index, { fresh, old }] of olds.entries()) {
    const round = ids(index * ROUND, index * ROUND + ROUND);
    assert.equal(fresh, round[0]);
    assert.ok(old !== null && !round.includes(old));
  }
  assert.ok(new Set(olds.map((recall) => recall.old)).size > 1);
});

void test('on the list of the game: one word at the first round, two from the second, a wait from one round to six', () => {
  const file = gameWords();
  const { data } = buildGame(file, gameSources(), null);
  const listed = data.words.map((word) => word.id);
  const rounds = Math.ceil(listed.length / ROUND);
  const seen: string[] = [];
  const waits: number[] = [];
  for (let number = 1; number <= rounds; number += 1) {
    // The round the game itself would deal: the reading order of the list.
    const round = draw(data, seen, seen.at(-1) ?? null);
    seen.push(...round);
    const { fresh, old } = recallFor(data, seen, round);
    assert.equal(fresh, round[0], `round ${String(number)}`);
    if (number === 1) {
      assert.equal(old, null);
      continue;
    }
    // Two words further at each round, from the first word of the list.
    assert.equal(old, listed[2 * number - 4], `round ${String(number)}`);
    waits.push(number - 1 - Math.floor((2 * number - 4) / ROUND));
  }
  // The wait never shrinks, and goes from one round to six on the sixteen rounds of today.
  assert.deepEqual(
    waits,
    [...waits].sort((a, b) => a - b),
  );
  assert.equal(waits[0], 1);
  if (rounds === 16) assert.equal(waits.at(-1), 6);
});
