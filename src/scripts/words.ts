/**
 * The explained words of the sheet of « Demander »: which terms a turn explains
 * (src/lib/terms.ts), how each is drawn (src/scripts/words-view.ts), and their texts.
 *
 * A module of its own (PLAN-MOTS, lot 1). The sheet's script has a ceiling of its own
 * (scripts/check-build.test.ts), and reading hundreds of terms does not belong in it: this file
 * is asked for as soon as that script runs, never by a page.
 *
 * Three files, at addresses that are the same for everyone (src/lib/words-data.ts): how the
 * words are found, at the first question; what they mean and their examples, together, the first
 * time an explanation is needed — whichever it is. Nothing tells which (D20.13), and nothing is
 * sent to find a word: the words of a question and of the sentences are read here, on the phone.
 */
import {
  CARD_PREFIX,
  cardWordings,
  explainedFor,
  type Explained,
  type TermWording,
} from '../lib/terms.ts';
import { fillItem, type WordText } from './words-view.ts';

export { wordItem } from './words-view.ts';
// What the line of the search draws with, taken from here once this module has come: the line
// imports nothing of the words with the page (src/scripts/words-search.ts; review 17, Q21).
export { el, typographic } from './words-view.ts';
export { CARD_PREFIX } from '../lib/terms.ts';

/** Where the files of a build's words are (src/components/ChatSheet.astro). */
export interface WordsAddresses {
  finder: string;
  meanings: string;
  examples: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isWording = (value: unknown): value is TermWording =>
  isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['term'] === 'string' &&
  (value['aliases'] === undefined ||
    (Array.isArray(value['aliases']) &&
      (value['aliases'] as unknown[]).every((alias) => typeof alias === 'string'))) &&
  (value['anyCase'] === undefined || value['anyCase'] === true);

/** A file of the site, or null — never an error a reader would see. */
async function fetched(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, { credentials: 'omit' });
    return response.ok ? ((await response.json()) as unknown) : null;
  } catch {
    return null;
  }
}

/** The texts a file holds, if it says an AI wrote them: the label of the page says so too. */
function textsOf(file: unknown): Record<string, string> | null {
  if (!isRecord(file) || file['written_by'] !== 'ai' || !isRecord(file['texts'])) return null;
  const out: Record<string, string> = {};
  for (const [id, text] of Object.entries(file['texts'])) {
    if (typeof text === 'string') out[id] = text;
  }
  return out;
}

let finding: Promise<TermWording[] | null> | null = null;
/** How the words are found: fetched once. A failure is forgotten — the next question asks again. */
export function finder(url: string): Promise<TermWording[] | null> {
  finding ??= fetched(url).then((file) => {
    const terms = isRecord(file) ? file['terms'] : null;
    if (!Array.isArray(terms)) {
      finding = null;
      return null;
    }
    return (terms as unknown[]).filter(isWording);
  });
  return finding;
}

let texts: ReadonlyMap<string, WordText> | null = null;
let reading: Promise<ReadonlyMap<string, WordText> | null> | null = null;
/**
 * What each word means, and its example: the two files together, once — the first time a
 * reader needs one. A failure is forgotten: the next opening asks again.
 */
export function loadTexts(urls: WordsAddresses): Promise<ReadonlyMap<string, WordText> | null> {
  reading ??= Promise.all([fetched(urls.meanings), fetched(urls.examples)]).then(
    ([meaningsFile, examplesFile]) => {
      const meanings = textsOf(meaningsFile);
      const examples = textsOf(examplesFile);
      if (meanings === null || examples === null) {
        reading = null;
        return null;
      }
      texts = new Map(
        Object.entries(meanings).map(([id, plain]) => [
          id,
          { plain, example: examples[id] ?? null },
        ]),
      );
      return texts;
    },
  );
  return reading;
}

/** The texts of a word, once they are here. */
export const textOf = (id: string): WordText | null => texts?.get(id) ?? null;

/** Puts their texts under the lines drawn before they came — in place, nothing drawn again. */
export function fillAll(root: ParentNode, exampleLabel: string): void {
  for (const item of root.querySelectorAll<HTMLDetailsElement>(
    'details.c-term[data-term]:not([data-filled])',
  )) {
    const text = textOf(item.dataset.term ?? '');
    if (text !== null) fillItem(item, text, exampleLabel);
  }
}

/**
 * What the sheet explains for a turn: the terms its question asks about, first; then every term
 * its sentences use (src/lib/terms.ts, `explainedFor`). Read with our cards: a word inside the
 * term of a card is the card's (D20.14), and the card has its own block.
 */
export function explain(
  question: string,
  sentences: readonly string[],
  wordings: readonly TermWording[],
  cards: readonly { id: string; term: string }[] = [],
): Explained<TermWording>[] {
  return explainedFor(question, sentences, [...cardWordings(cards), ...wordings]).filter(
    (found) => !found.entry.id.startsWith(CARD_PREFIX),
  );
}

/**
 * What a search names (src/scripts/words-search.ts): the words its question asks about — an
 * explained word, or one of our cards, whose id then starts with `CARD_PREFIX`. Read the same
 * way: the card wins on its span (D20.14), and here it is what is shown.
 */
export function named(
  question: string,
  wordings: readonly TermWording[],
  cards: readonly { id: string; term: string }[],
): Explained<TermWording>[] {
  return explainedFor(question, [], [...cardWordings(cards), ...wordings]).filter(
    (found) => found.top,
  );
}
