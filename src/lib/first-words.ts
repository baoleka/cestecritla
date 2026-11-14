/**
 * The first words of a measure, where a page may show them (D15.7, D16.32).
 *
 * Two kinds of first words are published, both rationed by data/2026/exposure-policy.json:
 *
 *   incipit   4 to 8 words of a KEY measure — shown on its section page and wherever the
 *             measure is found;
 *   locator   the shortest prefix that is unique in the chapter's page, 4 to 8 words, of every
 *             proposition — carried by its link as a text directive, so that a browser lands
 *             on the sentence.
 *
 * Until D16.32 a locator lived in the `href` only: next to a link one read « mesure 3 » and
 * nothing of what it says. Since then the policy decides (`locator_display`): `href` keeps it
 * there; `search` also lets it be read next to its link in a search result and in the selection
 * of « Demander » — places a visitor reaches by asking, which no crawler is served. Never on a
 * page of ours: a section page that lined up the opening of every measure would be a copy of
 * the table of the book, not a pointer to it.
 *
 * Showing them publishes nothing new: the words are the ones the public files already hold.
 * Pure, and safe for the browser: no file, no Node module.
 */

/** Where the words a link carries may also be read. */
export type LocatorDisplay = 'href' | 'search';

export const isLocatorDisplay = (value: unknown): value is LocatorDisplay =>
  value === 'href' || value === 'search';

/** A cut that falls right after a mark that opens or separates leaves it dangling: it goes. */
const DANGLING = /[\s«“(:;,]+$/u;

/**
 * The words a link locator carries, as a reader would read them: the text of a directive of one
 * part (`text=…`). Anything else — a range, several directives, a broken escape — gives nothing:
 * better no words than words the link does not land on.
 */
export function directiveWords(directive: string): string {
  if (!directive.startsWith('text=')) return '';
  const body = directive.slice('text='.length);
  if (body === '' || body.includes(',') || body.includes('&')) return '';
  try {
    // Not a character is changed — a non-breaking space stays one: only the ends are tidied.
    return decodeURIComponent(body).trim().replace(DANGLING, '');
  } catch {
    return '';
  }
}

/**
 * What a result shows of a measure, from its entry in the titles file — `[label, directive,
 * incipit]`: the incipit of a key measure; else, where the policy allows, the words its link
 * carries; else nothing.
 */
export function firstWordsOf(
  entry: readonly [string, string, string] | undefined,
  display: LocatorDisplay,
): string {
  if (entry === undefined) return '';
  const [, directive, incipit] = entry;
  if (incipit !== '') return incipit;
  return display === 'search' ? directiveWords(directive) : '';
}

/** The space French sets inside guillemets: one that never breaks, so that no mark ends up alone. */
const NBSP = String.fromCodePoint(0xa0);

/** The same words as the page writes them: between guillemets, and visibly cut short. */
export const quoted = (words: string): string => `«${NBSP}${words}…${NBSP}»`;
