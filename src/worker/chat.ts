/**
 * The two routes of the chat (PLAN-CHAT §4, D16.45 to D16.51) — what each does with a request
 * that passed the guards, as functions of what they are handed: no platform object is touched
 * here, so that both run in a test exactly as they are written.
 *
 * `/api/gists` — identifiers in, read sentences out. No model, no neuron, nothing typed.
 *
 *   1. electoral silence          → "silence": questions are closed, the search stays
 *   2. the mode, the book         → "local": the site does not ask, or the page shows another
 *                                   state of the book than this Worker knows
 *   3. the base                   → "local": stopped, out of date, or unreachable
 *   4. the sentences              → "gists": those the base holds for the measures named —
 *                                   fewer than asked, or none — and `ai`: whether a model may
 *                                   be asked now
 *
 * `/api/chat` — which words to explain, never the question (D16.53). Every step that answers
 * before the model does so without anything having gone anywhere.
 *
 *   1. electoral silence          → "silence"
 *   2. the mode, the model, the
 *      book                       → "quiet": the page was built for another book — it shows
 *                                   its read sentences alone
 *   3. the read sentences         → "quiet" when none of the measures named has one: with no
 *                                   sentence on the screen there is no word to explain
 *   4. the words, the cards       → "quiet" when one word is not a word of those sentences, or
 *                                   one card is not ours: such a request is not the page's
 *   5. the allowance              → "quiet / spent": used up over the last twenty-four hours,
 *                                   or closed since the platform said so
 *   6. the model                  → called WITHOUT the gateway: no cache, no log, a model whose
 *                                   host keeps nothing. Slow or broken: "quiet"; refused for
 *                                   want of allowance: "quiet / spent", and the model closes
 *   7. the control                → the explanation whole, or "quiet" (src/lib/ask-validate.ts)
 *
 * What the model reads: the read sentences of the measures named, the cards named, and the
 * words to explain as those sentences write them. Never a text of the book: this file does not
 * even import the reader of the measures. Never a word a visitor typed: the request has no
 * field for one. And nothing of a previous turn: there is none in the request.
 *
 * Nothing is logged, on any path.
 */
import { PROVISIONAL_MIN_SHARED, validateExplanation } from '../lib/ask-validate.js';
import {
  parseModelExplanation,
  type ChatRequest,
  type ChatResponse,
  type GistsRequest,
  type GistsResponse,
} from '../lib/chat-contract.js';
import { wordsShown } from '../lib/chat-words.js';
import type { KnownCard } from '../lib/notions.js';
import { modeFor } from '../lib/ask-mode.js';
import { EXHAUSTED, type Exhausted, type ModelRun } from './ask.js';
import { loadGists, type AskDb, type Gist } from './measures.js';
import { MODELS, isModelKey, keepsNothing } from './models.js';
import { estimateNeurons, explainRequest, type ModelSpec } from './prompt.js';

/** What both routes need to know of the site and of the hour. */
export interface ChatSite {
  /** "chat" only where the site asks questions — per host (data/2026/ask.json). */
  mode: 'chat' | 'off';
  /** The model that explains. Null where none was retained. */
  model: ModelSpec | null;
  /** The state of the book this Worker was built for. */
  corpusVersion: string;
  silence: { silent: boolean; reopen: string | null };
  db: AskDb;
}

/**
 * What a Worker does with the two routes, read from data/2026/ask.json and from the host it
 * serves (`ENVIRONMENT`: the preview host may ask before production does, never the other way —
 * anything but "preview" is production). The mode is the file's, for that host; the model
 * governs `/api/chat` alone:
 *
 *   none named (D16.60)      the sentences written ahead are served, and no route calls a
 *                            model — `closedChat` answers « quiet » to a null model;
 *   one that may read        named in our catalogue, with a host that writes it keeps nothing
 *                            of a call: it may explain words;
 *   one that may not         unknown, or with a host that keeps something: both routes stay
 *                            closed — a file that is wrong opens nothing.
 *
 * Learning note (15/11/2026): this lived in the wiring (index.ts), where no test runs, and it
 * said « "chat" only if a model reads ». With no model named the sentences would never have
 * been served — found by reading the file before the first opening, not by a gate. Hence a
 * pure function, and its test.
 *
 * And the hour (`now`): from the first day of the campaign months nothing is served that the
 * editor did not decide to serve — see `campaignAllows`.
 */
