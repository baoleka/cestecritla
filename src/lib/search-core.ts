/**
 * The search engine's language rules — one file, three users: the index builder (Node, local),
 * the search island (browser) and the evaluation (Node). No import, no DOM, no Node API.
 *
 * Learning note — why this must be ONE file. A lexical index only answers a query that was cut
 * into words exactly the way the documents were. If the builder stems "salaires" to "salaire"
 * and the browser does not, the word is simply absent — no error, just a search that finds
 * less. Sharing the code is the only test of that which cannot go stale.
 *
 * Lifted from eval/retrieval-core.ts, the bench of September 2026 (D6.1): same normalisation,
 * same light stemming, same stop words, and the configuration that bench retained
 * ("A-synonymes-0.25"). scripts/search-core.test.ts holds the two to the same output. One
 * addition for the 2026 edition: soft hyphens (U+00AD), which its text contains, are dropped
 * before anything else — otherwise the word they sit in is indexed in two halves.
 */

/** Function words, modal verbs and the frames people wrap a question in. */
export const STOPWORDS: ReadonlySet<string> = new Set(
  `le la les l un une des du de d et ou a au aux en dans pour par sur avec sans sous ce cet cette ces se sa son
   ses leur leurs mon ma mes ton ta tes notre nos votre vos il ils elle elles on nous vous je tu me te moi toi lui y
   qui que quoi qu quel quelle quels
   quelles dont ne pas plus non oui est sont etre ete avoir ai as ont fait faire fais font comme mais donc si
   car ni or ca cela ceci celui celle ceux celles tout tous toute toutes meme memes autre autres aussi encore
   bien tres peu deja jamais toujours entre vers chez ici s c m t j n jusqu lorsqu puisqu
   peut peux peuvent pouvoir pourra pourrai pourrais pourrait pourraient doit doivent devoir devrait faut
   faudra faudrait
   programme propose proposent proposer dit dis dire disent veut veulent vouloir prevoit prevoient prevu prevue
   va vont vais vas aller allait allaient compte comptent vraiment concretement exactement juste truc chose
   choses vrai vraie comment pourquoi combien quand seulement egalement notamment particulierement surtout
   plutot tellement beaucoup moins trop assez
   dame madame monsieur oncle tante cousin cousine voisin voisine collegue copain copine pote mec gars type
   ami amie demande demandent demander demande sais sait savoir aider laquelle lequel lesquels lesquelles
   repond reponds repondre`
    .split(/\s+/)
    .filter((w) => w.length > 0),
);

const SOFT_HYPHEN = new RegExp(String.fromCodePoint(0xad), 'g');

