/**
 * The mascot, second generation, as numbers (D17.1 to D17.15; docs/discovery/PLAN-TORTUE.md) —
 * shared by the build, the game and the sheet the editor validates. Pure: no file, no page, no
 * clock. IN PREPARATION: nothing that is online imports this module (src/lib/turtle.ts is the
 * turtle that is served).
 *
 * Five states, the same thresholds as before (D17.1), and one name: « ta tortue » (D17.2).
 *
 *   0  the turtle                      3  the flamingo in flight, above water
 *   1  the turtle, surfing             4  the flamingo flying under a turtle of stars
 *   2  the flamingo, standing
 *
 * Her three arcs follow her: on her shell, then on her wing — the same continuous strokes, the
 * same six steps, the same field in what the game remembers (src/lib/turtle.ts).
 *
 * What a script may write on the drawing is exactly what `MascotLook` holds, and nothing else.
 */
import { arcAttributes, type ArcProgress, type TurtleState } from './turtle.js';

export type { ArcProgress, TurtleState };

/** At rest; touched (the turtle raises her head); looking at the tiles (a hint was asked). */
export type MascotPose = 'rest' | 'up' | 'look';

/**
 * The colour the player gave her flamingo (D17.3): 0 nothing chosen yet, 1 to 6 the colour of a
 * part of the book, 7 « sans couleur », chosen on purpose. 0 and 7 both leave her pale.
 */
export type MascotTint = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A sign that a change is near (D17.5): an attitude of hers, never a quantity. */
export type MascotSign = 0 | 1 | 2;

/** Everything that can be seen of her at one moment. */
export interface MascotLook {
  state: TurtleState;
  arcs: ArcProgress;
  pose: MascotPose;
  tint: MascotTint;
  sign: MascotSign;
  /** The one accent, on a detail of her scene: shown when she has just changed state. */
  passage: boolean;
}

/** What each state is, in the words the sheet and her « parcours » use. */
export const FORMS = ['turtle', 'surf', 'flamingo', 'flight', 'sky'] as const;
export type MascotForm = (typeof FORMS)[number];
export const formOf = (state: TurtleState): MascotForm => FORMS[state];

/** The arcs of a state as the sheet shows it: the least each state can have. */
export const STATE_ARCS: Readonly<Record<TurtleState, ArcProgress>> = {
  0: [0, 0, 0],
  1: [1, 0, 0],
  2: [6, 1, 0],
  3: [6, 6, 1],
  4: [6, 6, 6],
};

/** From this step of the arc that is growing, a change is near. */
export const SIGN_NEAR = 4;
export const SIGN_NEARER = 5;

/**
 * The sign she shows for what has been found. Read from the arc that is growing in her state —
 * the chapters while she stands, the words while she flies — and from nothing else: no field
 * of its own is ever stored.
 *
 *   state 2, second arc at four steps or more  →  her wings come ajar
 *   state 3, third arc at four steps           →  she looks up
 *   state 3, third arc at five steps           →  she looks up, and a first star is there
 */
export function signOf(state: TurtleState, arcs: ArcProgress): MascotSign {
  if (state === 2) return arcs[1] >= SIGN_NEAR ? 1 : 0;
  if (state === 3) return arcs[2] >= SIGN_NEARER ? 2 : arcs[2] >= SIGN_NEAR ? 1 : 0;
  return 0;
}

/** A tint as it may be written: anything that is not a whole number from 0 to 7 is 0. */
export function tintOf(value: unknown): MascotTint {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 7
    ? (value as MascotTint)
    : 0;
}

/** A look by what is said of it: a state, and whatever differs from that state at rest. */
export type LookOptions = Partial<MascotLook> & Pick<MascotLook, 'state'>;

/** The whole look: the arcs a state has at least, the sign those arcs give, pale, at rest. */
export function lookOf(options: LookOptions): MascotLook {
  const arcs = options.arcs ?? STATE_ARCS[options.state];
  return {
    state: options.state,
    arcs,
    pose: options.pose ?? 'rest',
    tint: options.tint ?? 0,
    sign: options.sign ?? signOf(options.state, arcs),
    passage: options.passage ?? false,
  };
}

/**
 * The drawing with a look written in — as markup, for a page built without script and for the
 * sheet. Nothing but attributes changes: the paths are the file's. She has her three arcs twice
 * (on the shell, on the wing): both sets are written.
 */
