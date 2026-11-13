/**
 * What the page does at the gesture « Demander », in Node — for the bench and for the tests.
 *
 * Since D16.22 the question never leaves the phone: the page searches, and sends the measures
 * its search found and the words of the book it matched (src/lib/ask-local.ts). Whoever wants
 * to ask what the page would ask — the bench, which must measure the production path — has to
 * search as the page does: the same public index, the same synonyms, the same options, the
 * same function. Only public files are read: this runs anywhere, CI included.
 */
import { readFileSync } from 'node:fs';
import MiniSearch from 'minisearch';
import { MAX_SELECTED } from '../src/lib/ask-contract.js';
import { askedOf, type Asked } from '../src/lib/ask-local.js';
import {
  INDEX_OPTIONS,
  buildQuery,
  expand,
  groupBySection,
  searchOptions,
  type SearchDoc,
  type SynonymGroup,
} from '../src/lib/search-core.js';
import type { Manifest } from './aec26-types.js';

export interface PageAsk {
  /** What leaves the phone. `ids` empty: nothing is sent, the page says « rien trouvé ». */
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
  // The order of the book, as the titles file of the page lists it: propositions only.
  const manifest = json('data/2026/manifest.json') as Manifest;
  const order = manifest.sections.flatMap((section) =>
    section.items.filter((item) => item.kind !== 'paragraph').map((item) => item.id),
  );
  return (question) => {
    const query = buildQuery(question, expand(question, groups));
    const hits = index
      .search(query as Parameters<typeof index.search>[0], searchOptions())
      .map((r) => ({ id: String(r.id), score: r.score, terms: r.terms }));
    return {
      asked: askedOf(hits, order),
      own: groupBySection(hits)
        .slice(0, MAX_SELECTED)
        .flatMap((section) => section.items.slice(0, 1)),
    };
  };
}
