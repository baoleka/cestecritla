/**
 * The second-generation mascot in motion, as three browsers play it (lot A2 of
 * docs/discovery/PLAN-TORTUE.md; D17.7, D17.8) — the part of her gates that only a browser
 * holds, measured on the very sheet the editor validates (design/mascot/v2/planche.html).
 *
 *   npx tsx scripts/mascot2-motion.ts [--engines chromium,firefox,webkit] [--write] [--film <dir>]
 *
 * In each engine:
 *
 *   - she never moves alone: a page that has just loaded plays nothing and writes nothing;
 *   - every clip — the four evolutions, a figure per state, the move for a word found, the end
 *     of a round — ends when the choreography says it ends (4,5 s at most for an evolution,
 *     900 ms for a gesture), and leaves her exactly as the still look draws her;
 *   - nothing of her leaves her frame while she moves;
 *   - « Passer » gives the final look at once, and nothing moves after it;
 *   - with reduced motion — the box of the sheet, or the setting of the system — nothing moves
 *     at all, even if a script were to write every beat on her.
 *
 * In Chromium, two more measures:
 *
 *   - flashes (WCAG 2.3.1): each evolution is filmed frame by frame, slowed down so that no
 *     frame is missed, in both themes; every pixel is followed for pairs of opposing changes of
 *     light of 10 % or more, and of saturated red;
 *   - frames, with the processor slowed four times.
 *
 * `--write` records what was measured in design/mascot/v2/motion.json, bound to the fingerprint
 * of the drawing: the sheet prints it, and a retouch makes it stale (scripts/mascot2.test.ts).
 * `--film` writes, for a look, what Chromium filmed of each evolution.
 *
 * It reads the committed sheet. It needs no build and touches no network.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Page } from 'playwright';
import { ENGINES, checker, report, type Outcome } from './e2e-kit.js';
import {
  EVOLUTION_MAX_MS,
  GESTURE_MAX_MS,
  MOVING_LIMIT_MS,
  PASSAGES,
  evolutionLasts,
} from '../src/lib/mascot2.js';
import {
  MASCOT2_MOTION_PATH,
  MASCOT2_SHEET_PATH,
  REACH_IN_PAGE,
  mascot2Fingerprint,
  type ClipMeasure,
  type FlashMeasure,
  type MotionMeasures,
} from './mascot2-kit.js';
import { differing, flashesOf, readPng, withinFlashRule, type Picture } from './picture-kit.js';

const args = process.argv.slice(2);
const value = (flag: string): string | null =>
  args.includes(flag) ? (args[args.indexOf(flag) + 1] ?? null) : null;
const film = value('--film');
const write = args.includes('--write');

/** A timer of a browser is not a metronome: what a frame or two may add to an end. */
const SLACK_MS = 60;
/** How long a page is watched for a movement nobody asked for (design/perf-budget.md, P7). */
const ALONE_MS = 2100;
/**
 * Two pictures of the same look are the same picture — give or take the few pixels of an edge
 * that a browser has painted again after an animation crossed it. A look that was not the same
 * would differ by hundreds.
 */
const REPAINTED = 8;
/** How many times slower she is filmed, and how far apart the frames are, in her own time. */
const FILM_SLOW = 12;
const FILM_EVERY_MS = 1000 / 30;