export function siteFor(
  config: unknown,
  environment: unknown,
  now: Date,
): Pick<ChatSite, 'mode' | 'model'> & { minShared: number | undefined } {
  const file: Record<string, unknown> =
    typeof config === 'object' && config !== null ? (config as Record<string, unknown>) : {};
  const { model, min_shared: minShared } = file;
  const mode = modeFor(file, environment === 'preview' ? 'preview' : 'apex');
  const named = model !== null && model !== undefined;
  const reads = isModelKey(model) && keepsNothing(model) ? MODELS[model] : null;
  const open = mode === 'chat' && (!named || reads !== null) && campaignAllows(file, now);
  return {
    mode: open ? 'chat' : 'off',
    model: reads,
    minShared: typeof minShared === 'number' ? minShared : undefined,
  };
}

/**
 * The first hour of the three months before the vote: 1 January 2027, 0 h in Paris.
 *
 * From the first day of the third month before the month of a general election, the electoral
 * code (art. L163-2) lets a judge stop within forty-eight hours « inaccurate or misleading
 * allegations » about a fact that could alter the vote, when they are spread « in a deliberate,
 * artificial or automated, and massive way ». The first round is in April 2027.
 */
export const CAMPAIGN_FROM = '2026-12-31T23:00:00.000Z';

/**
 * True when the sentences may be served at this hour, as far as the campaign goes (D16.65).
 *
 * Our sentences say what the programme provides, an AI wrote them, and no person read them one
 * by one (D16.59). Before the campaign months they are served. From their first hour they are
 * served only if the EDITOR decided so, in writing and with a date — data/2026/ask.json,
 * `campaign: { serve: true, decided_on, decided_by: "editor" }`. His silence is the cautious
 * answer, and it needs nobody at the keyboard on New Year's Eve: the Worker answers « local »,
 * the page keeps its links and what a person wrote. The plan left him this decision « before
 * 1 January 2027 » (PLAN-CHAT §7); the session, which was told to ask him nothing (D16.57),
 * wrote the default — it cannot write his decision.
 *
 * He gave it on 15 November 2026, when asked (D16.78): the sentences stay served during the
 * campaign, as they are. The file says so, with his date; the rule below did not change, and
 * setting the three fields back to null brings the default back.
 */
export function campaignAllows(config: unknown, now: Date): boolean {
  if (now.getTime() < Date.parse(CAMPAIGN_FROM)) return true;
  const file = typeof config === 'object' && config !== null ? config : {};
  const decision: unknown = (file as Record<string, unknown>)['campaign'];
  if (typeof decision !== 'object' || decision === null) return false;
  const { serve, decided_on: on, decided_by: by } = decision as Record<string, unknown>;
  return serve === true && by === 'editor' && typeof on === 'string' && isDay(on);
}

/**
 * A day as the files of the project write it — and one that exists: a parser rolls « 2026-11-31 »
 * over into the 1st of December, so the day is read back and compared (review of 23/11/2026, W9).
 */
function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

export interface GistsDeps extends ChatSite {
  /** True when a model could be asked now: the ledger has room and the breaker is open. */
  available: () => Promise<boolean>;
}

/**
 * The room `/api/gists` asks the counter for before it says a model may explain: more than
 * the dearest explanation can be reserved at (scripts/chat-worker.test.ts holds it).
 */
export const EXPLAIN_ROOM = 100;

/**
 * Paid while the Worker loads, not by the first visitor after it wakes. The patterns of the
 * control and of the words compile at their first use: measured in a local workerd, that
 * first use cost 13 ms before the model and 50 ms in the control — for a limit of 10 ms a
 * request on the free plan — then 1 ms each (security review of 14/11/2026; 3 ms and 10 ms once
 * the patterns were spelled out, src/lib/ask-validate.ts). Loading has its own, larger
 * allowance, so the first use happens here, on an invented sentence: a quiet site is mostly
 * Workers that have just woken (scripts/chat-worker.test.ts holds this in place).
 */
const WARM = ['Un verger communal est planté près de chaque école.'];
validateExplanation(
  { phrases: ['Un verger communal est un terrain planté d’arbres fruitiers.'] },
  { shown: WARM },
);
wordsShown(['verger'], WARM);

const LOCAL: GistsResponse = { kind: 'local' };

/**
 * What `/api/gists` answers whatever it is sent: during a freeze, and where the site asks
 * nothing. Null when the route is open — and only then is anything of a request read: the
 * wiring asks this before it opens a body (src/worker/index.ts).
 */
export function closedGists(site: Pick<ChatSite, 'mode' | 'silence'>): GistsResponse | null {
  if (site.silence.silent) {
    return site.silence.reopen === null ? LOCAL : { kind: 'silence', reopen: site.silence.reopen };
  }
  return site.mode === 'chat' ? null : LOCAL;
}

