/**
 * What the sheet of « Demander » is built with (PLAN-CHAT §1) — computed at build time, from
 * public data and from the kit, and from nothing else:
 *
 *   - what the phone recognises a card or an objection by: its term, its wording;
 *   - the texts of « En clair » — ours, re-read by a person — as one static file, fetched with
 *     the sheet and never with the page;
 * The agreement and its version are in src/lib/chat-consent.ts, which the Worker reads too.
 */
import type { ReviewedEntry } from './ask-reviewed.ts';
import { cards, prose, ripostes } from './editorial.ts';
import { canonicalHash } from './fingerprint.ts';
import { knownOf, type NotionEntry } from './notions.ts';

/** `/data/clair-<fingerprint>.json`: the long texts, by the identifier the phone recognised. */
export interface ChatPlain {
  cards: Record<string, { plain: string }>;
  objections: Record<string, { answer: string }>;
}

export function chatPlain(): { data: ChatPlain; fingerprint: string } {
  const known = knownOf(cards(), ripostes());
  const data: ChatPlain = { cards: {}, objections: {} };
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
export function recognisable(): { objections: ReviewedEntry[]; cards: NotionEntry[] } {
  const known = knownOf(cards(), ripostes());
  return {
    objections: known.objections.map(({ slug, objection }) => ({
      slug,
      objection: prose(objection),
    })),
    cards: known.cards.map(({ id, term }) => ({ id, term })),
  };
}
