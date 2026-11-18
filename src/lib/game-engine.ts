/**
 * « Où est-ce écrit ? » — the rules of the game, pure (D16.10, D16.12; PLAN-JEU §4.1 to §4.3).
 * No page, no storage, no clock: handed the published data of the game and what has been found,
 * it says what to ask, what a choice means, and what the end of a round changes.
 *
 * Four things are decided here, so that no screen can decide them otherwise:
 *
 *   - a choice is never "wrong". The word is written where the game shows it ("here"), or the
 *     chosen place holds it too ("also"), or it is written elsewhere — and the page then says
 *     where, in the affirmative. Nothing here can produce a sentence about absence;
 *   - a level is a depth of the book — the part, then the chapter, then the section — and never
 *     a rank of the player. It opens with what has been FOUND, right choice or not;
 *   - a word is asked ONE question (D19.4): the deepest the game has reached. What stands above
 *     it — the part, then the chapter — is given, not asked: a round is three questions at every
 *     depth, and the deeper ones are asked of titles one can reason on;
 *   - the draw is the game's: the reading order of the list, never the player's results;
 *   - nothing goes back: a depth once open stays open, the turtle never shrinks.
 */
import { arcSteps, type ArcProgress, type TurtleState } from './turtle.js';

export interface GameSection {
  id: string;
  title: string;
}
export interface GameChapter {
  id: string;
  /** Its number within its part, as the book prints it. */
  number: number;
  title: string;
  sections: GameSection[];
}
export interface GamePart {
  /** 1 to 6. */
  number: number;
  title: string;
  chapters: GameChapter[];
}

export interface GameEntry {
  id: string;
  word: string;
  /** The section the game shows it in. */
  section: string;
  /** The official page of that section, and the text directive that lands on the measure. */
  url: string;
  fragment: string;
  /** Every section where a measure holds it, in the order of the book — its own included. */
  places: string[];
  /** Three parts the hint points at, the right one among them. */
  hint: number[];
  /**
   * The sentence written ahead for the measure the word is pinned to (D19.2) — OURS, written and
   * checked by an AI, never the book's. Absent where the build may show none
   * (src/lib/game-gists.ts): the card then says where, and gives the link, as before.
   */
  gist?: string;
}

/**
 * /data/jeu-<fingerprint>.json: everything the game needs — and of the book, nothing but its
 * titles and the words of the list. The sentences some builds add are ours.
 */
export interface GameData {
  corpus: string;
  /** What may be a tile: the parts, their chapters, their sections (rule 11 already applied). */
  parts: GamePart[];
  /** In the reading order of the game: the first round is the first three. */
  words: GameEntry[];
}

export type Depth = 1 | 2 | 3;
export type Ask = 'part' | 'chapter' | 'section';
/** Where a choice stands — and there is no fourth case. */
export type Verdict = 'here' | 'also' | 'elsewhere';

export const ROUND = 3;

/**
 * A word this long does not stand on one line at 320 px in the size the game shows a word in.
 * Left to the browser it is cut — « microproces-seurs », or with no hyphen at all where the
 * engine has no dictionary (measured on 13/11/2026 in three engines). A word of the programme is
 * shown whole: the page sets it one step smaller instead (`data-long`, src/styles/game.css).
 */
export const LONG_WORD = 15;
export const isLongWord = (word: string): boolean => word.normalize('NFC').length >= LONG_WORD;
const ASKS: readonly Ask[] = ['part', 'chapter', 'section'];

export interface Place {
  part: GamePart;
  chapter: GameChapter;
  section: GameSection;
}

/** Where a section is, among the tiles; null for a section that is not one. */
export function locate(data: GameData, sectionId: string): Place | null {
  for (const part of data.parts) {
    for (const chapter of part.chapters) {
      const section = chapter.sections.find((s) => s.id === sectionId);
      if (section !== undefined) return { part, chapter, section };
    }
  }
  return null;
}

