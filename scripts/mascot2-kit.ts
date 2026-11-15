/**
 * The second-generation mascot, as files (D17.1 to D17.15; docs/discovery/PLAN-TORTUE.md): where
 * her drawing, her stylesheet, her colours and her validation live, the one fingerprint that
 * binds them, and the two measures her colours are held to. Read by the sheet the editor
 * validates (scripts/mascot2-sheet.ts) and by her gates (scripts/mascot2.test.ts).
 *
 * IN PREPARATION: nothing that is deployed reads any of this. The turtle that is online keeps
 * her own files and her own fingerprint (scripts/launch.ts, `turtleFingerprint`), untouched.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { EVOLUTIONS, FINDS, PULSE_HOLD_MS, TRICK_HOLD_MS } from '../src/lib/mascot2.js';

export const MASCOT2_SVG_PATH = 'design/mascot/v2/mascot.svg';
export const MASCOT2_CSS_PATH = 'src/styles/mascot2.css';
export const MASCOT2_PALETTE_PATH = 'design/mascot/v2/palette.json';
export const MASCOT2_VALIDATION_PATH = 'design/mascot/v2/validation.json';
export const MASCOT2_SHEET_PATH = 'design/mascot/v2/planche.html';
/** What three browsers measured of her movement (scripts/mascot2-motion.ts --write). */
export const MASCOT2_MOTION_PATH = 'design/mascot/v2/motion.json';

/** The two token sets she is drawn in: the main one, and the neutral one that stands ready. */
export const MASCOT2_TOKEN_SETS = ['design/tokens.json', 'design/tokens.neutral.json'] as const;

/** Six colours, one per part of the book, in the order of the book. */
export type Tints = readonly [string, string, string, string, string, string];

export interface PaletteSet {
  label_fr: string;
  families_fr?: readonly string[];
  light: Tints;
  dark: Tints;
}

/** design/mascot/v2/palette.json: the candidates, and the editor's choice once he has made it. */
export interface PaletteFile {
  note_fr: string;
  /** null until the editor has chosen on the sheet (D17.4). */
  chosen: string | null;
  palettes: Record<string, PaletteSet>;
  neutral: PaletteSet;
}

const at = (root: string, path: string): string => (root === '.' ? path : `${root}/${path}`);

export function readPalette(root = '.'): PaletteFile {
  return JSON.parse(readFileSync(at(root, MASCOT2_PALETTE_PATH), 'utf8')) as PaletteFile;
}

interface TokenFile {
  color?: Record<string, { $value?: string } | undefined>;
  'color-role'?: Record<string, Record<string, unknown> | undefined>;
}

/**
 * The five roles she shares with the turtle, in every theme of both token sets, resolved to
 * their values — the very lines scripts/launch.ts reads for the turtle (`turtleColours`; a test
 * holds the two equal). Read here and not imported from there: the launch gate reads this
 * module, and must not be read by it.
 */
function sharedRoles(root: string): string[] {
  const out: string[] = [];
  for (const path of MASCOT2_TOKEN_SETS) {
    if (!existsSync(at(root, path))) continue;
    const tokens = JSON.parse(readFileSync(at(root, path), 'utf8')) as TokenFile;
    for (const [theme, roles] of Object.entries(tokens['color-role'] ?? {})) {
      for (const [role, raw] of Object.entries(roles ?? {})) {
        if (!role.startsWith('turtle-') || typeof raw !== 'string') continue;
        const name = /^\{color\.([a-z0-9-]+)\}$/.exec(raw)?.[1];
        const value = name === undefined ? raw : (tokens.color?.[name]?.$value ?? raw);
        out.push(`${path} ${theme} ${role} ${value}`);
      }
    }
  }
  return out;
}

/**
 * The colours she is drawn in, one line each — `design/tokens.json light mascot-tint-1 #3AADEE`.
 * The five roles she shares with the turtle come from the token sets; her tints from the
 * palette. Once the editor has chosen, only his palette counts, written in the very form its
 * values will have as roles of the two token sets: moving them there changes no line here, so
 * no validation falls for a change of place. Until he has chosen, every candidate counts.
 */
export function mascot2Colours(root = '.'): string[] {
  const palette = readPalette(root);
  const out = sharedRoles(root);
  const lines = (path: string, set: PaletteSet, prefix = ''): void => {
    for (const theme of ['light', 'dark'] as const) {
      set[theme].forEach((value, index) => {
        out.push(
          `${prefix}${path} ${theme} mascot-tint-${String(index + 1)} ${value.toUpperCase()}`,
        );
      });
    }
  };
  const [main, neutral] = MASCOT2_TOKEN_SETS;
  const chosen = palette.chosen === null ? undefined : palette.palettes[palette.chosen];
  if (chosen !== undefined) lines(main, chosen);
  else {
    for (const [name, set] of Object.entries(palette.palettes))
      lines(main, set, `candidate:${name} `);
  }
  lines(neutral, palette.neutral);
  return out.sort();
}

/**
 * Her choreography, as the fingerprint reads it: the beats of every evolution and how long she
 * holds a figure (src/lib/mascot2.ts). What plays is part of what is validated.
 */
