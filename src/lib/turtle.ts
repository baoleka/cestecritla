/**
 * Her arcs, as numbers (D16.12) — shared by the game, its memory and her drawing
 * (src/lib/mascot2.ts). Pure: no file, no page, no clock.
 *
 * What is left of the module of the first generation of the mascot (D16.11 to D16.13): its
 * drawing, its poses and its frames were removed with that generation (lot F of
 * docs/discovery/PLAN-TORTUE.md). The arcs and the states stay: the second generation grows the
 * same three arcs, on her shell and then on her wing, in the same six steps.
 *
 * Her shell carries three arcs. Each grows from the crown outwards, in six steps, and is drawn
 * as ONE continuous stroke: what has grown shows, what has not is simply not there. No dash,
 * no cell, no outline of the part still missing — nothing on her says how much is left
 * (rule 4 of 07-mecaniques §7.11: never a denominator on something personal).
 *
 * She changes with what has been found, never with a right or a wrong choice, and never goes
 * back. She does not move by herself: every change below answers a gesture of the player.
 */

/** Steps an arc grows in: one per part of the book. */
export const ARC_STEPS = 6;

/** Her five states (D17.1): turtle, surfing, flamingo, in flight, under a turtle of stars. */
export type TurtleState = 0 | 1 | 2 | 3 | 4;

/** How far each of the three arcs has grown, from 0 to `ARC_STEPS`. */
export type ArcProgress = readonly [number, number, number];

/**
 * The two attributes that draw an arc grown `steps` of six, centred on the crown.
 * The path runs from one foot of the dome to the other with `pathLength="6"`: a single dash of
 * `steps`, pushed forward by half of what is missing, sits astride the top.
 */
export function arcAttributes(steps: number): { dasharray: string; dashoffset: string } {
  const grown = Math.max(0, Math.min(ARC_STEPS, Math.trunc(steps)));
  return {
    dasharray: `${String(grown)} ${String(ARC_STEPS)}`,
    dashoffset: String(-(ARC_STEPS - grown) / 2),
  };
}

/**
 * The steps an arc shows for what has been found at its depth, out of what there is to find.
 * Six things or fewer: one step each, and the arc closes with the last (six parts, six steps).
 * More: the first step as soon as the arc has started, the sixth only when nothing is left, and
 * four in between — so that a long depth never looks like a plateau.
 */
export function arcSteps(found: number, total: number): number {
  if (total <= 0 || found <= 0) return 0;
  if (found >= total) return ARC_STEPS;
  if (total <= ARC_STEPS) return found;
  return Math.min(ARC_STEPS - 1, 1 + Math.floor(((ARC_STEPS - 1) * found) / total));
}
