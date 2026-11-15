/**
 * The mascot, second generation, as numbers (D17.1 to D17.17; docs/discovery/PLAN-TORTUE.md) —
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

/**
 * At rest; head raised; looking at the tiles (a hint was asked); her figure (she was touched);
 * the small move she makes for a word found.
 */
export type MascotPose = 'rest' | 'up' | 'look' | 'trick' | 'pulse';

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
  removeAttribute(name: string): void;
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

// ---------------------------------------------------------------------------------------------
// Movement (D17.7, D17.8). She never moves alone: everything below answers a gesture — a round
// that ends, a touch, a word found, « Revoir ». A gesture is 900 ms at most; an evolution 4,5 s
// at most, in beats of 900 ms at most; nothing loops; with reduced motion nothing starts.
//
// The choreography is data: what is played, in what order and for how long is decided here, and
// can be tested without a browser. The stylesheet (src/styles/mascot2.css) only knows what each
// beat holds back of the state she is taking.
// ---------------------------------------------------------------------------------------------

export const GESTURE_MAX_MS = 900;
export const BEAT_MAX_MS = 900;
export const EVOLUTION_MAX_MS = 4500;
/** Above this, a movement must be pausable (WCAG 2.2.2): nothing of hers ever gets there. */
export const MOVING_LIMIT_MS = 5000;

/** One beat of an evolution: a name the stylesheet knows, and how long it lasts. */
export interface Beat {
  name: string;
  lasts: number;
  /** She takes her new state when this beat starts — one beat of each evolution, exactly. */
  flips?: true;
  pose?: MascotPose;
  /** The accent of the passage shows from this beat on. */
  accent?: true;
}

/** How every round ends: the three finds are there, then they come to her. */
export const FINDS: readonly Beat[] = [
  { name: 'in', lasts: 200 },
  { name: 'to', lasts: 320 },
];

/** The four passages, by the states they join. */
export const PASSAGES = ['01', '12', '23', '34'] as const;
export type Passage = (typeof PASSAGES)[number];

/**
 * The four evolutions, beat by beat, after the finds have come to her
 * (docs/discovery/PLAN-TORTUE.md §5 says what is seen in each).
 */
export const EVOLUTIONS: Readonly<Record<Passage, readonly Beat[]>> = {
  // The line of a wave writes itself; her board slides under her; the wave rises; foam.
  '01': [
    { name: 'wave', lasts: 640, flips: true },
    { name: 'board', lasts: 480 },
    { name: 'rise', lasts: 640 },
    { name: 'foam', lasts: 700, accent: true },
  ],
  // The water closes over her; a calm; her neck writes itself out of it; the water falls back
  // and uncovers her; she folds a leg; she settles.
  '12': [
    { name: 'cover', lasts: 480 },
    { name: 'under', lasts: 240, flips: true },
    { name: 'neck', lasts: 800 },
    { name: 'shore', lasts: 700 },
    { name: 'stand', lasts: 500 },
    { name: 'rest', lasts: 400, accent: true },
  ],
  // She runs on the water; her wings open; she lifts; two slower beats.
  '23': [
    { name: 'run', lasts: 900 },
    { name: 'wings', lasts: 600 },
    { name: 'lift', lasts: 800, flips: true },
    { name: 'glide', lasts: 700, accent: true },
  ],
  // The evening sky; her stars, three beats of them; the line that joins them; she passes under.
  '34': [
    { name: 'dusk', lasts: 700, flips: true },
    { name: 'stars-1', lasts: 720 },
    { name: 'stars-2', lasts: 720 },
    { name: 'stars-3', lasts: 720 },
    { name: 'lines', lasts: 640 },
    { name: 'pass', lasts: 400, accent: true },
  ],
};

/** The passage that leads to a state: `null` for the turtle she starts as. */
export function passageTo(state: TurtleState): Passage | null {
  return state === 0 ? null : (PASSAGES[state - 1] ?? null);
}

/** How long an evolution lasts, the finds included. */
export function evolutionLasts(passage: Passage): number {
  return [...FINDS, ...EVOLUTIONS[passage]].reduce((sum, beat) => sum + beat.lasts, 0);
}

