/**
 * Turns one stored crawl into the private corpus of the 2026 edition. Offline: not one request.
 *
 *   npx tsx scripts/ingest-2026.ts                      latest crawl → private/corpus/aec-2026.json
 *   npx tsx scripts/ingest-2026.ts --from private/html/<stamp>
 *   npx tsx scripts/ingest-2026.ts --write-expected     also (re)writes data/2026/expected-invariants.json
 *   npx tsx scripts/ingest-2026.ts --check              parses and compares, writes nothing
 *
 * What it refuses:
 *   - a stored page whose SHA-256 is not the one the crawler logged (the file was touched);
 *   - any disagreement between the landing page, the part pages and the chapter pages;
 *   - a number of propositions different from the one the site announces (D15.11);
 *   - counts that differ from data/2026/expected-invariants.json — the repository's memory of
 *     what the book looked like when a human last looked. A change there is not an error of the
 *     source, it is a new fact, and accepting it is a visible commit (`--write-expected`).
 *
 * What it prints: identifiers and numbers. Never a sentence of the programme (D15.6) — a log is
 * a place text escapes from.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SITE_ORIGIN, sha256 } from './aec-common.js';
import {
  buildCorpus,
  compareInvariants,
  measureInvariants,
  type ExpectedInvariants26,
} from './aec26-core.js';
import { CRAWL_ROOT, parseToc, type FetchLog } from './aec26-source.js';
import type { PrivateCorpus } from './aec26-types.js';

export const PRIVATE_CORPUS_PATH = 'private/corpus/aec-2026.json';
export const EXPECTED_INVARIANTS_PATH = 'data/2026/expected-invariants.json';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

/** The most recent crawl directory that finished (it has a fetch log). */
export function latestCrawlDir(root = CRAWL_ROOT): string {
  const stamps = existsSync(root)
    ? readdirSync(root)
        .filter((d) => existsSync(resolve(root, d, 'fetch-log.json')))
        .sort()
    : [];
  const last = stamps.at(-1);
  if (last === undefined) {
    throw new Error(`no crawl under ${root}/ — run scripts/crawl-2026.ts (with the user's accord)`);
  }
  return resolve(root, last);
}

/** Loads a crawl and checks every file against the hash the crawler logged for it. */
export function loadCrawl(dir: string): { log: FetchLog; pages: Map<string, string> } {
  const log = JSON.parse(readFileSync(resolve(dir, 'fetch-log.json'), 'utf8')) as FetchLog;
  const pages = new Map<string, string>();
  for (const page of log.pages) {
    const body = readFileSync(resolve(dir, page.file), 'utf8');
    if (sha256(body) !== page.sha256) {
      throw new Error(`${page.file}: not the bytes that were fetched (hash differs from the log)`);
    }
    pages.set(page.id, body);
  }
  return { log, pages };
}

export function ingestCrawl(dir: string): PrivateCorpus {
  const { log, pages } = loadCrawl(dir);
  const landing = pages.get('landing');
  if (landing === undefined) throw new Error('crawl has no landing page');
  return buildCorpus({ toc: parseToc(landing), pages, log, siteOrigin: SITE_ORIGIN });
}

function main(): void {
  const dir = resolve(option('--from') ?? latestCrawlDir());
  const out = resolve(option('--out') ?? PRIVATE_CORPUS_PATH);
  const checkOnly = process.argv.includes('--check');
  const writeExpected = process.argv.includes('--write-expected');

  const corpus = ingestCrawl(dir);
  const measured = measureInvariants(corpus);

  if (writeExpected && !checkOnly) {
    mkdirSync(dirname(EXPECTED_INVARIANTS_PATH), { recursive: true });
    writeFileSync(EXPECTED_INVARIANTS_PATH, `${JSON.stringify(measured, null, 2)}\n`);
  } else if (existsSync(EXPECTED_INVARIANTS_PATH)) {
    const expected = JSON.parse(
      readFileSync(EXPECTED_INVARIANTS_PATH, 'utf8'),
    ) as ExpectedInvariants26;
    const differences = compareInvariants(measured, expected);
    if (differences.length > 0) {
      console.error(
        `The book no longer has the shape recorded in ${EXPECTED_INVARIANTS_PATH}:\n- ` +
          `${differences.join('\n- ')}\n` +
          'Nothing was written. If the source really changed, re-run with --write-expected and ' +
          'commit the difference: that commit is the record of the change.',
      );
      process.exit(1);
    }
  } else {
    console.error(
      `${EXPECTED_INVARIANTS_PATH} does not exist: run once with --write-expected and read it.`,
    );
    process.exit(1);
  }

  if (!checkOnly) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(corpus, null, 2)}\n`);
  }

  const c = corpus.meta.counts;
  console.log(
    [
      `crawl ${corpus.meta.crawl_stamp} → corpus ${corpus.meta.corpus_version}` +
        (checkOnly ? ' (checked, nothing written)' : ''),
      `  ${String(c.parts)} parts, ${String(c.chapters)} chapters, ${String(c.sections)} sections`,
      `  ${String(c.key_measures)} key measures + ${String(c.measures)} measures + ` +
        `${String(c.sub_measures)} sub-measures = ${String(c.propositions)} propositions ` +
        `(official: ${String(corpus.meta.official_count)})`,
      `  ${String(c.section_paragraphs)} section paragraphs, ${String(c.part_paragraphs)} part, ` +
        `${String(c.chapter_paragraphs)} chapter, introduction ${String(c.introduction_headings)} ` +
        `headings + ${String(c.introduction_paragraphs)} paragraphs`,
      `  ${String(corpus.meta.anomalies.length)} anomaly(ies): ` +
        corpus.meta.anomalies.map((a) => `${a.page} ${a.kind}`).join(', '),
    ].join('\n'),
  );
}

// Run only as a script: the functions above are imported by the verifier and the publisher.
if (process.argv[1] !== undefined && /ingest-2026\.ts$/.test(process.argv[1])) main();
