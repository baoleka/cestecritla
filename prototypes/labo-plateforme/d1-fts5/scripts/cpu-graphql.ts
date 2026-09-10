/**
 * CPU time per invocation of the lab Worker, from the Cloudflare GraphQL Analytics API
 * (`workersInvocationsAdaptive`, the method of docs/discovery/06-partage.md §2.3).
 *
 * The wrangler OAuth token is read at runtime from ~/.config/.wrangler/config/default.toml and
 * never printed. Run from the repository root: `npm run cpu` (lab dir), after `npm run bench`
 * (it reads results/bench-window.json; the dataset lags by a few minutes).
 *
 *   npx tsx prototypes/labo-plateforme/d1-fts5/scripts/cpu-graphql.ts [start ISO] [end ISO]
 *   ONLY=fts-or npx tsx …/cpu-graphql.ts       (reads results/bench-window-fts-or.json, writes cpu-graphql-fts-or.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const labDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const ACCOUNT_TAG = 'f8b71fde291412da1f4e46c8ab005317';
const SCRIPT_NAME = 'aec-lab-fts';
const SUFFIX = process.env['ONLY'] === undefined ? '' : `-${process.env['ONLY']}`;

function readOauthToken(): string {
  const toml = readFileSync(
    join(homedir(), '.config', '.wrangler', 'config', 'default.toml'),
    'utf8',
  );
  const match = /^oauth_token\s*=\s*"([^"]+)"/m.exec(toml);
  if (match?.[1] === undefined) throw new Error('oauth_token not found in wrangler config');
  return match[1];
}

interface Window {
  readonly start: string;
  readonly end: string;
}

function windowFromArgsOrFile(): Window {
  const [start, end] = process.argv.slice(2);
  if (start !== undefined && end !== undefined) return { start, end };
  const file = JSON.parse(
    readFileSync(join(labDir, 'results', `bench-window${SUFFIX}.json`), 'utf8'),
  ) as Window;
  return file;
}

interface Group {
  readonly dimensions: { readonly status: string };
  readonly sum: {
    readonly requests: number;
    readonly errors: number;
    readonly subrequests: number;
  };
  readonly quantiles: {
    readonly cpuTimeP50: number;
    readonly cpuTimeP90: number;
    readonly cpuTimeP99: number;
    readonly wallTimeP50: number;
    readonly wallTimeP90: number;
    readonly wallTimeP99: number;
  };
}

interface GraphQlResponse {
  readonly data?: {
    readonly viewer: { readonly accounts: { readonly workersInvocationsAdaptive: Group[] }[] };
  };
  readonly errors?: readonly { readonly message: string }[] | null;
}

const QUERY = `
query LabCpu($accountTag: string!, $scriptName: string!, $start: Time!, $end: Time!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        limit: 100
        filter: { scriptName: $scriptName, datetime_geq: $start, datetime_leq: $end }
      ) {
        dimensions { status }
        sum { requests errors subrequests }
        quantiles { cpuTimeP50 cpuTimeP90 cpuTimeP99 wallTimeP50 wallTimeP90 wallTimeP99 }
      }
    }
  }
}`;

const window = windowFromArgsOrFile();
// Twenty seconds of margin on each side (clock skew between this machine and the edge).
const start = new Date(new Date(window.start).getTime() - 20_000).toISOString();
const end = new Date(new Date(window.end).getTime() + 20_000).toISOString();

const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
  method: 'POST',
  headers: { authorization: `Bearer ${readOauthToken()}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    query: QUERY,
    variables: { accountTag: ACCOUNT_TAG, scriptName: SCRIPT_NAME, start, end },
  }),
});
const body = (await response.json()) as GraphQlResponse;
if (
  !response.ok ||
  (body.errors !== undefined && body.errors !== null) ||
  body.data === undefined
) {
  throw new Error(`GraphQL ${response.status}: ${JSON.stringify(body.errors ?? body)}`);
}
const groups = body.data.viewer.accounts[0]?.workersInvocationsAdaptive ?? [];
const us = (v: number): number => Math.round(v) / 1000; // microseconds -> milliseconds
const rows = groups.map((g) => ({
  status: g.dimensions.status,
  requests: g.sum.requests,
  errors: g.sum.errors,
  subrequests: g.sum.subrequests,
  cpu_ms: {
    p50: us(g.quantiles.cpuTimeP50),
    p90: us(g.quantiles.cpuTimeP90),
    p99: us(g.quantiles.cpuTimeP99),
  },
  wall_ms: {
    p50: us(g.quantiles.wallTimeP50),
    p90: us(g.quantiles.wallTimeP90),
    p99: us(g.quantiles.wallTimeP99),
  },
}));
const output = {
  script: SCRIPT_NAME,
  window: { start, end },
  queried_at: new Date().toISOString(),
  rows,
};
writeFileSync(
  join(labDir, 'results', `cpu-graphql${SUFFIX}.json`),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(JSON.stringify(output, null, 2));
