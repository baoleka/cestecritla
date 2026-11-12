/**
 * Looks for sentences of the 2026 edition where they must never be: in a tracked file, in a
 * commit message, in dist/ (D15.6).
 *
 * How. Every item of the private corpus is cut into overlapping windows of NINE consecutive
 * words ("shingles"). Nine, because eight is the most the policy ever lets out in one piece (an
 * incipit, a link locator): nine words in a row, in the order of the book, are not an extract
 * any more — they are the book. A file is clean when it contains none of those windows.
 *
 * Three subtractions keep the gate honest rather than noisy:
 *   - windows that already stood in data/ when the repository was frozen, on 10 September 2026,
 *     eight weeks before the 2026 edition existed: the 2025 edition (CC BY-NC-SA) and the 2022
 *     booklets. The new book reuses sentences of both word for word, and nothing can tell such
 *     a sentence from its older twin;
 *   - windows that occur in an official title — titles are shown, on purpose;
 *   - the propositions listed in data/2026/quotes.json, where they are allowed to stand whole.
 *
 * Propositions shorter than nine words cannot hold a window: they are looked for as whole
 * sentences instead.
 *
 * What it cannot see, said plainly: a sentence the 2026 edition shares word for word with an
 * older text already here, and a paraphrase. It is a tripwire for copy-paste and for tooling that prints what it reads —
 * the two ways text actually escapes.
 */

const WINDOW = 9;
const SHORT_MIN = 4;

/** Words as the policy counts them — split on whitespace — folded so that typography is ignored. */
export function leakTokens(text: string): string[] {
  return (
    text
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .toLowerCase()
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae')
      // Characters of markup and of URLs separate words (`text=Inscrire`, `"note":"Créer`);
      // apostrophes, hyphens and the rest of punctuation vanish, so that a word of the book is one
      // token here exactly when the policy counts it as one word.
      .replace(/[="<>[\]{}|\\/#~`]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s]+/gu, '')
      .split(/\s+/u)
      .filter((token) => token !== '')
  );
}

function windows(tokens: readonly string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + size <= tokens.length; i += 1) out.push(tokens.slice(i, i + size).join(' '));
  return out;
}

export interface LeakIndex {
  /** Nine-word windows distinctive of the 2026 edition → the item they come from. */
  shingles: Map<string, string>;
  /** Whole short propositions (4 to 8 words), keyed by their word count. */
  short: Map<number, Map<string, string>>;
  /** Items that hold at least one distinctive window or are indexed whole. */
  covered: number;
  items: number;
}

export interface LeakSource {
  id: string;
  text: string;
}

/**
 * @param corpus every item of the 2026 edition
 * @param known  texts that are legitimately public: the 2025 corpus and the official titles
 */
export function buildLeakIndex(corpus: readonly LeakSource[], known: readonly string[]): LeakIndex {
  const knownWindows = new Set<string>();
  const knownShort = new Set<string>();
  for (const text of known) {
    const tokens = leakTokens(text);
    for (const w of windows(tokens, WINDOW)) knownWindows.add(w);
    for (let size = SHORT_MIN; size < WINDOW; size += 1) {
      for (const w of windows(tokens, size)) knownShort.add(w);
    }
  }
  const index: LeakIndex = {
    shingles: new Map(),
    short: new Map(),
    covered: 0,
    items: corpus.length,
  };
  for (const item of corpus) {
    const tokens = leakTokens(item.text);
    let covered = false;
    if (tokens.length >= WINDOW) {
      for (const w of windows(tokens, WINDOW)) {
        if (knownWindows.has(w)) continue;
        if (!index.shingles.has(w)) index.shingles.set(w, item.id);
        covered = true;
      }
    } else if (tokens.length >= SHORT_MIN) {
      const whole = tokens.join(' ');
      if (!knownShort.has(whole)) {
        let bucket = index.short.get(tokens.length);
        if (bucket === undefined) {
          bucket = new Map();
          index.short.set(tokens.length, bucket);
        }
        bucket.set(whole, item.id);
        covered = true;
      }
    }
    if (covered) index.covered += 1;
  }
  return index;
}

/** A token no sentence contains: windows cannot span it. */
const BREAK = ' xxbreakxx ';

/** Makes percent-encoded text and HTML readable as words before they are compared. */
export function readable(content: string): string {
  let text = content;
  if (text.includes('%')) {
    // Decode runs of percent-escapes; a malformed run is left as it is.
    text = text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
      try {
        return decodeURIComponent(run);
      } catch {
        return run;
      }
    });
  }
  return (
    text
      // An ellipsis and the end of a block are where a quotation STOPS. Without a marker there,
      // the eight words of an incipit and the first word of the caption that follows it
      // ("… La France insoumise") read as nine words in a row — found on the first build, on a
      // key measure whose ninth word happens to be "la".
      .replace(
        /…|<\/(?:p|li|blockquote|figcaption|figure|h[1-6]|div|section|td|th|dd|dt)>/gi,
        BREAK,
      )
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;|&rsquo;|&apos;/gi, '’')
      .replace(/\\n|\\t/g, ' ')
  );
}

export interface LeakHit {
  /** Item of the corpus the words come from. Never the words. */
  id: string;
  /** Number of windows of that item found. */
  windows: number;
}

/**
 * Items of the corpus found in `content`, except those in `allowed`.
 * Reports identifiers and counts only: a leak report must not be a second leak.
 */
export function scanForLeaks(
  content: string,
  index: LeakIndex,
  allowed: ReadonlySet<string> = new Set(),
): LeakHit[] {
  const tokens = leakTokens(readable(content));
  const hits = new Map<string, number>();
  const hit = (id: string | undefined): void => {
    if (id !== undefined && !allowed.has(id)) hits.set(id, (hits.get(id) ?? 0) + 1);
  };
  for (let i = 0; i + WINDOW <= tokens.length; i += 1) {
    hit(index.shingles.get(tokens.slice(i, i + WINDOW).join(' ')));
  }
  for (const [size, bucket] of index.short) {
    for (let i = 0; i + size <= tokens.length; i += 1) {
      hit(bucket.get(tokens.slice(i, i + size).join(' ')));
    }
  }
  return [...hits].map(([id, count]) => ({ id, windows: count }));
}
