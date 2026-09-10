/**
 * Fetch the "Idées reçues" posts of desintox.lafranceinsoumise.fr (WordPress REST API)
 * and write data/desintox.json, the raw material for the app's "Riposte" mode.
 *
 * Usage: npx tsx scripts/fetch-desintox.ts
 *
 * Crawling policy (non-negotiable): identified User-Agent, sequential requests,
 * single pass, at most 2 retries with backoff, no URL pattern guessing.
 * Content is stored verbatim (HTML and decoded text); nothing is rewritten.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { HTMLElement, Node, TextNode, parse } from 'node-html-parser';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SITE_URL = 'https://desintox.lafranceinsoumise.fr/';
const API_BASE = 'https://desintox.lafranceinsoumise.fr/wp-json/wp/v2/';
const CATEGORY_SLUG = 'idees-recues';
const EXPECTED_CATEGORY_ID = 19;
const USER_AGENT = 'cestecritla/0.1 (+https://github.com/baoleka/cestecritla)';
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;
const INTER_REQUEST_DELAY_MS = 300;
const PER_PAGE = 100;
const POST_FIELDS = 'id,slug,link,title,date,modified,excerpt,content,categories,tags';
const OUTPUT_PATH = fileURLToPath(new URL('../data/desintox.json', import.meta.url));

const LICENSE_NOTE =
  'Contenu issu de desintox.lafranceinsoumise.fr (droits La France insoumise). ' +
  'À utiliser comme source citée, avec lien vers l’article d’origine. ' +
  'Pas de reproduction intégrale dans l’app sans vérification préalable de la licence.';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number;
}

interface PostRecord {
  id: number;
  slug: string;
  url: string;
  title: string;
  date: string;
  modified: string;
  excerpt_text: string;
  content_text: string;
  content_html: string;
  word_count: number;
  categories: string[];
  tag_ids: number[];
}

interface DesintoxDataset {
  meta: {
    source: string;
    api: string;
    fetched_at: string;
    user_agent: string;
    category: { id: number; name: string };
    posts_total_site: number;
    license_note: string;
  };
  categories: CategoryRecord[];
  posts: PostRecord[];
}

// ---------------------------------------------------------------------------
// WordPress REST API types and runtime validation (no `any`, no blind casts)
// ---------------------------------------------------------------------------

interface WpRendered {
  rendered: string;
}

interface WpCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number;
}

interface WpPost {
  id: number;
  slug: string;
  link: string;
  title: WpRendered;
  date: string;
  modified: string;
  excerpt: WpRendered;
  content: WpRendered;
  categories: number[];
  tags: number[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`${context}: expected string field "${key}"`);
  }
  return value;
}

function requireNumber(record: Record<string, unknown>, key: string, context: string): number {
  const value = record[key];
  if (typeof value !== 'number') {
    throw new Error(`${context}: expected number field "${key}"`);
  }
  return value;
}

function requireNumberArray(
  record: Record<string, unknown>,
  key: string,
  context: string,
): number[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item): item is number => typeof item === 'number')) {
    throw new Error(`${context}: expected number[] field "${key}"`);
  }
  return value;
}

function requireRendered(
  record: Record<string, unknown>,
  key: string,
  context: string,
): WpRendered {
  const value = record[key];
  if (!isRecord(value)) {
    throw new Error(`${context}: expected object field "${key}"`);
  }
  return { rendered: requireString(value, 'rendered', `${context}.${key}`) };
}

function parseCategory(value: unknown): WpCategory {
  if (!isRecord(value)) {
    throw new Error('category: expected an object');
  }
  const context = `category ${String(value['id'])}`;
  return {
    id: requireNumber(value, 'id', context),
    name: requireString(value, 'name', context),
    slug: requireString(value, 'slug', context),
    count: requireNumber(value, 'count', context),
    parent: requireNumber(value, 'parent', context),
  };
}

function parsePost(value: unknown): WpPost {
  if (!isRecord(value)) {
    throw new Error('post: expected an object');
  }
  const context = `post ${String(value['id'])}`;
  return {
    id: requireNumber(value, 'id', context),
    slug: requireString(value, 'slug', context),
    link: requireString(value, 'link', context),
    title: requireRendered(value, 'title', context),
    date: requireString(value, 'date', context),
    modified: requireString(value, 'modified', context),
    excerpt: requireRendered(value, 'excerpt', context),
    content: requireRendered(value, 'content', context),
    categories: requireNumberArray(value, 'categories', context),
    tags: requireNumberArray(value, 'tags', context),
  };
}

function parseArray<T>(value: unknown, parseItem: (item: unknown) => T, context: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${context}: expected a JSON array`);
  }
  return value.map(parseItem);
}

// ---------------------------------------------------------------------------
// Polite HTTP client
// ---------------------------------------------------------------------------

interface ApiResponse {
  body: unknown;
  total: number;
  totalPages: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readCountHeader(response: Response, name: string): number {
  const raw = response.headers.get(name);
  const value = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`missing or invalid header ${name} on ${response.url}`);
  }
  return value;
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function apiGet(path: string, params: Record<string, string>): Promise<ApiResponse> {
  const url = new URL(path, API_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(
        `retry ${String(attempt)}/${String(MAX_RETRIES)} in ${String(delay)} ms: ${url.href}`,
      );
      await sleep(delay);
    }
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${String(response.status)} for ${url.href}`);
        if (isRetryable(response.status)) {
          lastError = error;
          continue;
        }
        throw error;
      }
      const body: unknown = await response.json();
      const result: ApiResponse = {
        body,
        total: readCountHeader(response, 'x-wp-total'),
        totalPages: readCountHeader(response, 'x-wp-totalpages'),
      };
      await sleep(INTER_REQUEST_DELAY_MS);
      return result;
    } catch (error) {
      // Network-level failures (DNS, reset, timeout) are retried; HTTP 4xx are not.
      if (error instanceof Error && error.message.startsWith('HTTP ')) {
        throw error;
      }
      lastError = error;
    }
  }
  throw new Error(`giving up on ${url.href}: ${String(lastError)}`);
}

// ---------------------------------------------------------------------------
// HTML -> text
// ---------------------------------------------------------------------------

/** Elements that open/close a paragraph in the text rendering. */
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'figure',
  'figcaption',
  'table',
  'tr',
  'pre',
  'section',
  'article',
  'header',
  'footer',
  'aside',
]);

