/**
 * Which mascot this build shows — read once, at build time, from data/mascot.json (D17.14: the
 * generation is data, not code). Nothing here ships to the browser.
 *
 * Learning note — the test override, as for « Demander » (src/lib/ask-config.ts). The second
 * generation must be tested before the editor has validated anything, so a TEST build can be
 * asked for either one: `npm run build:mascot2` sets CEL_MASCOT_TEST=2 and writes dist-mascot2/,
 * which nothing deploys. A test build never reads the file: flipping production, or rolling it
 * back, is then a change of data that leaves every test build — and every gate that reads one —
 * exactly as it was.
 */
import { existsSync, readFileSync } from 'node:fs';
import { generationFor, type MascotGeneration, type MascotHost } from './mascot-mode.js';

export const MASCOT_PATH = 'data/mascot.json';

/**
 * The host this build is made for (scripts/build.ts, `--host preview`): the very variable the
 * build of « Demander » reads (src/lib/ask-config.ts). A build made without the flag is
 * production's — the one that changes last.
 */
const buildHost = (): MascotHost => (process.env['CEL_HOST'] === 'preview' ? 'preview' : 'apex');

/** The committed file, or null for anything that is not one: `generationFor` then answers 1. */
function file(): unknown {
  if (!existsSync(MASCOT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(MASCOT_PATH, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

export interface MascotSite {
  generation: MascotGeneration;
}

export function mascotSite(): MascotSite {
  // A test build (scripts/build.ts sets both variables on every run, never inherited).
  if (process.env['CEL_GAME_TEST'] === '1') {
    return { generation: process.env['CEL_MASCOT_TEST'] === '2' ? 2 : 1 };
  }
  return { generation: generationFor(file(), buildHost()) };
}
