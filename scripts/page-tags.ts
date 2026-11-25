/**
 * The tags of a built page, read as a browser reads them (review 17: Q6, Q12, Q27). Patterns
 * over the raw text missed what a browser fetches or sends: a value in single quotes or in
 * none, a « > » inside a quoted value, `name ="…"`, `//host`, `srcset`, an SVG image, a
 * `ping`, CSS `url()` and `@import`. Pure: used by scripts/check-build.test.ts on every page of
 * every build.
 */

export interface Tag {
  /** The element's name, in lower case. */
  name: string;
  /** Its attributes, names in lower case, values with their entities decoded; the first wins. */
  attrs: ReadonlyMap<string, string>;
}

const NAMED: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** The character references of an attribute value, as the parser resolves them. */
export function decodeEntities(value: string): string {
  return value.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, code: string) => {
    if (code.startsWith('#')) {
      const number =
        code[1] === 'x' || code[1] === 'X'
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
      return Number.isInteger(number) && number >= 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : whole;
    }
    return NAMED[code.toLowerCase()] ?? whole;
  });
}

/** The contents of `<script>` and `<style>` are text, not markup: kept out of the way of tags. */
const RAW = /(<(script|style)\b[^>]*>)[\s\S]*?(<\/\2\s*>)/gi;
const TAG =
  /<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** Every start tag of a page, in order. */
export function tagsOf(html: string): Tag[] {
  const markup = html.replace(/<!--[\s\S]*?-->/g, '').replace(RAW, '$1$3');
  const tags: Tag[] = [];
  for (const match of markup.matchAll(TAG)) {
    const attrs = new Map<string, string>();
    for (const attr of (match[2] ?? '').matchAll(ATTR)) {
      const name = (attr[1] ?? '').toLowerCase();
      if (!attrs.has(name)) attrs.set(name, decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? ''));
    }
    tags.push({ name: (match[1] ?? '').toLowerCase(), attrs });
  }
  return tags;
}

/** The CSS a page holds: its `<style>` elements and every `style` attribute. */
export function stylesOf(html: string): string[] {
  const blocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(
    (match) => match[1] ?? '',
  );
  const inline = tagsOf(html).flatMap((tag) => {
    const style = tag.attrs.get('style');
    return style === undefined ? [] : [style];
  });
  return [...blocks, ...inline];
}

/** What a stylesheet asks for: every `url()` and every `@import`. */
export function cssUrls(css: string): string[] {
  const found: string[] = [];
  for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]*))\s*\)/gi)) {
    found.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  for (const match of css.matchAll(/@import\s+(?:"([^"]*)"|'([^']*)')/gi)) {
    found.push(match[1] ?? match[2] ?? '');
  }
  return found;
}

/** The relations under which a browser fetches, or connects to, what a `<link>` names. */
const FETCHING = new Set([
  'stylesheet',
  'preload',
  'modulepreload',
  'prefetch',
  'preconnect',
  'dns-prefetch',
  'prerender',
  'icon',
  'shortcut',
  'apple-touch-icon',
  'apple-touch-icon-precomposed',
  'mask-icon',
  'manifest',
]);

/** The tokens of a space-separated attribute (`rel`, `ping`), in lower case. */
export function tokensOf(value: string | undefined): string[] {
  return (value ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token !== '');
}

/**
 * Every address a tag makes the browser fetch, connect to or send to without a click on a link
 * — and `<base>`, which changes where every other one goes. A link's own `href` is not one: a
 * click is the visitor's.
 */
export function fetchedBy(tag: Tag): string[] {
  const urls: string[] = [];
  const add = (value: string | undefined): void => {
    if (value !== undefined && value.trim() !== '') urls.push(value.trim());
  };
  for (const name of ['src', 'poster', 'background', 'xlink:href']) add(tag.attrs.get(name));
  if (tag.name === 'object') add(tag.attrs.get('data'));
  for (const name of ['srcset', 'imagesrcset']) {
    for (const candidate of (tag.attrs.get(name) ?? '').split(',')) {
      add(candidate.trim().split(/\s+/)[0]);
    }
  }
  // `ping` is sent with the click, to every address it lists: a beacon, not the visitor's.
  for (const target of (tag.attrs.get('ping') ?? '').split(/\s+/)) add(target);
  if (tag.name === 'link' && tokensOf(tag.attrs.get('rel')).some((rel) => FETCHING.has(rel))) {
    add(tag.attrs.get('href'));
  }
  if (['base', 'image', 'use', 'feimage', 'script'].includes(tag.name)) add(tag.attrs.get('href'));
  return urls;
}

/** Where a page is read from, for the addresses it names: nothing but our own origin is this one. */
export const PAGE_ORIGIN = 'https://page.invalid';

/**
 * The address a value names on a page, or null for one that names no network (`data:`, a
 * fragment). Anything that leaves the page's origin — `https://…`, `//host`, `HTTPS://…` —
 * resolves to another origin than PAGE_ORIGIN.
 */
export function resolvedFrom(page: string, value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value, `${PAGE_ORIGIN}/${page}`);
  } catch {
    return null;
  }
  return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
}
