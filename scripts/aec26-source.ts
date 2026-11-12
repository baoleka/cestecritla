/**
 * Reading the pages of the 2026 edition: pure functions, no network, no file written.
 *
 * `scripts/crawl-2026.ts` fetches the pages once and stores them under private/html/<stamp>/;
 * everything here turns a stored page into structure. Keeping the two apart is what lets the
 * parser, the verifier and the tests run a thousand times for one visit to the source.
 *
 * The markup read here is the one observed on 12/11/2026 (docs/discovery/captures/2026-11-12/):
 *
 *   landing   main.livre > nav.tdm > div.partie.<slug> > (h2 > a) + a*
 *   part      main.partie.<slug> > h2 + p.wp-block-paragraph + table of contents
 *   chapter   main.chapitre.<part-slug> > header (h2, h1#chapitreK) + div.chapitre_sections
 *               > section > h3.section-title[id], then in any order p.wp-block-paragraph+,
 *                           div.mesure-cle? and ul.wp-block-list > (li.mesure
 *                           | li > ul.wp-block-list > li.sous_mesure)*
 *   intro     main.introduction > h1 + (h2.wp-block-heading | p.wp-block-paragraph)*
 *
 * Every function fails loudly on anything it does not recognise. A parser that shrugs at an
 * unknown element publishes a truncated programme in silence; one that stops costs a morning.
 */
import { NodeType, parse, type HTMLElement, type Node } from 'node-html-parser';
import { normalizeText } from './aec-common.js';
import type { Kind26 } from './aec26-types.js';

export const BOOK_PATH_2026 = '/programme/livre/';
export const FEED_PATH_2026 = '/feed/?post_type=lfi_programme_2026';
export const CRAWL_ROOT = 'private/html';

export interface FetchedPage {
  id: string;
  url: string;
  file: string;
  status: number;
  bytes: number;
  sha256: string;
  fetched_at: string;
  headers: Record<string, string>;
}

export interface FetchLog {
  stamp: string;
  started_at: string;
  finished_at: string;
  user_agent: string;
  requests: number;
  retries: number;
  pages: FetchedPage[];
}

/** `User-agent: *` rules only: enough to honour a plain "keep out of the book". */
export function robotsDisallows(robots: string, path: string): boolean {
  let applies = false;
  for (const raw of robots.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    const [field, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (field === undefined || value === '') continue;
    if (/^user-agent$/i.test(field)) applies = value === '*';
    else if (applies && /^disallow$/i.test(field) && path.startsWith(value)) return true;
  }
  return false;
}

export interface TocEntry {
  id: string;
  path: string;
  title: string;
}

export interface Toc {
  introduction: TocEntry;
  parts: (TocEntry & { slug: string; chapters: (TocEntry & { number: number })[] })[];
}

/**
 * The table of contents is the only source of URLs: `main.livre nav.tdm > div.partie`, each
 * with an `h2 > a` (the part) followed by direct `a` children (its chapters).
 */
export function parseToc(html: string): Toc {
  const nav = parse(html).querySelector('main.livre nav.tdm');
  if (nav === null) throw new Error('landing: no main.livre nav.tdm');
  const blocks = nav.querySelectorAll(':scope > div.partie');
  let introduction: TocEntry | undefined;
  const parts: Toc['parts'] = [];
  for (const block of blocks) {
    const head = block.querySelector(':scope > h2 > a');
    const href = head?.getAttribute('href');
    if (head === null || href === undefined) throw new Error('landing: part block without h2 > a');
    if (!href.startsWith(BOOK_PATH_2026))
      throw new Error(`landing: link outside the book: ${href}`);
    const slug = href.slice(BOOK_PATH_2026.length).replace(/\/$/, '');
    const title = normalizeText(head.text);
    if (slug === 'introduction') {
      introduction = { id: 'p0', path: href, title };
      continue;
    }
    if (slug === '' || slug.includes('/')) throw new Error(`landing: unexpected part link ${href}`);
    const partId = `p${String(parts.length + 1)}`;
    const chapters = block.querySelectorAll(':scope > a').map((a, index) => {
      const chapterHref = a.getAttribute('href') ?? '';
      const m = new RegExp(`^${BOOK_PATH_2026}${slug}/chapitre(\\d{1,2})/?$`).exec(chapterHref);
      if (m === null) throw new Error(`landing: unexpected chapter link ${chapterHref}`);
      const number = Number(m[1]);
      if (number !== index + 1) {
        throw new Error(`landing: chapters of ${slug} are not numbered 1..n in order`);
      }
      return {
        id: `${partId}c${String(number)}`,
        path: chapterHref,
        title: normalizeText(a.text),
        number,
      };
    });
    if (chapters.length === 0) throw new Error(`landing: part ${slug} lists no chapter`);
    parts.push({ id: partId, path: href, title, slug, chapters });
  }
  if (introduction === undefined) throw new Error('landing: no introduction link');
  if (parts.length === 0) throw new Error('landing: no part');
  return { introduction, parts };
}

// ---------------------------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------------------------

export class ParseError26 extends Error {
  constructor(source: string, message: string) {
    super(`${source}: ${message}`);
    this.name = 'ParseError26';
  }
}

const isElement = (node: Node): node is HTMLElement => node.nodeType === NodeType.ELEMENT_NODE;

/** Element children; a stray text node between them is an error, never something to skip. */
function elementChildren(parent: HTMLElement, source: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const child of parent.childNodes) {
    if (isElement(child)) out.push(child);
    else if (child.text.trim() !== '') {
      // The length, never the words: a parser error must not be a way for the text to get out.
      throw new ParseError26(
        source,
        `unexpected text node of ${String(child.text.trim().length)} characters`,
      );
    }
  }
  return out;
}

