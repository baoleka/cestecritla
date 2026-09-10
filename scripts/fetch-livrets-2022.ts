/**
 * Fetch the 2022 pedagogical side-corpus of "L'Avenir en commun" from melenchon2027.fr:
 *   - the 2022 thematic booklets ("livrets thématiques", /livrets-2022/<slug>/)
 *   - the 2022 plans ("plans", /plans-2022/<slug>/)
 *   - the 2022 FALC edition (Facile À Lire et à Comprendre, /laec-falc/)
 *
 * This corpus is NOT the 2025 programme. It is stored as verbatim text, clearly marked as
 * edition 2022, and is only meant as pedagogical context for writing the glossary.
 *
 * Sources: WordPress REST API (wp/v2/pages) plus one HTML fetch of the FALC page to confirm
 * its structure. Crawl is polite: explicit User-Agent, concurrency <= 4, one pass, at most
 * 2 retries with backoff. ng.melenchon2027.fr is never contacted and no URL pattern is guessed.
 *
 * License of the source texts: CC BY-NC-SA 4.0, attribution
 * "La France insoumise – L'Avenir en commun" (https://melenchon2027.fr/programme2025/livre/).
 *
 * Usage: npx tsx scripts/fetch-livrets-2022.ts
 * Outputs: data/livrets-2022.json, data/falc-2022.json
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, HTMLElement, NodeType, type Node } from 'node-html-parser';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE = 'https://melenchon2027.fr';
const PAGES_API = `${SITE}/wp-json/wp/v2/pages`;
const PAGES_FIELDS = 'id,slug,link,title,parent,date,modified,content';
const FALC_URL = `${SITE}/laec-falc/`;
const USER_AGENT = 'cestecritla/0.1 (+https://github.com/baoleka/cestecritla)';
const MAX_CONCURRENCY = 4;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [1000, 3000] as const;
const REQUEST_TIMEOUT_MS = 30_000;

const EDITION = 2022;
const STATUS_FR =
  'Contexte pédagogique 2022 : chiffres et mesures périmés, ne jamais citer comme le programme 2025';
const LICENSE = 'CC BY-NC-SA 4.0';
const ATTRIBUTION = 'La France insoumise – L’Avenir en commun';
const ATTRIBUTION_URL = 'https://melenchon2027.fr/programme2025/livre/';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WpRendered {
  rendered: string;
}

interface WpPage {
  id: number;
  slug: string;
  link: string;
  title: WpRendered;
  parent: number;
  date: string;
  modified: string;
  content: WpRendered;
}

type ItemKind = 'livret' | 'plan';

interface CorpusItem {
  kind: ItemKind;
  id: number;
  slug: string;
  url: string;
  title: string;
  date: string;
  modified: string;
  text: string;
  word_count: number;
  headings: string[];
}

interface CorpusMeta {
  source: { site: string; pages_api: string; falc_page: string };
  fetched_at: string;
  edition: typeof EDITION;
  status_fr: string;
  license: string;
  attribution: string;
  attribution_url: string;
  user_agent: string;
}

interface LivretsFile {
  meta: CorpusMeta & { counts: { livrets: number; plans: number } };
  items: CorpusItem[];
}

interface FalcChapter {
  order: number;
  chapter_number: number | null;
  slug: string;
  url: string;
  title: string;
  text: string;
  word_count: number;
}

interface FalcFile {
  meta: CorpusMeta & {
    page_id: number;
    page_title: string;
    date: string;
    modified: string;
    structure: string;
    counts: { chapters: number; numbered_chapters: number };
  };
  chapters: FalcChapter[];
}

/** Intermediate representation of extracted content, in document order. */
type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; text: string }
  | { kind: 'table'; text: string }
  | { kind: 'quote'; text: string };

// ---------------------------------------------------------------------------
// Polite HTTP
// ---------------------------------------------------------------------------

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal semaphore to cap concurrent requests. */
class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active += 1;
  }

  release(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) next();
  }
}

const semaphore = new Semaphore(MAX_CONCURRENCY);

