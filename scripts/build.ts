/**
 * The build pipeline (§18.7). Nothing chained these scripts before: they existed separately and
 * the dossier called the missing orchestration the critical path (H-PLA-18).
 *
 * Every step declares what it reads and what it writes, so a broken contract fails here rather
 * than three steps later. Since the 2026 edition (D15.6) the app is built from the published
 * files of data/2026/ and nothing else: the 2025 projection (scripts/build-projection.ts) is no
 * longer a step — that script and its test remain as the tooling of a dated archive.
 *
 *   npm run build          everything
 *   npm run build:fast     the same, skipping any step marked slow (none today: a full build
 *                          takes a few seconds, measured and printed at the end).
 *   npm run build:holding  the holding site (D15.4): two pages, nothing of the programme, and a
 *                          _redirects file so old links land on it. Also the withdrawal gesture
 *                          of runbook sheet 9 (D14.10). See scripts/build-mode.ts.
 *
 * The build is deterministic: no timestamp, no random seed, no network. Two runs in a row
 * produce byte-identical output.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUILD_MARKER, appRedirects, holdingRedirects, type BuildMode } from './build-mode.js';

interface Step {
  readonly name: string;
  readonly script: string;
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  /** Skipped by `build:fast`. */
  readonly slow?: true;
  /** Skipped by `build:holding`: the holding site reads no corpus at all. */
  readonly corpus?: true;
}

/** Steps not yet written are listed as `pending` so the pipeline says what it does not do. */
const STEPS: readonly Step[] = [
  {
    name: 'tokens',
    script: 'scripts/build-tokens.ts',
    reads: ['design/tokens.json'],
    writes: ['src/styles/tokens.css'],
  },
  {
    name: 'fonts',
    script: 'scripts/build-fonts.ts',
    reads: ['design/fonts'],
    writes: ['public/fonts'],
  },
];

/**
 * What the app is built from (D15.6): public files only, all of them committed. The private
 * corpus is never read here — scripts/check-repo.test.ts refuses the word in this file — so a
 * build on CI, which has no corpus, is the same build.
 */
const EDITION_INPUTS: readonly string[] = [
  'data/2026/manifest.json',
  'data/2026/quotes.json',
  'data/2026/id-map-2025.json',
  'data/2026/search-index.json',
  'data/2026/synonyms.json',
  'data/aec-2025.json',
];

/** Every published file must come from the same state of the book. */
function checkEdition(root: string): string {
  for (const input of EDITION_INPUTS) {
    if (!existsSync(resolve(root, input))) throw new Error(`edition: missing input ${input}`);
  }
  const version = (path: string, at: (file: unknown) => unknown): string => {
    const value = at(JSON.parse(readFileSync(resolve(root, path), 'utf8')));
    if (typeof value !== 'string') throw new Error(`edition: ${path} carries no corpus version`);
    return value;
  };
  const meta = (file: unknown): Record<string, unknown> =>
    (file as { meta: Record<string, unknown> }).meta;
  const manifest = version('data/2026/manifest.json', (f) => meta(f)['corpus_version']);
  const others: [string, string][] = [
    ['data/2026/quotes.json', version('data/2026/quotes.json', (f) => meta(f)['corpus_version'])],
    [
      'data/2026/search-index.json',
      version('data/2026/search-index.json', (f) => meta(f)['corpus_version']),
    ],
    [
      'data/2026/id-map-2025.json',
      version(
        'data/2026/id-map-2025.json',
        (f) => (meta(f)['to'] as { corpus_version: unknown }).corpus_version,
      ),
    ],
  ];
  for (const [path, found] of others) {
    if (found !== manifest) {
      throw new Error(`edition: ${path} is from corpus ${found}, the manifest from ${manifest}`);
    }
  }
  return manifest;
}

const root = process.cwd();
const fast = process.argv.includes('--fast');
/** Light rebrand (D0.17): every step is identical, only the token source changes. */
const neutral = process.argv.includes('--neutral');
/** The holding site (D15.4): astro.config.ts switches its source tree on CEL_BUILD. */
const mode: BuildMode = process.argv.includes('--holding') ? 'holding' : 'app';

function run(step: Step): number {
  for (const input of step.reads) {
    if (!existsSync(resolve(root, input))) {
      throw new Error(`step "${step.name}": missing input ${input}`);
    }
  }
  const started = Date.now();
  const args = ['--no-install', 'tsx', step.script];
  if (neutral && step.name === 'tokens') args.push('--neutral');
  execFileSync('npx', args, { stdio: 'inherit', cwd: root });
  for (const output of step.writes) {
    if (!existsSync(resolve(root, output))) {
      throw new Error(`step "${step.name}": declared output ${output} was not produced`);
    }
  }
  return Date.now() - started;
}

const t0 = Date.now();
let n = 0;
for (const step of STEPS) {
  if (fast && step.slow === true) {
    console.log(`· skipped (fast): ${step.name}`);
    continue;
  }
  if (mode === 'holding' && step.corpus === true) {
    console.log(`· skipped (holding): ${step.name}`);
    continue;
  }
  const ms = run(step);
  n += 1;
  console.log(`✓ ${step.name} (${String(ms)} ms)`);
}

const corpusVersion = mode === 'app' ? checkEdition(root) : null;
if (corpusVersion !== null) console.log(`✓ edition 2026, corpus ${corpusVersion}`);

const astroStarted = Date.now();
execFileSync('npx', ['--no-install', 'astro', 'build'], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, CEL_BUILD: mode },
});
console.log(`✓ astro build (${String(Date.now() - astroStarted)} ms)`);

// Old links must land somewhere (D15.4, D15.8). Astro empties dist/ on every build, so a file
// written here can never survive into a build of the other mode. The holding site redirects
// every old prefix to its one page; the app answers `/m/`, `/a/`, `/s/` and `/r/` with real
// bridge pages and only redirects the two prefixes it has nothing to put behind.
writeFileSync(
  resolve(root, 'dist/_redirects'),
  mode === 'holding' ? holdingRedirects() : appRedirects(),
);
console.log(`✓ dist/_redirects (${mode})`);

// What the dist-bound gates and the deploy guard read. Written last, so a build that failed
// half-way leaves the previous marker — and the guard then inspects dist/ itself anyway.
mkdirSync(resolve(root, 'build'), { recursive: true });
writeFileSync(resolve(root, BUILD_MARKER), `${JSON.stringify({ mode })}\n`);

const total = Date.now() - t0;
const label = mode === 'holding' ? 'build:holding' : fast ? 'build:fast' : 'build';
const seconds = (total / 1000).toFixed(1);
console.log(`${label}: ${String(n)} data step(s) + astro, ${seconds} s`);