const classesOf = (el: HTMLElement): string[] =>
  (el.getAttribute('class') ?? '').split(/\s+/).filter((c) => c !== '');

const signature = (el: HTMLElement): string => [el.rawTagName, ...classesOf(el)].join('.');

function requireOne(root: HTMLElement, selector: string, source: string): HTMLElement {
  const found = root.querySelectorAll(selector);
  const first = found[0];
  if (found.length !== 1 || first === undefined) {
    throw new ParseError26(
      source,
      `expected exactly 1 "${selector}", found ${String(found.length)}`,
    );
  }
  return first;
}

/** What the source wrote, before any normalisation — and before its nested list, for an `li`. */
function ownRaw(el: HTMLElement): string {
  return el.childNodes
    .filter((n) => !(isElement(n) && (n.rawTagName === 'ul' || n.rawTagName === 'ol')))
    .map((n) => n.text)
    .join('');
}

function inlineOf(el: HTMLElement): string[] {
  const names = new Set<string>();
  const visit = (node: HTMLElement): void => {
    for (const child of node.childNodes) {
      if (!isElement(child) || child.rawTagName === 'ul' || child.rawTagName === 'ol') continue;
      names.add(child.rawTagName);
      visit(child);
    }
  };
  visit(el);
  return [...names].sort();
}

export interface ParsedItem {
  kind: Kind26;
  raw: string;
  inline: string[];
  subs?: ParsedItem[];
}

function item(kind: Kind26, el: HTMLElement, source: string): ParsedItem {
  const raw = ownRaw(el);
  if (normalizeText(raw) === '') throw new ParseError26(source, `empty ${kind}`);
  return { kind, raw, inline: inlineOf(el) };
}

function paragraphs(parent: HTMLElement, source: string): ParsedItem[] {
  return elementChildren(parent, source).map((el) => {
    if (signature(el) !== 'p.wp-block-paragraph') {
      throw new ParseError26(source, `expected p.wp-block-paragraph, found ${signature(el)}`);
    }
    return item('paragraph', el, source);
  });
}

// ---------------------------------------------------------------------------------------------
// Chapter page
// ---------------------------------------------------------------------------------------------

