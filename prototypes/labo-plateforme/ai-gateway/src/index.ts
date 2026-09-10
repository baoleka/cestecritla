// T7 lab « ai-gateway »: calls Mistral Small 3.1 through the AI Gateway « aec » K times with an
// IDENTICAL input and reports, per call, the cf-aig-cache-status header, usage.neurons from the
// body and the latency. See README.md for the experiment protocol and the measurements.
//
// GET /q?text=<prompt>&n=<1..10>&key=<LAB_KEY>[&raw=1][&skip=1]
//   - text: defaults to a neutral French prompt about the weather (never political);
//   - n: number of sequential calls with the same input (default 1, max 10);
//   - raw=1: include the full response body of each call (debug);
//   - skip=1: gateway.skipCache = true (documents the BYPASS status).
//
// Wall-clock in a Worker only advances on I/O; the AI call is I/O, so Date.now() deltas are a fair
// end-to-end latency (Worker → gateway → Workers AI → Worker). CPU time is measured from outside
// with the GraphQL dataset workersInvocationsAdaptive (see scripts/).

const MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';
const GATEWAY_ID = 'aec';
const CACHE_TTL_S = 2_592_000; // 30 days, the documented maximum
const MAX_CALLS = 10;
const MAX_TEXT_CHARS = 200;
const DEFAULT_PROMPT = 'Décris en une phrase le temps qu’il fait à Paris un matin de printemps.';

interface UsageShape {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  neurons?: number;
}

interface CallResult {
  i: number;
  status: number;
  cacheStatus: string | null;
  neurons: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number;
  responsePreview: string;
  aigHeaders: Record<string, string>;
  raw?: unknown;
}

interface Report {
  model: string;
  gateway: { id: string; cacheTtl: number; collectLog: false; skipCache: boolean };
  input: { text: string; maxTokens: number; temperature: number };
  calls: CallResult[];
  summary: {
    hit: number;
    miss: number;
    bypass: number;
    other: number;
    neuronsReportedTotal: number;
    neuronsReportedOnHits: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// The raw response of the REST API is { result: { response, usage }, success }, and the binding
// with returnRawResponse may forward it as is or unwrapped: look in both places.
function extractUsage(body: unknown): UsageShape {
  if (!isRecord(body)) return {};
  const inner = isRecord(body['result']) ? body['result'] : body;
  const usage = isRecord(inner['usage']) ? inner['usage'] : {};
  const out: UsageShape = {};
  const pt = asNumber(usage['prompt_tokens']);
  const ct = asNumber(usage['completion_tokens']);
  const tt = asNumber(usage['total_tokens']);
  const ne = asNumber(usage['neurons']);
  if (pt !== null) out.prompt_tokens = pt;
  if (ct !== null) out.completion_tokens = ct;
  if (tt !== null) out.total_tokens = tt;
  if (ne !== null) out.neurons = ne;
  return out;
}

function extractText(body: unknown): string {
  if (!isRecord(body)) return '';
  const inner = isRecord(body['result']) ? body['result'] : body;
  const response = inner['response'];
  return typeof response === 'string' ? response : '';
}

const MIN_KEY_CHARS = 16;

// Constant-time comparison: hash both sides first (timingSafeEqual needs equal lengths, and a
// length check would leak the key length). Fails closed when the secret binding is missing or
// too short to be a real key (e.g. a Worker deployed without `wrangler secret put LAB_KEY`).
async function keyMatches(given: string | null, expected: unknown): Promise<boolean> {
  if (given === null || typeof expected !== 'string' || expected.length < MIN_KEY_CHARS)
    return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    },
  });
}

interface RunOptions {
  includeRaw: boolean;
  skipCache: boolean;
}

