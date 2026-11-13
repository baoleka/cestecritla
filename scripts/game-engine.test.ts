/**
 * The rules of « Où est-ce écrit ? » (src/lib/game-engine.ts) and what the game remembers
 * (src/lib/game-state.ts), played without a browser on an INVENTED book: six parts, two
 * chapters each, two sections each, and nine words that are in no programme.
 *
 * Run: npx tsx --test scripts/game-engine.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LONG_WORD,
  ROUND,
  advance,
  asksAt,
  begin,
  choose,
  current,
  depthOf,
  draw,
  endOfRound,
  entryOf,
  found,
  foundNow,
  hintFor,
  isLongWord,
  judge,
  locate,
  otherParts,
  placeOf,
  playable,
  resume,
  rightTile,
  tilesFor,
  turtleOf,
  type GameData,
  type GameEntry,
  type Standing,
  type TurtleProgress,
} from '../src/lib/game-engine.js';
import {
  KEPT_FIELDS,
  STORAGE_KEY,
  TAB_FIELDS,
  emptyKept,
  emptyTab,
  keptPart,
  merge,
  parseKept,
  parseTab,
  serialiseKept,
  serialiseTab,
  type Kept,
  type TabState,
} from '../src/lib/game-state.js';

const section = (part: number, chapter: number, n: number): string =>
  `p${String(part)}c${String(chapter)}-s0${String(n)}`;
const entry = (slot: number, word: string, at: string, places: string[] = [at]): GameEntry => ({
  id: `w${String(slot).padStart(3, '0')}`,
  word,
  section: at,
  url: `https://example.org/${at}/`,
  fragment: '',
  places,
  hint: [1, 3, 6],
});

const BOOK: GameData = {
  corpus: 'c0ffee',
  parts: [1, 2, 3, 4, 5, 6].map((part) => ({
    number: part,
    title: `Partie inventée ${String(part)}`,
    chapters: [1, 2].map((chapter) => ({
      id: `p${String(part)}c${String(chapter)}`,
      number: chapter,
      title: `Chapitre inventé ${String(part)}.${String(chapter)}`,
      sections: [1, 2].map((n) => ({
        id: section(part, chapter, n),
        title: `Section inventée ${String(part)}.${String(chapter)}.${String(n)}`,
      })),
    })),
  })),
  words: [
    // Written in three places: another chapter of its part, and another part.
    entry(0, 'lampe', section(1, 1, 1), [section(1, 1, 1), section(1, 2, 1), section(3, 1, 2)]),
    entry(1, 'banc', section(2, 1, 1)),
    entry(2, 'pont', section(3, 1, 1)),
    entry(3, 'toit', section(4, 1, 1)),
    entry(4, 'quai', section(5, 1, 1)),
    entry(5, 'puits', section(6, 1, 1)),
    entry(6, 'four', section(1, 2, 1)),
    // Written in the other section of its own chapter too.
    entry(7, 'gare', section(2, 2, 2), [section(2, 2, 1), section(2, 2, 2)]),
    // A second word of a chapter already held: it adds no chapter.
    entry(8, 'mur', section(1, 1, 2)),
  ],
};
const ids = (count: number): string[] => BOOK.words.slice(0, count).map((w) => w.id);

void test('a word is where the game shows it, and the thresholds are counted on what is playable', () => {
  assert.equal(locate(BOOK, section(3, 2, 2))?.chapter.id, 'p3c2');
  assert.equal(locate(BOOK, 'p9c9-s09'), null);
  assert.equal(placeOf(BOOK, 'w007')?.part.number, 2);
  assert.equal(placeOf(BOOK, 'w999'), null);
  assert.equal(entryOf(BOOK, 'w002')?.word, 'pont');

  const all = playable(BOOK);
  assert.deepEqual([...all.parts].sort(), [1, 2, 3, 4, 5, 6]);
  // Eight chapters hold a word; the four others are tiles, never a threshold.
  assert.equal(all.chapters.size, 8);

  // Found is what was SHOWN: « lampe » is also written in part 3, and finding it finds part 1.
  assert.deepEqual(found(BOOK, ['w000']), { words: 1, parts: 1, chapters: 1 });
  assert.deepEqual(found(BOOK, ['w000', 'w000', 'w999']), { words: 1, parts: 1, chapters: 1 });
  assert.deepEqual(found(BOOK, ids(9)), { words: 9, parts: 6, chapters: 8 });
});

void test('the depth opens with what has been found, and the turtle with it', () => {
  const steps: [number, number, number, [number, number, number]][] = [
    // words found, depth, turtle state, arcs
    [0, 1, 0, [0, 0, 0]],
    [1, 1, 1, [1, 0, 0]],
    [5, 1, 1, [5, 0, 0]],
    // A word in each of the six parts: the chapter is asked, the second arc starts.
    [6, 2, 2, [6, 4, 0]],
    [7, 2, 2, [6, 5, 0]],
    // A word in each chapter that holds one: the section is asked, the third arc starts.
    [8, 3, 3, [6, 6, 5]],
    [9, 3, 4, [6, 6, 6]],
  ];
  let previous: TurtleProgress = { state: 0, arcs: [0, 0, 0] };
  for (const [count, depth, state, arcs] of steps) {
    assert.equal(depthOf(BOOK, ids(count)), depth, `${String(count)} words`);
    const turtle = turtleOf(BOOK, ids(count));
    assert.deepEqual([turtle.state, turtle.arcs], [state, arcs], `${String(count)} words`);
    // Never back, whatever is found next.
    assert.ok(turtle.state >= previous.state);
    const before = previous.arcs;
    turtle.arcs.forEach((arc, i) => {
      assert.ok(arc >= (before[i] ?? 0));
    });
    previous = turtle;
  }
  // The order of discovery does not matter, only what was found.
  assert.deepEqual(turtleOf(BOOK, ids(6).reverse()), turtleOf(BOOK, ids(6)));
  // Six words that are not one per part open nothing.
  assert.equal(depthOf(BOOK, ['w000', 'w001', 'w002', 'w003', 'w006', 'w008']), 1);
  // A game with no word asks nothing deeper and shows a plain shell.
  const none: GameData = { ...BOOK, words: [] };
  assert.equal(depthOf(none, []), 1);
  assert.deepEqual(turtleOf(none, []), { state: 0, arcs: [0, 0, 0] });
});

void test('the draw is the game’s: the reading order of the list, then round and round', () => {
  assert.equal(ROUND, 3);
  assert.deepEqual(draw(BOOK, [], null), ['w000', 'w001', 'w002']);
  assert.deepEqual(draw(BOOK, ['w000'], null), ['w001', 'w002', 'w003']);
  // A round left half-way: what was not found comes first, in order.
  assert.deepEqual(draw(BOOK, ['w000', 'w002'], 'w002'), ['w001', 'w003', 'w004']);
  // Two left: the round is completed from the word after the last one played.
  assert.deepEqual(draw(BOOK, ids(7), 'w006'), ['w007', 'w008', 'w000']);
  // Everything found: the list goes on from where the last round stopped.
  assert.deepEqual(draw(BOOK, ids(9), 'w008'), ['w000', 'w001', 'w002']);
  assert.deepEqual(draw(BOOK, ids(9), 'w004'), ['w005', 'w006', 'w007']);
  assert.deepEqual(draw(BOOK, ids(9), 'w007'), ['w008', 'w000', 'w001']);
  // The same past, the same round — and never the same word twice in one.
  for (let count = 0; count <= 9; count += 1) {
    const round = draw(BOOK, ids(count), 'w003');
    assert.deepEqual(round, draw(BOOK, ids(count), 'w003'));
    assert.equal(new Set(round).size, ROUND);
  }
  // A list shorter than a round gives what it has.
  const short: GameData = { ...BOOK, words: BOOK.words.slice(0, 2) };
  assert.deepEqual(draw(short, [], null), ['w000', 'w001']);
  assert.deepEqual(draw(short, ['w000', 'w001'], 'w000'), ['w001', 'w000']);
  assert.deepEqual(draw({ ...BOOK, words: [] }, [], null), []);
});

void test('what is asked at each depth, and the tiles of each question', () => {
  assert.deepEqual(asksAt(1), ['part']);
  assert.deepEqual(asksAt(2), ['part', 'chapter']);
  assert.deepEqual(asksAt(3), ['part', 'chapter', 'section']);

  const parts = tilesFor(BOOK, 'w007', 'part');
  assert.deepEqual(
    parts.map((t) => t.id),
    ['1', '2', '3', '4', '5', '6'],
  );
  assert.equal(parts[1]?.title, 'Partie inventée 2');
  // The chapters of ITS part, the sections of ITS chapter: never a tile from elsewhere.
  assert.deepEqual(
    tilesFor(BOOK, 'w007', 'chapter').map((t) => [t.id, t.number]),
    [
      ['p2c1', 1],
      ['p2c2', 2],
    ],
  );
  assert.deepEqual(
    tilesFor(BOOK, 'w007', 'section').map((t) => [t.id, t.number]),
    [
      [section(2, 2, 1), null],
      [section(2, 2, 2), null],
    ],
  );
  assert.deepEqual(tilesFor(BOOK, 'w999', 'chapter'), []);
  assert.equal(rightTile(BOOK, 'w007', 'part'), '2');
  assert.equal(rightTile(BOOK, 'w007', 'chapter'), 'p2c2');
  assert.equal(rightTile(BOOK, 'w007', 'section'), section(2, 2, 2));
  assert.equal(rightTile(BOOK, 'w999', 'part'), null);
});

void test('a choice is here, also here, or elsewhere — and there is no fourth word', () => {
  // « lampe »: shown in part 1, chapter 1; also written in chapter 2 of part 1, and in part 3.
  assert.equal(judge(BOOK, 'w000', 'part', '1'), 'here');
  assert.equal(judge(BOOK, 'w000', 'part', '3'), 'also');
  assert.equal(judge(BOOK, 'w000', 'part', '5'), 'elsewhere');
  assert.equal(judge(BOOK, 'w000', 'chapter', 'p1c1'), 'here');
  assert.equal(judge(BOOK, 'w000', 'chapter', 'p1c2'), 'also');
  assert.equal(judge(BOOK, 'w000', 'section', section(1, 1, 1)), 'here');
  assert.equal(judge(BOOK, 'w000', 'section', section(1, 1, 2)), 'elsewhere');
  // « gare »: the other section of its chapter holds it too.
  assert.equal(judge(BOOK, 'w007', 'section', section(2, 2, 1)), 'also');
  assert.equal(judge(BOOK, 'w007', 'chapter', 'p2c1'), 'elsewhere');
  assert.equal(judge(BOOK, 'w999', 'part', '1'), 'elsewhere');

  // Every tile of every question of every word gets one of the three, and exactly one "here".
  for (const word of BOOK.words) {
    for (const ask of asksAt(3)) {
      const verdicts = tilesFor(BOOK, word.id, ask).map((t) => judge(BOOK, word.id, ask, t.id));
      for (const verdict of verdicts) assert.match(verdict, /^(?:here|also|elsewhere)$/);
      assert.equal(verdicts.filter((v) => v === 'here').length, 1);
    }
  }
  // Where else it is written, by part — the part it is shown in is not "elsewhere".
  assert.deepEqual(otherParts(BOOK, 'w000'), [3]);
  assert.deepEqual(otherParts(BOOK, 'w007'), []);
  assert.deepEqual(otherParts(BOOK, 'w999'), []);
});

void test('the end of a round is the only moment anything changes, and nothing goes back', () => {
  const start: Standing = { depth: 1, state: 0, arcs: [0, 0, 0] };
  const first = endOfRound(BOOK, start, ids(3));
  assert.deepEqual(first, { depth: 1, state: 1, arcs: [3, 0, 0], opened: null, passage: true });
  // Same state, one more arc step: no passage.
  const second = endOfRound(BOOK, first, ids(5));
  assert.deepEqual([second.passage, second.opened, second.arcs], [false, null, [5, 0, 0]]);
  // The six parts: the chapter opens, and she passes.
  const third = endOfRound(BOOK, second, ids(6));
  assert.deepEqual([third.depth, third.opened, third.passage, third.state], [2, 2, true, 2]);
  const last = endOfRound(BOOK, third, ids(9));
  assert.deepEqual([last.depth, last.opened, last.state, last.arcs], [3, 3, 4, [6, 6, 6]]);
  // Nothing found since: nothing opens, nothing passes.
  const again = endOfRound(BOOK, last, ids(9));
  assert.deepEqual([again.opened, again.passage], [null, false]);

  // A list that lost its words since (a new edition): she keeps what she had.
  const kept = endOfRound({ ...BOOK, words: BOOK.words.slice(0, 2) }, third, ['w000']);
  assert.deepEqual([kept.depth, kept.state, kept.arcs], [2, 2, [6, 4, 0]]);
  assert.deepEqual([kept.opened, kept.passage], [null, false]);
});

void test('a round, step by step: one question deeper at each depth, then the card of the place', () => {
  // Depth 1: one question, then the card — and the word is found whatever was chosen.
  let play = begin(['w000', 'w001', 'w002']);
  assert.deepEqual(play.screen, { kind: 'ask', ask: 'part', said: null });
  assert.equal(current(play), 'w000');
  assert.equal(foundNow(play), null);
  play = choose(BOOK, play, 1, '5');
  assert.deepEqual(play.screen, { kind: 'place', ask: 'part', verdict: 'elsewhere' });
  assert.equal(foundNow(play), 'w000');
  // A second tap on a tile changes nothing: the card stays what it was.
  assert.deepEqual(choose(BOOK, play, 1, '1'), play);
  play = advance(play);
  assert.deepEqual([current(play), play.screen.kind], ['w001', 'ask']);
  // « Mot suivant » does nothing on a question.
  assert.deepEqual(advance(play), play);
  // « Je ne sais pas »: straight to the card, which says nothing about a choice.
  play = choose(BOOK, play, 1, null);
  assert.deepEqual(play.screen, { kind: 'place', ask: 'part', verdict: null });
  play = advance(choose(BOOK, advance(play), 1, '3'));
  assert.deepEqual(play.screen, { kind: 'end' });
  assert.equal(current(play), null);
  assert.deepEqual(advance(play), play);
  assert.deepEqual(choose(BOOK, play, 1, '1'), play);

  // Depth 3: the part, then the chapter, then the section — each choice said before the next.
  play = choose(BOOK, begin(['w000']), 3, '3');
  assert.deepEqual(play.screen, {
    kind: 'ask',
    ask: 'chapter',
    said: { ask: 'part', verdict: 'also' },
  });
  assert.equal(foundNow(play), null);
  play = choose(BOOK, play, 3, 'p1c1');
  assert.deepEqual(play.screen, {
    kind: 'ask',
    ask: 'section',
    said: { ask: 'chapter', verdict: 'here' },
  });
  play = choose(BOOK, play, 3, section(1, 1, 1));
  assert.deepEqual(play.screen, { kind: 'place', ask: 'section', verdict: 'here' });
  // Not knowing the chapter at depth 3 shows the place at once.
  const unsure = choose(BOOK, choose(BOOK, begin(['w000']), 3, '1'), 3, null);
  assert.deepEqual(unsure.screen, { kind: 'place', ask: 'chapter', verdict: null });
  // Depth 2 stops at the chapter.
  const two = choose(BOOK, choose(BOOK, begin(['w007']), 2, '2'), 2, 'p2c1');
  assert.deepEqual(two.screen, { kind: 'place', ask: 'chapter', verdict: 'elsewhere' });

  // A round found again in the tab: its word, at the first question or at its card — and
  // nothing of what was chosen.
  assert.deepEqual(resume(['w003', 'w004'], 1, false, 2), {
    words: ['w003', 'w004'],
    at: 1,
    screen: { kind: 'ask', ask: 'part', said: null },
  });
  assert.deepEqual(resume(['w003', 'w004'], 1, true, 2).screen, {
    kind: 'place',
    ask: 'chapter',
    verdict: null,
  });
  assert.equal(resume(['w003'], 7, false, 1).at, 0);
  assert.deepEqual(resume([], 0, true, 1).screen, { kind: 'end' });
  assert.deepEqual(begin([]).screen, { kind: 'end' });

  // The hint: three parts, from the second depth on, for the first question only.
  assert.deepEqual(hintFor(BOOK, 'w000', 1, 'part'), []);
  assert.deepEqual(hintFor(BOOK, 'w000', 2, 'part'), ['1', '3', '6']);
  assert.deepEqual(hintFor(BOOK, 'w000', 3, 'chapter'), []);
  assert.deepEqual(hintFor(BOOK, 'w999', 3, 'part'), []);
});

// ---------------------------------------------------------------------------------------------
// What the game remembers
// ---------------------------------------------------------------------------------------------

const TAB: TabState = {
  corpus: 'c0ffee',
  seen: ['w000', 'w001', 'w002', 'w003'],
  depth: 1,
  turtle: 1,
  arcs: [4, 0, 0],
  round: { words: ['w003', 'w004', 'w005'], at: 1, shown: true },
  declined: false,
};

void test('what is written is read back, and only the declared fields are ever written', () => {
  assert.equal(STORAGE_KEY, 'cestecritla.jeu.v1');
  assert.deepEqual(parseTab(serialiseTab(TAB), BOOK), TAB);
  assert.deepEqual(parseKept(serialiseKept(keptPart(TAB)), BOOK), keptPart(TAB));
  assert.deepEqual(parseTab(serialiseTab(emptyTab('c0ffee')), BOOK), emptyTab('c0ffee'));

  // Field by field: the privacy page lists these names, and nothing else can be in the string.
  assert.deepEqual(Object.keys(JSON.parse(serialiseKept(keptPart(TAB))) as object), [
    ...KEPT_FIELDS,
  ]);
  assert.deepEqual(Object.keys(JSON.parse(serialiseTab(TAB)) as object), [...TAB_FIELDS]);
  assert.deepEqual(Object.keys((JSON.parse(serialiseTab(TAB)) as { round: object }).round), [
    'words',
    'at',
    'shown',
  ]);
  // What is kept on the phone is a subset of what the tab holds — and never the round.
  for (const field of KEPT_FIELDS) assert.ok((TAB_FIELDS as readonly string[]).includes(field));
  assert.ok(!(KEPT_FIELDS as readonly string[]).includes('round'));

  // A choice, an answer, a time, an identifier: a state that somehow carried one loses it on
  // the way through — there is no field to put it in.
  const dirty = {
    ...TAB,
    choice: '3',
    answers: ['here'],
    at: 1_700_000_000,
    uid: 'x',
    t: Date.now(),
  };
  const through = serialiseTab(parseTab(JSON.stringify(dirty), BOOK));
  assert.equal(through, serialiseTab(TAB));
  assert.doesNotMatch(through, /choice|answer|uid|"t"|17000/);
});

void test('anything that is not a game comes back as an empty one, never as a crash', () => {
  const empty = emptyTab('c0ffee');
  for (const raw of [null, '', 'x', '[]', '42', 'null', '"seen"', '{', '{"seen":"w000"}']) {
    assert.deepEqual(parseTab(raw, BOOK), empty, String(raw));
    assert.deepEqual(parseKept(raw, BOOK), emptyKept(), String(raw));
  }
  // A string far longer than any game is not read at all.
  assert.deepEqual(parseKept(`{"seen":["w000"],"pad":"${'x'.repeat(30_000)}"}`, BOOK), emptyKept());

  // Damaged fields are put back within bounds, one by one.
  const odd = parseKept(
    JSON.stringify({
      seen: ['w001', 'w001', 'w999', 7, 'w000', null],
      depth: 9,
      turtle: -1,
      arcs: [7, 2.5, '3'],
    }),
    BOOK,
  );
  assert.deepEqual(odd, { seen: ['w001', 'w000'], depth: 1, turtle: 0, arcs: [0, 0, 0] });
  assert.deepEqual(parseKept('{"arcs":[6,3]}', BOOK).arcs, [6, 3, 0]);

  // The round: unknown words leave it, a position out of the round goes back to its start,
  // and "shown" is true only when it is exactly that.
  const round = (value: unknown): TabState['round'] =>
    parseTab(JSON.stringify({ ...TAB, round: value }), BOOK).round;
  assert.equal(round({ words: ['w999'], at: 0, shown: false }), null);
  assert.equal(round('w003'), null);
  assert.deepEqual(round({ words: ['w003', 'w999', 'w004'], at: 5, shown: 'yes' }), {
    words: ['w003', 'w004'],
    at: 0,
    shown: false,
  });
  assert.deepEqual(round({ words: ['w000', 'w001', 'w002', 'w003'], at: 2, shown: true })?.words, [
    'w000',
    'w001',
    'w002',
  ]);
});

void test('another state of the book: the round is dropped, what she found stays', () => {
  const other = parseTab(serialiseTab({ ...TAB, corpus: 'decaf' }), BOOK);
  assert.equal(other.corpus, 'c0ffee');
  assert.equal(other.round, null);
  assert.deepEqual(keptPart(other), keptPart(TAB));
  // Words that no longer exist are forgotten; the depth and the turtle are not.
  const smaller: GameData = { ...BOOK, words: BOOK.words.slice(0, 2) };
  const fewer = parseTab(serialiseTab({ ...TAB, depth: 2, turtle: 2, arcs: [6, 1, 0] }), smaller);
  assert.deepEqual(fewer.seen, ['w000', 'w001']);
  assert.deepEqual([fewer.depth, fewer.turtle, fewer.arcs], [2, 2, [6, 1, 0]]);
  assert.equal(fewer.round, null);
  assert.equal(parseTab(serialiseTab({ ...TAB, declined: true }), BOOK).declined, true);
});

void test('two tabs that played apart become one game: the most of each, in any order', () => {
  const a: Kept = { seen: ['w000', 'w001', 'w002'], depth: 1, turtle: 1, arcs: [3, 0, 0] };
  const b: Kept = { seen: ['w002', 'w005', 'w004'], depth: 2, turtle: 2, arcs: [2, 1, 0] };
  const c: Kept = { seen: ['w008'], depth: 1, turtle: 0, arcs: [0, 0, 0] };
  const both = merge(a, b);
  assert.deepEqual(both, {
    seen: ['w000', 'w001', 'w002', 'w005', 'w004'],
    depth: 2,
    turtle: 2,
    arcs: [3, 1, 0],
  });
  // The same game whichever tab speaks first, however they are grouped, however often.
  const same = (x: Kept, y: Kept): void => {
    assert.deepEqual([...x.seen].sort(), [...y.seen].sort());
    assert.deepEqual([x.depth, x.turtle, x.arcs], [y.depth, y.turtle, y.arcs]);
  };
  same(merge(a, b), merge(b, a));
  same(merge(merge(a, b), c), merge(a, merge(b, c)));
  assert.deepEqual(merge(a, a), a);
  assert.deepEqual(merge(a, emptyKept()), a);
  // Never less than either: a merge cannot make her go back.
  for (const side of [a, b]) {
    assert.ok(both.depth >= side.depth && both.turtle >= side.turtle);
    for (const id of side.seen) assert.ok(both.seen.includes(id));
    side.arcs.forEach((arc, i) => {
      assert.ok((both.arcs[i] ?? 0) >= arc);
    });
  }
  // What a merge found is what the engine would have found: the depth follows the words.
  const merged = merge(
    { ...emptyKept(), seen: ['w000', 'w001', 'w002'] },
    { ...emptyKept(), seen: ['w003', 'w004', 'w005'] },
  );
  assert.equal(depthOf(BOOK, merged.seen), 2);
});

void test('a long word is set smaller rather than cut: fifteen letters and more', () => {
  assert.equal(LONG_WORD, 15);
  assert.equal(isLongWord('microprocesseurs'), true);
  assert.equal(isLongWord('assainissement'), false);
  // Letters are counted as a reader counts them, however the accents are encoded.
  const decomposed = 'bibliothe' + String.fromCodePoint(0x300) + 'ques';
  assert.equal(decomposed.length, 14);
  assert.equal(isLongWord(decomposed + 'ab'), true);
  assert.equal(isLongWord(decomposed + 'a'), false);
});
