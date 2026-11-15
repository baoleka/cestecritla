/**
 * Pictures of a page, and what can be measured on them (lots A2 and C of
 * docs/discovery/PLAN-TORTUE.md) — shared by the gates that film the mascot: on her sheet
 * (scripts/mascot2-motion.ts) and in the game itself (scripts/e2e-game2.ts).
 *
 *   - a PNG as a browser gives it, read without a library;
 *   - whether two pictures of the same place are the same picture;
 *   - flashes, as WCAG 2.3.1 defines them (general flash and red flash thresholds), on a film:
 *     every pixel is followed for pairs of opposing changes of light of 10 % or more, and of
 *     saturated red, within any one second.
 *
 * Pure: no browser, no file. Moved here from the motion gate as it was, when a second gate
 * needed it.
 */
import { inflateSync } from 'node:zlib';
import { FLASHES_PER_SECOND_MAX, FLASH_AREA_PX, type FlashMeasure } from './mascot2-kit.js';

// ---------------------------------------------------------------------------------------------
// Pictures: a PNG as the browser gives it, read without a library
// ---------------------------------------------------------------------------------------------

export interface Picture {
  width: number;
  height: number;
  /** Bytes per pixel: 3 or 4. */
  channels: number;
  data: Uint8Array;
}

/** Reads a PNG of eight bits per channel, not interlaced: what a browser's screenshot is. */
export function readPng(png: Uint8Array): Picture {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const packed: Uint8Array[] = [];
  while (offset < png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      const colour = body[9];
      if (body[8] !== 8 || (colour !== 2 && colour !== 6) || body[12] !== 0) {
        throw new Error('a screenshot in a PNG form this reader does not know');
      }
      channels = colour === 6 ? 4 : 3;
    } else if (type === 'IDAT') packed.push(body);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(packed));
  const stride = width * channels;
  const data = new Uint8Array(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)] ?? 0;
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? (data[row + x - channels] ?? 0) : 0;
      const up = y > 0 ? (data[row - stride + x] ?? 0) : 0;
      const corner = x >= channels && y > 0 ? (data[row - stride + x - channels] ?? 0) : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - corner;
        const [a, b, c] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - corner)];
        predicted = a <= b && a <= c ? left : b <= c ? up : corner;
      }
      data[row + x] = ((line[x] ?? 0) + predicted) & 0xff;
    }
  }
  return { width, height, channels, data };
}

/**
 * How many pixels differ between two pictures of the same place — beyond what a browser does to
 * the edge of a shape when it paints it again (Chromium: up to 22 of 255, on a few pixels of an
 * edge that an animation has crossed).
 */
export function differing(a: Picture, b: Picture): number {
  if (a.width !== b.width || a.height !== b.height) return a.width * a.height;
  let count = 0;
  for (let pixel = 0; pixel < a.width * a.height; pixel += 1) {
    let far = false;
    for (let c = 0; c < 3; c += 1) {
      if (
        Math.abs((a.data[pixel * a.channels + c] ?? 0) - (b.data[pixel * b.channels + c] ?? 0)) > 32
      )
        far = true;
    }
    if (far) count += 1;
  }
  return count;
}

// ---------------------------------------------------------------------------------------------
// Flashes (WCAG 2.3.1, general flash and red flash thresholds)
// ---------------------------------------------------------------------------------------------

