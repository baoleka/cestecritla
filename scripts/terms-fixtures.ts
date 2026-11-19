/**
 * What the end-to-end test of the sheet makes it show (scripts/e2e-sheet.ts, §7) and what it
 * expects of the explained words — shared with scripts/terms.test.ts, which reads the same
 * cases against data/2026/terms.json as it stands. An entry written later that would change
 * these lists is then caught by the unit tests, in a second, before any browser (PLAN-MOTS,
 * lot 2): the words of the book are about to be many more.
 */

/** A sentence of the base that uses no explained word (the scenario « deux »). */
export const plainSentence = (id: string): string =>
  `Le programme prévoit une phrase d'essai, pour ${id}.`;

/** An invented sentence that uses two terms of the file, in this order: « moratoire », « T2A ». */
export const wordySentence = (id: string): string =>
  `Le programme prévoit un moratoire d'essai sur la T2A, pour ${id}.`;

/** One question of §7, what the sheet shows under it, and the words it must explain. */
export interface SheetCase {
  question: string;
  /** The sentences on the screen: none, sentences without a term, or sentences with two. */
  sentences: 'none' | 'plain' | 'wordy';
  /** The words above the measures, open: what the question asks about. */
  asked: readonly string[];
  /** The words under the measures, closed: what the sentences use. */
  below: readonly string[];
}

/** The question of §2 to §7 that names no explained word, under sentences that use none. */
export const QUIET_QUESTION = 'et l’hôpital, moi infirmière de nuit';

export const SHEET_CASES: readonly SheetCase[] = [
  { question: QUIET_QUESTION, sentences: 'plain', asked: [], below: [] },
  { question: 'et l’hôpital ?', sentences: 'wordy', asked: [], below: ['moratoire', 'T2A'] },
  {
    question: 'et la t2a à l’hôpital ?',
    sentences: 'wordy',
    asked: [],
    below: ['T2A', 'moratoire'],
  },
  {
    question: 'c’est quoi la t2a à l’hôpital ?',
    sentences: 'wordy',
    asked: ['T2A'],
    below: ['moratoire'],
  },
  {
    question: 'c’est quoi un moratoire à l’hôpital ?',
    sentences: 'none',
    asked: ['moratoire'],
    below: [],
  },
];

/** The case of a question, or an error: a test that names a case that does not exist is wrong. */
export function sheetCase(question: string): SheetCase {
  const found = SHEET_CASES.find((entry) => entry.question === question);
  if (found === undefined) throw new Error(`no case for « ${question} »`);
  return found;
}

/** Identifiers of measures, as the sheet puts them in its sentences (the search picks them). */
export const SAMPLE_IDS: readonly string[] = ['p2c1-s03-m04', 'p5c1-s02-m01', 'p1c1-s01-k01'];
