/**
 * The second-generation mascot, held (lot A1 of docs/discovery/PLAN-TORTUE.md; D17.1 to D17.15):
 * what her drawing may contain, what her stylesheet may do, what her colours must measure, and
 * that the sheet the editor validates is the sheet of today's drawing.
 *
 * What only a browser can see — which shapes show in a state, whether anything leaves her
 * frame — is scripts/mascot2-render.ts, in three engines.
 *
 * The turtle that is online keeps her own gate (scripts/mascot.test.ts), untouched: this file
 * holds a drawing nothing serves yet.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import {
  MAX_BOTH_BYTES,
  MAX_DRAWING_BYTES,
  MAX_SHAPES_IN_FILE,
  MAX_SHAPES_SEEN,
  MAX_STYLESHEET_BYTES,
  SHAPES_SEEN,
  STATE_ARCS,
  applyMascotLook,
  lookOf,
  mascotMarkup,
  signOf,
  tintOf,
  type TurtleState,
} from '../src/lib/mascot2.js';
import { TOKEN_SETS, TURTLE_SVG_PATH } from './launch.js';
import {
  LINE_MIN,
  MASCOT2_CSS_PATH,
  MASCOT2_PALETTE_PATH,
  MASCOT2_SHEET_PATH,
  MASCOT2_SVG_PATH,
  contrastRatio,
  mascot2Colours,
  mascot2Fingerprint,
  readPalette,
  refused,
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
  assert.equal(root.attributes['viewBox'], '0 0 96 60', 'the frame of the turtle that is online');
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

void test('state 0 is the turtle that is online: the same shapes, to the last number', () => {
  const online = elements(readFileSync(TURTLE_SVG_PATH, 'utf8')).filter((e) =>
    ['path', 'rect', 'circle'].includes(e.tag),
  );
  const geometry = (shape: Shape): string =>
    ['d', 'x', 'y', 'width', 'height', 'rx', 'cx', 'cy', 'r']
      .map((name) => shape.attributes[name] ?? '')
      .join('|');
  const hers = new Set(shapes.map(geometry));
  // All of her but the accent dot of her shell, which D17.6 replaces by a detail of each scene.
  const kept = online.filter((shape) => !shape.classes.includes('t-accent'));
  assert.equal(kept.length, 10);
  for (const shape of kept) assert.ok(hers.has(geometry(shape)), `missing: ${geometry(shape)}`);
});

void test('her three arcs are there twice — on the shell, on the wing — and written as not grown', () => {
  for (const n of [1, 2, 3]) {
    const arcs = shapes.filter((shape) => shape.classes.includes(`m-arc-${String(n)}`));
    assert.equal(arcs.length, 2, `arc ${String(n)}`);
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
  for (const { selector, body } of rules) {
    if (selector.includes('.m-arc')) assert.doesNotMatch(body, /stroke-dash/, selector);
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
    assert.equal(out.match(/stroke-dasharray="6 6" stroke-dashoffset="0"/g)?.length, 2);
    assert.equal(out.match(/stroke-dasharray="4 6" stroke-dashoffset="-1"/g)?.length, 2);
    assert.equal(out.match(/stroke-dasharray="2 6" stroke-dashoffset="-2"/g)?.length, 2);
  }
  assert.doesNotMatch(mascotMarkup(svg, { state: 1 }), /data-passage/);

  // In a page: what a script writes on her is this list, in this order, and nothing else.
  const written: string[] = [];
  const arc = (name: string) => ({
    setAttribute: (attribute: string, value: string) =>
      void written.push(`${name} ${attribute}=${value}`),
  });
  applyMascotLook(
    {
      setAttribute: (name, value) => void written.push(`${name}=${value}`),
      toggleAttribute: (name, force) => {
        written.push(`${name}:${String(force)}`);
        return force === true;
      },
      querySelectorAll: (selector) => [arc(`${selector}#shell`), arc(`${selector}#wing`)],
    },
    { state: 3, arcs: [6, 6, 2], pose: 'rest', tint: 5, sign: 0, passage: true },
  );
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
  assert.equal(colours.filter((line) => / turtle-/.test(line)).length, 20);
  assert.ok(colours.some((line) => line.includes(' mascot-tint-6 ')));
  assert.ok(MASCOT2_PALETTE_PATH.length > 0);
});

void test('nothing that is served knows her yet: no page, component or script imports her', () => {
  const tracked = execFileSync('git', ['ls-files', 'src'], { encoding: 'utf8' })
    .split('\n')
    .filter((path) => /\.(?:astro|ts|css)$/.test(path))
    .filter((path) => !['src/lib/mascot2.ts', 'src/styles/mascot2.css'].includes(path));
  for (const path of tracked) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), /mascot2|mascot\/v2/, path);
  }
});
