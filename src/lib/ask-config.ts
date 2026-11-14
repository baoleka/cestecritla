/**
 * How this build answers a question — read once, at build time, from data/2026/ask.json
 * (D16.4: the mode is data, not code). Nothing here ships to the browser but what a page
 * chooses to print.
 *
 * `off`: the page has a search field and nothing else — no button, no sheet, no AI notice.
 * `chat` (D16.45 to D16.51): the field also opens the sheet of « Demander » — one sentence
 * written ahead for each measure found. Whether a model then explains their words is the
 * file's other line, `model`: since D16.60 it is null — no AI answers a visitor, the sheet
 * offers none, and no page names one (`modelName` null). The variant with a model stays in
 * the code, closed, and tested. In either mode the security policy of every page allows our
 * own origin and no other: there is no third party to open (D16.23).
 *
 * The two modes the ladder of D16.4 had — a written answer, a selection — are gone from the
 * site: the bench closed them (D16.33) and D16.47 gave the model another job. They remain
 * modes of the bench route of the Worker, and of nothing else (src/worker/index.ts).
 *
 * Learning note — the test override. The sheet must be tested before the gates of
 * PLAN-CHAT §5 allow it to exist, so a build can be asked to pretend: CEL_ASK_TEST=chat (the
 * sheet with a model that explains, into dist-ask/) or CEL_ASK_TEST=gists (the sheet as it
 * opens, without one, into dist-gists/). Neither is ever the build scripts/deploy.ts looks at.
 */
import { readFileSync } from 'node:fs';
import { MODELS, isModelKey } from '../worker/models.ts';
import { modeFor, type AskHost, type SiteMode } from './ask-mode.ts';

export type { SiteMode };

export interface AskSite {
  mode: SiteMode;
  /** The name the AI notice prints (`{model}`); null when no model answers. */
  modelName: string | null;
}

const OFF: AskSite = { mode: 'off', modelName: null };

const fileMode = (): Record<string, unknown> =>
  JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as Record<string, unknown>;

/**
 * The host this build is made for (scripts/build.ts, `--host preview`): the preview host may
 * ask while production still answers nothing (src/lib/ask-mode.ts). A build made without the
 * flag is production's — the one that opens last.
 */
const buildHost = (): AskHost => (process.env['CEL_HOST'] === 'preview' ? 'preview' : 'apex');

/**
 * Whether this site answers questions at all — asked of the mode, not of the day. `askSite()`
 * says "off" in the build served during a silence window; a sentence ABOUT that window needs to
 * know what is paused, and must not name questions on a site that never had any (a persona,
 * 14/11/2026: « Les questions ? Quelles questions ? J'en ai jamais vu. »).
 */
export function asksQuestions(): boolean {
  return askTest() !== null || modeFor(fileMode(), buildHost()) === 'chat';
}

/** The sheet a test build pretends to have: with a model that explains, or without. */
function askTest(): 'chat' | 'gists' | null {
  const asked = process.env['CEL_ASK_TEST'];
  return asked === 'chat' || asked === 'gists' ? asked : null;
}

/** The sentence that says what a silence window pauses, on this site. */
export const pausedKey = (): 'silence.paused' | 'silence.paused.search' =>
  asksQuestions() ? 'silence.paused' : 'silence.paused.search';

export function askSite(): AskSite {
  // The build deployed before each electoral silence window (D16.16) answers no question,
  // whatever the mode: its pages carry no button, no notice and no script of « Demander ».
  if (process.env['CEL_SCRUTIN'] === '1') return OFF;
  const test = askTest();
  if (test === 'chat') return { mode: 'chat', modelName: MODELS['mistral-small-3.1'].name };
  if (test === 'gists') return { mode: 'chat', modelName: null };
  const file = fileMode();
  const mode = modeFor(file, buildHost());
  const { model } = file;
  if (mode !== 'chat') return OFF;
  // No model named: the sheet opens on the sentences written ahead, and no AI answers (D16.60).
  if (model === null || model === undefined) return { mode, modelName: null };
  // A name that is no model of ours is a broken file: the build stops rather than ship a
  // notice that names nothing.
  if (!isModelKey(model)) {
    throw new Error('data/2026/ask.json: "model" is not a model of src/worker/models.ts');
  }
  return { mode, modelName: MODELS[model].name };
}