export const entryOf = (data: GameData, wordId: string): GameEntry | null =>
  data.words.find((w) => w.id === wordId) ?? null;

/** The place the game shows a word in. */
export function placeOf(data: GameData, wordId: string): Place | null {
  const entry = entryOf(data, wordId);
  return entry === null ? null : locate(data, entry.section);
}

/** What the game holds in all: the parts and chapters where a word of the list is shown. */
export function playable(data: GameData): { parts: Set<number>; chapters: Set<string> } {
  const parts = new Set<number>();
  const chapters = new Set<string>();
  for (const word of data.words) {
    const place = locate(data, word.section);
    if (place === null) continue;
    parts.add(place.part.number);
    chapters.add(place.chapter.id);
  }
  return { parts, chapters };
}

export interface Found {
  words: number;
  parts: number;
  chapters: number;
}

/** What has been found: a word counts for the place the game showed it in. */
export function found(data: GameData, seen: Iterable<string>): Found {
  const ids = new Set(seen);
  const parts = new Set<number>();
  const chapters = new Set<string>();
  let words = 0;
  for (const word of data.words) {
    if (!ids.has(word.id)) continue;
    const place = locate(data, word.section);
    if (place === null) continue;
    words += 1;
    parts.add(place.part.number);
    chapters.add(place.chapter.id);
  }
  return { words, parts: parts.size, chapters: chapters.size };
}

/**
 * How deep the game asks, for what has been found: the chapter once a word has been found in
 * every part that has one, the section once in every chapter that has one. Thresholds are
 * counted on what is playable — never typed.
 */
export function depthOf(data: GameData, seen: Iterable<string>): Depth {
  const all = playable(data);
  const has = found(data, seen);
  if (all.parts.size === 0 || has.parts < all.parts.size) return 1;
  return has.chapters < all.chapters.size ? 2 : 3;
}

export interface TurtleProgress {
  state: TurtleState;
  arcs: ArcProgress;
}

/**
 * The turtle, for what has been found. One arc per depth: the parts, the chapters, the words.
 * An arc starts when the one before is whole, and is whole when nothing is left at its depth.
 */
export function turtleOf(data: GameData, seen: Iterable<string>): TurtleProgress {
  const all = playable(data);
  const has = found(data, seen);
  if (has.words === 0) return { state: 0, arcs: [0, 0, 0] };
  const parts = arcSteps(has.parts, all.parts.size);
  if (has.parts < all.parts.size) return { state: 1, arcs: [parts, 0, 0] };
  const chapters = Math.max(1, arcSteps(has.chapters, all.chapters.size));
  if (has.chapters < all.chapters.size) return { state: 2, arcs: [parts, chapters, 0] };
  const words = Math.max(1, arcSteps(has.words, data.words.length));
  return has.words < data.words.length
    ? { state: 3, arcs: [parts, chapters, words] }
    : { state: 4, arcs: [parts, chapters, words] };
}

/**
 * The next round: the words not yet found, in the reading order of the list; once everything
 * has been found, the list goes on from the word after `after`, round and round. The same list
 * and the same past always give the same round.
 */
export function draw(data: GameData, seen: Iterable<string>, after: string | null): string[] {
  const ids = new Set(seen);
  const size = Math.min(ROUND, data.words.length);
  const round = data.words.filter((w) => !ids.has(w.id)).map((w) => w.id);
  if (round.length >= size) return round.slice(0, size);
  const start = data.words.findIndex((w) => w.id === after) + 1;
  for (let i = 0; i < data.words.length && round.length < size; i += 1) {
    const word = data.words[(start + i) % data.words.length];
    if (word !== undefined && !round.includes(word.id)) round.push(word.id);
  }
  return round;
}

/** The three questions the game can ask, from the widest to the most precise. */
export const QUESTIONS: readonly Ask[] = ASKS;

