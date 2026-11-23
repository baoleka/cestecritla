/**
 * The explained words as the phone fetches them (PLAN-MOTS, lot 3; D20.12, D20.13) — computed at
 * build time from data/2026/terms.json, a public file, and from nothing else.
 *
 * Three files, one fingerprint:
 *   /data/mots-<fp>.json            how a word is found: its identifier and its wordings, and
 *                                   nothing of what it says. Fetched by the sheet at the first
 *                                   question, with the texts of « En clair »;
 *   /data/mots-<fp>-sens.json       what each word means, by identifier;
 *   /data/mots-<fp>-exemples.json   the examples, by identifier. These two are fetched together,
 *                                   the first time an explanation is needed — whichever it is.
 *
 * No address depends on a word (D20.13): which explanation a reader opens is told to no one,
 * only that one was. Each file of texts says who wrote it — an AI, read by no person one by one
 * — so that a text can never travel without what the page says of it.
 *
 * Learning note — why the texts are not in the finder. The finder is what every question needs;
 * the texts, only what a reader opens. With hundreds of words and their examples, putting them
 * together would make every first question pay for every explanation of the book.
 */
import { readFileSync } from 'node:fs';
import { canonicalHash } from './fingerprint.js';
import { notionsIn, type NotionEntry } from './notions.js';
import {
  cardWordings,
  parseTerms,
  termsIn,
  withoutCards,
  type TermEntry,
  type TermWording,
} from './terms.js';

export const TERMS_PATH = 'data/2026/terms.json';
const CARDS_PATH = 'data/2026/glossary.json';

/** A block of studies of an answer (D21.1), as data/2026/riposte.json holds it. */
interface Studies {
  lead: string;
  items: { text: string }[];
  close: string;
}
/** Its sentences — its sources are signatures, not prose. Kept here: see `cardsOf` below. */
const studyTexts = (studies: Studies): string[] => [
  studies.lead,
  ...studies.items.map((item) => item.text),
  studies.close,
];

/**
 * Our cards, by their terms (data/2026/glossary.json). Read here rather than through
 * src/lib/editorial.ts: this file is read by the gates too, outside the build, and that one is
 * the build's alone.
 */
const ourCards = (): NotionEntry[] =>
  (JSON.parse(readFileSync(CARDS_PATH, 'utf8')) as { entries: NotionEntry[] }).entries.map(
    ({ id, term }) => ({ id, term }),
  );

/** Our cards as wordings, which the words they hold belong to (D20.14): read before the words. */
export const cardBlockers = (): TermWording[] => cardWordings(ourCards());

