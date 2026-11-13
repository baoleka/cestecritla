/**
 * What leaves the phone at the gesture « Demander » (D16.22) — computed here, purely, from
 * what the page's own search found, so that the page, the bench and the tests cannot disagree
 * on it.
 *
 * The sentence someone typed does not leave. Two things do:
 *
 *   ids    the measures to speak of: the ten the search ranks best, then what is left of the
 *          two sections it ranks best, in the order of the book. It is the context the bench of
 *          September measured at 0.94 recall (08-ia.md §3) — chosen on the phone now, where it
 *          used to be chosen in the private base;
 *   terms  the words of the BOOK the search matched in the best of those measures: stems of
 *          the public index, never a word as it was typed. Twelve at most, sorted — the order
 *          they came in is not kept, so that they cannot be read as a sentence.
 *
 * A word of the question the book does not write matches nothing, and so is not sent: what a
 * visitor says of themselves — « moi qui suis au chômage » — leaves as « chomage » at most,
 * a word of the book among others, said of nobody.
 */
import { ASKED_TERM, MAX_ASKED_IDS, MAX_ASKED_TERMS } from './ask-contract.js';
import { groupBySection, sectionOf } from './search-core.js';

export const TOP_PROPOSITIONS = 10;
export const BEST_SECTIONS = 2;

/** A result of the page's search: a proposition, its score, the terms of the index it matched. */
export interface LocalHit {
  id: string;
  score: number;
  terms: readonly string[];
}

export interface Asked {
  /** Best first. Empty when the search found nothing: then nothing is sent at all. */
  ids: string[];
  terms: string[];
}

/**
 * `hits` are the results of the search, best first; `order` is every proposition of the book,
 * in the order of the book (the keys of the titles file).
 */
export function askedOf(hits: readonly LocalHit[], order: readonly string[]): Asked {
  const known = new Set(order);
  const found = hits.filter((hit) => known.has(hit.id));
  const ids: string[] = [];
  const take = (id: string): void => {
    if (ids.length < MAX_ASKED_IDS && !ids.includes(id)) ids.push(id);
  };
  const top = found.slice(0, TOP_PROPOSITIONS);
  for (const hit of top) take(hit.id);
  const best = groupBySection(found.map(({ id, score }) => ({ id, score })))
    .slice(0, BEST_SECTIONS)
    .map((section) => section.sectionId);
  for (const section of best) {
    for (const id of order) if (sectionOf(id) === section) take(id);
  }

  // The words of the book the best measures were found by — the most shared first, so that a
  // word matched once by accident does not push out the subject of the search.
  const counts = new Map<string, number>();
  for (const hit of top) {
    for (const term of new Set(hit.terms)) {
      if (ASKED_TERM.test(term)) counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  const terms = [...counts]
    .sort(([a, n], [b, m]) => m - n || (a < b ? -1 : 1))
    .slice(0, MAX_ASKED_TERMS)
    .map(([term]) => term)
    .sort();
  return { ids, terms };
}
