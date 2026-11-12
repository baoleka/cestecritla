/**
 * Link locators: the few leading words that let a link land ON a sentence of the official page.
 *
 *   https://melenchon2027.fr/programme/livre/<part>/chapitreK/#<section-anchor>:~:text=<locator>
 *
 * The part after `:~:` is a text directive (URL Fragment Text Directives). A browser that knows
 * it scrolls to the first place where the words occur and highlights them; a browser that does
 * not ignores it and goes to the anchor. That asymmetry is why the site writes the anchor in the
 * `href` and lets a script append the directive (src/lib/edition.ts).
 *
 * Learning note — what "the first place where the words occur" hides:
 *
 *   1. The search runs over the WHOLE document — menus, footer, table of contents — not over the
 *      article. A locator is safe only if its words occur exactly once in all of it.
 *   2. Matching ignores case and, in practice, accents; it is done on rendered text, where runs
 *      of ordinary spaces collapse but a no-break space stays a no-break space.
 *   3. `-`, `,` and `&` are syntax inside a directive and must be percent-encoded; so must
 *      everything that is not plain ASCII.
 *   4. A match counts only if it starts and ends on a WORD BOUNDARY, as Unicode defines one
 *      (UAX #29) — and French typography sets a trap there. The narrow no-break space (U+202F)
 *      printed before `: ; ! ? » %` belongs to the class "ExtendNumLet", like the underscore: it
 *      is glued to the letter or digit before it. A locator ending on "prix" when the page says
 *      "prix⍽:" ends in the middle of a word, and Chromium, Firefox and WebKit all refuse it —
 *      found by scripts/verify-2026.ts on 12/11/2026, on one link out of 127.
 *
 * Hence three decisions. The locator is cut from the RAW text of the DOM, so that it carries the
 * exact characters the browser will compare (typographic spaces, curly apostrophes). Uniqueness
 * is judged on a deliberately coarse folding of the page — if two places differ only by an
 * accent, a capital or a kind of space, they are treated as the same place. And when no short
 * prefix is unique, there is no locator: the link stops at the section anchor, which is always
 * right, rather than risk highlighting another sentence.
 *
 * A locator exposes the first words of a proposition inside an `href`. It is rationed like any
 * other extract (D15.7): never more than `maxItemShare` of the item it points at.
 */
import { pageTextNodes } from './aec26-source.js';

const chars = (...codes: number[]): string => String.fromCodePoint(...codes);

/** Invisible characters a browser's text search steps over: soft hyphen, zero-width, BOM. */
const IGNORABLE = new RegExp(`[${chars(0xad, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff)}]`, 'g');
/** Apostrophe look-alikes, folded to the ASCII one. */
const APOSTROPHES = new RegExp(`[${chars(0x2018, 0x2019, 0x2bc, 0x2032)}]`, 'g');
/** Hyphen and dash look-alikes (U+2010 to U+2015), folded to the ASCII hyphen. */
const DASHES = new RegExp(`[${chars(0x2010)}-${chars(0x2015)}]`, 'g');

/**
 * What CSS `white-space: normal` does to source text: runs of collapsible whitespace (space,
 * tab, line feed, carriage return, form feed) become one space. No-break and typographic spaces
 * are not collapsible and are kept as they are.
 */
export function cssCollapse(raw: string): string {
  return raw.replace(/[ \t\n\r\f]+/g, ' ').replace(/^ | $/g, '');
}

/**
 * Coarse folding used ONLY to count occurrences: lower case, no diacritics, no invisible
 * characters, one kind of apostrophe, one kind of dash, one kind of space, ligatures opened.
 * Coarser than any browser: it can only find more matches than a browser would, never fewer.
 */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(IGNORABLE, '')
    .replace(APOSTROPHES, "'")
    .replace(DASHES, '-')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/\s+/g, ' ');
}

/** A page as a text search sees it, under two readings of where element boundaries fall. */
export interface PageText {
  /** Text nodes glued together: what matching across inline elements sees. */
  joined: string;
  /** Text nodes separated by a space: what a line break or an inline box boundary can produce. */
  spaced: string;
}

export function pageText(html: string): PageText {
  const nodes = pageTextNodes(html);
  return { joined: fold(nodes.join('')), spaced: fold(nodes.join(' ')) };
}

