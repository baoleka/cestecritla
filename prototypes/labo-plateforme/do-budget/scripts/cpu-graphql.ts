// Measures CPU time per invocation of the deployed Worker (and the Durable Object)
// through the Cloudflare GraphQL Analytics API, the same method as 06-partage.md §2.
//
//   node scripts/cpu-graphql.ts <since ISO> <until ISO> [scriptName]
//
// The wrangler OAuth token is read from ~/.config/.wrangler/config/default.toml at
// runtime and never printed. Requires Node ≥ 22.6 (type stripping).

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ACCOUNT = "f8b71fde291412da1f4e46c8ab005317";
const ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

function readToken(): string {
  const toml = readFileSync(join(homedir(), ".config/.wrangler/config/default.toml"), "utf8");
  const match = /^oauth_token\s*=\s*"([^"]+)"/m.exec(toml);
  if (match?.[1] === undefined) {
    throw new Error("oauth_token not found in wrangler config");
  }
  return match[1];
}

interface Quantiles {
  cpuTimeP50: number;
  cpuTimeP90: number;
  cpuTimeP99: number;
  wallTimeP50: number;
  wallTimeP99: number;
}

interface WorkerGroup {
  dimensions: { status: string };
  sum: { requests: number; errors: number; subrequests: number };
  quantiles: Quantiles;
}

interface DoGroup {
  dimensions: { namespaceId: string };
  sum: { requests: number; errors: number; wallTime: number; storageReadUnits?: number; storageWriteUnits?: number };
  quantiles: { wallTimeP50: number; wallTimeP99: number };
}

interface GraphQLResponse {
  data?: {
    viewer: {
      accounts: Array<{
        workersInvocationsAdaptive?: WorkerGroup[];
        durableObjectsInvocationsAdaptiveGroups?: DoGroup[];
      }>;
    };
  };
  errors?: Array<{ message: string }> | null;
}

const QUERY = `
query Lab($account: string!, $since: Time!, $until: Time!, $script: string!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      workersInvocationsAdaptive(
        limit: 50
        filter: { scriptName: $script, datetime_geq: $since, datetime_leq: $until }
      ) {
        dimensions { status }
        sum { requests errors subrequests }
        quantiles { cpuTimeP50 cpuTimeP90 cpuTimeP99 wallTimeP50 wallTimeP99 }
      }
      durableObjectsInvocationsAdaptiveGroups(
        limit: 50
        filter: { scriptName: $script, datetime_geq: $since, datetime_leq: $until }
      ) {
        dimensions { namespaceId }
        sum { requests errors wallTime }
        quantiles { wallTimeP50 wallTimeP99 }
      }
    }
  }
}`;

async function main(): Promise<void> {
  const [since, until, script = "aec-lab-budget"] = process.argv.slice(2);
  if (since === undefined || until === undefined) {
    throw new Error("usage: node scripts/cpu-graphql.ts <since ISO> <until ISO> [scriptName]");
  }
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${readToken()}`, "content-type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { account: ACCOUNT, since, until, script } }),
  });
  const payload = (await response.json()) as GraphQLResponse;
  if (payload.errors !== undefined && payload.errors !== null && payload.errors.length > 0) {
    throw new Error(payload.errors.map((e) => e.message).join("; "));
  }
  const account = payload.data?.viewer.accounts[0];
  if (account === undefined) {
    throw new Error("no account in response");
  }
  const us = (v: number): string => `${(v / 1000).toFixed(2)} ms`;
  console.log(`window ${since} → ${until}, script ${script}`);
  console.log("Worker invocations (workersInvocationsAdaptive, CPU/wall in ms):");
  for (const g of account.workersInvocationsAdaptive ?? []) {
    console.log(
      `  status=${g.dimensions.status} requests=${g.sum.requests} errors=${g.sum.errors} subrequests=${g.sum.subrequests}` +
        ` cpu p50=${us(g.quantiles.cpuTimeP50)} p90=${us(g.quantiles.cpuTimeP90)} p99=${us(g.quantiles.cpuTimeP99)}` +
        ` wall p50=${us(g.quantiles.wallTimeP50)} p99=${us(g.quantiles.wallTimeP99)}`,
    );
  }
  console.log("Durable Object invocations (durableObjectsInvocationsAdaptiveGroups):");
  for (const g of account.durableObjectsInvocationsAdaptiveGroups ?? []) {
    console.log(
      `  namespace=${g.dimensions.namespaceId} requests=${g.sum.requests} errors=${g.sum.errors}` +
        ` wall p50=${us(g.quantiles.wallTimeP50)} p99=${us(g.quantiles.wallTimeP99)} total wall=${us(g.sum.wallTime)}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
