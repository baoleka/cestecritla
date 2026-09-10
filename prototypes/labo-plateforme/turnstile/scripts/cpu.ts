// CPU time per invocation of the deployed lab Worker, from the Cloudflare GraphQL Analytics API
// (workersInvocationsAdaptive), same method as docs/discovery/06-partage.md §2.3.
// The wrangler OAuth token is read at runtime from ~/.config/.wrangler/config/default.toml and never printed.
// Run: npm run cpu -- <since ISO> <until ISO>   (defaults: last 30 minutes)

import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const ACCOUNT_TAG = process.env['CLOUDFLARE_ACCOUNT_ID'] ?? 'f8b71fde291412da1f4e46c8ab005317';
const SCRIPT_NAME = process.env['LAB_SCRIPT'] ?? 'aec-lab-turnstile';
const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

interface Quantiles {
  readonly cpuTimeP50: number;
  readonly cpuTimeP90: number;
  readonly cpuTimeP99: number;
  readonly wallTimeP50: number;
  readonly wallTimeP99: number;
}

interface InvocationGroup {
  readonly dimensions: { readonly status: string };
  readonly sum: {
    readonly requests: number;
    readonly errors: number;
    readonly subrequests: number;
  };
  readonly quantiles: Quantiles;
}

interface GraphqlResponse {
  readonly data: {
    readonly viewer: {
      readonly accounts: readonly {
        readonly workersInvocationsAdaptive: readonly InvocationGroup[];
      }[];
    };
  } | null;
  readonly errors: readonly { readonly message: string }[] | null;
}

async function readOauthToken(): Promise<string> {
  const configPath = path.join(os.homedir(), '.config', '.wrangler', 'config', 'default.toml');
  const toml = await readFile(configPath, 'utf8');
  const match = /^oauth_token\s*=\s*"([^"]+)"/m.exec(toml);
  if (match?.[1] === undefined) throw new Error(`oauth_token not found in ${configPath}`);
  return match[1];
}

function isGraphqlResponse(value: unknown): value is GraphqlResponse {
  return typeof value === 'object' && value !== null && 'data' in value;
}

async function main(): Promise<void> {
  const [sinceArg, untilArg] = process.argv.slice(2);
  const until = untilArg === undefined ? new Date() : new Date(untilArg);
  const since =
    sinceArg === undefined ? new Date(until.getTime() - 30 * 60_000) : new Date(sinceArg);
  const token = await readOauthToken();

  const query = `query LabCpu($accountTag: string!, $scriptName: string!, $since: Time!, $until: Time!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        workersInvocationsAdaptive(
          limit: 100
          filter: { scriptName: $scriptName, datetime_geq: $since, datetime_leq: $until }
          orderBy: [sum_requests_DESC]
        ) {
          dimensions { status }
          sum { requests errors subrequests }
          quantiles { cpuTimeP50 cpuTimeP90 cpuTimeP99 wallTimeP50 wallTimeP99 }
        }
      }
    }
  }`;

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: ACCOUNT_TAG,
        scriptName: SCRIPT_NAME,
        since: since.toISOString(),
        until: until.toISOString(),
      },
    }),
  });
  const parsed: unknown = await response.json();
  if (!isGraphqlResponse(parsed))
    throw new Error(`unexpected GraphQL response (HTTP ${response.status})`);
  if (parsed.errors !== null && parsed.errors.length > 0) {
    throw new Error(`GraphQL: ${parsed.errors.map((error) => error.message).join('; ')}`);
  }
  const groups = parsed.data?.viewer.accounts[0]?.workersInvocationsAdaptive ?? [];
  const lines = [
    `# ${SCRIPT_NAME} — ${since.toISOString()} → ${until.toISOString()} (workersInvocationsAdaptive, µs)`,
    '| status | requests | errors | subrequests | CPU p50 | CPU p90 | CPU p99 | wall p50 | wall p99 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...groups.map(
      (group) =>
        `| ${group.dimensions.status} | ${group.sum.requests} | ${group.sum.errors} | ${group.sum.subrequests} | ${group.quantiles.cpuTimeP50} | ${group.quantiles.cpuTimeP90} | ${group.quantiles.cpuTimeP99} | ${group.quantiles.wallTimeP50} | ${group.quantiles.wallTimeP99} |`,
    ),
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `cpu query failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
