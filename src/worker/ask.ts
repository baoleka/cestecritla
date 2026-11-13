/**
 * The path of a question (PLAN-JEU §2.2) — every step in the order it happens, with what each
 * needs handed in (`AskDeps`), so that the whole path runs in a test without a network, a base
 * or a model.
 *
 *   1. electoral silence        → "silence": questions are closed, the search stays
 *   2. an objection we answered → "reviewed": a person wrote it, no model runs
 *   3. another state of the book, a refused token → "local"
 *   4. the private base         → stopped or out of date: "local"; nothing found: "none"
 *   5. the allowance of the day → spent: "local"
 *   6. the model, six seconds   → slow or broken: "local"
 *   7. the control              → the answer as written, or three measures and no sentence
 *
 * None of these is an error for the visitor. "local" means: show what the page found by
 * itself, and say nothing of why — it is a normal mode, not a breakdown.
 *
 * Nothing is logged, here or anywhere on this path: no `console.*`, no write to the base. The
 * question lives for the length of this function.
 */
import {
  type AskMode,
  type AskRequest,
  type AskResponse,
  type Candidate,
} from '../lib/ask-contract.js';
import { reviewedFor, type ReviewedEntry } from '../lib/ask-reviewed.js';
import { validateAnswer, validateSelection, type Verdict } from '../lib/ask-validate.js';
import type { SynonymGroup } from '../lib/search-core.js';
import { estimateNeurons, modelRequest, type ModelSpec } from './prompt.js';
import { retrieve, type AskDb } from './retrieve.js';

/** What came back from the model: its output as returned, and what it cost. */
export interface ModelRun {
  output: unknown;
  /** Neurons billed, when the platform says; null when it does not. */
  neurons: number | null;
  /** True when the gateway served a stored answer: nothing was billed. */
  cached: boolean;
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
  /** The fifteen objections a person answered. */
  entries: readonly ReviewedEntry[];
  synonyms: readonly SynonymGroup[];
  db: AskDb;
  verify: (token: string) => Promise<boolean>;
  reserve: (neurons: number) => Promise<boolean>;
  settle: (reserved: number, spent: number) => Promise<void>;
  /** Calls the model. Null when it did not answer in time, or not at all. */
  run: (request: Record<string, unknown>) => Promise<ModelRun | null>;
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
      return { kind: 'none' };
    case 'off_topic':
      return { kind: 'off_topic' };
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

export async function answerQuestion(request: AskRequest, deps: AskDeps): Promise<AskResponse> {
  // 1. Silence first: during a freeze nothing below even starts.
  if (deps.silence.silent) {
    return deps.silence.reopen === null ? LOCAL : { kind: 'silence', reopen: deps.silence.reopen };
  }
  const { mode, model } = deps;
  if (mode === 'off' || model === null) return LOCAL;

  // 2. An objection a person answered: the best answer we have, and it costs nothing.
  const slug = reviewedFor(request.q, deps.entries);
  if (slug !== null) return { kind: 'reviewed', slug };

  // 3. The page must be showing the book this Worker knows: identifiers are resolved there.
  if (request.corpus !== deps.corpusVersion) return LOCAL;
  if (!(await deps.verify(request.token))) return LOCAL;

  // 4. The private base. An unreachable base is a closed base.
  let candidates: Candidate[];
  try {
    const found = await retrieve(deps.db, request.q, deps.synonyms);
    if (!found.state.open || found.state.corpusVersion !== deps.corpusVersion) return LOCAL;
    candidates = found.candidates;
  } catch {
    return LOCAL;
  }
  if (candidates.length === 0) return { kind: 'none' };

  // 5. The allowance of the day, reserved before it is spent.
  const body = modelRequest(mode, request.q, candidates, model);
  const reserved = estimateNeurons(body, model);
  if (!(await deps.reserve(reserved))) return LOCAL;

  // 6. The model. A call that failed may still have been billed: the reservation stays.
  let run: ModelRun | null;
  try {
    run = await deps.run(body);
  } catch {
    run = null;
  }
  if (run === null) return LOCAL;
  await deps.settle(reserved, run.cached ? 0 : (run.neurons ?? reserved));

  // 7. The control. Whatever it decides is a page, never an error.
  return toResponse(control(mode, run.output, candidates, deps.minOverlap), deps.corpusVersion);
}
