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
import { parseTerms, type TermEntry, type TermWording } from './terms.js';

export const TERMS_PATH = 'data/2026/terms.json';
const CARDS_PATH = 'data/2026/glossary.json';

/**
 * Our cards, by their terms (data/2026/glossary.json). Read here rather than through
 * src/lib/editorial.ts: this file is read by the gates too, outside the build, and that one is
 * the build's alone.
 */
const ourCards = (): NotionEntry[] =>
  (JSON.parse(readFileSync(CARDS_PATH, 'utf8')) as { entries: NotionEntry[] }).entries.map(
    ({ id, term }) => ({ id, term }),
  );

/** Our texts are typed with straight apostrophes; the pages show typographic ones. */
const prose = (text: string): string => text.replace(/'/g, '’');

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