/** Elements whose content never belongs in the text rendering. */
const SKIP_TAGS = new Set(['script', 'style', 'iframe', 'noscript', 'svg', 'template']);

/** Sentinel for <br>, resolved into a single newline inside a paragraph. */
const LINE_BREAK = '\u0000';

/**
 * Collapse HTML whitespace (spaces, tabs, newlines) but keep U+00A0 verbatim:
 * French typography relies on non-breaking spaces before « : ; ! ? » and inside guillemets.
 */
function normalizeParagraph(raw: string): string {
  return raw
    .replace(/[ \t\r\n\f\v]+/g, ' ')
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/** The document root reports a null rawTagName at runtime despite the `string` typing. */
function lowerCaseTag(rawTagName: string | null): string {
  return rawTagName?.toLowerCase() ?? '';
}

function extractParagraphs(root: HTMLElement): string[] {
  const paragraphs: string[] = [];
  let buffer = '';
  let pendingPrefix = '';

  const flush = (): void => {
    const text = normalizeParagraph(buffer);
    buffer = '';
    if (text.length === 0) {
      return;
    }
    paragraphs.push(pendingPrefix + text);
    pendingPrefix = '';
  };

  const walk = (node: Node): void => {
    if (node instanceof TextNode) {
      buffer += node.text;
      return;
    }
    if (!(node instanceof HTMLElement)) {
      return; // comments and other node types
    }
    const tag = lowerCaseTag(node.rawTagName);
    if (SKIP_TAGS.has(tag)) {
      return;
    }
    if (tag === 'br') {
      buffer += LINE_BREAK;
      return;
    }
    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) {
      flush();
    }
    if (tag === 'li') {
      pendingPrefix = '- ';
    }
    for (const child of node.childNodes) {
      walk(child);
    }
    if (isBlock) {
      flush();
      pendingPrefix = '';
    }
  };

  walk(root);
  flush();
  return paragraphs;
}

function htmlToText(html: string): string {
  return extractParagraphs(parse(html)).join('\n\n');
}

/** Decode entities and collapse whitespace of a one-line rendered field (title). */
function htmlToInlineText(html: string): string {
  return parse(html).text.replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => token.length > 0).length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function fetchCategories(): Promise<WpCategory[]> {
  const categories: WpCategory[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await apiGet('categories', {
      per_page: String(PER_PAGE),
      page: String(page),
      _fields: 'id,name,slug,count,parent',
    });
    categories.push(...parseArray(response.body, parseCategory, 'categories'));
    totalPages = response.totalPages;
    page += 1;
  } while (page <= totalPages);
  return categories;
}

