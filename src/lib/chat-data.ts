/**
 * What the sheet of « Demander » is built with (PLAN-CHAT §1) — computed at build time, from
 * public data and from the kit, and from nothing else:
 *
 *   - what the phone recognises a card or an objection by: its term, its wording;
 *   - the texts the sheet shows that are not sentences of the base, as one static file, fetched
 *     with the sheet and never with the page: those of « En clair » — ours, re-read by a
 *     person — and the explained words (data/2026/terms.json) — written and checked by an AI,
 *     from general knowledge, and shown under a label that says so (D16.59, D16.60).
 */
import { readFileSync } from 'node:fs';
import type { ReviewedEntry } from './ask-reviewed.ts';
import { cards, prose, ripostes } from './editorial.ts';
import { canonicalHash } from './fingerprint.ts';
import { knownOf, notionsIn, type NotionEntry } from './notions.ts';
import { parseTerms, type TermEntry } from './terms.ts';
import type { WordLists } from './chat-local.ts';
import { wordLists } from './word-lists.ts';

/** A key measure, a measure or a sub-measure — not a paragraph of the book. */
const MEASURE = /-[km]\d{2}(?:\.s\d{1,2})?$/;

/** `/data/clair-<fingerprint>.json`: the long texts, by the identifier the phone recognised. */
export interface ChatPlain {
  cards: Record<string, { plain: string }>;
  objections: Record<string, { answer: string }>;
  /** The explained words: found on the phone in what is on the screen (src/lib/terms.ts). */
  terms: TermEntry[];
  /**
   * What the sheet knows of words (src/lib/word-lists.ts): the ordinary words a question is
   * made of, and the sensitive subjects — a word the search does not know and that is not one
   * of the first withholds our sentences, and so does one of the second that is not asked
   * alone (src/lib/chat-local.ts, `measuresFor`).
   */
  words: WordLists;
}

/**
 * The explained words, as the file holds them. A term that is also one of our cards is refused:
 * the card is what a person wrote and re-read, and it is the one the sheet shows.
 */
export function explainedTerms(): TermEntry[] {
  const entries = parseTerms(JSON.parse(readFileSync('data/2026/terms.json', 'utf8')));
  const known = cards().map(({ id, term }) => ({ id, term }));
  for (const entry of entries) {
    for (const wording of [entry.term, ...(entry.aliases ?? [])]) {
      if (notionsIn(wording, known).length > 0) {
        throw new Error(`data/2026/terms.json: « ${wording} » is one of our cards`);
      }
    }
  }
  return entries;
}

export function chatPlain(): { data: ChatPlain; fingerprint: string } {
  const known = knownOf(cards(), ripostes());
  const data: ChatPlain = { cards: {}, objections: {}, terms: [], words: wordLists() };
  for (const card of known.cards) data.cards[card.id] = { plain: prose(card.plain) };
  for (const entry of known.objections) {
    data.objections[entry.slug] = { answer: prose(entry.answer) };
  }
  // The term and its other wordings stay as typed: they are what the phone looks for.
  data.terms = explainedTerms().map((entry) => ({ ...entry, plain: prose(entry.plain) }));
  return { data, fingerprint: canonicalHash(data).slice(0, 16) };
}

/**
 * What a question is recognised by, on the phone: the terms of the cards, the wording of the
 * objections — and nothing longer. The Worker recognises with the same function, from the same
 * two files (src/lib/notions.ts, `knownOf`).
 */
export function recognisable(): {
  objections: (ReviewedEntry & { supports: string[] })[];
  cards: NotionEntry[];
} {
  const written = ripostes();
  const known = knownOf(cards(), written);
  return {
    objections: known.objections.map(({ slug, objection }) => ({
      slug,
      objection: prose(objection),
      // The measures the answer rests on, in its order — a paragraph of the book has no
      // sentence of ours, and is left to the page of the answer.
      supports: (written.find((entry) => entry.slug === slug)?.supports ?? [])
        .map((support) => support.id)
        .filter((id) => MEASURE.test(id)),
    })),
    cards: known.cards.map(({ id, term }) => ({ id, term })),
  };
}
