/**
 * Our own writing about the 2026 edition: the answers to objections and the concept cards
 * (data/2026/riposte.json, data/2026/glossary.json).
 *
 * Every sentence there is ours, and rests on propositions of the book cited by identifier and
 * pinned by hash. This module turns those identifiers into what a page shows: a link into the
 * official page for each support, and the whole text for the few that are quoted
 * (data/2026/quotes.json, written by the publisher from the private corpus).
 *
 * Nothing is published that the editor has not accepted (D0.27, amended by D16.79):
 * `review.status` travels with each entry, the page says which it is, and the launch gate
 * refuses a pending entry. THREE states, and the site never says more than the file does:
 *   pending   written, not accepted — not published
 *   accepted  the editor accepted its publication WITHOUT re-reading it line by line; the
 *             page says « prepared with an AI », names no reader (D16.79, 15/11/2026)
 *   reviewed  a person re-read it, and the page may name who (`by`)
 * Until 15/11/2026 the twenty entries said « reviewed » on dates written by default
 * (D16.34) — a re-reading that had not taken place (14-risques.md, R44).
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
  status: 'pending' | 'accepted' | 'reviewed';
  by: string | null;
  on: string | null;
}
/**
 * Where a study's figure comes from: a public document, named as it signs, dated, linked —
 * and the page in it, so that anyone can find the sentence (D21.1).
 */
export interface StudySource {
  /** Who published or said it: « Conseil d'analyse économique », « Camille Landais ». */
  by: string;
  /** What it is: « Focus n° 118 », « audition à l'Assemblée nationale ». */
  title: string;
  /** When: an ISO day, or an ISO month. */
  on: string;
  /** The public document. */
  url: string;
  /** Where in it: « p. 3 ». */
  where?: string;
}
/** One figure of a study, in our words. */
export interface Study {
  text: string;
  source: StudySource;
}
/**
 * « Ce que disent les études » (D21.1, 23/11/2026): a fourth voice, under the measures and never
 * under « Ce que dit le texte » (design/voice.md §0). Our sentence on what the figures say
 * together, the figures, and what their authors conclude. Each figure is held to the excerpt of
 * its document (eval/riposte-sources.json, scripts/editorial.test.ts), never to the book.
 */
export interface Studies {
  lead: string;
  items: Study[];
  close: string;
}
export interface Riposte {
  id: string;
  slug: string;
  theme: string;
  objection: string;
  answer: string;
  avoid: string;
  supports: Support[];
  /** Figures of public studies, in a block of their own (D21.1) — only where an answer needs them. */
  studies?: Studies;
  review: Review;
}

/** Every sentence of ours in a block of studies, in the order the page shows them. */
export const studyTexts = (studies: Studies): string[] => [
  studies.lead,
  ...studies.items.map((item) => item.text),
  studies.close,
];
export interface Card {
  id: string;
  term: string;
  plain: string;
  /** Why it matters — a short card has none (PLAN-MOTS, D20.5, D20.14). */
  why?: string;
  /** What is said against it, and our answer — optional since D20.14. */
  objection?: { text: string; answer: string };
  /** A short card: a device of the programme that one measure defines (D20.5). */
  short?: true;
  supports: Support[];
  related: string[];
  review: Review;
}

/** True when an entry may be shown: the editor accepted it, re-read or not. */
export const published = (review: { status: string }): boolean =>
  review.status === 'accepted' || review.status === 'reviewed';

/** A published JSON file. The caller names the shape it expects: the cast is visible there. */
function read(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export const ripostes = (): Riposte[] =>
  (read('data/2026/riposte.json') as { entries: Riposte[] }).entries;
export const cards = (): Card[] => (read('data/2026/glossary.json') as { entries: Card[] }).entries;

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
