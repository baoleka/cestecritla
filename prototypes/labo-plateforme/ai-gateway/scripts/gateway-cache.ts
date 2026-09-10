// Cache operations seen by the gateway (dataset aiGatewayCacheAdaptiveGroups): cacheOp per minute.
// Usage: npx tsx scripts/gateway-cache.ts <startISO> [endISO]
import { ACCOUNT_ID, graphql } from './cf-graphql.ts';

interface Row {
  count: number;
  dimensions: {
    gateway: string;
    model: string;
    datetimeMinute: string;
    cacheOp: number;
    tokensIn: number;
    tokensOut: number;
  };
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
          rows: aiGatewayCacheAdaptiveGroups(
            limit: 1000
            filter: { datetimeMinute_geq: $start, datetimeMinute_leq: $end }
            orderBy: [datetimeMinute_ASC]
          ) {
            count
            dimensions {
              gateway
              model
              datetimeMinute
              cacheOp
              tokensIn
              tokensOut
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
for (const r of res.data.viewer.accounts[0]?.rows ?? []) {
  console.log(
    [
      r.dimensions.datetimeMinute,
      `gw=${r.dimensions.gateway}`,
      r.dimensions.model,
      `cacheOp=${String(r.dimensions.cacheOp)}`,
      `n=${String(r.count)}`,
      `in=${String(r.dimensions.tokensIn)}`,
      `out=${String(r.dimensions.tokensOut)}`,
    ].join('  '),
  );
}