/** What the page is asked, as text: helpers installed once, then called by name. */
const HELPERS = `(() => {
  const boxes = (clip) => [...document.querySelectorAll('[data-clip="' + clip + '"]')];
  const running = (clip) =>
    boxes(clip).reduce(
      (count, box) => count + box.querySelector('svg').getAnimations({ subtree: true }).length,
      0,
    );
  const reach = ${REACH_IN_PAGE};
  const spill = (clip) => {
    const svg = boxes(clip)[0].querySelector('svg');
    const frame = svg.getBoundingClientRect();
    let out = 0;
    for (const shape of svg.querySelectorAll('path, rect, circle')) {
      let opacity = 1;
      for (let node = shape; node !== svg; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      if (opacity < 0.02 || getComputedStyle(shape).visibility === 'hidden') continue;
      const box = shape.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      out = Math.max(out, reach(shape, frame));
    }
    return Math.max(0, out);
  };
  const press = (kind, clip) => document.querySelector('[data-' + kind + '="' + clip + '"]').click();
  // Presses a button, then watches every frame: when the last movement ends, how far she
  // reaches out of her frame, how long each frame took.
  const watch = (kind, clip, forMs, measureSpill) =>
    new Promise((done) => {
      const out = { ends: 0, spill: 0, deltas: [], phases: 0 };
      if (kind !== null) press(kind, clip);
      const start = performance.now();
      let last = start;
      const tick = (now) => {
        out.deltas.push(now - last);
        last = now;
        if (running(clip) > 0) out.ends = now - start;
        if (measureSpill) out.spill = Math.max(out.spill, spill(clip));
        if (boxes(clip).some((box) => box.querySelector('svg').hasAttribute('data-phase'))) out.phases += 1;
        if (now - start < forMs) requestAnimationFrame(tick);
        else done(out);
      };
      requestAnimationFrame(tick);
    });
  // Presses « Jouer » and times every frame, doing nothing else: what the measure must not slow.
  const frames = (clip, forMs) =>
    new Promise((done) => {
      const deltas = [];
      press('play', clip);
      const start = performance.now();
      let last = start;
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        if (now - start < forMs) requestAnimationFrame(tick);
        else done(deltas);
      };
      requestAnimationFrame(tick);
    });
  // Counts what is written on any drawing of the page, and what plays on it, for a while.
  const alone = (forMs) =>
    new Promise((done) => {
      let written = 0;
      let played = 0;
      const observer = new MutationObserver((records) => { written += records.length; });
      for (const svg of document.querySelectorAll('svg.mascot')) {
        observer.observe(svg, { attributes: true, subtree: true });
      }
      const start = performance.now();
      const tick = (now) => {
        played = Math.max(played, document.getAnimations().length);
        if (now - start < forMs) requestAnimationFrame(tick);
        else { observer.disconnect(); done({ written, played }); }
      };
      requestAnimationFrame(tick);
    });
  // Every beat of a clip written on her by hand, as a script that ignored the setting would.
  const force = (clip) => {
    const box = boxes(clip)[0];
    const svg = box.querySelector('svg');
    svg.setAttribute('data-live', '');
    let most = 0;
    for (const frame of box.dataset.frames.split(';')) {
      const [, state, pose, , , , , , , , , , phase] = frame.split('|');
      svg.setAttribute('data-state', state);
      svg.setAttribute('data-pose', pose);
      if (phase) svg.setAttribute('data-phase', phase);
      else svg.removeAttribute('data-phase');
      void svg.getBoundingClientRect();
      most = Math.max(most, svg.getAnimations({ subtree: true }).length);
    }
    return most;
  };
  window.__m2 = { running, spill, press, watch, frames, alone, force };
})()`;

interface Watched {
  ends: number;
  spill: number;
  deltas: number[];
  phases: number;
}

/** The clips of the sheet: the four evolutions, then every gesture it shows. */
interface Clip {
  name: string;
  lasts: number;
  evolution: boolean;
}

// ---------------------------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------------------------

