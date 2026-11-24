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
 *   npm run build:scrutin  the app as served during an electoral silence window (D16.16):
 *                          neither question nor game. Deployed before each window.
 *   npm run build:ask      a TEST build of the app as it would be if the site answered
 *                          questions (src/lib/ask-config.ts), into dist-ask/. It exists so that
 *                          the ask screen is tested before any bench allows it to ship; it is
 *                          never what scripts/deploy.ts deploys, and it leaves dist/ and its
 *                          marker untouched.
 *
 * The build is deterministic: no timestamp, no random seed, no network. Two runs in a row
 * produce byte-identical output.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  BUILD_MARKER,
  appRedirects,
  holdingRedirects,
  swallowedFlags,
  type BuildMode,
} from './build-mode.js';
import { quietEnv } from './quiet-env.js';

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
    writes: ['src/styles/tokens.css', 'src/styles/mascot2-tokens.css'],
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
  'data/2026/term-places.json',
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
      'data/2026/term-places.json',
      version('data/2026/term-places.json', (f) => meta(f)['corpus_version']),
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
// The flag of the two generations of the mascot (`--mascot 2`, dist-mascot2/) was removed with
// the first generation (lot F of docs/discovery/PLAN-TORTUE.md): every build shows the second.
if (process.argv.includes('--mascot')) {
  throw new Error('--mascot is gone: there is one generation of the mascot (lot F)');
}
// A build never falls back to production's when it was asked for another one (review 12, T4,
// T13; review 11, U11). A flag npm took for itself (written before `--`) never reached us; a
// flag that is not ours, `--host=preview` written for `--host preview` aside, or a word left
// alone — npm 11 passes `preview` alone when `npm run build --host preview` lacks its `--` —
// stops the build before it writes anything.
const swallowed = swallowedFlags([
  '--fast',
  '--neutral',
  '--holding',
  '--ask-test',
  '--scrutin',
  '--host',
  '--mascot',
  '--tokens',
]);
if (swallowed.length > 0) {
  throw new Error(
    `npm took ${swallowed.join(' ')} for itself: write the flags after \`--\` ` +
      '(npm run build -- --host preview), or run the script that names the build (npm run build:holding)',
  );
}
const { values: given } = parseArgs({
  options: {
    fast: { type: 'boolean' },
    neutral: { type: 'boolean' },
    holding: { type: 'boolean' },
    'ask-test': { type: 'string' },
    scrutin: { type: 'boolean' },
    host: { type: 'string' },
  },
  strict: true,
  allowPositionals: false,
});
const fast = given.fast === true;
/** Light rebrand (D0.17): every step is identical, only the token source changes. */
const neutral = given.neutral === true;
/** The holding site (D15.4): astro.config.ts switches its source tree on CEL_BUILD. */
const mode: BuildMode = given.holding === true ? 'holding' : 'app';
/**
 * The sheet of « Demander », for its tests: `--ask-test chat` builds into dist-ask/ the sheet
 * with a model that explains (closed since D16.60); `--ask-test gists` builds into dist-gists/
 * the sheet as it opens — sentences written ahead, no live AI.
 */
const askTest = given['ask-test'] ?? null;
if (askTest !== null && askTest !== 'chat' && askTest !== 'gists') {
  throw new Error('--ask-test takes "chat" or "gists"');
}
if (askTest !== null && mode !== 'app') throw new Error('--ask-test is a build of the app');
/**
 * The "scrutin" build (D16.16): the app as it is served during an electoral silence window —
 * neither question nor game, a sentence that says why, and everything one reads still there.
 * Deployed before each window; inside one, it is the only build of the app that may be.
 * With `--ask-test` it is the scrutin build of the TEST site (dist-scrutin/, never deployed):
 * what the gates read to check that a site which plays shows nothing of the game when it closes.
 */
const scrutin = given.scrutin === true;
if (scrutin && mode !== 'app') throw new Error('--scrutin is a build of the app');
/**
 * The host the pages are built for (src/lib/ask-mode.ts): `--host preview` is the build of the
 * preview host, which may ask a question while production still answers none. Without the
 * flag the build is production's. The marker says which, and scripts/deploy.ts sends neither
 * to the other host if they differ in what they do with a question.
 */
const host = given.host ?? 'apex';
if (host !== 'apex' && host !== 'preview') throw new Error('--host takes "preview" or "apex"');
if (host === 'preview' && mode !== 'app') throw new Error('--host is a build of the app');
if (host === 'preview' && askTest !== null) throw new Error('--host and --ask-test do not mix');
if (scrutin && askTest === 'gists') throw new Error('--scrutin tests with --ask-test chat');
const outDir =
  askTest === null
    ? 'dist'
    : scrutin
      ? 'dist-scrutin'
      : askTest === 'gists'
        ? 'dist-gists'
        : 'dist-ask';

// The marker of the last build goes before anything else is touched: a build that stops
// half-way — Astro has emptied dist/ by then, and left its server files in it — leaves NO
// marker, and scripts/deploy.ts sends nothing without one (review 9, D2; review 12, T1).
if (askTest === null) rmSync(resolve(root, BUILD_MARKER), { force: true });

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
execFileSync('npx', ['--no-install', 'astro', 'build', '--outDir', outDir], {
  stdio: 'inherit',
  cwd: root,
  // Astro's usage report off: it would tell Astro which machine builds this project (T3).
  env: {
    ...quietEnv(),
    CEL_BUILD: mode,
    // Never inherited: a variable left in a shell must not turn a real build into a test one.
    CEL_ASK_TEST: askTest ?? '',
    // The test build is the whole page as it will be: it shows the game too, with the list as
    // it stands, validated or not. It goes to dist-ask/, which nothing deploys.
    CEL_GAME_TEST: askTest === null ? '' : '1',
    CEL_SCRUTIN: scrutin ? '1' : '',
    CEL_HOST: host === 'preview' ? 'preview' : '',
  },
});
console.log(`✓ astro build (${String(Date.now() - astroStarted)} ms)`);

// Old links must land somewhere (D15.4, D15.8). Astro empties dist/ on every build, so a file
// written here can never survive into a build of the other mode. The holding site redirects
// every old prefix to its one page; the app answers `/m/`, `/a/`, `/s/` and `/r/` with real
// bridge pages and only redirects the two prefixes it has nothing to put behind.
writeFileSync(
  resolve(root, outDir, '_redirects'),
  mode === 'holding' ? holdingRedirects() : appRedirects(),
);
console.log(`✓ ${outDir}/_redirects (${mode})`);

// What the dist-bound gates and the deploy guard read. Written last, `complete`, once every
// step has succeeded: the previous one was removed when this build began. A test build of the
// ask screen says nothing about dist/: it leaves the marker alone.
if (askTest === null) {
  mkdirSync(resolve(root, 'build'), { recursive: true });
  writeFileSync(
    resolve(root, BUILD_MARKER),
    `${JSON.stringify({
      mode,
      ...(scrutin ? { scrutin: true } : {}),
      ...(host === 'preview' ? { host } : {}),
      complete: true,
    })}\n`,
  );
}

const total = Date.now() - t0;
const label = scrutin
  ? `build:scrutin${askTest === null ? '' : ' (test)'}`
  : askTest !== null
    ? `build:ask (${askTest})`
    : mode === 'holding'
      ? 'build:holding'
      : fast
        ? 'build:fast'
        : 'build';
const seconds = (total / 1000).toFixed(1);
console.log(`${label}: ${String(n)} data step(s) + astro, ${seconds} s`);