export function mascotMarkup(svg: string, options: LookOptions): string {
  const look = lookOf(options);
  let out = svg
    .replace(/data-state="\d"/, () => `data-state="${String(look.state)}"`)
    .replace(/data-pose="[a-z]+"/, () => `data-pose="${look.pose}"`)
    .replace(/data-tint="\d"/, () => `data-tint="${String(look.tint)}"`)
    .replace(/data-sign="\d"/, () => `data-sign="${String(look.sign)}"`);
  if (look.passage) out = out.replace('data-pose=', () => 'data-passage="" data-pose=');
  look.arcs.forEach((steps, index) => {
    const { dasharray, dashoffset } = arcAttributes(steps);
    out = out.replace(
      new RegExp(
        `(class="m-arc m-arc-${String(index + 1)}"[^>]*?) stroke-dasharray="[^"]*" stroke-dashoffset="[^"]*"`,
        'g',
      ),
      (_, before: string) =>
        `${before} stroke-dasharray="${dasharray}" stroke-dashoffset="${dashoffset}"`,
    );
  });
  return out;
}

/** What `applyMascotLook` needs of a drawing in a page: an element, or anything like one. */
export interface MascotDrawing {
  setAttribute(name: string, value: string): void;
  toggleAttribute(name: string, force?: boolean): boolean;
  querySelectorAll(selector: string): Iterable<{ setAttribute(name: string, value: string): void }>;
}

/** Writes a look on a drawing already in the page. Attributes only: nothing here is a style. */
export function applyMascotLook(drawing: MascotDrawing, look: MascotLook): void {
  drawing.setAttribute('data-state', String(look.state));
  drawing.setAttribute('data-pose', look.pose);
  drawing.setAttribute('data-tint', String(look.tint));
  drawing.setAttribute('data-sign', String(look.sign));
  drawing.toggleAttribute('data-passage', look.passage);
  look.arcs.forEach((steps, index) => {
    const { dasharray, dashoffset } = arcAttributes(steps);
    for (const arc of drawing.querySelectorAll(`.m-arc-${String(index + 1)}`)) {
      arc.setAttribute('stroke-dasharray', dasharray);
      arc.setAttribute('stroke-dashoffset', dashoffset);
    }
  });
}

/**
 * What is drawn in each state, at rest, with every arc grown: the shapes one can see, by their
 * class. The stylesheet decides it (src/styles/mascot2.css); this list is what the sheet prints
 * and what scripts/mascot2-render.ts checks against three browsers — so that « at most eighteen
 * shapes in a state » (D17.13) is a count somebody made, not a number somebody typed.
 */
export const SHAPES_SEEN: Readonly<Record<TurtleState, readonly string[]>> = {
  0: [
    'm-tail',
    'm-shell',
    'm-arc',
    'm-arc',
    'm-arc',
    'm-belly',
    'm-foot',
    'm-foot',
    'm-skull',
    'm-eye',
  ],
  1: [
    ...['m-swell', 'm-crest', 'm-plank', 'm-fin'],
    ...[
      'm-tail',
      'm-shell',
      'm-arc',
      'm-arc',
      'm-arc',
      'm-belly',
      'm-foot',
      'm-foot',
      'm-skull',
      'm-eye',
    ],
  ],
  2: [
    ...['m-ring', 'm-leg-fold', 'm-leg', 'm-body', 'm-neck', 'm-neck-in'],
    ...['m-feather', 'm-arc', 'm-arc', 'm-arc', 'm-beak', 'm-tip', 'm-crown', 'm-pupil'],
  ],
  3: [
    ...['m-water', 'm-mirror', 'm-far', 'm-legs-fly', 'm-body', 'm-neck', 'm-neck-in'],
    ...['m-feather', 'm-arc', 'm-arc', 'm-arc', 'm-beak', 'm-tip', 'm-crown', 'm-pupil'],
  ],
  4: [
    ...['m-dusk', 'm-lines', ...Array.from({ length: 9 }, () => 'm-star')],
    ...['m-water', 'm-mirror', 'm-far', 'm-legs-fly', 'm-body', 'm-neck', 'm-neck-in'],
    ...['m-feather', 'm-arc', 'm-arc', 'm-arc', 'm-beak', 'm-tip', 'm-crown', 'm-pupil'],
  ],
};

/** The ceilings of D17.13 that are about the drawing. */
export const MAX_SHAPES_SEEN: Readonly<Record<TurtleState, number>> = {
  0: 18,
  1: 18,
  2: 18,
  3: 18,
  4: 30,
};
export const MAX_SHAPES_IN_FILE = 72;
export const MAX_DRAWING_BYTES = 3 * 1024;
export const MAX_STYLESHEET_BYTES = 6 * 1024;
export const MAX_BOTH_BYTES = 9 * 1024;
