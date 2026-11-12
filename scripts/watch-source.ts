/**
 * Has the source moved? Six signals, compared with data/2026/watch.json (D15.12).
 *
 *   npx tsx scripts/watch-source.ts              the latest stored crawl against the baseline —
 *                                                offline, the default, costs nothing
 *   npx tsx scripts/watch-source.ts --live       5 requests to the source, then the same check
 *   npx tsx scripts/watch-source.ts --write      records what is observed as the new baseline
 *
 * Exit: 0 unchanged · 3 a signal changed · 1 could not look
 *
 * Why this exists. The programme was re-issued on 5 November 2026 and the project noticed seven
 * days later, by chance (D15.1). The watch that should have seen it looked at another site. The
 * signals below are the ones that would each have rung:
 *
 *   toc              the table of contents: parts, chapters, their order and titles
 *   official_count   "1 069 mesures": the number the extraction must equal
 *   license_clause   the clause the citation policy was decided under (D15.7)
 *   feed             the feed's last build date: cheap, and it moved on 7/11
 *   robots           whether robots.txt still lets the book be read
 *   document_policy  a `Document-Policy: force-load-at-top` header would silently disable every
 *                    deep link to a sentence
 *
 * It runs from a residential connection only: the site answers 403 to GitHub runners (D14.13).
 * It reports; it never decides. A change means: crawl again (with the editor's accord), read the
 * difference, and only then publish.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SITE_ORIGIN, USER_AGENT, sha256 } from './aec-common.js';
import { licenseClause } from './aec26-publish.js';
import {
  BOOK_PATH_2026,
  FEED_PATH_2026,
  parseOfficialCount,
  parseToc,
  robotsDisallows,
  type FetchLog,
} from './aec26-source.js';
import { latestCrawlDir } from './ingest-2026.js';

export const WATCH_PATH = 'data/2026/watch.json';

export interface WatchSignals {
  toc: string;
  official_count: string;
  license_clause: string;
  feed: string;
  robots: string;
  document_policy: string;
}

export interface WatchFile {
  observed_at: string;
  signals: WatchSignals;
}

export interface Observation {
  robots: string;
  landing: string;
  legal: string;
  discover: string;
  feed: string;
  /** `Document-Policy` response header of the book's pages; null when none sent it. */
  documentPolicy: string | null;
}

export function measure(o: Observation): WatchSignals {
  const toc = parseToc(o.landing);
  return {
    toc: sha256(
      JSON.stringify([
        toc.introduction.path,
        ...toc.parts.map((p) => [p.path, p.title, p.chapters.map((c) => [c.path, c.title])]),
      ]),
    ).slice(0, 16),
    official_count: String(parseOfficialCount(o.discover) ?? '(none)'),
    license_clause: licenseClause(o.legal).sha256,
    feed: /<lastBuildDate>([^<]+)<\/lastBuildDate>/.exec(o.feed)?.[1]?.trim() ?? '(none)',
    robots: robotsDisallows(o.robots, BOOK_PATH_2026) ? 'disallows the book' : 'allows the book',
    document_policy: o.documentPolicy ?? '(absent)',
  };
}

export function compare(baseline: WatchSignals, observed: WatchSignals): string[] {
  return (Object.keys(observed) as (keyof WatchSignals)[])
    .filter((name) => baseline[name] !== observed[name])
    .map((name) => `${name}: was ${baseline[name]}, is ${observed[name]}`);
}

function fromCrawl(dir: string): { observation: Observation; at: string } {
  const log = JSON.parse(readFileSync(resolve(dir, 'fetch-log.json'), 'utf8')) as FetchLog;
  const read = (id: string): string => {
    const page = log.pages.find((p) => p.id === id);
    if (page === undefined) throw new Error(`the crawl has no page "${id}"`);
    return readFileSync(resolve(dir, page.file), 'utf8');
  };
  const policy = log.pages.map((p) => p.headers['document-policy']).find((v) => v !== undefined);
  return {
    observation: {
      robots: read('robots'),
      landing: read('landing'),
      legal: read('legal'),
      discover: read('discover'),
      feed: read('feed'),
      documentPolicy: policy ?? null,
    },
    at: log.started_at,
  };
}

async function live(): Promise<{ observation: Observation; at: string }> {
  let policy: string | null = null;
  const get = async (path: string): Promise<string> => {
    const res = await fetch(`${SITE_ORIGIN}${path}`, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status !== 200) throw new Error(`HTTP ${String(res.status)} for ${path}`);
    policy ??= res.headers.get('document-policy');
    return res.text();
  };
  // Five requests, one after the other: this is a glance, not a crawl.
  const observation: Observation = {
    robots: await get('/robots.txt'),
    landing: await get(BOOK_PATH_2026),
    legal: await get('/mentions-legales/'),
    discover: await get('/programme/decouvrir/'),
    feed: await get(FEED_PATH_2026),
    documentPolicy: null,
  };
  observation.documentPolicy = policy;
  return { observation, at: new Date().toISOString() };
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const { observation, at } = args.has('--live') ? await live() : fromCrawl(latestCrawlDir());
  const signals = measure(observation);
  if (args.has('--write')) {
    const file: WatchFile = { observed_at: at, signals };
    writeFileSync(WATCH_PATH, `${JSON.stringify(file, null, 2)}\n`);
    console.log(`baseline written: ${WATCH_PATH} (observed ${at})`);
    return;
  }
  if (!existsSync(WATCH_PATH)) throw new Error(`${WATCH_PATH} is missing: run once with --write`);
  const baseline = JSON.parse(readFileSync(WATCH_PATH, 'utf8')) as WatchFile;
  const changes = compare(baseline.signals, signals);
  console.log(
    `source observed ${at} (${args.has('--live') ? 'live, 5 requests' : 'stored crawl, no request'}), ` +
      `baseline of ${baseline.observed_at}`,
  );
  if (changes.length === 0) {
    console.log(
      'unchanged: table of contents, official count, licence clause, feed, robots, Document-Policy',
    );
    return;
  }
  console.log(`CHANGED (${String(changes.length)}):\n- ${changes.join('\n- ')}`);
  process.exitCode = 3;
}

if (process.argv[1] !== undefined && /watch-source\.ts$/.test(process.argv[1])) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
