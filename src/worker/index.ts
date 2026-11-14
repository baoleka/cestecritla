/**
 * "C'est écrit là" — the whole server side: one route, `/api/ask` (D16.7).
 *
 * The Worker orchestrates, it does not compute: 10 ms of CPU per invocation is the entire
 * budget (D4.1, D7.1). It reads in the private base the measures a request names, asks a model
 * hosted by Cloudflare to say in our words what they provide, and lets through only what the
 * control accepts (src/lib/ask-validate.ts). The path itself is src/worker/ask.ts; this file is
 * the wiring to the platform.
 *
 * It never receives the sentence a visitor typed (D16.22): a request is identifiers of
 * measures and words of the book. Everything else — every page, the search, the game — is a
 * static file, served outside the invocation counter. The site is designed to work with
 * `/api/*` entirely down.
 *
 * What never happens here: a log (no `console.*`, observability off, gateway logs off), a
 * write about a visitor, an answer that carries a word of the programme, a call to anything
 * outside Cloudflare — not even to a bot check: there is none (D16.23), the rate limiter and
 * the allowance of the day are the whole defence, and an emptied allowance closes the model
 * until midnight UTC and nothing else.
 *
 * `/api/bench` exists on the preview Worker only, behind a key: it is how the bench measures
 * the candidates on the production path (PLAN-JEU §2.4). It answers 404 everywhere else.
 */
import flags from '../../public/flags.json';
import askConfig from '../../data/2026/ask.json';
import { parseAskRequest, type AskMode, type AskResponse } from '../lib/ask-contract.js';
import { effectiveDate, type SilenceOverride } from '../lib/silence.js';
import { answerQuestion, benchOutput, control, type ModelRun } from './ask.js';
import { DEFAULT_HARD_STOP } from './budget-core.js';
import { clientKey, readBody } from './guards.js';
import { keptTerms, loadMeasures } from './measures.js';
import { MODELS, isModelKey, type ModelKey } from './models.js';
import {
  estimateNeurons,
  gistRequest,
  isGistVariant,
  judgeRequest,
  modelRequest,
  readJudgement,
  type JudgeVerdict,
  type ModelSpec,
} from './prompt.js';

export { NeuronBudget } from './budget.js';

/** The AI Gateway every call goes through: thirty days of cache, and no log of any request. */
const GATEWAY = { id: 'aec', cacheTtl: 2_592_000, collectLog: false } as const;
const MODEL_TIMEOUT_MS = 6_000;

/** No cache, no referrer, never indexed: nothing here can leak into a log or an index. */
const HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'noindex',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
};

/**
 * The switch the page reads (public/flags.json), read here too — built into the Worker, so that
 * the deployment that closes the page closes the questions with it. Without this the sentence
 * of the runbook was false: « silence_override: on » hid the block, and `/api/ask` still
 * answered whoever asked it directly.
 */
const OVERRIDE: SilenceOverride =
  flags.silence_override === 'on' || flags.silence_override === 'off'
    ? flags.silence_override
    : 'auto';

const empty = (status: number): Response => new Response(null, { status, headers: HEADERS });
const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: HEADERS });
const LOCAL: AskResponse = { kind: 'local' };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The mode and the model the site runs with: data, decided by the bench (D16.4). */
function configured(): { mode: AskMode; model: ModelSpec | null; minOverlap: number } {
  const config: Record<string, unknown> = askConfig;
  const { mode, model, min_overlap: minOverlap } = config;
  const known = mode === 'answer' || mode === 'select' ? mode : 'off';
  return {
    mode: isModelKey(model) ? known : 'off',
    model: isModelKey(model) ? MODELS[model] : null,
    minOverlap: typeof minOverlap === 'number' ? minOverlap : 1,
  };
}

/** The output of a model and what it cost, read from whichever shape the platform returned. */
async function readRun(response: Response): Promise<ModelRun | null> {
  if (!response.ok) return null;
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return null;
  }
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

/** One call to a model, through the gateway, with a deadline. Null when it does not answer. */
async function runModel(
  env: Env,
  model: ModelSpec,
  request: Record<string, unknown>,
  skipCache = false,
): Promise<ModelRun | null> {
  // The catalogue moves faster than the published types of the binding: the identifier is a
  // string here, checked against our own list (src/worker/models.ts), not against theirs.
  const ai = env.AI as unknown as {
    run: (model: string, input: unknown, options: AiOptions) => Promise<Response>;
  };
  try {
    const response = await ai.run(model.id, request, {
      returnRawResponse: true,
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      gateway: { ...GATEWAY, skipCache },
    });
    return await readRun(response);
  } catch {
    return null;
  }
}