const measured: MotionMeasures = {
  note_fr:
    'Ce que les navigateurs ont mesuré du mouvement de la mascotte, sur sa planche (scripts/mascot2-motion.ts --write). « moving_ms » : quand le dernier mouvement s’est arrêté après le geste. « spill_px » : de combien elle est sortie de son cadre, au pire, pendant qu’elle bougeait. « flashes » (Chromium, filmé image par image, au ralenti) : paires de changements de lumière opposés d’au moins 10 % que subit un même pixel dans une même seconde, et surface concernée ; la même mesure pour un rouge saturé ; « scene_pairs » : la même paire, sur la lumière moyenne de la scène entière, pendant toute l’évolution. « frames » (Chromium, processeur ralenti 4 fois, écran de téléphone à deux pixels pour un, sa scène seule sur la page comme dans le jeu ; la passe du milieu de trois) : durée des images. La mesure vaut pour le dessin dont « drawing_sha256 » est l’empreinte : une retouche la périme.',
  measured_on: new Date().toISOString().slice(0, 10),
  drawing_sha256: mascot2Fingerprint() ?? '',
  browsers: {},
  clips: {},
};
const clipMeasure = (clip: Clip): ClipMeasure =>
  (measured.clips[clip.name] ??= { lasts_ms: clip.lasts, moving_ms: {}, spill_px: 0 });

const sheetUrl = `file://${resolve(MASCOT2_SHEET_PATH)}`;

async function open(tab: Page): Promise<void> {
  await tab.goto(sheetUrl);
  await tab.evaluate(HELPERS);
}

const watch = (
  tab: Page,
  kind: 'play' | 'skip' | 'back' | null,
  clip: string,
  forMs: number,
  spill = false,
): Promise<Watched> =>
  tab.evaluate<Watched>(
    `window.__m2.watch(${JSON.stringify(kind)}, ${JSON.stringify(clip)}, ${String(forMs)}, ${String(spill)})`,
  );

const picture = async (tab: Page, clip: string, nth = 0): Promise<Picture> =>
  readPng(await tab.locator(`[data-clip="${clip}"]`).nth(nth).screenshot());

