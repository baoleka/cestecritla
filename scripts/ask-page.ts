/**
 * What the page does at the gesture « Demander », in Node — for the bench and for the tests.
 *
 * The page searches by itself, and what it sends is what its search found. Whoever wants to
 * ask what the page would ask has to search as the page does: the same public index, the same
 * synonyms, the same options, the same functions. Only public files are read: this runs
 * anywhere, CI included.
 *
 *   rows    what the sheet of the chat shows and names to `/api/gists` (src/lib/chat-local.ts):
 *           the three measures the search ranks best;
 *   asked   what the bench of the written answer names to `/api/bench` (src/lib/ask-local.ts):
 *           measures and words of the book — the request of D16.22, kept for the bench;
 *   own     one measure per best section: what the page of D16.22 showed by itself.
 */
import { readFileSync } from 'node:fs';
import MiniSearch from 'minisearch';
import { MAX_SELECTED } from '../src/lib/ask-contract.js';
import { askedOf, type Asked } from '../src/lib/ask-local.js';
import { measuresFor, rowsOf, type Found } from '../src/lib/chat-local.js';
import {
  INDEX_OPTIONS,
  asWritten,
  buildQuery,
  expand,
  fillerOnly,
  groupBySection,
  lookAlikeOnly,
  searchOptions,
  terms,
  type SearchDoc,
  type SynonymGroup,
} from '../src/lib/search-core.js';
import type { Manifest } from './aec26-types.js';

export interface PageAsk {
  /** The measures the sheet shows, best first. Empty: nothing is sent, « rien trouvé ». */
  rows: string[];
  /**
   * How the sheet shows them when no objection of ours is recognised: with our sentences, or
   * as links — a question that names someone, or holds a word the search does not know.
   */
  shown: Found;
  /** What the bench sends for a written answer. */
  asked: Asked;
  /** What the page shows by itself when no model answers: one measure per best section. */
  own: string[];
}

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

export function loadPage(): (question: string) => PageAsk {
  const file = json('data/2026/search-index.json') as { index: unknown };
  const index = MiniSearch.loadJS<SearchDoc>(
    file.index as Parameters<typeof MiniSearch.loadJS>[0],
    INDEX_OPTIONS,
  );
  const groups = (json('data/2026/synonyms.json') as { groups: SynonymGroup[] }).groups;
  // The ordinary words a question is made of, as the index cuts them (src/lib/chat-data.ts).
  const ordinary = new Set(
    (json('data/2026/ordinary.json') as { words: string[] }).words.flatMap((word) => terms(word)),
  );
  // The order of the book, as the titles file of the page lists it: propositions only.
  const manifest = json('data/2026/manifest.json') as Manifest;
  const order = manifest.sections.flatMap((section) =>
    section.items.filter((item) => item.kind !== 'paragraph').map((item) => item.id),
  );
  return (question) => {
    const query = buildQuery(question, expand(question, groups));
    const typed = new Set(terms(question));
    const hits = index
      .search(query as Parameters<typeof index.search>[0], searchOptions())
      .map((r) => ({
        id: String(r.id),
        score: r.score,
        terms: r.terms,
        near: lookAlikeOnly(r.terms, r.queryTerms),
        weak: fillerOnly(r.queryTerms),
        by: r.queryTerms.filter((term) => typed.has(term) && asWritten(term, r.terms)),
      }));
    const known = new Set(order);
    return {
      rows: rowsOf(hits, (id) => known.has(id)),
      shown: measuresFor(
        question,
        [],
        hits,
        (id) => known.has(id),
        (word, term) => expand(word, groups) !== '' || ordinary.has(term),
      ),
      asked: askedOf(hits, order),
      own: groupBySection(hits)
        .slice(0, MAX_SELECTED)
        .flatMap((section) => section.items.slice(0, 1)),
    };
  };
}