export function countOccurrences(haystack: string, needle: string): number {
  if (needle === '') return 0;
  let count = 0;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
    count += 1;
  }
  return count;
}

/** Percent-encodes a text for use inside `text=`: everything `encodeURIComponent` does, plus `-`. */
export function encodeDirectiveText(text: string): string {
  return encodeURIComponent(text).replace(/-/g, '%2D');
}

/** The text a `text=…` locator stands for; null if it is not one. */
export function decodeLocator(locator: string): string | null {
  if (!locator.startsWith('text=')) return null;
  const body = locator.slice('text='.length);
  // A raw `-`, `,` or `&` would be directive syntax (prefix, range, next directive): refuse it.
  if (/[-,&]/.test(body)) return null;
  try {
    return decodeURIComponent(body);
  } catch {
    return null;
  }
}

export const wordCount = (text: string): number => (text.match(/\S+/gu) ?? []).length;

export interface LocatorPolicy {
  minWords: number;
  maxWords: number;
  /** Largest share of the item's words a locator may carry (0.5: never more than half). */
  maxItemShare: number;
}

export type AnchorOnlyReason = 'too_short' | 'not_unique' | 'inline_markup' | 'not_encodable';

export type Locator =
  | { kind: 'start'; text: string; locator: string; words: number }
  | { kind: 'anchor_only'; reason: AnchorOnlyReason };

const WORDS = new Intl.Segmenter('fr', { granularity: 'word' });

/** Offsets of `text` where a word may end, as the browsers' own segmentation (UAX #29) sees it. */
export function wordBoundaries(text: string): Set<number> {
  const out = new Set<number>([text.length]);
  for (const segment of WORDS.segment(text)) out.add(segment.index);
  return out;
}

/**
 * The shortest prefix of `raw`, between `minWords` and `maxWords` words, that occurs exactly
 * once in the page under both readings and ends on a word boundary — or the reason why there is
 * none.
 *
 * `inline` lists the inline elements found inside the item. An item with inline markup gets no
 * locator: its text is spread over several text nodes, and how a search treats the seams between
 * them is exactly the kind of thing two browsers do differently.
 */
export function computeLocator(
  raw: string,
  inline: readonly string[],
  page: PageText,
  policy: LocatorPolicy,
): Locator {
  if (inline.length > 0) return { kind: 'anchor_only', reason: 'inline_markup' };
  const collapsed = cssCollapse(raw);
  const tokens = [...collapsed.matchAll(/\S+/gu)];
  const ceiling = Math.min(policy.maxWords, Math.floor(tokens.length * policy.maxItemShare));
  if (ceiling < policy.minWords) return { kind: 'anchor_only', reason: 'too_short' };
  const boundaries = wordBoundaries(collapsed);

  const tried = new Set<string>();
  for (let n = policy.minWords; n <= ceiling; n += 1) {
    const last = tokens[n - 1];
    if (last === undefined) break;
    const whole = collapsed.slice(0, last.index + last[0].length);
    // First the n words without what trails them (a comma, the space-and-colon of French
    // typography), then the n words as they stand: "prix" alone is not a word when the page
    // says "prix⍽:", but "prix⍽:" is.
    for (const text of [whole.replace(/[\s\p{P}]+$/u, ''), whole]) {
      if (tried.has(text)) continue;
      tried.add(text);
      if (wordCount(text) < policy.minWords || !boundaries.has(text.length)) continue;
      const needle = fold(text);
      if (countOccurrences(page.joined, needle) !== 1) continue;
      if (countOccurrences(page.spaced, needle) !== 1) continue;
      let encoded: string;
      try {
        encoded = encodeDirectiveText(text);
      } catch {
        return { kind: 'anchor_only', reason: 'not_encodable' };
      }
      return { kind: 'start', text, locator: `text=${encoded}`, words: wordCount(text) };
    }
  }
  return { kind: 'anchor_only', reason: 'not_unique' };
}

/** `…/chapitre1/#anchor` + `text=…` → the full deep link. Null locator: the anchor alone. */
export function deepLink(sectionUrl: string, locator: string | null | undefined): string {
  return locator === null || locator === undefined ? sectionUrl : `${sectionUrl}:~:${locator}`;
}
