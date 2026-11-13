/**
 * The search engine of the page, loaded once and shared: the search uses it while one types,
 * and « Demander » uses it to name the measures an answer points at — and to show what the
 * page found by itself when no model answers.
 *
 * Two static files, fetched on the first sign that someone is going to search: the index
 * (stems, no sentence) and the titles. Nothing typed is ever sent to get them.
 */
import MiniSearch from 'minisearch';
import { askedOf, type Asked } from '../lib/ask-local.ts';
import {
  INDEX_OPTIONS,
  buildQuery,
  expand,
  groupBySection,
  searchOptions,
  type SearchDoc,
  type SectionHit,
  type SynonymGroup,
} from '../lib/search-core.ts';

/** /data/meta-<version>.json — built from the public manifest (src/pages/data/[name].json.ts). */
export interface Meta {
  /** Section id → [title, where ("Partie 2 · chapitre 2"), official URL]. */
  sections: Record<string, [string, string, string]>;
  /** Proposition id → [label ("Mesure clé", "Mesure 7.2"), text directive or "", incipit or ""]. */
  items: Record<string, [string, string, string]>;
  synonyms: SynonymGroup[];
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
    ready = true;
    return { index: MiniSearch.loadJS<SearchDoc>(serialised, INDEX_OPTIONS), meta };
  });
  pending.catch(() => {
    pending = undefined;
  });
  return pending;
}

/** The sections where a question is written, best first, each with its measures. */
export function findSections(engine: Engine, question: string, max: number): SectionHit[] {
  const query = buildQuery(question, expand(question, engine.meta.synonyms));
  const hits = engine.index
    .search(query as Parameters<typeof engine.index.search>[0], searchOptions())
    .map((r) => ({ id: String(r.id), score: r.score }));
  return groupBySection(hits).slice(0, max);
}

/**
 * What « Demander » sends for a question (D16.22) — never the question: the measures this
 * search finds for it, and the words of the book it matched (src/lib/ask-local.ts).
 */
export function findForAsk(engine: Engine, question: string): Asked {
  const query = buildQuery(question, expand(question, engine.meta.synonyms));
  const hits = engine.index
    .search(query as Parameters<typeof engine.index.search>[0], searchOptions())
    .map((r) => ({ id: String(r.id), score: r.score, terms: r.terms }));
  return askedOf(hits, Object.keys(engine.meta.items));
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
 */
export function measureLink(meta: Meta, id: string, text?: string): HTMLAnchorElement | null {
  const entry = meta.items[id];
  const section = meta.sections[id.replace(/-[kmp]\d{2}(?:\.s\d+)?$/, '')];
  if (entry === undefined || section === undefined) return null;
  const [label, fragment] = entry;
  const link = el('a', text ?? label.toLowerCase());
  link.href = section[2];
  link.rel = 'noopener';
  if (fragment !== '') link.dataset.fragment = fragment;
  return link;
}
