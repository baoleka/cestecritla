/**
 * Runs the T6 evaluation set against the deployed lab Worker and scores it like eval/retrieval.ts
 * (variant A): recall@5 / recall@10 / hit@5 / hit@10 / MRR / section recall@3 / forbidden ids in
 * top 5, on the same question groups. Run from the repository root: `npm run bench` (lab dir).
 *
 *   BASE_URL=https://aec-lab-fts.baoleka.workers.dev   (default)
 *   ONLY=fts-or                                         (one configuration, own CPU window; files get a suffix)
 *
 * Outputs: results/bench-results.json, results/bench-results.md, results/bench-window.json
 * (UTC window for the GraphQL CPU query). 0 neuron: no LLM is involved anywhere.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  NO_EXPANSION,
  buildProjection,
  buildSynonymGroups,
  loadInputs,
  makeExpander,
  type Question,
  type QuestionKind,
} from '../../../../eval/retrieval-core.ts';

const labDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env['BASE_URL'] ?? 'https://aec-lab-fts.baoleka.workers.dev';
const ONLY = process.env['ONLY'];
const SUFFIX = ONLY === undefined ? '' : `-${ONLY}`;

interface QueryTrace {
  readonly stage: 'and' | 'or' | 'x';
  readonly matched: number;
  readonly rows_read: number;
  readonly duration_ms: number;
  readonly sql_ms: number | null;
  readonly served_by_colo: string | null;
}

interface SearchResponse {
  readonly terms: readonly string[];
  readonly expansion_terms: readonly string[];
  readonly ids: readonly string[];
  readonly queries: readonly QueryTrace[];
  readonly rows_read_total: number;
  readonly d1_duration_ms_total: number;
}

interface CacheResponse {
  readonly cache: 'hit' | 'miss' | 'bypass';
  readonly qhash: string;
  readonly ids: readonly string[];
  readonly cache_queries: readonly {
    readonly op: 'select' | 'insert';
    readonly rows_read: number;
    readonly rows_written: number;
    readonly duration_ms: number;
  }[];
}

interface BenchConfig {
  readonly name: string;
  readonly description_fr: string;
  readonly mode: 'and-or' | 'or';
  readonly prefixMinLength: number;
  readonly expansion: boolean;
}

const CONFIGS: readonly BenchConfig[] = [
  {
    name: 'fts-and-or',
    description_fr: 'AND (préfixe ≥ 3 car.) puis repli OR si < 10 documents ; sans synonymes',
    mode: 'and-or',
    prefixMinLength: 3,
    expansion: false,
  },
  {
    name: 'fts-or',
    description_fr: 'OR seul (une requête D1), bm25 ; sans synonymes',
    mode: 'or',
    prefixMinLength: 3,
    expansion: false,
  },
  {
    name: 'fts-and-or-p4',
    description_fr: 'comme fts-and-or avec préfixe ≥ 4 car. (prefixMinLength de A-synonymes-0.25)',
    mode: 'and-or',
    prefixMinLength: 4,
    expansion: false,
  },
  {
    name: 'fts-and-or+syn',
    description_fr:
      'comme fts-and-or + alias glossaire/FAQ (troisième requête OR, poids 0,25 comme A-synonymes-0.25)',
    mode: 'and-or',
    prefixMinLength: 3,
    expansion: true,
  },
];

// ---------------------------------------------------------------------------------------------
// Metrics (same definitions as eval/retrieval.ts)
// ---------------------------------------------------------------------------------------------

const inputs = loadInputs();
const { coveringUnitId, unitById, sectionById } = buildProjection(inputs.dataset);
const expand = makeExpander(buildSynonymGroups(inputs.glossary, inputs.faq));

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)] ?? 0;
}
const mean = (v: readonly number[]): number =>
  v.length === 0 ? 0 : v.reduce((a, b) => a + b, 0) / v.length;
const round = (x: number, d = 3): number => Math.round(x * 10 ** d) / 10 ** d;

function ranksOf(expected: readonly string[], ranking: readonly string[]): (number | null)[] {
  const position = new Map<string, number>();
  ranking.forEach((id, i) => {
    if (!position.has(id)) position.set(id, i + 1);
  });
  return expected.map((e) => position.get(coveringUnitId.get(e) ?? e) ?? null);
}
const recallAt = (ranks: readonly (number | null)[], k: number): number =>
  ranks.length === 0 ? 0 : ranks.filter((r) => r !== null && r <= k).length / ranks.length;
const hitAt = (ranks: readonly (number | null)[], k: number): number =>
  ranks.some((r) => r !== null && r <= k) ? 1 : 0;
function reciprocalRank(ranks: readonly (number | null)[]): number {
  const best = ranks.filter((r): r is number => r !== null).sort((a, b) => a - b)[0];
  return best === undefined ? 0 : 1 / best;
}
function sectionsFromUnits(ranking: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ranking) {
    const sectionId = unitById.get(id)?.sectionId;
    if (sectionId === null || sectionId === undefined || seen.has(sectionId)) continue;
    seen.add(sectionId);
    out.push(sectionId);
  }
  return out;
}
const sectionRecall = (expected: readonly string[], top: readonly string[]): number =>
  expected.length === 0 ? 0 : expected.filter((s) => top.includes(s)).length / expected.length;

interface Row {
  readonly id: string;
  readonly kind: QuestionKind;
  readonly question: string;
  readonly expectedMeasureIds: readonly string[];
  readonly terms: readonly string[];
  readonly expansionTerms: readonly string[];
  readonly top10: readonly string[];
  readonly ranks: readonly (number | null)[];
  readonly recall5: number;
  readonly recall10: number;
  readonly hit5: number;
  readonly hit10: number;
  readonly rr: number;
  readonly sectionRecall3: number;
  readonly forbiddenInTop5: readonly string[];
  readonly stages: readonly string[];
  readonly d1Queries: number;
  readonly rowsRead: number;
  readonly d1DurationMs: number;
  readonly sqlMs: number;
  readonly latencyMs: number;
  readonly colo: string | null;
}

interface Summary {
  readonly n: number;
  readonly recall5: number;
  readonly recall10: number;
  readonly hit5: number;
  readonly hit10: number;
  readonly mrr: number;
  readonly sectionRecall3: number;
  readonly forbiddenInTop5: number;
}

function summarize(rows: readonly Row[]): Summary {
  return {
    n: rows.length,
    recall5: round(mean(rows.map((r) => r.recall5))),
    recall10: round(mean(rows.map((r) => r.recall10))),
    hit5: round(mean(rows.map((r) => r.hit5))),
    hit10: round(mean(rows.map((r) => r.hit10))),
    mrr: round(mean(rows.map((r) => r.rr))),
    sectionRecall3: round(mean(rows.map((r) => r.sectionRecall3))),
    forbiddenInTop5: rows.filter((r) => r.forbiddenInTop5.length > 0).length,
  };
}

// ---------------------------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------------------------

async function searchOnce(q: Question, config: BenchConfig): Promise<Row> {
  const expansion = config.expansion ? expand(q.question) : NO_EXPANSION;
  const url = new URL('/search', BASE_URL);
  url.searchParams.set('q', q.question);
  url.searchParams.set('mode', config.mode);
  url.searchParams.set('p', String(config.prefixMinLength));
  if (expansion.text.length > 0) url.searchParams.set('x', expansion.text);
  const t0 = performance.now();
  const response = await fetch(url);
  const body = (await response.json()) as SearchResponse;
  const latencyMs = performance.now() - t0;
  if (!response.ok) throw new Error(`${q.id}: HTTP ${response.status} ${JSON.stringify(body)}`);
  const ids = body.ids;
  const ranks = ranksOf(q.expected.measure_ids, ids);
  return {
    id: q.id,
    kind: q.kind,
    question: q.question,
    expectedMeasureIds: q.expected.measure_ids,
    terms: body.terms,
    expansionTerms: body.expansion_terms,
    top10: ids.slice(0, 10),
    ranks,
    recall5: recallAt(ranks, 5),
    recall10: recallAt(ranks, 10),
    hit5: hitAt(ranks, 5),
    hit10: hitAt(ranks, 10),
    rr: reciprocalRank(ranks),
    sectionRecall3: sectionRecall(q.expected.section_ids, sectionsFromUnits(ids).slice(0, 3)),
    forbiddenInTop5: q.expected.forbidden_ids.filter((f) =>
      ids.slice(0, 5).includes(coveringUnitId.get(f) ?? f),
    ),
    stages: body.queries.map((t) => `${t.stage}:${t.matched}`),
    d1Queries: body.queries.length,
    rowsRead: body.rows_read_total,
    d1DurationMs: round(body.d1_duration_ms_total, 2),
    sqlMs: round(
      body.queries.reduce((s, t) => s + (t.sql_ms ?? 0), 0),
      2,
    ),
    latencyMs: round(latencyMs, 1),
    colo: body.queries[0]?.served_by_colo ?? null,
  };
}

interface LatencyStats {
  readonly n: number;
  readonly p50: number;
  readonly p95: number;
  readonly mean: number;
  readonly max: number;
}
const latencyStats = (v: readonly number[]): LatencyStats => ({
  n: v.length,
  p50: round(percentile(v, 50), 1),
  p95: round(percentile(v, 95), 1),
  mean: round(mean(v), 1),
  max: round(Math.max(...v), 1),
});

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

const questions = inputs.questionsFile.questions;
const scored = questions.filter((q) => q.expected.measure_ids.length > 0);
const started = new Date();

// Warm-up: one request so that the first measured latency is not the isolate start.
await fetch(new URL('/search?q=bonjour', BASE_URL));

const configResults = [];
const selected = CONFIGS.filter((c) => ONLY === undefined || c.name === ONLY);
if (selected.length === 0) throw new Error(`unknown configuration ${ONLY ?? ''}`);
for (const config of selected) {
  const rows: Row[] = [];
  for (const q of scored) rows.push(await searchOnce(q, config));
  const byKind = (kind: QuestionKind): Row[] => rows.filter((r) => r.kind === kind);
  const golden = byKind('golden');
  const glossary = byKind('glossary');
  const adversarial = byKind('adversarial');
  const seventy = [...golden, ...glossary];
  configResults.push({
    config,
    variant_fts: {
      golden_50: summarize(golden),
      glossary_20: summarize(glossary),
      golden_and_glossary_70: summarize(seventy),
      adversarial_with_ids_19: summarize(adversarial),
      all_scored_89: summarize(rows),
    },
    latency_ms_client: latencyStats(seventy.map((r) => r.latencyMs)),
    d1_duration_ms: latencyStats(seventy.map((r) => r.d1DurationMs)),
    sql_ms: latencyStats(seventy.map((r) => r.sqlMs)),
    rows_read_per_question: latencyStats(seventy.map((r) => r.rowsRead)),
    d1_queries_per_question: round(mean(seventy.map((r) => r.d1Queries)), 2),
    stage_or_used: seventy.filter((r) => r.stages.some((s) => s.startsWith('or:'))).length,
    colos: [...new Set(rows.map((r) => r.colo))],
    rows,
  });
  console.log(
    config.name,
    JSON.stringify(configResults.at(-1)?.variant_fts.golden_and_glossary_70),
  );
}

// Q/R cache: first call = miss (search + insert), second = hit (one select). Five questions.
const cacheRows = [];
for (const q of ONLY === undefined ? scored.slice(0, 5) : []) {
  const url = new URL('/cache', BASE_URL);
  url.searchParams.set('q', q.question);
  const calls = [];
  for (let i = 0; i < 2; i += 1) {
    const t0 = performance.now();
    const response = await fetch(url);
    const body = (await response.json()) as CacheResponse;
    calls.push({
      cache: body.cache,
      latencyMs: round(performance.now() - t0, 1),
      rowsRead: body.cache_queries.reduce((s, c) => s + c.rows_read, 0),
      rowsWritten: body.cache_queries.reduce((s, c) => s + c.rows_written, 0),
      ids: body.ids.length,
      qhashPrefix: body.qhash.slice(0, 8),
    });
  }
  cacheRows.push({ id: q.id, calls });
}
const ended = new Date();

const aResults = JSON.parse(readFileSync('eval/retrieval-results.json', 'utf8')) as {
  configs: readonly {
    config: { name: string };
    variant_a: Record<string, Summary>;
    latency_ms: { a: { median: number; p95: number } };
  }[];
};
const aByName = (name: string) => {
  const c = aResults.configs.find((x) => x.config.name === name);
  if (c === undefined) throw new Error(`variant A config ${name} not found`);
  return c;
};
const comparison = ['A-sans-synonymes', 'A-synonymes-0.25'].map((name) => ({
  name,
  variant_a: aByName(name).variant_a,
  latency_ms_client: aByName(name).latency_ms.a,
}));

const output = {
  generated_at: ended.toISOString(),
  base_url: BASE_URL,
  corpus_version: inputs.dataset.meta.corpus_version,
  questions_version: inputs.questionsFile.meta.version,
  neurons_used: 0,
  window_utc: { start: started.toISOString(), end: ended.toISOString() },
  requests_total: selected.length * scored.length + 1 + cacheRows.length * 2,
  configs: configResults,
  cache: cacheRows,
  variant_a_reference: comparison,
};
writeFileSync(
  join(labDir, 'results', `bench-results${SUFFIX}.json`),
  `${JSON.stringify(output, null, 2)}\n`,
);
writeFileSync(
  join(labDir, 'results', `bench-window${SUFFIX}.json`),
  `${JSON.stringify({ scriptName: 'aec-lab-fts', ...output.window_utc, requests: output.requests_total }, null, 2)}\n`,
);

// Markdown table (French), same columns as eval/retrieval-results.md.
const fmt = (x: number): string => x.toFixed(3).replace('.', ',');
const md: string[] = [];
md.push(`# Bench FTS5 (D1) contre variante A (MiniSearch) — ${ended.toISOString()}`);
md.push('');
md.push(
  `Base : ${BASE_URL} ; corpus ${inputs.dataset.meta.corpus_version} ; jeu ${inputs.questionsFile.meta.version} ; 0 neuron.`,
);
md.push('');
md.push(
  '| Configuration | rappel@5 (50 dorées / 20 glossaire / 70) | rappel@10 (70) | hit@5 (70) | hit@10 (70) | MRR (70) | rappel section@3 (70) | interdits top 5 (89) | rappel@5 (89) | latence p50 / p95 (ms) |',
);
md.push('|---|---|---|---|---|---|---|---|---|---|');
for (const c of comparison) {
  const a = c.variant_a;
  const g = a['golden_50'];
  const gl = a['glossary_20'];
  const s = a['golden_and_glossary_70'];
  const all = a['all_scored_89'];
  if (g === undefined || gl === undefined || s === undefined || all === undefined) continue;
  md.push(
    `| ${c.name} (MiniSearch, navigateur) | ${fmt(g.recall5)} / ${fmt(gl.recall5)} / ${fmt(s.recall5)} | ${fmt(s.recall10)} | ${fmt(s.hit5)} | ${fmt(s.hit10)} | ${fmt(s.mrr)} | ${fmt(s.sectionRecall3)} | ${all.forbiddenInTop5} | ${fmt(all.recall5)} | ${c.latency_ms_client.median} / ${c.latency_ms_client.p95} (in-process) |`,
  );
}
for (const c of configResults) {
  const v = c.variant_fts;
  md.push(
    `| ${c.config.name} (D1 FTS5, Worker) | ${fmt(v.golden_50.recall5)} / ${fmt(v.glossary_20.recall5)} / ${fmt(v.golden_and_glossary_70.recall5)} | ${fmt(v.golden_and_glossary_70.recall10)} | ${fmt(v.golden_and_glossary_70.hit5)} | ${fmt(v.golden_and_glossary_70.hit10)} | ${fmt(v.golden_and_glossary_70.mrr)} | ${fmt(v.golden_and_glossary_70.sectionRecall3)} | ${v.all_scored_89.forbiddenInTop5} | ${fmt(v.all_scored_89.recall5)} | ${c.latency_ms_client.p50} / ${c.latency_ms_client.p95} (HTTP depuis la machine) |`,
  );
}
md.push('');
md.push(
  '| Configuration | requêtes D1 / question | lignes lues / question (p50 / p95 / max) | durée D1 p50 / p95 (ms) | SQL p50 / p95 (ms) | repli OR utilisé (sur 70) |',
);
md.push('|---|---:|---|---|---|---:|');
for (const c of configResults) {
  md.push(
    `| ${c.config.name} | ${c.d1_queries_per_question} | ${c.rows_read_per_question.p50} / ${c.rows_read_per_question.p95} / ${c.rows_read_per_question.max} | ${c.d1_duration_ms.p50} / ${c.d1_duration_ms.p95} | ${c.sql_ms.p50} / ${c.sql_ms.p95} | ${c.stage_or_used} |`,
  );
}
md.push('');
md.push('## Cache Q/R (`/cache`, table `q_cache`)');
md.push('');
md.push(
  '| Question | appel 1 | lignes lues / écrites | latence (ms) | appel 2 | lignes lues / écrites | latence (ms) |',
);
md.push('|---|---|---|---:|---|---|---:|');
for (const r of cacheRows) {
  const [c1, c2] = r.calls;
  if (c1 === undefined || c2 === undefined) continue;
  md.push(
    `| ${r.id} | ${c1.cache} | ${c1.rowsRead} / ${c1.rowsWritten} | ${c1.latencyMs} | ${c2.cache} | ${c2.rowsRead} / ${c2.rowsWritten} | ${c2.latencyMs} |`,
  );
}
writeFileSync(join(labDir, 'results', `bench-results${SUFFIX}.md`), `${md.join('\n')}\n`);
console.log(
  `window ${output.window_utc.start} → ${output.window_utc.end}, ${output.requests_total} requests`,
);
