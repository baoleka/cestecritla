/**
 * What leaves the phone at each gesture of the chat (PLAN-CHAT §2) — decided here, purely, from
 * what the page's own search found, so that the page and its tests cannot disagree on it.
 *
 *   while typing        nothing
 *   « Demander »        identifiers: the measures the sheet is about to show, and nothing else
 *   an explanation      the question, the measures whose read sentence is on the screen, the
 *                       follow-up chosen, the version of the agreement — after the agreement
 *
 * These functions build requests; they send none. What they return goes through the strict
 * readers of the contract unchanged (scripts/chat-local.test.ts holds the two together).
 */
import {
  MAX_CHAT_IDS,
  MAX_GIST_IDS,
  cleanQuestion,
  type ChatRequest,
  type FollowUp,
  type GistsRequest,
} from './chat-contract.js';
import { tokenize } from './search-core.js';

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

export interface Asking {
  corpus: string;
  /** What was typed. It is sent as `cleanQuestion` leaves it, and shown in the thread the same. */
  question: string;
  /** The measures whose read sentence is on the screen, in the order shown. */
  shown: readonly string[];
  /** The version of the agreement accepted on this page; null when the visitor has not agreed. */
  consent: string | null;
  follow?: FollowUp | undefined;
}

/**
 * What an explanation sends — or null, and then nothing leaves: no agreement, nothing that is
 * a question, no read sentence on the screen to explain a word of.
 */
export function chatRequestOf(asking: Asking): ChatRequest | null {
  if (asking.consent === null) return null;
  const question = cleanQuestion(asking.question);
  const ids = [...new Set(asking.shown)].slice(0, MAX_CHAT_IDS);
  if (question === null || ids.length === 0) return null;
  const request: ChatRequest = { corpus: asking.corpus, ids, question, consent: asking.consent };
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
