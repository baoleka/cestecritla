// CPU time per invocation of the lab Worker (dataset workersInvocationsAdaptive), the method of
// docs/discovery/06-partage.md §2. Usage: npx tsx scripts/worker-cpu.ts <startISO> [endISO] [scriptName]
import { ACCOUNT_ID, graphql } from './cf-graphql.ts';

interface Row {
  sum: { requests: number; errors: number; subrequests: number };
  quantiles: {
    cpuTimeP50: number;
    cpuTimeP90: number;
    cpuTimeP99: number;
    wallTimeP50: number;
    wallTimeP99: number;
  };
  dimensions: { scriptName: string; status: string };
}
interface Data {
  viewer: { accounts: { rows: Row[] }[] };
}

const start = process.argv[2] ?? new Date(Date.now() - 3600_000).toISOString();
const end = process.argv[3] ?? new Date().toISOString();
const scriptName = process.argv[4] ?? 'aec-lab-aig';

const res = await graphql<Data>(
  `
    query ($account: String!, $start: Time!, $end: Time!, $script: String!) {
      viewer {
        accounts(filter: { accountTag: $account }) {
          rows: workersInvocationsAdaptive(
            limit: 100
            filter: { datetime_geq: $start, datetime_leq: $end, scriptName: $script }
          ) {
            sum {
              requests
              errors
              subrequests
            }
            quantiles {
              cpuTimeP50
              cpuTimeP90
              cpuTimeP99
              wallTimeP50
              wallTimeP99
            }
            dimensions {
              scriptName
              status
            }
          }
        }
      }
    }
  `,
  { account: ACCOUNT_ID, start, end, script: scriptName },
);
if (!res.data) {
  console.error(JSON.stringify(res.errors, null, 2));
  process.exit(1);
}
for (const r of res.data.viewer.accounts[0]?.rows ?? []) {
  const q = r.quantiles;
  console.log(
    [
      r.dimensions.scriptName,
      `status=${r.dimensions.status}`,
      `requests=${String(r.sum.requests)}`,
      `errors=${String(r.sum.errors)}`,
      `subrequests=${String(r.sum.subrequests)}`,
      `cpu(µs) p50=${String(q.cpuTimeP50)} p90=${String(q.cpuTimeP90)} p99=${String(q.cpuTimeP99)}`,
      `wall(µs) p50=${String(q.wallTimeP50)} p99=${String(q.wallTimeP99)}`,
    ].join(' '),
  );
}
