/**
 * The contract of « Demander » (D16.2 to D16.8, D16.22) — what leaves the phone, what the model
 * is asked for, and what `/api/ask` answers. One file, four users: the Worker, the page, the
 * bench and the tests. No import, no DOM, no Node API, no Workers API.
 *
 * Two rules everything here serves.
 *
 * **The sentence never leaves the phone** (D16.22). A question on a political programme can
 * say an opinion, a job, an illness: the editor wanted article 9 of the GDPR respected without
 * having to ask for a consent, and the one way to be sure of what is not processed is not to
 * receive it. So `AskRequest` has no field for a sentence. The page searches by itself, as it
 * always did, and sends what the search found: identifiers of measures, and the words of the
 * BOOK its search matched — stems of the public index, without order. The model then says what
 * those measures provide; it does not know what was asked. Nothing a visitor writes of
 * themselves can leave, and no instruction hidden in a question can reach the model.
 *
 * **No word of the programme leaves the Worker.** The model reads the text of the measures it
 * is named; what comes back to the browser is sentences of ours and identifiers, and nothing
 * else. No field of `AskResponse` can hold a text of the book — the titles, the numbers and the
 * links are resolved in the browser, from files already public.
 */

/** What the field accepts: more is a paste, not a question. It bounds the local search only. */
export const MAX_QUESTION_CHARS = 300;
/** How many measures a request may name, and how many words of the book may go with them. */
export const MAX_ASKED_IDS = 24;
export const MAX_ASKED_TERMS = 12;
/** A stem of the public index, as src/lib/search-core.ts cuts it: folded, lower case, one word. */
export const ASKED_TERM = /^[a-z0-9]{2,32}$/;
/** An answer is one to three sentences, each of one to two measures, each short. */
export const MAX_SENTENCES = 3;
export const MAX_WORDS_PER_SENTENCE = 35;
export const MAX_IDS_PER_SENTENCE = 2;
/** A selection — the model chose and wrote nothing, or was not allowed to — is three measures. */
export const MAX_SELECTED = 3;
/** Six words in a row taken from the book are a copy, not a sentence of ours (D16.5). */
export const COPY_WINDOW = 6;

/**
 * The ladder of D16.4, as data (data/2026/ask.json): a written answer if the bench passed its
 * eight gates, a selection if the model at least selects better than the search ranks, nothing
 * at all otherwise — and then no Worker, no model and no AI notice exist on the page.
 */
export type AskMode = 'answer' | 'select' | 'off';

/** `p4c7-s03-k01`, `p4c7-s03-m12`, `p4c7-s03-m12.s2`: a proposition of the 2026 edition. */
export const PROPOSITION_ID = /^p\dc\d{1,2}-s\d{2}-[km]\d{2}(?:\.s\d{1,2})?$/;

// ---------------------------------------------------------------------------------------------
// What the model is asked for
// ---------------------------------------------------------------------------------------------

/** One sentence of the model and the measures it rests on. French keys: the model reads them. */
export interface ModelSentence {
  texte: string;
  ids: string[];
}

/**
 * No sentence at all is an answer too: none of the measures holds the words that came with
 * them. (There used to be a `hors_programme` flag, for a message that was not a question about
 * the programme. The model no longer reads a message: it has nothing to judge off the subject.)
 */
export interface ModelAnswer {
  phrases: ModelSentence[];
}

/** The JSON schema the model's output is constrained by (Workers AI `response_format`). */
export const MODEL_ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    phrases: {
      type: 'array',
      maxItems: MAX_SENTENCES,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          texte: { type: 'string' },
          ids: {
            type: 'array',
            minItems: 1,
            maxItems: MAX_IDS_PER_SENTENCE,
            items: { type: 'string' },
          },
        },
        required: ['texte', 'ids'],
      },
    },
  },
  required: ['phrases'],
} as const;

/**
 * The second rung of the ladder (mode "select"): the model chooses up to three measures and
 * writes nothing. Used only if the bench refuses the writing and shows that the model's choice
 * beats the order of the search.
 */
export interface ModelSelection {
  ids: string[];
}

export const MODEL_SELECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ids: { type: 'array', maxItems: MAX_SELECTED, items: { type: 'string' } },
  },
  required: ['ids'],
} as const;

