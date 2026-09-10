/**
 * T6 retrieval bench: lexical retrieval over the runtime projection of "L'Avenir en commun 2025".
 *
 * Two variants, no embeddings, no LLM (0 neuron):
 *   A  client-side lexical search (MiniSearch, French normalization, glossary/FAQ synonyms as query
 *      expansion) over proposition units; the ranked ids are what a chat would hand to the LLM.
 *   C  chapter routing (variant A scores over section units, aggregated per chapter), then the whole
 *      best chapter in reading order: the ~3 000-token context the LLM would receive.
 *
 * Units (built in memory from data/aec-2025.json, the D1.6 runtime projection):
 *   - proposition = key measure / measure / sub-measure, text enriched by a non-displayed prefix
 *     (chapter title + section title + first sentence of the chapeau + bold heading paragraph, if any);
 *     a `measure_split` paragraph (meta.source_anomalies, D1.8) is merged into its proposition;
 *   - introduction and part paragraphs are indexed as extra units (the evaluation set expects
 *     `intro-p04` for the official measure count, D1.2);
 *   - section = title + chapeau + all propositions (routing unit for variant C).
 *
 * Metrics on eval/questions.json (50 golden + 20 glossary, 30 adversarial for the "absent" gate):
 *   recall@5 / recall@10 at proposition level, hit@k, section recall@3, MRR, median latency (Node),
 *   index size (raw / gzip), and the honest « rien trouvé » threshold on the top-1 score.
 * Several search configurations of A are run side by side (the plan's spec, then ablations) so the
 * value of each knob (synonyms, fuzzy / prefix on short terms) is visible.
 *
 * Run: npx tsx eval/retrieval.ts [--json eval/retrieval-results.json] [--md eval/retrieval-results.md]
 */
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import {
  type AnswerKind,
  CONFIGS,
  createRetriever,
  MAX_EXPANSION_TERMS,
  NO_EXPANSION,
  type Question,
  type QuestionKind,
  type Ranked,
  type SearchConfig,
  STOPWORDS,
  search,
  terms,
} from './retrieval-core.js';

// ---------------------------------------------------------------------------------------------
// Inputs, projection, synonyms and search: eval/retrieval-core.ts (shared with eval/harness.ts)
// ---------------------------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    json: { type: 'string', default: 'eval/retrieval-results.json' },
    md: { type: 'string', default: 'eval/retrieval-results.md' },
    verbose: { type: 'boolean', default: false },
    /** Question ids to explain (top results with matched terms), e.g. --explain q001 --explain q050. */
    explain: { type: 'string', multiple: true, default: [] },
  },
  strict: true,
});

const retriever = createRetriever();
const { dataset, glossary, faq, questionsFile } = retriever.inputs;
const {
  propositionUnits,
  introUnits,
  units,
  unitById,
  coveringUnitId,
  sectionUnits,
  chapterContext,
  sectionById,
} = retriever.projection;
const { synonymGroups, expand, unitIndex, sectionIndex } = retriever;

// ---------------------------------------------------------------------------------------------
// Variant C: chapter routing over section units, then the whole chapter in reading order
// ---------------------------------------------------------------------------------------------

type Aggregation = 'max' | 'sum' | 'top2';
const AGGREGATIONS: readonly Aggregation[] = ['max', 'sum', 'top2'];

function rankChapters(
  sectionRanking: readonly Ranked[],
  aggregation: Aggregation,
): { id: string; score: number }[] {
  const perChapter = new Map<string, number[]>();
  for (const r of sectionRanking) {
    const chapterId = sectionById.get(r.id)?.chapterId;
    if (chapterId === undefined) continue;
    const list = perChapter.get(chapterId) ?? [];
    list.push(r.score);
    perChapter.set(chapterId, list);
  }
  const scored = [...perChapter.entries()].map(([id, scores]) => {
    const sorted = [...scores].sort((a, b) => b - a);
    let score = 0;
    if (aggregation === 'max') score = sorted[0] ?? 0;
    else if (aggregation === 'sum') score = sorted.reduce((a, b) => a + b, 0);
    else score = sorted.slice(0, 2).reduce((a, b) => a + b, 0);
    return { id, score };
  });
  return scored.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------------------------

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const low = sorted[mid - 1];
  const high = sorted[mid];
  if (high === undefined) return 0;
  return sorted.length % 2 === 0 && low !== undefined ? (low + high) / 2 : high;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)] ?? 0;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function round(value: number, digits = 3): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Rank (1-based) of each expected id in a ranked list of unit ids; null when absent. */
function ranksOf(expected: readonly string[], ranking: readonly string[]): (number | null)[] {
  const position = new Map<string, number>();
  ranking.forEach((id, i) => {
    if (!position.has(id)) position.set(id, i + 1);
  });
  return expected.map((e) => {
    const unitId = coveringUnitId.get(e) ?? e;
    return position.get(unitId) ?? null;
  });
}

function recallAt(ranks: readonly (number | null)[], k: number): number {
  if (ranks.length === 0) return 0;
  return ranks.filter((r) => r !== null && r <= k).length / ranks.length;
}

function hitAt(ranks: readonly (number | null)[], k: number): number {
  return ranks.some((r) => r !== null && r <= k) ? 1 : 0;
}

function reciprocalRank(ranks: readonly (number | null)[]): number {
  const best = ranks.filter((r): r is number => r !== null).sort((a, b) => a - b)[0];
  return best === undefined ? 0 : 1 / best;
}

/** Distinct section ids in the order they first appear in a ranked list of unit ids. */
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

function sectionRecall(expected: readonly string[], top: readonly string[]): number {
  return expected.length === 0
    ? 0
    : expected.filter((s) => top.includes(s)).length / expected.length;
}

function expectedChapters(q: Question): Set<string> {
  const chapters = new Set<string>();
  for (const s of q.expected.section_ids) {
    const chapterId = sectionById.get(s)?.chapterId;
    if (chapterId !== undefined) chapters.add(chapterId);
  }
  for (const m of q.expected.measure_ids) {
    const chapterId = unitById.get(coveringUnitId.get(m) ?? m)?.chapterId;
    if (chapterId !== null && chapterId !== undefined) chapters.add(chapterId);
  }
  return chapters;
}

// ---------------------------------------------------------------------------------------------
// Bench
// ---------------------------------------------------------------------------------------------

