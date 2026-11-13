/**
 * How this build answers a question — read once, at build time, from data/2026/ask.json
 * (D16.4: the mode is data, not code). Nothing here ships to the browser but what a page
 * chooses to print.
 *
 * `off`: the page has a search field and nothing else — no button, no AI notice, no Turnstile,
 * no third-party origin in its security policy. `answer` and `select`: the field also asks.
 *
 * Learning note — the test override. The ask screen must be tested before any bench allows it
 * to exist, so a build can be asked to pretend: CEL_ASK_TEST=answer|select. It goes to its own
 * directory (dist-ask/), it is never the build scripts/deploy.ts looks at, and the key it
 * carries is Cloudflare's public dummy site key, which passes without a challenge and is
 * refused by every real secret.
 */
import { readFileSync } from 'node:fs';
import type { AskMode } from './ask-contract.ts';
import { MODELS, isModelKey } from '../worker/models.ts';

export interface AskSite {
  mode: AskMode;
  /** The name the AI notice prints (`{model}`); null when no model answers. */
  modelName: string | null;
  /** Public Turnstile site key; null when no question is ever sent. */
  sitekey: string | null;
}

/** Cloudflare's documented test key: always passes, visible to nobody, valid nowhere real. */
const TEST_SITEKEY = '1x00000000000000000000AA';
const OFF: AskSite = { mode: 'off', modelName: null, sitekey: null };

export function askSite(): AskSite {
  // The build deployed before each electoral silence window (D16.16) answers no question,
  // whatever the mode: its pages carry no button, no notice and no script of « Demander ».
  if (process.env['CEL_SCRUTIN'] === '1') return OFF;
  const test = process.env['CEL_ASK_TEST'];
  if (test === 'answer' || test === 'select') {
    return { mode: test, modelName: MODELS['mistral-small-3.1'].name, sitekey: TEST_SITEKEY };
  }
  const file = JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as Record<string, unknown>;
  const { mode, model, turnstile_sitekey: sitekey } = file;
  if (mode !== 'answer' && mode !== 'select') return OFF;
  // A mode that opens without a model to name or a key to check with is a broken file: the
  // build stops rather than ship a button that can only disappoint.
  if (!isModelKey(model) || typeof sitekey !== 'string' || sitekey === '') {
    throw new Error(`data/2026/ask.json: mode "${mode}" needs "model" and "turnstile_sitekey"`);
  }
  return { mode, modelName: MODELS[model].name, sitekey };
}
