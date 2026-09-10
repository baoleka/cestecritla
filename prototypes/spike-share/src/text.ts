/**
 * Text fitting for satori, which has no auto-shrink.
 *
 * Rule of the spike: a length-based font-size step (≤ 120 chars → step 0, ≤ 220 → step 1,
 * else step 2), then a greedy word-wrap estimate that lowers the size down to a minimum
 * when the estimated block would overflow its box, and finally a cut at a word boundary.
 * The cut keeps the verbatim intact up to the ellipsis: nothing is ever paraphrased.
 */

export const ELLIPSIS_AT = 320;
export const ELLIPSIS = ' …';

export interface FitOptions {
  /** Available box, in px. */
  width: number;
  height: number;
  /** Candidate sizes by length step, largest first. */
  steps: readonly [number, number, number];
  /** Smallest acceptable size before cutting text. */
  min: number;
  lineHeight: number;
  /** Average glyph advance as a fraction of the font size (Gowun Batang ≈ 0.52, Public Sans ≈ 0.55). */
  avgCharEm: number;
  /** Hard cap on characters (default ELLIPSIS_AT). */
  maxChars?: number;
}

export interface Fitted {
  text: string;
  fontSize: number;
  truncated: boolean;
  estimatedLines: number;
}

/** Greedy word-wrap estimate: how many lines does `text` need at `fontSize` in `width`? */
export const estimateLines = (text: string, fontSize: number, width: number, avgCharEm: number): number => {
  const charsPerLine = Math.max(8, Math.floor(width / (fontSize * avgCharEm)));
  let lines = 1;
  let current = 0;
  for (const word of text.split(/\s+/)) {
    const len = word.length;
    if (current === 0) {
      current = len;
    } else if (current + 1 + len <= charsPerLine) {
      current += 1 + len;
    } else {
      lines += 1;
      current = len;
    }
    // Very long tokens wrap by themselves.
    while (current > charsPerLine) {
      lines += 1;
      current -= charsPerLine;
    }
  }
  return lines;
};

/** Cut at a word boundary so that the result (plus the ellipsis) is at most `max` chars. */
export const cutAtWord = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const slice = text.slice(0, Math.max(0, max - ELLIPSIS.length));
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return base.replace(/[\s,;:]+$/u, '') + ELLIPSIS;
};

const stepFor = (length: number, steps: readonly [number, number, number]): number => {
  if (length <= 120) return steps[0];
  if (length <= 220) return steps[1];
  return steps[2];
};

export const fitText = (source: string, opts: FitOptions): Fitted => {
  const maxChars = opts.maxChars ?? ELLIPSIS_AT;
  let text = source.length > maxChars ? cutAtWord(source, maxChars) : source;
  let truncated = text !== source;
  const fits = (t: string, size: number): boolean =>
    estimateLines(t, size, opts.width, opts.avgCharEm) * size * opts.lineHeight <= opts.height;

  let fontSize = stepFor(text.length, opts.steps);
  // Lower the size in 2 px steps down to the minimum while the estimate overflows.
  while (!fits(text, fontSize) && fontSize - 2 >= opts.min) fontSize -= 2;
  // Still too tall at the minimum size: cut more text (never below 60 chars).
  let cap = text.length;
  while (!fits(text, fontSize) && cap > 60) {
    cap = Math.floor(cap * 0.85);
    text = cutAtWord(source, cap);
    truncated = true;
  }
  return { text, fontSize, truncated, estimatedLines: estimateLines(text, fontSize, opts.width, opts.avgCharEm) };
};

/**
 * French typography for rendering only: non-breaking spaces inside « » and before ; : ! ? »
 * so a guillemet or a punctuation mark never starts a line. Whitespace-only change,
 * consistent with data/LICENSE ("normalisation Unicode NFC et espaces uniquement").
 */
export const frenchSpaces = (text: string): string =>
  text
    .replace(/«\s/gu, '« ')
    .replace(/\s»/gu, ' »')
    .replace(/\s([;:!?])/gu, ' $1');

/** og:description must stay ≤ 200 chars and remain verbatim up to the cut. */
export const describe = (text: string): string => cutAtWord(text, 200);
