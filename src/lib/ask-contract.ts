/**
 * The contract of a question (D16.2 to D16.8) — what the model is asked for, and what
 * `/api/ask` answers. One file, four users: the Worker, the page, the bench and the tests.
 * No import, no DOM, no Node API, no Workers API.
 *
 * The rule everything here serves: **no word of the programme leaves the Worker**. The model
 * reads the text of a dozen measures; what comes back to the browser is sentences of ours and
 * identifiers, and nothing else. No field of `AskResponse` can hold a text of the book — the
 * titles, the numbers and the links are resolved in the browser, from files already public.
 */

/** A question longer than this is not sent: it is a paste, not a question. */
export const MAX_QUESTION_CHARS = 300;
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

export interface ModelAnswer {
  phrases: ModelSentence[];
  /** True when the message is not a question about what the programme contains. */
  hors_programme: boolean;
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
    hors_programme: { type: 'boolean' },
  },
  required: ['phrases', 'hors_programme'],
} as const;

/**
 * The second rung of the ladder (mode "select"): the model chooses up to three measures and
 * writes nothing. Used only if the bench refuses the writing and shows that the model's choice
 * beats the order of the search.
 */
export interface ModelSelection {
  ids: string[];
  hors_programme: boolean;
}

export const MODEL_SELECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ids: { type: 'array', maxItems: MAX_SELECTED, items: { type: 'string' } },
    hors_programme: { type: 'boolean' },
  },
  required: ['ids', 'hors_programme'],
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
  const { ids, hors_programme: outside } = value;
  if (!Array.isArray(ids) || typeof outside !== 'boolean') return null;
  if (!ids.every((id): id is string => typeof id === 'string')) return null;
  return { ids: [...ids], hors_programme: outside };
}

/**
 * The model's output, as an object — or null when it is not the shape it was asked for.
 * A model constrained by a schema still returns a string on some routes, and now and then wraps
 * it in a code fence: both are read; anything else is refused rather than repaired.
 */
export function parseModelAnswer(raw: unknown): ModelAnswer | null {
  const value = unwrap(raw);
  if (!isRecord(value)) return null;
  const { phrases, hors_programme: outside } = value;
  if (!Array.isArray(phrases) || typeof outside !== 'boolean') return null;
  const out: ModelSentence[] = [];
  for (const phrase of phrases) {
    if (!isRecord(phrase)) return null;
    const { texte, ids } = phrase;
    if (typeof texte !== 'string' || !Array.isArray(ids)) return null;
    if (!ids.every((id): id is string => typeof id === 'string')) return null;
    out.push({ texte, ids: [...ids] });
  }
  return { phrases: out, hors_programme: outside };
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
 *   reviewed   the question is one of the fifteen objections a person answered: no model ran
 *   none       nothing found with these words (never "the programme does not speak of it")
 *   off_topic  not a question about what the programme contains
 *   silence    electoral silence: questions reopen at `reopen` (ISO 8601, UTC)
 *   local      no model for this question — quota of the day, stop flag, another state of the
 *              book, a slow model. The page shows what the local search found, and says nothing
 *              of why: it is a normal mode.
 */
export type AskResponse =
  | { kind: 'answer'; corpus: string; sentences: AskSentence[] }
  | { kind: 'select'; corpus: string; ids: string[] }
  | { kind: 'reviewed'; slug: string }
  | { kind: 'none' }
  | { kind: 'off_topic' }
  | { kind: 'silence'; reopen: string }
  | { kind: 'local' };

export type AskKind = AskResponse['kind'];

const CORPUS_VERSION = /^[0-9a-f]{16}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
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
    case 'reviewed': {
      const { slug } = value;
      if (typeof slug !== 'string' || slug.length > 64 || !SLUG.test(slug)) return null;
      return { kind: 'reviewed', slug };
    }
    case 'silence': {
      const { reopen } = value;
      if (typeof reopen !== 'string' || !ISO_INSTANT.test(reopen)) return null;
      return { kind: 'silence', reopen };
    }
    case 'none':
      return { kind: 'none' };
    case 'off_topic':
      return { kind: 'off_topic' };
    case 'local':
      return { kind: 'local' };
    default:
      return null;
  }
}

/** What the page sends. The token is Turnstile's; the corpus is the state of the book it shows. */
export interface AskRequest {
  q: string;
  token: string;
  corpus: string;
}

/** Reads a request in the Worker. `null` is a request nobody honest sends. */
export function parseAskRequest(value: unknown): AskRequest | null {
  if (!isRecord(value)) return null;
  const { q, token, corpus } = value;
  if (typeof q !== 'string' || typeof token !== 'string' || typeof corpus !== 'string') return null;
  const question = q.trim();
  if (question === '' || question.length > MAX_QUESTION_CHARS) return null;
  if (token.length > 4096 || !CORPUS_VERSION.test(corpus)) return null;
  return { q: question, token, corpus };
}