interface QuestionResultA {
  readonly top10: readonly string[];
  readonly ranks: readonly (number | null)[];
  readonly recall5: number;
  readonly recall10: number;
  readonly hit5: number;
  readonly hit10: number;
  readonly rr: number;
  readonly sectionRecall3: number;
  readonly sectionRecall3ViaSectionUnits: number;
  readonly forbiddenInTop5: readonly string[];
  readonly top1Score: number;
  readonly top2Score: number;
  readonly queryTermCount: number;
  readonly top1Coverage: number;
  readonly matchedGroups: readonly string[];
  readonly addedTerms: readonly string[];
  readonly latencyMs: number;
}

/** Intermediate context: the propositions of the top-k sections (section-unit ranking), reading order. */
interface SectionsContext {
  readonly sections: readonly string[];
  readonly recallContext: number;
  readonly contextChars: number;
}

interface QuestionResultC {
  /** Top-1 / top-2 / top-3 sections as context (between A's top-10 and C's whole chapter). */
  readonly topSections: readonly [SectionsContext, SectionsContext, SectionsContext];
  readonly routedChapter: string | null;
  readonly chapterRank: number | null;
  readonly chapterHit: number;
  readonly contextUnits: number;
  readonly contextChars: number;
  readonly recallContext: number;
  readonly recall5: number;
  readonly recall10: number;
  readonly rr: number;
  readonly sectionRecall3: number;
  readonly latencyMs: number;
}

interface QuestionRow {
  readonly id: string;
  readonly kind: QuestionKind;
  readonly answerKind: AnswerKind;
  readonly persona: string;
  readonly question: string;
  readonly expectedMeasureIds: readonly string[];
  readonly expectedSectionIds: readonly string[];
  readonly a: QuestionResultA;
  readonly c: QuestionResultC;
}

const questions = questionsFile.questions;
const scored = questions.filter((q) => q.expected.measure_ids.length > 0);
const golden = questions.filter((q) => q.kind === 'golden');
const glossaryQuestions = questions.filter((q) => q.kind === 'glossary');
const adversarial = questions.filter((q) => q.kind === 'adversarial');
const adversarialWithIds = adversarial.filter((q) => q.expected.measure_ids.length > 0);

function runA(q: Question, config: SearchConfig): QuestionResultA {
  const t0 = performance.now();
  const expansion = config.expansion ? expand(q.question) : NO_EXPANSION;
  const ranking = search(unitIndex, q.question, expansion, config);
  const latencyMs = performance.now() - t0;
  const ids = ranking.map((r) => r.id);
  const ranks = ranksOf(q.expected.measure_ids, ids);
  const expectedSections = q.expected.section_ids;
  const top3Sections = sectionsFromUnits(ids).slice(0, 3);
  const top3SectionUnits = search(sectionIndex, q.question, expansion, config)
    .map((r) => r.id)
    .slice(0, 3);
  const top1 = ranking[0];
  const queryTermCount = terms(q.question).length;
  return {
    top10: ids.slice(0, 10),
    ranks,
    recall5: recallAt(ranks, 5),
    recall10: recallAt(ranks, 10),
    hit5: hitAt(ranks, 5),
    hit10: hitAt(ranks, 10),
    rr: reciprocalRank(ranks),
    sectionRecall3: sectionRecall(expectedSections, top3Sections),
    sectionRecall3ViaSectionUnits: sectionRecall(expectedSections, top3SectionUnits),
    forbiddenInTop5: q.expected.forbidden_ids.filter((f) =>
      ids.slice(0, 5).includes(coveringUnitId.get(f) ?? f),
    ),
    top1Score: top1?.score ?? 0,
    top2Score: ranking[1]?.score ?? 0,
    queryTermCount,
    top1Coverage:
      top1 === undefined || queryTermCount === 0
        ? 0
        : Math.min(1, top1.queryTerms.length / queryTermCount),
    matchedGroups: expansion.groups,
    addedTerms: expansion.addedTerms,
    latencyMs,
  };
}

function runC(q: Question, config: SearchConfig, aggregation: Aggregation): QuestionResultC {
  const t0 = performance.now();
  const expansion = config.expansion ? expand(q.question) : NO_EXPANSION;
  const sectionRanking = search(sectionIndex, q.question, expansion, config);
  const chapters = rankChapters(sectionRanking, aggregation);
  const routed = chapters[0]?.id ?? null;
  const context = routed === null ? [] : (chapterContext.get(routed) ?? []);
  const latencyMs = performance.now() - t0;
  const ids = context.map((u) => u.id);
  const ranks = ranksOf(q.expected.measure_ids, ids);
  const expectedChapterSet = expectedChapters(q);
  const chapterRankIndex = chapters.findIndex((c) => expectedChapterSet.has(c.id));
  const chapterRank = chapterRankIndex === -1 ? null : chapterRankIndex + 1;
  const sectionsInChapter = sectionRanking
    .filter((r) => sectionById.get(r.id)?.chapterId === routed)
    .map((r) => r.id);
  const sectionsContext = (k: number): SectionsContext => {
    const sections = sectionRanking.slice(0, k).map((r) => r.id);
    const contextUnits = propositionUnits.filter(
      (u) => u.sectionId !== null && sections.includes(u.sectionId),
    );
    return {
      sections,
      recallContext: recallAt(
        ranksOf(
          q.expected.measure_ids,
          contextUnits.map((u) => u.id),
        ),
        Number.POSITIVE_INFINITY,
      ),
      contextChars: contextUnits.reduce((n, u) => n + u.text.length, 0),
    };
  };
  return {
    topSections: [sectionsContext(1), sectionsContext(2), sectionsContext(3)],
    routedChapter: routed,
    chapterRank,
    chapterHit: chapterRank === 1 ? 1 : 0,
    contextUnits: context.length,
    contextChars: context.reduce((n, u) => n + u.text.length, 0),
    recallContext: recallAt(ranks, Number.POSITIVE_INFINITY),
    recall5: recallAt(ranks, 5),
    recall10: recallAt(ranks, 10),
    rr: reciprocalRank(ranks),
    sectionRecall3: sectionRecall(q.expected.section_ids, sectionsInChapter.slice(0, 3)),
    latencyMs,
  };
}

interface VariantSummaryA {
  readonly recall5: number;
  readonly recall10: number;
  readonly hit5: number;
  readonly hit10: number;
  readonly mrr: number;
  readonly sectionRecall3: number;
  readonly sectionRecall3ViaSectionUnits: number;
  readonly forbiddenInTop5: number;
}

