/**
 * Are Static Assets requests billed as Worker invocations? Reads `workersInvocationsAdaptive`
 * (GraphQL, same method as docs/discovery/06-partage.md §2) for the lab Workers over today's
 * window. The wrangler OAuth token is read from ~/.config/.wrangler/config/default.toml at
 * runtime and never printed. Output: measure/out/invocations.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { outDir } from './common.ts';

const ACCOUNT = 'f8b71fde291412da1f4e46c8ab005317';
/** Lab Workers by default; pass script names as arguments for a sanity check (e.g. aec-spike-share). */
const SCRIPTS =
  process.argv.length > 2
    ? process.argv.slice(2)
    : ['aec-lab-fw-react', 'aec-lab-fw-react-ssg', 'aec-lab-fw-astro'];
const HOURS = Number(process.env['HOURS'] ?? '6');

const toml = readFileSync(
  resolve(homedir(), '.config', '.wrangler', 'config', 'default.toml'),
  'utf8',
);
const token = /oauth_token\s*=\s*"([^"]+)"/.exec(toml)?.[1];
if (token === undefined) throw new Error('wrangler oauth token not found');

const end = new Date();
const start = new Date(end.getTime() - HOURS * 3600 * 1000);
const query = `query($account: String!, $start: Time!, $end: Time!, $scripts: [String!]) {
  viewer { accounts(filter: { accountTag: $account }) {
    workersInvocationsAdaptive(limit: 100, filter: { datetime_geq: $start, datetime_leq: $end, scriptName_in: $scripts }) {
      dimensions { scriptName status }
      sum { requests errors subrequests }
      quantiles { cpuTimeP50 cpuTimeP99 wallTimeP50 }
    }
  } }
}`;
const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    query,
    variables: {
      account: ACCOUNT,
      start: start.toISOString(),
      end: end.toISOString(),
      scripts: SCRIPTS,
    },
  }),
});
const body = (await res.json()) as { data?: unknown; errors?: unknown };
const out = {
  window: { start: start.toISOString(), end: end.toISOString() },
  scripts: SCRIPTS,
  status: res.status,
  ...body,
};
writeFileSync(
  resolve(outDir, process.argv.length > 2 ? 'invocations-sanity.json' : 'invocations.json'),
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));