const LINEAR = Float32Array.from({ length: 256 }, (_, v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** One frame as two measures per pixel: its relative luminance, and how saturated a red it is. */
function measures(picture: Picture): { light: Float32Array; red: Float32Array } {
  const count = picture.width * picture.height;
  const light = new Float32Array(count);
  const red = new Float32Array(count);
  for (let pixel = 0; pixel < count; pixel += 1) {
    const r = LINEAR[picture.data[pixel * picture.channels] ?? 0] ?? 0;
    const g = LINEAR[picture.data[pixel * picture.channels + 1] ?? 0] ?? 0;
    const b = LINEAR[picture.data[pixel * picture.channels + 2] ?? 0] ?? 0;
    light[pixel] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    red[pixel] = r + g + b > 0 && r / (r + g + b) >= 0.8 ? Math.max(0, (r - g - b) * 320) : 0;
  }
  return { light, red };
}

/** A change that counts: from when to when, and which way. */
interface Change {
  from: number;
  to: number;
  up: boolean;
}

/**
 * The changes of a series that count: it is cut at its turning points, a turn being taken only
 * once the series has come back by `least`; `counts` says whether a change between two values
 * is one the rule is about.
 */
function changes(
  series: ArrayLike<number>,
  times: readonly number[],
  least: number,
  counts: (low: number, high: number) => boolean,
): Change[] {
  const out: Change[] = [];
  let pivot = 0;
  let extreme = 0;
  let rising: boolean | null = null;
  const at = (index: number): number => series[index] ?? 0;
  const close = (end: number): void => {
    const [low, high] = [Math.min(at(pivot), at(end)), Math.max(at(pivot), at(end))];
    if (high - low >= least && counts(low, high)) {
      out.push({ from: times[pivot] ?? 0, to: times[end] ?? 0, up: at(end) > at(pivot) });
    }
  };
  for (let i = 1; i < times.length; i += 1) {
    if (rising === null) {
      if (Math.abs(at(i) - at(pivot)) >= least) {
        rising = at(i) > at(pivot);
        extreme = i;
      }
    } else if (rising ? at(i) >= at(extreme) : at(i) <= at(extreme)) {
      extreme = i;
    } else if (Math.abs(at(i) - at(extreme)) >= least) {
      close(extreme);
      pivot = extreme;
      extreme = i;
      rising = !rising;
    }
  }
  if (rising !== null) close(extreme);
  return out;
}

/** Pairs of opposing changes, each as the time it spans. */
function pairs(list: readonly Change[]): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (let i = 1; i < list.length; i += 1) {
    const [first, second] = [list[i - 1], list[i]];
    if (first !== undefined && second !== undefined && first.up !== second.up) {
      out.push({ from: first.from, to: second.to });
    }
  }
  return out;
}

/**
 * In the worst second: how many flashes an area large enough for the rule goes through, and the
 * largest area that changes back and forth at all.
 */
function worstSecond(
  perPixel: readonly { from: number; to: number }[][],
  times: readonly number[],
): { flashes: number; area: number } {
  let flashes = 0;
  let area = 0;
  for (const start of times) {
    const counts = perPixel
      .map((list) => list.filter((pair) => pair.from >= start && pair.to <= start + 1000).length)
      .filter((count) => count > 0)
      .sort((a, b) => b - a);
    area = Math.max(area, counts.length);
    // The pixel that ranks `FLASH_AREA_PX`-th: every pixel before it flashes at least as often.
    flashes = Math.max(flashes, counts[FLASH_AREA_PX - 1] ?? 0);
  }
  return { flashes, area };
}

/** What a film of one evolution in one theme holds of flashes. */
export function flashesOf(frames: readonly Picture[], times: readonly number[]): FlashMeasure {
  const measured = frames.map(measures);
  const count = (frames[0]?.width ?? 0) * (frames[0]?.height ?? 0);
  const dark = (low: number): boolean => low < 0.8;
  const lightPairs: { from: number; to: number }[][] = [];
  const redPairs: { from: number; to: number }[][] = [];
  const series = new Float32Array(times.length);
  for (let pixel = 0; pixel < count; pixel += 1) {
    for (let f = 0; f < measured.length; f += 1) series[f] = measured[f]?.light[pixel] ?? 0;
    const light = pairs(changes(series, times, 0.1, dark));
    if (light.length > 0) lightPairs.push(light);
    for (let f = 0; f < measured.length; f += 1) series[f] = measured[f]?.red[pixel] ?? 0;
    const red = pairs(changes(series, times, 20, () => true));
    if (red.length > 0) redPairs.push(red);
  }
  const scene = measured.map((frame) => frame.light.reduce((sum, v) => sum + v, 0) / count);
  const general = worstSecond(lightPairs, times);
  const saturated = worstSecond(redPairs, times);
  return {
    flashes_per_second: general.flashes,
    area_px: general.area,
    red_flashes_per_second: saturated.flashes,
    red_area_px: saturated.area,
    scene_pairs: pairs(changes(scene, times, 0.1, dark)).length,
  };
}

/** The rule: three flashes a second at most, of light or of red. */
export const withinFlashRule = (f: FlashMeasure): boolean =>
  f.flashes_per_second <= FLASHES_PER_SECOND_MAX &&
  f.red_flashes_per_second <= FLASHES_PER_SECOND_MAX;