async function fetchCategoryPosts(categoryId: number): Promise<{ posts: WpPost[]; total: number }> {
  const posts: WpPost[] = [];
  let page = 1;
  let totalPages = 1;
  let total = 0;
  do {
    const response = await apiGet('posts', {
      categories: String(categoryId),
      per_page: String(PER_PAGE),
      page: String(page),
      _fields: POST_FIELDS,
    });
    posts.push(...parseArray(response.body, parsePost, `posts page ${String(page)}`));
    totalPages = response.totalPages;
    total = response.total;
    page += 1;
  } while (page <= totalPages);
  return { posts, total };
}

async function fetchSitePostTotal(): Promise<number> {
  const response = await apiGet('posts', { per_page: '1', _fields: 'id' });
  return response.total;
}

function toPostRecord(post: WpPost, categoryNames: ReadonlyMap<number, string>): PostRecord {
  const contentText = htmlToText(post.content.rendered);
  return {
    id: post.id,
    slug: post.slug,
    url: post.link,
    title: htmlToInlineText(post.title.rendered),
    date: post.date,
    modified: post.modified,
    excerpt_text: htmlToText(post.excerpt.rendered),
    content_text: contentText,
    content_html: post.content.rendered,
    word_count: countWords(contentText),
    categories: post.categories.map((id) => categoryNames.get(id) ?? `#${String(id)}`),
    tag_ids: post.tags,
  };
}

async function main(): Promise<void> {
  const fetchedAt = new Date().toISOString();

  const rawCategories = await fetchCategories();
  const categories: CategoryRecord[] = rawCategories
    .map((category) => ({
      id: category.id,
      name: htmlToInlineText(category.name),
      slug: category.slug,
      count: category.count,
      parent: category.parent,
    }))
    .sort((a, b) => a.id - b.id);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  const target = categories.find((category) => category.slug === CATEGORY_SLUG);
  if (target === undefined) {
    throw new Error(
      `category "${CATEGORY_SLUG}" not found among ${String(categories.length)} categories`,
    );
  }
  if (target.id !== EXPECTED_CATEGORY_ID) {
    console.warn(
      `category "${CATEGORY_SLUG}" has id ${String(target.id)}, expected ${String(EXPECTED_CATEGORY_ID)}`,
    );
  }

  const { posts: rawPosts, total: categoryTotal } = await fetchCategoryPosts(target.id);
  const postsTotalSite = await fetchSitePostTotal();

  const posts = rawPosts
    .map((post) => toPostRecord(post, categoryNames))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  // Consistency checks: WordPress includes child categories in `categories=` filters,
  // so every post should still carry the parent id explicitly.
  const notInCategory = rawPosts.filter((post) => !post.categories.includes(target.id));
  if (notInCategory.length > 0) {
    console.warn(
      `${String(notInCategory.length)} post(s) returned by the filter do not list category ${String(target.id)}: ` +
        notInCategory.map((post) => post.slug).join(', '),
    );
  }
  if (posts.length !== categoryTotal || posts.length !== target.count) {
    console.warn(
      `post count mismatch: fetched ${String(posts.length)}, X-WP-Total ${String(categoryTotal)}, category.count ${String(target.count)}`,
    );
  }
  const emptyPosts = posts.filter((post) => post.word_count === 0);
  if (emptyPosts.length > 0) {
    console.warn(`empty content: ${emptyPosts.map((post) => post.slug).join(', ')}`);
  }

  const dataset: DesintoxDataset = {
    meta: {
      source: SITE_URL,
      api: API_BASE,
      fetched_at: fetchedAt,
      user_agent: USER_AGENT,
      category: { id: target.id, name: target.name },
      posts_total_site: postsTotalSite,
      license_note: LICENSE_NOTE,
    },
    categories,
    posts,
  };

  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');

  const first = posts[0];
  const last = posts[posts.length - 1];
  console.log(`wrote ${OUTPUT_PATH}`);
  console.log(`categories: ${String(categories.length)}`);
  console.log(
    `posts in "${target.name}": ${String(posts.length)} (site total: ${String(postsTotalSite)})`,
  );
  if (first !== undefined && last !== undefined) {
    console.log(`date range: ${first.date} – ${last.date}`);
  }
  console.log(
    `sample titles:\n${posts
      .slice(0, 8)
      .map((post) => `  - ${post.title}`)
      .join('\n')}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
