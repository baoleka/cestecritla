/**
 * What the sheet of « Demander » is built with (PLAN-CHAT §1) — computed at build time, from
 * public data and from the kit, and from nothing else:
 *
 *   - what the phone recognises a card or an objection by: its term, its wording;
 *   - the texts of « En clair » — ours, re-read by a person — as one static file, fetched with
 *     the sheet and never with the page;
 *   - the agreement, line by line as a visitor reads it, and the version those very words give
 *     (src/lib/chat-contract.ts): the Worker builds the same lines from the same kit, so a page
 *     that words the agreement otherwise cannot send a question.
 */
import type { ReviewedEntry } from './ask-reviewed.ts';
import { consentVersion } from './chat-contract.ts';
import { cards, prose, ripostes } from './editorial.ts';
import { canonicalHash } from './fingerprint.ts';
import type { NotionEntry } from './notions.ts';
import { t, type StringKey } from './strings.ts';

/** `/data/clair-<fingerprint>.json`: the long texts, by the identifier the phone recognised. */
export interface ChatPlain {
  cards: Record<string, { plain: string }>;
  objections: Record<string, { answer: string }>;
}

/** Only what a person re-read is shown as « Relu par un humain » (D0.27). */
const reviewed = <T extends { review: { status: string } }>(entries: readonly T[]): T[] =>
  entries.filter((entry) => entry.review.status === 'reviewed');

export function chatPlain(): { data: ChatPlain; fingerprint: string } {
  const data: ChatPlain = { cards: {}, objections: {} };
  for (const card of reviewed(cards())) data.cards[card.id] = { plain: prose(card.plain) };
  for (const entry of reviewed(ripostes())) {
    data.objections[entry.slug] = { answer: prose(entry.answer) };
  }
  return { data, fingerprint: canonicalHash(data).slice(0, 16) };
}

/** What a question is recognised by, on the phone — and by the Worker, from the same data. */
export function recognisable(): { objections: ReviewedEntry[]; cards: NotionEntry[] } {
  return {
    objections: reviewed(ripostes()).map(({ slug, objection }) => ({
      slug,
      objection: prose(objection),
    })),
    cards: reviewed(cards()).map(({ id, term }) => ({ id, term })),
  };
}

/**
 * The agreement, in the order it is read (PLAN-CHAT §1): what a model could do, what leaves,
 * who reads it, what is kept, what not to write, from what age, for how long, who answers for
 * it — then the two buttons. The component renders these keys in this order and no other text;
 * the version is computed on exactly these lines.
 */
export const CONSENT_LINES: readonly StringKey[] = [
  'chat.consent.title',
  'chat.consent.what',
  'chat.consent.who',
  'chat.consent.kept',
  'chat.consent.self',
  'chat.consent.age',
  'chat.consent.scope',
  'chat.consent.controller',
];
export const CONSENT_BUTTONS: readonly StringKey[] = [
  'chat.consent.accept',
  'chat.consent.decline',
];

/** The agreement as rendered for this model: its lines, then its buttons. */
export function consentTexts(model: string): string[] {
  return [...CONSENT_LINES, ...CONSENT_BUTTONS].map((key) => t(key, { model }));
}

/** The version a chat request must carry to be read (D16.46). */
export const consentOf = (model: string): string => consentVersion(consentTexts(model));
