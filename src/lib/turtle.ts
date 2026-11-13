/**
 * The turtle, as numbers (D16.12, D16.13) — shared by the game, the build and the sheet the
 * editor validates. Pure: no file, no page, no clock.
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
export const ARCS = 3;

export type TurtleState = 0 | 1 | 2 | 3 | 4;
/** At rest; head raised (she has been touched); looking down at the tiles (a hint was asked). */
export type TurtlePose = 'rest' | 'up' | 'look';

/** How far each of the three arcs has grown, from 0 to `ARC_STEPS`. */
export type ArcProgress = readonly [number, number, number];

/** Everything that can be seen of her at one moment. */
export interface TurtleLook {
  state: TurtleState;
  arcs: ArcProgress;
  pose: TurtlePose;
  /** The one accent: shown when she has just passed from one state to the next. */
  passage: boolean;
}

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

/** The arcs of a state as the sheet shows it: the least each state can have. */
export const STATE_ARCS: Readonly<Record<TurtleState, ArcProgress>> = {
  0: [0, 0, 0],
  1: [1, 0, 0],
  2: [6, 1, 0],
  3: [6, 6, 1],
  4: [6, 6, 6],
};

/**
 * The drawing with a look written in — as markup, for a page built without script and for the
 * sheet. Nothing but attributes changes: the paths are the file's.
 */
export function turtleMarkup(
  svg: string,
  options: { state: TurtleState; arcs?: ArcProgress; pose?: TurtlePose; passage?: boolean },
): string {
  const arcs = options.arcs ?? STATE_ARCS[options.state];
  let out = svg
    .replace(/data-state="\d"/, () => `data-state="${String(options.state)}"`)
    .replace(/data-pose="[a-z]+"/, () => `data-pose="${options.pose ?? 'rest'}"`);
  if (options.passage === true) out = out.replace('data-pose=', () => 'data-passage="" data-pose=');
  arcs.forEach((steps, index) => {
    const { dasharray, dashoffset } = arcAttributes(steps);
    // The file writes every arc as not grown: the same two attributes, replaced where they are.
    out = out.replace(
      new RegExp(
        `(class="t-arc t-arc-${String(index + 1)}"[^>]*?) stroke-dasharray="[^"]*" stroke-dashoffset="[^"]*"`,
      ),
      (_, before: string) =>
        `${before} stroke-dasharray="${dasharray}" stroke-dashoffset="${dashoffset}"`,
    );
  });
  return out;
}

/** What `applyLook` needs of a drawing in a page: an element, or anything that behaves like one. */
export interface Drawing {
  setAttribute(name: string, value: string): void;
  toggleAttribute(name: string, force?: boolean): boolean;
  querySelector(selector: string): { setAttribute(name: string, value: string): void } | null;
}

/** Writes a look on a drawing already in the page. Attributes only: nothing here is a style. */
export function applyLook(drawing: Drawing, look: TurtleLook): void {
  drawing.setAttribute('data-state', String(look.state));
  drawing.setAttribute('data-pose', look.pose);
  drawing.toggleAttribute('data-passage', look.passage);
  look.arcs.forEach((steps, index) => {
    const { dasharray, dashoffset } = arcAttributes(steps);
    const arc = drawing.querySelector(`.t-arc-${String(index + 1)}`);
    arc?.setAttribute('stroke-dasharray', dasharray);
    arc?.setAttribute('stroke-dashoffset', dashoffset);
  });
}

// ---------------------------------------------------------------------------------------------
// Movement (D16.13): a gesture is at most 900 ms in segments of at most 320 ms; an evolution at
// most 1 600 ms; she never moves alone; with reduced motion nothing starts.
// ---------------------------------------------------------------------------------------------

/** The longest a single transition of hers may last: the slow token (design/tokens.json). */
export const SEGMENT_MS = 320;
export const GESTURE_MAX_MS = 900;
export const EVOLUTION_MAX_MS = 1600;

/** A look, and when to give it to her, in milliseconds after the gesture that asked for it. */
export interface TurtleFrame extends TurtleLook {
  at: number;
}

/** Once she has grown, the arc she has earned is drawn; then the accent marks the passage. */
export const EVOLUTION_ARCS_AT = 360;
export const EVOLUTION_ACCENT_AT = 520;

/**
 * From what she was to what she is at the end of a round, as frames.
 * A new state is a passage: she takes her new size and carriage first, then the arcs, then the
 * accent. Arcs alone change at once, with no movement. She never goes back: asked to, she stays.
 */
export function evolution(
  from: Pick<TurtleLook, 'state' | 'arcs'>,
  to: Pick<TurtleLook, 'state' | 'arcs'>,
): TurtleFrame[] {
  if (to.state < from.state) {
    return [{ at: 0, state: from.state, arcs: from.arcs, pose: 'rest', passage: false }];
  }
  if (to.state === from.state) {
    return [{ at: 0, state: to.state, arcs: to.arcs, pose: 'rest', passage: false }];
  }
  return [
    { at: 0, state: to.state, arcs: from.arcs, pose: 'rest', passage: false },
    { at: EVOLUTION_ARCS_AT, state: to.state, arcs: to.arcs, pose: 'rest', passage: false },
    { at: EVOLUTION_ACCENT_AT, state: to.state, arcs: to.arcs, pose: 'rest', passage: true },
  ];
}

/** How long a list of frames keeps her moving, the last transition included. */
export function framesDuration(frames: readonly TurtleFrame[]): number {
  const last = frames.at(-1);
  return last === undefined || frames.length === 1 ? 0 : last.at + SEGMENT_MS;
}

/**
 * The frames as they are played when the reader asked for less motion: the last look, at once.
 * What she became is information and is always shown; how she got there is not played.
 */
export function withoutMotion(frames: readonly TurtleFrame[]): TurtleFrame[] {
  const last = frames.at(-1);
  return last === undefined ? [] : [{ ...last, at: 0 }];
}
