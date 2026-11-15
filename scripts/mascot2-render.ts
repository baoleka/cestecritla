/**
 * The second-generation mascot, as three browsers draw it (lot A1 of
 * docs/discovery/PLAN-TORTUE.md) — the part of her gates that a parser cannot hold.
 *
 *   npx tsx scripts/mascot2-render.ts [--engines chromium,firefox,webkit] [--shots <dir>]
 *
 * For every state, every pose, every sign and at a passage, in each engine:
 *
 *   - what is seen is what src/lib/mascot2.ts says is seen (`SHAPES_SEEN`), shape for shape — so
 *     the ceiling « at most eighteen shapes in a state » is counted on the drawing as drawn, not
 *     on a list somebody typed;
 *   - nothing of her leaves her frame: she never moves along the page, and never spills on the
 *     word beside her;
 *   - the sheet the editor validates draws every figure it announces.
 *
 * It reads the drawing, its stylesheet and the committed sheet. It needs no build and touches
 * no network. `--shots` writes what each engine drew, for a look.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ENGINES, checker, report, type Outcome } from './e2e-kit.js';
import {
  MAX_SHAPES_SEEN,
  SHAPES_SEEN,
  mascotMarkup,
  type LookOptions,
  type TurtleState,
} from '../src/lib/mascot2.js';
import { MASCOT2_CSS_PATH, MASCOT2_SHEET_PATH, MASCOT2_SVG_PATH } from './mascot2-kit.js';

const STATES: readonly TurtleState[] = [0, 1, 2, 3, 4];
const args = process.argv.slice(2);
const shots = args.includes('--shots') ? (args[args.indexOf('--shots') + 1] ?? null) : null;

const svg = readFileSync(MASCOT2_SVG_PATH, 'utf8').trim();
const css = readFileSync(MASCOT2_CSS_PATH, 'utf8');

/** Colours that are all different, so that a shape drawn in the wrong role would show. */
const ROLES =
  '--turtle-line:#4C0297;--turtle-shell:#E5CBFF;--turtle-arc:#4C0297;--turtle-eye:#FFFCF4;--turtle-accent:#D1271C;' +
  [1, 2, 3, 4, 5, 6].map((n) => `--mascot-tint-${String(n)}:#F9A89E`).join(';');

/** Every look worth drawing: the states with all they can show, their poses, signs, passages. */
const LOOKS: readonly (LookOptions & { name: string })[] = [
  // Every arc grown, and no sign: what a state shows at most of itself (a sign adds a star).
  ...STATES.map((state) => ({
    name: `state ${String(state)}`,
    state,
    arcs: [6, 6, 6] as const,
    sign: 0 as const,
  })),
  ...STATES.map((state) => ({
    name: `state ${String(state)}, hint`,
    state,
    pose: 'look' as const,
  })),
  ...STATES.map((state) => ({ name: `state ${String(state)}, passage`, state, passage: true })),
  { name: 'state 0, touched', state: 0, pose: 'up' },
  { name: 'state 1, touched', state: 1, pose: 'up' },
  { name: 'state 2, a change is near', state: 2, sign: 1, tint: 3 },
  { name: 'state 3, a change is near', state: 3, sign: 1, tint: 3 },
  { name: 'state 3, a change is nearer', state: 3, sign: 2, tint: 3 },
];

const page = (): string =>
  `<!doctype html><meta charset="utf-8"><style>body{margin:24px;background:#FFFCF4}figure{display:inline-block;margin:24px}${css}</style><div style="${ROLES}">${LOOKS.map((look, index) => `<figure id="f${String(index)}" style="--mascot-size:240px">${mascotMarkup(svg, look)}</figure>`).join('')}</div>`;

interface Seen {
  /** First class of each shape that can be seen, in the order of the file. */
  shapes: string[];
  /** How far the furthest shape reaches out of her frame, in CSS pixels; 0 when none does. */
  spill: number;
}

/** What a figure shows, read in the page: opacity through its ancestors, visibility, extent. */
const SEEN = `(id) => {
  const figure = document.getElementById(id);
  const frame = figure.querySelector('svg').getBoundingClientRect();
  const shapes = [];
  let spill = 0;
  for (const shape of figure.querySelectorAll('path, rect, circle')) {
    let opacity = 1;
    for (let node = shape; node !== null && node !== figure; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity);
    }
    if (opacity === 0 || getComputedStyle(shape).visibility === 'hidden') continue;
    const box = shape.getBoundingClientRect();
    // The water that closes over her once lies flat at her feet the rest of the time: a shape
    // with no height is not seen.
    if (box.width === 0 || box.height === 0) continue;
    shapes.push(shape.classList[0]);
    spill = Math.max(spill, frame.left - box.left, box.right - frame.right, frame.top - box.top, box.bottom - frame.bottom);
  }
  return { shapes, spill: Math.max(0, spill) };
}`;

async function run(engine: string): Promise<Outcome> {
  const { out, check } = checker(engine);
  const type = ENGINES[engine];
  if (type === undefined) throw new Error(`unknown engine: ${engine}`);
  const browser = await type.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const tab = await context.newPage();
    const errors: string[] = [];
    tab.on('pageerror', (error) => errors.push(error.message));
    await tab.setContent(page());

    for (const [index, look] of LOOKS.entries()) {
      const seen = await tab.evaluate<Seen>(`(${SEEN})('f${String(index)}')`);
      // A stroke is drawn half outside its path: two pixels of a frame of 240 is its width.
      check(
        `${look.name}: nothing leaves her frame`,
        seen.spill <= 2,
        `${seen.spill.toFixed(1)} px`,
      );
      check(
        `${look.name}: at most ${String(MAX_SHAPES_SEEN[look.state])} shapes`,
        seen.shapes.length <= MAX_SHAPES_SEEN[look.state],
        String(seen.shapes.length),
      );
    }
    // The census of src/lib/mascot2.ts, state by state, at rest with every arc grown.
    for (const state of STATES) {
      const seen = await tab.evaluate<Seen>(`(${SEEN})('f${String(state)}')`);
      const expected = [...SHAPES_SEEN[state]].sort().join(' ');
      check(
        `state ${String(state)}: the shapes seen are the ones the sheet counts`,
        [...seen.shapes].sort().join(' ') === expected,
        `seen: ${[...seen.shapes].sort().join(' ')}`,
      );
    }
    if (shots !== null) {
      mkdirSync(shots, { recursive: true });
      await tab.screenshot({ path: join(shots, `looks-${engine}.png`), fullPage: true });
    }

    // The sheet itself: every figure it announces is drawn, and its script throws nothing.
    await tab.goto(`file://${resolve(MASCOT2_SHEET_PATH)}`);
    const sheet = await tab.evaluate<{ boxes: number; drawn: number }>(`(() => {
      const boxes = [...document.querySelectorAll('[data-look]')];
      return { boxes: boxes.length, drawn: boxes.filter((box) => box.querySelector('svg.mascot') !== null).length };
    })()`);
    check(
      'the sheet draws every figure it announces',
      sheet.boxes > 0 && sheet.drawn === sheet.boxes,
      `${String(sheet.drawn)} of ${String(sheet.boxes)}`,
    );
    check('the sheet throws no error', errors.length === 0, errors.join(' ; '));
    if (shots !== null) {
      await tab.screenshot({ path: join(shots, `sheet-${engine}.png`), fullPage: true });
    }
    await context.close();
  } finally {
    await browser.close();
  }
  return out;
}

await report(run, args);
