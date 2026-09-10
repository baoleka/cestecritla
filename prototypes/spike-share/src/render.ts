/**
 * satori (element tree → SVG) then resvg (SVG → PNG).
 *
 * Both wasm modules are imported as CompiledWasm (wrangler bundles them next to the script,
 * so they count toward the bundle size) and instantiated once per isolate. Fonts are NOT
 * bundled: they are fetched from Static Assets (/fonts/*.ttf) once per isolate.
 */
import satori, { init as initSatori, type Font } from 'satori/standalone';
import yogaWasm from 'satori/yoga.wasm';
import { initWasm as initResvg, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import type { El } from './el.ts';

interface FontSpec {
  path: string;
  name: 'Public Sans' | 'Gowun Batang';
  weight: 400 | 700 | 900;
  style: 'normal' | 'italic';
}

const fontSpecs: readonly FontSpec[] = [
  { path: '/fonts/PublicSans-Regular-latin.ttf', name: 'Public Sans', weight: 400, style: 'normal' },
  { path: '/fonts/PublicSans-Bold-latin.ttf', name: 'Public Sans', weight: 700, style: 'normal' },
  { path: '/fonts/PublicSans-Black-latin.ttf', name: 'Public Sans', weight: 900, style: 'normal' },
  { path: '/fonts/PublicSans-BlackItalic-latin.ttf', name: 'Public Sans', weight: 900, style: 'italic' },
  { path: '/fonts/GowunBatang-Regular-latin.ttf', name: 'Gowun Batang', weight: 400, style: 'normal' },
  { path: '/fonts/GowunBatang-Bold-latin.ttf', name: 'Gowun Batang', weight: 700, style: 'normal' },
];

/**
 * Isolate-wide, immutable once resolved: wasm instances and font bytes are not request state.
 * The two inits are memoised separately: resvg's initWasm() throws "Already initialized" on a
 * second call, so a combined promise that failed on the satori side could never be retried.
 */
let satoriReady: Promise<void> | undefined;
let resvgReady: Promise<void> | undefined;
let fontsReady: Promise<Font[]> | undefined;

const ensureWasm = (): Promise<void> => {
  satoriReady ??= Promise.resolve(initSatori(yogaWasm))
    .then(() => undefined)
    .catch((err: unknown) => {
      satoriReady = undefined;
      throw err;
    });
  resvgReady ??= initResvg(resvgWasm).catch((err: unknown) => {
    resvgReady = undefined;
    throw err;
  });
  return Promise.all([satoriReady, resvgReady]).then(() => undefined);
};

const loadFonts = (assets: Fetcher): Promise<Font[]> => {
  fontsReady ??= Promise.all(
    fontSpecs.map(async (spec) => {
      const res = await assets.fetch(new Request(`https://assets.local${spec.path}`));
      if (!res.ok) throw new Error(`font ${spec.path}: HTTP ${res.status}`);
      const data = await res.arrayBuffer();
      return { name: spec.name, weight: spec.weight, style: spec.style, data } satisfies Font;
    }),
  ).catch((err: unknown) => {
    fontsReady = undefined;
    throw err;
  });
  return fontsReady;
};

export interface RenderTimings {
  /** ms spent waiting for wasm init + fonts (0 when already warm). */
  init: number;
  satori: number;
  resvg: number;
  svgBytes: number;
}

export interface Rendered {
  png: Uint8Array;
  timings: RenderTimings;
}

export const renderPng = async (
  assets: Fetcher,
  element: El,
  width: number,
  height: number,
): Promise<Rendered> => {
  const t0 = Date.now();
  const [, fonts] = await Promise.all([ensureWasm(), loadFonts(assets)]);
  const t1 = Date.now();
  const svg = await satori(element, { width, height, fonts, embedFont: true });
  const t2 = Date.now();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    // Text is already paths (embedFont): no font loading inside resvg.
    font: { loadSystemFonts: false },
  });
  let png: Uint8Array;
  try {
    const image = resvg.render();
    try {
      png = image.asPng();
    } finally {
      image.free();
    }
  } finally {
    // wasm-bindgen objects live in linear memory shared by every request of the isolate:
    // release them explicitly instead of relying on FinalizationRegistry.
    resvg.free();
  }
  const t3 = Date.now();
  return {
    png,
    timings: { init: t1 - t0, satori: t2 - t1, resvg: t3 - t2, svgBytes: svg.length },
  };
};
