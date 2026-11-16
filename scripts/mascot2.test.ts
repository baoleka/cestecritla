/**
 * The second-generation mascot, held (lots A1 and A2 of docs/discovery/PLAN-TORTUE.md; D17.1 to
 * D17.17): what her drawing may contain, what her stylesheet may do, what her colours must
 * measure, what her movement is made of and how long it lasts, and that the sheet the editor
 * validates is the sheet of today's drawing.
 *
 * What only a browser can see — which shapes show in a state, whether anything leaves her
 * frame — is scripts/mascot2-render.ts, in three engines; her movement as it is played — when
 * it ends, what flashes, how the frames hold — is scripts/mascot2-motion.ts, whose measures are
 * read back here.
 *
 * She is the mascot the site serves since 15 November 2026 (D17.36). The gate of the first
 * generation (scripts/mascot.test.ts) went with that generation, lot F; so did two tests of this
 * file that only held the two apart — state 0 drawn with the very shapes of the turtle then
 * online, and her files imported behind a constant a build of the first generation folded.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import {
  BEAT_MAX_MS,
  EVOLUTIONS,
  EVOLUTION_MAX_MS,
  FINDS,
  GESTURE_MAX_MS,
  MAX_BOTH_BYTES,
  MAX_DRAWING_BYTES,
  MAX_SHAPES_IN_FILE,
  MAX_SHAPES_SEEN,
  MAX_STYLESHEET_BYTES,
  MOVING_LIMIT_MS,
  PASSAGES,
  PULSE_HOLD_MS,
  SHAPES_SEEN,
  STATE_ARCS,
  TRICK_HOLD_MS,
  applyMascotFrame,
  applyMascotLook,
  evolution,
  evolutionLasts,
  framesLast,
  lookOf,
  mascotMarkup,
  passageTo,
  pulse,
  signOf,
  tintOf,
  trick,
  withoutMotion,
  type MascotDrawing,
  type Standing,
  type TurtleState,
} from '../src/lib/mascot2.js';
import {
  MASCOT_TOKENS_CSS_PATH,
  TOKENS_CSS_PATH,
  buildMascotTokensCss,
  buildTokensCss,
} from './build-tokens.js';
import { TOKEN_SETS } from './launch.js';
import { ARC_STEPS, arcAttributes, arcSteps } from '../src/lib/turtle.js';
import {
  FLASHES_PER_SECOND_MAX,
  LINE_MIN,
  MASCOT2_CSS_PATH,
  MASCOT2_MOTION_PATH,
  MASCOT2_PALETTE_PATH,
  MASCOT2_SHEET_PATH,
  MASCOT2_SVG_PATH,
  contrastRatio,
  mascot2Colours,
  mascot2Fingerprint,
  oklch,
  readMotion,
  readPalette,
  refused,
  type ClipMeasure,
  type FlashMeasure,
  type PaletteSet,
} from './mascot2-kit.js';
import { readValidation, sheet } from './mascot2-sheet.js';

const STATES: readonly TurtleState[] = [0, 1, 2, 3, 4];
const svg = readFileSync(MASCOT2_SVG_PATH, 'utf8');
const css = readFileSync(MASCOT2_CSS_PATH, 'utf8');
/** The stylesheet without its comments: what a browser reads. */
const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selector: (m[1] ?? '').trim().replace(/\s+/g, ' '),
  body: m[2] ?? '',
}));

interface Shape {
  tag: string;
  classes: string[];
  attributes: Record<string, string>;
}
const elements = (source: string): Shape[] =>
  [...source.matchAll(/<([a-zA-Z]+)\b([^>]*?)\/?>/g)].map((m) => {
    const attributes = Object.fromEntries(
      [...(m[2] ?? '').matchAll(/([a-zA-Z-]+)="([^"]*)"/g)].map((a) => [a[1] ?? '', a[2] ?? '']),
    );
    return { tag: m[1] ?? '', classes: (attributes['class'] ?? '').split(' '), attributes };
  });
const all = elements(svg);
const shapes = all.filter((e) => ['path', 'rect', 'circle'].includes(e.tag));

void test('she weighs less than her ceilings (D17.13)', () => {
  const drawing = gzipSync(svg).length;
  const stylesheet = gzipSync(css).length;
  assert.ok(drawing <= MAX_DRAWING_BYTES, `the drawing: ${String(drawing)} B`);
  assert.ok(stylesheet <= MAX_STYLESHEET_BYTES, `the stylesheet: ${String(stylesheet)} B`);
  assert.ok(drawing + stylesheet <= MAX_BOTH_BYTES, `both: ${String(drawing + stylesheet)} B`);
});

