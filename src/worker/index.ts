/**
 * "C'est écrit là" — the whole server side: the routes under `/api/` (D16.7, D16.51).
 *
 * The Worker orchestrates, it does not compute: 10 ms of CPU per invocation is the entire
 * budget (D4.1, D7.1). This file is the wiring to the platform; the paths themselves are
 * src/worker/chat.ts and src/worker/ask.ts.
 *
 *   /api/gists   the sentences the editor read, for the measures a request names. No model.
 *   /api/chat    THE ONLY ROUTE THAT RECEIVES A SENTENCE A VISITOR TYPED (D16.46) — after
 *                their agreement, whose version the request must carry. A model whose host
 *                keeps nothing explains words of the read sentences; it is called directly,
 *                through no gateway and no cache, and it is never shown a text of the book.
 *
 * `/api/ask`, the route of the written answer of D16.4, is gone: the bench closed that mode
 * (D16.33), and a route that exists is a route a mistake in a file could open. Its contract and
 * its control remain, for the bench alone (src/lib/ask-contract.ts, ask-validate.ts).
 *
 * Everything else — every page, the search, the game — is a static file, served outside the
 * invocation counter. The site is designed to work with `/api/*` entirely down.
 *
 * What never happens here: a log (no `console.*`, observability off, gateway logs off), a
 * write about a visitor, an answer that carries a word of the programme, a call to anything
 * outside Cloudflare — not even to a bot check: there is none (D16.23), the rate limiter and
 * the allowance are the whole defence, and an emptied allowance closes the model until it
 * comes back — twenty-four hours that roll, not a midnight (budget-core.ts) — and nothing
 * else.
 *
 * `/api/bench` exists on the preview Worker only, behind a key: it is how the bench measures
 * the candidates on the production path (PLAN-JEU §2.4). It answers 404 everywhere else.
 */
import flags from '../../public/flags.json';
import askConfig from '../../data/2026/ask.json';
import glossary from '../../data/2026/glossary.json';
import riposte from '../../data/2026/riposte.json';
import { parseAskRequest } from '../lib/ask-contract.js';
import { modeFor } from '../lib/ask-mode.js';
import { validateExplanation } from '../lib/ask-validate.js';
import { consentOf } from '../lib/chat-consent.js';
import {
  FOLLOW_UPS,
  MAX_CHAT_IDS,
  cleanQuestion,
  parseChatRequest,
  parseGistsRequest,
  parseGistsResponse,
  type ChatResponse,
  type FollowUp,
  type GistsResponse,
} from '../lib/chat-contract.js';
import { knownOf, notionsIn } from '../lib/notions.js';
import { effectiveDate, type SilenceOverride } from '../lib/silence.js';
import {
  EXHAUSTED,
  benchOutput,
  control,
  readRun,
  saysExhausted,
  type Exhausted,
  type ModelRun,
} from './ask.js';
import { DEFAULT_HARD_STOP } from './budget-core.js';
import {
  answerChat,
  answerGists,
  closedChat,
  closedGists,
  EXPLAIN_ROOM,
  explainedOutput,
} from './chat.js';
import { clientKey, readBody, type RateLane } from './guards.js';
import { keptTerms, loadMeasures } from './measures.js';
import { MODELS, isModelKey, keepsNothing, type ModelKey } from './models.js';
import {
  estimateNeurons,
  explainRequest,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * What a person wrote and re-read (data/2026/glossary.json, riposte.json), built into the
 * Worker: the objections that never reach a model, the cards handed to it with a question.
 */
const KNOWN = knownOf(glossary.entries, riposte.entries);

/**
 * The chat as this Worker runs it: open only when data/2026/ask.json says "chat" for the host
 * this Worker serves (`ENVIRONMENT`: the preview host may ask before production does) AND
 * names a model whose host writes that it keeps nothing of a call (src/worker/models.ts) — a
 * question is never handed to another.
 */
function chatConfigured(env: Env): {
  mode: 'chat' | 'off';
  model: ModelSpec | null;
  minShared: number | undefined;
} {
  const config: Record<string, unknown> = askConfig;
  const { model, min_shared: minShared } = config;
  // The same rule as the pages (src/lib/ask-mode.ts): the preview host may ask before
  // production does, never the other way. Anything but "preview" is production.
  const mode = modeFor(config, env.ENVIRONMENT === 'preview' ? 'preview' : 'apex');
  const reads = isModelKey(model) && keepsNothing(model) ? MODELS[model] : null;
  return {
    mode: mode === 'chat' && reads !== null ? 'chat' : 'off',
    model: reads,
    minShared: typeof minShared === 'number' ? minShared : undefined,
  };
}

/**
 * One call to the model of the chat, straight to Workers AI, with a deadline. No gateway: so no
 * cache keeping an answer under a key computed from a question, and no log of one (D16.51).
 */
async function runDirect(
  env: Env,
  model: ModelSpec,
  request: Record<string, unknown>,
): Promise<ModelRun | Exhausted | null> {
  const ai = env.AI as unknown as {
    run: (
      model: string,
      input: unknown,
      options: { returnRawResponse: true; signal: AbortSignal },
    ) => Promise<Response>;
  };
  try {
    const response = await ai.run(model.id, request, {
      returnRawResponse: true,
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    });
    return await readRun(response);
  } catch (error) {
    return saysExhausted(error) ? EXHAUSTED : null;
  }
}

/**
 * One call to a model, through the gateway, with a deadline. Null when it does not answer;
 * `EXHAUSTED` when the platform refuses it for want of allowance (ask.ts, `readRun`).
 */
async function runModel(
  env: Env,
  model: ModelSpec,
  request: Record<string, unknown>,
  skipCache = false,
): Promise<ModelRun | Exhausted | null> {
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
  } catch (error) {
    // Cut at the deadline, or broken — unless the error itself says the allowance is used up.
    return saysExhausted(error) ? EXHAUSTED : null;
  }
}

