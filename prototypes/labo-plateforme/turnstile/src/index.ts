// T7 lab "turnstile": canonical server-side siteverify inside a Free-plan Worker.
// Browser -> this Worker (/verify) -> https://challenges.cloudflare.com/turnstile/v0/siteverify.
// Everything else on lab.cestecritla.fr is a static asset (public/), including the CSP in public/_headers.
// The /nonce variant re-serves index.html with a per-request nonce and a `strict-dynamic` CSP,
// to check the nonce approach recommended by the Turnstile CSP reference.

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 10_000;
const MAX_TOKEN_LENGTH = 2048;
const MAX_BODY_BYTES = 8192;

/** Subset of the siteverify JSON body we read (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). */
interface SiteverifyResult {
  readonly success: boolean;
  readonly challenge_ts?: string;
  readonly hostname?: string;
  readonly 'error-codes'?: readonly string[];
  readonly action?: string;
  readonly cdata?: string;
  readonly metadata?: { readonly ephemeral_id?: string };
}

/** What the lab page receives. `ok` is the gate (success + action + hostname); the rest is evidence. */
interface VerifyResponse {
  readonly ok: boolean;
  readonly reason: string | null;
  readonly success: boolean | null;
  readonly hostname: string | null;
  readonly challenge_ts: string | null;
  readonly action: string | null;
  readonly cdata: string | null;
  readonly 'error-codes': readonly string[];
  readonly ephemeral_id_present: boolean;
  readonly remoteip_sent: boolean;
  readonly siteverify_ms: number | null;
}

const JSON_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
};

function json(body: VerifyResponse | { readonly error: string }, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS });
}

function isSiteverifyResult(value: unknown): value is SiteverifyResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { success?: unknown }).success === 'boolean'
  );
}

function parseHostnames(list: string): ReadonlySet<string> {
  return new Set(
    list
      .split(',')
      .map((hostname) => hostname.trim())
      .filter((hostname) => hostname.length > 0),
  );
}

/** Reads the token from a form post (native submit) or a JSON post (fetch), bounded in size. */
async function readToken(request: Request): Promise<string | null> {
  // A chunked body has no Content-Length: refuse it rather than let formData()/json() buffer an
  // unbounded body (browsers always send Content-Length for a form or a string fetch body).
  const declared = request.headers.get('content-length');
  if (declared === null) return null;
  const declaredLength = Number(declared);
  if (!Number.isInteger(declaredLength) || declaredLength <= 0 || declaredLength > MAX_BODY_BYTES)
    return null;
  const contentType = request.headers.get('content-type') ?? '';
  let raw: unknown = null;
  if (
    contentType.startsWith('application/x-www-form-urlencoded') ||
    contentType.startsWith('multipart/form-data')
  ) {
    const form = await request.formData();
    raw = form.get('cf-turnstile-response');
  } else if (contentType.startsWith('application/json')) {
    const body: unknown = await request.json();
    if (typeof body === 'object' && body !== null)
      raw = (body as Record<string, unknown>)['cf-turnstile-response'];
  }
  return typeof raw === 'string' && raw.length > 0 && raw.length <= MAX_TOKEN_LENGTH ? raw : null;
}

function failure(reason: string, status: number, extra?: Partial<VerifyResponse>): Response {
  return json(
    {
      ok: false,
      reason,
      success: null,
      hostname: null,
      challenge_ts: null,
      action: null,
      cdata: null,
      'error-codes': [],
      ephemeral_id_present: false,
      remoteip_sent: false,
      siteverify_ms: null,
      ...extra,
    },
    status,
  );
}

