/**
 * What the routes of the Worker share when they call a model (D16.5, D16.51): what came back
 * and what it cost, a refusal for want of allowance read for what it is, and — for the bench of
 * the written answer — the control of an output and what of it may leave.
 *
 * The path of `/api/ask` used to be here. That route is gone with the mode it served (D16.33,
 * lot C7 of PLAN-CHAT): the bench closed the written answer, and the chat has a path of its own
 * (src/worker/chat.ts). Nothing here is logged, on any path.
 */
import { parseModelAnswer, type Candidate } from '../lib/ask-contract.js';
import {
  carriesCopy,
  copyMeasure,
  refusals,
  validateAnswer,
  validateSelection,
  type Verdict,
} from '../lib/ask-validate.js';

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

/** What the control makes of an output of the bench, in the mode it asked for. */
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