export interface ParsedSection {
  anchor: string;
  title: string;
  /** Document order, exactly as the source interleaves paragraphs, key measure and lists. */
  items: ParsedItem[];
}

export interface ParsedChapter {
  partSlug: string;
  partTitle: string;
  number: number;
  title: string;
  /** The chapter's own paragraphs above its sections (`main > section.chapitre`), if any. */
  intro: ParsedItem[];
  sections: ParsedSection[];
  canonical: string | null;
}

/**
 * A list of measures. Sub-measures are NOT nested inside their measure: the source puts them in
 * a class-less sibling `<li>` whose only child is a list (18 of them on 12/11/2026, 81
 * sub-measures in all):
 *
 *   <li class="mesure">the measure</li>
 *   <li><ul class="wp-block-list"><li class="sous_mesure">…</li>…</ul></li>
 *
 * They are attached to the measure just above — the only reading under which the site's own
 * "1 069 mesures" adds up. The properly nested form has never been observed and is refused, like
 * anything else unseen: accepting it untested would be guessing how the source would write it.
 */
function parseList(ul: HTMLElement, source: string): ParsedItem[] {
  const out: ParsedItem[] = [];
  for (const li of elementChildren(ul, source)) {
    const sig = signature(li);
    if (sig === 'li.mesure') {
      if (li.querySelector('ul, ol') !== null) {
        throw new ParseError26(source, 'a measure with a list nested inside it');
      }
      out.push(item('measure', li, source));
      continue;
    }
    if (sig !== 'li') throw new ParseError26(source, `expected li.mesure, found ${sig}`);

    // The wrapper: one list, no text of its own (elementChildren throws on a stray text node).
    const inner = elementChildren(li, source);
    const list = inner[0];
    if (inner.length !== 1 || list === undefined || signature(list) !== 'ul.wp-block-list') {
      throw new ParseError26(
        source,
        `a class-less li must hold one ul.wp-block-list, found ${inner.map(signature).join(', ')}`,
      );
    }
    const measure = out.at(-1);
    if (measure === undefined) {
      throw new ParseError26(source, 'sub-measures with no measure above them');
    }
    if (measure.subs !== undefined) {
      throw new ParseError26(source, 'two lists of sub-measures for one measure');
    }
    measure.subs = elementChildren(list, source).map((sub) => {
      if (signature(sub) !== 'li.sous_mesure') {
        throw new ParseError26(source, `expected li.sous_mesure, found ${signature(sub)}`);
      }
      if (sub.querySelector('ul, ol') !== null) {
        throw new ParseError26(source, 'a sub-measure with a nested list');
      }
      return item('sub_measure', sub, source);
    });
    if (measure.subs.length === 0) throw new ParseError26(source, 'empty list of sub-measures');
  }
  return out;
}

function parseSection(section: HTMLElement, source: string): ParsedSection {
  const [heading, ...rest] = elementChildren(section, source);
  if (heading === undefined || signature(heading) !== 'h3.section-title') {
    throw new ParseError26(source, 'a section must start with h3.section-title');
  }
  const anchor = heading.getAttribute('id') ?? '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(anchor)) {
    throw new ParseError26(source, `section anchor is not a slug: "${anchor.slice(0, 40)}"`);
  }
  const items: ParsedItem[] = [];
  let keyMeasures = 0;
  for (const el of rest) {
    const sig = signature(el);
    if (sig === 'p.wp-block-paragraph') {
      items.push(item('paragraph', el, `${source}#${anchor}`));
    } else if (sig === 'div.mesure-cle') {
      keyMeasures += 1;
      const inner = elementChildren(el, source);
      const [label, body] = inner;
      if (
        inner.length !== 2 ||
        label === undefined ||
        body === undefined ||
        label.rawTagName !== 'h6' ||
        normalizeText(label.text) !== 'Mesure clé' ||
        body.rawTagName !== 'p'
      ) {
        throw new ParseError26(source, `#${anchor}: div.mesure-cle is not "h6 Mesure clé + p"`);
      }
      // The label is the site's, not the programme's: only the paragraph is the measure.
      items.push(item('key_measure', body, `${source}#${anchor}`));
    } else if (sig === 'ul.wp-block-list') {
      items.push(...parseList(el, `${source}#${anchor}`));
    } else {
      throw new ParseError26(source, `#${anchor}: unknown element ${sig}`);
    }
  }
  if (keyMeasures > 1) throw new ParseError26(source, `#${anchor}: more than one key measure`);
  if (!items.some((i) => i.kind === 'paragraph')) {
    throw new ParseError26(source, `#${anchor}: no paragraph`);
  }
  if (!items.some((i) => i.kind !== 'paragraph')) {
    throw new ParseError26(source, `#${anchor}: no proposition`);
  }
  return { anchor, title: normalizeText(heading.text), items };
}