async function run(engine: string): Promise<Outcome> {
  const { out, check } = checker(engine);
  const type = ENGINES[engine];
  if (type === undefined) throw new Error(`unknown engine: ${engine}`);
  const browser = await type.launch();
  measured.browsers[engine] = `${engine} ${browser.version()}`;
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const tab = await context.newPage();
    const errors: string[] = [];
    tab.on('pageerror', (error) => errors.push(error.message));
    await open(tab);

    const clips = await tab.evaluate<
      Clip[]
    >(`[...new Set([...document.querySelectorAll('[data-clip]')].map((box) => box.dataset.clip))].map((name) => {
      const frames = document.querySelector('[data-clip="' + name + '"]').dataset.frames.split(';');
      return { name, lasts: Number(frames[frames.length - 1].split('|')[0]), evolution: /^\\d\\d$/.test(name) };
    })`);
    check(
      'the sheet shows the four evolutions and her gestures',
      PASSAGES.every((passage) => clips.some((clip) => clip.name === passage)) &&
        clips.length > PASSAGES.length,
      clips.map((clip) => clip.name).join(' '),
    );
    for (const passage of PASSAGES) {
      const clip = clips.find((c) => c.name === passage);
      check(
        `${passage}: the sheet plays what the choreography says`,
        clip?.lasts === evolutionLasts(passage),
        `${String(clip?.lasts)} ms on the sheet, ${String(evolutionLasts(passage))} ms in the data`,
      );
    }

    // --- she never moves alone ---------------------------------------------------------------
    const alone = await tab.evaluate<{ written: number; played: number }>(
      `window.__m2.alone(${String(ALONE_MS)})`,
    );
    check(
      `nothing moves and nothing is written for ${String(ALONE_MS)} ms after the page has loaded`,
      alone.written === 0 && alone.played === 0,
      `${String(alone.written)} attributes written, ${String(alone.played)} animations`,
    );

    // --- every clip: when it ends, where it stays, how it ends ----------------------------------
    for (const clip of clips) {
      const limit = clip.evolution ? EVOLUTION_MAX_MS : GESTURE_MAX_MS;
      const before = await picture(tab, clip.name);
      const seen = await watch(tab, 'play', clip.name, clip.lasts + 900, true);
      const record = clipMeasure(clip);
      record.moving_ms[engine] = Math.round(seen.ends);
      record.spill_px = Math.max(record.spill_px, Math.round(seen.spill * 10) / 10);
      check(
        `${clip.name}: it plays`,
        seen.ends > 0 && (!clip.evolution || seen.phases > 0),
        `last movement at ${seen.ends.toFixed(0)} ms`,
      );
      check(
        `${clip.name}: the last movement ends within ${String(limit)} ms`,
        seen.ends <= Math.min(limit, clip.lasts + 400) + SLACK_MS && seen.ends < MOVING_LIMIT_MS,
        `${seen.ends.toFixed(0)} ms, for ${String(clip.lasts)} ms of frames`,
      );
      // A stroke is drawn half outside its path: two pixels of a frame of 240 is its width.
      check(
        `${clip.name}: nothing leaves her frame while she moves`,
        seen.spill <= 2,
        `${seen.spill.toFixed(1)} px`,
      );
      const after = await picture(tab, clip.name);
      if (clip.evolution) {
        await watch(tab, 'skip', clip.name, 60);
        const skipped = await picture(tab, clip.name);
        check(
          `${clip.name}: she ends exactly as the still look draws her`,
          differing(after, skipped) <= REPAINTED,
          `${String(differing(after, skipped))} pixels differ`,
        );
        check(
          `${clip.name}: she is not as she was before`,
          differing(before, after) > 200,
          `${String(differing(before, after))} pixels differ`,
        );
      } else if (!clip.name.startsWith('end-')) {
        check(
          `${clip.name}: she is back exactly as she was`,
          differing(before, after) <= REPAINTED,
          `${String(differing(before, after))} pixels differ`,
        );
      }
    }

    // --- « Passer », in the middle of an evolution ----------------------------------------------
    for (const passage of PASSAGES) {
      const lasts = evolutionLasts(passage);
      await watch(tab, 'back', passage, 60);
      await watch(tab, 'play', passage, Math.min(900, lasts / 2));
      const skipped = await watch(tab, 'skip', passage, 400);
      const atOnce = await picture(tab, passage);
      await watch(tab, 'play', passage, lasts + 700);
      const played = await picture(tab, passage);
      check(
        `${passage}: « Passer » stops everything at once`,
        skipped.ends === 0 && skipped.phases === 0,
        `still moving ${skipped.ends.toFixed(0)} ms after`,
      );
      check(
        `${passage}: « Passer » gives the look the evolution ends on`,
        differing(atOnce, played) <= REPAINTED,
        `${String(differing(atOnce, played))} pixels differ`,
      );
    }

    // --- less motion: the box of the sheet ---------------------------------------------------------
    await tab.locator('#less').check();
    for (const passage of PASSAGES) {
      await watch(tab, 'back', passage, 60);
      const seen = await watch(tab, 'play', passage, 500);
      const now = await picture(tab, passage);
      await watch(tab, 'skip', passage, 60);
      check(
        `${passage}: with less motion asked on the sheet, the final look at once and no movement`,
        seen.ends === 0 &&
          seen.phases === 0 &&
          differing(now, await picture(tab, passage)) <= REPAINTED,
        `moving for ${seen.ends.toFixed(0)} ms`,
      );
    }
    check('the sheet throws no error', errors.length === 0, errors.join(' ; '));
    await context.close();

    // --- less motion: the setting of the system -----------------------------------------------
    const quiet = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      reducedMotion: 'reduce',
    });
    const still = await quiet.newPage();
    await open(still);
    for (const clip of clips) {
      const seen = await watch(still, 'play', clip.name, 400);
      check(
        `${clip.name}: with reduced motion set on the system, nothing moves`,
        seen.ends === 0 && seen.phases === 0,
        `moving for ${seen.ends.toFixed(0)} ms`,
      );
    }
    for (const passage of PASSAGES) {
      const most = await still.evaluate<number>(`window.__m2.force(${JSON.stringify(passage)})`);
      check(
        `${passage}: with reduced motion, every beat written by hand starts nothing either`,
        most === 0,
        `${String(most)} animations`,
      );
    }
    await quiet.close();

    if (engine === 'chromium') {
      // --- frames, the processor slowed four times ------------------------------------------------
      // As the project measures every animation (design/perf-budget.md, P6): a phone's screen,
      // two pixels for one, the processor four times slower. And as she is in the game: ONE
      // drawing on the page. The sheet holds some two hundred, and it is their page a browser
      // without a graphics card then spends its time on — measured, three to five in a hundred
      // frames late with the whole sheet, none to one with her scene alone.
      const slowed = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      const page = await slowed.newPage();
      await open(page);
      await page.evaluate(`(() => {
        const section = document.querySelector('.evo').closest('section');
        for (const scene of section.querySelectorAll('.evo .scene:nth-of-type(2), .strip, .strip-note')) scene.remove();
        for (const node of [...document.body.children]) {
          if (node !== section && !['TEMPLATE', 'SCRIPT', 'STYLE'].includes(node.tagName)) node.remove();
        }
      })()`);
      const left = await page.evaluate<number>(`document.querySelectorAll('svg.mascot').length`);
      check(
        'frames are timed with her scenes alone on the page',
        left === PASSAGES.length,
        `${String(left)} drawings left on the page`,
      );
      const session = await slowed.newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      for (const passage of PASSAGES) {
        const lasts = evolutionLasts(passage);
        const runs: NonNullable<ClipMeasure['frames']>[] = [];
        for (let round = 0; round < 3; round += 1) {
          const all = await page.evaluate<number[]>(
            `window.__m2.frames(${JSON.stringify(passage)}, ${String(lasts)})`,
          );
          const deltas = all.slice(1).sort((a, b) => a - b);
          runs.push({
            count: deltas.length,
            p95_ms: Math.round((deltas[Math.floor(deltas.length * 0.95)] ?? 0) * 10) / 10,
            over_20_pct:
              Math.round(
                (1000 * deltas.filter((d) => d > 20).length) / Math.max(1, deltas.length),
              ) / 10,
            over_50: deltas.filter((d) => d > 50).length,
          });
          await page.waitForTimeout(600);
        }
        // A machine that does something else for a moment is not her: the middle run of three.
        const frames = runs.sort(
          (a, b) => a.over_50 - b.over_50 || a.over_20_pct - b.over_20_pct,
        )[1];
        if (frames === undefined) continue;
        const clip = clips.find((c) => c.name === passage);
        if (clip !== undefined) clipMeasure(clip).frames = frames;
        check(
          `${passage}: no frame over 50 ms and at most 5 % over 20 ms, processor slowed four times`,
          frames.over_50 === 0 && frames.over_20_pct <= 5,
          `p95 ${String(frames.p95_ms)} ms, ${String(frames.over_20_pct)} % over 20 ms, ${String(frames.over_50)} over 50 ms, ${String(frames.count)} frames`,
        );
      }
      await slowed.close();

      // --- flashes: every evolution filmed frame by frame, both themes ---------------------------
      const studio = await browser.newContext({ viewport: { width: 1280, height: 2400 } });
      const set = await studio.newPage();
      await open(set);
      const tokens = await set.evaluate<string>(`(() => {
        const style = getComputedStyle(document.body);
        return ['fast', 'base', 'reveal', 'slow']
          .map((name) => '--duration-' + name + ':' + String(parseFloat(style.getPropertyValue('--duration-' + name)) * ${String(FILM_SLOW)}) + 'ms')
          .join(';');
      })()`);
      await set.addStyleTag({ content: `body[data-slow]{${tokens}}` });
      await set.evaluate(`document.body.dataset.slow = '${String(FILM_SLOW)}'`);
      // One picture holds the eight scenes; each is cut out of it afterwards.
      const places = await set.evaluate<
        { key: string; x: number; y: number; w: number; h: number }[]
      >(
        `${JSON.stringify(PASSAGES)}.flatMap((passage) => [...document.querySelectorAll('[data-clip="' + passage + '"]')].map((box, nth) => {
          const r = box.parentElement.getBoundingClientRect();
          return { key: passage + '-' + ['light', 'dark'][nth], x: Math.floor(r.left), y: Math.floor(r.top), w: Math.ceil(r.width), h: Math.ceil(r.height) };
        }))`,
      );
      const clip = {
        x: Math.min(...places.map((p) => p.x)),
        y: Math.min(...places.map((p) => p.y)),
        width: Math.max(...places.map((p) => p.x + p.w)) - Math.min(...places.map((p) => p.x)),
        height: Math.max(...places.map((p) => p.y + p.h)) - Math.min(...places.map((p) => p.y)),
      };
      check(
        'the eight scenes fit in one picture',
        clip.y >= 0 && clip.y + clip.height <= 2400,
        `from ${String(clip.y)} px, ${String(clip.height)} px high`,
      );
      const longest = Math.max(...PASSAGES.map(evolutionLasts)) + 700;
      const shots: Buffer[] = [];
      const times: number[] = [];
      const started = Date.now();
      await set.evaluate(
        `for (const passage of ${JSON.stringify(PASSAGES)}) window.__m2.press('play', passage)`,
      );
      for (let t = 0; t <= longest; t += FILM_EVERY_MS) {
        const due = started + t * FILM_SLOW;
        if (due > Date.now()) await set.waitForTimeout(due - Date.now());
        // The time of a frame is the time it was taken at, not the time it was due.
        times.push((Date.now() - started) / FILM_SLOW);
        shots.push(await set.screenshot({ clip }));
      }
      const gaps = times.slice(1).map((t, index) => t - (times[index] ?? 0));
      check(
        'the film kept up with her: no two frames further apart than a twentieth of a second',
        Math.max(...gaps) <= 50,
        `${Math.max(...gaps).toFixed(0)} ms at worst, in her own time`,
      );
      const films = new Map<string, Picture[]>(places.map((place) => [place.key, []]));
      for (const shot of shots) {
        const whole = readPng(shot);
        for (const place of places) {
          const cut = new Uint8Array(place.w * place.h * whole.channels);
          for (let y = 0; y < place.h; y += 1) {
            const from = ((place.y - clip.y + y) * whole.width + place.x - clip.x) * whole.channels;
            cut.set(
              whole.data.subarray(from, from + place.w * whole.channels),
              y * place.w * whole.channels,
            );
          }
          films
            .get(place.key)
            ?.push({ width: place.w, height: place.h, channels: whole.channels, data: cut });
        }
      }
      for (const passage of PASSAGES) {
        const found = clips.find((c) => c.name === passage);
        const cut = times.filter((t) => t <= evolutionLasts(passage) + 700).length;
        const of = (theme: 'light' | 'dark'): FlashMeasure =>
          flashesOf((films.get(`${passage}-${theme}`) ?? []).slice(0, cut), times.slice(0, cut));
        const flashes = { light: of('light'), dark: of('dark') };
        if (found !== undefined) clipMeasure(found).flashes = flashes;
        for (const theme of ['light', 'dark'] as const) {
          const f = flashes[theme];
          check(
            `${passage}, ${theme}: within the flash rule (WCAG 2.3.1)`,
            withinFlashRule(f),
            `${String(f.flashes_per_second)} a second, ${String(f.area_px)} px² at most change back and forth; red ${String(f.red_flashes_per_second)}, ${String(f.red_area_px)} px²`,
          );
          check(
            `${passage}, ${theme}: the scene as a whole never flashes`,
            f.scene_pairs === 0,
            `${String(f.scene_pairs)} pairs of opposing changes of its mean light`,
          );
        }
      }
      if (film !== null) await contactSheets(set, film, films, times);
      await studio.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}

