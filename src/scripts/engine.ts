/**
 * The search engine of the page, loaded once and shared: the search uses it while one types,
 * and the sheet of « Demander » uses it to choose the measures it shows, name them and link
 * them.
 *
 * Two static files, fetched on the first sign that someone is going to search: the index
 * (stems, no sentence) and the titles. Nothing typed is ever sent to get them.
 */
import MiniSearch from 'minisearch';
import type { Ranked } from '../lib/chat-local.ts';
import {
  INDEX_OPTIONS,
  buildQuery,
  credited,
  expand,
  groupBySection,
  inBookWords,
  joinWords,
  searchOptions,
  type BookWording,
  type SearchDoc,
  type SectionHit,
  type SynonymGroup,
  asWritten,
  fillerOnly,
  lookAlikeOnly,
  spelled,
  terms,
} from '../lib/search-core.ts';
import { firstWordsOf, isLocatorDisplay, quoted, type LocatorDisplay } from '../lib/first-words.ts';

/**
 * /data/meta-<fingerprint>.json — built from the public manifest (src/lib/search-data.ts). Its
 * name changes with what it holds: a browser that kept the titles of another build never hands
 * them to this script (R73).
 */
export interface Meta {
  /** Section id → [title, where ("Partie 2 · chapitre 2"), official URL]. */
  sections: Record<string, [string, string, string]>;
  /** Proposition id → [label ("Mesure clé", "Mesure 7.2"), text directive or "", incipit or ""]. */
  items: Record<string, [string, string, string]>;
  synonyms: SynonymGroup[];
  /** Phrases the book writes in other words, searched in its words (D21.8). */
  book_words: BookWording[];
}

export interface Engine {
  index: MiniSearch<SearchDoc>;
  meta: Meta;
}

let pending: Promise<Engine> | undefined;
let ready = false;

/** True once the two files are in memory: the first search has to say it is opening them. */
export const engineReady = (): boolean => ready;

/** The engine, fetched on first call. A failed download is not remembered: the next call retries. */
export function loadEngine(indexUrl: string, metaUrl: string): Promise<Engine> {
  pending ??= Promise.all([
    fetch(indexUrl).then((r) => {
      if (!r.ok) throw new Error('index');
      return r.json() as Promise<Parameters<typeof MiniSearch.loadJS>[0]>;
    }),
    fetch(metaUrl).then((r) => {
      if (!r.ok) throw new Error('meta');
      return r.json() as Promise<Meta>;
    }),
  ]).then(([serialised, meta]) => {
    // Ready once the index is built, not before: an index that cannot be read leaves the next
    // search saying again that it opens the files (review of 23/11/2026, S26).
    const index = MiniSearch.loadJS<SearchDoc>(serialised, INDEX_OPTIONS);
    ready = true;
    return { index, meta };
  });
  pending.catch(() => {
    pending = undefined;
  });
  return pending;
}

/**
 * The sections where a question is written, best first, each with its measures. Letters typed
 * apart are one word here too, as in `findRanked`: « S.M.I.C. » found nothing in the field and its
 * measures in the sheet (review of 23/11/2026, S8).
 */
export function findSections(engine: Engine, question: string, max: number): SectionHit[] {
  const searched = inBookWords(joinWords(spelled(question)), engine.meta.book_words).text;
  const query = buildQuery(searched, expand(searched, engine.meta.synonyms));
  const hits = engine.index
    .search(query as Parameters<typeof engine.index.search>[0], searchOptions())
    .map((r) => ({ id: String(r.id), score: r.score }));
  return groupBySection(hits).slice(0, max);
}

/**
 * The measures a question finds, best first, each with its score — what the sheet of
 * « Demander » chooses its rows from (src/lib/chat-local.ts). The same search as while typing.
 */
export function findRanked(engine: Engine, asked: string): Ranked[] {
  // Letters typed apart are one word: « R.S.A. » is searched as « rsa ».
  // A phrase the book writes in other words is searched in its words (D21.8): « exil fiscal ».
  const book = inBookWords(joinWords(spelled(asked)), engine.meta.book_words);
  const question = book.text;
  const query = buildQuery(question, expand(question, engine.meta.synonyms));
  // The words of the question as the index cuts them: a word that found no measure AS WRITTEN
  // is one the book does not hold — a name, often (src/lib/chat-local.ts, `strangersIn`). A
  // look-alike does not count: « françois » finds « français », « martin » finds « matin ».
  // A word replaced by the book's words found what they found.
  const typed = terms(question);
  const written = new Set(typed);
  return engine.index
    .search(query as Parameters<typeof engine.index.search>[0], searchOptions())
    .map((r) => ({
      id: String(r.id),
      score: r.score,
      near: lookAlikeOnly(r.terms, r.queryTerms),
      weak: fillerOnly(r.queryTerms),
      by: credited(
        r.queryTerms.filter((term) => written.has(term) && asWritten(term, r.terms)),
        book.credit,
      ),
      via: r.queryTerms.filter((term) => asWritten(term, r.terms)),
      on: r.terms.filter((found) => typed.some((term) => asWritten(term, [found]))),
    }));
}

/** The other words the search reads this one as — its synonyms —, as the index cuts them. */
export function aliasesOf(engine: Engine, word: string): string[] {
  return terms(expand(word, engine.meta.synonyms));
}

/** An element holding text — never markup: what a visitor typed is not parsed as HTML. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className !== undefined) node.className = className;
  return node;
}

/**
 * The link of a measure into the official page: the section anchor, with the text directive
 * next to it for the browsers that can land on the sentence (src/scripts/deep-links.ts).
 * Null when the identifier is not one this state of the book knows.
 *
 * `noreferrer`: the official site is not told that its visitor comes from this one — like
 * every link of the site that leaves it (scripts/check-build.test.ts).
 */
export function measureLink(meta: Meta, id: string, text?: string): HTMLAnchorElement | null {
  const entry = meta.items[id];
  const section = meta.sections[id.replace(/-[kmp]\d{2}(?:\.s\d+)?$/, '')];
  if (entry === undefined || section === undefined) return null;
  const [label, fragment] = entry;
  const link = el('a', text ?? label.toLowerCase());
  link.href = section[2];
  link.rel = 'noopener noreferrer';
  if (fragment !== '') link.dataset.fragment = fragment;
  return link;
}

/** What the page says of the first words it shows: of a key measure, of any other. */
export interface FirstWordsLabels {
  key: string;
  other: string;
}

/**
 * The first words of a measure, ready to stand next to its link (D16.32) — marked as words of
 * the programme, like every word of it a page shows. Null when there are none to show: the
 * measure has neither incipit nor locator, or the citation policy keeps locators in the links.
 */
export function firstWords(
  meta: Meta,
  id: string,
  display: LocatorDisplay,
  labels: FirstWordsLabels,
): HTMLElement | null {
  const entry = meta.items[id];
  const words = firstWordsOf(entry, display);
  if (entry === undefined || words === '') return null;
  const node = el('span', quoted(words), 'first-words');
  node.dataset.programme = 'incipit';
  node.title = entry[2] !== '' ? labels.key : labels.other;
  return node;
}

/** What the form says the citation policy allows (`data-first-words`): prudent when unsaid. */
export const displayOf = (form: HTMLElement): LocatorDisplay =>
  isLocatorDisplay(form.dataset.firstWords) ? form.dataset.firstWords : 'href';
