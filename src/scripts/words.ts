/**
 * The explained words of the sheet of « Demander »: which terms a turn explains
 * (src/lib/terms.ts), and how each is drawn (src/scripts/words-view.ts).
 *
 * A module of its own (PLAN-MOTS, lot 1). The sheet's script has a ceiling of its own
 * (scripts/check-build.test.ts), and reading hundreds of terms does not belong in it: this file
 * is asked for as soon as that script runs, never by a page. Nothing is sent to find a word —
 * this is code, the same for everyone, and its address says nothing of what was typed (D20.13).
 */
import { explainedFor, type Explained, type TermEntry } from '../lib/terms.ts';

export { wordItem } from './words-view.ts';

/**
 * What the sheet explains for a turn: the terms its question asks about, first; then those its
 * sentences use (src/lib/terms.ts, `explainedFor`).
 */
export function explain(
  question: string,
  sentences: readonly string[],
  entries: readonly TermEntry[],
): Explained[] {
  return explainedFor(question, sentences, entries);
}