async function handleVerify(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('method not allowed', {
      status: 405,
      headers: { allow: 'POST', 'cache-control': 'no-store' },
    });
  }
  const expectedHostnames = parseHostnames(env.TURNSTILE_HOSTNAMES);
  // `wrangler types` declares the secret as a string, but a Worker deployed without
  // `wrangler secret put TURNSTILE_SECRET` has it undefined at runtime: fail closed, not with a TypeError.
  const secret: unknown = env.TURNSTILE_SECRET;
  if (expectedHostnames.size === 0 || typeof secret !== 'string' || secret.length === 0) {
    return failure('misconfigured', 500);
  }

  let token: string | null;
  try {
    token = await readToken(request);
  } catch {
    token = null;
  }
  if (token === null) return failure('missing-or-malformed-token', 403);

  const sendRemoteIp = env.TURNSTILE_SEND_REMOTEIP === 'true';
  const body = new URLSearchParams({ secret, response: token });
  const clientIp = request.headers.get('cf-connecting-ip');
  if (sendRemoteIp && clientIp !== null) body.set('remoteip', clientIp);

  const startedAt = Date.now();
  let result: SiteverifyResult;
  try {
    const upstream = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    if (!upstream.ok) throw new Error(`siteverify ${String(upstream.status)}`);
    const parsed: unknown = await upstream.json();
    if (!isSiteverifyResult(parsed)) throw new Error('siteverify: unexpected body');
    result = parsed;
  } catch (error) {
    // Fail closed: siteverify unreachable, non-2xx or non-JSON. No client data in the log line.
    console.log(
      JSON.stringify({
        event: 'siteverify-error',
        message: error instanceof Error ? error.message : 'unknown',
      }),
    );
    return failure('siteverify-unreachable', 403, {
      remoteip_sent: sendRemoteIp,
      siteverify_ms: Date.now() - startedAt,
    });
  }
  const siteverifyMs = Date.now() - startedAt;

  const hostnameOk = result.hostname !== undefined && expectedHostnames.has(result.hostname);
  const actionOk = result.action === env.TURNSTILE_ACTION;
  const ok = result.success && hostnameOk && actionOk;
  const reason = ok
    ? null
    : !result.success
      ? 'challenge-failed'
      : !hostnameOk
        ? 'hostname-mismatch'
        : 'action-mismatch';

  // Observability without identifiers: outcome, error codes and latency only (D0.22).
  console.log(
    JSON.stringify({
      event: 'verify',
      ok,
      reason,
      codes: result['error-codes'] ?? [],
      siteverifyMs,
    }),
  );

  return json(
    {
      ok,
      reason,
      success: result.success,
      hostname: result.hostname ?? null,
      challenge_ts: result.challenge_ts ?? null,
      action: result.action ?? null,
      cdata: result.cdata ?? null,
      'error-codes': result['error-codes'] ?? [],
      ephemeral_id_present: typeof result.metadata?.ephemeral_id === 'string',
      remoteip_sent: sendRemoteIp,
      siteverify_ms: siteverifyMs,
    },
    ok ? 200 : 403,
  );
}

/** Control variant: index.html without any CSP, to tell a CSP problem from a challenge failure. */
async function handleNoCspPage(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }
  const asset = await env.ASSETS.fetch(new Request(new URL('/', request.url), { method: 'GET' }));
  if (!asset.ok) return new Response('index asset missing', { status: 500 });
  const html = (await asset.text()).replace(
    'data-lab-variant="static"',
    'data-lab-variant="nocsp"',
  );
  return new Response(request.method === 'HEAD' ? null : html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Serves index.html with a fresh nonce on every <script> and a strict-dynamic CSP (CSP3 nonce approach). */
async function handleNoncePage(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }
  const assetUrl = new URL('/', request.url);
  const asset = await env.ASSETS.fetch(new Request(assetUrl, { method: 'GET' }));
  if (!asset.ok) return new Response('index asset missing', { status: 500 });
  // index.html is a few KB: reading it whole is bounded (no unbounded body here).
  const html = await asset.text();
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));
  const rendered = html
    .replaceAll('<script ', `<script nonce="${nonce}" `)
    .replace('data-lab-variant="static"', 'data-lab-variant="nonce"');
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    'frame-src https://challenges.cloudflare.com',
    "connect-src 'self'",
    "style-src 'self'",
    "img-src 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  return new Response(request.method === 'HEAD' ? null : rendered, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': csp,
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-content-type-options': 'nosniff',
      'cross-origin-opener-policy': 'same-origin',
    },
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/verify') return await handleVerify(request, env);
      if (pathname === '/nonce' || pathname === '/nonce/')
        return await handleNoncePage(request, env);
      if (pathname === '/nocsp' || pathname === '/nocsp/')
        return await handleNoCspPage(request, env);
      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.log(
        JSON.stringify({
          event: 'unhandled',
          message: error instanceof Error ? error.message : 'unknown',
        }),
      );
      return json({ error: 'internal' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
