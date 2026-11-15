/**
 * What the game remembers once the mascot is of the second generation (D17.3, D17.14;
 * docs/discovery/PLAN-TORTUE.md §9) — pure, like src/lib/game-state.ts, which it reads through
 * and never changes. IN PREPARATION: nothing that is served imports this module.
 *
 * ONE field more, and one only: `tint`, the colour the player gave her flamingo — a whole
 * number from 1 to 7 (1 to 6: a colour, one per part of the book; 7: « sans couleur », chosen
 * on purpose). Never a choice of the game, never an answer, never a time.
 *
 * The same key, in both storages (`STORAGE_KEY`): nobody loses their turtle.
 *
 *   - A string written by the first generation has no `tint`: it reads back as it was, with no
 *     colour chosen.
 *   - While no colour is chosen, what this module writes is, byte for byte, what the first
 *     generation writes: the field exists only once there is a colour to keep.
 *   - A string written here and read by the first generation — after a step back — loses the
 *     colour and nothing else: that reader takes the fields it knows, one by one.
 *
 * Nothing goes back: progress is merged as before, by taking the most of each. A colour is not
 * progress, and has no "most": the last gesture wins — see `fromPhone` and `ontoPhone`.
 */
import type { GameData } from './game-engine.js';
import {
  KEPT_FIELDS,
  STORAGE_KEY,
  TAB_FIELDS,
  keptPart,
  merge,
  parseKept,
  parseTab,
  serialiseKept,
  serialiseTab,
  type Kept,
  type TabState,
} from './game-state.js';
import { tintOf, type MascotTint } from './mascot2.js';

export { STORAGE_KEY };

export interface Kept2 extends Kept {
  /** 0: no colour chosen — and then nothing is written for it. */
  tint: MascotTint;
}
export interface TabState2 extends TabState {
  tint: MascotTint;
}

/** The colour a stored string holds: 0 for anything that is not one. */
function tintIn(raw: string | null): MascotTint {
  if (raw === null || raw.length > 20_000) return 0;
  try {
    const value = JSON.parse(raw) as unknown;
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? tintOf((value as Record<string, unknown>)['tint'])
      : 0;
  } catch {
    return 0;
  }
}

/** What was kept on the phone, by either generation; an empty game for anything else. */
export const parseKept2 = (raw: string | null, data: GameData): Kept2 => ({
  ...parseKept(raw, data),
  tint: tintIn(raw),
});

/** What the tab holds, written by either generation. */
export const parseTab2 = (raw: string | null, data: GameData): TabState2 => ({
  ...parseTab(raw, data),
  tint: tintIn(raw),
});

/** The first generation's string, and her colour after it when she has one. */
const withTint = (written: string, tint: MascotTint): string =>
  tint === 0 ? written : `${written.slice(0, -1)},"tint":${String(tint)}}`;

export const serialiseKept2 = (state: Kept2): string => withTint(serialiseKept(state), state.tint);
export const serialiseTab2 = (state: TabState2): string =>
  withTint(serialiseTab(state), state.tint);

/** The part of a tab's state that may be kept on the phone. */
export const keptPart2 = (state: TabState2): Kept2 => ({ ...keptPart(state), tint: state.tint });

/**
 * A page that opens, or a round that ends, on a phone that keeps her: what the phone holds is
 * joined to what this tab holds. Progress: the most of each, as ever. Her colour: the phone's,
 * if it has one — every gesture that gave her a colour, in any tab, wrote it there, so it is the
 * last one; this tab's own is older, or the same.
 */
export const fromPhone = (tab: Kept2, phone: Kept2): Kept2 => ({
  ...merge(tab, phone),
  tint: phone.tint !== 0 ? phone.tint : tab.tint,
});

/**
 * « Garder ta tortue », or a colour just chosen: a gesture made in this tab. Progress: the most
 * of each. Her colour: this tab's, if it has one — the gesture is the last one.
 */
export const ontoPhone = (tab: Kept2, phone: Kept2): Kept2 => ({
  ...merge(tab, phone),
  tint: tab.tint !== 0 ? tab.tint : phone.tint,
});

/** Every field either shape can write, by name — what the privacy page lists, and its test. */
export const KEPT_FIELDS2 = [...KEPT_FIELDS, 'tint'] as const;
export const TAB_FIELDS2 = [...TAB_FIELDS, 'tint'] as const;
