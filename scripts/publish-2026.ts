/**
 * Publishes what the repository is allowed to hold about the 2026 edition (D15.6, D15.7).
 *
 *   npx tsx scripts/publish-2026.ts --report        the measured exposure, nothing written
 *   npx tsx scripts/publish-2026.ts                 writes data/2026/manifest.json and quotes.json
 *   npx tsx scripts/publish-2026.ts --check         regenerates in memory, compares with the files
 *   npx tsx scripts/publish-2026.ts --anchor-only   the retreat: no locator at all, links stop at
 *                                                   the section anchor (combine with the above)
 *
 * It refuses to write when:
 *   - the licence clause of the source is no longer the one the policy was decided under;
 *   - a ceiling of data/2026/exposure-policy.json is broken;
 *   - a quotation is pinned to a sentence that changed, or names something that is not a
 *     proposition (prose is never quoted).
 *
 * Reads private/ — and is therefore a local tool, never a build step: the site is built from
 * the files this writes, by a CI that has no corpus (scripts/check-repo.test.ts).
 *
 * It prints numbers and identifiers. Never a sentence.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SITE_ORIGIN } from './aec-common.js';
import {
  buildManifest,
  buildQuotes,
  ceilingViolations,
  licenseClause,
  manifestPropositions,
  validateManifest,
  validateQuotes,
  type PublishResult,
  type QuoteRequest,
} from './aec26-publish.js';
import { CRAWL_ROOT } from './aec26-source.js';
import type { ExposurePolicy, PrivateCorpus } from './aec26-types.js';
import { PRIVATE_CORPUS_PATH, loadCrawl } from './ingest-2026.js';

export const MANIFEST_PATH = 'data/2026/manifest.json';
export const QUOTES_PATH = 'data/2026/quotes.json';
export const POLICY_PATH = 'data/2026/exposure-policy.json';
export const LEGAL_URL = `${SITE_ORIGIN}/mentions-legales/`;

/** Editorial files that may quote a proposition whole, and the prefix their entries cite under. */
const EDITORIAL: readonly { path: string; prefix: string }[] = [
  { path: 'data/2026/riposte.json', prefix: 'riposte' },
  { path: 'data/2026/glossary.json', prefix: 'mot' },
];