export async function answerGists(request: GistsRequest, deps: GistsDeps): Promise<GistsResponse> {
  const closed = closedGists(deps);
  if (closed !== null) return closed;
  if (request.corpus !== deps.corpusVersion) return LOCAL;
  let gists: Gist[];
  try {
    const loaded = await loadGists(deps.db, request.ids, deps.corpusVersion);
    if (!loaded.state.open || loaded.state.corpusVersion !== deps.corpusVersion) return LOCAL;
    gists = loaded.gists;
  } catch {
    return LOCAL;
  }
  // No sentence to show: no word to explain, and no reason to ask the counter anything.
  let ai = false;
  if (gists.length > 0 && deps.model !== null) {
    try {
      ai = await deps.available();
    } catch {
      ai = false;
    }
  }
  return { kind: 'gists', corpus: deps.corpusVersion, gists, ai };
}

export interface ChatDeps extends ChatSite {
  /** Our cards, accepted by the editor (D16.79): those a request may name. */
  cards: readonly KnownCard[];
  /** The threshold of the control, from data/2026/ask.json once the bench has fixed it. */
  minShared?: number | undefined;
  reserve: (neurons: number) => Promise<boolean>;
  settle: (reserved: number, spent: number) => Promise<void>;
  release: (reserved: number) => Promise<void>;
  close: () => Promise<void>;
  /** Calls the model — directly, never through the gateway. */
  run: (request: Record<string, unknown>) => Promise<ModelRun | Exhausted | null>;
}

const QUIET: ChatResponse = { kind: 'quiet', why: 'none' };
const SPENT: ChatResponse = { kind: 'quiet', why: 'spent' };

/**
 * What `/api/chat` answers whatever it is sent: during a freeze, where the site asks nothing,
 * where no model was retained. Null when the route is open — and only then is a request read
 * at all: the wiring asks this before it opens a body (src/worker/index.ts).
 */
export function closedChat(
  site: Pick<ChatSite, 'mode' | 'silence' | 'model'>,
): ChatResponse | null {
  if (site.silence.silent) {
    return site.silence.reopen === null ? QUIET : { kind: 'silence', reopen: site.silence.reopen };
  }
  return site.mode === 'chat' && site.model !== null ? null : QUIET;
}

export async function answerChat(request: ChatRequest, deps: ChatDeps): Promise<ChatResponse> {
  // 1. Silence first, then the mode: a closed route answers before anything below starts.
  const closed = closedChat(deps);
  if (closed !== null) return closed;
  // 2. The site asks, a model explains, and the page shows the book this Worker knows.
  const { model } = deps;
  if (deps.mode !== 'chat' || model === null) return QUIET;
  if (request.corpus !== deps.corpusVersion) return QUIET;

  // 3. The read sentences of the measures named — what the visitor has under their eyes.
  let gists: Gist[];
  try {
    const loaded = await loadGists(deps.db, request.ids, deps.corpusVersion);
    if (!loaded.state.open || loaded.state.corpusVersion !== deps.corpusVersion) return QUIET;
    gists = loaded.gists;
  } catch {
    return QUIET;
  }
  if (gists.length === 0) return QUIET;

  // 4. The words and the cards are checked against what is ours — nothing is taken on trust.
  // A word that is not a word of these sentences, a card that is not one of ours: the request
  // was not built by the page, and no model is called for it.
  const words = wordsShown(
    request.words,
    gists.map((gist) => gist.text),
  );
  if (words === null) return QUIET;
  const cards = request.cards.map((id) => deps.cards.find((card) => card.id === id));
  if (!cards.every((card): card is KnownCard => card !== undefined)) return QUIET;

  // 5. The allowance, reserved before it is spent.
  const body = explainRequest(words, gists, cards, request.follow ?? null, model);
  const reserved = estimateNeurons(body, model);
  if (!(await deps.reserve(reserved))) return SPENT;

  // 6. The model. A call that failed may still have been billed: the reservation stays.
  let run: ModelRun | Exhausted | null;
  try {
    run = await deps.run(body);
  } catch {
    run = null;
  }
  if (run === null) return QUIET;
  if (run === EXHAUSTED) {
    await deps.close();
    await deps.release(reserved);
    return SPENT;
  }
  await deps.settle(reserved, run.neurons ?? reserved);

  // 7. The control: all of it, or none of it.
  const verdict = validateExplanation(
    run.output,
    { shown: [...gists.map((gist) => gist.text), ...cards.map((card) => card.plain)] },
    { minShared: deps.minShared ?? PROVISIONAL_MIN_SHARED },
  );
  return verdict.kind === 'explain'
    ? { kind: 'explain', corpus: deps.corpusVersion, sentences: verdict.sentences }
    : QUIET;
}

/**
 * What `/api/bench` returns of an explanation: the sentences the schema names, and nothing an
 * output may carry besides — or a marker, when it is not the shape that was asked for. The raw
 * output of a model never leaves the Worker, on this route like on the others.
 */
export function explainedOutput(output: unknown): { phrases: string[] } | { unreadable: true } {
  return parseModelExplanation(output) ?? { unreadable: true };
}