/** A measure offered to the model. Its text is private: it never leaves the Worker. */
export interface Candidate {
  id: string;
  text: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A string the model returned as JSON, with or without a code fence around it. */
function unwrap(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** The model's selection, or null when it is not the shape it was asked for. */
export function parseModelSelection(raw: unknown): ModelSelection | null {
  const value = unwrap(raw);
  if (!isRecord(value)) return null;
  const { ids } = value;
  if (!Array.isArray(ids)) return null;
  if (!ids.every((id): id is string => typeof id === 'string')) return null;
  return { ids: [...ids] };
}

/**
 * The model's output, as an object — or null when it is not the shape it was asked for.
 * A model constrained by a schema still returns a string on some routes, and now and then wraps
 * it in a code fence: both are read; anything else is refused rather than repaired.
 */
export function parseModelAnswer(raw: unknown): ModelAnswer | null {
  const value = unwrap(raw);
  if (!isRecord(value)) return null;
  const { phrases } = value;
  if (!Array.isArray(phrases)) return null;
  const out: ModelSentence[] = [];
  for (const phrase of phrases) {
    if (!isRecord(phrase)) return null;
    const { texte, ids } = phrase;
    if (typeof texte !== 'string' || !Array.isArray(ids)) return null;
    if (!ids.every((id): id is string => typeof id === 'string')) return null;
    out.push({ texte, ids: [...ids] });
  }
  return { phrases: out };
}

// ---------------------------------------------------------------------------------------------
// What /api/ask answers
// ---------------------------------------------------------------------------------------------

/** A sentence of ours, and the measures a reader can check it against. */
export interface AskSentence {
  text: string;
  ids: string[];
}

/**
 * Everything the Worker can say. None of it is an error: a question always gets a page.
 *
 *   answer     sentences written by the model, each tied to measures, all through the control
 *   select     three measures and no sentence: the control refused the writing, or the mode is
 *              "select"
 *   silence    electoral silence: questions reopen at `reopen` (ISO 8601, UTC)
 *   local      no model this time — quota of the day, stop flag, another state of the book, a
 *              slow model, nothing to say of these measures. The page shows what its own
 *              search found, and says nothing of why: it is a normal mode.
 *
 * What the Worker no longer says, because it no longer can (D16.22): that an objection has a
 * re-read answer, that nothing was found, that a message is off the subject. It does not read
 * the question. The first two are decided on the phone, before anything is sent
 * (src/scripts/ask.ts); the third has no object left.
 */
export type AskResponse =
  | { kind: 'answer'; corpus: string; sentences: AskSentence[] }
  | { kind: 'select'; corpus: string; ids: string[] }
  | { kind: 'silence'; reopen: string }
  | { kind: 'local' };

export type AskKind = AskResponse['kind'];

const CORPUS_VERSION = /^[0-9a-f]{16}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
/** Generous: thirty-five French words. The control counts the words; this bounds the bytes. */
const MAX_SENTENCE_CHARS = 400;

const idList = (value: unknown, max: number): string[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) return null;
  const ids: string[] = [];
  for (const id of value) {
    if (typeof id !== 'string' || !PROPOSITION_ID.test(id) || ids.includes(id)) return null;
    ids.push(id);
  }
  return ids;
};

/**
 * Reads an answer of the Worker in the browser — strictly. The Worker is ours, but the page
 * does not take its word for it: a response that is not exactly one of the shapes above is no
 * response (`null`), and the page falls back on what it found by itself. Unknown fields are
 * dropped, not carried: nothing the type cannot name reaches the screen.
 */
export function parseAskResponse(value: unknown): AskResponse | null {
  if (!isRecord(value)) return null;
  switch (value['kind']) {
    case 'answer': {
      const { corpus, sentences } = value;
      if (typeof corpus !== 'string' || !CORPUS_VERSION.test(corpus)) return null;
      if (!Array.isArray(sentences) || sentences.length === 0) return null;
      if (sentences.length > MAX_SENTENCES) return null;
      const out: AskSentence[] = [];
      for (const sentence of sentences) {
        if (!isRecord(sentence)) return null;
        const text = sentence['text'];
        const ids = idList(sentence['ids'], MAX_IDS_PER_SENTENCE);
        if (typeof text !== 'string' || text.trim() === '' || ids === null) return null;
        if (text.length > MAX_SENTENCE_CHARS) return null;
        out.push({ text, ids });
      }
      return { kind: 'answer', corpus, sentences: out };
    }
    case 'select': {
      const { corpus } = value;
      const ids = idList(value['ids'], MAX_SELECTED);
      if (typeof corpus !== 'string' || !CORPUS_VERSION.test(corpus) || ids === null) return null;
      return { kind: 'select', corpus, ids };
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

/**
 * What the page sends at the gesture « Demander », and all of it: the state of the book it
 * shows, the measures its own search found — best first — and the words of the book that
 * search matched. No sentence, no token, nothing typed.
 */
export interface AskRequest {
  corpus: string;
  ids: string[];
  terms: string[];
}

/**
 * Reads a request in the Worker. `null` is a request the page never sends. The shape is the
 * guarantee: an identifier is an identifier of the book, and a term is one folded word — a
 * sentence does not fit, whoever writes the request. The terms come back sorted and without
 * repeats: whatever order they were sent in is not kept.
 */
export function parseAskRequest(value: unknown): AskRequest | null {
  if (!isRecord(value)) return null;
  const { corpus, ids, terms } = value;
  if (typeof corpus !== 'string' || !CORPUS_VERSION.test(corpus)) return null;
  const named = idList(ids, MAX_ASKED_IDS);
  if (named === null) return null;
  if (!Array.isArray(terms) || terms.length > MAX_ASKED_TERMS) return null;
  const words: string[] = [];
  for (const term of terms) {
    if (typeof term !== 'string' || !ASKED_TERM.test(term)) return null;
    if (!words.includes(term)) words.push(term);
  }
  return { corpus, ids: named, terms: words.sort() };
}
