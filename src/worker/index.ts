/**
 * "C'est écrit là" — the whole server side of v1 and v2.
 *
 * The Worker orchestrates, it does not compute: 10 ms of CPU per invocation is the entire
 * budget (D4.1, D7.1). No image rendering, no indexing, no crawl, no HTML parser at runtime.
 * Everything heavier than 1 ms happens at build time.
 *
 * Only /api/* reaches this script (assets.run_worker_first). Everything else — the 89 sections,
 * /m/, /s/, /c/, /a/, search, the FAQ, the glossary, the extractive chat, the designed refusal,
 * the riposte, the games, sharing, offline — is a static file, served free and outside the
 * invocation counter. The app is designed to work with /api/* entirely down (§7).
 */

import { MAX_BEACON_BYTES, parseBeacon, toDataPoints } from './events.ts';

/** No body, no cache, no referrer, never indexed. Nothing here can leak a URL to host logs. */
const NO_STORE: Record<string, string> = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'noindex',
  'referrer-policy': 'no-referrer',
};

const empty = (status: number): Response => new Response(null, { status, headers: NO_STORE });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== '/api/e') return empty(404);
    if (request.method !== 'POST') return empty(405);

    // Same-origin only. No CORS is sent, so a cross-origin POST cannot read the answer
    // anyway; rejecting it here keeps forged volume off the request quota as well.
    const origin = request.headers.get('origin');
    if (origin !== null && origin !== url.origin) return empty(403);

    // Read at most MAX_BEACON_BYTES. A larger body is a forged beacon, not a big session.
    const raw = await request.text();
    if (raw.length > MAX_BEACON_BYTES) return empty(413);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // No console.* on this path: it would put client content in host logs (D7.8, ADR-10).
      return empty(400);
    }

    const beacon = parseBeacon(parsed, env.CORPUS_VERSION);
    if (beacon === null) return empty(400);

    for (const point of toDataPoints(beacon)) {
      env.ANALYTICS.writeDataPoint(point);
    }

    // 204: the client sends this with sendBeacon and never reads the answer.
    return empty(204);
  },
} satisfies ExportedHandler<Env>;