/** Lower case, no accent, one apostrophe, elisions dropped, digit groups merged ("1 600" → "1600"). */
export function normalize(text: string): string {
  let s = text
    .replace(SOFT_HYPHEN, '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[’'`´]/g, "'")
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/aujourd'hui/g, 'aujourdhui');
  // Elisions: l'eau → eau, d'emploi → emploi, qu'il → il, jusqu'à → a…
  s = s.replace(/\b(l|d|qu|j|n|s|c|m|t|jusqu|lorsqu|puisqu)'(?=[a-z0-9])/g, '');
  // Thousands written with a space (the book: "10 000"; a question: "1 600").
  let previous = '';
  while (previous !== s) {
    previous = s;
    s = s.replace(/(\d)\s(\d{3})(?!\d)/g, '$1$2');
  }
  return s;
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/** Light French stemming: plural, feminine "ée", "eaux" → "eau", "aux" → "al", "-ement" / "-ent". */
export function stem(term: string): string {
  let t = term;
  if (t.length >= 4 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
  if (t.length >= 4 && t.endsWith('ee')) t = t.slice(0, -1);
  if (t.length >= 5 && t.endsWith('eaux')) t = t.slice(0, -1);
  else if (t.length >= 5 && t.endsWith('aux')) t = `${t.slice(0, -3)}al`;
  if (t.endsWith('ement') && t.length - 5 >= 4) t = t.slice(0, -5);
  else if (t.endsWith('ent') && !t.endsWith('ement') && t.length - 3 >= 5) t = t.slice(0, -3);
  return t;
}

/** MiniSearch `processTerm`: stop words out, then stemming; `null` drops the term. */
export function processTerm(term: string): string | null {
  if (STOPWORDS.has(term)) return null;
  if (term.length < 2 && !/\d/.test(term)) return null;
  return stem(term);
}

/**
 * Same stem, or two forms of one word the light stemming above leaves apart: « nationaliser »
 * and « nationalisation », « agriculteur » and « agriculture ». Five letters in common from the
 * start, and most of the shorter word. Not used by the index — a search must stay exact about
 * what it found — but by what compares a sentence of ours with a text: the control of an answer
 * (ask-validate.ts) and the recognition of an objection (ask-reviewed.ts).
 */
export function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  if (shorter < 5) return false;
  let common = 0;
  while (common < shorter && a[common] === b[common]) common += 1;
  return common >= 5 && common >= shorter * 0.6;
}

/** The words of a text as the index sees them. */
export function terms(text: string): string[] {
  return tokenize(text)
    .map(processTerm)
    .filter((term): term is string => term !== null);
}

// ---------------------------------------------------------------------------------------------
// The index: what it is made of, how it is asked
// ---------------------------------------------------------------------------------------------

/** One document per proposition. Neither field is stored: the index holds stems, not sentences. */
export interface SearchDoc {
  id: string;
  /** The proposition. */
  text: string;
  /** Its context: chapter and section titles — and, for a sub-measure, the measure it details. */
  prefix: string;
}

export const INDEX_FIELDS = ['text', 'prefix'] as const;

/** Options MiniSearch needs both to build an index and to load one back. */
export const INDEX_OPTIONS = {
  fields: [...INDEX_FIELDS],
  idField: 'id',
  tokenize,
  processTerm,
};

/**
 * The configuration retained by the September bench: fuzzy matching only on terms of six
 * letters or more, prefix matching from four, context at 0.6 of the text, synonyms at 0.25.
 */
export const SEARCH = {
  fuzzyMinLength: 6,
  prefixMinLength: 4,
  boost: { text: 1, prefix: 0.6 },
  expansionBoost: 0.25,
  bm25: { k: 1.2, b: 0.7, d: 0.5 },
  maxFuzzy: 6,
} as const;

export function searchOptions(): {
  fuzzy: (term: string) => number | false;
  prefix: (term: string) => boolean;
  boost: { text: number; prefix: number };
  bm25: { k: number; b: number; d: number };
  maxFuzzy: number;
} {
  return {
    fuzzy: (term) => (term.length >= SEARCH.fuzzyMinLength ? 0.2 : false),
    prefix: (term) => term.length >= SEARCH.prefixMinLength,
    boost: { ...SEARCH.boost },
    bm25: { ...SEARCH.bm25 },
    maxFuzzy: SEARCH.maxFuzzy,
  };
}

// ---------------------------------------------------------------------------------------------
// Synonyms: the words people use, next to the words the book uses
// ---------------------------------------------------------------------------------------------

/** Phrases that mean the same subject: a term of the glossary and its aliases, a FAQ question. */
export type SynonymGroup = readonly string[];

const MAX_EXPANSION_TERMS = 30;

function containsSequence(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    if (needle.every((term, j) => haystack[i + j] === term)) return true;
  }
  return false;
}

/**
 * The phrases to add to a question: every phrase of every group one of whose phrases appears
 * in it, as a run of processed words. Returned as text, searched as a second, weaker query.
 */
export function expand(question: string, groups: readonly SynonymGroup[]): string {
  const asked = terms(question);
  const present = new Set(asked);
  const phrases: string[] = [];
  let added = 0;
  for (const group of groups) {
    if (!group.some((phrase) => containsSequence(asked, terms(phrase)))) continue;
    for (const phrase of group) {
      const fresh = terms(phrase).filter((term) => !present.has(term));
      if (fresh.length === 0) continue;
      if (added + fresh.length > MAX_EXPANSION_TERMS) break;
      for (const term of fresh) present.add(term);
      added += fresh.length;
      phrases.push(phrase);
    }
  }
  return phrases.join(' ');
}

/** The MiniSearch query for a question and its expansion. */
export function buildQuery(question: string, expansion: string): unknown {
  if (expansion.length === 0) return question;
  return {
    combineWith: 'OR',
    queries: [
      { queries: [question], boost: { ...SEARCH.boost } },
      {
        queries: [expansion],
        boost: {
          text: SEARCH.boost.text * SEARCH.expansionBoost,
          prefix: SEARCH.boost.prefix * SEARCH.expansionBoost,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// From ranked propositions to "where it is written"
// ---------------------------------------------------------------------------------------------

export interface Hit {
  id: string;
  score: number;
}

export interface SectionHit {
  sectionId: string;
  score: number;
  /** Proposition ids found in the section, best first. */
  items: string[];
}

/** `p4c7-s03-m12.s2` → `p4c7-s03`. */
export const sectionOf = (itemId: string): string => itemId.replace(/-[kmp]\d{2}(?:\.s\d+)?$/, '');

/**
 * Groups ranked propositions by section. A section is ranked by its best proposition, plus a
 * little for each further one: three measures of one section answering the question make it a
 * better place to send the reader than one stray hit elsewhere — but not three times better.
 */
export function groupBySection(hits: readonly Hit[], maxItems = 4): SectionHit[] {
  const bySection = new Map<string, SectionHit>();
  for (const hit of hits) {
    const sectionId = sectionOf(hit.id);
    const existing = bySection.get(sectionId);
    if (existing === undefined) {
      bySection.set(sectionId, { sectionId, score: hit.score, items: [hit.id] });
    } else {
      existing.score += hit.score * 0.25;
      if (existing.items.length < maxItems) existing.items.push(hit.id);
    }
  }
  return [...bySection.values()].sort((a, b) => b.score - a.score);
}
