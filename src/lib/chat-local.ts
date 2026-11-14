/**
 * What leaves the phone at each gesture of the chat (PLAN-CHAT §2, D16.53) — decided here,
 * purely, from what the page's own search found, so that the page and its tests cannot disagree
 * on it.
 *
 *   while typing            nothing
 *   « Demander »            identifiers: the measures the sheet is about to show
 *   « Expliquer avec l'IA » those identifiers, the words of OUR read sentences that the
 *                           question uses, the cards of ours it names, the follow-up chosen
 *
 * THE QUESTION ITSELF NEVER LEAVES. It is cleaned here for the page's own use — to be searched,
 * and shown in the thread — and no request is ever built from it.
 *
 * These functions build requests; they send none. What they return goes through the strict
 * readers of the contract unchanged (scripts/chat-local.test.ts holds the two together).
 */
import { MAX_QUESTION_CHARS } from './ask-contract.js';
import {
  MAX_CHAT_CARDS,
  MAX_CHAT_IDS,
  MAX_GIST_IDS,
  type ChatRequest,
  type FollowUp,
  type GistsRequest,
} from './chat-contract.js';
import { MAX_CHAT_WORDS, sentenceWords } from './chat-words.js';
import { sameWord, terms, tokenize } from './search-core.js';

/** A question is a question: two characters at least, one line, what the field accepts at most. */
export const MIN_QUESTION_CHARS = 2;

/** Joiners, soft hyphens, marks that turn a line round, and what Unicode says to ignore. */
const UNSEEN = /[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]+/gu;
/** Every space there is — no-break, thin, line and paragraph separators included. */
const SPACES = /\s+/gu;

/**
 * A question as the page keeps it — to search with, and to show in the thread: composed, on one
 * line, without a character nobody sees. `null` when what is left is not a question — too
 * short, or longer than the field accepts. It goes nowhere: no request has a field for it
 * (src/lib/chat-contract.ts). What is not seen is taken out BEFORE the letters are composed,
 * so that cleaning twice changes nothing (security review of 14/11/2026).
 */
export function cleanQuestion(raw: string): string | null {
  const text = raw
    .replace(/\p{Cc}+/gu, ' ')
    .replace(UNSEEN, '')
    .normalize('NFC')
    .replace(SPACES, ' ')
    .trim();
  if (text.length < MIN_QUESTION_CHARS || text.length > MAX_QUESTION_CHARS) return null;
  return text;
}

/** How many measures the sheet shows for a question: three sentences at most (PLAN-CHAT §1). */
export const SHOWN_MEASURES = 3;

/** A result of the page's search: a proposition and its score. */
export interface Ranked {
  id: string;
  score: number;
}

/**
 * The measures a question is answered with: the three the search ranks best, whatever their
 * section — best first, each once, and only those the page can name and link.
 *
 * PROBABLE, measured on 14/11/2026 on the 132 questions of the dossier that say which sections
 * are expected (0 neuron, public index, eval/ask-2026.json): 239 of 396 rows land in an expected
 * section, against 159 of 394 when the sheet takes one measure from each of the three best
 * sections — for two questions fewer with at least one row there (121 against 123). A reader
 * who asks what the programme provides for rents wants the measures on rents, not a tour.
 */
export function rowsOf(hits: readonly Ranked[], knows: (id: string) => boolean): string[] {
  const ranked = hits
    .map((hit, at) => ({ ...hit, at }))
    .sort((a, b) => b.score - a.score || a.at - b.at);
  const rows: string[] = [];
  for (const hit of ranked) {
    if (rows.length === SHOWN_MEASURES) break;
    if (knows(hit.id) && !rows.includes(hit.id)) rows.push(hit.id);
  }
  return rows;
}

/** What « Demander » sends: the measures about to be shown. Null when there is none: nothing is sent. */
export function gistsRequestOf(corpus: string, rows: readonly string[]): GistsRequest | null {
  const ids = [...new Set(rows)].slice(0, MAX_GIST_IDS);
  return ids.length === 0 ? null : { corpus, ids };
}

/**
 * The words of our sentences that a question uses — what the page sends in place of the
 * question: in the order the question names them, each once, `MAX_CHAT_WORDS` at most. Empty
 * when it uses none: the model then explains the hardest words by itself.
 */
export function askedWords(question: string, shown: readonly string[]): string[] {
  const words = sentenceWords(shown);
  const out: string[] = [];
  for (const asked of terms(question)) {
    if (out.length === MAX_CHAT_WORDS) break;
    const found = words.find((word) => sameWord(asked, word.term));
    if (found !== undefined && !out.includes(found.term)) out.push(found.term);
  }
  return out;
}

export interface Asking {
  corpus: string;
  /** What was typed. It is read here, to find which of our words it uses — and sent nowhere. */
  question: string;
  /** The read sentences on the screen, in the order shown. */
  shown: readonly { id: string; text: string }[];
  /** The cards of ours the question names, as the page recognised them. */
  cards: readonly string[];
  follow?: FollowUp | undefined;
}

/**
 * What « Expliquer avec l'IA » sends — or null, and then nothing leaves: no read sentence on
 * the screen to explain a word of. The question is not in it: only the words of our own
 * sentences that it uses.
 */
export function chatRequestOf(asking: Asking): ChatRequest | null {
  const shown = asking.shown.slice(0, MAX_CHAT_IDS);
  const ids = [...new Set(shown.map((gist) => gist.id))];
  if (ids.length === 0) return null;
  const request: ChatRequest = {
    corpus: asking.corpus,
    ids,
    words: askedWords(
      asking.question,
      shown.map((gist) => gist.text),
    ),
    cards: [...new Set(asking.cards)].slice(0, MAX_CHAT_CARDS),
  };
  return asking.follow === undefined ? request : { ...request, follow: asking.follow };
}

/**
 * Asking whom to vote for, or who will win: the one kind of question the sheet answers by
 * itself with « Ici, on ne parle que du programme. » — no measure shown, nothing sent, whatever
 * the search would have found for the word « vote ». Narrow on purpose: « le droit de vote à
 * 16 ans » is a question about the programme.
 */
const VOTE_ADVICE: readonly RegExp[] = [
  // « pour qui voter », « pour qui je dois voter », « tu votes pour qui »
  /\b(?:pour|contre) qui (?:[a-z]+ ){0,3}vot(?:er|e|es|ons|ez)\b/,
  /\bvot(?:er|e|es|ons|ez) (?:pour|contre) qui\b/,
  // « je dois voter… », « dois-je voter… », « faut-il voter… »
  /\b(?:je|on|tu) (?:dois|doit|devrais|devrait|vais|va) voter\b/,
  /\b(?:dois|doit|devrais|devrait) (?:je|on) voter\b/,
  /\bfaut il voter\b/,
  // a forecast, a poll
  /\bqui va (?:gagner|remporter|perdre)\b/,
  /\bpronostics?\b/,
  /\b(?:consignes?|intentions?) de vote\b/,
];

/** True when the question asks for voting advice or a forecast: it is answered on the phone. */
export function asksForVote(question: string): boolean {
  const folded = tokenize(question).join(' ');
  return VOTE_ADVICE.some((pattern) => pattern.test(folded));
}
