/**
 * « Tu te souviens ? » — which words the end of a round offers to see again (D19.3; lot 6 of
 * docs/discovery/PLAN-JEU-DABORD.md). Pure: the list of the game, what has been found, the round
 * just played. No page, no storage, no clock — and no answer: none is ever kept (D16.14).
 *
 * Why it exists. Reading a card once teaches little; trying to recall it before reading it
 * again is what makes it stay (the « testing effect »), and the longer the wait before that
 * second look, within reason, the better it holds (« spacing »). So the end of a round offers
 * two words, each a card to open again:
 *
 *   - `fresh`: the first word of the round that has just ended — two cards ago, the shortest
 *     wait a round allows;
 *   - `old`: a word of an earlier round, whose distance GROWS as the game goes on. Its place in
 *     the earlier words moves on by two at each round while the game moves on by three, so the
 *     wait is one round at the second round and six at the last.
 *
 * It is a card one opens, not a question with tiles: nothing to choose among, so no decoy
 * (D16.10), no verdict, and nothing about it to write anywhere. It never stands between a
 * player and the next round — the page shows it and does not wait for it.
 *
 * What it reads is the ORDER OF THE LIST, never the order things were found in: two tabs that
 * merged, a phone that kept a game, a link followed to a word — all give the same two words
 * for the same round, to everyone. « The same words for everybody » holds here too.
 *
 * Learning note — a schedule without a memory. Spaced-repetition tools keep, for each card, a
 * date and a score. This game may keep neither (no timestamp, no answer). What it does keep is
 * which words were found; and since the list is read in one fixed order, « how long ago » can
 * be read off positions in that list alone. The schedule is then a pure function of two sets
 * and a list — testable without a browser, and the same on every phone.
 */
import { ROUND, type GameData } from './game-engine.js';

export interface Recall {
  /** The first word of the round just played, or null for a round with no word. */
  fresh: string | null;
  /** A word found in an earlier round, or null while there is none. */
  old: string | null;
}

/**
 * The words to offer again at the end of `round`, given everything found so far (the round's
 * own words included or not: they are set aside either way).
 */
export function recallFor(
  data: GameData,
  seen: Iterable<string>,
  round: readonly string[],
): Recall {
  const listed = data.words.map((word) => word.id);
  const played = round.filter((id) => listed.includes(id));
  const fresh = played[0] ?? null;
  if (fresh === null) return { fresh: null, old: null };
  const found = new Set(seen);
  // Earlier: found, of the list, and not of this round — read in the order of the list.
  const earlier = listed.filter((id) => found.has(id) && !played.includes(id));
  if (earlier.length === 0) return { fresh, old: null };
  // The round this is, by where its first word stands in the list: the first, the second…
  const number = Math.floor(listed.indexOf(fresh) / ROUND);
  // Two words further at each round, starting from the first word of the list at the second
  // round. Read round and round: once everything has been found the game goes on, and so
  // does this.
  const at = (2 * number + earlier.length - 2) % earlier.length;
  return { fresh, old: earlier[(at + earlier.length) % earlier.length] ?? null };
}
