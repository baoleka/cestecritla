/**
 * The contract of the chat (D16.45 to D16.51, PLAN-CHAT §2 and §4) — what leaves the phone at
 * each of its two gestures, what the model is asked for, and what the Worker answers. One file,
 * four users: the Worker, the page, the bench and the tests. No DOM, no Node API, no Workers API.
 *
 * Two requests, two classes of privacy — and they never merge.
 *
 *   /api/gists   identifiers of measures, nothing else. It brings back the sentences the editor
 *                read, one per measure. No model runs, nothing typed leaves, no agreement is
 *                needed: it is what D16.22 already allowed.
 *   /api/chat    THE ONLY REQUEST OF THE SITE THAT CARRIES A SENTENCE (D16.46). It exists only
 *                after the visitor agreed, and `consent` says to which text they agreed: a
 *                request without it is not a request.
 *
 * What the shapes below guarantee, whoever writes the request.
 *
 * **No free text returns to the model from one turn to the next.** A chat request has no field
 * for a history, for a previous answer or for a role: a follow-up is one of two words
 * (`FOLLOW_UPS`), and the Worker rebuilds everything else from the identifiers. So what the
 * model wrote can never become what the model reads, and a visitor's earlier words are sent
 * once or not at all. A field the contract does not name makes the whole request unreadable —
 * refused, not dropped: a page that sends more than it says it sends must fail loudly.
 *
 * **No word of the programme leaves the Worker.** `GistsResponse` carries sentences of ours,
 * read by the editor; `ChatResponse` carries sentences of the model, about words. Neither has a
 * field for a text of the book — titles and links are resolved in the browser, from files that
 * are already public.
 *
 * `src/lib/ask-contract.ts` keeps its own promise: it has no field for a sentence and never
 * will. This file is the one place where one exists.
 */
import { MAX_QUESTION_CHARS, PROPOSITION_ID } from './ask-contract.js';

/** How many measures the page may ask the read sentences of: what a sheet shows, and a margin. */
export const MAX_GIST_IDS = 8;
/** How many measures an explanation may rest on: the three shown, and the two that follow. */
export const MAX_CHAT_IDS = 5;
/** A read sentence is one short sentence. This bounds the bytes; the editor's reading does the rest. */
export const MAX_GIST_CHARS = 300;
/** A question is a question: two characters at least, one line, what the field accepts at most. */
export const MIN_QUESTION_CHARS = 2;
/** An explanation is one to three sentences, each short, each standing on its own. */
export const MAX_EXPLAIN_SENTENCES = 3;
export const MIN_EXPLAIN_WORDS = 4;
export const MAX_EXPLAIN_WORDS = 28;
/** Generous: twenty-eight French words. The control counts the words; this bounds the bytes. */
export const MAX_EXPLAIN_CHARS = 320;
/**
 * Four words in a row of the question, standing in an explanation and in no sentence of ours:
 * the model is repeating what it was told to say (PLAN-CHAT §3). PROVISIONAL — fixed by
 * replaying the bench, like every threshold of the control.
 */
export const ECHO_WINDOW = 4;

/**
 * The two follow-ups, and all of them. A follow-up is a button, never a text: it asks for the
 * same explanation again — simpler, or with an example — from the read sentences, never from
 * the previous answer.
 */
export const FOLLOW_UPS = ['simpler', 'example'] as const;
export type FollowUp = (typeof FOLLOW_UPS)[number];

const CORPUS_VERSION = /^[0-9a-f]{16}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
/** The version of the text a visitor agreed to: `consentVersion()` below, and nothing else. */
const CONSENT = /^[0-9a-f]{16}$/;

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

// ---------------------------------------------------------------------------------------------
// The agreement
// ---------------------------------------------------------------------------------------------

