/**
 * Measures the search of the 2026 edition on the evaluation set (lot D5).
 *
 *   npx tsx scripts/eval-2026.ts             runs the 2026 questions against the committed index
 *   npx tsx scripts/eval-2026.ts --derive    (local) rewrites eval/questions-2026.json from the
 *                                            2025 set and the private map, keeping judged entries
 *   npx tsx scripts/eval-2026.ts --failures  also lists the questions that miss
 *
 * The unit is the SECTION, because that is what the product answers: "where is it written?".
 * A question is a hit at k when one of the sections where its subject is treated appears among
 * the k first sections proposed.
 *
 * Where the expectations come from. The 100 questions were labelled by hand against the 2025
 * edition (eval/questions.json). The book was rewritten; each expected measure is followed
 * through the private 2025 → 2026 map (scripts/id-map.ts):
 *   primary    sections holding a 2026 proposition identical or close to an expected measure;
 *   accepted   sections holding a reworked version of one, or heirs of the expected section.
 * `basis: "judged"` marks an entry corrected by reading the 2026 text; --derive never touches
 * those. Questions whose subject the 2026 edition does not treat are left out, and counted.
 *
 * Only public data is read by the run itself (index, questions, synonyms): CI replays it.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import MiniSearch from 'minisearch';
import {
  INDEX_OPTIONS,
  buildQuery,
  expand,
  groupBySection,
  searchOptions,
  type SearchDoc,
  type SynonymGroup,
} from '../src/lib/search-core.js';

export const QUESTIONS_2026_PATH = 'eval/questions-2026.json';
export const SYNONYMS_PATH = 'data/2026/synonyms.json';
const INDEX_PATH = 'data/2026/search-index.json';

export interface Question2026 {
  id: string;
  question: string;
  kind: string;
  primary: string[];
  accepted: string[];
  basis: 'mapped' | 'judged';
  note?: string;
}

export interface Questions2026 {
  meta: {
    derived_from: string;
    corpus_version: string;
    left_out: { id: string; reason: string }[];
    note_fr: string;
  };
  questions: Question2026[];
}

export interface SynonymsFile {
  meta: { note_fr: string };
  groups: string[][];
}

export interface EvalResult {
  evaluated: number;
  hit1: number;
  hit3: number;
  hit5: number;
  recall3: number;
  misses: { id: string; top: string[] }[];
}

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

export function loadSearch(): (question: string) => string[] {
  const file = json(INDEX_PATH) as { index: unknown };
  const index = MiniSearch.loadJS<SearchDoc>(
    file.index as Parameters<typeof MiniSearch.loadJS>[0],
    INDEX_OPTIONS,
  );
  const groups: SynonymGroup[] = (json(SYNONYMS_PATH) as SynonymsFile).groups;
  return (question) => {
    const query = buildQuery(question, expand(question, groups));
    const hits = index
      .search(query as Parameters<typeof index.search>[0], searchOptions())
      .map((r) => ({ id: String(r.id), score: r.score }));
    return groupBySection(hits).map((s) => s.sectionId);
  };
}

export function evaluate(questions: readonly Question2026[]): EvalResult {
  const search = loadSearch();
  const out: EvalResult = { evaluated: 0, hit1: 0, hit3: 0, hit5: 0, recall3: 0, misses: [] };
  for (const q of questions) {
    const good = new Set([...q.primary, ...q.accepted]);
    const top = search(q.question).slice(0, 5);
    out.evaluated += 1;
    if (good.has(top[0] ?? '')) out.hit1 += 1;
    if (top.slice(0, 3).some((s) => good.has(s))) out.hit3 += 1;
    if (top.some((s) => good.has(s))) out.hit5 += 1;
    else out.misses.push({ id: q.id, top });
    const must = q.primary.length > 0 ? q.primary : q.accepted;
    out.recall3 += must.filter((s) => top.slice(0, 3).includes(s)).length / must.length;
  }
  const rate = (n: number): number => Math.round((n / out.evaluated) * 1000) / 1000;
  return {
    ...out,
    hit1: rate(out.hit1),
    hit3: rate(out.hit3),
    hit5: rate(out.hit5),
    recall3: rate(out.recall3),
  };
}

interface Question2025 {
  id: string;
  kind: string;
  question: string;
  expected: { answer_kind: string; section_ids: string[]; measure_ids: string[] };
}
interface PrivateMatch {
  from: string;
  toSection: string | null;
  class: string;
}

function derive(): void {
  const source = json('eval/questions.json') as {
    meta: { version: string };
    questions: Question2025[];
  };
  const map = json('private/id-map/full.json') as { items: PrivateMatch[] };
  const heirs = (json('data/2026/id-map-2025.json') as { sections: Record<string, string[]> })
    .sections;
  const manifest = json('data/2026/manifest.json') as { meta: { corpus_version: string } };
  const byFrom = new Map(map.items.map((m) => [m.from, m]));
  const judged = new Map(
    existsSync(QUESTIONS_2026_PATH)
      ? (json(QUESTIONS_2026_PATH) as Questions2026).questions
          .filter((q) => q.basis === 'judged')
          .map((q) => [q.id, q])
      : [],
  );
  const leftOut: { id: string; reason: string }[] = [];
  const questions: Question2026[] = [];
  for (const q of source.questions) {
    const kept = judged.get(q.id);
    if (kept !== undefined) {
      questions.push(kept);
      continue;
    }
    if (q.expected.answer_kind === 'absent') {
      leftOut.push({
        id: q.id,
        reason: 'sujet absent du programme en 2025 : pas une question de recherche',
      });
      continue;
    }
    const primary = new Set<string>();
    const accepted = new Set<string>();
    for (const id of q.expected.measure_ids) {
      const match = byFrom.get(id);
      if (match?.toSection == null) continue;
      (['exact', 'typo', 'close'].includes(match.class) ? primary : accepted).add(match.toSection);
    }
    for (const section of q.expected.section_ids) {
      for (const heir of heirs[section] ?? []) if (!primary.has(heir)) accepted.add(heir);
    }
    for (const id of primary) accepted.delete(id);
    if (primary.size + accepted.size === 0) {
      leftOut.push({ id: q.id, reason: 'aucune section de 2026 ne reprend les mesures attendues' });
      continue;
    }
    questions.push({
      id: q.id,
      question: q.question,
      kind: q.kind,
      primary: [...primary].sort(),
      accepted: [...accepted].sort(),
      basis: 'mapped',
    });
  }
  const file: Questions2026 = {
    meta: {
      derived_from: `eval/questions.json v${source.meta.version}`,
      corpus_version: manifest.meta.corpus_version,
      left_out: leftOut,
      note_fr:
        'Attendus au niveau de la section. « primary » : la section porte une proposition identique ou proche ' +
        'd’une mesure attendue en 2025 ; « accepted » : elle en porte une version remaniée, ou hérite de la section. ' +
        'basis « judged » : attendu corrigé à la lecture du texte 2026.',
    },
    questions,
  };
  writeFileSync(QUESTIONS_2026_PATH, `${JSON.stringify(file, null, 2)}\n`);
  console.log(
    `${QUESTIONS_2026_PATH}: ${String(questions.length)} questions, ${String(leftOut.length)} left out`,
  );
}

function main(): void {
  if (process.argv.includes('--derive')) derive();
  const file = json(QUESTIONS_2026_PATH) as Questions2026;
  const result = evaluate(file.questions);
  console.log(
    `${String(result.evaluated)} questions (${String(file.meta.left_out.length)} left out): ` +
      `hit@1 ${String(result.hit1)} · hit@3 ${String(result.hit3)} · hit@5 ${String(result.hit5)} · ` +
      `recall@3 ${String(result.recall3)}`,
  );
  if (process.argv.includes('--failures')) {
    for (const miss of result.misses)
      console.log(`  ${miss.id}: proposed ${miss.top.join(', ') || 'nothing'}`);
  }
}

if (process.argv[1] !== undefined && /eval-2026\.ts$/.test(process.argv[1])) main();
