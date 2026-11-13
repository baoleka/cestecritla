/**
 * The turtle, held to what was decided of her (D16.11 to D16.13; PLAN-JEU §4.3 to §4.6;
 * design/illustration-rules.md §2.2): what the drawing may contain, what colours it may take,
 * how it may move — and that the sheet the editor validates is the sheet of today's drawing.
 *
 * What no test here can see — does she read as a turtle, is she sober, is she "not the same" —
 * is the editor's judgement on the sheet (lot K3) and the question asked to fresh readers.
 * What she does in a page (she pushes nothing, stands on nothing, carries no number, never
 * moves alone) is held by the end-to-end gate once the game is built.
 *
 * Run: npx tsx --test scripts/mascot.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import {
  ARCS,
  ARC_STEPS,
  EVOLUTION_MAX_MS,
  GESTURE_MAX_MS,
  SEGMENT_MS,
  STATE_ARCS,
  applyLook,
  arcAttributes,
  arcSteps,
  evolution,
  framesDuration,
  turtleMarkup,
  withoutMotion,
  type TurtleState,
} from '../src/lib/turtle.js';
import {
  TOKEN_SETS,
  TURTLE_CSS_PATH,
  TURTLE_SVG_PATH,
  TURTLE_VALIDATION_PATH,
  turtleColours,
  turtleFingerprint,
} from './launch.js';
import { SHEET_PATH, passages, readValidation, sheet } from './mascot-sheet.js';

const svg = readFileSync(TURTLE_SVG_PATH, 'utf8');
const css = readFileSync(TURTLE_CSS_PATH, 'utf8');
/** The stylesheet without its comments: what a browser reads. */
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
const STATES: readonly TurtleState[] = [0, 1, 2, 3, 4];

interface Tag {
  name: string;
  attributes: Record<string, string>;
}
/** Every opening tag of the drawing, in order, with its attributes. */
function tags(source: string): Tag[] {
  return [...source.matchAll(/<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*\/?>/g)].map(
    (match) => ({
      name: match[1] ?? '',
      attributes: Object.fromEntries(
        [...(match[2] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1] ?? '', a[2] ?? '']),
      ),
    }),
  );
}
const drawing = tags(svg);
/** The attributes of a tag that may be missing: a missing tag has none, and the test says so. */
const attributesOf = (tag: Tag | undefined): Record<string, string | undefined> =>
  tag === undefined ? {} : tag.attributes;
const classed = (name: string): Tag[] =>
  drawing.filter((tag) => (tag.attributes['class'] ?? '').split(' ').includes(name));
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline']);

/** Every number of a path's `d`, as x or y by position — enough to bound simple paths. */
const numbers = (d: string): number[] => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);

