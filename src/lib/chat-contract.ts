/**
 * The contract of the chat (D16.45 to D16.53, PLAN-CHAT §2 and §4) — what leaves the phone at
 * each of its two gestures, what the model is asked for, and what the Worker answers. One file,
 * four users: the Worker, the page, the bench and the tests. No DOM, no Node API, no Workers API.
 *
 * **NO REQUEST OF THE SITE CARRIES A SENTENCE** (D16.53, which restores D16.22 without
 * exception). What a visitor types never leaves the phone.
 *
 *   /api/gists   identifiers of measures, nothing else. It brings back the sentences the editor
 *                read, one per measure. No model runs.
 *   /api/chat    the same identifiers, and — in place of the question — the words of OUR OWN
 *                sentences that the question uses (src/lib/chat-words.ts), the identifiers of
 *                our cards it names, and the follow-up chosen. Every field is a value the
 *                Worker can check against what it holds; none is a text.
 *
 * It was otherwise for one day: on 14/11/2026 the question was to leave after an agreement
 * (D16.46). A security review showed, the same day, that a question can carry an instruction
 * the model follows and the control does not catch — and that the model had no use for the
 * question beyond knowing WHICH words to explain. So the question stays, and a request that
 * names one is unreadable.
 *
 * What the shapes below guarantee, whoever writes the request.
 *
 * **No free text reaches the model, from the visitor or from a previous turn.** A chat request
 * has no field for a question, a history, a previous answer or a role: a follow-up is one of
 * two words (`FOLLOW_UPS`), a word is a term of our sentences, and the Worker rebuilds
 * everything else from the identifiers. A field the contract does not name makes the whole
 * request unreadable — refused, not dropped: a page that sends more than it says it sends must
 * fail loudly.
 *
 * **No word of the programme leaves the Worker.** `GistsResponse` carries sentences of ours,
 * read by the editor; `ChatResponse` carries sentences of the model, about words. Neither has a
 * field for a text of the book — titles and links are resolved in the browser, from files that
 * are already public.
 */
import { PROPOSITION_ID } from './ask-contract.js';

/**
 * How many measures one request may ask the sentences of: what a sheet shows (`SHOWN_MEASURES`,
 * src/lib/chat-local.ts) and not one more. It was eight, « and a margin »: the page never used
 * the margin, and whoever copies the sentences by script did — a third as many requests for the
 * whole set (security review of 15/11/2026). The limiter does not protect the sentences
 * (`14-risques.md` R35); this only makes copying them cost what reading them costs.
 */
export const MAX_GIST_IDS = 3;
/** How many measures an explanation may rest on: the three shown, and the two that follow. */
export const MAX_CHAT_IDS = 5;
/** A read sentence is one short sentence. This bounds the bytes; the editor's reading does the rest. */
export const MAX_GIST_CHARS = 300;
/** How many words an explanation may be asked about, and how many of our cards may go with it. */
export const MAX_CHAT_WORDS = 3;
export const MAX_CHAT_CARDS = 2;
/** An explanation is one to three sentences, each short, each standing on its own. */
export const MAX_EXPLAIN_SENTENCES = 3;
export const MIN_EXPLAIN_WORDS = 4;
export const MAX_EXPLAIN_WORDS = 28;
/** Generous: twenty-eight French words. The control counts the words; this bounds the bytes. */
export const MAX_EXPLAIN_CHARS = 320;
/**
 * The two follow-ups, and all of them. A follow-up is a button, never a text: it asks for the
 * same explanation again — simpler, or with an example — from the read sentences, never from
 * the previous answer.
 */
export const FOLLOW_UPS = ['simpler', 'example'] as const;
export type FollowUp = (typeof FOLLOW_UPS)[number];

const CORPUS_VERSION = /^[0-9a-f]{16}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
/** A word of one of our sentences, as the index writes it (src/lib/search-core.ts, `terms`). */
const WORD = /^[a-z0-9]{2,40}$/;
/** The identifier of one of our cards (data/2026/glossary.json). */
const CARD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** True when the object has no key outside these: an unnamed field is a refused request. */
const hasOnly = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).every((key) => keys.includes(key));

const idList = (value: unknown, max: number): string[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) return null;
  const ids: string[] = [];
  for (const id of value) {
    if (typeof id !== 'string' || !PROPOSITION_ID.test(id) || ids.includes(id)) return null;
    ids.push(id);
  }
  return ids;
};