/** Our texts are typed with straight apostrophes; the pages show typographic ones. */
export const prose = (text: string): string => text.replace(/'/g, '’');

/** Who wrote the texts a file holds: an AI, and no person read them one by one (D16.59). */
export interface WordsProvenance {
  written_by: 'ai';
  read_by_a_person: false;
}

/** How a word is found: its identifier and its wordings. */
export interface WordsFinder {
  terms: TermWording[];
}

/** Texts by the identifier of their word, with who wrote them. */
export interface WordsTexts extends WordsProvenance {
  texts: Record<string, string>;
}

export interface BuiltWords {
  /** One fingerprint for the three files: they always go together. */
  fingerprint: string;
  finder: WordsFinder;
  meanings: WordsTexts;
  examples: WordsTexts;
}

/** The names of a build's files of words, under /data/, without « .json ». */
export interface WordsNames {
  finder: string;
  meanings: string;
  examples: string;
}

/**
 * The explained words, as the file holds them. A term that is also one of our cards is
 * refused: the card says what the programme provides, pinned to its measures, and it is the
 * one shown.
 */
export function explainedTerms(): TermEntry[] {
  const entries = parseTerms(JSON.parse(readFileSync(TERMS_PATH, 'utf8')));
  const known = ourCards();
  for (const entry of entries) {
    for (const wording of [entry.term, ...(entry.aliases ?? [])]) {
      if (notionsIn(wording, known).length > 0) {
        throw new Error(`${TERMS_PATH}: « ${wording} » is one of our cards`);
      }
    }
  }
  return entries;
}

/**
 * What the files of texts say of their authors — read in the file itself: the day a person
 * reads the explanations one by one, the file says so first, and this changes with it.
 */
function provenance(): WordsProvenance {
  const file = JSON.parse(readFileSync(TERMS_PATH, 'utf8')) as {
    meta?: { read_by_a_person?: unknown };
  };
  if (file.meta?.read_by_a_person !== false) {
    throw new Error(`${TERMS_PATH}: meta.read_by_a_person is not false — the label says it is`);
  }
  return { written_by: 'ai', read_by_a_person: false };
}

/** The explained words of this build: what finds them, what they mean, their examples. */
export function builtWords(): BuiltWords {
  const entries = explainedTerms();
  const finder: WordsFinder = {
    terms: entries.map(({ id, term, aliases, anyCase }) => ({
      id,
      term,
      ...(aliases === undefined ? {} : { aliases: [...aliases] }),
      ...(anyCase === true ? { anyCase } : {}),
    })),
  };
  const by = provenance();
  const meanings: WordsTexts = {
    ...by,
    texts: Object.fromEntries(entries.map((entry) => [entry.id, prose(entry.plain)])),
  };
  const examples: WordsTexts = {
    ...by,
    texts: Object.fromEntries(
      entries.flatMap((entry) =>
        entry.example === undefined ? [] : [[entry.id, prose(entry.example)]],
      ),
    ),
  };
  const fingerprint = canonicalHash({ finder, meanings, examples }).slice(0, 16);
  return { fingerprint, finder, meanings, examples };
}

/** The names of the three files, from their fingerprint. */
export const wordsNames = (fingerprint: string): WordsNames => ({
  finder: `mots-${fingerprint}`,
  meanings: `mots-${fingerprint}-sens`,
  examples: `mots-${fingerprint}-exemples`,
});

/** Where each section's words are written: the map of the book, identifiers only (lot 4). */
export const TERM_PLACES_PATH = 'data/2026/term-places.json';

/**
 * The fingerprint of how the words are found — their identifiers and their wordings, never
 * what they say: what the map of the book was computed on (scripts/lexicon-2026.ts).
 */
export function wordingsFingerprint(wordings: readonly TermWording[]): string {
  return canonicalHash(
    wordings.map(({ id, term, aliases, anyCase }) => ({
      id,
      term,
      aliases: aliases ?? [],
      anyCase: anyCase === true,
    })),
  );
}

/** What a page's file says of its words, so that no text travels without it. */
export interface PageLabels {
  /** Who wrote and checked them: an AI. */
  badge: string;
  /** The link to how it is made. */
  how: string;
  /** The word that precedes an example. */
  example: string;
}

/** The file of a page's words (PLAN-MOTS, lot 4). */
export interface PageWordsFile extends WordsProvenance {
  labels: PageLabels;
  /** Each word — identifier, as shown, what it means, its example if any — as a dictionary orders them. */
  terms: string[][];
}

/** A page that explains words: a section, one of our cards, one of our answers. */
export interface WordsPage {
  kind: 's' | 'c' | 'r';
  /** The section's identifier, the card's, the answer's slug. */
  key: string;
  /** The explained words the page uses, sorted. */
  ids: string[];
}

interface Supported {
  supports: readonly { id: string; quote?: boolean }[];
}

/**
 * Every page that has words to explain. A section: the words the map of the book says its text
 * uses. One of our cards, one of our answers: the words its texts use — and the measures it
 * quotes whole (data/2026/quotes.json), which the page shows.
 */
export function wordsPages(entries: readonly TermEntry[] = explainedTerms()): WordsPage[] {
  const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
  const places = read(TERM_PLACES_PATH) as { sections: Record<string, string[]> };
  const quotes = new Map(
    (read('data/2026/quotes.json') as { quotes: { id: string; text: string }[] }).quotes.map(
      (quote) => [quote.id, quote.text],
    ),
  );
  const quoted = (entry: Supported): string[] =>
    entry.supports.filter((s) => s.quote === true).map((s) => quotes.get(s.id) ?? '');
  // Read with our cards: a word inside the term of a card is the card's (D20.14).
  const blockers = cardWordings(ourCards());
  const idsIn = (texts: readonly string[]): string[] =>
    withoutCards(termsIn(texts, [...blockers, ...entries], blockers.length + entries.length))
      .map((entry) => entry.id)
      .sort();
  const out: WordsPage[] = Object.entries(places.sections).map(([key, ids]) => ({
    kind: 's',
    key,
    ids: [...ids],
  }));
  const cardsFile = read(CARDS_PATH) as {
    entries: (Supported & {
      id: string;
      term: string;
      plain: string;
      why?: string;
      objection?: { text: string; answer: string };
    })[];
  };
  for (const card of cardsFile.entries) {
    const ids = idsIn([
      card.term,
      card.plain,
      card.why ?? '',
      card.objection?.text ?? '',
      card.objection?.answer ?? '',
      ...quoted(card),
    ]);
    if (ids.length > 0) out.push({ kind: 'c', key: card.id, ids });
  }
  const answers = read('data/2026/riposte.json') as {
    entries: (Supported & {
      slug: string;
      objection: string;
      answer: string;
      avoid: string;
      studies?: Studies;
    })[];
  };
  for (const answer of answers.entries) {
    // The words of a block of studies are explained under the page too (D21.1).
    const studies = answer.studies === undefined ? [] : studyTexts(answer.studies);
    const ids = idsIn([
      answer.objection,
      answer.answer,
      answer.avoid,
      ...studies,
      ...quoted(answer),
    ]);
    if (ids.length > 0) out.push({ kind: 'r', key: answer.slug, ids });
  }
  return out;
}

/** The name of a page's file of words, under /data/, without « .json ». */
export const pageWordsName = (fingerprint: string, page: Pick<WordsPage, 'kind' | 'key'>): string =>
  `mots-${fingerprint}-${page.kind}-${page.key}`;

/** The file of a page's words: who wrote them, the labels, each word as a dictionary orders them. */
export function pageWords(
  ids: readonly string[],
  entries: readonly TermEntry[],
  labels: PageLabels,
): PageWordsFile {
  const wanted = new Set(ids);
  const chosen = entries
    .filter((entry) => wanted.has(entry.id))
    .sort(
      (a, b) =>
        a.term.localeCompare(b.term, 'fr', { sensitivity: 'base' }) || a.id.localeCompare(b.id),
    );
  return {
    ...provenance(),
    labels,
    terms: chosen.map((entry) =>
      entry.example === undefined
        ? [entry.id, entry.term, prose(entry.plain)]
        : [entry.id, entry.term, prose(entry.plain), prose(entry.example)],
    ),
  };
}

let builtPages: Map<string, string> | null = null;
/**
 * The address of a page's file of words, or null when the page has none to explain — computed
 * once per build: 111 sections, our cards and our answers ask for it.
 */
export function pageWordsFile(kind: WordsPage['kind'], key: string): string | null {
  if (builtPages === null) {
    const fingerprint = builtWords().fingerprint;
    builtPages = new Map(
      wordsPages().map((page) => [`${page.kind}:${page.key}`, pageWordsName(fingerprint, page)]),
    );
  }
  const name = builtPages.get(`${kind}:${key}`);
  return name === undefined ? null : `/data/${name}.json`;
}