interface EditorialFile {
  entries: { id: string; supports?: { id: string; sha256: string; quote?: boolean }[] }[];
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Every `supports[].quote === true` of the editorial files: the whole quotations asked for. */
export function collectQuoteRequests(): QuoteRequest[] {
  const out: QuoteRequest[] = [];
  for (const { path, prefix } of EDITORIAL) {
    if (!existsSync(path)) continue;
    for (const entry of (readJson(path) as EditorialFile).entries) {
      for (const support of entry.supports ?? []) {
        if (support.quote === true) {
          out.push({ id: support.id, sha256: support.sha256, usedBy: `${prefix}:${entry.id}` });
        }
      }
    }
  }
  return out;
}

const fr = (n: number): string => n.toLocaleString('fr-FR').replace(/\s/g, ' ');
const pct = (part: number, whole: number): string =>
  whole === 0 ? '—' : `${((part / whole) * 100).toFixed(2)} %`;

function report(
  corpus: PrivateCorpus,
  result: PublishResult,
  policy: ExposurePolicy,
  quotedCount: number,
  run: (override: Partial<ExposurePolicy>) => PublishResult,
): string {
  const e = result.manifest.meta.exposure;
  const props = manifestPropositions(result.manifest);
  const titles = [...corpus.parts, ...corpus.chapters, ...corpus.sections];
  const titleWords = titles.reduce((n, t) => n + t.title.split(' ').length, 0);
  const row = (label: string, items: string, words: string, share: string, note = ''): string =>
    `  ${label.padEnd(38)}${items.padStart(7)}${words.padStart(9)}${share.padStart(10)}  ${note}`;
  const lines = [
    `Edition 2026 — corpus ${corpus.meta.corpus_version}, crawl ${corpus.meta.crawl_stamp}`,
    `Policy: locators ${String(policy.locator_min_words)}–${String(policy.locator_max_words)} words, ` +
      `scope "${policy.locator_scope}", read ${policy.locator_display === 'search' ? 'in links and next to them in a search result' : 'in links only'}, ` +
      `at most ${String(policy.locator_max_item_share * 100)} % of an item; ` +
      `incipits ${String(policy.incipit_min_words)}–${String(policy.incipit_max_words)} words, key measures only`,
    `Validated by the editor: ${policy.validated_on ?? 'NOT YET — nothing derived from it may be pushed or deployed'}`,
    '',
    row('', 'items', 'words', 'share', '(share of the words of the propositions)'),
    row('Propositions', fr(props.length), fr(e.proposition_words), '100 %'),
    row(
      'Official titles shown',
      fr(titles.length),
      fr(titleWords),
      '—',
      'parts, chapters, sections',
    ),
    row(
      'Visible incipits (key measures)',
      fr(props.filter((i) => i.incipit !== undefined).length),
      fr(e.incipit_words),
      pct(e.incipit_words, e.proposition_words),
    ),
    row(
      'Link locators (inside href only)',
      fr(props.filter((i) => typeof i.locator === 'string').length),
      fr(e.locator_words),
      pct(e.locator_words, e.proposition_words),
    ),
    row(
      'Whole quotations',
      fr(quotedCount),
      fr(e.quote_words),
      pct(e.quote_words, e.proposition_words),
      `ceiling ${String(policy.max_quotes)} and ${String(policy.max_quote_share * 100)} %`,
    ),
    row(
      'Covered, each item counted once',
      '',
      fr(e.covered_words),
      pct(e.covered_words, e.proposition_words),
      `ceiling ${String(policy.max_share * 100)} %`,
    ),
    row(
      'Left with two words or fewer',
      fr(e.fully_exposed),
      '',
      '',
      `ceiling ${String(policy.max_fully_exposed)}`,
    ),
    '',
    `  Locator lengths: ${Object.entries(result.locatorLengths)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([words, n]) => `${words} words × ${fr(n)}`)
      .join(', ')}`,
    `  Links that stop at the section anchor: ${fr(e.locators_anchor_only)} — ${Object.entries(
      result.anchorOnly,
    )
      .map(([reason, n]) => `${reason} ${fr(n)}`)
      .join(', ')}`,
    '',
    '  Dials (covered share / locators / anchor-only):',
  ];
  for (const scope of ['all', 'key_and_quoted', 'none'] as const) {
    for (const floor of scope === 'none' ? [policy.locator_min_words] : [3, 4, 5]) {
      const x = run({ locator_scope: scope, locator_min_words: floor }).manifest.meta.exposure;
      const current = scope === policy.locator_scope && floor === policy.locator_min_words;
      lines.push(
        `    scope ${scope.padEnd(15)} floor ${String(floor)}  →  ${pct(x.covered_words, x.proposition_words).padStart(8)}` +
          `  locator words ${fr(x.locator_words).padStart(6)}  anchor-only ${fr(x.locators_anchor_only).padStart(5)}` +
          `  fully exposed ${String(x.fully_exposed)}${current ? '   ← current policy' : ''}`,
      );
    }
  }
  return lines.join('\n');
}

function stable(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const corpus = readJson(PRIVATE_CORPUS_PATH) as PrivateCorpus;
  const base = readJson(POLICY_PATH) as ExposurePolicy;
  const policy: ExposurePolicy = args.has('--anchor-only')
    ? { ...base, locator_scope: 'none' }
    : base;
  const { pages } = loadCrawl(resolve(CRAWL_ROOT, corpus.meta.crawl_stamp));

  const legal = pages.get('legal');
  if (legal === undefined) throw new Error('the crawl has no legal notice');
  const clause = licenseClause(legal);
  if (clause.sha256 !== policy.license_statement_sha256) {
    console.error(
      'The licence clause of the source is not the one the exposure policy was decided under.\n' +
        `  policy:  ${policy.license_statement_sha256}\n  source:  ${clause.sha256}\n` +
        'Nothing was written. Read the new clause (private/html/<stamp>/mentions-legales.html),\n' +
        'decide again, then record its hash in data/2026/exposure-policy.json.',
    );
    process.exit(1);
  }

  const requests = collectQuoteRequests();
  const quoted = new Set(requests.map((r) => r.id));
  const license = { statement_url: LEGAL_URL, statement_sha256: clause.sha256 };
  const run = (override: Partial<ExposurePolicy>): PublishResult =>
    buildManifest({ corpus, pages, policy: { ...policy, ...override }, quoted, license });
  const result = run({});
  const quotes = buildQuotes(corpus, result.manifest, requests);

  console.log(report(corpus, result, policy, quoted.size, run));

  const problems = [
    ...validateManifest(result.manifest, policy),
    ...validateQuotes(quotes, result.manifest),
    ...ceilingViolations(result.manifest.meta.exposure, quoted.size, policy),
  ];
  if (problems.length > 0) {
    console.error(`\nREFUSED (${String(problems.length)}):\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  if (args.has('--report')) return;

  const files: [string, string][] = [
    [MANIFEST_PATH, stable(result.manifest)],
    [QUOTES_PATH, stable(quotes)],
  ];
  if (args.has('--check')) {
    const stale = files.filter(
      ([path, body]) => !existsSync(path) || readFileSync(path, 'utf8') !== body,
    );
    if (stale.length > 0) {
      console.error(
        `\nOut of date: ${stale.map(([path]) => path).join(', ')} — run publish-2026.ts`,
      );
      process.exit(1);
    }
    console.log('\nThe published files are exactly what the corpus and the policy produce.');
    return;
  }
  for (const [path, body] of files) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
  }
  console.log(`\nWritten: ${files.map(([path]) => path).join(', ')}`);
}

if (process.argv[1] !== undefined && /publish-2026\.ts$/.test(process.argv[1])) main();