/** FNV-1a over UTF-16 units, 32 bits, from a chosen start: a label, not a secret. */
function fnv1a(text: string, start: number): number {
  let hash = start;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The version of an agreement: a label of the very words a visitor read before accepting — the
 * line, its two buttons, the name of the model, in the order given. Computed, never typed: a
 * word changed in the agreement changes the version, so a page that still shows the old text
 * cannot send a question to a Worker built with the new one. It is not a secret and proves
 * nothing about anyone: nothing of an agreement is kept, here or elsewhere (D16.46).
 */
export function consentVersion(texts: readonly string[]): string {
  const whole = texts.map((text) => text.normalize('NFC')).join('\u001f');
  const hex = (n: number): string => n.toString(16).padStart(8, '0');
  return hex(fnv1a(whole, 0x811c9dc5)) + hex(fnv1a(whole, 0x9e3779b9));
}

// ---------------------------------------------------------------------------------------------
// The question
// ---------------------------------------------------------------------------------------------

const CONTROL = /\p{Cc}+/gu;
/** Joiners, soft hyphens, marks that turn a line round: written, not seen — and not sent. */
const FORMAT = /\p{Cf}+/gu;
/** Every space there is — no-break, thin, line and paragraph separators included. */
const SPACES = /\s+/gu;

/**
 * A question as it is sent, and as the thread shows it: composed, on one line, without a
 * character nobody sees. `null` when what is left is not a question — too short, or longer than
 * the field accepts. Nothing visible is changed: what the visitor reads in the thread is what
 * left, letter for letter.
 */
export function cleanQuestion(raw: string): string | null {
  const text = raw
    .normalize('NFC')
    .replace(CONTROL, ' ')
    .replace(FORMAT, '')
    .replace(SPACES, ' ')
    .trim();
  if (text.length < MIN_QUESTION_CHARS || text.length > MAX_QUESTION_CHARS) return null;
  return text;
}

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
 *             flag say so — and then the question does not leave the phone at all.
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
// /api/chat — the question, after the agreement
// ---------------------------------------------------------------------------------------------

/**
 * What the page sends when a visitor who agreed asks for an explanation, and all of it. There
 * is no history here and there never will be: see the head of this file.
 */
export interface ChatRequest {
  corpus: string;
  /** The measures whose read sentences are on the screen, in the order shown. */
  ids: string[];
  /** The question as written — `cleanQuestion` of what was typed, and exactly that. */
  question: string;
  /** Absent for a first explanation. */
  follow?: FollowUp;
  /** The version of the agreement the visitor accepted on this page (`consentVersion`). */
  consent: string;
}

const isFollowUp = (value: unknown): value is FollowUp =>
  typeof value === 'string' && (FOLLOW_UPS as readonly string[]).includes(value);

/**
 * Reads a chat request in the Worker. `null` is a request the page never sends: a field the
 * contract does not name (a history, a prompt, a role), a question that is not already clean, a
 * follow-up that is not one of the two, no agreement. Whether `consent` is the version this
 * Worker was built with is for the Worker to say (src/worker): the shape cannot know it.
 */
export function parseChatRequest(value: unknown): ChatRequest | null {
  if (!isRecord(value)) return null;
  if (!hasOnly(value, ['corpus', 'ids', 'question', 'follow', 'consent'])) return null;
  const { corpus, question, follow, consent } = value;
  if (typeof corpus !== 'string' || !CORPUS_VERSION.test(corpus)) return null;
  const ids = idList(value['ids'], MAX_CHAT_IDS);
  if (ids === null) return null;
  if (typeof question !== 'string' || cleanQuestion(question) !== question) return null;
  if (typeof consent !== 'string' || !CONSENT.test(consent)) return null;
  if (follow === undefined) return { corpus, ids, question, consent };
  return isFollowUp(follow) ? { corpus, ids, question, follow, consent } : null;
}

/**
 * Everything the Worker can say of an explanation. None of it is an error, and none of it says
 * that something failed: without an explanation the sheet already holds the two blocks that
 * matter.
 *
 *   explain   one to three sentences of the model, all through the control — about words of
 *             the read sentences, never about what the programme provides
 *   quiet     no explanation. `spent`: the allowance of the day is used up, or the model said
 *             so — the page stops sending questions for this visit. `none`: nothing to show
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
