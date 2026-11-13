/**
 * The word of the game, highlighted in the official page (D16.15; PLAN-JEU §4.1, lot J4).
 *
 * A link of the game already lands on the start of the measure the word is shown in: its
 * locator, a text directive. A second directive can light up the word itself — but a text
 * directive matches the FIRST place the page writes those letters. Only where that place is the
 * pinned measure does the highlight tell the truth; anywhere else it would point a reader at
 * another sentence and call it the place.
 *
 * Whether it is the first place cannot be read from the public files, which hold no text. Real
 * browsers say it, on the stored pages (`scripts/verify-2026.ts --words`): each word is asked
 * of Chromium, Firefox and WebKit, and what they did is published in
 * data/2026/word-links.json — identifiers, never a word of the page. The build believes that
 * file only for the list and the book it was made on; otherwise every link keeps its locator
 * alone, which is what it had before this file existed.
 */
import { createHash } from 'node:crypto';

export const WORD_LINKS_PATH = 'data/2026/word-links.json';

/** A highlight is published only when the three engines agree. */
export const WORD_LINK_ENGINES: readonly string[] = ['chromium', 'firefox', 'webkit'];

export interface WordLinksFile {
  corpus_version: string;
  /** The words the browsers were shown, and where each is pinned (`wordsFingerprint`). */
  words_sha256: string;
  verified_on: string;
  engines: { name: string; version: string }[];
  /** Words whose own highlight lands in their pinned measure, in every engine. */
  highlighted: string[];
  /** The others: written earlier in the same page, or not found where an engine looked. */
  measure_only: string[];
}

/** What a highlight depends on: the word as written, and the measure it is pinned in. */
export function wordsFingerprint(
  words: readonly { id: string; word: string; pin: { id: string; sha256: string } }[],
): string {
  const lines = words
    .map((w) => `${w.id}\t${w.word}\t${w.pin.id}\t${w.pin.sha256}`)
    .sort()
    .join('\n');
  return createHash('sha256').update(lines).digest('hex');
}

/**
 * The text of a directive, as a browser reads it back: `-`, `,` and `&` are its syntax, so a
 * hyphen is escaped too (the same writing as scripts/locator.ts, held equal by a test).
 */
export function encodeDirectiveText(text: string): string {
  return encodeURIComponent(text).replace(/-/g, '%2D');
}

/**
 * The fragment of a word's link: the locator of its measure, and — when the browsers light the
 * word up in that measure — a second directive for the word. The page scrolls to the first
 * directive that matches: the start of the measure, as before.
 */
export function wordFragment(locator: string, word: string, highlighted: boolean): string {
  if (locator === '' || !highlighted) return locator;
  return `${locator}&text=${encodeDirectiveText(word)}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * The words to highlight, as far as `file` can be believed for this list and this book — and
 * the reason when it cannot. No reason is an error for the build: the links keep their locator.
 */
export function highlightedWords(
  file: unknown,
  expected: { corpus: string; words: string },
): { ids: ReadonlySet<string>; stale: string | null } {
  const none = (stale: string): { ids: ReadonlySet<string>; stale: string } => ({
    ids: new Set(),
    stale,
  });
  if (!isRecord(file)) return none('the links of the words were never followed by a browser');
  if (file['corpus_version'] !== expected.corpus) return none('followed on another corpus');
  if (file['words_sha256'] !== expected.words) return none('followed on another list of words');
  const engines = Array.isArray(file['engines'])
    ? file['engines'].flatMap((engine) =>
        isRecord(engine) && typeof engine['name'] === 'string' ? [engine['name']] : [],
      )
    : [];
  const missing = WORD_LINK_ENGINES.filter((name) => !engines.includes(name));
  if (missing.length > 0) return none(`not followed in ${missing.join(', ')}`);
  return { ids: new Set(strings(file['highlighted'])), stale: null };
}