/** What was filmed, six frames a second of her own time, one picture per evolution and theme. */
async function contactSheets(
  page: Page,
  dir: string,
  films: ReadonlyMap<string, Picture[]>,
  times: readonly number[],
): Promise<void> {
  mkdirSync(dir, { recursive: true });
  const sheet = await page.context().newPage();
  for (const [key, frames] of films) {
    const cells = frames
      .map((frame, index) => ({ frame, t: times[index] ?? 0, index }))
      .filter(({ index }) => index % 5 === 0)
      .map(({ frame, t }) => {
        const rgba = new Uint8Array(frame.width * frame.height * 4);
        for (let pixel = 0; pixel < frame.width * frame.height; pixel += 1) {
          for (let c = 0; c < 3; c += 1)
            rgba[pixel * 4 + c] = frame.data[pixel * frame.channels + c] ?? 0;
          rgba[pixel * 4 + 3] = 255;
        }
        return `<figure><canvas width="${String(frame.width)}" height="${String(frame.height)}" data-pixels="${Buffer.from(rgba).toString('base64')}"></canvas><figcaption>${t.toFixed(0)} ms</figcaption></figure>`;
      });
    await sheet.setContent(
      `<!doctype html><meta charset="utf-8"><style>body{margin:8px;font:11px system-ui;background:#fff}figure{display:inline-block;margin:0 3px 6px 0;text-align:center}canvas{display:block;width:168px;outline:1px solid #8884}</style><p>${key}</p>${cells.join('')}`,
    );
    await sheet.evaluate(`for (const canvas of document.querySelectorAll('canvas')) {
      const bytes = Uint8ClampedArray.from(atob(canvas.dataset.pixels), (c) => c.charCodeAt(0));
      canvas.getContext('2d').putImageData(new ImageData(bytes, canvas.width, canvas.height), 0, 0);
    }`);
    await sheet.screenshot({ path: join(dir, `film-${key}.png`), fullPage: true });
  }
  await sheet.close();
}

