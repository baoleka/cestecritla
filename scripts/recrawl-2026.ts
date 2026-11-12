/**
 * The weekly check of the book, in one command (D15.12). Local only: the source answers 403 to
 * GitHub runners.
 *
 *   npx tsx scripts/recrawl-2026.ts --dry-run   no request: re-reads the latest stored crawl and
 *                                               compares it with the private corpus
 *   npx tsx scripts/recrawl-2026.ts             crawls (35 requests, refused within 24 h of the
 *                                               last one), then the same comparison
 *
 * What it does after reading the pages:
 *   1. ingests them — every cross-check of ingest-2026.ts applies, the official count included;
 *   2. compares the result with private/corpus/aec-2026.json, section by official anchor;
 *   3. lists what the difference breaks: pinned quotations and editorial supports whose
 *      `{id, sha256}` no longer name the same sentence.
 *
 * What it never does: write the corpus, the manifest or anything public. A changed book is read
 * by a human first; `ingest-2026.ts` then `publish-2026.ts` are the two deliberate steps after.
 *
 * It prints identifiers and counts. Never a sentence — a re-crawl report gets pasted into
 * issues and commit messages.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { diffCorpora, flatItems, isEmptyDiff } from './aec26-core.js';
import type { PrivateCorpus } from './aec26-types.js';
import { PRIVATE_CORPUS_PATH, ingestCrawl, latestCrawlDir } from './ingest-2026.js';
import { collectQuoteRequests } from './publish-2026.js';

interface Pinned {
  id: string;
  sha256: string;
}
interface EditorialFile {
  entries: { id: string; supports?: Pinned[] }[];
}

/** Every `{id, sha256}` the editorial content relies on, quoted or not. */
function pinnedSupports(): { owner: string; pin: Pinned }[] {
  const out: { owner: string; pin: Pinned }[] = [];
  for (const [path, prefix] of [
    ['data/2026/riposte.json', 'riposte'],
    ['data/2026/glossary.json', 'mot'],
  ] as const) {
    if (!existsSync(path)) continue;
    const file = JSON.parse(readFileSync(path, 'utf8')) as EditorialFile;
    for (const entry of file.entries) {
      for (const pin of entry.supports ?? []) out.push({ owner: `${prefix}:${entry.id}`, pin });
    }
  }
  return out;
}

function main(): void {
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun) {
    const crawl = spawnSync('npx', ['--no-install', 'tsx', 'scripts/crawl-2026.ts'], {
      stdio: 'inherit',
    });
    if (crawl.status !== 0) process.exit(crawl.status ?? 1);
  }
  const dir = latestCrawlDir();
  const fresh = ingestCrawl(dir);
  const current = JSON.parse(readFileSync(PRIVATE_CORPUS_PATH, 'utf8')) as PrivateCorpus;
  const diff = diffCorpora(current, fresh);

  console.log(
    `corpus ${current.meta.corpus_version} (crawl ${current.meta.crawl_stamp}) ` +
      `against crawl ${fresh.meta.crawl_stamp} → ${fresh.meta.corpus_version}`,
  );
  if (isEmptyDiff(diff)) {
    console.log('no change: same sections, same sentences, same identifiers');
    return;
  }

  const list = (ids: readonly string[]): string =>
    ids.length === 0
      ? 'none'
      : `${String(ids.length)} — ${ids.slice(0, 30).join(', ')}${ids.length > 30 ? ', …' : ''}`;
  const hashes = new Map(
    fresh.sections.flatMap((s) => flatItems(s.items)).map((i) => [i.id, i.hash]),
  );
  const broken = pinnedSupports()
    .filter(({ pin }) => hashes.get(pin.id) !== pin.sha256)
    .map(({ owner, pin }) => `${owner} → ${pin.id}`);
  const quoted = new Set(collectQuoteRequests().map((r) => r.id));
  console.log(
    [
      'THE BOOK CHANGED',
      `  sections added:    ${list(diff.sectionsAdded)}`,
      `  sections removed:  ${list(diff.sectionsRemoved)}`,
      `  sections changed:  ${list(diff.sectionsChanged)}`,
      `  front matter:      ${list(diff.frontMatterChanged)}`,
      `  sentences: ${String(diff.itemsAdded)} new, ${String(diff.itemsRemoved)} gone`,
      `  identifiers that no longer name the same sentence: ${list(diff.idsMoved)}`,
      `  editorial supports broken: ${list(broken)}`,
      `  of which quoted whole: ${String(broken.filter((b) => quoted.has(b.split(' → ')[1] ?? '')).length)}`,
      '',
      'Nothing was written. Next, deliberately: ingest-2026.ts --write-expected (and commit the',
      'difference in expected-invariants.json), re-anchor the broken supports, publish-2026.ts,',
      'verify-2026.ts.',
    ].join('\n'),
  );
  process.exitCode = 3;
}

if (process.argv[1] !== undefined && /recrawl-2026\.ts$/.test(process.argv[1])) main();
