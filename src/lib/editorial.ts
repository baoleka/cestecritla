/**
 * Our own writing about the 2026 edition: the answers to objections and the concept cards
 * (data/2026/riposte.json, data/2026/glossary.json).
 *
 * Every sentence there is ours, and rests on propositions of the book cited by identifier and
 * pinned by hash. This module turns those identifiers into what a page shows: a link into the
 * official page for each support, and the whole text for the few that are quoted
 * (data/2026/quotes.json, written by the publisher from the private corpus).
 *
 * Nothing is published before a human has re-read it (D0.27): `review.status` travels with
 * each entry, the page says which it is, and the launch gate refuses a pending entry.
 */
import { readFileSync } from 'node:fs';
import {
  manifest,
  numberOf,
  quotes,
  type ManifestItem,
  type Quote,
  type Section,
} from './edition.ts';
import { t } from './strings.ts';

export interface Support {
  id: string;
  sha256: string;
  quote?: boolean;
}
export interface Review {
  status: 'pending' | 'reviewed';
  by: string | null;
  on: string | null;
}
export interface Riposte {
  id: string;
  slug: string;
  theme: string;
  objection: string;
  answer: string;
  avoid: string;
  supports: Support[];
  review: Review;
}
export interface Card {
  id: string;
  term: string;
  plain: string;
  why: string;
  objection: { text: string; answer: string };
  supports: Support[];
  related: string[];
  review: Review;
}

function read<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export const ripostes = (): Riposte[] =>
  read<{ entries: Riposte[] }>('data/2026/riposte.json').entries;
export const cards = (): Card[] => read<{ entries: Card[] }>('data/2026/glossary.json').entries;

/** Our own sentences are typed with straight apostrophes; the page shows typographic ones. */
export const prose = (text: string): string => text.replace(/'/g, '’');

export interface ResolvedSupport {
  section: Section;
  item: ManifestItem;
  /** "Mesure clé", "Mesure 7.2", or "Le texte de la section" for prose. */
  label: string;
  /** The whole proposition, when the entry quotes it. */
  quote: Quote | null;
}

/**
 * Looks every support up in the manifest. A support whose hash no longer matches stops the
 * build: the sentence it backed was written against another text.
 */
export function resolve(owner: string, supports: readonly Support[]): ResolvedSupport[] {
  const listed = new Map(quotes().quotes.map((q) => [q.id, q]));
  return supports.map((support) => {
    for (const section of manifest().sections) {
      const item = section.items.find((i) => i.id === support.id);
      if (item === undefined) continue;
      if (item.sha256 !== support.sha256) {
        throw new Error(`${owner}: ${support.id} changed since it was pinned`);
      }
      const n = numberOf(item);
      const label =
        item.kind === 'paragraph'
          ? t('support.prose')
          : n === null
            ? t('measure.key_label')
            : t('pointer.item', { n });
      const quote = support.quote === true ? (listed.get(support.id) ?? null) : null;
      if (support.quote === true && quote === null) {
        throw new Error(`${owner}: ${support.id} is quoted but absent from quotes.json`);
      }
      return { section, item, label, quote };
    }
    throw new Error(`${owner}: ${support.id} is not in the manifest`);
  });
}
