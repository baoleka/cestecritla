/**
 * The lexicon of the book (PLAN-MOTS): where each explained word is written. Pure — tested on an
 * invented book (scripts/lexicon.test.ts), run on the real one by scripts/lexicon-2026.ts, on the
 * machine that holds the text, and nowhere else.
 *
 * What it gives is identifiers only: for each section, the words of data/2026/terms.json that
 * its text uses — its title, its measures and their points, the paragraphs between them. No
 * word of the book leaves it (D15.2): the published map says which explained word a section
 * uses, never where, never how often, never next to what.
 */
import type { PrivateItem } from './aec26-types.js';
import { spansIn, type TermWording } from '../src/lib/terms.js';

/** The texts of a unit of the book, in order: its title, then each item and its points. */
export function unitTexts(title: string, items: readonly PrivateItem[]): string[] {
  const out = [title];
  const walk = (list: readonly PrivateItem[]): void => {
    for (const item of list) {
      out.push(item.text);
      walk(item.subMeasures ?? []);
    }
  };
  walk(items);
  return out;
}

/** The explained words a set of texts uses: their identifiers, each once, sorted. */
export function wordsOf(texts: readonly string[], wordings: readonly TermWording[]): string[] {
  const ids = new Set<string>();
  for (const text of texts) {
    for (const span of spansIn(text, wordings)) ids.add(span.entry.id);
  }
  return [...ids].sort();
}

/**
 * For each section of the book, the explained words its text uses — sections that use none are
 * left out. Keys in the order of the book.
 */
export function placesOf(
  corpus: { sections: readonly { id: string; title: string; items: readonly PrivateItem[] }[] },
  wordings: readonly TermWording[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const section of corpus.sections) {
    const ids = wordsOf(unitTexts(section.title, section.items), wordings);
    if (ids.length > 0) out[section.id] = ids;
  }
  return out;
}

/** What the map says, in numbers only: what a tool may print. */
export function placesSummary(places: Readonly<Record<string, readonly string[]>>): string {
  const counts = Object.values(places).map((ids) => ids.length);
  const words = new Set(Object.values(places).flat());
  const most = counts.length === 0 ? 0 : Math.max(...counts);
  return `${String(counts.length)} sections use explained words — ${String(words.size)} words placed, ${String(most)} in a section at most`;
}