export function parseChapterPage(html: string, source: string): ParsedChapter {
  const root = parse(html);
  const main = requireOne(root, 'main', source);
  const [kind, partSlug, ...extra] = classesOf(main);
  if (kind !== 'chapitre' || partSlug === undefined || extra.length > 0) {
    throw new ParseError26(source, `main class is "${classesOf(main).join(' ')}"`);
  }
  const children = elementChildren(main, source);
  const header = children[0];
  const wrap = children.at(-1);
  if (header === undefined || wrap === undefined || signature(header) !== 'header') {
    throw new ParseError26(source, 'main must start with a header');
  }
  if (signature(wrap) !== 'div.chapitre_sections') {
    throw new ParseError26(source, 'main must end with div.chapitre_sections');
  }
  // Between the two, at most the chapter's own introduction. Seen on one page of 23 on
  // 12/11/2026 (the Europe chapter): four paragraphs that belong to no section.
  const middle = children.slice(1, -1);
  if (
    middle.length > 1 ||
    (middle[0] !== undefined && signature(middle[0]) !== 'section.chapitre')
  ) {
    throw new ParseError26(
      source,
      `unexpected children of main: ${middle.map(signature).join(', ')}`,
    );
  }
  const intro = middle[0] === undefined ? [] : paragraphs(middle[0], `${source} (chapter intro)`);
  if (middle[0] !== undefined && intro.length === 0) {
    throw new ParseError26(source, 'empty section.chapitre');
  }

  const h1 = requireOne(header, 'h1', source);
  const h2 = requireOne(header, 'h2', source);
  const number = Number(/^chapitre(\d{1,2})$/.exec(h1.getAttribute('id') ?? '')?.[1]);
  if (!Number.isInteger(number) || number < 1) {
    throw new ParseError26(source, `h1 id is "${h1.getAttribute('id') ?? ''}"`);
  }

  const sections = elementChildren(wrap, source).map((el) => {
    if (signature(el) !== 'section') {
      throw new ParseError26(source, `expected section, found ${signature(el)}`);
    }
    return parseSection(el, source);
  });
  if (sections.length === 0) throw new ParseError26(source, 'a chapter with no section');
  const anchors = new Set(sections.map((s) => s.anchor));
  if (anchors.size !== sections.length) throw new ParseError26(source, 'duplicate section anchor');

  return {
    partSlug,
    partTitle: normalizeText(h2.text),
    number,
    title: normalizeText(h1.text),
    intro,
    sections,
    canonical: root.querySelector('link[rel=canonical]')?.getAttribute('href') ?? null,
  };
}

// ---------------------------------------------------------------------------------------------
// Part page and introduction
// ---------------------------------------------------------------------------------------------

export interface ParsedPart {
  slug: string;
  title: string;
  paragraphs: ParsedItem[];
  /** Every link of the part's own table of contents: an independent list of the sections. */
  toc: { chapter: number; anchor: string | null; title: string }[];
  canonical: string | null;
}

