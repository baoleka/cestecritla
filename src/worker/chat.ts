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
 * `/api/chat` — THE ONLY PATH A QUESTION TAKES (D16.46). Every step that answers before the
 * model does so without the question having gone anywhere.
 *
 *   1. electoral silence          → "silence"
 *   2. the mode, the model, the
 *      agreement, the book        → "quiet": the page was built with another agreement or
 *                                   another book — it shows its read sentences alone
 *   3. what a person wrote        → "quiet": an objection one of the fifteen answers is about
 *                                   never reaches a model — the page already said so; held
 *                                   here again
 *   4. the read sentences         → "quiet" when none of the measures named has one: with no
 *                                   sentence on the screen there is no word to explain
 *   5. the allowance              → "quiet / spent": used up over the last twenty-four hours,
 *                                   or closed since the platform said so
 *   6. the model                  → called WITHOUT the gateway: no cache, no log, a model whose
 *                                   host keeps nothing. Slow or broken: "quiet"; refused for
 *                                   want of allowance: "quiet / spent", and the model closes
 *   7. the control                → the explanation whole, or "quiet" (src/lib/ask-validate.ts)
 *
 * What the model reads: the read sentences of the measures named, the cards the question
 * names, and the question. Never a text of the book: this file does not even import the reader
 * of the measures. And nothing of a previous turn: there is none in the request.
 *
 * Nothing is logged, on any path: a logged question is a kept question.
 */
import { reviewedFor, type ReviewedEntry } from '../lib/ask-reviewed.js';
import { PROVISIONAL_MIN_SHARED, validateExplanation } from '../lib/ask-validate.js';
import {
  parseModelExplanation,
  type ChatRequest,
  type ChatResponse,
  type GistsRequest,
  type GistsResponse,
} from '../lib/chat-contract.js';
import { asksForVote } from '../lib/chat-local.js';
import { notionsIn, type KnownCard } from '../lib/notions.js';
import { EXHAUSTED, type Exhausted, type ModelRun } from './ask.js';
import { loadGists, type AskDb, type Gist } from './measures.js';
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

export interface GistsDeps extends ChatSite {
  /** True when a model could be asked now: the ledger has room and the breaker is open. */
  available: () => Promise<boolean>;
}

/**
 * The room `/api/gists` asks the counter for before it says a model may explain: more than
 * the dearest explanation can be reserved at (scripts/chat-worker.test.ts holds it).
 */
export const EXPLAIN_ROOM = 100;

const LOCAL: GistsResponse = { kind: 'local' };

export async function answerGists(request: GistsRequest, deps: GistsDeps): Promise<GistsResponse> {
  if (deps.silence.silent) {
    return deps.silence.reopen === null ? LOCAL : { kind: 'silence', reopen: deps.silence.reopen };
  }
  if (deps.mode !== 'chat' || request.corpus !== deps.corpusVersion) return LOCAL;
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
  /** The version of the agreement this Worker was built with (src/lib/chat-contract.ts). */
  consent: string;
  /** What a person wrote: the objections never sent to a model, the cards handed to it. */
  objections: readonly ReviewedEntry[];
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

export async function answerChat(request: ChatRequest, deps: ChatDeps): Promise<ChatResponse> {
  // 1. Silence first: during a freeze nothing below even starts.
  if (deps.silence.silent) {
    return deps.silence.reopen === null ? QUIET : { kind: 'silence', reopen: deps.silence.reopen };
  }
  // 2. The site asks, a model explains, the visitor agreed to the words this Worker knows, and
  // the page shows the book it knows.
  const { model } = deps;
  if (deps.mode !== 'chat' || model === null) return QUIET;
  if (request.consent !== deps.consent || request.corpus !== deps.corpusVersion) return QUIET;

  // 3. What a person already answered, or what the sheet answers by itself: no model.
  if (reviewedFor(request.question, deps.objections) !== null) return QUIET;
  if (asksForVote(request.question)) return QUIET;

  // 4. The read sentences of the measures named — what the visitor has under their eyes.
  let gists: Gist[];
  try {
    const loaded = await loadGists(deps.db, request.ids, deps.corpusVersion);
    if (!loaded.state.open || loaded.state.corpusVersion !== deps.corpusVersion) return QUIET;
    gists = loaded.gists;
  } catch {
    return QUIET;
  }
  if (gists.length === 0) return QUIET;
  const named = new Set(notionsIn(request.question, deps.cards));
  const cards = deps.cards.filter((card) => named.has(card.id));

  // 5. The allowance, reserved before it is spent.
  const body = explainRequest(request.question, gists, cards, request.follow ?? null, model);
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
    {
      question: request.question,
      shown: [...gists.map((gist) => gist.text), ...cards.map((card) => card.plain)],
    },
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
