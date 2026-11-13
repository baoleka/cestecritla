/**
 * "C'est écrit là" — the whole server side: one route, `/api/ask` (D16.7).
 *
 * The Worker orchestrates, it does not compute: 10 ms of CPU per invocation is the entire
 * budget (D4.1, D7.1). It asks the private base which measures a question finds, asks a model
 * hosted by Cloudflare to say in our words what they provide, and lets through only what the
 * control accepts (src/lib/ask-validate.ts). The path itself is src/worker/ask.ts; this file is
 * the wiring to the platform.
 *
 * Everything else — every page, the search, the game — is a static file, served outside the
 * invocation counter. The site is designed to work with `/api/*` entirely down.
 *
 * What never happens here: a log (no `console.*`, observability off, gateway logs off), a
 * write about a visitor, an answer that carries a word of the programme, a call to an AI
 * service outside Cloudflare.
 *
 * `/api/bench` exists on the preview Worker only, behind a key: it is how the bench measures
 * the candidates on the production path (PLAN-JEU §2.4). It answers 404 everywhere else.
 */
import riposte from '../../data/2026/riposte.json';
import synonyms from '../../data/2026/synonyms.json';
import askConfig from '../../data/2026/ask.json';
import { parseAskRequest, type AskMode, type AskResponse } from '../lib/ask-contract.js';
import { effectiveDate } from '../lib/silence.js';
import { answerQuestion, control, type ModelRun } from './ask.js';
import { DEFAULT_HARD_STOP } from './budget-core.js';
import { MODELS, isModelKey } from './models.js';
import { estimateNeurons, modelRequest, type ModelSpec } from './prompt.js';
import { retrieve } from './retrieve.js';
import { verifyTurnstile } from './turnstile.js';

export { NeuronBudget } from './budget.js';

/** The AI Gateway every call goes through: thirty days of cache, and no log of any request. */
const GATEWAY = { id: 'aec', cacheTtl: 2_592_000, collectLog: false } as const;
const MODEL_TIMEOUT_MS = 6_000;
/** A question, a token and a version: more than this is not a request of the page. */
const MAX_BODY_BYTES = 6_144;

/** No cache, no referrer, never indexed: nothing here can leak into a log or an index. */
const HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'noindex',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
};

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

/** A key for the rate limiter that says nothing of the address it was made from (D7.5). */
async function clientKey(ip: string, salt: string, day: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${day}:${ip}`));
  return [...new Uint8Array(mac, 0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
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

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
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
  const state = effectiveDate(now, { serverDate: now });
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
    entries: riposte.entries,
    synonyms: synonyms.groups,
    db: env.DB,
    verify: (token) =>
      verifyTurnstile(token, { secret: env.TURNSTILE_SECRET, hostnames: env.TURNSTILE_HOSTNAMES }),
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
 * model named in the request. It returns what the model said and which measures it was given —
 * identifiers, never their text — with what it cost and how long it took. What the control
 * makes of the output is returned too, so that the bench and production cannot disagree.
 */
async function handleBench(request: Request, env: Env): Promise<Response> {
  if (env.ENVIRONMENT !== 'preview' || request.method !== 'POST') return empty(404);
  const body = await readBody(request);
  if (!isRecord(body) || !(await keyMatches(body['key'], env.BENCH_KEY))) return empty(404);
  const { q, model: key, mode, min_overlap: minOverlap, skip_cache: skipCache } = body;
  if (typeof q !== 'string' || !isModelKey(key) || (mode !== 'answer' && mode !== 'select')) {
    return empty(400);
  }
  const model = MODELS[key];
  const started = Date.now();
  const found = await retrieve(env.DB, q, synonyms.groups);
  const retrievedMs = Date.now() - started;
  const ids = found.candidates.map((c) => c.id);
  const base = { corpus: found.state.corpusVersion, ids, retrieve_ms: retrievedMs };
  if (found.candidates.length === 0) return json({ ...base, ran: false });

  const input = modelRequest(mode, q, found.candidates, model);
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
  return json({
    ...base,
    ran: true,
    output: run.output,
    verdict: control(mode, run.output, found.candidates, overlap),
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