export function parsePartPage(html: string, source: string): ParsedPart {
  const root = parse(html);
  const main = requireOne(root, 'main', source);
  const [kind, slug, ...extra] = classesOf(main);
  if (kind !== 'partie' || slug === undefined || extra.length > 0) {
    throw new ParseError26(source, `main class is "${classesOf(main).join(' ')}"`);
  }
  const children = elementChildren(main, source);
  const sigs = children.map(signature).join(' ');
  if (sigs !== 'h2 section nav.tdm a.next' && sigs !== 'h2 section nav.tdm') {
    throw new ParseError26(source, `unexpected children of main: ${sigs}`);
  }
  const [title, body, nav] = children;
  if (title === undefined || body === undefined || nav === undefined) {
    throw new ParseError26(source, 'incomplete part page');
  }
  const prefix = `${BOOK_PATH_2026}${slug}/chapitre`;
  const toc = nav.querySelectorAll('a').map((a) => {
    const href = a.getAttribute('href') ?? '';
    const m = /^(\d{1,2})\/?(?:#(.+))?$/.exec(
      href.startsWith(prefix) ? href.slice(prefix.length) : '',
    );
    if (m === null) throw new ParseError26(source, `unexpected link in the table: ${href}`);
    return { chapter: Number(m[1]), anchor: m[2] ?? null, title: normalizeText(a.text) };
  });
  return {
    slug,
    title: normalizeText(title.text),
    paragraphs: paragraphs(body, source),
    toc,
    canonical: root.querySelector('link[rel=canonical]')?.getAttribute('href') ?? null,
  };
}

export interface ParsedIntroduction {
  title: string;
  /** Headings and paragraphs, in document order. */
  items: ParsedItem[];
  canonical: string | null;
}

export function parseIntroductionPage(html: string, source: string): ParsedIntroduction {
  const root = parse(html);
  const main = requireOne(root, 'main', source);
  if (classesOf(main).join(' ') !== 'introduction') {
    throw new ParseError26(source, `main class is "${classesOf(main).join(' ')}"`);
  }
  const children = elementChildren(main, source);
  const [title, body] = children;
  if (
    children.map(signature).join(' ') !== 'h1 section' ||
    title === undefined ||
    body === undefined
  ) {
    throw new ParseError26(
      source,
      `unexpected children of main: ${children.map(signature).join(' ')}`,
    );
  }
  const items = elementChildren(body, source).map((el) => {
    const sig = signature(el);
    if (sig === 'h2.wp-block-heading') return item('heading', el, source);
    if (sig === 'p.wp-block-paragraph') return item('paragraph', el, source);
    throw new ParseError26(source, `unknown element ${sig}`);
  });
  return {
    title: normalizeText(title.text),
    items,
    canonical: root.querySelector('link[rel=canonical]')?.getAttribute('href') ?? null,
  };
}

// ---------------------------------------------------------------------------------------------
// Whole-page text, for link locators
// ---------------------------------------------------------------------------------------------

/**
 * Every text node of a page except scripts and styles — menus, footer and hidden text included.
 *
 * A text fragment (`#:~:text=…`) is resolved against the whole document and the FIRST match
 * wins. A locator is only safe if its words occur once in all of this, not once in the article.
 */
export function pageTextNodes(html: string): string[] {
  const root = parse(html);
  for (const el of root.querySelectorAll('script, style, template, noscript')) el.remove();
  const out: string[] = [];
  const visit = (node: Node): void => {
    if (isElement(node) || node.nodeType !== NodeType.TEXT_NODE) {
      for (const child of node.childNodes) visit(child);
      return;
    }
    if (node.text !== '') out.push(node.text);
  };
  visit(root);
  return out;
}

/** The count the site announces: "Il compte 1 069 mesures concrètes". Null when it says none. */
export function parseOfficialCount(html: string): number | null {
  const text = pageTextNodes(html).join(' ');
  const m = /(\d[\d\s\u00a0\u202f]{0,8})\s*mesures\b/.exec(text);
  if (m === null) return null;
  const n = Number((m[1] ?? '').replace(/\D/g, ''));
  return Number.isInteger(n) && n > 0 ? n : null;
}
