/**
 * Independent verifier of the canonical dataset `data/aec-2025.json` (CI gate).
 *
 * Adversarial by design: nothing is imported from the ingestion script. The dataset is re-read
 * with its own parser, its own normalization and its own hashing, then compared with the live site
 * and with `data/expected-invariants.json`. Only the types of `scripts/aec-types.ts` are shared.
 *
 * Checks (all run on every invocation):
 *   1. Word-for-word: 10 sections drawn with a seeded PRNG (mulberry32, seed 20260907) over the
 *      sorted section ids are fetched live and compared item by item (kind, order, exact text,
 *      paragraph HTML, nesting of sub-measures, chiffres) — any character difference is a failure.
 *   2. Structural invariants recomputed from the JSON alone: references, unique ids, id scheme,
 *      URL scheme, counts against `expected-invariants.json`, `meta.counts` and the ingestion claims.
 *   3. Independent enumeration: the landing page and the 18 chapter pages are fetched and their
 *      `nav.tdm` links compared with the dataset (exact equality of URL sets and order).
 *   4. Hash consistency: every item hash, the section hashes of the fetched sections (formula
 *      documented in scripts/ingest.ts, reimplemented here), `data/hashes.json`, `corpus_version`.
 *   5. Duplicates (informational, never a failure): identical proposition texts appearing in
 *      several sections, duplicate section titles.
 *   6. Gzip size of the dataset (zlib level 9) against the size announced by the ingestion run.
 *
 * Crawling policy: identifiable User-Agent, at most 4 concurrent requests, one pass, at most 2
 * retries with backoff, ng.melenchon2027.fr never requested, no URL guessing. 29 pages at most:
 * the landing page, 18 chapter pages and 10 section pages (plus at most one followed redirect per
 * section whose WordPress permalink differs from its book-navigation URL).
 *
 * Usage:
 *   npx tsx scripts/verify-corpus.ts [--json <report.json>] [--cache-dir <dir>]
 *                                    [--dataset <aec.json>] [--hashes <hashes.json>]
 *
 * `--cache-dir` stores every fetched page and reuses it on the next run (development convenience,
 * so that debugging the verifier does not hit the site again). `--dataset` / `--hashes` point the
 * checks at a candidate corpus instead of the committed one. Exit code 0 only if every hard check
 * passes.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { NodeType, parse, type HTMLElement, type Node } from 'node-html-parser';
import type {
  Chapter,
  Counts,
  Dataset,
  ExpectedInvariants,
  HashesFile,
  Section,
  SourceAnomaly,
  TextItem,
} from './aec-types.js';

// ---------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_PATH = resolve(ROOT_DIR, 'data', 'aec-2025.json');
const HASHES_PATH = resolve(ROOT_DIR, 'data', 'hashes.json');
const EXPECTED_PATH = resolve(ROOT_DIR, 'data', 'expected-invariants.json');

const SITE_ORIGIN = 'https://melenchon2027.fr';
const BOOK_PATH = '/programme2025/livre/';
const BOOK_URL = `${SITE_ORIGIN}${BOOK_PATH}`;
const USER_AGENT = 'cestecritla/0.1 (+https://github.com/baoleka/cestecritla)';
const FORBIDDEN_HOSTS: ReadonlySet<string> = new Set(['ng.melenchon2027.fr']);
const MAX_CONCURRENCY = 4;
const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 30_000;

const SAMPLE_SEED = 20260907;
const SAMPLE_SIZE = 10;
const DIFF_EXCERPT = 120;

const EXPECTED_LICENSE = 'CC BY-NC-SA 4.0';
const EXPECTED_ATTRIBUTION = "La France insoumise – L'Avenir en commun";
const OFFICIAL_COUNT_SENTENCE = '831 mesures';

/**
 * Figures of the reconnaissance (PLAN-SESSION.md §3.1, reproduced by the ingestion of 2026-09-07).
 * They are checked against the recomputed values; a deliberate corpus update must change them
 * together with `data/expected-invariants.json`. The corpus version and the gzip size are NOT
 * frozen here: the version is checked against `meta.corpus_version` and `data/hashes.json`, the
 * gzip size is only measured and reported.
 */
const INGESTION_CLAIMS = {
  counts: {
    parts: 4,
    chapters: 18,
    sections: 89,
    mesure_cle: 87,
    mesure: 706,
    sous_mesure: 44,
    propositions: 837,
    chiffres: 48,
    paragraphs: 109,
    sections_without_mesure_cle: 2,
    sections_without_chiffre: 52,
    sections_multi_paragraph: 14,
    sections_with_sous_mesure: 4,
  } satisfies Partial<Counts>,
};

// ---------------------------------------------------------------------------------------------
// Report accumulation
// ---------------------------------------------------------------------------------------------

interface SectionCheck {
  id: string;
  url: string;
  identical: boolean;
  diff_summary?: string;
}

interface DuplicateGroup {
  text: string;
  ids: string[];
}

interface VerifyReport {
  verdict: 'PASS' | 'FAIL';
  sections_checked: SectionCheck[];
  invariants: Record<string, string>;
  hashes_consistent: boolean;
  files: string[];
  problems: string[];
  notes: string;
  duplicate_ids: number;
  duplicate_section_urls: number;
  gzip_bytes_measured: number;
  duplicate_propositions: DuplicateGroup[];
  duplicate_propositions_same_section: DuplicateGroup[];
  duplicate_section_titles: DuplicateGroup[];
  requests_made: number;
  live_requests: number;
}

const problems: string[] = [];
const notes: string[] = [];
const invariants: Record<string, string> = {};

function problem(check: number, message: string): void {
  problems.push(`[check ${String(check)}] ${message}`);
}

function note(message: string): void {
  notes.push(message);
}

function invariant(key: string, value: string | number | boolean): void {
  invariants[key] = String(value);
}

