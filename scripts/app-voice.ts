/**
 * Telling the app's voice from the programme's, on a BUILT page.
 *
 * Several gates judge what the app itself asserts — "no mention of an AI", the ban list — and
 * they would all be red from the first build if they read the programme's words as ours: the
 * 2026 edition has a section titled "Mettre l'intelligence artificielle au service de
 * l'émancipation collective". The answer is not to weaken those gates but to scope them, and to
 * make the scope a property of the markup rather than of a list of exceptions.
 *
 * The programme reaches a page through marked surfaces only:
 *   <figure class="verbatim">…</figure>     an incipit or a quotation (src/components/Quote.astro)
 *   any element carrying data-programme     an official title, wherever it stands
 *   <title>, description / og: meta         may carry an official title
 *   JSON-LD                                 carries official titles and addresses
 * Everything left is us.
 *
 * A marked element never contains another element of the same tag (a span in a span): that is
 * what lets a regular expression find its end. scripts/site.test.ts checks it on every page.
 */

const MARKED = /<([a-z][a-z0-9]*)\b[^>]*\bdata-programme="[^"]*"[^>]*>[\s\S]*?<\/\1>/g;

export function appVoiceOnly(html: string): string {
  return html
    .replace(/<figure class="verbatim"[\s\S]*?<\/figure>/g, ' ')
    .replace(MARKED, ' ')
    .replace(/<script type="application\/(?:ld\+)?json"[\s\S]*?<\/script>/g, ' ')
    .replace(/<title>[\s\S]*?<\/title>/gi, ' ')
    .replace(
      /<meta\b[^>]*\b(?:name|property)=["'](?:description|og:[a-z:_]+|twitter:[a-z:]+)["'][^>]*>/gi,
      ' ',
    );
}

/** The words a reader sees in a fragment of HTML: tags, styles and scripts removed. */
export function visibleText(html: string): string {
  return html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export const countWords = (text: string): number =>
  text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;

export interface ProgrammeBlock {
  kind: string;
  /** Text of the blockquote: the programme's words, as printed. */
  quoted: string;
  /** The whole figure, to check its attribution and its link. */
  html: string;
}

/** Every incipit and quotation printed on a page. */
export function programmeBlocks(html: string): ProgrammeBlock[] {
  return [
    ...html.matchAll(/<figure class="verbatim"[^>]*\bdata-programme="([a-z]+)"[\s\S]*?<\/figure>/g),
  ].map((m) => ({
    kind: m[1] ?? '',
    quoted: visibleText(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/.exec(m[0])?.[1] ?? ''),
    html: m[0],
  }));
}