/**
 * The one question asked of a word at a depth (D19.4): the part at the first, the chapter at the
 * second, the section at the third. Until 18 November 2026 a depth ADDED its question to the
 * ones before it — three, then six, then nine questions a round; it now replaces them.
 */
export const askAt = (depth: Depth): Ask => ASKS[depth - 1] ?? 'part';

/**
 * What the game gives above a question, as official titles in the order of the book: nothing
 * for the part, the part for the chapter, the part and the chapter for the section. Given, not
 * asked — so that the question below is one a reader can reason on.
 */
export function givenFor(data: GameData, wordId: string, ask: Ask): string[] {
  const place = placeOf(data, wordId);
  if (place === null || ask === 'part') return [];
  return ask === 'chapter' ? [place.part.title] : [place.part.title, place.chapter.title];
}

export interface Tile {
  /** The part number, or the identifier of the chapter or section. */
  id: string;
  title: string;
  /** The number the book prints for a part or a chapter; null for a section. */
  number: number | null;
}

/** The tiles of a question: the six parts, the chapters of its part, the sections of its chapter. */
export function tilesFor(data: GameData, wordId: string, ask: Ask): Tile[] {
  if (ask === 'part') {
    return data.parts.map((p) => ({ id: String(p.number), title: p.title, number: p.number }));
  }
  const place = placeOf(data, wordId);
  if (place === null) return [];
  if (ask === 'chapter') {
    return place.part.chapters.map((c) => ({ id: c.id, title: c.title, number: c.number }));
  }
  return place.chapter.sections.map((s) => ({ id: s.id, title: s.title, number: null }));
}

/** The tile of a place at the depth of a question. */
const tileOf = (place: Place, ask: Ask): string =>
  ask === 'part'
    ? String(place.part.number)
    : ask === 'chapter'
      ? place.chapter.id
      : place.section.id;

/** The tile where the game shows the word, for a question. */
export function rightTile(data: GameData, wordId: string, ask: Ask): string | null {
  const place = placeOf(data, wordId);
  return place === null ? null : tileOf(place, ask);
}

/**
 * What a chosen tile means. "also": the word is written there too, in another measure than the
 * one the game shows — the choice was not a mistake, and the page says so.
 */
export function judge(data: GameData, wordId: string, ask: Ask, tile: string): Verdict {
  const entry = entryOf(data, wordId);
  const place = placeOf(data, wordId);
  if (entry === null || place === null) return 'elsewhere';
  if (tileOf(place, ask) === tile) return 'here';
  for (const id of entry.places) {
    const other = locate(data, id);
    if (other !== null && tileOf(other, ask) === tile) return 'also';
  }
  return 'elsewhere';
}

/** The other parts where a word is written, by number, in the order of the book. */
export function otherParts(data: GameData, wordId: string): number[] {
  const entry = entryOf(data, wordId);
  const place = placeOf(data, wordId);
  if (entry === null || place === null) return [];
  const numbers = new Set<number>();
  for (const id of entry.places) {
    const other = locate(data, id);
    if (other !== null && other.part.number !== place.part.number) numbers.add(other.part.number);
  }
  return [...numbers].sort((a, b) => a - b);
}

export interface Standing extends TurtleProgress {
  depth: Depth;
}

export interface RoundEnd extends Standing {
  /** The depth that has just opened, if one has. */
  opened: Depth | null;
  /** She has passed from one state to the next. */
  passage: boolean;
}

/**
 * What the end of a round changes — the only moment anything does. Nothing goes back: a list
 * that lost words since (a new edition of the book) lowers neither the depth nor the turtle.
 */
