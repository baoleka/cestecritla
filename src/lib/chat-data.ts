/**
 * What the sheet of « Demander » is built with (PLAN-CHAT §1) — computed at build time, from
 * public data and from the kit, and from nothing else:
 *
 *   - what the phone recognises a card or an objection by: its term, its wording;
 *   - the texts the sheet shows that are not sentences of the base, as one static file, fetched
 *     with the sheet and never with the page: those of « En clair » — ours — and what the
 *     sheet knows of words (src/lib/word-lists.ts).
 *
 * The explained words left this file on 19 November 2026 for three of their own
 * (src/lib/words-data.ts; PLAN-MOTS, lot 3): how they are found, at the first question; what
 * they mean and their examples, the first time one is opened.
 */
import type { ReviewedEntry } from './ask-reviewed.ts';
import { cards, prose, ripostes } from './editorial.ts';
import { canonicalHash } from './fingerprint.ts';
import { knownOf, type NotionEntry } from './notions.ts';
import type { WordLists } from './chat-local.ts';
import { wordLists } from './word-lists.ts';

/** A key measure, a measure or a sub-measure — not a paragraph of the book. */
const MEASURE = /-[km]\d{2}(?:\.s\d{1,2})?$/;

/** `/data/clair-<fingerprint>.json`: the long texts, by the identifier the phone recognised. */
export interface ChatPlain {
  cards: Record<string, { plain: string }>;
  objections: Record<string, { answer: string }>;
  /**
   * What the sheet knows of words (src/lib/word-lists.ts): the ordinary words a question is
   * made of, and the sensitive subjects — a word the search does not know and that is not one
   * of the first withholds our sentences, and so does one of the second that is not asked
   * alone (src/lib/chat-local.ts, `measuresFor`).
   */
  words: WordLists;
}

export function chatPlain(): { data: ChatPlain; fingerprint: string } {
  const known = knownOf(cards(), ripostes());
  const data: ChatPlain = { cards: {}, objections: {}, words: wordLists() };
  for (const card of known.cards) data.cards[card.id] = { plain: prose(card.plain) };
  for (const entry of known.objections) {
    data.objections[entry.slug] = { answer: prose(entry.answer) };
  }
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
