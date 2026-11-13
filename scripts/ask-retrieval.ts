/**
 * Does the page hand the model what it must read? — measured on the questions of the dossier,
 * at zero neuron (the model is not involved), on public files only.
 *
 *   npx tsx scripts/ask-retrieval.ts          the numbers
 *   npx tsx scripts/ask-retrieval.ts --misses the questions it misses, by identifier
 *
 * An answer can only be as right as the measures the model was handed (PLAN-JEU §2.1). Since
 * D16.22 it is the page that chooses them, on the phone, and names them to the Worker: this
 * runs the page's own computation (scripts/ask-page.ts) and counts, for each question, whether
 * a measure of an expected section is among those named — and among the three the page shows
 * by itself when no sentence is written.
 *
 * It used to run the search of the private base, and needed the text. There is no such search
 * any more: nothing private is read here.
 */
import { sectionOf } from '../src/lib/search-core.js';
import { loadPage } from './ask-page.js';
import { loadAskSet, type AskSetItem } from './ask-set.js';

export interface RetrievalReport {
  questions: number;
  /** A measure of an expected section is among those the page names. */
  inContext: number;
  /** …and among the three the page shows when no sentence is written. */
  inFirstThree: number;
  /** The search finds nothing at all: nothing is sent. */
  empty: number;
  meanCandidates: number;
  maxCandidates: number;
  /** Words of the book sent with the measures, on average. */
  meanTerms: number;
  misses: string[];
  missesFirstThree: string[];
}

export function retrievalReport(items: readonly AskSetItem[]): RetrievalReport {
  const page = loadPage();
  const report: RetrievalReport = {
    questions: 0,
    inContext: 0,
    inFirstThree: 0,
    empty: 0,
    meanCandidates: 0,
    maxCandidates: 0,
    meanTerms: 0,
    misses: [],
    missesFirstThree: [],
  };
  let candidates = 0;
  let terms = 0;
  for (const item of items) {
    const expected = new Set(item.sections ?? []);
    if (expected.size === 0) continue;
    report.questions += 1;
    const { asked, own } = page(item.question);
    candidates += asked.ids.length;
    terms += asked.terms.length;
    report.maxCandidates = Math.max(report.maxCandidates, asked.ids.length);
    if (asked.ids.length === 0) report.empty += 1;
    if (asked.ids.some((id) => expected.has(sectionOf(id)))) report.inContext += 1;
    else report.misses.push(item.id);
    if (own.some((id) => expected.has(sectionOf(id)))) report.inFirstThree += 1;
    else report.missesFirstThree.push(item.id);
  }
  report.meanCandidates = Math.round((candidates / Math.max(1, report.questions)) * 10) / 10;
  report.meanTerms = Math.round((terms / Math.max(1, report.questions)) * 10) / 10;
  return report;
}

if (process.argv[1] !== undefined && /ask-retrieval\.ts$/.test(process.argv[1])) {
  const set = loadAskSet();
  for (const group of ['question', 'variant'] as const) {
    const report = retrievalReport(set.items.filter((i) => i.group === group));
    const share = (n: number): string => `${String(n)}/${String(report.questions)}`;
    console.log(
      `${group}: expected section among the measures named ${share(report.inContext)}, ` +
        `among the three the page shows ${share(report.inFirstThree)}, nothing found ${String(report.empty)} ; ` +
        `${String(report.meanCandidates)} measures and ${String(report.meanTerms)} words of the book ` +
        `on average, ${String(report.maxCandidates)} measures at most`,
    );
    if (process.argv.includes('--misses')) {
      console.log(`  missed: ${report.misses.join(', ') || 'none'}`);
      console.log(`  not among the three: ${report.missesFirstThree.join(', ') || 'none'}`);
    }
  }
}