/** False when this visitor asks faster than anyone reads. Fails closed without its secret. */
async function withinRate(request: Request, env: Env): Promise<boolean> {
  const salt: unknown = env.RATE_SALT;
  if (typeof salt !== 'string' || salt.length < 16) return false;
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = await clientKey(ip, salt, new Date().toISOString().slice(0, 10));
  const { success } = await env.RATE.limit({ key });
  return success;
}

const hardStop = (env: Env): number => {
  const value = Number(env.NEURON_HARD_STOP);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_HARD_STOP;
};

async function handleAsk(request: Request, env: Env, origin: string): Promise<Response> {
  if (request.method !== 'POST') return empty(405);
  // Same origin only: no CORS is sent, and a form on another site cannot spend our allowance.
  if (request.headers.get('origin') !== origin) return empty(403);
  const asked = parseAskRequest(await readBody(request));
  if (asked === null) return empty(400);

  const now = new Date();
  const state = effectiveDate(now, { serverDate: now, override: OVERRIDE });
  const config = configured();
  if (!state.silence && config.mode !== 'off' && !(await withinRate(request, env))) {
    return json(LOCAL);
  }
  const budget = env.BUDGET.getByName('global');
  const model = config.model;
  const answer = await answerQuestion(asked, {
    ...config,
    corpusVersion: env.CORPUS_VERSION,
    silence: { silent: state.silence, reopen: state.reopenUtc?.toISOString() ?? null },
    db: env.DB,
    reserve: (neurons) => budget.reserve(neurons, hardStop(env)),
    settle: (reserved, spent) => budget.settle(reserved, spent),
    run: (body) => (model === null ? Promise.resolve(null) : runModel(env, model, body)),
  });
  return json(answer);
}