void test('the file is geometry and class names: no colour, no style, nothing but simple shapes', () => {
  // Hand-written, small: the whole drawing and its stylesheet weigh less than one photograph's
  // header (D16.13: ≤ 6 KB gzip — both files together, so the budget cannot hide in the CSS).
  const weight = gzipSync(svg).length + gzipSync(css).length;
  assert.ok(weight <= 6 * 1024, `${String(weight)} B gzip for the drawing and its stylesheet`);

  const allowed = new Set(['svg', 'g', 'path', 'rect', 'circle']);
  for (const tag of drawing) {
    assert.ok(allowed.has(tag.name), `<${tag.name}> has no place in the drawing`);
  }
  // No gradient, filter, image, text, mask, pattern, reference, script or animation element —
  // said by name, so that the day one is wanted the refusal explains itself.
  assert.doesNotMatch(
    svg,
    /<(?:defs|linearGradient|radialGradient|filter|image|text|tspan|mask|clipPath|pattern|use|symbol|style|script|animate\w*|set|foreignObject|title|desc)\b/i,
  );
  // Colour comes from the five roles, through classes: never from the file.
  const ATTRIBUTES = new Set([
    'xmlns',
    'viewBox',
    'class',
    'data-state',
    'data-pose',
    'focusable',
    'aria-hidden',
    'd',
    'pathLength',
    'stroke-dasharray',
    'stroke-dashoffset',
    'x',
    'y',
    'width',
    'height',
    'rx',
    'cx',
    'cy',
    'r',
  ]);
  for (const tag of drawing) {
    for (const name of Object.keys(tag.attributes)) {
      assert.ok(ATTRIBUTES.has(name), `<${tag.name} ${name}=…>: not an attribute of the drawing`);
    }
  }
  assert.doesNotMatch(svg, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(|currentColor/i);
  assert.equal(attributesOf(drawing[0])['viewBox'], '0 0 96 60', 'the grid is 24 × 15 cells of 4');
  // Decoration for assistive technology: what she does is said in words by the page.
  assert.equal(attributesOf(drawing[0])['aria-hidden'], 'true');
  assert.equal(attributesOf(drawing[0])['focusable'], 'false');
});

void test('twelve shapes at most, each one known: a shell, three arcs, a body, four limbs', () => {
  const shapes = drawing.filter((tag) => SHAPES.has(tag.name));
  assert.ok(shapes.length <= 12, `${String(shapes.length)} shapes`);
  // Every shape has a class, and every class is one of hers: a shape with no name would be
  // drawn black by the browser, and a new one would be an accessory nobody decided.
  const census: Record<string, number> = {};
  for (const tag of shapes) {
    const name = (tag.attributes['class'] ?? '').split(' ')[0] ?? '';
    census[name] = (census[name] ?? 0) + 1;
  }
  assert.deepEqual(census, {
    't-tail': 1,
    't-shell': 1,
    't-arc': ARCS,
    // The body, two legs, and the head with its neck.
    't-line': 4,
    't-eye': 1,
    't-accent': 1,
  });
  assert.equal(classed('t-all').length, 1);
  assert.equal(classed('t-head').length, 1);
  // The file is state 0 at rest: every arc written, none grown.
  assert.equal(attributesOf(drawing[0])['data-state'], '0');
  assert.equal(attributesOf(drawing[0])['data-pose'], 'rest');
  for (let n = 1; n <= ARCS; n += 1) {
    const arc = classed(`t-arc-${String(n)}`);
    assert.equal(arc.length, 1);
    assert.equal(attributesOf(arc[0])['pathLength'], String(ARC_STEPS));
    assert.deepEqual(
      [attributesOf(arc[0])['stroke-dasharray'], attributesOf(arc[0])['stroke-dashoffset']],
      [arcAttributes(0).dasharray, arcAttributes(0).dashoffset],
    );
  }
});

void test('in profile, facing right, never mirrored; a shell with arcs and no grid', () => {
  const shell = numbers(classed('t-shell')[0]?.attributes['d'] ?? '');
  // `M15 37a28 25 0 0 1 56 0Z`: from the left foot of the dome to the right one.
  const left = shell[0] ?? NaN;
  const right = left + (shell[7] ?? NaN);
  assert.ok(left < right);
  // The eye is ahead of the shell, the tail behind it: she looks to the right.
  const eye = Number(classed('t-eye')[0]?.attributes['cx']);
  assert.ok(eye > right, 'the eye is not ahead of the shell');
  const tail = numbers(classed('t-tail')[0]?.attributes['d'] ?? '');
  assert.ok((tail[2] ?? NaN) < left, 'the tail is not behind the shell');
  // Nothing turns her round: no transform in the file, no negative scale or matrix in the CSS.
  assert.doesNotMatch(svg, /\btransform=/);
  assert.doesNotMatch(rules, /scale[XY]?\(\s*-|matrix|rotate[XY3]|perspective|skew/);
  // The arcs are concentric and inside the shell: same axis, each smaller than the last.
  const arcs = [1, 2, 3].map((n) =>
    numbers(classed(`t-arc-${String(n)}`)[0]?.attributes['d'] ?? ''),
  );
  const centre = (arc: number[]): number => (arc[0] ?? NaN) + (arc[7] ?? NaN) / 2;
  const axis = left + (right - left) / 2;
  let previous = right - left;
  for (const arc of arcs) {
    assert.equal(centre(arc), axis);
    assert.ok((arc[7] ?? NaN) < previous, 'an arc is not inside the one before');
    previous = arc[7] ?? NaN;
  }
  // Only the shell and its arcs are stroked: a stroked line anywhere else would be the first
  // line of a grid (illustration-rules §2.2, rule 4).
  const stroked = [...rules.matchAll(/([^{}]+)\{[^}]*\bstroke:\s*[^;]+;[^}]*\}/g)].map((m) =>
    (m[1] ?? '').trim(),
  );
  assert.deepEqual(stroked.sort(), ['.turtle .t-arc', '.turtle .t-shell']);
});

