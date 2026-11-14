/**
 * « En clair » — recognising, in a question, what we already wrote and re-read by hand: one of
 * the concept cards (data/2026/glossary.json), one of the fifteen objections
 * (data/2026/riposte.json). It is the first block of the sheet (PLAN-CHAT §1): shown at once,
 * without the network, without a model, without an agreement.
 *
 * Pure, and shared. The page runs it before anything is sent; the Worker runs it again on the
 * question it receives, to hand the model the card a visitor is already reading — so that the
 * explanation rests on our words, not on what the model remembers of a notion.
 *
 * The rule is narrow on purpose, like the one that recognises an objection (ask-reviewed.ts):
 * the question must hold the term itself — every word of it, in a row, in its order. « La règle
 * verte, c'est quoi ? » is recognised; « une énergie verte et une règle d'or » is not. Missing
 * a wording costs nothing: the read sentences still answer, and the card stays one tap away.
 * A wrong match would put a text about something else at the top of the sheet.
 */
import { reviewedFor, type ReviewedEntry } from './ask-reviewed.js';
import { sameWord, terms } from './search-core.js';

export interface NotionEntry {
  id: string;
  /** The term as the card writes it: « règle verte », « 6e République ». */
  term: string;
  /** Other ways of writing the same term, each recognised like the term itself. */
  aliases?: readonly string[];
}

/** How many cards one question may open: more would bury the read sentences. */
export const MAX_NOTIONS = 2;

/**
 * A letter or a digit as French writes them, spelled out: a pattern built on `\p{L}\p{N}` costs
 * about half a millisecond the first time it runs, and this file had eleven of them on the
 * path of every question (src/lib/ask-validate.ts says how it was measured).
 */
const WORD = '0-9A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u017F';
const EDGE_BEFORE = `(?<![${WORD}])`;
const EDGE_AFTER = `(?![${WORD}])`;

/** « sixième », « deuxième »: the rank a card writes « 6e », « 2e ». */
const ORDINAL_WORDS: readonly (readonly [RegExp, string])[] = (
  [
    ['deuxi[eè]me', '2e'],
    ['troisi[eè]me', '3e'],
    ['quatri[eè]me', '4e'],
    ['cinqui[eè]me', '5e'],
    ['sixi[eè]me', '6e'],
    ['septi[eè]me', '7e'],
    ['huiti[eè]me', '8e'],
    ['neuvi[eè]me', '9e'],
    ['dixi[eè]me', '10e'],
  ] as const
).map(([word, rank]) => [new RegExp(`${EDGE_BEFORE}${word}${EDGE_AFTER}`, 'giu'), rank]);

const ROMAN: Readonly<Record<string, string>> = {
  II: '2',
  III: '3',
  IV: '4',
  V: '5',
  VI: '6',
  VII: '7',
  VIII: '8',
  IX: '9',
  X: '10',
};
/** In capitals only: « VIe » is a rank, « vie » is a word. */
const ROMAN_RANK = new RegExp(
  `${EDGE_BEFORE}(VIII|VII|VI|IV|IX|III|II|V|X)(?:e|ème|eme)${EDGE_AFTER}`,
  'gu',
);
/** « 6ème », « 6eme », « 6ième »: one spelling, « 6e ». */
const DIGIT_RANK = new RegExp(`${EDGE_BEFORE}(\\d{1,2})(?:i?[eè]me|è|e)${EDGE_AFTER}`, 'giu');

/** One spelling of a rank, however it was typed. Nothing else is touched. */
export function foldRanks(text: string): string {
  let out = text
    .normalize('NFC')
    .replace(ROMAN_RANK, (_, roman: string) => `${ROMAN[roman] ?? roman}e`)
    .replace(DIGIT_RANK, '$1e');
  for (const [pattern, rank] of ORDINAL_WORDS) out = out.replace(pattern, rank);
  return out;
}

const wordsOf = (text: string): string[] => terms(foldRanks(text));

/** Where `needle` stands in a row in `hay`, each word matched as the same word; -1 when nowhere. */
function rowIn(hay: readonly string[], needle: readonly string[]): number {
  if (needle.length === 0) return -1;
  for (let start = 0; start + needle.length <= hay.length; start += 1) {
    if (needle.every((word, i) => sameWord(word, hay[start + i] ?? ''))) return start;
  }
  return -1;
}

/**
 * The cards whose term a question holds, in the order the question names them — `MAX_NOTIONS`
 * at most. A card is named once, however many times its term is written.
 */
export function notionsIn(question: string, entries: readonly NotionEntry[]): string[] {
  const asked = wordsOf(question);
  const found: { id: string; at: number }[] = [];
  for (const entry of entries) {
    const places = [entry.term, ...(entry.aliases ?? [])]
      .map((wording) => rowIn(asked, wordsOf(wording)))
      .filter((at) => at >= 0);
    if (places.length > 0) found.push({ id: entry.id, at: Math.min(...places) });
  }
  return found
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_NOTIONS)
    .map((entry) => entry.id);
}

/** What a question carries that a person already wrote about. */
export interface Recognised {
  /** The slug of the objection it carries, or null. */
  objection: string | null;
  /** The cards whose term it holds, in its order. */
  cards: string[];
}

/** Both recognitions, from the same question: an objection, and cards. */
export function recognise(
  question: string,
  known: { objections: readonly ReviewedEntry[]; cards: readonly NotionEntry[] },
): Recognised {
  return {
    objection: reviewedFor(question, known.objections),
    cards: notionsIn(question, known.cards),
  };
}

/** A card as it is handed to the model, or shown: its term and what we wrote of it. */
export interface KnownCard extends NotionEntry {
  plain: string;
}

/** An objection with the answer a person wrote. */
export interface KnownObjection extends ReviewedEntry {
  answer: string;
}

interface Reviewable {
  review: { status: string };
}

/**
 * What a person wrote AND re-read, out of the two editorial files (data/2026/glossary.json,
 * data/2026/riposte.json): nothing is recognised, shown as « relu par un humain » or handed to
 * a model before that (D0.27). The page and the Worker both come through here.
 */
export function knownOf(
  cards: readonly (Reviewable & KnownCard)[],
  objections: readonly (Reviewable & KnownObjection)[],
): { cards: KnownCard[]; objections: KnownObjection[] } {
  const reread = (entry: Reviewable): boolean => entry.review.status === 'reviewed';
  return {
    cards: cards.filter(reread).map(({ id, term, plain }) => ({ id, term, plain })),
    objections: objections
      .filter(reread)
      .map(({ slug, objection, answer }) => ({ slug, objection, answer })),
  };
}
