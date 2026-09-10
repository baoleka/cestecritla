/**
 * RSS cross-check: the WordPress feed `/feed/?post_type=lfi_programme_2025&paged=1..21` exposes the
 * same posts (sections, chapters, parts, introduction) under many alias URLs. This script fetches the
 * feed pages, deduplicates items by content and checks that every canonical section of
 * data/aec-2025.json appears in the feed. RSS content is NEVER used in the dataset itself.
 *
 * Usage: npx tsx scripts/rss-crosscheck.ts   (or: npx tsx scripts/ingest.ts --rss)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  FEED_URL_PREFIX,
  HttpError,
  MAX_CONCURRENCY,
  canonicalUrl,
  fetchStats,
  fetchText,
  mapWithConcurrency,
  sha256,
} from './aec-common.js';
import {
  DATASET_PATH,
  EXPECTED_PATH,
  ParseError,
  parseSectionPage,
  sectionFingerprint,
} from './ingest.js';
import type { Dataset, ExpectedInvariants } from './aec-types.js';

const FEED_PAGES = 21;

export interface RssItem {
  page: number;
  link: string;
  title: string;
  content: string;
}

export interface RssCrosscheckResult {
  rss_items: number;
  rss_unique_contents: number;
  rss_section_items: number;
  rss_unique_sections: number;
  rss_alias_urls: number;
  /** Canonical sections absent from the feed (ids), whether or not they are on the allowlist. */
  canonical_missing_in_rss: string[];
  /** Subset of `canonical_missing_in_rss` NOT on the reviewed allowlist: fails the check. */
  canonical_missing_unexpected: string[];
  /** Feed items whose content matches no canonical section (stale alias posts), one line per item. */
  rss_sections_not_in_canonical: string[];
  feed_pages_fetched: number;
  requests: number;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Extract a child element's text, unwrapping CDATA. */
