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
import { createHash } from 'node:crypto';
import type { PrivateItem } from './aec26-types.js';
import { terms } from '../src/lib/search-core.js';
import { CARD_PREFIX, spansIn, type TermWording } from '../src/lib/terms.js';

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

/**
 * The explained words a set of texts uses: their identifiers, each once, sorted. `cards` are
 * read with them and never returned: a word inside the term of a card is the card's (D20.14).
 */
export function wordsOf(
  texts: readonly string[],
  wordings: readonly TermWording[],
  cards: readonly TermWording[] = [],
): string[] {
  const ids = new Set<string>();
  for (const text of texts) {
    for (const span of spansIn(text, [...cards, ...wordings])) ids.add(span.entry.id);
  }
  return [...ids].filter((id) => !id.startsWith(CARD_PREFIX)).sort();
}

/**
 * For each section of the book, the explained words its text uses — sections that use none are
 * left out. Keys in the order of the book.
 */
export function placesOf(
  corpus: { sections: readonly { id: string; title: string; items: readonly PrivateItem[] }[] },
  wordings: readonly TermWording[],
  cards: readonly TermWording[] = [],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const section of corpus.sections) {
    const ids = wordsOf(unitTexts(section.title, section.items), wordings, cards);
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

// ---------------------------------------------------------------------------------------------
// The judged vocabulary (data/2026/vocabulary.json; PLAN-MOTS, D20.8): every stem of what the
// site shows — the index of the book, and our own texts —, judged once. What makes « no word
// blocks » a property a gate can hold: a finite vocabulary is read whole, where a list of words
// to catch never closes (the lesson of data/2026/sensitive.json).
// ---------------------------------------------------------------------------------------------

/** Every stem of the index and of our texts, judged (PLAN-MOTS, lot 9): the file the gates read. */
export const VOCABULARY_PATH = 'data/2026/vocabulary.json';

/**
 * Each stem in one class:
 *   plain    a word a reader entering seconde knows;
 *   explain  a word that needs explaining — the entries whose wordings hold it;
 *   watch    a common word that may stand in a technical sense — the entries that cover that
 *            sense where the book uses it (its occurrences are read one by one, locally);
 *   names    a proper name — the entry that explains it, or what it is (a person, a brand, a
 *            place, a body) when nothing needs explaining.
 * A stem of digits alone is a number: judged by nobody.
 */
export interface Vocabulary {
  meta: {
    /** The stems of the index this file judged — its count and fingerprint. */
    index: { terms: number; sha256: string };
    judged_on: string;
    judged_by: string;
    second_judge: string;
    note_fr: string;
  };
  plain: string[];
  explain: Record<string, string[]>;
  watch: Record<string, string[]>;
  names: Record<string, string>;
}

/** What a name that needs no entry is (`names`). */
export const NAME_KINDS: readonly string[] = ['person', 'brand', 'place', 'body', 'other'];

/** The fingerprint of a list of stems: sorted, one per line. */
export function vocabularyFingerprint(stems: readonly string[]): string {
  return createHash('sha256')
    .update([...stems].sort().join('\n'))
    .digest('hex');
}

/** Every stem to judge in exactly one class — or digits alone — and no class holds a stem of nothing. */
export function partitionProblems(vocabulary: Vocabulary, stems: Iterable<string>): string[] {
  const out: string[] = [];
  const classOf = new Map<string, string[]>();
  const put = (stem: string, kind: string): void => {
    classOf.set(stem, [...(classOf.get(stem) ?? []), kind]);
  };
  for (const stem of vocabulary.plain) put(stem, 'plain');
  for (const stem of Object.keys(vocabulary.explain)) put(stem, 'explain');
  for (const stem of Object.keys(vocabulary.watch)) put(stem, 'watch');
  for (const stem of Object.keys(vocabulary.names)) put(stem, 'names');
  const universe = new Set(stems);
  for (const stem of universe) {
    const kinds = classOf.get(stem) ?? [];
    if (/^\d+$/.test(stem)) {
      if (kinds.length > 0) out.push(`${stem}: a number, judged ${kinds.join(' and ')}`);
    } else if (kinds.length !== 1) {
      out.push(`${stem}: ${kinds.length === 0 ? 'not judged' : `judged ${kinds.join(' and ')}`}`);
    }
  }
  for (const stem of classOf.keys()) {
    if (!universe.has(stem)) out.push(`${stem}: a stem of nothing the site shows`);
  }
  return out;
}

/**
 * Each stem judged hard is held by the entries it names — one of whose wordings yields that
 * stem — and every name points at an entry, or says what it is.
 */
export function coverageProblems(
  vocabulary: Vocabulary,
  entries: readonly TermWording[],
): string[] {
  const out: string[] = [];
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const stemsOf = (entry: TermWording): Set<string> =>
    new Set([entry.term, ...(entry.aliases ?? [])].flatMap((wording) => terms(wording)));
  for (const [stem, ids] of Object.entries(vocabulary.explain)) {
    if (ids.length === 0) out.push(`${stem}: hard, and no entry holds it`);
    for (const id of ids) {
      const entry = byId.get(id);
      if (entry === undefined) out.push(`${stem}: ${id} is no entry`);
      else if (!stemsOf(entry).has(stem)) out.push(`${stem}: no wording of ${id} yields it`);
    }
  }
  for (const [stem, ids] of Object.entries(vocabulary.watch)) {
    for (const id of ids) if (!byId.has(id)) out.push(`${stem}: ${id} is no entry`);
  }
  for (const [stem, what] of Object.entries(vocabulary.names)) {
    if (!byId.has(what) && !NAME_KINDS.includes(what)) {
      out.push(`${stem}: ${what} is neither an entry nor a kind of name`);
    }
  }
  return out;
}

/**
 * The hard stems a text uses outside any wording of an entry — counted, not placed: a stem the
 * text holds more often than the wordings found in it do is used, at least once, unexplained.
 * Counting spares mapping places back through the folding of the search (accents, elisions,
 * thousands): both sides are read by the same `terms`.
 */
export function uncoveredIn(
  text: string,
  hard: ReadonlySet<string>,
  wordings: readonly TermWording[],
): string[] {
  const count = (stems: readonly string[]): Map<string, number> => {
    const out = new Map<string, number>();
    for (const stem of stems) if (hard.has(stem)) out.set(stem, (out.get(stem) ?? 0) + 1);
    return out;
  };
  const nfc = text.normalize('NFC');
  const used = count(terms(nfc));
  const covered = count(
    spansIn(nfc, wordings).flatMap((span) => terms(nfc.slice(span.at, span.end))),
  );
  return [...used].filter(([stem, n]) => (covered.get(stem) ?? 0) < n).map(([stem]) => stem);
}