/**
 * False when this visitor asks faster than anyone reads — on this route: each has its own count
 * (guards.ts, `RateLane`). Fails closed without its secret.
 */
async function withinRate(request: Request, env: Env, lane: RateLane): Promise<boolean> {
  const salt: unknown = env.RATE_SALT;
  if (typeof salt !== 'string' || salt.length < 16) return false;
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = await clientKey(ip, salt, new Date().toISOString().slice(0, 10), lane);
  const { success } = await env.RATE.limit({ key });
  return success;
}

const hardStop = (env: Env): number => {
  const value = Number(env.NEURON_HARD_STOP);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_HARD_STOP;
};

/**
 * The platform has just refused a call of the bench for want of allowance. A refused call is
 * not billed: its reservation goes back. And nothing will answer for a while: the model is
 * closed, so that what comes next is answered « spent » without a call made for nothing.
 */
async function closeAndRelease(env: Env, reserved: number): Promise<void> {
  const budget = env.BUDGET.getByName('global');
  await budget.close();
  await budget.release(reserved);
}

const LOCAL_GISTS: GistsResponse = { kind: 'local' };
const QUIET: ChatResponse = { kind: 'quiet', why: 'none' };

/** The hour, as both routes of the chat need it: frozen or not, and until when. */
function silenceNow(): { silent: boolean; reopen: string | null } {
  const now = new Date();
  const state = effectiveDate(now, { serverDate: now, override: OVERRIDE });
  return { silent: state.silence, reopen: state.reopenUtc?.toISOString() ?? null };
}

async function handleGists(request: Request, env: Env, origin: string): Promise<Response> {
  if (request.method !== 'POST') return empty(405);
  // Same origin only: no CORS is sent, and a page of another site cannot read our sentences.
  if (request.headers.get('origin') !== origin) return empty(403);
  // A closed route reads nothing: what it answers depends on the hour and on the mode, never
  // on what it was sent — so the body is not even opened (security review of 14/11/2026).
  const silence = silenceNow();
  const config = chatConfigured(env);
  const closed = closedGists({ mode: config.mode, silence });
  if (closed !== null) return json(closed);
  if (!(await withinRate(request, env, 'gists'))) return json(LOCAL_GISTS);
  const asked = parseGistsRequest(await readBody(request));
  if (asked === null) return empty(400);

  const budget = env.BUDGET.getByName('global');
  const answer = await answerGists(asked, {
    mode: config.mode,
    model: config.model,
    corpusVersion: env.CORPUS_VERSION,
    silence,
    db: env.DB,
    available: () => budget.available(EXPLAIN_ROOM, hardStop(env)),
  });
  return json(answer);
}