/** A short list of values of one shape, each once. Null as soon as one is not. */
const valueList = (value: unknown, shape: RegExp, max: number): string[] | null => {
  if (!Array.isArray(value) || value.length > max) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length > 40 || !shape.test(item) || out.includes(item)) {
      return null;
    }
    out.push(item);
  }
  return out;
};

// ---------------------------------------------------------------------------------------------
// /api/gists — identifiers out, read sentences back
// ---------------------------------------------------------------------------------------------

/** What the page sends at the gesture « Demander », and all of it. */
export interface GistsRequest {
  /** The state of the book the page shows. */
  corpus: string;
  /** The measures its own search found, best first. */
  ids: string[];
}

/** Reads a request in the Worker. `null` is a request the page never sends. */
export function parseGistsRequest(value: unknown): GistsRequest | null {
  if (!isRecord(value) || !hasOnly(value, ['corpus', 'ids'])) return null;
  const { corpus } = value;
  if (typeof corpus !== 'string' || !CORPUS_VERSION.test(corpus)) return null;
  const ids = idList(value['ids'], MAX_GIST_IDS);
  return ids === null ? null : { corpus, ids };
}

/** A sentence of ours about one measure, read by the editor before it was served (D16.49). */
export interface Gist {
  id: string;
  text: string;
}

/**
 * Everything the Worker can say of read sentences. None of it is an error.
 *
 *   gists     the sentences the base holds for these measures — fewer than asked, or none: a
 *             measure without a read sentence keeps its link alone, and that is a verdict of
 *             the editor, not a gap. `ai` says whether an explanation may be asked for now:
 *             false when the mode, the electoral silence, the allowance of the day or the stop
 *             flag say so — and then the page does not even offer one.
 *   silence   electoral silence: questions reopen at `reopen` (ISO 8601, UTC)
 *   local     nothing from the base this time — closed, or built for another state of the
 *             book. The page shows what its own search found, and says nothing of why.
 */
export type GistsResponse =
  | { kind: 'gists'; corpus: string; gists: Gist[]; ai: boolean }
  | { kind: 'silence'; reopen: string }
  | { kind: 'local' };

/** Control and format characters, line and paragraph separators: what a line of ours never holds. */
const UNSEEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

/** One line of text of ours, bounded: no line break, no character that is not seen. */
const oneLine = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) return null;
  return UNSEEN.test(value) ? null : value;
};

/**
 * Reads an answer of `/api/gists` in the browser — strictly, like every answer of the Worker:
 * a response that is not exactly one of the shapes above is no response, and the page keeps
 * what it found by itself. Unknown fields are dropped, not carried.
 */