/** Equal without telling by how much they differ; false when no real key is configured. */
async function keyMatches(given: unknown, expected: unknown): Promise<boolean> {
  if (typeof given !== 'string' || typeof expected !== 'string' || expected.length < 32)
    return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(given)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

/**
 * The bench, on the production path: the same base, the same prompt, the same gateway, the
 * model named in the request — and the same request as the page's: measures and words of the
 * book, which the bench computes from each question of its set as the page would. It returns
 * what the model said and which measures it read — identifiers, never their text — with what
 * it cost and how long it took. What the control makes of the output is returned too, so that
 * the bench and production cannot disagree.
 *
 * Two things hold even for whoever has the key. An output in which the model copied what it
 * was shown leaves as a marker (`benchOutput`). And the route is counted by the same limiter
 * as the questions — 429 beyond it, which the bench waits out.
 */
/**
 * At most three judges, each a model of our own list, none twice — and never the writer: a
 * model reading its own sentence is not a second reader.
 */
const MAX_JUDGES = 3;
function judgeKeys(value: unknown, writer: ModelKey): ModelKey[] {
  if (!Array.isArray(value)) return [];
  const listed: unknown[] = value;
  return [...new Set(listed.filter(isModelKey))]
    .filter((judge) => judge !== writer)
    .slice(0, MAX_JUDGES);
}

interface Judgement {
  model: ModelKey;
  /** The label, or null when the judge gave none we know — or did not answer. */
  verdict: JudgeVerdict | null;
  neurons: number | null;
  cached: boolean;
  ms: number;
}

/**
 * Judges of a gist (trial, D16.38): each reads the sentence the control let through against the
 * measure, here, in the invocation that wrote it. Labels leave; nothing a judge wrote does.
 */
async function judgements(
  env: Env,
  candidate: { id: string; text: string },
  sentence: string,
  keys: readonly ModelKey[],
  skipCache: boolean,
): Promise<Judgement[]> {
  const budget = env.BUDGET.getByName('global');
  const out: Judgement[] = [];
  for (const key of keys) {
    const model = MODELS[key];
    const input = judgeRequest(candidate, sentence, model);
    const reserved = estimateNeurons(input, model);
    const silent: Judgement = { model: key, verdict: null, neurons: null, cached: false, ms: 0 };
    if (!(await budget.reserve(reserved, hardStop(env)))) {
      out.push(silent);
      continue;
    }
    const called = Date.now();
    const run = await runModel(env, model, input, skipCache);
    if (run === null) {
      out.push({ ...silent, ms: Date.now() - called });
      continue;
    }
    await budget.settle(reserved, run.cached ? 0 : (run.neurons ?? reserved));
    out.push({
      model: key,
      verdict: readJudgement(run.output),
      neurons: run.neurons,
      cached: run.cached,
      ms: Date.now() - called,
    });
  }
  return out;
}

async function handleBench(request: Request, env: Env): Promise<Response> {
  if (env.ENVIRONMENT !== 'preview' || request.method !== 'POST') return empty(404);
  const body = await readBody(request);
  if (!isRecord(body) || !(await keyMatches(body['key'], env.BENCH_KEY))) return empty(404);
  if (!(await withinRate(request, env))) return empty(429);
  const { model: key, mode, min_overlap: minOverlap, skip_cache: skipCache, variant } = body;
  const asked = parseAskRequest({
    corpus: env.CORPUS_VERSION,
    ids: body['ids'],
    terms: body['terms'],
  });
  if (
    asked === null ||
    !isModelKey(key) ||
    (mode !== 'answer' && mode !== 'select' && mode !== 'gist')
  ) {
    return empty(400);
  }
  // A gist is one sentence about one measure, written one of the ways the Worker knows — a
  // trial of what could be written ahead of any visitor (08-ia.md §10.8). Bench only.
  const gist = mode === 'gist' && isGistVariant(variant) ? variant : null;
  if (mode === 'gist' && (gist === null || asked.ids.length !== 1)) return empty(400);
  /** What the control reads the output as: sentences, unless a selection was asked for. */
  const written = mode === 'select' ? 'select' : 'answer';
  const model = MODELS[key];
  const started = Date.now();
  const loaded = await loadMeasures(env.DB, asked.ids);
  const loadedMs = Date.now() - started;
  const ids = loaded.candidates.map((c) => c.id);
  const base = { corpus: loaded.state.corpusVersion, ids, load_ms: loadedMs };
  if (loaded.candidates.length === 0) return json({ ...base, ran: false });

  const single = loaded.candidates[0];
  const input =
    gist !== null && single !== undefined
      ? gistRequest(single, gist, model)
      : modelRequest(written, loaded.candidates, keptTerms(asked.terms, loaded.candidates), model);
  const reserved = estimateNeurons(input, model);
  const budget = env.BUDGET.getByName('global');
  if (!(await budget.reserve(reserved, hardStop(env)))) {
    return json({ ...base, ran: false, budget: 'spent', used: await budget.used() });
  }
  const called = Date.now();
  const run = await runModel(env, model, input, skipCache === true);
  const modelMs = Date.now() - called;
  if (run === null) return json({ ...base, ran: false, model_ms: modelMs, reserved });
  await budget.settle(reserved, run.cached ? 0 : (run.neurons ?? reserved));
  const overlap = typeof minOverlap === 'number' ? minOverlap : 0;
  const verdict = control(written, run.output, loaded.candidates, overlap);
  // The sentence a judge reads is the one the control just let through — it never comes from
  // the body of a request — and only a gist of one measure is judged.
  const passed =
    gist !== null && verdict.kind === 'answer' && verdict.sentences.length === 1
      ? verdict.sentences[0]
      : undefined;
  const judges =
    passed !== undefined && single !== undefined
      ? await judgements(
          env,
          single,
          passed.text,
          judgeKeys(body['judges'], key),
          skipCache === true,
        )
      : [];
  return json({
    ...base,
    ran: true,
    output: benchOutput(run.output, loaded.candidates),
    verdict,
    judges,
    neurons: run.neurons,
    reserved,
    cached: run.cached,
    model_ms: modelMs,
    used: await budget.used(),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/ask') return await handleAsk(request, env, url.origin);
      if (url.pathname === '/api/bench') return await handleBench(request, env);
    } catch {
      // Whatever broke, the page has an answer to show: what it found by itself.
      return url.pathname === '/api/ask' ? json(LOCAL) : empty(500);
    }
    return empty(404);
  },
} satisfies ExportedHandler<Env>;