void test('the file of the drawing holds geometry and class names, and nothing else', () => {
  const tags = new Set(all.map((e) => e.tag));
  assert.deepEqual([...tags].sort(), ['circle', 'g', 'path', 'rect', 'svg']);
  const allowed = new Set([
    ...['xmlns', 'viewBox', 'class', 'focusable', 'aria-hidden'],
    ...['data-state', 'data-pose', 'data-tint', 'data-sign'],
    ...['d', 'pathLength', 'stroke-dasharray', 'stroke-dashoffset'],
    ...['x', 'y', 'width', 'height', 'rx', 'cx', 'cy', 'r'],
  ]);
  for (const element of all) {
    for (const name of Object.keys(element.attributes)) {
      assert.ok(allowed.has(name), `<${element.tag}> carries ${name}`);
    }
  }
  // No colour, no style, no transform, no text, nothing fetched, nothing that moves by itself.
  assert.doesNotMatch(svg, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(|currentColor/i);
  assert.doesNotMatch(
    svg,
    /<(?:defs|style|script|text|image|use|symbol|filter|mask|animate|set)\b/,
  );
  assert.doesNotMatch(svg, /\b(?:href|url\()/);
  const root = all[0];
  assert.equal(root?.tag, 'svg');
  assert.equal(root.attributes['viewBox'], '0 0 96 60', 'the frame of the first turtle, kept');
  assert.equal(root.attributes['class'], 'mascot');
  assert.equal(root.attributes['aria-hidden'], 'true');
  assert.equal(root.attributes['focusable'], 'false');
  // As the file writes her: the turtle, at rest, pale, with no sign.
  for (const name of ['data-state', 'data-tint', 'data-sign'])
    assert.equal(root.attributes[name], '0');
  assert.equal(root.attributes['data-pose'], 'rest');
});

void test('her shapes: every one named, and no more than a state may show (D17.13)', () => {
  assert.ok(shapes.length <= MAX_SHAPES_IN_FILE, `${String(shapes.length)} shapes in the file`);
  const names = new Set(shapes.map((shape) => shape.classes[0] ?? ''));
  for (const name of names) assert.match(name, /^m-[a-z-]+$/, `a shape is called « ${name} »`);
  for (const state of STATES) {
    const seen = SHAPES_SEEN[state];
    assert.ok(
      seen.length <= MAX_SHAPES_SEEN[state],
      `state ${String(state)}: ${String(seen.length)}`,
    );
    for (const name of seen) assert.ok(names.has(name), `state ${String(state)} counts ${name}`);
    // No state counts a shape more often than the file has it.
    for (const name of new Set(seen)) {
      const counted = seen.filter((n) => n === name).length;
      const drawn = shapes.filter((shape) => shape.classes[0] === name).length;
      assert.ok(counted <= drawn, `state ${String(state)} counts ${name} ${String(counted)} times`);
    }
  }
});

void test('her three arcs are there three times — shell, folded wing, wing in flight — written as not grown', () => {
  for (const n of [1, 2, 3]) {
    const arcs = shapes.filter((shape) => shape.classes.includes(`m-arc-${String(n)}`));
    assert.equal(arcs.length, 3, `arc ${String(n)}`);
    for (const arc of arcs) {
      assert.equal(arc.attributes['pathLength'], '6');
      assert.equal(arc.attributes['stroke-dasharray'], '0 6');
      assert.equal(arc.attributes['stroke-dashoffset'], '-3');
    }
  }
});

void test('her stylesheet colours by role, and only by role', () => {
  const ROLE = /^var\(--turtle-(?:line|shell|arc|eye|accent)\)$/;
  for (const { selector, body } of rules) {
    for (const [, property, value] of body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:\s*([^;]+)/g)) {
      if (property === 'fill' || property === 'stroke') {
        assert.ok(
          value === 'none' || ROLE.test(value ?? '') || value === 'var(--m-tint)',
          `${selector} { ${property}: ${value ?? ''} }`,
        );
      }
    }
    // The colour of a part reaches her through one property, and that property only.
    for (const [, value] of body.matchAll(/--m-tint\s*:\s*([^;]+)/g)) {
      assert.match(value ?? '', /^var\(--(?:turtle-eye|mascot-tint-[1-6])\)$/, selector);
    }
  }
  assert.ok(!/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i.test(bare), 'a colour is typed in the stylesheet');
  // Flat (illustration-rules §2.2, point 1), and nothing fetched.
  const depth = /gradient|filter|shadow|blur|mask|clip-path|blend|url\(|@import|!important/.exec(
    bare,
  );
  assert.equal(depth, null, `the stylesheet says « ${depth?.[0] ?? ''} »`);
});

void test('her stylesheet never sets a dash on an arc, never mirrors her, never loops', () => {
  // A dash is how a line is written (D17.8): the line of the wave, her neck, the lines between
  // her stars — and never an arc, whose two attributes say what has been found.
  const WRITTEN = /^\.mascot(?:\[[^\]]+\])* \.m-(?:crest|neck|neck-in|neck-s|neck-f|lines)$/;
  const dashed = /(?:^|;)\s*stroke-dash(?:array|offset)\s*:/;
  const STEP = /^(?:from|to|\d+(?:\.\d+)?%)$/;
  for (const { selector, body } of rules) {
    if (!dashed.test(body)) continue;
    for (const one of selector.split(',').map((part) => part.trim())) {
      // A step of an animation: held just below, by who plays it.
      if (!STEP.test(one)) assert.match(one, WRITTEN, `a dash is set on « ${one} »`);
    }
  }
  // An animation that moves a dash is played by a line that is written, and by nothing else.
  for (const [, name, steps] of bare.matchAll(
    /@keyframes (m-[a-z]+) \{((?:[^{}]*\{[^{}]*\})+)\s*\}/g,
  )) {
    if (!/stroke-dash/.test(steps ?? '')) continue;
    const players = rules.filter((r) => new RegExp(`animation:\\s*${name ?? ''}\\b`).test(r.body));
    assert.ok(players.length > 0, `@keyframes ${name ?? ''}`);
    for (const { selector } of players) {
      for (const one of selector.split(',').map((part) => part.trim())) {
        assert.match(one, WRITTEN, `${name ?? ''} is played by « ${one} »`);
      }
    }
  }
  assert.ok(
    rules.some(
      (r) =>
        r.selector === ".mascot .m-arc[stroke-dasharray^='0 ']" &&
        /visibility:\s*hidden/.test(r.body),
    ),
    'an arc that has not started is not drawn at all',
  );
  // Never in mirror, never in three dimensions (illustration-rules §2.2, points 1 and 3).
  const turned = /scale[XY]?\(\s*-|matrix|rotate[XY3]|perspective|skew/.exec(bare);
  assert.equal(turned, null, `the stylesheet says « ${turned?.[0] ?? ''} »`);
  // She never moves alone (D17.7): no animation runs without end.
  assert.ok(!bare.includes('infinite'), 'an animation runs without end');
});

void test('the ranges of colour that are not hers do describe what they are named after', () => {
  assert.deepEqual(refused('#B090C0'), ['lavande']);
  assert.deepEqual(refused('#C0A0D0'), ['lavande']);
  assert.deepEqual(refused('#402030'), ['prune']);
  assert.deepEqual(refused('#603050'), ['prune']);
  assert.deepEqual(refused('#ED5FB1'), ['rose']);
  // The lilac the official site gives its sixth part: why ours takes our own violet instead.
  assert.deepEqual(refused('#C9ADFF'), ['lavande']);
  assert.deepEqual(refused('#E5CBFF'), []);
});

/** A purple, for the pairing rule: the hues from violet to plum, with enough chroma to be one. */
const purple = (hex: string): boolean => {
  const { c, h } = oklch(hex);
  return c >= 0.04 && h >= 285 && h <= 350;
};

void test('her five roles of line, in every theme of both token sets: never the official palette', () => {
  // Held by the gate of the first generation until lot F (scripts/mascot.test.ts): the five
  // roles are hers too — the turtle of her first states, the line of every form after.
  const colours = mascot2Colours().filter((line) => / turtle-/.test(line));
  const ROLES = ['turtle-accent', 'turtle-arc', 'turtle-eye', 'turtle-line', 'turtle-shell'];
  for (const set of TOKEN_SETS) {
    for (const theme of ['light', 'dark']) {
      const own = new Map(
        colours
          .filter((line) => line.startsWith(`${set} ${theme} `))
          .map((line) => [line.split(' ')[2] ?? '', line.split(' ')[3] ?? '']),
      );
      assert.deepEqual([...own.keys()].sort(), ROLES, `${set} ${theme}`);
      for (const [name, value] of own) {
        assert.match(value, /^#[0-9A-Fa-f]{6}$/, `${set} ${theme} ${name}`);
        // What makes the character is her body, her shell and her arcs; the eye is a dot, and
        // the accent is the charter's action colour, shown for a moment.
        if (name === 'turtle-eye' || name === 'turtle-accent') continue;
        assert.deepEqual(refused(value), [], `${set} ${theme} ${name} ${value}`);
      }
      // The pairing that makes the official one at a glance, whatever the exact tints: a light
      // purple body under a dark purple shell. In the light theme hers is the reverse; in the
      // dark theme her body is cream.
      const [body, shell] = [own.get('turtle-line') ?? '', own.get('turtle-shell') ?? ''];
      const theirs =
        purple(body) && purple(shell) && oklch(body).l >= 0.6 && oklch(shell).l <= 0.45;
      assert.ok(!theirs, `${set} ${theme}: a light purple body under a dark purple shell`);
    }
  }
  // The stylesheet every page ships declares the five roles, light and dark.
  const tokens = readFileSync(TOKENS_CSS_PATH, 'utf8');
  for (const name of ROLES) {
    assert.ok((tokens.match(new RegExp(`--${name}:`, 'g')) ?? []).length >= 3, name);
  }
});

void test('an arc grows from the crown, by whole steps, and never shows what is missing', () => {
  // src/lib/turtle.ts, held by the gate of the first generation until lot F: her arcs grow on
  // her shell, then on her wing, by the same rule.
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

  // The least each state shows never shrinks from one state to the next.
  for (const state of [1, 2, 3, 4] as const) {
    const before = STATE_ARCS[(state - 1) as TurtleState];
    STATE_ARCS[state].forEach((steps, index) => {
      assert.ok(steps >= (before[index] ?? 0), `state ${String(state)}, arc ${String(index)}`);
    });
  }
  assert.deepEqual(STATE_ARCS[0], [0, 0, 0]);
  assert.deepEqual(STATE_ARCS[4], [6, 6, 6]);
});

interface Tokens {
  color: Record<string, { $value?: string } | undefined>;
  'color-role': Record<string, Record<string, string> | undefined>;
}
const role = (path: string, theme: string, name: string): string => {
  const tokens = JSON.parse(readFileSync(path, 'utf8')) as Tokens;
  const raw = tokens['color-role'][theme]?.[name] ?? '';
  const colour = /^\{color\.([a-z0-9-]+)\}$/.exec(raw)?.[1];
  return colour === undefined ? raw : (tokens.color[colour]?.$value ?? raw);
};
/** Why a set of six tints may not be worn, tint by tint — empty when it may. */
function faults(set: PaletteSet, tokens: string): string[] {
  const out: string[] = [];
  for (const theme of ['light', 'dark'] as const) {
    assert.equal(set[theme].length, 6, 'six tints: one per part of the book');
    set[theme].forEach((tint, index) => {
      assert.match(tint, /^#[0-9A-F]{6}$/, `${theme} ${String(index + 1)}: ${tint}`);
      for (const drawn of ['turtle-arc', 'turtle-line']) {
        const ratio = contrastRatio(role(tokens, theme, drawn), tint);
        if (ratio < LINE_MIN) {
          out.push(
            `${theme} ${String(index + 1)} ${tint}: ${drawn} on it is ${ratio.toFixed(2)}:1`,
          );
        }
      }
      for (const zone of refused(tint)) out.push(`${theme} ${String(index + 1)} ${tint}: ${zone}`);
    });
    assert.equal(new Set(set[theme]).size, 6, `${theme}: two parts share a colour`);
  }
  return out;
}

void test('her colours: the palette she wears passes — our line on every tint, none in a refused range', () => {
  const palette = readPalette();
  const [main, neutral] = TOKEN_SETS;
  const names = Object.keys(palette.palettes);
  assert.ok(names.length > 0);
  if (palette.chosen !== null) {
    // The editor has chosen (D17.4): his palette must pass, whatever the others do.
    const chosen = palette.palettes[palette.chosen];
    assert.ok(chosen !== undefined, `"chosen" names no palette: ${palette.chosen}`);
    assert.deepEqual(faults(chosen, main), []);
  } else {
    // Not chosen yet: the first candidate is the one every other section of the sheet shows.
    const first = palette.palettes[names[0] ?? ''];
    assert.ok(first !== undefined);
    assert.deepEqual(faults(first, main), []);
  }
  // The neutral set stands ready (D14.12): it passes too, borrows no colour of the charter or of
  // the official site, and changes every tint between light and dark.
  assert.deepEqual(faults(palette.neutral, neutral), []);
  const borrowed = new Set([
    ...Object.values((JSON.parse(readFileSync(main, 'utf8')) as Tokens).color).map((c) =>
      c?.$value?.toUpperCase(),
    ),
    ...Object.values(palette.palettes).flatMap((set) => [...set.light, ...set.dark]),
  ]);
  for (const tint of [...palette.neutral.light, ...palette.neutral.dark]) {
    assert.ok(!borrowed.has(tint), `the neutral set borrows ${tint}`);
  }
  palette.neutral.light.forEach((tint, index) => {
    assert.notEqual(tint, palette.neutral.dark[index]);
  });
});

void test('her tints are roles of the two token sets, in a stylesheet of their own', () => {
  const palette = readPalette();
  assert.ok(palette.chosen !== null);
  const [main, neutral] = TOKEN_SETS;
  interface Roles {
    'mascot-role'?: Record<string, Record<string, string> | string | undefined>;
  }
  const names = [1, 2, 3, 4, 5, 6].map((n) => `mascot-tint-${String(n)}`);
  for (const [path, set] of [
    [main, palette.palettes[palette.chosen]],
    [neutral, palette.neutral],
  ] as const) {
    assert.ok(set !== undefined);
    const tokens = JSON.parse(readFileSync(path, 'utf8')) as Roles;
    const roles = tokens['mascot-role'];
    assert.ok(roles !== undefined, `${path} declares no mascot-role`);
    // The palette the editor chose is what she wears: the same values, in the order of the book.
    for (const theme of ['light', 'dark'] as const) {
      const declared: Record<string, string> | string | undefined = roles[theme];
      assert.ok(typeof declared === 'object');
      assert.deepEqual(Object.keys(declared), names, `${path} ${theme}`);
      assert.deepEqual(Object.values(declared), [...set[theme]], `${path} ${theme}`);
    }
    // The stylesheet of every page is built from the other roles, and knows nothing of these.
    assert.ok(!buildTokensCss(tokens as never).includes('mascot'), `${path}: tokens.css names her`);
    const hers = buildMascotTokensCss(tokens as never);
    for (const name of names) assert.equal(hers.split(`--${name}:`).length - 1, 3, name);
    assert.equal(hers.match(/--[a-z0-9-]+:/g)?.length, 18, 'six tints, in three places each');
  }
  // What is committed is what the script gives — for the main set, the one that is built.
  const tokens = JSON.parse(readFileSync(main, 'utf8')) as never;
  assert.equal(readFileSync(MASCOT_TOKENS_CSS_PATH, 'utf8'), buildMascotTokensCss(tokens));
  assert.equal(readFileSync(TOKENS_CSS_PATH, 'utf8'), buildTokensCss(tokens));
  assert.ok(!readFileSync(TOKENS_CSS_PATH, 'utf8').includes('mascot'));
  // Every tint her stylesheet asks for is one that sheet defines, and the reverse.
  const asked = new Set([...css.matchAll(/var\(--(mascot-tint-\d)\)/g)].map((m) => m[1] ?? ''));
  assert.deepEqual([...asked].sort(), names);
});

void test('what the sheet says of the charter’s vives is what the measure says', () => {
  // Kept as a fact of the file: three of them cannot be worn in light, three in dark.
  const charter = readPalette().palettes['charter'];
  if (charter === undefined) return;
  const found = faults(charter, TOKEN_SETS[0]);
  assert.ok(found.some((line) => line.includes('#ED5FB1') && line.endsWith('rose')));
  assert.ok(found.some((line) => line.startsWith('light 6 #7B13D6')));
  assert.ok(found.some((line) => line.startsWith('dark 4 #F9C900')));
});

void test('her look, as numbers: the sign she shows, the tint she may be given', () => {
  // A sign is read from the arc that is growing in her state, and from nothing else.
  assert.equal(signOf(0, [0, 0, 0]), 0);
  assert.equal(signOf(1, [5, 0, 0]), 0);
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((steps) => signOf(2, [6, steps, 0])),
    [0, 0, 0, 1, 1],
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((steps) => signOf(3, [6, 6, steps])),
    [0, 0, 0, 1, 2],
  );
  assert.equal(signOf(4, [6, 6, 6]), 0);
  // A tint is a whole number from 0 to 7, or it is none.
  assert.deepEqual([0, 3, 7, 8, -1, 2.5, '3', null].map(tintOf), [0, 3, 7, 0, 0, 0, 0, 0]);
  assert.deepEqual(lookOf({ state: 2 }), {
    state: 2,
    arcs: STATE_ARCS[2],
    pose: 'rest',
    tint: 0,
    sign: 0,
    passage: false,
  });
});

void test('her look, written: attributes only, on both sets of arcs, and the paths untouched', () => {
  const geometry = (source: string): string =>
    [...source.matchAll(/ (?:d|x|y|width|height|rx|cx|cy|r)="[^"]*"/g)].join('');
  for (const state of STATES) {
    const out = mascotMarkup(svg, { state, tint: 4, pose: 'look', passage: true, arcs: [6, 4, 2] });
    assert.equal(geometry(out), geometry(svg), `state ${String(state)}`);
    assert.match(out, new RegExp(`data-state="${String(state)}"`));
    assert.match(out, /data-passage="" data-pose="look" data-tint="4"/);
    assert.equal(out.match(/stroke-dasharray="6 6" stroke-dashoffset="0"/g)?.length, 3);
    assert.equal(out.match(/stroke-dasharray="4 6" stroke-dashoffset="-1"/g)?.length, 3);
    assert.equal(out.match(/stroke-dasharray="2 6" stroke-dashoffset="-2"/g)?.length, 3);
  }
  assert.doesNotMatch(mascotMarkup(svg, { state: 1 }), /data-passage/);

  // In a page: what a script writes on her is this list, in this order, and nothing else.
  const written: string[] = [];
  const arc = (name: string) => ({
    setAttribute: (attribute: string, value: string) =>
      void written.push(`${name} ${attribute}=${value}`),
  });
  const drawing: MascotDrawing = {
    setAttribute: (name, value) => void written.push(`${name}=${value}`),
    removeAttribute: (name) => void written.push(`${name}:removed`),
    toggleAttribute: (name, force) => {
      written.push(`${name}:${String(force)}`);
      return force === true;
    },
    querySelectorAll: (selector) => [arc(`${selector}#shell`), arc(`${selector}#wing`)],
  };
  applyMascotLook(drawing, {
    state: 3,
    arcs: [6, 6, 2],
    pose: 'rest',
    tint: 5,
    sign: 0,
    passage: true,
  });
  assert.deepEqual(written, [
    'data-state=3',
    'data-pose=rest',
    'data-tint=5',
    'data-sign=0',
    'data-passage:true',
    ...['.m-arc-1#shell', '.m-arc-1#wing'].flatMap((a) => [
      `${a} stroke-dasharray=6 6`,
      `${a} stroke-dashoffset=0`,
    ]),
    ...['.m-arc-2#shell', '.m-arc-2#wing'].flatMap((a) => [
      `${a} stroke-dasharray=6 6`,
      `${a} stroke-dashoffset=0`,
    ]),
    ...['.m-arc-3#shell', '.m-arc-3#wing'].flatMap((a) => [
      `${a} stroke-dasharray=2 6`,
      `${a} stroke-dashoffset=-2`,
    ]),
  ]);
  // A frame is a look and the beat it is: one attribute more, written last — or taken away.
  const look = lookOf({ state: 1 });
  written.length = 0;
  applyMascotFrame(drawing, { ...look, at: 0, phase: '01-wave' });
  assert.equal(written.at(-1), 'data-phase=01-wave');
  written.length = 0;
  applyMascotFrame(drawing, { ...look, at: 0, phase: null });
  assert.equal(written.at(-1), 'data-phase:removed');
});

// ---------------------------------------------------------------------------------------------
// Her movement (lot A2; D17.7, D17.8)
// ---------------------------------------------------------------------------------------------

/** What she is just before each passage and just after, as the game will have her. */
const BEFORE: Readonly<Record<string, Standing>> = {
  '01': { state: 0, arcs: [0, 0, 0], tint: 0 },
  '12': { state: 1, arcs: [3, 0, 0], tint: 0 },
  '23': { state: 2, arcs: [6, 5, 0], tint: 3 },
  '34': { state: 3, arcs: [6, 6, 5], tint: 3 },
};
const AFTER: Readonly<Record<string, Standing>> = {
  '01': { state: 1, arcs: [3, 0, 0], tint: 0 },
  '12': { state: 2, arcs: [6, 1, 0], tint: 0 },
  '23': { state: 3, arcs: [6, 6, 1], tint: 3 },
  '34': { state: 4, arcs: [6, 6, 6], tint: 3 },
};

void test('her choreography: four evolutions, each within its ceilings, each one passage', () => {
  // Under what WCAG 2.2.2 asks a pause for.
  const ceilings: number[] = [EVOLUTION_MAX_MS, MOVING_LIMIT_MS];
  assert.deepEqual(
    [...ceilings].sort((a, b) => a - b),
    ceilings,
  );
  assert.notEqual(ceilings[0], ceilings[1]);
  assert.deepEqual(STATES.map(passageTo), [null, ...PASSAGES]);
  for (const passage of PASSAGES) {
    const beats = [...FINDS, ...EVOLUTIONS[passage]];
    for (const beat of beats) {
      assert.match(beat.name, /^[a-z]+(?:-\d)?$/, `${passage}: a beat is called « ${beat.name} »`);
      assert.ok(beat.lasts > 0 && beat.lasts <= BEAT_MAX_MS, `${passage}-${beat.name}`);
    }
    assert.equal(new Set(beats.map((beat) => beat.name)).size, beats.length, passage);
    assert.ok(
      evolutionLasts(passage) <= EVOLUTION_MAX_MS,
      `${passage}: ${String(evolutionLasts(passage))} ms`,
    );
    // She takes her new state once, and the accent comes with it or after it — never before.
    const flips = beats.map((beat) => beat.flips === true);
    const accents = beats.map((beat) => beat.accent === true);
    assert.equal(flips.filter(Boolean).length, 1, `${passage}: she takes her new state once`);
    assert.equal(accents.filter(Boolean).length, 1, `${passage}: one accent`);
    assert.ok(accents.indexOf(true) >= flips.indexOf(true), `${passage}: the accent is early`);
    assert.ok(FINDS.every((beat) => beat.flips !== true && beat.accent !== true));
  }
});

void test('an evolution, as frames: the finds, the beats, then the still look — and never back', () => {
  for (const passage of PASSAGES) {
    const [from, to] = [BEFORE[passage], AFTER[passage]];
    assert.ok(from !== undefined && to !== undefined);
    const frames = evolution(from, to);
    const beats = [...FINDS, ...EVOLUTIONS[passage]];
    assert.equal(frames.length, beats.length + 1);
    assert.equal(frames[0]?.at, 0);
    assert.equal(framesLast(frames), evolutionLasts(passage));
    frames.forEach((frame, index) => {
      const beat = beats[index];
      const next = frames[index + 1];
      if (beat === undefined || next === undefined) return;
      assert.equal(frame.phase, `${passage}-${beat.name}`);
      assert.equal(next.at - frame.at, beat.lasts);
      // Never back, and never further than the state she is passing to.
      assert.ok(next.state >= frame.state && frame.state >= from.state && next.state <= to.state);
      assert.equal(frame.tint, from.tint, 'an evolution never changes the colour she was given');
    });
    const flip = beats.findIndex((beat) => beat.flips === true);
    assert.deepEqual(
      frames.slice(0, -1).map((frame) => frame.state),
      beats.map((_, index) => (index < flip ? from.state : to.state)),
    );
    // Her arc grows when the finds have reached her — not before, and on the form she has.
    assert.deepEqual(frames[0].arcs, from.arcs);
    assert.deepEqual(frames[1]?.arcs, from.arcs);
    assert.deepEqual(frames[2]?.arcs, to.arcs);
    // The last frame is the still look of the state she has passed to, the accent on.
    assert.deepEqual(frames.at(-1), {
      ...lookOf({ state: to.state, arcs: to.arcs, tint: to.tint, passage: true }),
      at: evolutionLasts(passage),
      phase: null,
    });
    // Less motion, an evolution skipped, a state that comes back: that last look, at once.
    assert.deepEqual(withoutMotion(frames), [{ ...frames.at(-1), at: 0 }]);
  }
  assert.deepEqual(withoutMotion([]), []);

  // The end of a round that changes no state: the finds come to her, her arc grows, no accent.
  const same = evolution(
    { state: 2, arcs: [6, 2, 0], tint: 4 },
    { state: 2, arcs: [6, 3, 0], tint: 4 },
  );
  assert.deepEqual(
    same.map((frame) => frame.phase),
    ['end-in', 'end-to', null],
  );
  assert.ok(framesLast(same) <= GESTURE_MAX_MS);
  assert.deepEqual(same.at(-1), {
    ...lookOf({ state: 2, arcs: [6, 3, 0], tint: 4 }),
    at: framesLast(same),
    phase: null,
  });
  assert.ok(same.every((frame) => !frame.passage));
  // She never goes back: asked to, she stays as she is, and nothing plays.
  assert.deepEqual(
    evolution({ state: 3, arcs: [6, 6, 2], tint: 1 }, { state: 2, arcs: [6, 1, 0], tint: 1 }),
    [{ ...lookOf({ state: 3, arcs: [6, 6, 2], tint: 1 }), at: 0, phase: null }],
  );
  // A leap of several states is not played: the look she lands on, with no accent.
  assert.deepEqual(
    evolution({ state: 0, arcs: [0, 0, 0], tint: 0 }, { state: 3, arcs: [6, 6, 1], tint: 0 }),
    [{ ...lookOf({ state: 3, arcs: [6, 6, 1], tint: 0 }), at: 0, phase: null }],
  );
});

void test('her figure and the move for a word found: short, and she comes back as she was', () => {
  for (const state of STATES) {
    const look = lookOf({ state, tint: 2 });
    for (const [frames, pose, held] of [
      [trick(look), 'trick', TRICK_HOLD_MS[state]],
      [pulse(look), 'pulse', PULSE_HOLD_MS],
    ] as const) {
      assert.deepEqual(frames, [
        { ...look, pose, at: 0, phase: null },
        { ...look, pose: 'rest', at: held, phase: null },
      ]);
      assert.ok(framesLast(frames) <= GESTURE_MAX_MS, `state ${String(state)}, ${pose}`);
    }
  }
  // The same move whatever was chosen: nothing of a choice goes in.
  assert.equal(pulse.length, 1);
});

/** The durations of the site (design/tokens.json), in milliseconds, as the stylesheet names them. */
const tokenMs = (): Record<string, number> => {
  const tokens = JSON.parse(readFileSync(TOKEN_SETS[0], 'utf8')) as {
    motion: { duration: Record<string, string> };
  };
  return Object.fromEntries(
    Object.entries(tokens.motion.duration)
      .filter(([, value]) => /^\d+ms$/.test(value))
      .map(([name, value]) => [`--duration-${name}`, parseInt(value, 10)]),
  );
};

void test('her stylesheet moves her only on a gesture, only as allowed, and never without end', () => {
  const cut = css.indexOf('@media (prefers-reduced-motion: no-preference)');
  assert.ok(cut > 0, 'the stylesheet has no block for those who did not ask for less motion');
  const still = css.slice(0, cut).replace(/\/\*[\s\S]*?\*\//g, '');
  const moving = css.slice(cut).replace(/\/\*[\s\S]*?\*\//g, '');
  // Whoever asked for less motion gets none: every movement is inside that one block…
  assert.doesNotMatch(still, /transition|animation|@keyframes/);
  assert.equal(css.match(/@media/g)?.length, 1);
  // …which is the last thing in the file, and closes with it.
  assert.match(moving, /\}\s*\}\s*$/);

  // Inside it, she moves only once the script has said she may (`data-live`): a page that
  // loads plays nothing. The one rule without it is the one that stops her.
  const movingRules = [...moving.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ selector: (m[1] ?? '').trim().replace(/\s+/g, ' '), body: m[2] ?? '' }))
    .filter(
      (rule) =>
        !/^(?:\d+(?:\.\d+)?%|from|to)(?:\s*,\s*(?:\d+(?:\.\d+)?%|from|to))*$/.test(rule.selector),
    )
    .map((rule) => ({ ...rule, selector: rule.selector.replace(/^@media[^{]*\{\s*/, '') }));
  const stops = movingRules.filter((rule) => rule.selector === '.mascot:not([data-live]) *');
  assert.equal(stops.length, 1);
  assert.match(stops[0]?.body ?? '', /^\s*transition-property:\s*none;\s*$/);
  for (const rule of movingRules) {
    if (rule === stops[0] || rule.selector.startsWith('@keyframes')) continue;
    for (const one of rule.selector.split(',').map((part) => part.trim())) {
      assert.match(one, /^\.mascot\[data-live\]/, `« ${one} » moves without data-live`);
    }
    assert.match(rule.body, /^\s*(?:(?:transition|animation)[a-z-]*:[^;]+;\s*)+$/, rule.selector);
  }

  // What moves: a transform, an opacity, the offset of the dash of a line that is written.
  const MAY_MOVE = new Set(['transform', 'opacity', 'stroke-dashoffset']);
  for (const [, list] of moving.matchAll(/transition:([^;]+);/g)) {
    for (const part of (list ?? '').split(',')) {
      const property = part.trim().split(/\s+/)[0] ?? '';
      assert.ok(MAY_MOVE.has(property), `a transition of « ${property} »`);
    }
  }
  const keyframes = [...moving.matchAll(/@keyframes (m-[a-z]+) \{((?:[^{}]*\{[^{}]*\})+)\s*\}/g)];
  assert.ok(keyframes.length > 0);
  for (const [, name, body] of keyframes) {
    for (const [, property] of (body ?? '').matchAll(/(?:\{|;)\s*([a-z-]+)\s*:/g)) {
      assert.ok(
        MAY_MOVE.has(property ?? ''),
        `@keyframes ${name ?? ''} moves « ${property ?? ''} »`,
      );
    }
  }

  // How long: only the durations of the site and her own, which are multiples of them — never a
  // number of milliseconds typed here — and none longer than a beat may be.
  const tokens = tokenMs();
  const own = Object.fromEntries(
    [...bare.matchAll(/(--m-[a-z]+):\s*calc\(var\((--[a-z-]+)\) \* ([\d.]+)\)/g)].map((m) => [
      m[1] ?? '',
      { of: m[2] ?? '', times: Number(m[3]) },
    ]),
  );
  const ms = (name: string): number => {
    const mine = own[name];
    if (mine !== undefined) return ms(mine.of) * mine.times;
    const token = tokens[name];
    assert.ok(token !== undefined, `the stylesheet names a duration nobody defines: ${name}`);
    return token;
  };
  assert.doesNotMatch(moving, /\d(?:ms|s)\b/, 'a duration is typed in the stylesheet');
  const timed = [...moving.matchAll(/(?:transition|animation)[a-z-]*:([^;]+);/g)].map(
    (m) => m[1] ?? '',
  );
  const durations = timed.flatMap((value) =>
    [...value.matchAll(/var\((--[a-z-]+)\)/g)].map((m) => m[1] ?? ''),
  );
  assert.ok(durations.length > 0);
  for (const name of new Set(durations)) {
    if (name.startsWith('--easing-')) continue;
    assert.ok(ms(name) <= BEAT_MAX_MS, `${name} is ${String(ms(name))} ms`);
  }
  // …multiplied, where something must wait its turn, into no more than a beat either.
  for (const value of timed) {
    for (const [, name, times] of value.matchAll(/calc\(var\((--[a-z-]+)\) \* ([\d.]+)\)/g)) {
      const lasts = ms(name ?? '') * Number(times);
      assert.ok(lasts <= BEAT_MAX_MS, `${name ?? ''} × ${times ?? ''} is ${String(lasts)} ms`);
    }
  }

  // Never a flash (WCAG 2.3.1; design/motion-spec.md). What is large — a wave, the water that
  // closes over her, a sky — comes or goes in one slow ramp, 350 ms at least…
  const large = movingRules.find((rule) => rule.selector.includes('.m-dusk'));
  assert.ok(large !== undefined);
  for (const part of ['.m-wave', '.m-swell', '.m-surge', '.m-dusk']) {
    assert.ok(large.selector.split(', ').includes(`.mascot[data-live] ${part}`), part);
  }
  const ramps = [...large.body.matchAll(/var\((--(?:m|duration)-[a-z]+)\)/g)].map(
    (m) => m[1] ?? '',
  );
  assert.equal(ramps.length, 2);
  for (const name of ramps) assert.ok(ms(name) >= 350, `${name}: ${String(ms(name))} ms`);
  // …and the drops of foam, which are the accent, come one, then two, 350 ms apart at least.
  const foam = movingRules.find((rule) => rule.selector.includes("[data-phase='01-foam']"));
  const apart = /transition-delay:\s*calc\(var\((--[a-z-]+)\) \* ([\d.]+)\)/.exec(foam?.body ?? '');
  assert.ok(apart !== null && ms(apart[1] ?? '') * Number(apart[2]) >= 350);

  // Never without end: every animation plays a counted number of times, three at most.
  assert.ok(!bare.includes('infinite'), 'an animation runs without end');
  assert.doesNotMatch(moving, /alternate|forwards|both|steps\(|paused/);
  const played = [...moving.matchAll(/animation:\s*(m-[a-z]+)\s+var\((--[a-z-]+)\)[^;]*?(\d+)?;/g)];
  assert.ok(played.length > 0);
  const names = new Set(keyframes.map((k) => k[1]));
  for (const [, name, duration, times] of played) {
    assert.ok(names.has(name), `an animation nobody wrote: ${name ?? ''}`);
    const lasts = ms(duration ?? '') * Number(times ?? '1');
    assert.ok(
      Number(times ?? '1') <= 3 && lasts <= GESTURE_MAX_MS,
      `${name ?? ''}: ${String(lasts)} ms`,
    );
  }
  for (const name of names) {
    assert.ok(
      played.some((p) => p[1] === name),
      `@keyframes ${name ?? ''} is never played`,
    );
  }
});

void test('every beat the choreography names is one the stylesheet knows, and the reverse', () => {
  const known = new Set(
    [...bare.matchAll(/\[data-phase='([a-z0-9-]+)'\]/g)].map((m) => m[1] ?? ''),
  );
  const prefixes = [...bare.matchAll(/\[data-phase\^='([a-z0-9-]+)'\]/g)].map((m) => m[1] ?? '');
  const suffixes = [...bare.matchAll(/\[data-phase\$='([a-z0-9-]+)'\]/g)].map((m) => m[1] ?? '');
  const named = new Set<string>();
  for (const passage of PASSAGES) {
    for (const beat of [...FINDS, ...EVOLUTIONS[passage]]) named.add(`${passage}-${beat.name}`);
  }
  for (const beat of FINDS) named.add(`end-${beat.name}`);
  // A beat where nothing changes would be a pause nobody decided: every beat is held by a rule,
  // or lets go of what the beat before it held, or is where she takes her new state or her
  // accent. And a rule for a beat nobody plays would be a look nobody has seen.
  const held = (phase: string): boolean =>
    known.has(phase) ||
    prefixes.some((prefix) => phase.startsWith(prefix)) ||
    suffixes.some((suffix) => phase.endsWith(suffix));
  for (const passage of PASSAGES) {
    const beats = [...FINDS, ...EVOLUTIONS[passage]];
    beats.forEach((beat, index) => {
      const before = beats[index - 1];
      assert.ok(
        held(`${passage}-${beat.name}`) ||
          (before !== undefined && held(`${passage}-${before.name}`)) ||
          beat.flips === true ||
          beat.accent === true,
        `nothing changes at the beat « ${passage}-${beat.name} »`,
      );
    });
  }
  for (const phase of known)
    assert.ok(named.has(phase), `the stylesheet holds « ${phase} », which no evolution plays`);
  for (const prefix of prefixes) {
    assert.ok(
      [...named].some((phase) => phase.startsWith(prefix)),
      `[data-phase^='${prefix}']`,
    );
  }
  assert.deepEqual([...new Set(suffixes)].sort(), ['-in', '-to']);
});

void test('what three browsers measured of her movement is of today’s drawing, and within the rules', () => {
  const motion = readMotion();
  assert.ok(
    motion !== null,
    `${MASCOT2_MOTION_PATH} is missing: npx tsx scripts/mascot2-motion.ts --write`,
  );
  assert.equal(
    motion.drawing_sha256,
    mascot2Fingerprint(),
    `${MASCOT2_MOTION_PATH} measures another drawing: npx tsx scripts/mascot2-motion.ts --write`,
  );
  assert.match(motion.measured_on, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(Object.keys(motion.browsers).sort(), ['chromium', 'firefox', 'webkit']);
  for (const passage of PASSAGES) {
    const clip: ClipMeasure | undefined = motion.clips[passage];
    assert.ok(clip !== undefined, `${passage} was not measured`);
    assert.equal(clip.lasts_ms, evolutionLasts(passage));
    assert.equal(Object.keys(clip.moving_ms).length, 3);
    for (const [engine, ends] of Object.entries(clip.moving_ms)) {
      assert.ok(ends > 0 && ends <= EVOLUTION_MAX_MS, `${passage}, ${engine}: ${String(ends)} ms`);
    }
    assert.ok(clip.spill_px <= 2, `${passage}: ${String(clip.spill_px)} px out of her frame`);
    assert.ok(clip.flashes !== undefined && clip.frames !== undefined, passage);
    for (const theme of ['light', 'dark'] as const) {
      const f: FlashMeasure = clip.flashes[theme];
      assert.ok(f.flashes_per_second <= FLASHES_PER_SECOND_MAX, `${passage}, ${theme}`);
      assert.ok(f.red_flashes_per_second <= FLASHES_PER_SECOND_MAX, `${passage}, ${theme}, red`);
      // The aim is above the rule: the scene as a whole never goes dark and light again.
      assert.equal(f.scene_pairs, 0, `${passage}, ${theme}: the whole scene flashes`);
    }
    assert.ok(clip.frames.over_50 === 0 && clip.frames.over_20_pct <= 5, `${passage}: frames`);
  }
  const gestures = Object.entries(motion.clips).filter(([name]) => !/^\d\d$/.test(name));
  assert.ok(gestures.length >= 2 * STATES.length);
  for (const [name, clip] of gestures) {
    for (const [engine, ends] of Object.entries(clip.moving_ms)) {
      assert.ok(ends > 0 && ends <= GESTURE_MAX_MS, `${name}, ${engine}: ${String(ends)} ms`);
    }
    assert.ok(clip.spill_px <= 2, `${name}: ${String(clip.spill_px)} px out of her frame`);
  }
});

void test('the sheet the editor validates is the sheet of today’s drawing', () => {
  const page = sheet();
  // Compared as a fact, not as two texts: a stale sheet says so in one line, not in fifty pages.
  assert.ok(
    readFileSync(MASCOT2_SHEET_PATH, 'utf8') === page,
    `${MASCOT2_SHEET_PATH} is stale: npx tsx scripts/mascot2-sheet.ts`,
  );
  // It opens from the file system, and asks nothing of anybody: no file, no address but the
  // name of the SVG vocabulary, which is not fetched.
  assert.ok(!/<script[^>]+src=|<link\b|@import|url\(/.test(page), 'the sheet loads something');
  assert.deepEqual(
    [...new Set(page.match(/https?:\/\/[^"'\s<>]+/g) ?? [])],
    ['http://www.w3.org/2000/svg'],
  );
  assert.equal(page.match(/<script>/g)?.length, 1);
});

void test('a validation is a date bound to what was looked at — or it is not there', () => {
  const validation = readValidation();
  assert.ok(validation !== null);
  const today = mascot2Fingerprint();
  assert.ok(today !== null);
  for (const [date, bound, name] of [
    [validation.validated_on, validation.drawing_sha256, 'validated_on'],
    [
      validation.same_character_asked_on,
      validation.same_character_sha256,
      'same_character_asked_on',
    ],
  ] as const) {
    if (date === null) {
      assert.equal(bound, null, `${name} is not set: its fingerprint must not be either`);
    } else {
      assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(bound, today, `${name}: the drawing changed since — set it back to null`);
      assert.notEqual(
        readPalette().chosen,
        null,
        'a sheet cannot be dated before the palette is chosen',
      );
    }
  }
  // Her colours, as the fingerprint reads them: the five roles she shares with the turtle, in
  // both sets and both themes, and her tints.
  const colours = mascot2Colours();
  const shared = colours.filter((line) => / turtle-/.test(line));
  assert.equal(shared.length, 20);
  assert.ok(colours.some((line) => line.includes(' mascot-tint-6 ')));
  assert.ok(MASCOT2_PALETTE_PATH.length > 0);
});
