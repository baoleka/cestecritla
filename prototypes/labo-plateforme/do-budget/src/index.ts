// aec-lab-budget — T7 lab. Defence in depth, in order: rate limiter (anti-burst,
// per colo) → Durable Object budget (global daily quota, hard stop at 85 %).
// /ask simulates the cost of one Mistral question (32 neurons); no AI call is made.

import { DEFAULT_COST, isValidCost, nextUtcMidnight } from "./budget-core.ts";
import { clientKey } from "./client-key.ts";
import { NeuronBudget } from "./neuron-budget.ts";

export { NeuronBudget };

const BUDGET_INSTANCE = "global";

const baseHeaders: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...baseHeaders, ...extra } });
}

function secondsUntilReset(nowMs: number): number {
  return Math.max(1, Math.ceil((nextUtcMidnight(nowMs) - nowMs) / 1000));
}

function parseCost(url: URL): number | undefined {
  const raw = url.searchParams.get("cost");
  if (raw === null) {
    return DEFAULT_COST;
  }
  const cost = Number(raw);
  return isValidCost(cost) ? cost : undefined;
}

/** Applies the rate limiter; returns a 429 response when the client is over the limit. */
async function rateLimit(request: Request, env: Env, nowMs: number): Promise<Response | undefined> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const key = await clientKey(ip, env.RL_SALT_SECRET, nowMs);
  const { success } = await env.RATE_LIMITER.limit({ key });
  if (success) {
    return undefined;
  }
  return json({ error: "rate_limited", retryAfter: 60 }, 429, { "retry-after": "60" });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const now = Date.now();

    try {
      if (request.method !== "GET" && request.method !== "POST") {
        return json({ error: "method_not_allowed" }, 405, { allow: "GET, POST" });
      }

      const budget = env.NEURON_BUDGET.getByName(BUDGET_INSTANCE);

      switch (url.pathname) {
        case "/": {
          return json({
            lab: "aec-lab-budget",
            routes: [
              "/ask",
              "/status",
              "/lab/ask?cost=",
              "/lab/release?cost=",
              "/lab/reset (POST)",
              "/lab/alarm",
              "/lab/rl?n=&key=",
            ],
          });
        }

        case "/ask": {
          // 1. anti-burst, local to the colo
          const limited = await rateLimit(request, env, now);
          if (limited !== undefined) {
            return limited;
          }
          // 2. global daily budget (one DO round-trip)
          const t0 = Date.now();
          const decision = await budget.reserve(DEFAULT_COST);
          const doMs = Date.now() - t0;
          const timing = { "server-timing": `do;dur=${String(doMs)}` };
          if (!decision.allowed) {
            const retry = secondsUntilReset(now);
            return json({ ...decision, error: "budget_exhausted", retryAfter: retry }, 503, {
              ...timing,
              "retry-after": String(retry),
            });
          }
          return json(decision, 200, timing);
        }

        case "/status": {
          return json(await budget.status());
        }

        // --- lab-only routes: the DO alone, no rate limiter, for isolated measurements ---
        case "/lab/ask": {
          const cost = parseCost(url);
          if (cost === undefined) {
            return json({ error: "invalid_cost" }, 400);
          }
          const t0 = Date.now();
          const decision = await budget.reserve(cost);
          const doMs = Date.now() - t0;
          return json(decision, decision.allowed ? 200 : 503, {
            "server-timing": `do;dur=${String(doMs)}`,
          });
        }

        case "/lab/release": {
          const cost = parseCost(url);
          if (cost === undefined) {
            return json({ error: "invalid_cost" }, 400);
          }
          return json(await budget.release(cost));
        }

        case "/lab/reset": {
          if (request.method !== "POST") {
            return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
          }
          return json(await budget.reset());
        }

        case "/lab/rl": {
          // Calls the binding n times in this very isolate with a fixed key (no client data):
          // shows the per-machine counter behaviour independently of request distribution.
          const n = Math.min(60, Math.max(1, Number(url.searchParams.get("n") ?? "30") || 30));
          const key = `diag:${url.searchParams.get("key") ?? "fixed"}`;
          const results: boolean[] = [];
          for (let i = 0; i < n; i += 1) {
            const { success } = await env.RATE_LIMITER.limit({ key });
            results.push(success);
          }
          const firstDenied = results.indexOf(false);
          return json({
            key,
            n,
            allowed: results.filter((r) => r).length,
            firstDeniedAt: firstDenied === -1 ? null : firstDenied + 1,
            results: results.map((r) => (r ? 1 : 0)).join(""),
          });
        }

        case "/lab/alarm": {
          const at = await budget.alarmAt();
          return json({ alarmAt: at === null ? null : new Date(at).toISOString() });
        }

        default:
          return json({ error: "not_found" }, 404);
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "unhandled_error",
          path: url.pathname,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      return json({ error: "internal_error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