// ---------------------------------------------------------------------------------------------
// Primitives: hashing, normalization, PRNG
// ---------------------------------------------------------------------------------------------

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** NFC, every run of Unicode whitespace (NBSP included) collapsed to one space, trimmed. */
function normalizeText(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Same normalization applied to an HTML fragment (entities left as they are). */
function normalizeHtml(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Widen a literal-typed field: the JSON is untrusted, so the runtime value is really compared. */
function widen(value: string | number): string {
  return String(value);
}

function excerpt(text: string): string {
  return text.length > DIFF_EXCERPT ? `${text.slice(0, DIFF_EXCERPT)}…` : text;
}

const ZERO_WIDTH = /\u200B|\u200C|\u200D|\u2060|\uFEFF/g;

/** Where two strings first differ, as code points — tells an apostrophe from a zero-width space. */
function firstCharDiff(a: string, b: string): string {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  const at = (s: string): string => {
    const code = s.codePointAt(i);
    return code === undefined ? 'end' : `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
  };
  const onlyZeroWidth = a.replace(ZERO_WIDTH, '') === b.replace(ZERO_WIDTH, '');
  return `first difference at char ${String(i)}: ${at(a)} vs ${at(b)}${onlyZeroWidth ? ', only zero-width characters differ' : ''}`;
}

/** mulberry32: deterministic 32-bit PRNG, uniform in [0, 1). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic sample without replacement (partial Fisher–Yates over a copy). */
function sampleIds(sortedIds: readonly string[], size: number, seed: number): string[] {
  const pool = [...sortedIds];
  const random = mulberry32(seed);
  const picked: string[] = [];
  const n = Math.min(size, pool.length);
  for (let i = 0; i < n; i += 1) {
    const j = i + Math.floor(random() * (pool.length - i));
    const chosen = pool[j];
    const current = pool[i];
    if (chosen === undefined || current === undefined) break;
    pool[j] = current;
    pool[i] = chosen;
    picked.push(chosen);
  }
  return picked;
}

// ---------------------------------------------------------------------------------------------
// Polite fetching (one pass, <= 4 concurrent, <= 2 retries, optional on-disk cache)
// ---------------------------------------------------------------------------------------------

interface FetchedPage {
  /** URL that was asked for. */
  url: string;
  /** URL that answered 200 (differs from `url` only after the single tolerated redirect). */
  finalUrl: string;
  body: string;
}

interface CacheEntry {
  url: string;
  finalUrl: string;
  body: string;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const fetchCounters = { requests: 0, live: 0, cached: 0 };
const liveCounters = { sectionHashesMatching: 0 };

function cachePath(cacheDir: string, url: string): string {
  return resolve(cacheDir, `${sha256(url).slice(0, 24)}.json`);
}

function readCache(cacheDir: string | null, url: string): CacheEntry | null {
  if (cacheDir === null) return null;
  const path = cachePath(cacheDir, url);
  if (!existsSync(path)) return null;
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof raw !== 'object' || raw === null) return null;
  const entry = raw as Partial<CacheEntry>;
  if (typeof entry.url !== 'string' || typeof entry.body !== 'string') return null;
  return { url: entry.url, finalUrl: entry.finalUrl ?? entry.url, body: entry.body };
}

function writeCache(cacheDir: string | null, page: FetchedPage): void {
  if (cacheDir === null) return;
  mkdirSync(cacheDir, { recursive: true });
  const entry: CacheEntry = { url: page.url, finalUrl: page.finalUrl, body: page.body };
  writeFileSync(cachePath(cacheDir, page.url), JSON.stringify(entry));
}

function assertAllowedHost(url: string): void {
  const { host, origin } = new URL(url);
  if (FORBIDDEN_HOSTS.has(host) || origin !== SITE_ORIGIN) {
    throw new Error(`refusing to request ${url}: only ${SITE_ORIGIN} may be crawled`);
  }
}

/** A redirect is followed only when it stays inside the programme on the site (never elsewhere). */
function acceptableRedirect(from: string, location: string | null): string | null {
  if (location === null) return null;
  const target = new URL(location, from);
  if (target.origin !== SITE_ORIGIN || FORBIDDEN_HOSTS.has(target.host)) return null;
  if (!target.pathname.startsWith('/programme2025/')) return null;
  return target.href;
}

async function fetchOnce(url: string): Promise<Response> {
  fetchCounters.requests += 1;
  fetchCounters.live += 1;
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/**
 * GET a page as text. 3xx answers are errors unless `followOneRedirect` is set, in which case a
 * single same-site hop inside the programme is followed (the landed URL is reported).
 */
async function fetchPage(
  url: string,
  followOneRedirect: boolean,
  cacheDir: string | null,
): Promise<FetchedPage> {
  assertAllowedHost(url);
  const cached = readCache(cacheDir, url);
  if (cached !== null) {
    fetchCounters.cached += 1;
    return cached;
  }
  let lastError: unknown = new Error('unreachable');
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1));
    try {
      const res = await fetchOnce(url);
      if (res.status >= 300 && res.status < 400) {
        await res.body?.cancel();
        const location = res.headers.get('location');
        const target = followOneRedirect ? acceptableRedirect(url, location) : null;
        if (target === null) {
          throw new HttpError(
            res.status,
            `HTTP ${String(res.status)} for ${url} (Location: ${location ?? 'none'})`,
          );
        }
        const hop = await fetchPage(target, false, cacheDir);
        const page: FetchedPage = { url, finalUrl: hop.finalUrl, body: hop.body };
        writeCache(cacheDir, page);
        return page;
      }
      if (res.status !== 200) {
        await res.body?.cancel();
        throw new HttpError(res.status, `HTTP ${String(res.status)} for ${url}`);
      }
      const page: FetchedPage = { url, finalUrl: url, body: await res.text() };
      writeCache(cacheDir, page);
      return page;
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof HttpError ? error.status === 429 || error.status >= 500 : true;
      if (!retryable) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Run `fn` over `items` with at most `limit` executions in flight, preserving order. */
async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next;
      next += 1;
      const item = items[index];
      if (index >= items.length || item === undefined) return;
      results[index] = await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

// ---------------------------------------------------------------------------------------------
// HTML helpers (node-html-parser)
// ---------------------------------------------------------------------------------------------

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

function classList(el: HTMLElement): string[] {
  return (el.getAttribute('class') ?? '').split(/\s+/).filter((c) => c !== '');
}

function elementText(el: HTMLElement): string {
  // `.text` decodes entities; normalization is ours.
  return normalizeText(el.text);
}

/** Absolute URL on the site with a trailing slash, so that `/x` and `/x/` compare equal. */
function siteUrl(href: string): string {
  const url = new URL(href, SITE_ORIGIN);
  const pathname = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return `${url.origin}${pathname}`;
}

function describeChildren(errors: string[], parent: HTMLElement, where: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const child of parent.childNodes) {
    if (isElement(child)) out.push(child);
    else if (child.text.trim() !== '') {
      errors.push(`${where}: stray text node "${excerpt(normalizeText(child.text))}"`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Live section page → flat list of entries (my own reading of the markup)
// ---------------------------------------------------------------------------------------------

type EntryKind = 'paragraph' | 'key_measure' | 'measure' | 'sub_measure' | 'chiffre';

interface FlatEntry {
  /** Id as stored (dataset) or as expected from the id scheme (live walk). */
  id: string;
  kind: EntryKind;
  text: string;
  /** Normalized inner HTML, paragraphs only. */
  html: string | null;
  /** Id of the measure a sub-measure hangs from. */
  parentId: string | null;
}

interface LiveSection {
  title: string | null;
  partSlug: string | null;
  canonical: string | null;
  currentHref: string | null;
  entries: FlatEntry[];
  /** Reimplementation of the section hash documented in scripts/ingest.ts. */
  hash: string | null;
  errors: string[];
}

function parseLiveSection(html: string, sectionId: string): LiveSection {
  const errors: string[] = [];
  const root = parse(html);
  const mains = root.querySelectorAll('main.section');
  const main = mains[0];
  if (mains.length !== 1 || main === undefined) {
    errors.push(`expected exactly one main.section, found ${String(mains.length)}`);
    return {
      title: null,
      partSlug: null,
      canonical: null,
      currentHref: null,
      entries: [],
      hash: null,
      errors,
    };
  }
  const h1 = main.querySelector('h1.section');
  const title = h1 === null ? null : elementText(h1);
  if (title === null) errors.push('no h1.section');
  const mainClasses = classList(main);
  const partSlug = mainClasses.length === 2 ? (mainClasses[1] ?? null) : null;
  if (partSlug === null)
    errors.push(`main class "${mainClasses.join(' ')}" does not carry a single part slug`);

  const contenus = main.querySelectorAll('section.contenu');
  const contenu = contenus[0];
  if (contenus.length !== 1 || contenu === undefined) {
    errors.push(`expected exactly one section.contenu, found ${String(contenus.length)}`);
    return { title, partSlug, canonical: null, currentHref: null, entries: [], hash: null, errors };
  }
  const chiffresSections = main.querySelectorAll('section.chiffres');
  if (chiffresSections.length > 1) {
    errors.push(`expected at most one section.chiffres, found ${String(chiffresSections.length)}`);
  }
  const chiffresSection = chiffresSections[0] ?? null;

  const entries: FlatEntry[] = [];
  let paragraphs = 0;
  let keys = 0;
  let measures = 0;
  let subs = 0;
  let lastMeasureId: string | null = null;
  for (const el of describeChildren(errors, contenu, `${sectionId} section.contenu`)) {
    const cls = classList(el);
    const tag = el.tagName;
    const text = elementText(el);
    if (tag === 'P' && cls.includes('wp-block-paragraph')) {
      paragraphs += 1;
      entries.push({
        id: `${sectionId}-p${pad2(paragraphs)}`,
        kind: 'paragraph',
        text,
        html: normalizeHtml(el.innerHTML),
        parentId: null,
      });
      lastMeasureId = null;
    } else if (tag === 'DIV' && cls.includes('mesure-cle')) {
      keys += 1;
      entries.push({
        id: `${sectionId}-k${pad2(keys)}`,
        kind: 'key_measure',
        text,
        html: null,
        parentId: null,
      });
      lastMeasureId = null;
    } else if (tag === 'DIV' && cls.includes('sous-mesure')) {
      if (lastMeasureId === null) {
        errors.push(
          `${sectionId}: div.sous-mesure without a preceding div.mesure ("${excerpt(text)}")`,
        );
        continue;
      }
      subs += 1;
      entries.push({
        id: `${lastMeasureId}.s${String(subs)}`,
        kind: 'sub_measure',
        text,
        html: null,
        parentId: lastMeasureId,
      });
    } else if (tag === 'DIV' && cls.includes('mesure')) {
      measures += 1;
      subs = 0;
      lastMeasureId = `${sectionId}-m${pad2(measures)}`;
      entries.push({ id: lastMeasureId, kind: 'measure', text, html: null, parentId: null });
    } else {
      errors.push(
        `${sectionId}: unexpected <${tag.toLowerCase()} class="${cls.join(' ')}"> in section.contenu`,
      );
    }
  }
  if (chiffresSection !== null) {
    let chiffres = 0;
    for (const div of chiffresSection.querySelectorAll('div.chiffre')) {
      chiffres += 1;
      entries.push({
        id: `${sectionId}-a${pad2(chiffres)}`,
        kind: 'chiffre',
        text: elementText(div),
        html: null,
        parentId: null,
      });
    }
  }

  const hash = sha256(
    `${normalizeHtml(contenu.innerHTML)}\n${chiffresSection === null ? '' : normalizeHtml(chiffresSection.innerHTML)}`,
  );
  const canonicalHref = root.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
  const canonical = canonicalHref === null || canonicalHref === '' ? null : siteUrl(canonicalHref);
  const currentHrefRaw = main.querySelector('nav.tdm a.actuelle')?.getAttribute('href') ?? null;
  const currentHref = currentHrefRaw === null ? null : siteUrl(currentHrefRaw);
  return { title, partSlug, canonical, currentHref, entries, hash, errors };
}

/** Dataset section → the same flat shape (sub-measures right after their measure, chiffres last). */
function flattenSection(section: Section): FlatEntry[] {
  const entries: FlatEntry[] = [];
  for (const item of section.items) {
    if (item.kind === 'paragraph') {
      entries.push({
        id: item.id,
        kind: 'paragraph',
        text: item.text,
        html: item.html,
        parentId: null,
      });
    } else if (item.kind === 'key_measure') {
      entries.push({
        id: item.id,
        kind: 'key_measure',
        text: item.text,
        html: null,
        parentId: null,
      });
    } else {
      entries.push({ id: item.id, kind: 'measure', text: item.text, html: null, parentId: null });
      for (const sub of item.subMeasures ?? []) {
        entries.push({
          id: sub.id,
          kind: 'sub_measure',
          text: sub.text,
          html: null,
          parentId: item.id,
        });
      }
    }
  }
  for (const c of section.chiffres) {
    entries.push({ id: c.id, kind: 'chiffre', text: c.text, html: null, parentId: null });
  }
  return entries;
}

/** First difference between the dataset entries and the live entries, or null when identical. */
function diffEntries(dataset: FlatEntry[], live: FlatEntry[]): string | null {
  const n = Math.min(dataset.length, live.length);
  for (let i = 0; i < n; i += 1) {
    const a = dataset[i];
    const b = live[i];
    if (a === undefined || b === undefined) break;
    const at = `item #${String(i + 1)} ${a.id}`;
    if (a.kind !== b.kind) {
      return `${at}: kind differs — dataset ${a.kind} "${excerpt(a.text)}" | live ${b.kind} "${excerpt(b.text)}"`;
    }
    if (a.id !== b.id) {
      return `${at}: id differs from document-order id ${b.id} — dataset "${excerpt(a.text)}" | live "${excerpt(b.text)}"`;
    }
    if (a.parentId !== b.parentId) {
      return `${at}: sub-measure nested under ${String(a.parentId)} in the dataset, under ${String(b.parentId)} live`;
    }
    if (a.text !== b.text) {
      return `${at}: text differs (${firstCharDiff(a.text, b.text)}) — dataset "${excerpt(a.text)}" | live "${excerpt(b.text)}"`;
    }
    if (a.html !== b.html) {
      return `${at}: paragraph html differs (${firstCharDiff(a.html ?? '', b.html ?? '')}) — dataset "${excerpt(a.html ?? '')}" | live "${excerpt(b.html ?? '')}"`;
    }
  }
  if (dataset.length !== live.length) {
    const extra = dataset.length > live.length ? dataset[n] : live[n];
    const side = dataset.length > live.length ? 'dataset' : 'live';
    return (
      `item count differs: dataset ${String(dataset.length)}, live ${String(live.length)} — first extra ${side} item ` +
      `${extra?.id ?? '?'} (${extra?.kind ?? '?'}) "${excerpt(extra?.text ?? '')}"`
    );
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Live chapter / landing pages → navigation links
// ---------------------------------------------------------------------------------------------

interface NavLink {
  url: string;
  rawHref: string;
  title: string;
}

interface LiveChapter {
  title: string | null;
  partSlug: string | null;
  links: NavLink[];
  errors: string[];
}

function navLinks(nav: HTMLElement): NavLink[] {
  return nav
    .querySelectorAll('a')
    .map((a) => {
      const rawHref = a.getAttribute('href') ?? '';
      return { url: siteUrl(rawHref), rawHref, title: elementText(a) };
    })
    .filter((l) => l.rawHref !== '');
}

function parseLiveChapter(html: string): LiveChapter {
  const errors: string[] = [];
  const root = parse(html);
  const mains = root.querySelectorAll('main.chapitre');
  const main = mains[0];
  if (mains.length !== 1 || main === undefined) {
    errors.push(`expected exactly one main.chapitre, found ${String(mains.length)}`);
    return { title: null, partSlug: null, links: [], errors };
  }
  const h1 = main.querySelector('h1');
  const mainClasses = classList(main);
  const navs = main.querySelectorAll('nav.tdm');
  const nav = navs[0];
  if (navs.length !== 1 || nav === undefined) {
    errors.push(`expected exactly one nav.tdm in main.chapitre, found ${String(navs.length)}`);
  }
  return {
    title: h1 === null ? null : elementText(h1),
    partSlug: mainClasses.length === 2 ? (mainClasses[1] ?? null) : null,
    links: nav === undefined ? [] : navLinks(nav),
    errors,
  };
}

function parseLiveLanding(html: string): { links: NavLink[]; errors: string[] } {
  const errors: string[] = [];
  const root = parse(html);
  const mains = root.querySelectorAll('main.livre');
  const main = mains[0];
  if (mains.length !== 1 || main === undefined) {
    errors.push(`expected exactly one main.livre, found ${String(mains.length)}`);
    return { links: [], errors };
  }
  const navs = main.querySelectorAll('nav.tdm');
  const nav = navs[0];
  if (navs.length !== 1 || nav === undefined) {
    errors.push(`expected exactly one nav.tdm on the landing page, found ${String(navs.length)}`);
    return { links: [], errors };
  }
  return { links: navLinks(nav), errors };
}

// ---------------------------------------------------------------------------------------------
// Check 2 — structural invariants from the JSON alone
// ---------------------------------------------------------------------------------------------

const RE_CHAPTER_ID = /^c([1-9]|1[0-8])$/;
const RE_SECTION_ID = /^c([1-9]|1[0-8])-s(\d{2})$/;
const RE_SECTION_URL =
  /^https:\/\/melenchon2027\.fr\/programme2025\/livre\/chapitre(\d{1,2})\/s(\d{1,2})\/$/;
const RE_SECTION_URL_NO_SLASH =
  /^https:\/\/melenchon2027\.fr\/programme2025\/livre\/chapitre(\d{1,2})\/s(\d{1,2})$/;
const RE_HEX64 = /^[0-9a-f]{64}$/;
const RE_HEX16 = /^[0-9a-f]{16}$/;

interface StructureResult {
  counts: Counts;
  sectionsPerChapter: Record<string, number>;
  duplicateIds: number;
  duplicateSectionUrls: number;
  /** Section ids in reading order (parts → chapters → sections). */
  readingOrder: string[];
  allTextItems: { id: string; item: TextItem }[];
}

function isTextItem(value: unknown): value is TextItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<TextItem>;
  return typeof v.id === 'string' && typeof v.text === 'string' && typeof v.hash === 'string';
}

/** Reimplementation of the anomaly rules documented in scripts/ingest.ts (detectSourceAnomalies). */
function detectAnomalies(sections: readonly Section[]): SourceAnomaly[] {
  const out: SourceAnomaly[] = [];
  for (const section of sections) {
    let lastPropositionId: string | null = null;
    for (const item of section.items) {
      if (item.kind !== 'paragraph') {
        const subs = item.kind === 'measure' ? (item.subMeasures ?? []) : [];
        const lastSub = subs[subs.length - 1];
        lastPropositionId = lastSub === undefined ? item.id : lastSub.id;
        continue;
      }
      if (lastPropositionId === null) continue;
      const heading = /^<strong>[^<]*<\/strong>$/.test(item.html) && item.text.endsWith(':');
      const statistic = /^\d+(?:[,.]\d+)? %/.test(item.text);
      const midSentence = /^[\p{Ll})\],;]/u.test(item.text);
      const kind: SourceAnomaly['kind'] = heading
        ? 'heading_paragraph'
        : statistic
          ? 'statistic_as_paragraph'
          : midSentence
            ? 'measure_split'
            : 'prose_after_measures';
      out.push({
        id: item.id,
        kind,
        relatedId: kind === 'measure_split' ? lastPropositionId : null,
      });
    }
  }
  return out;
}

function checkStructure(dataset: Dataset, expected: ExpectedInvariants): StructureResult {
  const ids = new Map<string, number>();
  const allTextItems: { id: string; item: TextItem }[] = [];
  let duplicateIds = 0;
  const registerId = (id: string, where: string): void => {
    const seen = ids.get(id) ?? 0;
    if (seen > 0) {
      duplicateIds += 1;
      problem(2, `duplicate id ${id} (${where})`);
    }
    ids.set(id, seen + 1);
  };
  const registerText = (item: TextItem, where: string): void => {
    registerId(item.id, where);
    allTextItems.push({ id: item.id, item });
    if (item.text === '') problem(2, `${item.id}: empty text`);
    if (item.text !== normalizeText(item.text)) {
      problem(2, `${item.id}: text is not normalized (NFC / whitespace) as claimed`);
    }
    if (!RE_HEX64.test(item.hash)) problem(2, `${item.id}: hash is not 64 lowercase hex chars`);
  };
  const checkParagraphHtml = (id: string, html: string, text: string): void => {
    if (html !== normalizeHtml(html)) problem(2, `${id}: html is not normalized`);
    const fromHtml = normalizeText(parse(html).text);
    if (fromHtml !== text) {
      problem(
        2,
        `${id}: text derived from html differs from text (${firstCharDiff(fromHtml, text)}) — html→"${excerpt(fromHtml)}" | text "${excerpt(text)}"`,
      );
    }
  };

  // Introduction.
  const intro = dataset.introduction;
  if (widen(intro.id) !== 'intro' || widen(intro.slug) !== 'introduction') {
    problem(
      2,
      `introduction id/slug are "${intro.id}"/"${intro.slug}", expected "intro"/"introduction"`,
    );
  }
  registerId(intro.id, 'introduction');
  if (intro.url !== `${BOOK_URL}introduction/`) problem(2, `introduction url is ${intro.url}`);
  intro.paragraphs.forEach((p, i) => {
    const expectedId = `intro-p${pad2(i + 1)}`;
    if (p.id !== expectedId)
      problem(2, `introduction paragraph #${String(i + 1)} has id ${p.id}, expected ${expectedId}`);
    if (widen(p.kind) !== 'paragraph')
      problem(2, `${p.id}: kind "${widen(p.kind)}" is not paragraph`);
    registerText(p, 'introduction');
    checkParagraphHtml(p.id, p.html, p.text);
  });

  // Parts.
  if (dataset.parts.length !== 4)
    problem(2, `expected 4 parts, found ${String(dataset.parts.length)}`);
  const partById = new Map(dataset.parts.map((p) => [p.id, p]));
  const chapterById = new Map(dataset.chapters.map((c) => [c.id, c]));
  const sectionById = new Map(dataset.sections.map((s) => [s.id, s]));
  const readingOrder: string[] = [];
  const chapterOwner = new Map<string, string>();
  dataset.parts.forEach((part, i) => {
    const expectedId = `part${String(i + 1)}`;
    if (part.id !== expectedId)
      problem(2, `part #${String(i + 1)} has id ${part.id}, expected ${expectedId}`);
    if (part.order !== i + 1)
      problem(2, `${part.id}: order ${String(part.order)} is not ${String(i + 1)}`);
    if (part.url !== `${BOOK_URL}${part.slug}/`)
      problem(2, `${part.id}: url ${part.url} does not match slug ${part.slug}`);
    if (part.title !== normalizeText(part.title) || part.title === '')
      problem(2, `${part.id}: title not normalized`);
    registerId(part.id, 'part');
    part.epigraphs.forEach((e, j) => {
      const eid = `${part.id}-e${pad2(j + 1)}`;
      if (e.id !== eid) problem(2, `epigraph ${e.id} should be ${eid}`);
      if (widen(e.kind) !== 'epigraph')
        problem(2, `${e.id}: kind "${widen(e.kind)}" is not epigraph`);
      registerText(e, part.id);
      if (e.cite !== normalizeText(e.cite) || e.cite === '')
        problem(2, `${e.id}: cite is empty or not normalized`);
    });
    part.paragraphs.forEach((p, j) => {
      const pid = `${part.id}-p${pad2(j + 1)}`;
      if (p.id !== pid) problem(2, `part paragraph ${p.id} should be ${pid}`);
      if (widen(p.kind) !== 'paragraph')
        problem(2, `${p.id}: kind "${widen(p.kind)}" is not paragraph`);
      registerText(p, part.id);
      checkParagraphHtml(p.id, p.html, p.text);
    });
    if (part.chapterIds.length === 0) problem(2, `${part.id}: no chapter`);
    for (const cid of part.chapterIds) {
      const chapter = chapterById.get(cid);
      if (chapter === undefined) {
        problem(2, `${part.id}: chapterIds references unknown chapter ${cid}`);
        continue;
      }
      if (chapter.partId !== part.id)
        problem(2, `${cid}: partId ${chapter.partId} but listed in ${part.id}`);
      if (chapterOwner.has(cid)) problem(2, `${cid}: listed in several parts`);
      chapterOwner.set(cid, part.id);
      for (const sid of chapter.sectionIds) readingOrder.push(sid);
    }
  });

  // Chapters.
  if (dataset.chapters.length !== 18)
    problem(2, `expected 18 chapters, found ${String(dataset.chapters.length)}`);
  const sectionOwner = new Map<string, string>();
  const sectionsPerChapter: Record<string, number> = {};
  dataset.chapters.forEach((chapter, i) => {
    registerId(chapter.id, 'chapter');
    if (!RE_CHAPTER_ID.test(chapter.id))
      problem(2, `chapter id ${chapter.id} does not follow c{N}`);
    if (chapter.number !== i + 1)
      problem(2, `${chapter.id}: number ${String(chapter.number)} at position ${String(i + 1)}`);
    if (chapter.id !== `c${String(chapter.number)}`)
      problem(2, `${chapter.id}: id/number mismatch`);
    if (chapter.slug !== `chapitre${String(chapter.number)}`)
      problem(2, `${chapter.id}: slug ${chapter.slug}`);
    if (chapter.url !== `${BOOK_URL}chapitre${String(chapter.number)}/`)
      problem(2, `${chapter.id}: url ${chapter.url}`);
    if (!chapter.title.startsWith(`Chapitre ${String(chapter.number)} :`)) {
      problem(
        2,
        `${chapter.id}: title "${chapter.title}" does not start with "Chapitre ${String(chapter.number)} :"`,
      );
    }
    if (!partById.has(chapter.partId))
      problem(2, `${chapter.id}: partId ${chapter.partId} does not resolve`);
    if (!chapterOwner.has(chapter.id)) problem(2, `${chapter.id}: not listed in any part`);
    if (chapter.sectionIds.length === 0) problem(2, `${chapter.id}: no section`);
    sectionsPerChapter[chapter.id] = chapter.sectionIds.length;
    chapter.sectionIds.forEach((sid, j) => {
      const section = sectionById.get(sid);
      if (section === undefined) {
        problem(2, `${chapter.id}: sectionIds references unknown section ${sid}`);
        return;
      }
      if (section.chapterId !== chapter.id)
        problem(2, `${sid}: chapterId ${section.chapterId} but listed in ${chapter.id}`);
      if (section.number !== j + 1) {
        note(
          `${sid}: section number ${String(section.number)} at position ${String(j + 1)} of ${chapter.id} (slug numbering is not contiguous)`,
        );
      }
      if (sectionOwner.has(sid)) problem(2, `${sid}: listed in several chapters`);
      sectionOwner.set(sid, chapter.id);
    });
  });

  // Sections.
  const counts: Counts = {
    parts: dataset.parts.length,
    chapters: dataset.chapters.length,
    sections: dataset.sections.length,
    mesure_cle: 0,
    mesure: 0,
    sous_mesure: 0,
    propositions: 0,
    chiffres: 0,
    paragraphs: 0,
    sections_without_mesure_cle: 0,
    sections_without_chiffre: 0,
    sections_multi_paragraph: 0,
    sections_with_sous_mesure: 0,
    introduction_paragraphs: intro.paragraphs.length,
    part_paragraphs: dataset.parts.reduce((n, p) => n + p.paragraphs.length, 0),
    part_epigraphs: dataset.parts.reduce((n, p) => n + p.epigraphs.length, 0),
    source_anomalies: 0,
  };
  const urls = new Map<string, string>();
  const canonicalUrls = new Map<string, string>();
  let duplicateSectionUrls = 0;
  let withSlash = 0;
  let withoutSlash = 0;
  let redirected = 0;
  for (const section of dataset.sections) {
    registerId(section.id, 'section');
    const chapter = chapterById.get(section.chapterId);
    if (chapter === undefined)
      problem(2, `${section.id}: chapterId ${section.chapterId} does not resolve`);
    else if (chapter.partId !== section.partId)
      problem(
        2,
        `${section.id}: partId ${section.partId} differs from its chapter's ${chapter.partId}`,
      );
    if (!partById.has(section.partId))
      problem(2, `${section.id}: partId ${section.partId} does not resolve`);
    if (!sectionOwner.has(section.id)) problem(2, `${section.id}: not listed in any chapter`);
    const idMatch = RE_SECTION_ID.exec(section.id);
    if (idMatch === null) problem(2, `section id ${section.id} does not follow c{N}-s{MM}`);
    else if (section.id !== `${section.chapterId}-s${pad2(section.number)}`) {
      problem(
        2,
        `${section.id}: id does not encode chapter ${section.chapterId} / number ${String(section.number)}`,
      );
    }
    if (section.slug !== `s${String(section.number)}`)
      problem(2, `${section.id}: slug ${section.slug} vs number ${String(section.number)}`);
    if (section.title !== normalizeText(section.title) || section.title === '')
      problem(2, `${section.id}: title not normalized`);
    if (!RE_HEX64.test(section.hash))
      problem(2, `${section.id}: section hash is not 64 lowercase hex chars`);

    const urlMatch = RE_SECTION_URL.exec(section.url);
    if (urlMatch !== null) withSlash += 1;
    else if (RE_SECTION_URL_NO_SLASH.test(section.url)) withoutSlash += 1;
    else
      problem(2, `${section.id}: url ${section.url} is not of the form ${BOOK_URL}chapitreN/sM/`);
    const chapterNumber = chapter?.number ?? -1;
    if (
      urlMatch !== null &&
      (Number(urlMatch[1]) !== chapterNumber || Number(urlMatch[2]) !== section.number)
    ) {
      problem(
        2,
        `${section.id}: url ${section.url} does not encode chapter ${String(chapterNumber)} / section ${String(section.number)}`,
      );
    }
    const urlOwner = urls.get(section.url);
    if (urlOwner !== undefined) {
      duplicateSectionUrls += 1;
      problem(2, `${section.id}: url ${section.url} already used by ${urlOwner}`);
    }
    urls.set(section.url, section.id);
    const canonicalOwner = canonicalUrls.get(section.canonicalUrl);
    if (canonicalOwner !== undefined)
      problem(2, `${section.id}: canonicalUrl already used by ${canonicalOwner}`);
    canonicalUrls.set(section.canonicalUrl, section.id);
    if (section.canonicalUrl !== section.url) {
      redirected += 1;
      if (!section.canonicalUrl.startsWith(`${SITE_ORIGIN}/programme2025/`)) {
        problem(2, `${section.id}: canonicalUrl ${section.canonicalUrl} is outside the programme`);
      }
    }

    let paragraphs = 0;
    let keys = 0;
    let measures = 0;
    let subs = 0;
    for (const item of section.items) {
      if (!isTextItem(item)) {
        problem(2, `${section.id}: malformed item ${JSON.stringify(item).slice(0, 80)}`);
        continue;
      }
      switch (item.kind) {
        case 'paragraph': {
          paragraphs += 1;
          const pid = `${section.id}-p${pad2(paragraphs)}`;
          if (item.id !== pid) problem(2, `${item.id}: expected id ${pid} (document order)`);
          registerText(item, section.id);
          checkParagraphHtml(item.id, item.html, item.text);
          break;
        }
        case 'key_measure': {
          keys += 1;
          const kid = `${section.id}-k${pad2(keys)}`;
          if (item.id !== kid) problem(2, `${item.id}: expected id ${kid} (document order)`);
          registerText(item, section.id);
          break;
        }
        case 'measure': {
          measures += 1;
          const mid = `${section.id}-m${pad2(measures)}`;
          if (item.id !== mid) problem(2, `${item.id}: expected id ${mid} (document order)`);
          registerText(item, section.id);
          const subList = item.subMeasures;
          if (subList !== undefined && subList.length === 0)
            problem(2, `${item.id}: empty subMeasures array`);
          (subList ?? []).forEach((sub, k) => {
            subs += 1;
            const sid = `${item.id}.s${String(k + 1)}`;
            if (sub.id !== sid) problem(2, `${sub.id}: expected id ${sid}`);
            if (widen(sub.kind) !== 'sub_measure')
              problem(2, `${sub.id}: kind "${widen(sub.kind)}" is not sub_measure`);
            registerText(sub, section.id);
          });
          break;
        }
        default: {
          const unknownItem: { id?: unknown; kind?: unknown } = item;
          problem(
            2,
            `${section.id}: unknown item kind "${String(unknownItem.kind)}" (${String(unknownItem.id)})`,
          );
        }
      }
    }
    section.chiffres.forEach((c, k) => {
      const cid = `${section.id}-a${pad2(k + 1)}`;
      if (c.id !== cid) problem(2, `${c.id}: expected id ${cid}`);
      if (widen(c.kind) !== 'chiffre')
        problem(2, `${c.id}: kind "${widen(c.kind)}" is not chiffre`);
      registerText(c, section.id);
    });
    if (paragraphs === 0) problem(2, `${section.id}: no paragraph`);
    if (keys + measures === 0) problem(2, `${section.id}: no measure nor key measure`);
    counts.paragraphs += paragraphs;
    counts.mesure_cle += keys;
    counts.mesure += measures;
    counts.sous_mesure += subs;
    counts.chiffres += section.chiffres.length;
    if (keys === 0) counts.sections_without_mesure_cle += 1;
    if (section.chiffres.length === 0) counts.sections_without_chiffre += 1;
    if (paragraphs > 1) counts.sections_multi_paragraph += 1;
    if (subs > 0) counts.sections_with_sous_mesure += 1;
  }
  counts.propositions = counts.mesure_cle + counts.mesure + counts.sous_mesure;

  invariant(
    'section_url_form',
    withoutSlash === 0
      ? 'all with trailing slash'
      : `${String(withSlash)} with / ${String(withoutSlash)} without trailing slash`,
  );
  invariant('sections_with_distinct_canonical_url', redirected);
  invariant(
    'reading_order_equals_sections_array',
    JSON.stringify(readingOrder) === JSON.stringify(dataset.sections.map((s) => s.id)),
  );
  if (JSON.stringify(readingOrder) !== JSON.stringify(dataset.sections.map((s) => s.id))) {
    problem(2, 'sections array is not in reading order (parts → chapters → sectionIds)');
  }
  if (readingOrder.length !== dataset.sections.length) {
    problem(
      2,
      `chapters list ${String(readingOrder.length)} sections, dataset has ${String(dataset.sections.length)}`,
    );
  }

  // Meta.
  const meta = dataset.meta;
  if (meta.source !== BOOK_URL) problem(2, `meta.source is ${meta.source}`);
  if (widen(meta.license) !== EXPECTED_LICENSE)
    problem(2, `meta.license is "${widen(meta.license)}"`);
  if (widen(meta.attribution) !== EXPECTED_ATTRIBUTION)
    problem(2, `meta.attribution is "${widen(meta.attribution)}"`);
  if (Number.isNaN(Date.parse(meta.crawled_at)))
    problem(2, `meta.crawled_at "${meta.crawled_at}" is not a date`);
  if (!RE_HEX16.test(meta.corpus_version))
    problem(2, `meta.corpus_version "${meta.corpus_version}" is not 16 hex chars`);
  if (widen(meta.official_count) !== '831')
    problem(2, `meta.official_count is ${widen(meta.official_count)}`);
  const officialParagraph = intro.paragraphs.find((p) => p.id === meta.official_count_paragraph_id);
  if (
    officialParagraph === undefined ||
    !officialParagraph.text.includes(OFFICIAL_COUNT_SENTENCE)
  ) {
    problem(
      2,
      `meta.official_count_paragraph_id ${meta.official_count_paragraph_id} does not point to the "${OFFICIAL_COUNT_SENTENCE}" paragraph`,
    );
  }
  const redirectedIds = dataset.sections
    .filter((s) => s.url !== s.canonicalUrl)
    .map((s) => s.id)
    .sort();
  if (JSON.stringify(redirectedIds) !== JSON.stringify([...meta.redirected_section_ids].sort())) {
    problem(
      2,
      `meta.redirected_section_ids ${JSON.stringify(meta.redirected_section_ids)} differs from sections with url ≠ canonicalUrl ${JSON.stringify(redirectedIds)}`,
    );
  }
  const anomalies = detectAnomalies(dataset.sections);
  counts.source_anomalies = anomalies.length;
  if (JSON.stringify(anomalies) !== JSON.stringify(meta.source_anomalies)) {
    problem(
      2,
      `meta.source_anomalies differs from the documented rules recomputed (${String(anomalies.length)} found, ${String(meta.source_anomalies.length)} stored)`,
    );
  }
  for (const id of expected.rss_known_missing_section_ids) {
    if (!sectionById.has(id))
      problem(2, `expected-invariants rss_known_missing_section_ids: ${id} does not resolve`);
  }

  // Counts: recomputed vs expected-invariants.json, meta.counts and the ingestion claims.
  for (const key of Object.keys(counts) as (keyof Counts)[]) {
    const measured = counts[key];
    const fromExpected: number | undefined = expected.counts[key];
    const fromMeta: number | undefined = meta.counts[key];
    invariant(`counts.${key}`, measured);
    if (fromExpected !== measured) {
      problem(
        2,
        `counts.${key}: recomputed ${String(measured)}, expected-invariants.json says ${String(fromExpected)}`,
      );
    }
    if (fromMeta !== measured)
      problem(
        2,
        `counts.${key}: recomputed ${String(measured)}, meta.counts says ${String(fromMeta)}`,
      );
  }
  for (const [key, claimed] of Object.entries(INGESTION_CLAIMS.counts) as [
    keyof Counts,
    number,
  ][]) {
    if (counts[key] !== claimed)
      problem(
        2,
        `counts.${key}: recomputed ${String(counts[key])}, ingestion claim ${String(claimed)}`,
      );
  }
  const chapterKeys = new Set([
    ...Object.keys(expected.sections_per_chapter),
    ...Object.keys(sectionsPerChapter),
  ]);
  for (const key of [...chapterKeys].sort()) {
    const e = expected.sections_per_chapter[key];
    const m = sectionsPerChapter[key];
    if (e !== m)
      problem(2, `sections_per_chapter.${key}: recomputed ${String(m)}, expected ${String(e)}`);
  }
  invariant(
    'sections_per_chapter',
    Object.entries(sectionsPerChapter)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(' '),
  );
  invariant('duplicate_ids', duplicateIds);
  invariant('duplicate_section_urls', duplicateSectionUrls);
  invariant('text_items', allTextItems.length);

  return {
    counts,
    sectionsPerChapter,
    duplicateIds,
    duplicateSectionUrls,
    readingOrder,
    allTextItems,
  };
}

// ---------------------------------------------------------------------------------------------
// Check 4 — hashes (items, hashes.json, corpus_version); section hashes come from check 1
// ---------------------------------------------------------------------------------------------

function checkHashes(dataset: Dataset, hashes: HashesFile, structure: StructureResult): boolean {
  const before = problems.length;
  let bad = 0;
  for (const { item } of structure.allTextItems) {
    if (sha256(item.text) !== item.hash) {
      bad += 1;
      if (bad <= 20)
        problem(
          4,
          `${item.id}: stored hash ${item.hash.slice(0, 12)}… ≠ sha256(text) ${sha256(item.text).slice(0, 12)}…`,
        );
    }
  }
  if (bad > 20) problem(4, `… ${String(bad)} item hashes wrong in total`);
  invariant('item_hashes_verified', structure.allTextItems.length);
  invariant('item_hashes_wrong', bad);

  const sectionById = new Map(dataset.sections.map((s) => [s.id, s]));
  const orderedHashes = structure.readingOrder.map((id) => sectionById.get(id)?.hash ?? '');
  const corpusVersion = sha256(orderedHashes.join('')).slice(0, 16);
  invariant('corpus_version_recomputed', corpusVersion);
  if (corpusVersion !== dataset.meta.corpus_version) {
    problem(
      4,
      `corpus_version recomputed ${corpusVersion} ≠ meta.corpus_version ${dataset.meta.corpus_version}`,
    );
  }

  if (hashes.corpus_version !== dataset.meta.corpus_version) {
    problem(
      4,
      `hashes.json corpus_version ${hashes.corpus_version} ≠ meta.corpus_version ${dataset.meta.corpus_version}`,
    );
  }
  if (hashes.generated_at !== dataset.meta.crawled_at) {
    problem(
      4,
      `hashes.json generated_at ${hashes.generated_at} ≠ meta.crawled_at ${dataset.meta.crawled_at}`,
    );
  }
  const hashKeys = Object.keys(hashes.sections).sort();
  const sectionIds = dataset.sections.map((s) => s.id).sort();
  if (JSON.stringify(hashKeys) !== JSON.stringify(sectionIds)) {
    problem(
      4,
      `hashes.json lists ${String(hashKeys.length)} sections, dataset has ${String(sectionIds.length)} (sets differ)`,
    );
  }
  for (const section of dataset.sections) {
    const entry = hashes.sections[section.id];
    if (entry === undefined) continue;
    if (entry.hash !== section.hash)
      problem(4, `hashes.json ${section.id}: hash differs from the dataset`);
    if (entry.url !== section.url)
      problem(4, `hashes.json ${section.id}: url ${entry.url} differs from ${section.url}`);
  }
  return problems.length === before;
}

// ---------------------------------------------------------------------------------------------
// Check 5 — duplicates (informational)
// ---------------------------------------------------------------------------------------------

function findDuplicates(dataset: Dataset): {
  crossSection: DuplicateGroup[];
  sameSection: DuplicateGroup[];
  titles: DuplicateGroup[];
} {
  const byText = new Map<string, { ids: string[]; sections: Set<string> }>();
  const add = (sectionId: string, id: string, text: string): void => {
    const entry = byText.get(text) ?? { ids: [], sections: new Set<string>() };
    entry.ids.push(id);
    entry.sections.add(sectionId);
    byText.set(text, entry);
  };
  for (const section of dataset.sections) {
    for (const item of section.items) {
      if (item.kind === 'paragraph') continue;
      add(section.id, item.id, item.text);
      if (item.kind === 'measure')
        for (const sub of item.subMeasures ?? []) add(section.id, sub.id, sub.text);
    }
  }
  const crossSection: DuplicateGroup[] = [];
  const sameSection: DuplicateGroup[] = [];
  for (const [text, entry] of byText) {
    if (entry.ids.length < 2) continue;
    (entry.sections.size >= 2 ? crossSection : sameSection).push({ text, ids: entry.ids });
  }
  const byTitle = new Map<string, string[]>();
  for (const section of dataset.sections) {
    byTitle.set(section.title, [...(byTitle.get(section.title) ?? []), section.id]);
  }
  const titles = [...byTitle.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([text, ids]) => ({ text, ids }));

  // The dataset's own list must agree with this recomputation (metadata consistency, hard).
  const mine = crossSection.map((d) => d.ids.join(',')).sort();
  const theirs = dataset.meta.duplicate_propositions.map((d) => [...d.ids].sort().join(',')).sort();
  if (JSON.stringify(mine) !== JSON.stringify(theirs)) {
    problem(
      5,
      `meta.duplicate_propositions (${String(theirs.length)}) differs from the recomputed cross-section duplicates (${String(mine.length)})`,
    );
  }
  invariant('duplicate_propositions_cross_section', crossSection.length);
  invariant('duplicate_propositions_same_section', sameSection.length);
  invariant('duplicate_section_titles', titles.length);
  return { crossSection, sameSection, titles };
}

// ---------------------------------------------------------------------------------------------
// Check 1 + 3 — live comparisons
// ---------------------------------------------------------------------------------------------

async function checkLiveSections(
  dataset: Dataset,
  sampledIds: readonly string[],
  cacheDir: string | null,
): Promise<SectionCheck[]> {
  const sectionById = new Map(dataset.sections.map((s) => [s.id, s]));
  const partById = new Map(dataset.parts.map((p) => [p.id, p]));
  return mapPool(sampledIds, MAX_CONCURRENCY, async (id) => {
    const section = sectionById.get(id);
    if (section === undefined) {
      problem(1, `sampled id ${id} not in dataset`);
      return { id, url: '', identical: false, diff_summary: 'section missing from dataset' };
    }
    let page: FetchedPage;
    try {
      page = await fetchPage(section.url, true, cacheDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      problem(1, `${id}: fetch failed — ${message}`);
      return { id, url: section.url, identical: false, diff_summary: `fetch failed: ${message}` };
    }
    console.log(
      `  GET ${section.url}${page.finalUrl !== section.url ? ` → ${page.finalUrl}` : ''}`,
    );
    const live = parseLiveSection(page.body, id);
    for (const e of live.errors) problem(1, `${id}: live page — ${e}`);
    if (page.finalUrl !== section.canonicalUrl) {
      problem(
        1,
        `${id}: landed on ${page.finalUrl}, dataset canonicalUrl is ${section.canonicalUrl}`,
      );
    }
    if (live.canonical !== null && live.canonical !== section.canonicalUrl) {
      problem(
        1,
        `${id}: <link rel="canonical"> ${live.canonical} ≠ dataset canonicalUrl ${section.canonicalUrl}`,
      );
    }
    if (live.currentHref !== null && live.currentHref !== section.url) {
      problem(
        1,
        `${id}: nav.tdm a.actuelle points to ${live.currentHref}, dataset url is ${section.url}`,
      );
    }
    if (live.title !== null && live.title !== section.title) {
      problem(1, `${id}: h1 "${live.title}" ≠ dataset title "${section.title}"`);
    }
    const partSlug = partById.get(section.partId)?.slug ?? null;
    if (live.partSlug !== null && live.partSlug !== partSlug) {
      problem(
        1,
        `${id}: main class part slug "${live.partSlug}" ≠ dataset part ${section.partId} (${String(partSlug)})`,
      );
    }
    if (live.hash !== null && live.hash === section.hash) {
      liveCounters.sectionHashesMatching += 1;
    } else if (live.hash !== null) {
      problem(
        4,
        `${id}: section hash recomputed from the live HTML ${live.hash.slice(0, 12)}… ≠ stored ${section.hash.slice(0, 12)}…`,
      );
    }
    const diff = diffEntries(flattenSection(section), live.entries);
    if (diff !== null) problem(1, `${id}: ${diff}`);
    const identical = diff === null && live.errors.length === 0;
    return { id, url: section.url, identical, ...(diff === null ? {} : { diff_summary: diff }) };
  });
}

async function checkLiveEnumeration(dataset: Dataset, cacheDir: string | null): Promise<void> {
  // Landing page: introduction, 4 parts, 18 chapters, in reading order, with part membership.
  try {
    const landing = await fetchPage(BOOK_URL, false, cacheDir);
    console.log(`  GET ${BOOK_URL}`);
    const parsed = parseLiveLanding(landing.body);
    for (const e of parsed.errors) problem(3, `landing — ${e}`);
    const introUrls: string[] = [];
    const partUrls: string[] = [];
    const chapterUrls: string[] = [];
    const membership: string[] = [];
    let currentPart = 0;
    for (const link of parsed.links) {
      const slug = link.url.slice(BOOK_URL.length).replace(/\/$/, '');
      if (!link.url.startsWith(BOOK_URL) || slug === '' || slug.includes('/')) {
        problem(3, `landing nav link outside the book: ${link.rawHref}`);
        continue;
      }
      if (slug === 'introduction') introUrls.push(link.url);
      else if (/^chapitre\d{1,2}$/.test(slug)) {
        chapterUrls.push(link.url);
        membership.push(`part${String(currentPart)}`);
      } else {
        currentPart += 1;
        partUrls.push(link.url);
      }
    }
    invariant(
      'landing_links',
      `${String(introUrls.length)} introduction, ${String(partUrls.length)} parts, ${String(chapterUrls.length)} chapters`,
    );
    if (JSON.stringify(introUrls) !== JSON.stringify([dataset.introduction.url])) {
      problem(
        3,
        `landing introduction link ${JSON.stringify(introUrls)} ≠ dataset ${dataset.introduction.url}`,
      );
    }
    const datasetParts = dataset.parts.map((p) => p.url);
    if (JSON.stringify(partUrls) !== JSON.stringify(datasetParts)) {
      problem(
        3,
        `landing part links ${JSON.stringify(partUrls)} ≠ dataset ${JSON.stringify(datasetParts)}`,
      );
    }
    const datasetChapters = dataset.chapters.map((c) => c.url);
    if (JSON.stringify(chapterUrls) !== JSON.stringify(datasetChapters)) {
      problem(
        3,
        `landing chapter links differ from the dataset (order or set): live ${JSON.stringify(chapterUrls)}`,
      );
    }
    const datasetMembership = dataset.chapters.map((c) => c.partId);
    if (JSON.stringify(membership) !== JSON.stringify(datasetMembership)) {
      problem(
        3,
        `chapter → part membership on the landing page ${JSON.stringify(membership)} ≠ dataset ${JSON.stringify(datasetMembership)}`,
      );
    }
  } catch (error) {
    problem(
      3,
      `landing page fetch failed — ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Chapter pages: nav.tdm section links vs sectionIds.
  const sectionById = new Map(dataset.sections.map((s) => [s.id, s]));
  const partById = new Map(dataset.parts.map((p) => [p.id, p]));
  let trailingSlashLinks = 0;
  let bareLinks = 0;
  let matchingChapters = 0;
  await mapPool(dataset.chapters, MAX_CONCURRENCY, async (chapter: Chapter) => {
    let page: FetchedPage;
    try {
      page = await fetchPage(chapter.url, false, cacheDir);
    } catch (error) {
      problem(
        3,
        `${chapter.id}: fetch failed — ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
    console.log(`  GET ${chapter.url}`);
    const live = parseLiveChapter(page.body);
    for (const e of live.errors) problem(3, `${chapter.id}: live page — ${e}`);
    if (live.title !== null && live.title !== chapter.title) {
      problem(3, `${chapter.id}: h1 "${live.title}" ≠ dataset title "${chapter.title}"`);
    }
    const partSlug = partById.get(chapter.partId)?.slug ?? null;
    if (live.partSlug !== null && live.partSlug !== partSlug) {
      problem(
        3,
        `${chapter.id}: main class part slug "${live.partSlug}" ≠ dataset part ${chapter.partId} (${String(partSlug)})`,
      );
    }
    for (const link of live.links) {
      if (link.rawHref.endsWith('/')) trailingSlashLinks += 1;
      else bareLinks += 1;
    }
    const liveUrls = live.links.map((l) => l.url);
    const datasetUrls = chapter.sectionIds.map(
      (id) => sectionById.get(id)?.url ?? `<unresolved ${id}>`,
    );
    const liveSet = new Set(liveUrls);
    const datasetSet = new Set(datasetUrls);
    const missingLive = datasetUrls.filter((u) => !liveSet.has(u));
    const missingDataset = liveUrls.filter((u) => !datasetSet.has(u));
    if (liveUrls.length !== liveSet.size)
      problem(3, `${chapter.id}: nav.tdm repeats a section link`);
    if (missingLive.length > 0 || missingDataset.length > 0) {
      problem(
        3,
        `${chapter.id}: section URL sets differ — only in dataset ${JSON.stringify(missingLive)}, only live ${JSON.stringify(missingDataset)}`,
      );
    } else if (JSON.stringify(liveUrls) !== JSON.stringify(datasetUrls)) {
      problem(
        3,
        `${chapter.id}: same section URLs but a different order — live ${JSON.stringify(liveUrls)}`,
      );
    } else {
      matchingChapters += 1;
    }
    live.links.forEach((link, i) => {
      const id = chapter.sectionIds[i];
      const section = id === undefined ? undefined : sectionById.get(id);
      if (section !== undefined && section.url === link.url && section.title !== link.title) {
        problem(3, `${section.id}: nav title "${link.title}" ≠ dataset title "${section.title}"`);
      }
    });
  });
  invariant(
    'chapters_matching_live_nav',
    `${String(matchingChapters)}/${String(dataset.chapters.length)}`,
  );
  invariant(
    'live_nav_link_form',
    bareLinks > 0 && trailingSlashLinks === 0
      ? 'site links have no trailing slash (dataset adds it)'
      : `${String(trailingSlashLinks)} with / ${String(bareLinks)} without trailing slash`,
  );
}

// ---------------------------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------------------------

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

interface Options {
  jsonPath: string | null;
  cacheDir: string | null;
  datasetPath: string;
  hashesPath: string;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = {
    jsonPath: null,
    cacheDir: null,
    datasetPath: DATASET_PATH,
    hashesPath: HASHES_PATH,
  };
  for (let i = 0; i < argv.length; i += 2) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === undefined || value === undefined) {
      throw new Error(`argument ${String(arg)} needs a value`);
    }
    if (arg === '--json') options.jsonPath = resolve(value);
    else if (arg === '--cache-dir') options.cacheDir = resolve(value);
    else if (arg === '--dataset') options.datasetPath = resolve(value);
    else if (arg === '--hashes') options.hashesPath = resolve(value);
    else {
      throw new Error(
        `unknown argument ${arg} (usage: --json <file> --cache-dir <dir> --dataset <file> --hashes <file>)`,
      );
    }
  }
  return options;
}

