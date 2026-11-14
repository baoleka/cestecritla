/**
 * How this build answers a question — read once, at build time, from data/2026/ask.json
 * (D16.4: the mode is data, not code). Nothing here ships to the browser but what a page
 * chooses to print.
 *
 * `off`: the page has a search field and nothing else — no button, no AI notice. `answer` and
 * `select`: the field also asks. In every mode the security policy of every page allows our
 * own origin and no other: there is no third party left to open (D16.23).
 *
 * Learning note — the test override. The ask screen must be tested before any bench allows it
 * to exist, so a build can be asked to pretend: CEL_ASK_TEST=answer|select. It goes to its own
 * directory (dist-ask/), and it is never the build scripts/deploy.ts looks at.
 */
import { readFileSync } from 'node:fs';
import type { AskMode } from './ask-contract.ts';
import { MODELS, isModelKey } from '../worker/models.ts';

export interface AskSite {
  mode: AskMode;
  /** The name the AI notice prints (`{model}`); null when no model answers. */
  modelName: string | null;
}

const OFF: AskSite = { mode: 'off', modelName: null };

/**
 * Whether this site answers questions at all — asked of the mode, not of the day. `askSite()`
 * says "off" in the build served during a silence window; a sentence ABOUT that window needs to
 * know what is paused, and must not name questions on a site that never had any (a persona,
 * 14/11/2026: « Les questions ? Quelles questions ? J'en ai jamais vu. »).
 */
export function asksQuestions(): boolean {
  const test = process.env['CEL_ASK_TEST'];
  if (test === 'answer' || test === 'select') return true;
  const file = JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as Record<string, unknown>;
  return file['mode'] === 'answer' || file['mode'] === 'select';
}

/** The sentence that says what a silence window pauses, on this site. */
export const pausedKey = (): 'silence.paused' | 'silence.paused.search' =>
  asksQuestions() ? 'silence.paused' : 'silence.paused.search';

export function askSite(): AskSite {
  // The build deployed before each electoral silence window (D16.16) answers no question,
  // whatever the mode: its pages carry no button, no notice and no script of « Demander ».
  if (process.env['CEL_SCRUTIN'] === '1') return OFF;
  const test = process.env['CEL_ASK_TEST'];
  if (test === 'answer' || test === 'select') {
    return { mode: test, modelName: MODELS['mistral-small-3.1'].name };
  }
  const file = JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as Record<string, unknown>;
  const { mode, model } = file;
  if (mode !== 'answer' && mode !== 'select') return OFF;
  // A mode that opens without a model to name is a broken file: the build stops rather than
  // ship a button that can only disappoint.
  if (!isModelKey(model)) {
    throw new Error(`data/2026/ask.json: mode "${mode}" needs "model"`);
  }
  return { mode, modelName: MODELS[model].name };
}