function xmlField(item: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`);
  const match = re.exec(item);
  const raw = match?.[1];
  if (raw === undefined) return undefined;
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  return cdata?.[1] !== undefined ? cdata[1] : decodeXmlEntities(raw.trim());
}

/** Parse one RSS 2.0 page into items (link, title, content:encoded). */
export function parseFeedPage(xml: string, page: number): RssItem[] {
  const items: RssItem[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const body = match[1] ?? '';
    const link = xmlField(body, 'link');
    const title = xmlField(body, 'title') ?? '';
    const content = xmlField(body, 'content:encoded');
    if (link === undefined || content === undefined) {
      throw new ParseError(`feed page ${String(page)}`, 'item without <link> or <content:encoded>');
    }
    items.push({ page, link: link.trim(), title, content });
  }
  return items;
}

/**
 * Optional local cache of the raw feed pages (development only): when AEC_FEED_CACHE_DIR is set,
 * pages already present there are read instead of fetched, so the analysis can be re-run without
 * hitting the site again.
 */
function feedCachePath(page: number): string | null {
  const dir = process.env['AEC_FEED_CACHE_DIR'];
  if (dir === undefined || dir === '') return null;
  mkdirSync(dir, { recursive: true });
  return resolve(dir, `feed-${String(page).padStart(2, '0')}.xml`);
}

async function fetchFeed(): Promise<{ items: RssItem[]; pagesFetched: number }> {
  const pages = Array.from({ length: FEED_PAGES }, (_, i) => i + 1);
  const results = await mapWithConcurrency(pages, MAX_CONCURRENCY, async (page) => {
    // WordPress redirects `paged=1` to the bare feed URL, so page 1 is requested without it.
    const url =
      page === 1 ? FEED_URL_PREFIX.replace(/&paged=$/, '') : `${FEED_URL_PREFIX}${String(page)}`;
    const cachePath = feedCachePath(page);
    if (cachePath !== null && existsSync(cachePath)) {
      const items = parseFeedPage(readFileSync(cachePath, 'utf8'), page);
      console.log(`CACHE ${cachePath} → ${String(items.length)} items`);
      return items;
    }
    try {
      const xml = await fetchText(url, 'application/rss+xml, application/xml, text/xml');
      if (cachePath !== null) writeFileSync(cachePath, xml);
      const items = parseFeedPage(xml, page);
      console.log(`GET ${url} → ${String(items.length)} items`);
      return items;
    } catch (error) {
      // WordPress answers 404 past the last page: that is the natural end of the feed.
      if (error instanceof HttpError && error.status === 404) {
        console.log(`GET ${url} → 404 (end of feed)`);
        return null;
      }
      throw error;
    }
  });
  const items: RssItem[] = [];
  let pagesFetched = 0;
  for (const pageItems of results) {
    if (pageItems === null) continue;
    pagesFetched += 1;
    items.push(...pageItems);
  }
  return { items, pagesFetched };
}

export async function runRssCrosscheck(dataset: Dataset): Promise<RssCrosscheckResult> {
  const requestsBefore = fetchStats.requests;
  const { items, pagesFetched } = await fetchFeed();

  // Canonical side: fingerprint (title + all texts) → section id.
  const canonicalByFingerprint = new Map<string, string>();
  const canonicalByUrl = new Map<string, string>();
  for (const section of dataset.sections) {
    canonicalByFingerprint.set(sectionFingerprint(section), section.id);
    canonicalByUrl.set(section.url, section.id);
  }
  const canonicalUrlsOfOtherPosts = new Set<string>([
    dataset.introduction.url,
    ...dataset.parts.map((p) => p.url),
    ...dataset.chapters.map((c) => c.url),
  ]);

  const uniqueContents = new Set<string>();
  const uniqueSections = new Map<string, string>(); // fingerprint → first link
  const seenSectionIds = new Set<string>();
  const unknownSections: string[] = [];
  let sectionItems = 0;
  let aliasUrls = 0;

  for (const item of items) {
    uniqueContents.add(sha256(item.content));
    const link = canonicalUrl(item.link);
    if (!item.content.includes('<main class="section')) {
      // Chapter, part or introduction post: only the URL can be an alias.
      if (!canonicalUrlsOfOtherPosts.has(link)) aliasUrls += 1;
      continue;
    }
    sectionItems += 1;
    const parsed = parseSectionPage(item.content, 'rss', `feed p${String(item.page)} ${item.link}`);
    const fingerprint = sectionFingerprint(parsed);
    if (!uniqueSections.has(fingerprint)) uniqueSections.set(fingerprint, link);
    const sectionId = canonicalByFingerprint.get(fingerprint);
    if (sectionId === undefined) {
      unknownSections.push(`${item.link} "${parsed.title}"`);
      continue;
    }
    seenSectionIds.add(sectionId);
    if (canonicalByUrl.get(link) !== sectionId) aliasUrls += 1;
  }

  const known = new Set(
    existsSync(EXPECTED_PATH)
      ? (JSON.parse(readFileSync(EXPECTED_PATH, 'utf8')) as ExpectedInvariants)
          .rss_known_missing_section_ids
      : [],
  );
  const missing = dataset.sections.filter((s) => !seenSectionIds.has(s.id)).map((s) => s.id);
  const result: RssCrosscheckResult = {
    rss_items: items.length,
    rss_unique_contents: uniqueContents.size,
    rss_section_items: sectionItems,
    rss_unique_sections: uniqueSections.size,
    rss_alias_urls: aliasUrls,
    canonical_missing_in_rss: missing,
    canonical_missing_unexpected: missing.filter((id) => !known.has(id)),
    rss_sections_not_in_canonical: unknownSections,
    feed_pages_fetched: pagesFetched,
    requests: fetchStats.requests - requestsBefore,
  };

  console.log('\n=== RSS CROSS-CHECK ===');
  console.log(
    `feed pages fetched          ${String(result.feed_pages_fetched)} (${String(result.requests)} requests)`,
  );
  console.log(`rss items                   ${String(result.rss_items)}`);
  console.log(`rss unique contents         ${String(result.rss_unique_contents)}`);
  console.log(
    `rss section items           ${String(result.rss_section_items)} (${String(result.rss_unique_sections)} unique by content)`,
  );
  console.log(`rss alias urls              ${String(result.rss_alias_urls)}`);
  console.log(`canonical missing in rss    ${String(result.canonical_missing_in_rss.length)}`);
  for (const m of result.canonical_missing_in_rss) {
    console.log(
      `   - ${m}${known.has(m) ? ' (known site-side gap, allowlisted in expected-invariants.json)' : ' (UNEXPECTED)'}`,
    );
  }
  console.log(
    `stale alias posts           ${String(result.rss_sections_not_in_canonical.length)} item(s) whose content matches no canonical section`,
  );
  for (const u of result.rss_sections_not_in_canonical) console.log(`   - ${u}`);
  if (result.canonical_missing_unexpected.length > 0) {
    console.error(
      '\nRSS CROSS-CHECK FAILED: canonical sections absent from the feed and not allowlisted\n',
    );
    process.exitCode = 1;
  }
  return result;
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  const dataset = JSON.parse(readFileSync(DATASET_PATH, 'utf8')) as Dataset;
  runRssCrosscheck(dataset).catch((error: unknown) => {
    console.error(
      `\nRSS CROSS-CHECK FAILED: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
}