interface SectionsSummary {
  readonly recallContext: number;
  readonly hitContext: number;
  readonly medianContextChars: number;
}

interface VariantSummaryC {
  /** Context = propositions of the top-1 / top-2 / top-3 sections. */
  readonly topSections: readonly [SectionsSummary, SectionsSummary, SectionsSummary];
  readonly recall5: number;
  readonly recall10: number;
  readonly mrr: number;
  readonly sectionRecall3: number;
  readonly chapterHit1: number;
  readonly chapterMrr: number;
  readonly recallContext: number;
  readonly hitContext: number;
  readonly medianContextChars: number;
  readonly medianContextTokensEstimate: number;
}

function summarizeA(r: readonly QuestionResultA[]): VariantSummaryA {
  return {
    recall5: round(mean(r.map((x) => x.recall5))),
    recall10: round(mean(r.map((x) => x.recall10))),
    hit5: round(mean(r.map((x) => x.hit5))),
    hit10: round(mean(r.map((x) => x.hit10))),
    mrr: round(mean(r.map((x) => x.rr))),
    sectionRecall3: round(mean(r.map((x) => x.sectionRecall3))),
    sectionRecall3ViaSectionUnits: round(mean(r.map((x) => x.sectionRecall3ViaSectionUnits))),
    forbiddenInTop5: r.filter((x) => x.forbiddenInTop5.length > 0).length,
  };
}

function summarizeC(r: readonly QuestionResultC[]): VariantSummaryC {
  const medianChars = median(r.map((x) => x.contextChars));
  const sectionsSummary = (i: 0 | 1 | 2): SectionsSummary => ({
    recallContext: round(mean(r.map((x) => x.topSections[i].recallContext))),
    hitContext: round(mean(r.map((x) => (x.topSections[i].recallContext > 0 ? 1 : 0)))),
    medianContextChars: Math.round(median(r.map((x) => x.topSections[i].contextChars))),
  });
  return {
    topSections: [sectionsSummary(0), sectionsSummary(1), sectionsSummary(2)],
    recall5: round(mean(r.map((x) => x.recall5))),
    recall10: round(mean(r.map((x) => x.recall10))),
    mrr: round(mean(r.map((x) => x.rr))),
    sectionRecall3: round(mean(r.map((x) => x.sectionRecall3))),
    chapterHit1: round(mean(r.map((x) => x.chapterHit))),
    chapterMrr: round(mean(r.map((x) => (x.chapterRank === null ? 0 : 1 / x.chapterRank)))),
    recallContext: round(mean(r.map((x) => x.recallContext))),
    hitContext: round(mean(r.map((x) => (x.recallContext > 0 ? 1 : 0)))),
    medianContextChars: Math.round(medianChars),
    // HYPOTHÈSE: ~3.5 characters per token for French with the Mistral tokenizer (not measured here).
    medianContextTokensEstimate: Math.round(medianChars / 3.5),
  };
}

interface Subsets<T> {
  readonly golden_50: T;
  readonly glossary_20: T;
  readonly golden_and_glossary_70: T;
  readonly adversarial_with_ids_19: T;
  readonly all_scored_89: T;
}

function subsets<T>(
  rows: readonly QuestionRow[],
  pick: (rows: readonly QuestionRow[]) => T,
): Subsets<T> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const of = (qs: readonly Question[]): QuestionRow[] =>
    qs.map((q) => {
      const row = byId.get(q.id);
      if (row === undefined) throw new Error(`missing row ${q.id}`);
      return row;
    });
  return {
    golden_50: pick(of(golden)),
    glossary_20: pick(of(glossaryQuestions)),
    golden_and_glossary_70: pick(of([...golden, ...glossaryQuestions])),
    adversarial_with_ids_19: pick(of(adversarialWithIds)),
    all_scored_89: pick(of(scored)),
  };
}

// ---------------------------------------------------------------------------------------------
// Honest « rien trouvé »: threshold on a top-1 signal, tuned on the 100 questions
// ---------------------------------------------------------------------------------------------

type Feature = 'top1Score' | 'top1PerTerm' | 'top1Coverage' | 'top1Gap';
const FEATURES: readonly Feature[] = ['top1Score', 'top1PerTerm', 'top1Coverage', 'top1Gap'];

function feature(row: QuestionRow, f: Feature): number {
  const a = row.a;
  switch (f) {
    case 'top1Score':
      return a.top1Score;
    case 'top1PerTerm':
      return a.queryTermCount === 0 ? 0 : a.top1Score / a.queryTermCount;
    case 'top1Coverage':
      return a.top1Coverage;
    case 'top1Gap':
      return a.top1Score - a.top2Score;
  }
}

interface Confusion {
  readonly tp: number;
  readonly fp: number;
  readonly fn: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly fpIds: readonly string[];
  readonly fnIds: readonly string[];
}

interface ThresholdReport {
  readonly feature: Feature;
  readonly threshold: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly truePositives: number;
  readonly falsePositives: number;
  readonly falseNegatives: number;
  readonly falsePositiveIds: readonly string[];
  readonly falseNegativeIds: readonly string[];
  readonly adversarial_30: {
    precision: number;
    recall: number;
    f1: number;
    tp: number;
    fp: number;
    fn: number;
  };
}

