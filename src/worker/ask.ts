/**
 * The path of a request (PLAN-JEU §2.2, as D16.22 left it) — every step in the order it
 * happens, with what each needs handed in (`AskDeps`), so that the whole path runs in a test
 * without a network, a base or a model.
 *
 *   1. electoral silence          → "silence": questions are closed, the search stays
 *   2. another state of the book  → "local"
 *   3. the private base           → stopped, out of date, or none of the measures named: "local"
 *   4. the allowance              → spent over the last twenty-four hours, or closed since the
 *                                   platform said it was used up: "local"
 *   5. the model, six seconds     → slow or broken: "local"; refused for want of allowance:
 *                                   "local" too, and the model is closed for a while
 *   6. the control                → the answer as written, three measures and no sentence, or
 *                                   "local" when the model had nothing to say of them
 *
 * None of these is an error for the visitor. "local" means: show what the page found by
 * itself, and say nothing of why — it is a normal mode, not a breakdown.
 *
 * What is not here any more, because the Worker does not read the question (D16.22): the
 * search — the page did it, and names the measures; the objections a person answered — the page
 * recognises them before it sends anything; « nothing found » — the page then sends nothing.
 *
 * Nothing is logged, here or anywhere on this path: no `console.*`, no write to the base. And
 * there is no sentence of a visitor to log: a request is identifiers and words of the book.
 */
import {
  parseModelAnswer,
  type AskMode,
  type AskRequest,
  type AskResponse,
  type Candidate,
} from '../lib/ask-contract.js';
import {
  carriesCopy,
  copyMeasure,
  refusals,
  validateAnswer,
  validateSelection,
  type Verdict,
} from '../lib/ask-validate.js';
import { keptTerms, loadMeasures, type AskDb } from './measures.js';
import { estimateNeurons, modelRequest, type ModelSpec } from './prompt.js';

/** What came back from the model: its output as returned, and what it cost. */
export interface ModelRun {
  output: unknown;
  /** Neurons billed, when the platform says; null when it does not. */
  neurons: number | null;
  /** True when the gateway served a stored answer: nothing was billed. */
  cached: boolean;
}

/**
 * The platform refused the call for want of allowance: HTTP 429, « you have used up your daily
 * free allocation of 10,000 neurons » (code 3036 in its documentation, 4006 as read on
 * 14 November 2026). Nothing ran and nothing is billed — which is what tells it from a call
 * that was cut or that broke, whose cost nobody knows.
 */
export const EXHAUSTED = 'exhausted';
export type Exhausted = typeof EXHAUSTED;

/**
 * The same refusal, when it reaches the Worker as an exception instead of a response. PROBABLE
 * that it never does: asked for the raw response, the binding of the local runtime returns a
 * 429 as it is (read in workerd on 14 November 2026). The platform is not the local runtime,
 * and a refusal read as a call that broke is the fault this was written against — the model
 * called again at every question, each call keeping a reservation for nothing. So the words of
 * the error are read too; a deadline, or a model out of capacity, stays what it is.
 */
