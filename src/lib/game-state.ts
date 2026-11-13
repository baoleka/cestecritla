/**
 * What the game remembers, as text (D16.14; PLAN-JEU §5) — pure: it reads and writes strings,
 * and never touches a storage. src/scripts/game-store.ts decides where a string goes.
 *
 * Two shapes, and nothing else is ever written:
 *
 *   - the TAB (sessionStorage, from the first reveal): the version of the book, the words
 *     found, the depth, the turtle, the round under way, and "do not keep";
 *   - what is KEPT (localStorage, only after « Garder ta tortue »): the words found, the depth,
 *     the turtle.
 *
 * Never a choice, never an answer, never a time, never an identifier: the types below have no
 * field that could hold one, and `parse` rebuilds the object field by field — a string written
 * by anything else comes back as an empty game, or as what of it is a game.
 *
 * Nothing goes back: two tabs that played apart are merged by taking the most of each.
 */
import type { Depth, GameData } from './game-engine.js';
import { ARC_STEPS, type ArcProgress, type TurtleState } from './turtle.js';

/** One key, in both storages. The version is in its name: a new shape gets a new key. */
export const STORAGE_KEY = 'cestecritla.jeu.v1';

export interface Kept {
  /** Identifiers of the words found, in the order they were. */
  seen: string[];
  depth: Depth;
  turtle: TurtleState;
  arcs: ArcProgress;
}

/** The round under way: its words, which one is on screen, and whether its place is shown. */
export interface RoundState {
  words: string[];
  at: number;
  shown: boolean;
}

export interface TabState extends Kept {
  /** The state of the book the words were found in. */
  corpus: string;
  round: RoundState | null;
  /** « Ne pas garder » was chosen in this tab: the card is not shown again. */
  declined: boolean;
}

export const emptyKept = (): Kept => ({ seen: [], depth: 1, turtle: 0, arcs: [0, 0, 0] });
export const emptyTab = (corpus: string): TabState => ({
  ...emptyKept(),
  corpus,
  round: null,
  declined: false,
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A whole number within bounds, or the fallback: a damaged field never becomes a crash. */
function whole(value: unknown, low: number, high: number, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high
    ? value
    : fallback;
}

/** The identifiers that are words of this game, once each, in the order given. */
function knownIds(value: unknown, data: GameData, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(data.words.map((w) => w.id));
  const out: string[] = [];
  for (const id of value) {
    if (typeof id === 'string' && known.has(id) && !out.includes(id)) out.push(id);
    if (out.length === limit) break;
  }
  return out;
}

function keptOf(object: Record<string, unknown>, data: GameData): Kept {
  const arcs = Array.isArray(object['arcs']) ? (object['arcs'] as unknown[]) : [];
  return {
    seen: knownIds(object['seen'], data, data.words.length),
    depth: whole(object['depth'], 1, 3, 1) as Depth,
    turtle: whole(object['turtle'], 0, 4, 0) as TurtleState,
    arcs: [
      whole(arcs[0], 0, ARC_STEPS, 0),
      whole(arcs[1], 0, ARC_STEPS, 0),
      whole(arcs[2], 0, ARC_STEPS, 0),
    ],
  };
}

function json(raw: string | null): unknown {
  if (raw === null || raw.length > 20_000) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** What was kept on the phone; an empty game for anything that is not one. */
export function parseKept(raw: string | null, data: GameData): Kept {
  const object = json(raw);
  return isObject(object) ? keptOf(object, data) : emptyKept();
}

/**
 * What the tab holds. A round begun on another state of the book is dropped — its words may
 * no longer be where it says — but what was found, the depth and the turtle stay: she never
 * goes back.
 */
export function parseTab(raw: string | null, data: GameData): TabState {
  const object = json(raw);
  if (!isObject(object)) return emptyTab(data.corpus);
  const kept = keptOf(object, data);
  const declined = object['declined'] === true;
  const round = object['round'];
  if (object['corpus'] !== data.corpus || !isObject(round)) {
    return { ...kept, corpus: data.corpus, round: null, declined };
  }
  const words = knownIds(round['words'], data, 3);
  if (words.length === 0) return { ...kept, corpus: data.corpus, round: null, declined };
  return {
    ...kept,
    corpus: data.corpus,
    round: {
      words,
      at: whole(round['at'], 0, words.length - 1, 0),
      shown: round['shown'] === true,
    },
    declined,
  };
}

/** Field by field, in a fixed order: what is written is exactly what the page declares. */
export const serialiseKept = (state: Kept): string =>
  JSON.stringify({
    seen: state.seen,
    depth: state.depth,
    turtle: state.turtle,
    arcs: state.arcs,
  });

export const serialiseTab = (state: TabState): string =>
  JSON.stringify({
    corpus: state.corpus,
    seen: state.seen,
    depth: state.depth,
    turtle: state.turtle,
    arcs: state.arcs,
    round:
      state.round === null
        ? null
        : { words: state.round.words, at: state.round.at, shown: state.round.shown },
    declined: state.declined,
  });

/**
 * Two memories of the same game — two tabs, or a tab and the phone — as one: every word found
 * by either, the deeper depth, the turtle that has grown most. Taking the most of each is the
 * only merge that can never make her go back, whatever the order the tabs speak in.
 */
export function merge(a: Kept, b: Kept): Kept {
  return {
    seen: [...a.seen, ...b.seen.filter((id) => !a.seen.includes(id))],
    depth: Math.max(a.depth, b.depth) as Depth,
    turtle: Math.max(a.turtle, b.turtle) as TurtleState,
    arcs: [
      Math.max(a.arcs[0], b.arcs[0]),
      Math.max(a.arcs[1], b.arcs[1]),
      Math.max(a.arcs[2], b.arcs[2]),
    ],
  };
}

/** The part of a tab's state that may be kept on the phone. */
export const keptPart = (state: TabState): Kept => ({
  seen: state.seen,
  depth: state.depth,
  turtle: state.turtle,
  arcs: state.arcs,
});

/** Every field either shape can write, by name — what the privacy page lists, and its test. */
export const KEPT_FIELDS = ['seen', 'depth', 'turtle', 'arcs'] as const;
export const TAB_FIELDS = [
  'corpus',
  'seen',
  'depth',
  'turtle',
  'arcs',
  'round',
  'declined',
] as const;