function evaluateThreshold(
  subset: readonly QuestionRow[],
  f: Feature,
  threshold: number,
): Confusion {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  const fpIds: string[] = [];
  const fnIds: string[] = [];
  for (const row of subset) {
    const predictedAbsent = feature(row, f) < threshold;
    const isAbsent = row.answerKind === 'absent';
    if (predictedAbsent && isAbsent) tp += 1;
    else if (predictedAbsent && !isAbsent) {
      fp += 1;
      fpIds.push(row.id);
    } else if (!predictedAbsent && isAbsent) {
      fn += 1;
      fnIds.push(row.id);
    }
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { tp, fp, fn, precision, recall, f1, fpIds, fnIds };
}

function tuneThreshold(rows: readonly QuestionRow[], f: Feature): ThresholdReport {
  const values = [...new Set(rows.map((r) => feature(r, f)))].sort((a, b) => a - b);
  // Candidate thresholds: midpoints between consecutive observed values (plus one above the max).
  const candidates: number[] = [];
  for (let i = 0; i + 1 < values.length; i += 1) {
    const a = values[i];
    const b = values[i + 1];
    if (a !== undefined && b !== undefined) candidates.push((a + b) / 2);
  }
  const max = values[values.length - 1];
  if (max !== undefined) candidates.push(max + 1);
  let best: Confusion & { threshold: number } = { threshold: 0, ...evaluateThreshold(rows, f, 0) };
  for (const threshold of candidates) {
    const e = evaluateThreshold(rows, f, threshold);
    // Best F1; on ties prefer higher precision (a false « rien trouvé » hides a real measure).
    if (e.f1 > best.f1 || (e.f1 === best.f1 && e.precision > best.precision))
      best = { threshold, ...e };
  }
  const adv = evaluateThreshold(
    rows.filter((r) => r.kind === 'adversarial'),
    f,
    best.threshold,
  );
  return {
    feature: f,
    threshold: round(best.threshold, 4),
    precision: round(best.precision),
    recall: round(best.recall),
    f1: round(best.f1),
    truePositives: best.tp,
    falsePositives: best.fp,
    falseNegatives: best.fn,
    falsePositiveIds: best.fpIds,
    falseNegativeIds: best.fnIds,
    adversarial_30: {
      precision: round(adv.precision),
      recall: round(adv.recall),
      f1: round(adv.f1),
      tp: adv.tp,
      fp: adv.fp,
      fn: adv.fn,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Run every configuration
// ---------------------------------------------------------------------------------------------

interface ConfigResult {
  readonly config: SearchConfig;
  readonly routingAggregation: Aggregation;
  readonly routingAccuracyByAggregation: Record<Aggregation, number>;
  readonly variantA: Subsets<VariantSummaryA>;
  readonly variantC: Subsets<VariantSummaryC>;
  readonly latencyMs: {
    readonly a: { median: number; p95: number };
    readonly c: { median: number; p95: number };
  };
  readonly absentDetection: {
    readonly positives: number;
    readonly best: ThresholdReport;
    readonly byFeature: readonly ThresholdReport[];
  };
  readonly rows: readonly QuestionRow[];
}

function runConfig(config: SearchConfig): ConfigResult {
  // Warm-up pass (JIT), then the measured pass.
  for (const q of questions) {
    runA(q, config);
    runC(q, config, 'max');
  }
  const routingAccuracyByAggregation: Record<Aggregation, number> = { max: 0, sum: 0, top2: 0 };
  for (const aggregation of AGGREGATIONS) {
    routingAccuracyByAggregation[aggregation] = round(
      mean(scored.map((q) => runC(q, config, aggregation).chapterHit)),
    );
  }
  const routingAggregation = AGGREGATIONS.reduce((best, a) =>
    routingAccuracyByAggregation[a] > routingAccuracyByAggregation[best] ? a : best,
  );
  const rows: QuestionRow[] = questions.map((q) => ({
    id: q.id,
    kind: q.kind,
    answerKind: q.expected.answer_kind,
    persona: q.persona,
    question: q.question,
    expectedMeasureIds: q.expected.measure_ids,
    expectedSectionIds: q.expected.section_ids,
    a: runA(q, config),
    c: runC(q, config, routingAggregation),
  }));
  const latencyA = rows.map((r) => r.a.latencyMs);
  const latencyC = rows.map((r) => r.c.latencyMs);
  const byFeature = FEATURES.map((f) => tuneThreshold(rows, f));
  const best = byFeature.reduce((b, r) => (r.f1 > b.f1 ? r : b));
  return {
    config,
    routingAggregation,
    routingAccuracyByAggregation,
    variantA: subsets(rows, (rs) => summarizeA(rs.map((r) => r.a))),
    variantC: subsets(rows, (rs) => summarizeC(rs.map((r) => r.c))),
    latencyMs: {
      a: { median: round(median(latencyA), 2), p95: round(percentile(latencyA, 95), 2) },
      c: { median: round(median(latencyC), 2), p95: round(percentile(latencyC, 95), 2) },
    },
    absentDetection: {
      positives: rows.filter((r) => r.answerKind === 'absent').length,
      best,
      byFeature,
    },
    rows,
  };
}

const configResults = CONFIGS.map(runConfig);
const spec = configResults[0];
if (spec === undefined) throw new Error('no configuration');
/** Best configuration on strict recall@5 over the 70 golden + glossary questions (ties: the earlier, simpler one). */
const bestConfig = configResults.reduce((best, r) =>
  r.variantA.golden_and_glossary_70.recall5 > best.variantA.golden_and_glossary_70.recall5
    ? r
    : best,
);

// ---------------------------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------------------------

function sizes(content: string): { raw: number; gzip: number } {
  return {
    raw: Buffer.byteLength(content, 'utf8'),
    gzip: gzipSync(content, { level: 9 }).byteLength,
  };
}

const projectionJson = JSON.stringify(
  units.map((u) => ({
    id: u.id,
    k: u.kind,
    s: u.sectionId,
    c: u.chapterId,
    t: u.text,
    p: u.prefix,
  })),
);
const unitIndexJson = JSON.stringify(unitIndex.toJSON());
const sectionIndexJson = JSON.stringify(sectionIndex.toJSON());
const synonymsJson = JSON.stringify(synonymGroups.map((g) => g.phrases));

// ---------------------------------------------------------------------------------------------
// Worst queries of the best configuration (scored questions only)
// ---------------------------------------------------------------------------------------------

interface WorstQuery {
  readonly id: string;
  readonly kind: QuestionKind;
  readonly answerKind: AnswerKind;
  readonly question: string;
  readonly expected: readonly string[];
  readonly ranksA: readonly (number | null)[];
  readonly recall5A: number;
  readonly top5A: readonly string[];
  readonly top5ATexts: readonly string[];
  readonly matchedGroups: readonly string[];
  readonly routedChapterC: string | null;
  readonly expectedChapters: readonly string[];
  readonly recallContextC: number;
  readonly why_fr: string;
}

/**
 * Manual diagnosis of the hardest questions (run of 2026-09-09, `--explain`), kept in the code so the
 * report stays reproducible. Categories: lexique (paraphrase / idiom absent from the text), alias
 * (synonym expansion firing on an ambiguous or generic trigger), multi (many expected ids across
 * sections, strict recall@5 cannot reach 1), generique (expected key measure shares no word with
 * the question), hors-corpus (the id lives outside the sections).
 */
const WHY_FR: Readonly<Record<string, string>> = {
  q080: 'lexique — « prisons », « laxisme » n’apparaissent pas ; le texte dit « surpopulation carcérale », « politique pénale ». Aucune unité ne matche (top 1 = bruit « poison »). Fix : alias FAQ prison → carcéral / détenus.',
  q083: 'lexique — idiome « laisser ma maison à mes enfants » ≠ « héritage », « succession », « transmissibles ». « enfant » attire la protection de l’enfance (c7-s09). Fix : alias FAQ héritage / succession / transmettre.',
  q050: 'lexique — « tourisme spatial » ≠ « voyages commerciaux et privés dans l’espace » ; seul « interdire » matche (mot très fréquent). Fix : alias FAQ ou glossaire.',
  q088: 'alias — « bac » déclenche l’alias FAQ « BAC » (police) ; le texte dit « baccalauréat ». Fix : alias sensibles à la casse pour les sigles, ou alias bac → baccalauréat.',
  q097: 'alias — « école » déclenche deux entrées FAQ (éducation nationale, cantines…) dont les 13 termes ajoutés noient « uniforme » (rang 16 ; rang 6 sans synonymes). Fix : poids d’expansion réduit (A-synonymes-0.25) ou alias moins génériques.',
  q093: 'hors-corpus — la réponse est intro-p04 (« 831 mesures ») ; « mesures » figure dans 40 unités, le paragraphe arrive au rang 7. Le routage FAQ exact (D2.5) doit couvrir cette question avant la recherche.',
  q001: 'generique — 5 ids attendus ; k01 (« service public de la dépendance… seniors »), m03, m04 (« grand âge ») ne partagent aucun mot avec « EHPAD / personnes âgées » ; « personnes » (mot fréquent, texte + préfixe) rivalise avec « EHPAD » (3 unités). La section entière (variante S) contient les 5.',
  q002: 'multi — 5 ids dans 3 sections (c13-s03, c9-s01, c7-s04) ; m07 (« hausses du tarif du gaz ») et m05 (« tarifs réglementés ») ne contiennent ni « prix » ni « électricité ». Top-3 sections : 4/5.',
  q008: 'generique — « impôts vont exploser » vs « révolution fiscale », « ISF », « tranches » : seul m02 matche ; les 4 autres ids de c6-s05 arrivent aux rangs 6-24. La section entière contient les 5.',
  q010: 'multi — question large (« petits patrons, artisans ») avec 5 ids dans 5 sections de 3 chapitres, curés à la main ; aucun retrieval @5 ne peut les réunir. Rang 1 correct (c7-s01-m02).',
  q087: 'lexique — « sans-papiers », « ouvrir les frontières » (vocabulaire adverse) vs « régulariser », « visas », « titres de séjour » ; « papier » attire les formulaires papier. 1/4 au rang 3.',
  q031: 'multi — 4 ids dans 2 chapitres (c5-s06, c15-s02) ; « psys » ne matche que par préfixe ; les mesures santé mentale (c15-s02-m15/m18) disent « psychiatrie », « psychologues » sans « étudiant ».',
  q075: 'multi — question volontairement floue (« la garantie ») avec 4 garanties différentes attendues (emploi, autonomie, loyers, impôt) dans 3 chapitres ; « garantie » matche 20 unités.',
  q033: 'lexique — « Uber Eats », « auto-entrepreneur » vs « plateformes numériques (Uber, Deliveroo) », « autoentrepreneur » (soudé) ; le tiret coupe le mot en « auto » + « entrepreneur ». Fix : normalisation des mots composés, alias FAQ.',
  q035: 'lexique — « avion » n’apparaît pas ; le texte dit « lignes aériennes » ; « train » seul porte la mesure (rang 4-6).',
  q030: 'lexique — « fac », « CVEC » : CVEC matche (m02) mais « fac » ne matche pas « université » ; « gratuite » attire les autres gratuités. Fix : alias FAQ fac → université.',
  q034: 'multi — 3 ids dans 2 chapitres ; « permis » matche m02 ; « 1500 balles » ne matche rien ; c10-s03-m04 (garantie d’autonomie) sans mot commun.',
  q054: 'alias — « État planificateur » active le groupe glossaire « planification écologique » ; les mesures de c12-s02 qui contiennent « planification » passent devant c12-s01-m03 (rang 13). En v1 la carte glossaire répond avant la recherche (D2.1, D2.5).',
};

const worst: WorstQuery[] = bestConfig.rows
  .filter((row) => row.expectedMeasureIds.length > 0)
  .map((row): WorstQuery => {
    const q = questions.find((x) => x.id === row.id);
    return {
      id: row.id,
      kind: row.kind,
      answerKind: row.answerKind,
      question: row.question,
      expected: row.expectedMeasureIds,
      ranksA: row.a.ranks,
      recall5A: row.a.recall5,
      top5A: row.a.top10.slice(0, 5),
      top5ATexts: row.a.top10
        .slice(0, 5)
        .map((id) => `${id}: ${(unitById.get(id)?.text ?? '').slice(0, 90)}`),
      matchedGroups: row.a.matchedGroups,
      routedChapterC: row.c.routedChapter,
      expectedChapters: q === undefined ? [] : [...expectedChapters(q)],
      recallContextC: row.c.recallContext,
      why_fr: WHY_FR[row.id] ?? '—',
    };
  })
  .sort((x, y) => x.recall5A - y.recall5A || reciprocalRank(x.ranksA) - reciprocalRank(y.ranksA))
  .slice(0, 10);

// ---------------------------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------------------------

const summary = {
  generated_at: new Date().toISOString(),
  corpus_version: dataset.meta.corpus_version,
  questions_version: questionsFile.meta.version,
  neurons_used: 0,
  units: {
    propositions: propositionUnits.length,
    intro_and_part_paragraphs: introUnits.length,
    total: units.length,
    sections: sectionUnits.length,
    chapters: dataset.chapters.length,
    measure_splits_merged: units.reduce((n, u) => n + u.mergedIds.length, 0),
  },
  sizes_bytes: {
    projection_units: sizes(projectionJson),
    index_a_units: sizes(unitIndexJson),
    index_c_sections: sizes(sectionIndexJson),
    synonyms: sizes(synonymsJson),
  },
  normalization: {
    stopwords: STOPWORDS.size,
    stemming: "plural 's', feminine 'ee'->'e', 'eaux'->'eau', 'aux'->'al', 'ement', 'ent'",
    elisions: "l' d' qu' j' n' s' c' m' t' jusqu' lorsqu' puisqu'",
    synonym_groups: { glossary: glossary.entries.length, faq: faq.entries.length },
    max_expansion_terms: MAX_EXPANSION_TERMS,
  },
  best_config: bestConfig.config.name,
  configs: configResults.map((r) => ({
    config: r.config,
    routing_aggregation: r.routingAggregation,
    routing_accuracy_by_aggregation: r.routingAccuracyByAggregation,
    variant_a: r.variantA,
    variant_c: r.variantC,
    latency_ms: r.latencyMs,
    absent_detection: {
      positives: r.absentDetection.positives,
      best: r.absentDetection.best,
      by_feature: r.absentDetection.byFeature,
    },
  })),
  worst_10: worst,
  // Per-question detail only for the reference configuration and the best one (file size).
  rows: Object.fromEntries([...new Set([spec, bestConfig])].map((r) => [r.config.name, r.rows])),
};

writeFileSync(args.json, `${JSON.stringify(summary, null, 2)}\n`);

// Markdown ------------------------------------------------------------------------------------

const fmt = (n: number): string => n.toFixed(3);
const kb = (n: number): string => `${(n / 1024).toFixed(1)} Ko`;

const md: string[] = [];
md.push(
  `# Bench retrieval T6 — variantes A et C (corpus ${dataset.meta.corpus_version}, jeu v${questionsFile.meta.version})`,
);
md.push('');
md.push(
  `Généré le ${summary.generated_at} par \`eval/retrieval.ts\` — 0 neuron consommé (aucun LLM, aucun embedding). Unités : ${String(propositionUnits.length)} propositions + ${String(introUnits.length)} paragraphes d'introduction/parties (${String(summary.units.measure_splits_merged)} measure_split fusionnés), ${String(sectionUnits.length)} sections, ${String(dataset.chapters.length)} chapitres.`,
);
md.push('');
md.push(
  "Définitions : rappel@k = part des ids attendus (`measure_ids`) présents dans les k premiers résultats, moyenne par question (strict : une question à 5 ids attendus exige les 5 dans le top 5) ; hit@k = au moins un id attendu dans le top k ; rappel@3 sections = part des `section_ids` attendus dans les 3 premières sections ; MRR = 1 / rang du premier id attendu. Pour C, les propositions sont dans l'ordre de lecture du chapitre : le chiffre utile est « rappel contexte » (part des ids attendus contenus dans le chapitre envoyé au LLM).",
);
md.push('');
md.push('## Tableau principal — configuration du plan (A-spec) sur 50 dorées + 20 glossaire');
md.push('');
{
  const a = spec.variantA.golden_and_glossary_70;
  const c = spec.variantC.golden_and_glossary_70;
  md.push('| Métrique | A (lexical client, MiniSearch) | C (routage chapitre → chapitre entier) |');
  md.push('|---|---|---|');
  md.push(`| rappel@5 (mesures) | **${fmt(a.recall5)}** | ${fmt(c.recall5)} (ordre de lecture) |`);
  md.push(`| rappel@10 (mesures) | ${fmt(a.recall10)} | ${fmt(c.recall10)} (ordre de lecture) |`);
  md.push(
    `| rappel@5 — 50 dorées / 20 glossaire | ${fmt(spec.variantA.golden_50.recall5)} / ${fmt(spec.variantA.glossary_20.recall5)} | ${fmt(spec.variantC.golden_50.recall5)} / ${fmt(spec.variantC.glossary_20.recall5)} |`,
  );
  md.push(`| hit@5 / hit@10 (≥ 1 id attendu) | ${fmt(a.hit5)} / ${fmt(a.hit10)} | — |`);
  md.push(
    `| rappel dans le contexte reçu par le LLM | top 10 : ${fmt(a.recall10)} | chapitre entier : **${fmt(c.recallContext)}** (hit ${fmt(c.hitContext)}) |`,
  );
  md.push(
    `| rappel@3 sections | ${fmt(a.sectionRecall3)} (via propositions) / ${fmt(a.sectionRecall3ViaSectionUnits)} (via unités section) | ${fmt(c.sectionRecall3)} (sections du chapitre routé) |`,
  );
  md.push(
    `| MRR | ${fmt(a.mrr)} | ${fmt(c.mrr)} (ordre de lecture) ; chapitre : ${fmt(c.chapterMrr)} |`,
  );
  md.push(
    `| routage chapitre correct (top 1) | — | ${fmt(c.chapterHit1)} (agrégation \`${spec.routingAggregation}\`, choisie sur les 89 notées : max ${fmt(spec.routingAccuracyByAggregation.max)}, sum ${fmt(spec.routingAccuracyByAggregation.sum)}, top2 ${fmt(spec.routingAccuracyByAggregation.top2)}) |`,
  );
  const forbiddenAdv = spec.rows.filter(
    (r) => r.kind === 'adversarial' && r.a.forbiddenInTop5.length > 0,
  );
  md.push(
    `| questions avec un id interdit dans le top 5 | ${String(a.forbiddenInTop5)} / 70 ; adversariales : ${String(forbiddenAdv.length)} / 30 (${forbiddenAdv.map((r) => r.id).join(', ')}) | — |`,
  );
  md.push(
    `| latence médiane / p95 par question (Node 20) | ${String(spec.latencyMs.a.median)} ms / ${String(spec.latencyMs.a.p95)} ms | ${String(spec.latencyMs.c.median)} ms / ${String(spec.latencyMs.c.p95)} ms |`,
  );
  md.push(
    `| taille de l'index (brut / gzip) | ${kb(summary.sizes_bytes.index_a_units.raw)} / **${kb(summary.sizes_bytes.index_a_units.gzip)}** | ${kb(summary.sizes_bytes.index_c_sections.raw)} / ${kb(summary.sizes_bytes.index_c_sections.gzip)} |`,
  );
  md.push(
    `| contexte médian envoyé au LLM | 10 propositions | ${String(c.medianContextChars)} caractères ≈ ${String(c.medianContextTokensEstimate)} tokens (HYPOTHÈSE 3,5 car./token) |`,
  );
}
md.push('');
md.push(
  `Projection runtime des unités : ${kb(summary.sizes_bytes.projection_units.raw)} brut / ${kb(summary.sizes_bytes.projection_units.gzip)} gzip. Synonymes (glossaire ${String(glossary.entries.length)} cartes + FAQ ${String(faq.entries.length)} entrées) : ${kb(summary.sizes_bytes.synonyms.gzip)} gzip. L'index A se recalcule aussi côté client à partir de la projection (pas besoin de le servir).`,
);
md.push('');
md.push('## Courbe « contexte envoyé au LLM » (A-spec, 70 dorées + glossaire)');
md.push('');
md.push(
  '| Contexte | rappel des ids attendus | hit (≥ 1 id) | taille médiane (caractères ≈ tokens, HYPOTHÈSE 3,5 car./token) |',
);
md.push('|---|---|---|---|');
{
  const a = spec.variantA.golden_and_glossary_70;
  const c = spec.variantC.golden_and_glossary_70;
  const rowsA = spec.rows.filter((r) => r.kind !== 'adversarial');
  const chars = (k: number): number =>
    Math.round(
      median(
        rowsA.map((r) =>
          r.a.top10.slice(0, k).reduce((n, id) => n + (unitById.get(id)?.text.length ?? 0), 0),
        ),
      ),
    );
  md.push(
    `| A : top 5 propositions | ${fmt(a.recall5)} | ${fmt(a.hit5)} | ${String(chars(5))} ≈ ${String(Math.round(chars(5) / 3.5))} |`,
  );
  md.push(
    `| A : top 10 propositions | ${fmt(a.recall10)} | ${fmt(a.hit10)} | ${String(chars(10))} ≈ ${String(Math.round(chars(10) / 3.5))} |`,
  );
  c.topSections.forEach((sct, i) => {
    md.push(
      `| S : ${String(i + 1)} meilleure${i > 0 ? 's' : ''} section${i > 0 ? 's' : ''} entière${i > 0 ? 's' : ''} | ${fmt(sct.recallContext)} | ${fmt(sct.hitContext)} | ${String(sct.medianContextChars)} ≈ ${String(Math.round(sct.medianContextChars / 3.5))} |`,
    );
  });
  md.push(
    `| C : chapitre entier | ${fmt(c.recallContext)} | ${fmt(c.hitContext)} | ${String(c.medianContextChars)} ≈ ${String(c.medianContextTokensEstimate)} |`,
  );
  // Hybrid: A's top 10 propositions plus the whole top-2 sections (deduplicated).
  const hybrid = rowsA.map((r) => {
    const ids = new Set<string>(r.a.top10);
    for (const u of propositionUnits) {
      if (u.sectionId !== null && r.c.topSections[1].sections.includes(u.sectionId)) ids.add(u.id);
    }
    const expected = questions.find((x) => x.id === r.id)?.expected.measure_ids ?? [];
    return {
      recall: recallAt(ranksOf(expected, [...ids]), Number.POSITIVE_INFINITY),
      chars: [...ids].reduce((n, id) => n + (unitById.get(id)?.text.length ?? 0), 0),
    };
  });
  const hybridChars = Math.round(median(hybrid.map((h) => h.chars)));
  md.push(
    `| A + S : top 10 propositions ∪ 2 meilleures sections | ${fmt(mean(hybrid.map((h) => h.recall)))} | ${fmt(mean(hybrid.map((h) => (h.recall > 0 ? 1 : 0))))} | ${String(hybridChars)} ≈ ${String(Math.round(hybridChars / 3.5))} |`,
  );
}
md.push('');
md.push('## Configurations de A (spécification du plan puis ablations), 70 dorées + glossaire');
md.push('');
md.push(
  '| Configuration | rappel@5 | rappel@10 | hit@5 | MRR | rappel@3 sections | C : chapitre ok | C : rappel contexte | « absent » F1 |',
);
md.push('|---|---|---|---|---|---|---|---|---|');
for (const r of configResults) {
  const a = r.variantA.golden_and_glossary_70;
  const c = r.variantC.golden_and_glossary_70;
  const mark = r.config.name === bestConfig.config.name ? ' **(meilleure)**' : '';
  md.push(
    `| \`${r.config.name}\`${mark} — ${r.config.description_fr} | ${fmt(a.recall5)} | ${fmt(a.recall10)} | ${fmt(a.hit5)} | ${fmt(a.mrr)} | ${fmt(a.sectionRecall3)} | ${fmt(c.chapterHit1)} | ${fmt(c.recallContext)} | ${fmt(r.absentDetection.best.f1)} |`,
  );
}
md.push('');
md.push(`## Sous-ensembles (configuration \`${bestConfig.config.name}\`)`);
md.push('');
md.push(
  '| Sous-ensemble | A rappel@5 | A rappel@10 | A hit@5 | A MRR | A rappel@3 sections | C chapitre ok | C rappel contexte |',
);
md.push('|---|---|---|---|---|---|---|---|');
const subsetLabels: readonly [keyof Subsets<unknown>, string][] = [
  ['golden_50', '50 dorées'],
  ['glossary_20', '20 glossaire'],
  ['adversarial_with_ids_19', '19 adversariales avec ids (partial + measures)'],
  ['all_scored_89', '89 questions notées'],
];
for (const [key, label] of subsetLabels) {
  const a = bestConfig.variantA[key];
  const c = bestConfig.variantC[key];
  md.push(
    `| ${label} | ${fmt(a.recall5)} | ${fmt(a.recall10)} | ${fmt(a.hit5)} | ${fmt(a.mrr)} | ${fmt(a.sectionRecall3)} | ${fmt(c.chapterHit1)} | ${fmt(c.recallContext)} |`,
  );
}
md.push('');
md.push(
  `## Détection « rien trouvé » (configuration \`${bestConfig.config.name}\` ; ${String(bestConfig.absentDetection.positives)} questions « absent » sur 100 ; les 30 adversariales = 11 absentes + 19 avec ids)`,
);
md.push('');
md.push(
  '| Signal (variante A) | Seuil | Précision (100) | Rappel (100) | F1 | Sur les 30 adversariales : P / R |',
);
md.push('|---|---|---|---|---|---|');
for (const r of bestConfig.absentDetection.byFeature) {
  const mark = r.feature === bestConfig.absentDetection.best.feature ? ' **(retenu)**' : '';
  md.push(
    `| ${r.feature}${mark} | < ${String(r.threshold)} | ${fmt(r.precision)} | ${fmt(r.recall)} | ${fmt(r.f1)} | ${fmt(r.adversarial_30.precision)} / ${fmt(r.adversarial_30.recall)} |`,
  );
}
md.push('');
{
  const b = bestConfig.absentDetection.best;
  md.push(
    `Signal retenu : faux positifs (questions avec réponse classées « absent ») : ${b.falsePositiveIds.join(', ') || 'aucun'} ; faux négatifs (absentes non détectées) : ${b.falseNegativeIds.join(', ') || 'aucun'}. Seuil ajusté sur les mêmes 100 questions (11 positifs) : chiffre optimiste, à revalider sur un jeu tenu à l'écart.`,
  );
}
md.push('');
md.push(`## 10 pires questions (configuration \`${bestConfig.config.name}\`, rappel@5 croissant)`);
md.push('');
md.push(
  '| Id | Type | Question | Attendu | Rangs A | Chapitre attendu → routé (C) | Top 5 A | Pourquoi |',
);
md.push('|---|---|---|---|---|---|---|---|');
for (const w of worst) {
  md.push(
    `| ${w.id} | ${w.kind} / ${w.answerKind} | ${w.question.replace(/\|/g, '\\|')} | ${w.expected.join(', ')} | ${w.ranksA.map((r) => (r === null ? '—' : String(r))).join(', ')} | ${w.expectedChapters.join('/')} → ${w.routedChapterC ?? '—'} | ${w.top5A.join(', ')} | ${w.why_fr} |`,
  );
}
md.push('');
md.push('## Verdict (règle du plan : la variante la plus simple atteignant rappel@5 ≥ 0,9 gagne)');
md.push('');
{
  const reaching = configResults.filter((r) => r.variantA.golden_and_glossary_70.recall5 >= 0.9);
  const spec70 = spec.variantA.golden_and_glossary_70;
  const best70 = bestConfig.variantA.golden_and_glossary_70;
  if (reaching.length > 0) {
    md.push(
      `- Variante retenue : \`${reaching[0]?.config.name ?? ''}\` (rappel@5 ${fmt(reaching[0]?.variantA.golden_and_glossary_70.recall5 ?? 0)}).`,
    );
  } else {
    md.push(
      `- **Aucune variante n'atteint rappel@5 ≥ 0,9** sur les 70 dorées + glossaire : A-spec ${fmt(spec70.recall5)}, meilleure configuration \`${bestConfig.config.name}\` ${fmt(best70.recall5)} ; C (chapitre entier) ${fmt(spec.variantC.golden_and_glossary_70.recallContext)} de rappel contexte pour ≈ 4× plus de tokens. Les 10 pires questions sont listées ci-dessus avec leur diagnostic.`,
    );
    md.push(
      `- Ce que A garantit déjà : hit@5 ${fmt(best70.hit5)} (au moins un id attendu dans le top 5), rappel@10 ${fmt(best70.recall10)}, rappel@3 sections ${fmt(best70.sectionRecall3)}, MRR ${fmt(best70.mrr)}, index ${kb(summary.sizes_bytes.index_a_units.gzip)} gzip, < 1 ms par requête.`,
    );
    md.push(
      '- Les échecs restants sont surtout lexicaux (paraphrases : prisons / carcéral, avion / lignes aériennes, tourisme spatial / voyages dans l’espace) ou structurels (5 ids attendus dans plusieurs sections). Le levier le moins cher est le fichier d’alias de la FAQ (D2.5), pas un autre moteur : sans synonymes, rappel@5 tombe à ' +
        fmt(configResults[1]?.variantA.golden_and_glossary_70.recall5 ?? 0) +
        '.',
    );
    md.push(
      '- Contexte LLM recommandé si le chat v2 existe : A top 10 ∪ 2 meilleures sections (courbe ci-dessus, ≈ 1 400 tokens estimés) plutôt que le chapitre entier (C) ; le LLM ne fait que choisir des ids dans ce contexte.',
    );
  }
  md.push(
    `- Détection « rien trouvé » par seuil de score : F1 ${fmt(bestConfig.absentDetection.best.f1)} (précision ${fmt(bestConfig.absentDetection.best.precision)}) — inutilisable seule ; le refus honnête doit venir du routage FAQ exact (entrées « absent », D2.5) et du jugement hors_programme du LLM validé a posteriori.`,
  );
}
md.push('');
writeFileSync(args.md, `${md.join('\n')}\n`);

for (const r of configResults) {
  const a = r.variantA.golden_and_glossary_70;
  const c = r.variantC.golden_and_glossary_70;
  console.log(
    `${r.config.name.padEnd(18)} A recall@5=${fmt(a.recall5)} recall@10=${fmt(a.recall10)} hit@5=${fmt(a.hit5)} MRR=${fmt(a.mrr)} sections@3=${fmt(a.sectionRecall3)} | C chapter@1=${fmt(c.chapterHit1)} recall@ctx=${fmt(c.recallContext)} | absent F1=${fmt(r.absentDetection.best.f1)} (${r.absentDetection.best.feature} < ${String(r.absentDetection.best.threshold)})`,
  );
}
console.log(
  `index A ${kb(summary.sizes_bytes.index_a_units.gzip)} gzip, latency A median ${String(spec.latencyMs.a.median)} ms; best config ${bestConfig.config.name}`,
);
console.log(`written ${args.json}, ${args.md}`);
if (args.verbose) {
  for (const w of worst) console.log(JSON.stringify(w, null, 1));
}

for (const id of args.explain) {
  const q = questions.find((x) => x.id === id);
  if (q === undefined) {
    console.log(`explain: unknown question ${id}`);
    continue;
  }
  for (const config of [spec.config, bestConfig.config]) {
    const expansion = config.expansion ? expand(q.question) : NO_EXPANSION;
    console.log(`\n[${config.name}] ${q.id} ${q.question}`);
    console.log(
      `  query terms: ${terms(q.question).join(' ')}${expansion.addedTerms.length > 0 ? ` | expansion (${expansion.groups.join(', ')}): ${expansion.addedTerms.join(' ')}` : ''}`,
    );
    console.log(`  expected: ${q.expected.measure_ids.join(', ')}`);
    const ranking = search(unitIndex, q.question, expansion, config);
    const show = (r: Ranked, rank: number): void => {
      const matched = Object.entries(r.match)
        .map(([term, fields]) => `${term}(${fields.join('+')})`)
        .join(' ');
      console.log(
        `  #${String(rank)} ${r.id} ${r.score.toFixed(2)} [${matched}] ${(unitById.get(r.id)?.text ?? '').slice(0, 80)}`,
      );
    };
    ranking.slice(0, 8).forEach((r, i) => {
      show(r, i + 1);
    });
    for (const e of q.expected.measure_ids) {
      const unitId = coveringUnitId.get(e) ?? e;
      const i = ranking.findIndex((r) => r.id === unitId);
      const r = ranking[i];
      if (r === undefined) console.log(`  expected ${e}: not retrieved`);
      else if (i >= 8) show(r, i + 1);
    }
  }
}
