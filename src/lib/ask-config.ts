/**
 * How this build answers a question — read once, at build time, from data/2026/ask.json
 * (D16.4: the mode is data, not code). Nothing here ships to the browser but what a page
 * chooses to print.
 *
 * `off`: the page has a search field and nothing else — no button, no sheet, no AI notice.
 * `chat` (D16.45 to D16.51): the field also opens the sheet of « Demander » — the sentences
 * the editor read, then, for a visitor who agrees, a model that explains their words. In
 * either mode the security policy of every page allows our own origin and no other: there is
 * no third party to open (D16.23).
 *
 * The two modes the ladder of D16.4 had — a written answer, a selection — are gone from the
 * site: the bench closed them (D16.33) and D16.47 gave the model another job. They remain
 * modes of the bench route of the Worker, and of nothing else (src/worker/index.ts).
 *
 * Learning note — the test override. The sheet must be tested before the gates of
 * PLAN-CHAT §5 allow it to exist, so a build can be asked to pretend: CEL_ASK_TEST=chat. It
 * goes to its own directory (dist-ask/), and it is never the build scripts/deploy.ts looks at.
 */
import { readFileSync } from 'node:fs';
import { MODELS, isModelKey } from '../worker/models.ts';

/** What the site does with a question: the sheet, or nothing. */
export type SiteMode = 'chat' | 'off';

export interface AskSite {
  mode: SiteMode;
  /** The name the AI notice prints (`{model}`); null when no model answers. */
  modelName: string | null;
}

const OFF: AskSite = { mode: 'off', modelName: null };

const fileMode = (): Record<string, unknown> =>
  JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as Record<string, unknown>;

/**
 * Whether this site answers questions at all — asked of the mode, not of the day. `askSite()`
 * says "off" in the build served during a silence window; a sentence ABOUT that window needs to
 * know what is paused, and must not name questions on a site that never had any (a persona,
 * 14/11/2026: « Les questions ? Quelles questions ? J'en ai jamais vu. »).
 */
export function asksQuestions(): boolean {
  return process.env['CEL_ASK_TEST'] === 'chat' || fileMode()['mode'] === 'chat';
}

/** The sentence that says what a silence window pauses, on this site. */
export const pausedKey = (): 'silence.paused' | 'silence.paused.search' =>
  asksQuestions() ? 'silence.paused' : 'silence.paused.search';

export function askSite(): AskSite {
  // The build deployed before each electoral silence window (D16.16) answers no question,
  // whatever the mode: its pages carry no button, no notice and no script of « Demander ».
  if (process.env['CEL_SCRUTIN'] === '1') return OFF;
  if (process.env['CEL_ASK_TEST'] === 'chat') {
    return { mode: 'chat', modelName: MODELS['mistral-small-3.1'].name };
  }
  const { mode, model } = fileMode();
  if (mode !== 'chat') return OFF;
  // A mode that opens without a model to name is a broken file: the build stops rather than
  // ship a button that can only disappoint.
  if (!isModelKey(model)) {
    throw new Error('data/2026/ask.json: mode "chat" needs "model"');
  }
  return { mode, modelName: MODELS[model].name };
}