void test('the stylesheet: five roles of colour, flat, and never a dash of its own', () => {
  // Every paint is a role or nothing.
  for (const match of rules.matchAll(/\b(fill|stroke):\s*([^;]+);/g)) {
    assert.match(match[2] ?? '', /^(?:none|var\(--turtle-(?:line|shell|arc|eye|accent)\))$/);
  }
  assert.doesNotMatch(rules, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(|currentColor/i);
  // Flat: one level of depth (illustration-rules §2.2, rule 1).
  assert.doesNotMatch(rules, /gradient|filter|shadow|blur|mask|clip-path|blend|url\(/);
  // The arcs are drawn by two attributes of each arc. A dash set here would win over them —
  // it did, the first day: every state showed three dots.
  assert.doesNotMatch(rules, /stroke-dash(?:array|offset)\s*:/);
  assert.match(rules, /\.t-arc\[stroke-dasharray\^='0 '\]\s*\{\s*visibility:\s*hidden;/);
  // The accent is not part of her resting look.
  assert.match(rules, /\.turtle \.t-accent\s*\{[^}]*opacity:\s*0;/);
  assert.match(rules, /\.turtle\[data-passage\] \.t-accent\s*\{\s*opacity:\s*1;/);
});

// "Never the mauve and plum palette of the official one, nor the pink" (illustration-rules §2.2,
// rule 2), said with numbers. In OKLCH — lightness, chroma, hue — because a distance alone calls
// a pale blue "close to" a pale mauve: what makes a palette is the hue it sits in.
const linear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function oklch(hex: string): { l: number; c: number; h: number } {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = linear(((n >> 16) & 255) / 255);
  const g = linear(((n >> 8) & 255) / 255);
  const b = linear((n & 255) / 255);
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
  name: string;
  l: [number, number];
  c: [number, number];
  /** Hue, in degrees; may wrap past 360. */
  h: [number, number];
}
/**
 * What was observed of the official turtle and of the campaign's illustrations
 * (illustration-rules §2.1), each widened by a margin: its lavender body (#B090C0 to #C0A0D0),
 * its plum shell (#402030 to #603050), the pink (#ED5FB1).
 */
const NOT_HERS: readonly Range[] = [
  { name: 'the lavender of its body', l: [0.6, 0.82], c: [0.04, 0.12], h: [295, 335] },
  { name: 'the plum of its shell', l: [0.22, 0.45], c: [0.03, 0.12], h: [325, 370] },
  { name: 'the pink', l: [0.55, 0.85], c: [0.1, 0.4], h: [330, 375] },
];
const within = (value: number, [low, high]: [number, number]): boolean =>
  value >= low && value <= high;
const inRange = (hex: string, range: Range): boolean => {
  const { l, c, h } = oklch(hex);
  return (
    within(l, range.l) && within(c, range.c) && (within(h, range.h) || within(h + 360, range.h))
  );
};
/** A purple, for the pairing rule: the hues from violet to plum, with enough chroma to be one. */
const purple = (hex: string): boolean => {
  const { c, h } = oklch(hex);
  return c >= 0.04 && h >= 285 && h <= 350;
};

void test('her colours: five roles in every theme of both token sets, never the official palette', () => {
  // The ranges do describe what they are named after — or the gate would hold nothing.
  for (const [hex, index] of [
    ['#B090C0', 0],
    ['#C0A0D0', 0],
    ['#402030', 1],
    ['#603050', 1],
    ['#ED5FB1', 2],
  ] as const) {
    const range = NOT_HERS[index];
    assert.ok(range !== undefined && inRange(hex, range), `${hex} is not in its own range`);
  }

  const colours = turtleColours();
  const ROLES = ['turtle-accent', 'turtle-arc', 'turtle-eye', 'turtle-line', 'turtle-shell'];
  for (const set of TOKEN_SETS) {
    for (const theme of ['light', 'dark']) {
      const own = new Map(
        colours
          .filter((line) => line.startsWith(`${set} ${theme} `))
          .map((line) => [line.split(' ')[2] ?? '', line.split(' ')[3] ?? '']),
      );
      assert.deepEqual([...own.keys()].sort(), ROLES, `${set} ${theme}`);
      for (const [role, value] of own) {
        assert.match(value, /^#[0-9A-Fa-f]{6}$/, `${set} ${theme} ${role}`);
        // What makes the character is her body, her shell and her arcs; the eye is a dot, and
        // the accent is the charter's action colour, shown for a moment.
        if (role === 'turtle-eye' || role === 'turtle-accent') continue;
        for (const range of NOT_HERS) {
          assert.ok(!inRange(value, range), `${set} ${theme} ${role} ${value} is ${range.name}`);
        }
      }
      // And the pairing that makes the official one at a glance, whatever the exact tints: a
      // light purple body under a dark purple shell. In the light theme hers is the reverse; in
      // the dark theme her body is cream — it was pale violet for an afternoon, and side by
      // side with theirs the two read as one family.
      const [body, shell] = [own.get('turtle-line') ?? '', own.get('turtle-shell') ?? ''];
      const theirs =
        purple(body) && purple(shell) && oklch(body).l >= 0.6 && oklch(shell).l <= 0.45;
      assert.ok(!theirs, `${set} ${theme}: a light purple body under a dark purple shell`);
    }
  }
  // The stylesheet the app ships declares the five roles, light and dark.
  const tokens = readFileSync('src/styles/tokens.css', 'utf8');
  for (const role of ROLES) {
    assert.ok((tokens.match(new RegExp(`--${role}:`, 'g')) ?? []).length >= 3, role);
  }
});

void test('an arc grows from the crown, by whole steps, and never shows what is missing', () => {
  assert.deepEqual(arcAttributes(0), { dasharray: '0 6', dashoffset: '-3' });
  assert.deepEqual(arcAttributes(6), { dasharray: '6 6', dashoffset: '0' });
  for (let steps = 0; steps <= ARC_STEPS; steps += 1) {
    const { dasharray, dashoffset } = arcAttributes(steps);
    const [dash, gap] = dasharray.split(' ').map(Number);
    // One dash, then a gap as long as the path: never a second dash, so never a dashed line.
    assert.equal(gap, ARC_STEPS);
    // Astride the top: as much is missing before the dash as after it.
    assert.equal(Number(dashoffset) + (ARC_STEPS - (dash ?? NaN)) / 2, 0);
  }
  assert.deepEqual(arcAttributes(-2), arcAttributes(0));
  assert.deepEqual(arcAttributes(9), arcAttributes(6));

  // A share of what there is to find becomes steps: one as soon as something is found, six
  // only when nothing is left, and never a step back.
  assert.equal(arcSteps(0, 20), 0);
  assert.equal(arcSteps(1, 20), 1);
  assert.equal(arcSteps(19, 20), 5);
  assert.equal(arcSteps(20, 20), 6);
  assert.equal(arcSteps(3, 0), 0);
  // Few things to find: one step each, and the last one closes the arc.
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((n) => arcSteps(n, 5)),
    [1, 2, 3, 4, 6],
  );
  assert.deepEqual(
    [1, 2, 3].map((n) => arcSteps(n, 3)),
    [1, 2, 6],
  );
  for (const total of [1, 2, 5, 6, 7, 21, 90]) {
    let previous = 0;
    const seen = new Set<number>();
    for (let found = 0; found <= total; found += 1) {
      const steps = arcSteps(found, total);
      assert.ok(steps >= previous, `${String(found)}/${String(total)} goes back`);
      assert.equal(steps === ARC_STEPS, found === total);
      seen.add(steps);
      previous = steps;
    }
    // Six parts, six steps: one per part of the book.
    if (total === ARC_STEPS) assert.equal(seen.size, ARC_STEPS + 1);
  }

  // The least each state can show never shrinks from one state to the next.
  for (const state of STATES.slice(1)) {
    const before = STATE_ARCS[(state - 1) as TurtleState];
    STATE_ARCS[state].forEach((steps, index) => {
      assert.ok(steps >= (before[index] ?? 0));
    });
  }
  assert.deepEqual(STATE_ARCS[0], [0, 0, 0]);
  assert.deepEqual(STATE_ARCS[4], [6, 6, 6]);
});

void test('a look is written as attributes, and the paths are never touched', () => {
  const geometry = (source: string): string[] =>
    tags(source).map((tag) =>
      JSON.stringify([tag.name, tag.attributes['d'], tag.attributes['cx'], tag.attributes['x']]),
    );
  for (const state of STATES) {
    const out = turtleMarkup(svg, { state, pose: 'up', passage: true });
    assert.deepEqual(geometry(out), geometry(svg));
    const root = tags(out)[0];
    assert.equal(attributesOf(root)['data-state'], String(state));
    assert.equal(attributesOf(root)['data-pose'], 'up');
    assert.equal(attributesOf(root)['data-passage'], '');
    STATE_ARCS[state].forEach((steps, index) => {
      const arc = tags(out).find((tag) =>
        (tag.attributes['class'] ?? '').includes(`t-arc-${String(index + 1)}`),
      );
      assert.equal(attributesOf(arc)['stroke-dasharray'], arcAttributes(steps).dasharray);
      assert.equal(attributesOf(arc)['stroke-dashoffset'], arcAttributes(steps).dashoffset);
    });
  }
  assert.doesNotMatch(turtleMarkup(svg, { state: 2 }), /data-passage/);
  assert.match(turtleMarkup(svg, { state: 1, arcs: [4, 0, 0] }), /stroke-dasharray="4 6"/);

  // The same look, written on a drawing already in a page.
  const written: string[] = [];
  const element = (name: string) => ({
    setAttribute: (key: string, value: string): void => {
      written.push(`${name} ${key}=${value}`);
    },
  });
  applyLook(
    {
      ...element('svg'),
      toggleAttribute: (key: string, force?: boolean): boolean => {
        written.push(`svg ${key}:${String(force)}`);
        return force === true;
      },
      querySelector: (selector: string) => element(selector),
    },
    { state: 2, arcs: [6, 1, 0], pose: 'look', passage: false },
  );
  assert.deepEqual(written, [
    'svg data-state=2',
    'svg data-pose=look',
    'svg data-passage:false',
    '.t-arc-1 stroke-dasharray=6 6',
    '.t-arc-1 stroke-dashoffset=0',
    '.t-arc-2 stroke-dasharray=1 6',
    '.t-arc-2 stroke-dashoffset=-2.5',
    '.t-arc-3 stroke-dasharray=0 6',
    '.t-arc-3 stroke-dashoffset=-3',
  ]);
});

void test('she moves only when told to, by transform and opacity, and never for long', () => {
  // No animation at all: nothing can loop, nothing can start by itself.
  assert.doesNotMatch(rules, /animation|@keyframes/);
  // Every transition lives where reduced motion does not, and only on a drawing the script
  // has declared live — a page that loads plays nothing.
  const outside = rules.replace(
    /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*\}\s*$/,
    '',
  );
  assert.doesNotMatch(outside, /transition/);
  const transitions = [...rules.matchAll(/([^{}]+)\{\s*transition:\s*([^;]+);\s*\}/g)];
  assert.ok(transitions.length >= 3);
  const durations = (
    JSON.parse(readFileSync('design/tokens.json', 'utf8')) as {
      motion: { duration: Record<string, string> };
    }
  ).motion.duration;
  let longest = 0;
  for (const [, selector, value] of transitions) {
    for (const part of (selector ?? '').split(',')) {
      assert.match(part.trim(), /^\.turtle\[data-live\] \.t-[a-z]+$/, part);
    }
    const [, property, token, easing] =
      /^(\w+) var\(--duration-(\w+)\) var\(--easing-(\w+)\)$/.exec((value ?? '').trim()) ?? [];
    assert.ok(property === 'transform' || property === 'opacity', value);
    assert.ok(easing === 'standard' || easing === 'enter' || easing === 'exit', value);
    const ms = Number.parseInt(durations[token ?? ''] ?? '', 10);
    assert.ok(ms > 0 && ms <= SEGMENT_MS, `${value ?? ''}: ${String(ms)} ms`);
    longest = Math.max(longest, ms);
  }
  // A gesture — touching her, asking for a hint — is one change of pose: one segment.
  assert.ok(longest <= GESTURE_MAX_MS);

  // An evolution: her size and carriage, then the arcs, then the accent — within the budget,
  // every frame after the one before, the accent only at a passage.
  for (const frames of passages()) {
    assert.ok(framesDuration(frames) <= EVOLUTION_MAX_MS);
    assert.deepEqual(
      frames.map((frame) => frame.passage),
      [false, false, true],
    );
    for (let i = 1; i < frames.length; i += 1) {
      const [earlier, later] = [frames[i - 1], frames[i]];
      assert.ok(earlier !== undefined && later !== undefined);
      // A frame is given once the transition of the one before is over or well under way.
      assert.ok(later.at > earlier.at);
      assert.equal(later.state, earlier.state);
    }
  }
  // Arcs alone: no passage, no movement, one frame.
  const grown = evolution({ state: 1, arcs: [2, 0, 0] }, { state: 1, arcs: [3, 0, 0] });
  assert.deepEqual(grown, [{ at: 0, state: 1, arcs: [3, 0, 0], pose: 'rest', passage: false }]);
  assert.equal(framesDuration(grown), 0);
  // She never goes back, whatever she is asked.
  const back = evolution({ state: 3, arcs: [6, 6, 2] }, { state: 1, arcs: [1, 0, 0] });
  assert.deepEqual(back, [{ at: 0, state: 3, arcs: [6, 6, 2], pose: 'rest', passage: false }]);
  // Less motion asked: what she became, at once — and nothing of how she got there.
  const [first] = passages();
  assert.ok(first !== undefined);
  assert.deepEqual(withoutMotion(first), [{ ...first.at(-1), at: 0 }]);
  assert.deepEqual(withoutMotion([]), []);
});

void test('the sheet the editor validates is the sheet of today’s drawing', () => {
  assert.ok(existsSync(SHEET_PATH), `${SHEET_PATH}: run scripts/mascot-sheet.ts`);
  assert.ok(
    readFileSync(SHEET_PATH, 'utf8') === sheet(),
    `${SHEET_PATH} is stale: run npx tsx scripts/mascot-sheet.ts`,
  );
  // Self-contained: it opens from the file system and asks nothing of anyone. (Said with a
  // boolean: a failed match would print the whole page.)
  const page = sheet().replaceAll('xmlns="http://www.w3.org/2000/svg"', '');
  const asks = /\b(?:src|href)=|url\(|@import|https?:\/\//.exec(page);
  assert.equal(asks, null, `the sheet reaches outside itself: ${asks?.[0] ?? ''}`);
  assert.ok(page.includes('<meta name="robots" content="noindex">'));

  // A date is only ever written on the drawing it was given for: retouch her, and the same
  // commit takes the date back (the launch gate says so too — this says it sooner).
  const validation = readValidation();
  assert.ok(validation !== null, `${TURTLE_VALIDATION_PATH} is missing`);
  const today = turtleFingerprint();
  const pairs: [string | null, string | null, string][] = [
    [validation.validated_on, validation.drawing_sha256, 'validated_on'],
    [
      validation.same_character_asked_on,
      validation.same_character_sha256,
      'same_character_asked_on',
    ],
  ];
  // Readers counted, never typed as a sentence: whatever a page says of them is computed.
  const answers = validation.same_character_answers;
  if (validation.same_character_asked_on === null) {
    assert.equal(answers, null);
  } else {
    assert.ok(answers !== null && answers.asked > 0);
    assert.equal(answers.same + answers.not_same + answers.unsure, answers.asked);
  }
  for (const [date, fingerprint, name] of pairs) {
    if (date === null) {
      assert.equal(fingerprint, null, `${name}: a fingerprint with no date`);
    } else {
      assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(fingerprint, today, `${name}: the drawing changed since — set it back to null`);
    }
  }
});