export function endOfRound(data: GameData, before: Standing, seen: Iterable<string>): RoundEnd {
  const ids = [...seen];
  const now = turtleOf(data, ids);
  const depth = Math.max(before.depth, depthOf(data, ids)) as Depth;
  const state = Math.max(before.state, now.state) as TurtleState;
  const arcs: ArcProgress = [
    Math.max(before.arcs[0], now.arcs[0]),
    Math.max(before.arcs[1], now.arcs[1]),
    Math.max(before.arcs[2], now.arcs[2]),
  ];
  return {
    depth,
    state,
    arcs,
    opened: depth > before.depth ? depth : null,
    passage: state > before.state,
  };
}

/**
 * The tiles the turtle looks at when asked for a hint: three parts, the right one among them.
 * Offered whenever the part is asked — from the very first word (D19.7, which amends D16.13:
 * it used to wait for the second depth, where the part is no longer asked at all since D19.4).
 * It points; it never rules a tile out.
 */
export function hintFor(data: GameData, wordId: string, ask: Ask): string[] {
  const entry = entryOf(data, wordId);
  return entry !== null && ask === 'part' ? entry.hint.map(String) : [];
}

// ---------------------------------------------------------------------------------------------
// A round, step by step
// ---------------------------------------------------------------------------------------------

/**
 * What is on screen. A question; or the card of the place, which is where a word counts as
 * found; or the end of the round. `verdict` is what the choice meant — null when there was
 * none (« Je ne sais pas », or a round found again after the tab was left): the card then says
 * where the word is written, and nothing about a choice.
 */
export type Screen =
  | { kind: 'ask'; ask: Ask }
  | { kind: 'place'; ask: Ask; verdict: Verdict | null }
  | { kind: 'end' };

export interface Play {
  /** The words of the round, in order. */
  words: string[];
  /** Which one is on screen. */
  at: number;
  screen: Screen;
}

/** The question of a word, at the depth the game has reached. */
const question = (depth: Depth): Screen => ({ kind: 'ask', ask: askAt(depth) });

/** A round at its first question; a round with no word is over before it starts. */
export const begin = (words: readonly string[], depth: Depth): Play =>
  words.length === 0
    ? { words: [], at: 0, screen: { kind: 'end' } }
    : { words: [...words], at: 0, screen: question(depth) };

/**
 * A round found again in the tab: the word it had reached, at its question — or at its card, if
 * the place had already been shown. Nothing of what was chosen is known any more.
 */
export function resume(words: readonly string[], at: number, shown: boolean, depth: Depth): Play {
  const play = begin(words, depth);
  if (play.screen.kind === 'end') return play;
  const index = Number.isInteger(at) && at >= 0 && at < words.length ? at : 0;
  return {
    ...play,
    at: index,
    screen: shown ? { kind: 'place', ask: askAt(depth), verdict: null } : question(depth),
  };
}

/** The word on screen; null once the round is over. */
export const current = (play: Play): string | null =>
  play.screen.kind === 'end' ? null : (play.words[play.at] ?? null);

/**
 * A tile is chosen, or « Je ne sais pas » (null): either way the card of the place comes next —
 * one question a word (D19.4). Anywhere but on a question, nothing happens: a second tap
 * changes nothing.
 */
export function choose(data: GameData, play: Play, tile: string | null): Play {
  const word = current(play);
  if (word === null || play.screen.kind !== 'ask') return play;
  const { ask } = play.screen;
  const verdict = tile === null ? null : judge(data, word, ask, tile);
  return { ...play, screen: { kind: 'place', ask, verdict } };
}

/**
 * « Mot suivant »: from a card to the next word, or to the end of the round. The depth is the
 * round's: it changes at the end of a round and nowhere else (`endOfRound`).
 */
export function advance(play: Play, depth: Depth): Play {
  if (play.screen.kind !== 'place') return play;
  return play.at + 1 < play.words.length
    ? { ...play, at: play.at + 1, screen: question(depth) }
    : { ...play, screen: { kind: 'end' } };
}

/** A word is found when its place is shown — whatever was chosen, or nothing at all. */
export const foundNow = (play: Play): string | null =>
  play.screen.kind === 'place' ? current(play) : null;
