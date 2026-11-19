/**
 * What this build shows of the explained words outside the sheet (PLAN-MOTS, lot 4; D20.11) —
 * read once, at build time, from data/2026/words.json by the rule of src/lib/words-switch.ts.
 *
 * Two things more than the rule:
 *   - nothing is explained where the field asks nothing: the explanations are texts an AI
 *     wrote, and a build of mode "off" — or the « scrutin » one — names no AI (D20.11, D19.5);
 *   - a test build shows every surface (CEL_ASK_TEST): it goes to dist-ask/ or dist-gists/,
 *     which nothing ever deploys — the surfaces are tested before any host shows one.
 *
 * Whether production may take a build that shows them is decided by the deploy guard
 * (scripts/launch.ts, `wordsBlockers`, D20.15).
 */
import { readFileSync } from 'node:fs';
import { askSite } from './ask-config.ts';
import { NO_WORDS, wordsFor, type WordsSite } from './words-switch.ts';

export const WORDS_SWITCH_PATH = 'data/2026/words.json';

/** What this build shows of the explained words outside the sheet. */
export function wordsSite(): WordsSite {
  if (askSite().mode !== 'chat') return NO_WORDS;
  const test = process.env['CEL_ASK_TEST'];
  if (test === 'chat' || test === 'gists') return { pages: true, search: true, game: true };
  const host = process.env['CEL_HOST'] === 'preview' ? 'preview' : 'apex';
  return wordsFor(JSON.parse(readFileSync(WORDS_SWITCH_PATH, 'utf8')) as unknown, host);
}
