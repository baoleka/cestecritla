/**
 * « Notre réponse, relue » — recognising one of the fifteen objections in a question (D16.1,
 * PLAN-JEU §2.2, route 2). No model runs for those: a person wrote the answer and re-read it.
 *
 * The rule is deliberately narrow: the question must carry the objection ITSELF — nearly all of
 * its words — not merely its theme. « La retraite à 60 ans, c'est infinançable » is recognised;
 * « Retraite à 60 ans : combien d'annuités ? » is a question about the same measure and must
 * get its own answer, not ours about financing. Missing a paraphrase costs nothing — the model
 * answers, and the chips of the home page still lead to the fifteen answers. A wrong match would
 * put a text that answers something else at the top of the page.
 *
 * Pure: the page runs it before sending anything — a recognised objection never leaves the
 * phone, and since D16.53 the Worker is never sent a question to run it on.
 */
import { sameWord, terms, tokenize } from './search-core.js';

/**
 * « Sans nucléaire… » and « Avec le nucléaire… » share every word the index keeps: an objection
 * written with one of these is not recognised in a question that says the other (review of
 * 24/11/2026).
 */
const OPPOSITES: readonly (readonly [string, string])[] = [['sans', 'avec']];
const saysTheOpposite = (question: string, objection: string): boolean => {
  const asked = new Set(tokenize(question));
  const own = new Set(tokenize(objection));
  return OPPOSITES.some(
    ([one, other]) =>
      (own.has(one) && asked.has(other) && !asked.has(one)) ||
      (own.has(other) && asked.has(one) && !asked.has(other)),
  );
};

export interface ReviewedEntry {
  slug: string;
  objection: string;
}

/** Share of the objection's own words the question must hold, and how many at the very least. */
export const REVIEWED_MIN_SHARE = 0.8;
export const REVIEWED_MIN_WORDS = 2;

/** The slug of the objection a question carries, or null. */
export function reviewedFor(question: string, entries: readonly ReviewedEntry[]): string | null {
  const asked = [...new Set(terms(question))];
  let best: { slug: string; share: number } | null = null;
  for (const entry of entries) {
    const own = [...new Set(terms(entry.objection))];
    if (own.length < REVIEWED_MIN_WORDS) continue;
    if (saysTheOpposite(question, entry.objection)) continue;
    const held = own.filter((word) => asked.some((other) => sameWord(word, other))).length;
    const share = held / own.length;
    if (held < REVIEWED_MIN_WORDS || share < REVIEWED_MIN_SHARE) continue;
    if (best === null || share > best.share) best = { slug: entry.slug, share };
  }
  return best?.slug ?? null;
}
