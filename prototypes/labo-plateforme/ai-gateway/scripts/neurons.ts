// Reads Workers AI consumption (neurons, tokens, request count) from the GraphQL dataset
// aiInferenceAdaptiveGroups for a time window, grouped by model and minute.
// Usage: npx tsx scripts/neurons.ts <startISO> [endISO]   (default end = now)
import { ACCOUNT_ID, graphql } from './cf-graphql.ts';

interface Row {
  count: number;
  dimensions: { modelId: string; datetimeMinute: string; requestSource: string };
  sum: {
    totalNeurons: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalInferenceTimeMs: number;
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
          rows: aiInferenceAdaptiveGroups(
            limit: 1000
            filter: { datetimeMinute_geq: $start, datetimeMinute_leq: $end }
            orderBy: [datetimeMinute_ASC]
          ) {
            count
            dimensions {
              modelId
              datetimeMinute
              requestSource
            }
            sum {
              totalNeurons
              totalInputTokens
              totalOutputTokens
              totalInferenceTimeMs
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
let neurons = 0;
let count = 0;
for (const r of rows) {
  neurons += r.sum.totalNeurons;
  count += r.count;
  console.log(
    [
      r.dimensions.datetimeMinute,
      r.dimensions.modelId,
      `src=${r.dimensions.requestSource}`,
      `n=${String(r.count)}`,
      `in=${String(r.sum.totalInputTokens)}`,
      `out=${String(r.sum.totalOutputTokens)}`,
      `neurons=${r.sum.totalNeurons.toFixed(4)}`,
      `ms=${String(r.sum.totalInferenceTimeMs)}`,
    ].join('  '),
  );
}
console.log(`TOTAL ${start} -> ${end}: requests=${String(count)} neurons=${neurons.toFixed(4)}`);