function isRetriable(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

/** Fetch with User-Agent, timeout, bounded concurrency and at most MAX_RETRIES retries. */
async function politeFetch(url: string): Promise<Response> {
  if (new URL(url).hostname === 'ng.melenchon2027.fr') {
    throw new Error(`Refusing to contact ng.melenchon2027.fr: ${url}`);
  }
  await semaphore.acquire();
  try {
    let lastError: unknown = undefined;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      if (attempt > 0) {
        const backoff = RETRY_BACKOFF_MS[attempt - 1] ?? RETRY_BACKOFF_MS[1];
        console.error(
          `  retry ${String(attempt)}/${String(MAX_RETRIES)} in ${String(backoff)}ms: ${url}`,
        );
        await sleep(backoff);
      }
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, text/html;q=0.9' },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (response.ok) return response;
        lastError = new Error(`HTTP ${String(response.status)} for ${url}`);
        if (!isRetriable(response.status)) break;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Fetch failed: ${url}`);
  } finally {
    semaphore.release();
  }
}

function isWpPage(value: unknown): value is WpPage {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const rendered = (r: unknown): boolean =>
    typeof r === 'object' &&
    r !== null &&
    typeof (r as Record<string, unknown>)['rendered'] === 'string';
  return (
    typeof v['id'] === 'number' &&
    typeof v['slug'] === 'string' &&
    typeof v['link'] === 'string' &&
    typeof v['parent'] === 'number' &&
    typeof v['date'] === 'string' &&
    typeof v['modified'] === 'string' &&
    rendered(v['title']) &&
    rendered(v['content'])
  );
}

/** Paginate wp/v2/pages until X-WP-TotalPages is reached. */
async function fetchAllPages(): Promise<WpPage[]> {
  const pages: WpPage[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = `${PAGES_API}?per_page=100&_fields=${PAGES_FIELDS}&page=${String(page)}`;
    console.error(`GET ${url}`);
    const response = await politeFetch(url);
    totalPages = Number.parseInt(response.headers.get('x-wp-totalpages') ?? '1', 10) || 1;
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error('Unexpected REST payload: not an array');
    for (const entry of body) {
      if (!isWpPage(entry)) throw new Error('Unexpected REST payload: malformed page entry');
      pages.push(entry);
    }
    page += 1;
  } while (page <= totalPages);
  return pages;
}

// ---------------------------------------------------------------------------
// HTML -> text
// ---------------------------------------------------------------------------

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const PARAGRAPH_TAGS = new Set(['p', 'figcaption', 'cite', 'pre', 'dt', 'dd', 'address']);
const CONTAINER_TAGS = new Set([
  'div',
  'section',
  'article',
  'main',
  'aside',
  'header',
  'footer',
  'figure',
  'details',
  'summary',
  'dl',
  'body',
  'html',
]);

/** Elements that are never part of the readable text (media, navigation, chrome). */
const DROP_SELECTORS = [
  'script',
  'style',
  'noscript',
  'template',
  'iframe',
  'img',
  'svg',
  'video',
  'audio',
  'canvas',
  'form',
  'button',
  'nav',
  '.wp-block-buttons',
  '.wp-block-embed__wrapper',
  '.elementor-widget-button',
  '.elementor-widget-table-of-contents',
  '.elementor-toc__body',
];

/** Normalize whitespace on each line, keeping newlines produced by <br>. */
function normalizeInline(raw: string): string {
  return raw
    .split('\n')
    .map((line) =>
      line
        .replace(/[\u00a0\u202f\u2009]/g, ' ')
        .replace(/[ \t\r\f\v]+/g, ' ')
        .trim(),
    )
    .filter((line, index, lines) => line.length > 0 || (index > 0 && index < lines.length - 1))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

function tagOf(el: HTMLElement): string {
  return el.rawTagName.toLowerCase();
}

/**
 * Inline text of a node: text nodes are entity-decoded, <br> becomes a newline, nested
 * block elements in `stop` are skipped (they are rendered separately by the caller).
 */
function inlineText(node: Node, stop: ReadonlySet<string>): string {
  if (node.nodeType === NodeType.TEXT_NODE) return node.text;
  if (!isElement(node)) return '';
  const tag = tagOf(node);
  if (tag === 'br') return '\n';
  if (stop.has(tag)) return '';
  return node.childNodes.map((child) => inlineText(child, stop)).join('');
}

const LIST_TAGS = new Set(['ul', 'ol']);

function renderList(list: HTMLElement, depth: number, lines: string[]): void {
  const ordered = tagOf(list) === 'ol';
  let index = 0;
  for (const child of list.childNodes) {
    if (!isElement(child)) continue;
    const tag = tagOf(child);
    if (tag !== 'li') {
      // Malformed nesting (a list directly inside a list): render it one level deeper.
      if (LIST_TAGS.has(tag)) renderList(child, depth + 1, lines);
      continue;
    }
    index += 1;
    const own = normalizeInline(inlineText(child, LIST_TAGS));
    const marker = ordered ? `${String(index)}.` : '-';
    if (own.length > 0) {
      const indent = '  '.repeat(depth);
      const continuation = `${indent}  `;
      lines.push(`${indent}${marker} ${own.split('\n').join(`\n${continuation}`)}`);
    }
    for (const nested of child.childNodes) {
      if (isElement(nested) && LIST_TAGS.has(tagOf(nested))) renderList(nested, depth + 1, lines);
    }
  }
}

function renderTable(table: HTMLElement): string {
  const rows: string[] = [];
  for (const tr of table.querySelectorAll('tr')) {
    const cells = tr.childNodes
      .filter(isElement)
      .filter((cell) => tagOf(cell) === 'td' || tagOf(cell) === 'th')
      .map((cell) => normalizeInline(inlineText(cell, new Set())).split('\n').join(' '));
    const row = cells.join(' | ').trim();
    if (row.length > 0) rows.push(row);
  }
  return rows.join('\n');
}

/**
 * Walk an element in document order and emit blocks. Inline runs that are not wrapped in a
 * paragraph (loose text inside a div) are emitted as paragraphs too.
 */
function collectBlocks(root: HTMLElement, blocks: Block[]): void {
  let buffer = '';
  const flush = (): void => {
    const text = normalizeInline(buffer);
    if (text.length > 0) blocks.push({ kind: 'paragraph', text });
    buffer = '';
  };

  for (const node of root.childNodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      buffer += node.text;
      continue;
    }
    if (!isElement(node)) continue;
    const tag = tagOf(node);

    if (HEADING_TAGS.has(tag)) {
      flush();
      const text = normalizeInline(inlineText(node, new Set())).split('\n').join(' ');
      if (text.length > 0) blocks.push({ kind: 'heading', level: Number(tag.slice(1)), text });
    } else if (PARAGRAPH_TAGS.has(tag)) {
      flush();
      const text = normalizeInline(inlineText(node, new Set()));
      if (text.length > 0) blocks.push({ kind: 'paragraph', text });
    } else if (LIST_TAGS.has(tag)) {
      flush();
      const lines: string[] = [];
      renderList(node, 0, lines);
      if (lines.length > 0) blocks.push({ kind: 'list', text: lines.join('\n') });
    } else if (tag === 'table') {
      flush();
      const text = renderTable(node);
      if (text.length > 0) blocks.push({ kind: 'table', text });
    } else if (tag === 'blockquote') {
      flush();
      const inner: Block[] = [];
      collectBlocks(node, inner);
      const text = inner
        .map((b) => blockToText(b))
        .join('\n\n')
        .split('\n')
        .map((line) => (line.length > 0 ? `> ${line}` : '>'))
        .join('\n');
      if (inner.length > 0) blocks.push({ kind: 'quote', text });
    } else if (CONTAINER_TAGS.has(tag)) {
      flush();
      collectBlocks(node, blocks);
    } else if (tag === 'hr') {
      flush();
    } else {
      // Inline element (strong, em, a, span, sup, sub, br, ...)
      buffer += inlineText(node, new Set());
    }
  }
  flush();
}

function blockToText(block: Block): string {
  return block.kind === 'heading' ? `${'#'.repeat(block.level)} ${block.text}` : block.text;
}

function blocksToText(blocks: Block[]): string {
  return blocks.map(blockToText).join('\n\n').trim();
}

function parseContent(html: string): HTMLElement {
  const root = parse(html, { blockTextElements: { script: true, style: true, pre: true } });
  for (const selector of DROP_SELECTORS) {
    for (const el of root.querySelectorAll(selector)) el.remove();
  }
  return root;
}

function extractBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  collectBlocks(parseContent(html), blocks);
  return blocks;
}

/** Count tokens containing at least one letter or digit. */
function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

function cleanTitle(rendered: string): string {
  return normalizeInline(parse(rendered).text).split('\n').join(' ');
}

function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Livrets & plans
// ---------------------------------------------------------------------------

function classify(page: WpPage): ItemKind | null {
  const pathname = new URL(page.link).pathname;
  // Section index pages (/livrets-2022/, /plans-2022/) are navigation hubs, not content.
  if (pathname === '/livrets-2022/' || pathname === '/plans-2022/') return null;
  if (pathname.startsWith('/livrets-2022/')) return 'livret';
  if (pathname.startsWith('/plans-2022/')) return 'plan';
  return null;
}

function buildItem(page: WpPage, kind: ItemKind): CorpusItem {
  const blocks = extractBlocks(page.content.rendered);
  const text = blocksToText(blocks);
  return {
    kind,
    id: page.id,
    slug: decodeSlug(page.slug),
    url: page.link,
    title: cleanTitle(page.title.rendered),
    date: page.date,
    modified: page.modified,
    text,
    word_count: countWords(text),
    headings: blocks.filter((b) => b.kind === 'heading').map(blockToText),
  };
}

// ---------------------------------------------------------------------------
// FALC
// ---------------------------------------------------------------------------

/**
 * Discover the FALC structure. Any sub-page (REST child of the FALC page, or an in-page link to
 * /laec-falc/<something>/) would mean the edition is split across pages; the verified 2026
 * structure is a single Elementor page whose chapters are <h2> headings, so we refuse to guess
 * an untested layout and fail loudly instead.
 */
async function discoverFalcSubPages(falcPage: WpPage, allPages: WpPage[]): Promise<string[]> {
  const found = new Set<string>();
  for (const page of allPages) {
    if (page.parent === falcPage.id) found.add(page.link);
  }
  console.error(`GET ${FALC_URL}`);
  const response = await politeFetch(FALC_URL);
  const html = await response.text();
  for (const anchor of parse(html).querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') ?? '';
    let resolved: URL;
    try {
      resolved = new URL(href, FALC_URL);
    } catch {
      continue;
    }
    if (resolved.hostname !== new URL(SITE).hostname) continue;
    if (resolved.pathname.startsWith('/laec-falc/') && resolved.pathname !== '/laec-falc/') {
      found.add(resolved.href);
    }
  }
  return [...found];
}

function splitFalcChapters(falcPage: WpPage): FalcChapter[] {
  const blocks = extractBlocks(falcPage.content.rendered);
  const sections: Array<{ title: string; blocks: Block[] }> = [];
  let preambleTitle = cleanTitle(falcPage.title.rendered);
  let current: { title: string; blocks: Block[] } | null = null;

  for (const block of blocks) {
    if (block.kind === 'heading' && block.level === 1) {
      // Page banner titles (h1) name the preamble, they are not chapters.
      preambleTitle = block.text;
      continue;
    }
    if (block.kind === 'heading' && block.level === 2) {
      current = { title: block.text, blocks: [] };
      sections.push(current);
      continue;
    }
    if (current === null) {
      current = { title: preambleTitle, blocks: [] };
      sections.push(current);
    }
    current.blocks.push(block);
  }

  const chapters: FalcChapter[] = [];
  let order = 0;
  for (const section of sections) {
    const text = blocksToText(section.blocks);
    const wordCount = countWords(text);
    if (wordCount === 0) {
      console.error(`  FALC: dropping empty section "${section.title}"`);
      continue;
    }
    const numberMatch = /^(\d+)\s*\.\s*/.exec(section.title);
    const chapterNumber = numberMatch?.[1] !== undefined ? Number(numberMatch[1]) : null;
    chapters.push({
      order,
      chapter_number: chapterNumber,
      slug: slugify(section.title),
      url: falcPage.link,
      title: section.title,
      text,
      word_count: wordCount,
    });
    order += 1;
  }
  return chapters;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const fetchedAt = new Date().toISOString();
  const allPages = await fetchAllPages();
  console.error(`fetched ${String(allPages.length)} pages from the REST API`);

  const anomalies: string[] = [];
  const items: CorpusItem[] = [];
  for (const page of allPages) {
    const kind = classify(page);
    if (kind === null) continue;
    const html = page.content.rendered;
    const media = (html.match(/<(iframe|img)\b/g) ?? []).length;
    const item = buildItem(page, kind);
    if (media > 0) {
      anomalies.push(
        `${kind} ${item.slug}: ${String(media)} embedded media element(s) (img/iframe) dropped`,
      );
    }
    if (item.word_count < 200) {
      anomalies.push(`${kind} ${item.slug}: short text (${String(item.word_count)} words)`);
    }
    items.push(item);
  }
  items.sort((a, b) => a.kind.localeCompare(b.kind) || a.slug.localeCompare(b.slug, 'fr'));

  const indexPages = allPages.filter((p) =>
    ['/livrets-2022/', '/plans-2022/'].includes(new URL(p.link).pathname),
  );
  for (const p of indexPages) anomalies.push(`index page excluded: ${p.link}`);

  const slugsByKind = new Map<string, ItemKind[]>();
  for (const item of items)
    slugsByKind.set(item.slug, [...(slugsByKind.get(item.slug) ?? []), item.kind]);
  for (const [slug, kinds] of slugsByKind) {
    if (kinds.length > 1) anomalies.push(`slug "${slug}" exists as both ${kinds.join(' and ')}`);
  }

  const falcPage = allPages.find((p) => new URL(p.link).pathname === '/laec-falc/');
  if (falcPage === undefined) throw new Error('FALC page not found in the REST listing');
  const subPages = await discoverFalcSubPages(falcPage, allPages);
  if (subPages.length > 0) {
    throw new Error(
      `FALC structure changed: found ${String(subPages.length)} sub-page(s) (${subPages.join(', ')}). Adapt the script before re-running.`,
    );
  }
  const chapters = splitFalcChapters(falcPage);
  const numbered = chapters.filter((c) => c.chapter_number !== null);
  const numbers = numbered.map((c) => c.chapter_number ?? 0);
  for (let n = 1; n <= Math.max(0, ...numbers); n += 1) {
    if (!numbers.includes(n)) anomalies.push(`FALC: chapter ${String(n)} missing`);
  }
  for (const chapter of chapters) {
    if (chapter.chapter_number === null) {
      anomalies.push(
        `FALC: unnumbered section kept as order ${String(chapter.order)}: "${chapter.title}" (${String(chapter.word_count)} words)`,
      );
    }
  }

  const meta: CorpusMeta = {
    source: { site: SITE, pages_api: PAGES_API, falc_page: FALC_URL },
    fetched_at: fetchedAt,
    edition: EDITION,
    status_fr: STATUS_FR,
    license: LICENSE,
    attribution: ATTRIBUTION,
    attribution_url: ATTRIBUTION_URL,
    user_agent: USER_AGENT,
  };

  const livrets = items.filter((i) => i.kind === 'livret');
  const plans = items.filter((i) => i.kind === 'plan');

  const livretsFile: LivretsFile = {
    meta: { ...meta, counts: { livrets: livrets.length, plans: plans.length } },
    items,
  };
  const falcFile: FalcFile = {
    meta: {
      ...meta,
      page_id: falcPage.id,
      page_title: cleanTitle(falcPage.title.rendered),
      date: falcPage.date,
      modified: falcPage.modified,
      structure:
        'Page Elementor unique : chapitres = titres <h2> (22 numérotés + introduction, avis d’experts, financement), sous-parties = <h3>. Aucune sous-page.',
      counts: { chapters: chapters.length, numbered_chapters: numbered.length },
    },
    chapters,
  };

  await mkdir(DATA_DIR, { recursive: true });
  const livretsPath = path.join(DATA_DIR, 'livrets-2022.json');
  const falcPath = path.join(DATA_DIR, 'falc-2022.json');
  await writeFile(livretsPath, `${JSON.stringify(livretsFile, null, 2)}\n`, 'utf8');
  await writeFile(falcPath, `${JSON.stringify(falcFile, null, 2)}\n`, 'utf8');

  const sum = (list: Array<{ word_count: number }>): number =>
    list.reduce((acc, x) => acc + x.word_count, 0);
  const dates = items.map((i) => i.date).sort();
  const modified = items.map((i) => i.modified).sort();
  const summary = {
    files: [livretsPath, falcPath],
    counts: {
      livrets: livrets.length,
      plans: plans.length,
      falc_chapters: numbered.length,
      falc_sections_total: chapters.length,
      total_words_livrets: sum(livrets),
      total_words_plans: sum(plans),
      total_words_falc: sum(chapters),
    },
    date_range: {
      first_published: dates[0] ?? null,
      last_published: dates[dates.length - 1] ?? null,
      last_modified: modified[modified.length - 1] ?? null,
      falc_page: { date: falcPage.date, modified: falcPage.modified },
    },
    sample_titles: {
      livrets: livrets.slice(0, 5).map((i) => i.title),
      plans: plans.slice(0, 5).map((i) => i.title),
    },
    falc_chapters: chapters.map(
      (c) =>
        `${String(c.order)}|${String(c.chapter_number ?? '-')}|${c.title}|${String(c.word_count)}`,
    ),
    anomalies,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
