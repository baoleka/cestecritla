/**
 * Collects the pages of the 2026 edition ONCE, into private/html/<stamp>/ (D15.6).
 *
 *   npx tsx scripts/crawl-2026.ts            35 requests; refuses a second run within 24 hours
 *   npx tsx scripts/crawl-2026.ts --force    the same, without the 24-hour refusal
 *
 * Why fetching is its own step. Everything downstream — parsing, verification in a real
 * browser, link locators, re-derivations after a policy change — reads the files written here
 * and sends nothing. The September session spent about 680 requests because each tool fetched
 * for itself; the whole book is 31 pages, so the right number of crawls per week is one.
 *
 * What is collected, and nothing else:
 *   robots.txt                      read first; a disallow on the book aborts the run
 *   /programme/livre/               the table of contents — the only source of URLs
 *   introduction, 6 parts, 23 chapters      exactly the links that page publishes
 *   /mentions-legales/              the licence clause the manifest is published under
 *   /programme/decouvrir/           the official count ("1 069 mesures")
 *   /feed/?post_type=…              dates only
 *
 * Crawling policy, unchanged and non-negotiable (scripts/aec-common.ts): identifiable
 * User-Agent, concurrency <= 4, one pass, at most 2 retries with backoff, canonical URLs only,
 * no redirect followed, no URL guessed. Plus a hard cap of 40 requests: a page that suddenly
 * links to 300 chapters stops the run instead of being obeyed.
 *
 * The files are the text of a book that is "tous droits réservés" (D15.1): they stay under
 * private/, which git ignores and scripts/check-repo.test.ts guards.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  MAX_CONCURRENCY,
  MAX_RETRIES,
  SITE_ORIGIN,
  USER_AGENT,
  canonicalUrl,
  mapWithConcurrency,
} from './aec-common.js';
import {
  BOOK_PATH_2026,
  CRAWL_ROOT,
  FEED_PATH_2026,
  parseToc,
  robotsDisallows,
  type FetchLog,
  type FetchedPage,
} from './aec26-source.js';

const REQUEST_CAP = 40;
const MIN_HOURS_BETWEEN_CRAWLS = 24;

/** Headers worth keeping: they describe the page. cf-ray and its kin describe the request. */
const KEPT_HEADERS =
  /^(date|content-type|cache-control|last-modified|etag|link|x-robots-tag|document-policy|content-security-policy)$/i;

let requests = 0;
let retries = 0;

const sha256Hex = (body: string): string => createHash('sha256').update(body, 'utf8').digest('hex');

/** One polite GET. A 3xx is an error: the crawler must know exactly which URL it is reading. */
async function get(url: string): Promise<{ status: number; body: string; headers: Headers }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      retries += 1;
      await sleep(1500 * 2 ** (attempt - 1));
    }
    if (requests >= REQUEST_CAP) {
      throw new Error(`request cap of ${String(REQUEST_CAP)} reached — refusing to go on`);
    }
    requests += 1;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xml;q=0.9,*/*;q=0.5' },
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 429 || res.status >= 500) {
        await res.body?.cancel();
        lastError = new Error(`HTTP ${String(res.status)} for ${url}`);
        continue;
      }
      return { status: res.status, body: await res.text(), headers: res.headers };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function latestCrawl(): FetchLog | null {
  if (!existsSync(CRAWL_ROOT)) return null;
  const stamps = readdirSync(CRAWL_ROOT)
    .filter((d) => existsSync(resolve(CRAWL_ROOT, d, 'fetch-log.json')))
    .sort();
  const last = stamps.at(-1);
  if (last === undefined) return null;
  return JSON.parse(readFileSync(resolve(CRAWL_ROOT, last, 'fetch-log.json'), 'utf8')) as FetchLog;
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const previous = latestCrawl();
  if (previous !== null && !force) {
    const hours = (Date.now() - Date.parse(previous.started_at)) / 3_600_000;
    if (hours < MIN_HOURS_BETWEEN_CRAWLS) {
      console.error(
        `Last crawl is ${hours.toFixed(1)} h old (${previous.stamp}). One crawl a day is the ` +
          'ceiling; everything else reads the files. Use --force if the source really moved.',
      );
      process.exit(1);
    }
  }

  const started = new Date();
  const stamp = started
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
  const dir = resolve(CRAWL_ROOT, stamp);
  mkdirSync(dir, { recursive: true });
  const pages: FetchedPage[] = [];

  const keep = async (id: string, url: string, file: string): Promise<string> => {
    const res = await get(url);
    if (res.status !== 200) {
      const location = res.headers.get('location');
      throw new Error(
        `${id}: HTTP ${String(res.status)} for ${url}${location !== null ? ` → ${location}` : ''}`,
      );
    }
    writeFileSync(resolve(dir, file), res.body);
    const headers: Record<string, string> = {};
    res.headers.forEach((value, name) => {
      if (KEPT_HEADERS.test(name)) headers[name] = value;
    });
    pages.push({
      id,
      url,
      file,
      status: res.status,
      bytes: Buffer.byteLength(res.body, 'utf8'),
      sha256: sha256Hex(res.body),
      fetched_at: new Date().toISOString(),
      headers,
    });
    return res.body;
  };

  const robots = await keep('robots', `${SITE_ORIGIN}/robots.txt`, 'robots.txt');
  if (robotsDisallows(robots, BOOK_PATH_2026)) {
    throw new Error('robots.txt disallows the book: nothing is fetched. Archive it and decide.');
  }

  const landing = await keep('landing', canonicalUrl(BOOK_PATH_2026), 'landing.html');
  const toc = parseToc(landing);
  const targets: { id: string; url: string; file: string }[] = [
    { id: 'p0', url: canonicalUrl(toc.introduction.path), file: 'p0.html' },
    ...toc.parts.map((p) => ({ id: p.id, url: canonicalUrl(p.path), file: `${p.id}.html` })),
    ...toc.parts.flatMap((p) =>
      p.chapters.map((c) => ({ id: c.id, url: canonicalUrl(c.path), file: `${c.id}.html` })),
    ),
  ];
  if (targets.length + 5 > REQUEST_CAP) {
    throw new Error(`the table of contents lists ${String(targets.length)} pages: over the cap`);
  }
  await mapWithConcurrency(targets, MAX_CONCURRENCY, (t) => keep(t.id, t.url, t.file));

  await keep('legal', `${SITE_ORIGIN}/mentions-legales/`, 'mentions-legales.html');
  await keep('discover', `${SITE_ORIGIN}/programme/decouvrir/`, 'decouvrir.html');
  await keep('feed', `${SITE_ORIGIN}${FEED_PATH_2026}`, 'feed.xml');

  // The landing is kept in reading order; concurrency shuffles the rest.
  const order = ['robots', 'landing', ...targets.map((t) => t.id), 'legal', 'discover', 'feed'];
  pages.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  const log: FetchLog = {
    stamp,
    started_at: started.toISOString(),
    finished_at: new Date().toISOString(),
    user_agent: USER_AGENT,
    requests,
    retries,
    pages,
  };
  writeFileSync(resolve(dir, 'fetch-log.json'), `${JSON.stringify(log, null, 2)}\n`);
  const chapters = toc.parts.reduce((n, p) => n + p.chapters.length, 0);
  console.log(
    `crawl ${stamp}: ${String(requests)} request(s), ${String(retries)} retry(ies), ` +
      `${String(toc.parts.length)} parts, ${String(chapters)} chapters → ${CRAWL_ROOT}/${stamp}/`,
  );
}

await main();
