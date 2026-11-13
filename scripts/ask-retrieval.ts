/**
 * How well does the private base find what the model must read? — measured on the 87 questions
 * of the dossier, locally, at zero neuron (the model is not involved).
 *
 *   npx tsx scripts/ask-retrieval.ts          the numbers
 *   npx tsx scripts/ask-retrieval.ts --misses the questions it misses, by identifier
 *
 * An answer can only be as right as the measures the model was handed (PLAN-JEU §2.1). This
 * runs the very code of the Worker (src/worker/retrieve.ts) on Node's SQLite, loaded as the
 * D1 base would be, and counts for each question whether a measure of an expected section is
 * among the candidates — and among the first three, which is what a "selection" shows.
 *
 * Reads private/: a local tool. Prints identifiers and numbers.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { SynonymGroup } from '../src/lib/search-core.js';
import { sectionOf } from '../src/lib/search-core.js';
import { MAX_SELECTED } from '../src/lib/ask-contract.js';
import { retrieve } from '../src/worker/retrieve.js';
import type { PrivateCorpus } from './aec26-types.js';
import { loadAskSet, type AskSetItem } from './ask-set.js';
import { PRIVATE_CORPUS_PATH } from './ingest-2026.js';
import { localBase } from './seed-ask-2026.js';

export interface RetrievalReport {
  questions: number;
  /** A measure of an expected section is among the candidates. */
  inContext: number;
  /** …and among the first three: what the page shows when no sentence is written. */
  inFirstThree: number;
  /** The question finds nothing at all. */
  empty: number;
  meanCandidates: number;
  meanCharacters: number;
  maxCharacters: number;
  misses: string[];
  missesFirstThree: string[];
}

export function synonymGroups(): SynonymGroup[] {
  return (JSON.parse(readFileSync('data/2026/synonyms.json', 'utf8')) as { groups: string[][] })
    .groups;
}

export async function retrievalReport(
  corpus: PrivateCorpus,
  items: readonly AskSetItem[],
): Promise<RetrievalReport> {
  const db = localBase(corpus);
  const synonyms = synonymGroups();
  const report: RetrievalReport = {
    questions: 0,
    inContext: 0,
    inFirstThree: 0,
    empty: 0,
    meanCandidates: 0,
    meanCharacters: 0,
    maxCharacters: 0,
    misses: [],
    missesFirstThree: [],
  };
  let candidates = 0;
  let characters = 0;
  for (const item of items) {
    const expected = new Set(item.sections ?? []);
    if (expected.size === 0) continue;
    report.questions += 1;
    const found = await retrieve(db, item.question, synonyms);
    const sections = found.candidates.map((c) => sectionOf(c.id));
    const size = found.candidates.reduce((n, c) => n + c.text.length, 0);
    candidates += found.candidates.length;
    characters += size;
    report.maxCharacters = Math.max(report.maxCharacters, size);
    if (found.candidates.length === 0) report.empty += 1;
    if (sections.some((s) => expected.has(s))) report.inContext += 1;
    else report.misses.push(item.id);
    if (sections.slice(0, MAX_SELECTED).some((s) => expected.has(s))) report.inFirstThree += 1;
    else report.missesFirstThree.push(item.id);
  }
  report.meanCandidates = Math.round((candidates / report.questions) * 10) / 10;
  report.meanCharacters = Math.round(characters / report.questions);
  return report;
}

async function main(): Promise<void> {
  if (!existsSync(PRIVATE_CORPUS_PATH)) {
    console.error(`ask-retrieval: ${PRIVATE_CORPUS_PATH} is not on this machine`);
    process.exitCode = 1;
    return;
  }
  const corpus = JSON.parse(readFileSync(PRIVATE_CORPUS_PATH, 'utf8')) as PrivateCorpus;
  const set = loadAskSet();
  for (const group of ['question', 'variant'] as const) {
    const report = await retrievalReport(
      corpus,
      set.items.filter((i) => i.group === group),
    );
    const share = (n: number): string => `${String(n)}/${String(report.questions)}`;
    console.log(
      `${group}: expected section among the candidates ${share(report.inContext)}, ` +
        `among the first three ${share(report.inFirstThree)}, nothing found ${String(report.empty)} ; ` +
        `${String(report.meanCandidates)} candidates and ${String(report.meanCharacters)} characters ` +
        `on average, ${String(report.maxCharacters)} at most`,
    );
    if (process.argv.includes('--misses')) {
      console.log(`  missed: ${report.misses.join(', ') || 'none'}`);
      console.log(`  not in the first three: ${report.missesFirstThree.join(', ') || 'none'}`);
    }
  }
}

if (process.argv[1] !== undefined && /ask-retrieval\.ts$/.test(process.argv[1])) await main();