async function runOnce(env: Env, text: string, i: number, opts: RunOptions): Promise<CallResult> {
  const t0 = Date.now();
  const res = await env.AI.run(
    MODEL,
    {
      messages: [{ role: 'user', content: text }],
      max_tokens: 40,
      temperature: 0,
    },
    {
      returnRawResponse: true,
      gateway: {
        id: GATEWAY_ID,
        cacheTtl: CACHE_TTL_S,
        skipCache: opts.skipCache,
        // Per-request opt-out of AI Gateway logging (typed in workers-types 5.20260908.1).
        // The gateway-level « Logs OFF » set in the dashboard is the primary control; this is
        // defence in depth for the day someone flips the gateway setting.
        collectLog: false,
      },
    },
  );
  const bodyText = await res.text();
  const latencyMs = Date.now() - t0;

  let body: unknown = null;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText.slice(0, 500);
  }
  const usage = extractUsage(body);
  const aigHeaders: Record<string, string> = {};
  res.headers.forEach((value, name) => {
    if (name.startsWith('cf-aig-') || name === 'cf-cache-status' || name === 'content-type') {
      aigHeaders[name] = value;
    }
  });

  const result: CallResult = {
    i,
    status: res.status,
    cacheStatus: res.headers.get('cf-aig-cache-status'),
    neurons: usage.neurons ?? null,
    tokensIn: usage.prompt_tokens ?? null,
    tokensOut: usage.completion_tokens ?? null,
    latencyMs,
    responsePreview: extractText(body).slice(0, 120),
    aigHeaders,
  };
  if (opts.includeRaw) result.raw = body;
  return result;
}

async function handleQuery(url: URL, env: Env): Promise<Response> {
  if (!(await keyMatches(url.searchParams.get('key'), env.LAB_KEY))) {
    return json({ error: 'missing or wrong key' }, 401);
  }
  const text = url.searchParams.get('text') ?? DEFAULT_PROMPT;
  if (text.length === 0 || text.length > MAX_TEXT_CHARS) {
    return json({ error: `text must be 1..${String(MAX_TEXT_CHARS)} characters` }, 400);
  }
  const nRaw = Number(url.searchParams.get('n') ?? '1');
  if (!Number.isInteger(nRaw) || nRaw < 1 || nRaw > MAX_CALLS) {
    return json({ error: `n must be an integer in 1..${String(MAX_CALLS)}` }, 400);
  }
  const opts: RunOptions = {
    includeRaw: url.searchParams.get('raw') === '1',
    skipCache: url.searchParams.get('skip') === '1',
  };

  // Sequential on purpose: the first call must have populated the cache before the second starts.
  const calls: CallResult[] = [];
  for (let i = 1; i <= nRaw; i += 1) {
    calls.push(await runOnce(env, text, i, opts));
  }

  const summary: Report['summary'] = {
    hit: 0,
    miss: 0,
    bypass: 0,
    other: 0,
    neuronsReportedTotal: 0,
    neuronsReportedOnHits: 0,
  };
  for (const c of calls) {
    const s = (c.cacheStatus ?? '').toUpperCase();
    if (s === 'HIT') summary.hit += 1;
    else if (s === 'MISS') summary.miss += 1;
    else if (s === 'BYPASS') summary.bypass += 1;
    else summary.other += 1;
    summary.neuronsReportedTotal += c.neurons ?? 0;
    if (s === 'HIT') summary.neuronsReportedOnHits += c.neurons ?? 0;
  }

  const report: Report = {
    model: MODEL,
    gateway: {
      id: GATEWAY_ID,
      cacheTtl: CACHE_TTL_S,
      collectLog: false,
      skipCache: opts.skipCache,
    },
    input: { text, maxTokens: 40, temperature: 0 },
    calls,
    summary,
  };
  return json(report);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'GET') return json({ error: 'GET only' }, 405);
    if (url.pathname === '/q') {
      try {
        return await handleQuery(url, env);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return json({ error: 'ai call failed', message }, 502);
      }
    }
    if (url.pathname === '/') {
      return new Response(
        'aec-lab-aig — T7 lab. GET /q?text=…&n=K&key=… (see prototypes/labo-plateforme/ai-gateway/README.md)\n',
        { headers: { 'content-type': 'text/plain; charset=utf-8' } },
      );
    }
    return json({ error: 'not found' }, 404);
  },
} satisfies ExportedHandler<Env>;