/** A look, when to give it to her after the gesture that asked for it, and the beat it is. */
export interface MascotFrame extends MascotLook {
  at: number;
  /** `<passage>-<beat>` during an evolution, `end-<beat>` while finds come to her; else `null`. */
  phase: string | null;
}

/** What an evolution is told of her: the rest is hers to decide. */
export type Standing = Pick<MascotLook, 'state' | 'arcs' | 'tint'>;

const still = (look: Standing, more?: Partial<MascotLook>): MascotLook =>
  lookOf({ state: look.state, arcs: look.arcs, tint: look.tint, ...more });

/**
 * From what she was to what she is at the end of a round, as frames.
 *
 * The finds come to her, and her arc grows as they reach her: that is every end of round. When
 * she passes to the next state, the evolution follows, and the accent marks the passage. She
 * never goes back: asked to, she stays. A leap of several states — a list of words that changed
 * between two visits — is not played: the final look, at once.
 */
export function evolution(from: Standing, to: Standing): MascotFrame[] {
  if (to.state < from.state) return [{ ...still(from), at: 0, phase: null }];
  if (to.state > from.state + 1) return [{ ...still(to), at: 0, phase: null }];
  const passage = to.state === from.state ? null : passageTo(to.state);
  const frames: MascotFrame[] = [];
  let at = 0;
  for (const beat of FINDS) {
    const pose = passage === '01' ? 'up' : 'rest';
    frames.push({ ...still(from, { pose }), at, phase: `${passage ?? 'end'}-${beat.name}` });
    at += beat.lasts;
  }
  let flipped = false;
  let accent = false;
  for (const beat of passage === null ? [] : EVOLUTIONS[passage]) {
    flipped ||= beat.flips === true;
    accent ||= beat.accent === true;
    // Her arc has grown: the finds have reached her. Until she takes her new state it is drawn
    // on the form she still has, with the sign that form had — nothing new is announced early.
    const look = flipped
      ? still(to, { passage: accent, sign: 0 })
      : { ...still(from, { passage: accent }), arcs: to.arcs };
    frames.push({ ...look, pose: beat.pose ?? 'rest', at, phase: `${passage ?? ''}-${beat.name}` });
    at += beat.lasts;
  }
  frames.push({ ...still(to, { passage: passage !== null }), at, phase: null });
  return frames;
}

/** When the last frame of a list is given to her: how long the list keeps her moving. */
export function framesLast(frames: readonly MascotFrame[]): number {
  return frames.at(-1)?.at ?? 0;
}

/**
 * The frames as they are played when the reader asked for less motion, when an evolution is
 * skipped, or when a state comes back from the phone: the last look, at once. What she became is
 * information and is always shown; how she got there is not played.
 */
export function withoutMotion(frames: readonly MascotFrame[]): MascotFrame[] {
  const last = frames.at(-1);
  return last === undefined ? [] : [{ ...last, at: 0 }];
}

/** How long she holds her figure, state by state: the stylesheet's own figures fit inside. */
export const TRICK_HOLD_MS: Readonly<Record<TurtleState, number>> = {
  0: 560,
  1: 820,
  2: 660,
  3: 660,
  4: 820,
};
export const PULSE_HOLD_MS = 340;

/** She was touched: her figure, then as she was. */
export function trick(look: MascotLook): MascotFrame[] {
  return [
    { ...look, pose: 'trick', at: 0, phase: null },
    { ...look, pose: 'rest', at: TRICK_HOLD_MS[look.state], phase: null },
  ];
}

/** A word was found: a small move, the same whatever was chosen, then as she was. */
export function pulse(look: MascotLook): MascotFrame[] {
  return [
    { ...look, pose: 'pulse', at: 0, phase: null },
    { ...look, pose: 'rest', at: PULSE_HOLD_MS, phase: null },
  ];
}

/** Writes a frame on a drawing: its look, and the beat it is — attributes only. */
export function applyMascotFrame(drawing: MascotDrawing, frame: MascotFrame): void {
  applyMascotLook(drawing, frame);
  if (frame.phase === null) drawing.removeAttribute('data-phase');
  else drawing.setAttribute('data-phase', frame.phase);
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