await report(run, args);

// What was measured, clip by clip: the numbers the sheet will print.
for (const [name, clip] of Object.entries(measured.clips)) {
  const ends = Object.entries(clip.moving_ms)
    .map(([engine, ms]) => `${engine} ${String(ms)}`)
    .join(', ');
  const flashes =
    clip.flashes === undefined
      ? ''
      : (['light', 'dark'] as const)
          .map((theme) => {
            const f = clip.flashes?.[theme];
            return f === undefined
              ? ''
              : ` | ${theme}: ${String(f.flashes_per_second)} flashes/s, ${String(f.area_px)} px² back and forth, red ${String(f.red_flashes_per_second)}/s on ${String(f.red_area_px)} px², scene ${String(f.scene_pairs)}`;
          })
          .join('');
  const frames =
    clip.frames === undefined
      ? ''
      : ` | frames p95 ${String(clip.frames.p95_ms)} ms, ${String(clip.frames.over_20_pct)} % > 20 ms, ${String(clip.frames.over_50)} > 50 ms`;
  console.log(
    `  ${name}: ${String(clip.lasts_ms)} ms of frames; ends ${ends}; spill ${String(clip.spill_px)} px${flashes}${frames}`,
  );
}

if (write) {
  const wanted = ['chromium', 'firefox', 'webkit'];
  if (process.exitCode === 1) {
    console.error('not written: a check failed');
  } else if (!wanted.every((engine) => engine in measured.browsers)) {
    console.error('not written: the measure is of the three engines together, or of none');
    process.exitCode = 1;
  } else {
    writeFileSync(MASCOT2_MOTION_PATH, `${JSON.stringify(measured, null, 2)}\n`);
    console.log(`written: ${MASCOT2_MOTION_PATH}`);
  }
}
