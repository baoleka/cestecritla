// Reads the AI Gateway side of the story (dataset aiGatewayRequestsAdaptiveGroups): requests per
// minute, how many were served from cache (cachedRequests), tokens. Analytics ≠ logs: this dataset
// is aggregated and keeps no prompt; it is expected to fill up even with logs OFF.
// Usage: npx tsx scripts/gateway-analytics.ts <startISO> [endISO]
import { ACCOUNT_ID, graphql } from './cf-graphql.ts';

interface Row {
  count: number;
  dimensions: {
    gateway: string;
    model: string;
    provider: string;
    datetimeMinute: string;
    cached: number;
  };
  sum: { cachedRequests: number; tokensIn: number; tokensOut: number; erroredRequests: number };
  quantiles: { durationMsP50: number };
}
interface Data {
  viewer: { accounts: { rows: Row[] }[] };
}

const start = process.argv[2] ?? new Date(Date.now() - 3600_000).toISOString();
const end = process.argv[3] ?? new Date().toISOString();

const res = await graphql<Data>(
  `
    query ($account: String!, $start: Time!, $end: Time!) {
      viewer {
        accounts(filter: { accountTag: $account }) {
          rows: aiGatewayRequestsAdaptiveGroups(
            limit: 1000
            filter: { datetimeMinute_geq: $start, datetimeMinute_leq: $end }
            orderBy: [datetimeMinute_ASC]
          ) {
            count
            dimensions {
              gateway
              model
              provider
              datetimeMinute
              cached
            }
            sum {
              cachedRequests
              tokensIn
              tokensOut
              erroredRequests
            }
            quantiles {
              durationMsP50
            }
          }
        }
      }
    }
  `,
  { account: ACCOUNT_ID, start, end },
);
if (!res.data) {
  console.error(JSON.stringify(res.errors, null, 2));
  process.exit(1);
}
const rows = res.data.viewer.accounts[0]?.rows ?? [];
let count = 0;
let cached = 0;
for (const r of rows) {
  count += r.count;
  cached += r.sum.cachedRequests;
  console.log(
    [
      r.dimensions.datetimeMinute,
      `gw=${r.dimensions.gateway}`,
      `${r.dimensions.provider}/${r.dimensions.model}`,
      `cached=${String(r.dimensions.cached)}`,
      `n=${String(r.count)}`,
      `cachedRequests=${String(r.sum.cachedRequests)}`,
      `in=${String(r.sum.tokensIn)}`,
      `out=${String(r.sum.tokensOut)}`,
      `err=${String(r.sum.erroredRequests)}`,
      `p50=${String(r.quantiles.durationMsP50)}ms`,
    ].join('  '),
  );
}
console.log(`TOTAL ${start} -> ${end}: requests=${String(count)} cachedRequests=${String(cached)}`);