export function saysExhausted(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : '';
  if (/capacity temporarily exceeded|\b3040\b/i.test(text)) return false;
  return /\b429\b|\b4006\b|\b3036\b|daily free allocation|too many requests/i.test(text);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * True when a refusal says the model is out of capacity — code 3040, « Capacity temporarily
 * exceeded, please try again. » — in either of the shapes the platform gives an error.
 */
function outOfCapacity(body: unknown): boolean {
  if (!isRecord(body)) return false;
  const errors = body['errors'] ?? body['error'];
  const listed: unknown = Array.isArray(errors) ? errors[0] : body;
  const error = isRecord(listed) ? listed : {};
  const code = error['code'] ?? error['internalCode'];
  const text = error['message'] ?? error['description'];
  return (
    code === 3040 ||
    code === '3040' ||
    (typeof text === 'string' && /capacity temporarily exceeded/i.test(text))
  );
}

/**
 * What a call to the model came to, read from whichever shape the platform returned: a run;
 * `EXHAUSTED` when the platform refused it for want of allowance; null when there is no answer
 * to read.
 *
 * A 429 is the allowance, unless it says it is something else. The error of the allowance has
 * already changed its code once and comes in two shapes, so it is not the one looked for. The
 * other 429 Workers AI documents is: a model out of capacity, which is a call that broke like
 * any other and is tried again at the next question. Every other 429 — a code nobody knows, a
 * body nobody can read — is the allowance: closing the model for nothing costs thirty minutes
 * of a page that shows what it found by itself; calling on for nothing is what this was
 * written against.
 */
export async function readRun(response: Response): Promise<ModelRun | Exhausted | null> {
  if (!response.ok && response.status !== 429) return null;
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (response.status === 429) return outOfCapacity(body) ? null : EXHAUSTED;
  if (!isRecord(body)) return null;
  const inner = isRecord(body['result']) ? body['result'] : body;
  const usage = isRecord(inner['usage']) ? inner['usage'] : {};
  const neurons = typeof usage['neurons'] === 'number' ? usage['neurons'] : null;
  let output: unknown = inner['response'];
  if (output === undefined && Array.isArray(inner['choices'])) {
    const first: unknown = inner['choices'][0];
    const message = isRecord(first) && isRecord(first['message']) ? first['message'] : {};
    output = message['content'];
  }
  if (output === undefined) return null;
  const cached = (response.headers.get('cf-aig-cache-status') ?? '').toUpperCase() === 'HIT';
  return { output, neurons, cached };
}

export interface AskDeps {
  mode: AskMode;
  /** The model that answers. Null only in mode "off", where no model is ever called. */
  model: ModelSpec | null;
  /** The threshold the bench retained for the control (data/2026/ask.json). */
  minOverlap: number;
  /** The state of the book this Worker was built for. */
  corpusVersion: string;
  /** Electoral silence at this instant (src/lib/silence.ts), with the hour questions reopen. */
  silence: { silent: boolean; reopen: string | null };
  db: AskDb;
  reserve: (neurons: number) => Promise<boolean>;
  settle: (reserved: number, spent: number) => Promise<void>;
  /** Gives a reservation back whole: the call it was made for was refused, so never billed. */
  release: (reserved: number) => Promise<void>;
  /** Closes the model for a while: the platform has just said the allowance is used up. */
  close: () => Promise<void>;
  /**
   * Calls the model. Null when it did not answer in time, or not at all; `EXHAUSTED` when the
   * platform refused the call for want of allowance.
   */
  run: (request: Record<string, unknown>) => Promise<ModelRun | Exhausted | null>;
}

const LOCAL: AskResponse = { kind: 'local' };

function toResponse(verdict: Verdict, corpus: string): AskResponse {
  switch (verdict.kind) {
    case 'answer':
      return { kind: 'answer', corpus, sentences: verdict.sentences };
    case 'select':
      // The reason the writing was refused stays here: the page has no use for it.
      return { kind: 'select', corpus, ids: verdict.ids };
    case 'none':
      // It had nothing to say of these measures: the page shows what its own search found.
      return LOCAL;
  }
}

/** What the control makes of an output, in the mode the site runs in. */
export function control(
  mode: 'answer' | 'select',
  output: unknown,
  candidates: readonly Candidate[],
  minOverlap: number,
): Verdict {
  return mode === 'answer'
    ? validateAnswer(output, candidates, { minOverlap })
    : validateSelection(output, candidates);
}

/**
 * What `/api/bench` returns of an output: the output — unless the model copied what it was
 * shown. An answer of the Worker holds no more of the book than a page would, the bench's
 * included (D16.6): then a marker and numbers leave, never the text — how many sentences, the
 * longest run of copied words, the largest copied share. The bench counts the marker under its
 * gate "copied sequence"; nobody needs to read what it stands for, and the numbers say by how
 * much the instruction was missed.
 */
export function benchOutput(output: unknown, candidates: readonly Candidate[]): unknown {
  const copied =
    carriesCopy(output, candidates) ||
    refusals(output, candidates, { minOverlap: 0 }).some((refusal) => refusal.rule === 'copy');
  if (!copied) return output;
  return {
    withheld: 'copy',
    sentences: parseModelAnswer(output)?.phrases.length ?? 0,
    ...copyMeasure(output, candidates),
  };
}

export async function answerQuestion(request: AskRequest, deps: AskDeps): Promise<AskResponse> {
  // 1. Silence first: during a freeze nothing below even starts.
  if (deps.silence.silent) {
    return deps.silence.reopen === null ? LOCAL : { kind: 'silence', reopen: deps.silence.reopen };
  }
  const { mode, model } = deps;
  if (mode === 'off' || model === null) return LOCAL;

  // 2. The page must be showing the book this Worker knows: identifiers are resolved there.
  if (request.corpus !== deps.corpusVersion) return LOCAL;

  // 3. The private base, read by identifier. An unreachable base is a closed base.
  let candidates: Candidate[];
  try {
    const loaded = await loadMeasures(deps.db, request.ids);
    if (!loaded.state.open || loaded.state.corpusVersion !== deps.corpusVersion) return LOCAL;
    candidates = loaded.candidates;
  } catch {
    return LOCAL;
  }
  if (candidates.length === 0) return LOCAL;

  // 4. The allowance, reserved before it is spent.
  const body = modelRequest(mode, candidates, keptTerms(request.terms, candidates), model);
  const reserved = estimateNeurons(body, model);
  if (!(await deps.reserve(reserved))) return LOCAL;

  // 5. The model. A call that failed may still have been billed: the reservation stays.
  let run: ModelRun | Exhausted | null;
  try {
    run = await deps.run(body);
  } catch {
    run = null;
  }
  if (run === null) return LOCAL;
  if (run === EXHAUSTED) {
    // A call the platform refused was not billed: the reservation goes back. And the next
    // questions do not even try, until the breaker reopens — the page shows what it found.
    await deps.close();
    await deps.release(reserved);
    return LOCAL;
  }
  await deps.settle(reserved, run.cached ? 0 : (run.neurons ?? reserved));

  // 6. The control. Whatever it decides is a page, never an error.
  return toResponse(control(mode, run.output, candidates, deps.minOverlap), deps.corpusVersion);
}
