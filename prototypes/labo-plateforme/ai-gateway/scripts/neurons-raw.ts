// Per-request rows of the Workers AI dataset aiInferenceAdaptive (raw, not grouped) for a window.
// Usage: npx tsx scripts/neurons-raw.ts <startISO> [endISO]
import { ACCOUNT_ID, graphql } from './cf-graphql.ts';

interface Row {
  datetime: string;
  modelId: string;
  requestSource: string;
  neurons: number;
  inputTokens: number;
  outputTokens: number;
  inferenceTimeMs: number;
  errorCode: number;
  sampleInterval: number;
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
          rows: aiInferenceAdaptive(
            limit: 1000
            filter: { datetime_geq: $start, datetime_leq: $end }
            orderBy: [datetime_ASC]
          ) {
            datetime
            modelId
            requestSource
            neurons
            inputTokens
            outputTokens
            inferenceTimeMs
            errorCode
            sampleInterval
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
for (const r of rows) {
  neurons += r.neurons;
  console.log(
    [
      r.datetime,
      r.modelId,
      `src=${r.requestSource}`,
      `in=${String(r.inputTokens)}`,
      `out=${String(r.outputTokens)}`,
      `neurons=${r.neurons.toFixed(4)}`,
      `ms=${String(r.inferenceTimeMs)}`,
      `err=${String(r.errorCode)}`,
      `sample=${String(r.sampleInterval)}`,
    ].join('  '),
  );
}
console.log(`TOTAL ${start} -> ${end}: rows=${String(rows.length)} neurons=${neurons.toFixed(4)}`);