async function handleChat(request: Request, env: Env, origin: string): Promise<Response> {
  if (request.method !== 'POST') return empty(405);
  // Same origin only: a form on another site cannot spend our allowance, nor send a question.
  if (request.headers.get('origin') !== origin) return empty(403);
  // A closed route reads nothing — least of all a question: during a freeze, where the site
  // asks nothing, where no model was retained, the body is not even opened.
  const silence = silenceNow();
  const config = chatConfigured(env);
  const closed = closedChat({ mode: config.mode, silence, model: config.model });
  if (closed !== null) return json(closed);
  if (!(await withinRate(request, env, 'chat'))) return json(QUIET);
  const asked = parseChatRequest(await readBody(request));
  if (asked === null) return empty(400);

  const budget = env.BUDGET.getByName('global');
  const model = config.model;
  const answer = await answerChat(asked, {
    mode: config.mode,
    model,
    corpusVersion: env.CORPUS_VERSION,
    silence,
    db: env.DB,
    // The agreement this Worker knows: the kit it was built with, worded for its model.
    consent: model === null ? '' : consentOf(model.name),
    objections: KNOWN.objections,
    cards: KNOWN.cards,
    minShared: config.minShared,
    reserve: (neurons) => budget.reserve(neurons, hardStop(env)),
    settle: (reserved, spent) => budget.settle(reserved, spent),
    release: (reserved) => budget.release(reserved),
    close: () => budget.close(),
    run: (body) => (model === null ? Promise.resolve(null) : runDirect(env, model, body)),
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
    if (run === EXHAUSTED) {
      // As if it had not been asked — and the judges after it are not: the model is closed.
      await closeAndRelease(env, reserved);
      out.push(silent);
      continue;
    }
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
  if (!(await withinRate(request, env, 'bench'))) return empty(429);
  const { model: key, mode, min_overlap: minOverlap, skip_cache: skipCache, variant } = body;
  if (mode === 'explain') return benchExplain(body, env);
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
  /** No call, or a call the platform refused: the bench stops on this, and asks nothing more. */
  const spent = async (): Promise<Response> =>
    json({ ...base, ran: false, budget: 'spent', used: await budget.used() });
  if (!(await budget.reserve(reserved, hardStop(env)))) return spent();
  const called = Date.now();
  const run = await runModel(env, model, input, skipCache === true);
  const modelMs = Date.now() - called;
  if (run === EXHAUSTED) {
    await closeAndRelease(env, reserved);
    return spent();
  }
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

/**
 * The explanation, on the bench (PLAN-CHAT §6, lot C8): the same instruction, the same direct
 * call and the same control as `/api/chat` — with a question of the bench's own set, and read
 * sentences the bench hands in: ours, written on the editor's machine, so that explanations can
 * be measured before any sentence is deposited. The base is not read at all.
 *
 * What the model wrote leaves as sentences — it was shown no text of the book, so it holds
 * none — and only as sentences: whatever else an output carries stays here (`explainedOutput`).
 */
async function benchExplain(body: Record<string, unknown>, env: Env): Promise<Response> {
  const { model: key, question, follow, min_shared: minShared } = body;
  // Read as the page would read them: identifiers of the book, one line each, each once.
  const read = parseGistsResponse({
    kind: 'gists',
    corpus: env.CORPUS_VERSION,
    gists: body['gists'],
    ai: false,
  });
  const gists = read?.kind === 'gists' ? read.gists : [];
  const asked = typeof question === 'string' ? cleanQuestion(question) : null;
  const again: FollowUp | null | undefined =
    follow === undefined ? null : FOLLOW_UPS.find((known) => known === follow);
  if (
    !isModelKey(key) ||
    asked === null ||
    again === undefined ||
    gists.length === 0 ||
    gists.length > MAX_CHAT_IDS
  ) {
    return empty(400);
  }
  const model = MODELS[key];
  const named = new Set(notionsIn(asked, KNOWN.cards));
  const cards = KNOWN.cards.filter((card) => named.has(card.id));
  const input = explainRequest(asked, gists, cards, again, model);
  const reserved = estimateNeurons(input, model);
  const budget = env.BUDGET.getByName('global');
  const base = { corpus: env.CORPUS_VERSION, ids: gists.map((gist) => gist.id) };
  if (!(await budget.reserve(reserved, hardStop(env)))) {
    return json({ ...base, ran: false, budget: 'spent', used: await budget.used() });
  }
  const called = Date.now();
  const run = await runDirect(env, model, input);
  const modelMs = Date.now() - called;
  if (run === EXHAUSTED) {
    await closeAndRelease(env, reserved);
    return json({ ...base, ran: false, budget: 'spent', used: await budget.used() });
  }
  if (run === null) return json({ ...base, ran: false, model_ms: modelMs, reserved });
  await budget.settle(reserved, run.neurons ?? reserved);
  const verdict = validateExplanation(
    run.output,
    { question: asked, shown: [...gists.map((g) => g.text), ...cards.map((c) => c.plain)] },
    typeof minShared === 'number' ? { minShared } : {},
  );
  return json({
    ...base,
    ran: true,
    // What the schema names and nothing else: an output of another shape leaves as a marker.
    output: explainedOutput(run.output),
    verdict,
    cards: cards.map((card) => card.id),
    neurons: run.neurons,
    reserved,
    model_ms: modelMs,
    used: await budget.used(),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/gists') return await handleGists(request, env, url.origin);
      if (url.pathname === '/api/chat') return await handleChat(request, env, url.origin);
      if (url.pathname === '/api/bench') return await handleBench(request, env);
    } catch {
      // Whatever broke, the page has something to show: what it found by itself, and its read
      // sentences without an explanation.
      if (url.pathname === '/api/gists') return json(LOCAL_GISTS);
      if (url.pathname === '/api/chat') return json(QUIET);
      return empty(500);
    }
    return empty(404);
  },
} satisfies ExportedHandler<Env>;