export const mascot2Choreography = (): string =>
  JSON.stringify({ FINDS, EVOLUTIONS, TRICK_HOLD_MS, PULSE_HOLD_MS });

/**
 * What the editor validates when the sheet is dated: the drawing, the stylesheet that makes its
 * states and its movement, its colours, and the beats of its evolutions. One fingerprint: a
 * retouch of any of them un-validates her. Null while she is not drawn.
 */
export function mascot2Fingerprint(root = '.'): string | null {
  const files = [MASCOT2_SVG_PATH, MASCOT2_CSS_PATH, MASCOT2_PALETTE_PATH].map((p) => at(root, p));
  if (!files.every((file) => existsSync(file))) return null;
  return createHash('sha256')
    .update(readFileSync(at(root, MASCOT2_SVG_PATH)))
    .update('\n')
    .update(readFileSync(at(root, MASCOT2_CSS_PATH)))
    .update('\n')
    .update(JSON.stringify(mascot2Colours(root)))
    .update('\n')
    .update(mascot2Choreography())
    .digest('hex');
}

// ---------------------------------------------------------------------------------------------
// What was measured of her movement
// ---------------------------------------------------------------------------------------------

/**
 * One evolution in one theme, filmed frame by frame (WCAG 2.3.1, general and red flashes). A
 * flash is a pair of opposing changes of light; the rule counts those of an area of
 * `FLASH_AREA_PX` or more, and allows three in a second.
 */
export interface FlashMeasure {
  /** Flashes in one second that an area large enough for the rule goes through, at worst. */
  flashes_per_second: number;
  /** The largest area, in CSS px², that changes back and forth within one same second. */
  area_px: number;
  /** The same two numbers for a saturated red. */
  red_flashes_per_second: number;
  red_area_px: number;
  /** Pairs of opposing changes of the mean light of the whole scene, over the evolution. */
  scene_pairs: number;
}

/** What the browsers measured of one clip. */
export interface ClipMeasure {
  /** How long the data says it lasts. */
  lasts_ms: number;
  /** When the last movement ended, engine by engine. */
  moving_ms: Record<string, number>;
  /** How far anything of her reached out of her frame while she moved, in CSS px, at worst. */
  spill_px: number;
  flashes?: { light: FlashMeasure; dark: FlashMeasure };
  /** Frames with the processor slowed four times (Chromium): the middle one of three runs. */
  frames?: { count: number; p95_ms: number; over_20_pct: number; over_50: number };
}

export interface MotionMeasures {
  note_fr: string;
  measured_on: string;
  /** Fingerprint of the drawing that was measured: a retouch makes the measure stale. */
  drawing_sha256: string;
  browsers: Record<string, string>;
  clips: Record<string, ClipMeasure>;
}

export function readMotion(root = '.'): MotionMeasures | null {
  const path = at(root, MASCOT2_MOTION_PATH);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as MotionMeasures;
}

/** WCAG 2.3.1: at most three flashes in any one second — or an area too small to matter. */
export const FLASHES_PER_SECOND_MAX = 3;
/** A quarter of a ten-degree field of view: 341 × 256 CSS px at 1024 × 768 (WCAG, note). */
export const FLASH_AREA_PX = Math.round(0.25 * 341 * 256);

// ---------------------------------------------------------------------------------------------
// Two measures of a colour
// ---------------------------------------------------------------------------------------------

const channel = (value: number): number => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => channel(Number.parseInt(h.slice(i, i + 2), 16))) as [
    number,
    number,
    number,
  ];
};
const luminance = (hex: string): number => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio of two colours. A drawn line needs 3:1 against what it lies on. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
export const LINE_MIN = 3;

function oklch(hex: string): { l: number; c: number; h: number } {
  const [r, g, b] = rgb(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    c: Math.hypot(a, bb),
    h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

interface Range {
  name_fr: string;
  l: [number, number];
  c: [number, number];
  /** Hue, in degrees; may wrap past 360. */
  h: [number, number];
}
/**
 * What is not hers (illustration-rules §2.2, point 2 — kept by D17.12 for every role, tints
 * included): the lavender of the official turtle's body, the plum of its shell, the pink of the
 * campaign's illustrations. The very ranges scripts/mascot.test.ts holds the turtle to.
 */
export const NOT_HERS: readonly Range[] = [
  { name_fr: 'lavande', l: [0.6, 0.82], c: [0.04, 0.12], h: [295, 335] },
  { name_fr: 'prune', l: [0.22, 0.45], c: [0.03, 0.12], h: [325, 370] },
  { name_fr: 'rose', l: [0.55, 0.85], c: [0.1, 0.4], h: [330, 375] },
];
const within = (value: number, [low, high]: [number, number]): boolean =>
  value >= low && value <= high;

/** The refused ranges a colour falls in, by name; empty when it is hers to wear. */
export function refused(hex: string): string[] {
  const { l, c, h } = oklch(hex);
  return NOT_HERS.filter(
    (range) =>
      within(l, range.l) && within(c, range.c) && (within(h, range.h) || within(h + 360, range.h)),
  ).map((range) => range.name_fr);
}