export function parseGistsResponse(value: unknown): GistsResponse | null {
  if (!isRecord(value)) return null;
  switch (value['kind']) {
    case 'gists': {
      const { corpus, gists, ai } = value;
      if (typeof corpus !== 'string' || !CORPUS_VERSION.test(corpus)) return null;
      if (typeof ai !== 'boolean') return null;
      if (!Array.isArray(gists) || gists.length > MAX_GIST_IDS) return null;
      const out: Gist[] = [];
      for (const gist of gists) {
        if (!isRecord(gist)) return null;
        const id = gist['id'];
        const text = oneLine(gist['text'], MAX_GIST_CHARS);
        if (typeof id !== 'string' || !PROPOSITION_ID.test(id) || text === null) return null;
        if (out.some((held) => held.id === id)) return null;
        out.push({ id, text });
      }
      return { kind: 'gists', corpus, gists: out, ai };
    }
    case 'silence': {
      const { reopen } = value;
      if (typeof reopen !== 'string' || !ISO_INSTANT.test(reopen)) return null;
      return { kind: 'silence', reopen };
    }
    case 'local':
      return { kind: 'local' };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------
// /api/chat — which words to explain, never the question
// ---------------------------------------------------------------------------------------------

/**
 * What the page sends when a visitor asks the AI to explain, and all of it. There is no
 * question here, no history, and there never will be: see the head of this file.
 */
export interface ChatRequest {
  corpus: string;
  /** The measures whose read sentences are on the screen, in the order shown. */
  ids: string[];
  /**
   * The words of those sentences that the question uses — terms of OUR sentences, as the index
   * writes them (`askedWords`, src/lib/chat-words.ts). Empty when it uses none.
   */
  words: string[];
  /** The cards of ours the question names (`notionsIn`, src/lib/notions.ts). */
  cards: string[];
  /** Absent for a first explanation. */
  follow?: FollowUp;
}

const isFollowUp = (value: unknown): value is FollowUp =>
  typeof value === 'string' && (FOLLOW_UPS as readonly string[]).includes(value);

/**
 * Reads a chat request in the Worker. `null` is a request the page never sends: a field the
 * contract does not name — a question, an agreement, a history, a prompt, a role —, a word
 * that is not written as the index writes one, a card that is no identifier, a follow-up that
 * is not one of the two. Whether each word is a word of the sentences named, and each card one
 * of ours, is for the Worker to say (src/worker/chat.ts): the shape cannot know it.
 */
export function parseChatRequest(value: unknown): ChatRequest | null {
  if (!isRecord(value)) return null;
  if (!hasOnly(value, ['corpus', 'ids', 'words', 'cards', 'follow'])) return null;
  const { corpus, follow } = value;
  if (typeof corpus !== 'string' || !CORPUS_VERSION.test(corpus)) return null;
  const ids = idList(value['ids'], MAX_CHAT_IDS);
  const words = valueList(value['words'], WORD, MAX_CHAT_WORDS);
  const cards = valueList(value['cards'], CARD_ID, MAX_CHAT_CARDS);
  if (ids === null || words === null || cards === null) return null;
  if (follow === undefined) return { corpus, ids, words, cards };
  return isFollowUp(follow) ? { corpus, ids, words, cards, follow } : null;
}

/**
 * Everything the Worker can say of an explanation. None of it is an error, and none of it says
 * that something failed: without an explanation the sheet already holds the two blocks that
 * matter.
 *
 *   explain   one to three sentences of the model, all through the control — about words of
 *             the read sentences, never about what the programme provides
 *   quiet     no explanation. `spent`: the allowance of the day is used up, or the model said
 *             so — the page stops asking for this visit. `none`: nothing to show
 *             this time — the control refused a sentence, the model wrote nothing or too late.
 *   silence   electoral silence: questions reopen at `reopen`
 */
export type ChatResponse =
  | { kind: 'explain'; corpus: string; sentences: string[] }
  | { kind: 'quiet'; why: 'spent' | 'none' }
  | { kind: 'silence'; reopen: string };

/** Reads an answer of `/api/chat` in the browser, strictly. Unknown fields are dropped. */
export function parseChatResponse(value: unknown): ChatResponse | null {
  if (!isRecord(value)) return null;
  switch (value['kind']) {
    case 'explain': {
      const { corpus, sentences } = value;
      if (typeof corpus !== 'string' || !CORPUS_VERSION.test(corpus)) return null;
      if (!Array.isArray(sentences) || sentences.length === 0) return null;
      if (sentences.length > MAX_EXPLAIN_SENTENCES) return null;
      const out: string[] = [];
      for (const sentence of sentences) {
        const text = oneLine(sentence, MAX_EXPLAIN_CHARS);
        if (text === null) return null;
        out.push(text);
      }
      return { kind: 'explain', corpus, sentences: out };
    }
    case 'quiet': {
      const { why } = value;
      return why === 'spent' || why === 'none' ? { kind: 'quiet', why } : null;
    }
    case 'silence': {
      const { reopen } = value;
      if (typeof reopen !== 'string' || !ISO_INSTANT.test(reopen)) return null;
      return { kind: 'silence', reopen };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------
// What the model is asked for
// ---------------------------------------------------------------------------------------------

/**
 * One to three sentences, and no identifier: an explanation is about words, it rests on no
 * measure and may attribute nothing to one. No sentence at all is an answer too — there was no
 * word to explain. French key: the model reads it.
 */
export interface ModelExplanation {
  phrases: string[];
}

/** The JSON schema the model's output is constrained by (Workers AI `response_format`). */
export const MODEL_EXPLAIN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    phrases: { type: 'array', maxItems: MAX_EXPLAIN_SENTENCES, items: { type: 'string' } },
  },
  required: ['phrases'],
} as const;

/**
 * The model's explanation as an object — or null when it is not the shape it was asked for. A
 * string is read as JSON, with or without a code fence around it; anything else is refused
 * rather than repaired, and a key the schema does not name is a shape that was not asked for.
 */
export function parseModelExplanation(raw: unknown): ModelExplanation | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    const text = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    try {
      value = JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  }
  if (!isRecord(value) || !hasOnly(value, ['phrases'])) return null;
  const { phrases } = value;
  if (!Array.isArray(phrases)) return null;
  if (!phrases.every((phrase): phrase is string => typeof phrase === 'string')) return null;
  return { phrases: [...phrases] };
}