async function main(): Promise<void> {
  const { jsonPath, cacheDir, datasetPath, hashesPath } = parseArgs(process.argv.slice(2));
  const started = Date.now();
  console.log(`dataset ${datasetPath}\nhashes  ${hashesPath}`);
  const dataset = readJson(datasetPath) as Dataset;
  const hashes = readJson(hashesPath) as HashesFile;
  const expected = readJson(EXPECTED_PATH) as ExpectedInvariants;

  console.log('check 2 — structural invariants');
  const structure = checkStructure(dataset, expected);

  console.log('check 4 — hashes');
  const hashesConsistentSoFar = checkHashes(dataset, hashes, structure);

  console.log('check 5 — duplicates');
  const duplicates = findDuplicates(dataset);

  console.log('check 6 — gzip size');
  const gzipBytes = gzipSync(readFileSync(datasetPath), { level: 9 }).length;
  invariant('gzip_bytes_measured', gzipBytes);

  const sortedIds = dataset.sections.map((s) => s.id).sort();
  const sampled = sampleIds(sortedIds, SAMPLE_SIZE, SAMPLE_SEED);
  invariant('sampled_section_ids', sampled.join(' '));
  console.log(
    `check 1 — word-for-word on ${String(sampled.length)} sections: ${sampled.join(', ')}`,
  );
  const sectionsChecked = await checkLiveSections(dataset, sampled, cacheDir);
  const problemsBeforeEnumeration = problems.length;
  console.log('check 3 — live enumeration (landing + 18 chapter pages)');
  await checkLiveEnumeration(dataset, cacheDir);
  invariant('enumeration_problems', problems.length - problemsBeforeEnumeration);
  invariant(
    'sections_identical',
    `${String(sectionsChecked.filter((s) => s.identical).length)}/${String(sectionsChecked.length)}`,
  );
  invariant(
    'http_requests',
    `${String(fetchCounters.live)} live, ${String(fetchCounters.cached)} from cache`,
  );
  invariant(
    'section_hashes_recomputed_from_live_html',
    `${String(liveCounters.sectionHashesMatching)}/${String(sectionsChecked.length)} match`,
  );

  const hashesConsistent =
    hashesConsistentSoFar && !problems.some((p) => p.startsWith('[check 4]'));
  const verdict: VerifyReport['verdict'] = problems.length === 0 ? 'PASS' : 'FAIL';
  const summary = [
    `verdict ${verdict}`,
    `${String(sectionsChecked.filter((s) => s.identical).length)}/${String(sectionsChecked.length)} sampled sections identical to the live site`,
    `${String(structure.allTextItems.length)} item hashes verified`,
    `${String(duplicates.crossSection.length)} cross-section duplicate proposition(s), ${String(duplicates.sameSection.length)} same-section, ${String(duplicates.titles.length)} duplicate title(s)`,
    `gzip ${String(gzipBytes)} bytes (level 9)`,
    `${String(fetchCounters.live)} live HTTP request(s), ${String(fetchCounters.cached)} served from cache`,
    `${((Date.now() - started) / 1000).toFixed(1)} s`,
  ];
  const report: VerifyReport = {
    verdict,
    sections_checked: sectionsChecked,
    invariants,
    hashes_consistent: hashesConsistent,
    files: [datasetPath, hashesPath, EXPECTED_PATH, fileURLToPath(import.meta.url)],
    problems,
    notes: [...summary, ...notes].join(' | '),
    duplicate_ids: structure.duplicateIds,
    duplicate_section_urls: structure.duplicateSectionUrls,
    gzip_bytes_measured: gzipBytes,
    duplicate_propositions: duplicates.crossSection,
    duplicate_propositions_same_section: duplicates.sameSection,
    duplicate_section_titles: duplicates.titles,
    requests_made: fetchCounters.requests,
    live_requests: fetchCounters.live,
  };

  console.log('\n=== VERIFY SUMMARY ===');
  for (const line of summary) console.log(`  ${line}`);
  for (const s of sectionsChecked) {
    console.log(
      `  ${s.identical ? 'OK  ' : 'DIFF'} ${s.id} ${s.url}${s.diff_summary === undefined ? '' : ` — ${s.diff_summary}`}`,
    );
  }
  for (const d of duplicates.crossSection)
    console.log(`  duplicate across sections: ${d.ids.join(', ')} "${excerpt(d.text)}"`);
  for (const d of duplicates.sameSection)
    console.log(`  duplicate inside a section: ${d.ids.join(', ')} "${excerpt(d.text)}"`);
  for (const d of duplicates.titles)
    console.log(`  duplicate title: ${d.ids.join(', ')} "${d.text}"`);
  for (const n of notes) console.log(`  note: ${n}`);
  if (problems.length > 0) {
    console.log(`\n${String(problems.length)} PROBLEM(S):`);
    for (const p of problems) console.log(`  - ${p}`);
  }
  if (jsonPath !== null) {
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nreport written to ${jsonPath}`);
  }
  process.exitCode = verdict === 'PASS' ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(
    `VERIFY CRASHED: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  );
  process.exitCode = 2;
});
