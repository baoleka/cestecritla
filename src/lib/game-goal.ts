/**
 * What the game says of her when a round ends, second generation (D17.5, D17.23;
 * docs/discovery/PLAN-TORTUE.md §7) — pure.
 *
 * Her goal is said in words, never in numbers: what will make her change — or, when it is true,
 * that the next round will. The game can say that last thing exactly, and to everyone: the draw
 * is the game's (the reading order of the list, the same for all), and a word counts as found
 * whatever tile was chosen. Nothing here reads a choice.
 *
 * It returns the NAME of a sentence, never the sentence: the words are the editor's
 * (design/strings.json, `turtle.goal.*` and `turtle.passage.*`), and the page writes them.
 */
import { draw, endOfRound, type GameData, type RoundEnd, type Standing } from './game-engine.js';
import type { TurtleState } from './turtle.js';

/**
 * True when the round after this one makes her pass to her next state.
 * `seen`: every word found so far; `after`: the last word of the round just played (where the
 * list goes on from, once everything has been found).
 */
export function nextRoundChangesHer(
  data: GameData,
  standing: Standing,
  seen: readonly string[],
  after: string | null,
): boolean {
  const round = draw(data, seen, after);
  const then = [...seen, ...round.filter((id) => !seen.includes(id))];
  return endOfRound(data, standing, then).passage;
}

/** The sentences that say her goal, by name. */
export type GoalKey = 'start' | 'parts' | 'chapters' | 'words' | 'done' | 'next' | 'next_again';

/** What will make her change, state by state — said when nothing else is truer. */
export const GOAL_OF_STATE: Readonly<Record<TurtleState, GoalKey>> = {
  0: 'start',
  1: 'parts',
  2: 'chapters',
  3: 'words',
  4: 'done',
};

/** What is said of her under the title of a round that has ended. */
export interface HerLine {
  /** The state she has just passed to — its sentence is said first — or null. */
  passage: 1 | 2 | 3 | 4 | null;
  /** The sentence of her goal that follows it, or stands alone; null when there is none. */
  goal: GoalKey | null;
}

/**
 * One sentence about her at the end of a round, two at most:
 *
 *   - she has just changed: the sentence of that passage, and « à la prochaine manche, elle
 *     change encore » when that is true;
 *   - she has not: « à la prochaine manche, elle change » when that is true, and otherwise what
 *     will make her change.
 */
export function lineAtRoundEnd(
  end: Pick<RoundEnd, 'state' | 'passage'>,
  changesNext: boolean,
): HerLine {
  if (end.passage && end.state !== 0) {
    return { passage: end.state, goal: changesNext ? 'next_again' : null };
  }
  return { passage: null, goal: changesNext ? 'next' : GOAL_OF_STATE[end.state] };
}

/** Before a word is found, and then only: the sentence that says she changes at all. */
export const lineAtStart = (state: TurtleState): GoalKey | null => (state === 0 ? 'start' : null);
