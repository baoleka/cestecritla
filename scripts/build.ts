/**
 * The build pipeline (§18.7). Nothing chained these scripts before: they existed separately and
 * the dossier called the missing orchestration the critical path (H-PLA-18).
 *
 * Every step declares what it reads and what it writes. Since the 2026 edition (D15.6) the app
 * is built from public files alone: those of data/2026/, and the dated archive of 2025 that the
 * bridges of old links read (data/aec-2025.json). The 2025 projection
 * (scripts/build-projection.ts) is no longer a step — that script and its test remain as the
 * tooling of a dated archive.
 *
 *   npm run build              production's app, into dist/
 *   npm run build:preview      the app of the preview host (`--host preview`)
 *   npm run build:fast         the same as `build`: no step is marked slow today
 *   npm run build:neutral      the app in the neutral set of colours, the prepared answer to a
 *                              takedown of the charter (D0.17, D14.12; sheet 2 of the runbook)
 *   npm run build:scrutin      the app as served during an electoral silence window (D16.16):
 *                              neither question nor game. Deployed before each window
 *   npm run build:holding      three pages and nothing of the programme — the page, its 404 and
 *                              the legal notice — and a _redirects file so old links land on it:
 *                              the withdrawal (D14.10, sheet 9 of 14-risques.md §4). See
 *                              scripts/build-mode.ts
 *   npm run build:update       the same pages with the words of a re-edition (D21.37, sheet 6)
 *   npm run build:ask          TEST builds, never deployed, that leave dist/ and its marker
 *   npm run build:gists        untouched: the sheet of « Demander » with a model that explains
 *   npm run build:scrutin:test (dist-ask/, closed since D16.60), the sheet as it opens
 *                              (dist-gists/), the scrutin build of the test site (dist-scrutin/)
 *
 * The build is deterministic: no timestamp, no random seed, no network — Astro's usage report
 * is off (review 12, T3). Two runs in a row produce byte-identical output.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  BUILD_LOCK,
  BUILD_MARKER,
  appRedirects,
  giveLock,
  holdingRedirects,
  swallowedFlags,
  takeLock,
  treeState,
  type BuildMode,
} from './build-mode.js';
import { gameWords, wordsNotReady } from '../src/lib/game-data.js';
import { quietEnv } from './quiet-env.js';

interface Step {
  readonly name: string;
  readonly script: string;
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  /** Skipped by `build:fast`. */
  readonly slow?: true;
}

const STEPS: readonly Step[] = [
  {
    name: 'tokens',
    script: 'scripts/build-tokens.ts',
    reads: ['design/tokens.json'],
    // The charter's sheets; a neutral build writes build/neutral/ instead (T7).
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
 * corpus is never read here, so a build on CI, which has no corpus, is the same build.
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

/**
 * Every published file must come from the same state of the book — and read: a file that does
 * not parse is named here, before dist/ is touched, rather than by Astro half-way through a
 * build (review 12, T15).
 */
function checkEdition(root: string): string {
  const parsed = new Map<string, unknown>();
  for (const input of EDITION_INPUTS) {
    if (!existsSync(resolve(root, input))) throw new Error(`edition: missing input ${input}`);
    try {
      parsed.set(input, JSON.parse(readFileSync(resolve(root, input), 'utf8')));
    } catch (error) {
      throw new Error(
        `edition: ${input} is not JSON (${error instanceof Error ? error.message : 'unreadable'})`,
      );
    }
  }
  const version = (path: string, at: (file: unknown) => unknown): string => {
    const value = at(parsed.get(path));
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
  '--update',
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
    update: { type: 'boolean' },
    'ask-test': { type: 'string' },
    scrutin: { type: 'boolean' },
    host: { type: 'string' },
  },
  strict: true,
  allowPositionals: false,
});
const fast = given.fast === true;
/** Light rebrand (D0.17): only the colours change, over the rest of the charter's tokens. */
const neutral = given.neutral === true;
/** The holding site (D15.4): astro.config.ts switches its source tree on CEL_BUILD. */
const mode: BuildMode = given.holding === true ? 'holding' : 'app';
/**
 * The page of a re-edition (D21.37): the holding build with the editor's words for a site that
 * is being brought up to date, not withdrawn — runbook sheet 6 of 14-risques.md §4.
 */
const update = given.update === true;
if (update && mode !== 'holding')
  throw new Error('--update is a holding build: --holding --update');
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
 * The host the pages are built for (src/lib/ask-mode.ts, data/2026/words.json): `--host preview`
 * is the build of the preview host, which may open a surface before production. Without the
 * flag the build is production's. The marker says which, and scripts/deploy.ts sends it to no
 * other host (review 9, D11).
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
// One build or deploy at a time in this checkout (review 12, T6; review 11, M9): two builds
// into dist/ at once mixed their files under one marker. A test build writes elsewhere.
if (askTest === null) {
  const held = takeLock(`a build (${mode})`, resolve(root, BUILD_LOCK));
  if (held !== null) throw new Error(`build refused: ${held}`);
  process.on('exit', () => {
    giveLock(resolve(root, BUILD_LOCK));
  });
}
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
  const ms = run(step);
  n += 1;
  console.log(`✓ ${step.name} (${String(ms)} ms)`);
}

const corpusVersion = mode === 'app' ? checkEdition(root) : null;
if (corpusVersion !== null) console.log(`✓ edition 2026, corpus ${corpusVersion}`);
// Whether the game is in this build, said: a list no longer attested drops it, and the turtle
// with it, in silence (D16.15) — production waits for it, the preview host does not (review
// 12, T16).
if (corpusVersion !== null && askTest === null) {
  const reasons = wordsNotReady(gameWords(), corpusVersion);
  if (scrutin) console.log('· game: off — the scrutin build shows none (D16.16)');
  else if (reasons.length === 0) console.log('✓ game: on, the list as the editor validated it');
  else console.log(`· game: OFF, and the turtle with it — ${reasons.join('; ')}`);
}

// Astro empties its output by itself — but keeps, by a slip of its own (a Set built from the
// string ".git"), every top-level entry named g, i or t: a page or a file under one of those
// letters would outlive every build, the withdrawal's included (review 12, T12). The output is
// emptied here, after every check has passed.
rmSync(resolve(root, outDir), { recursive: true, force: true });

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
    // it stands, validated or not. It goes to dist-ask/, dist-gists/ or dist-scrutin/, which
    // nothing deploys.
    CEL_GAME_TEST: askTest === null ? '' : '1',
    CEL_SCRUTIN: scrutin ? '1' : '',
    CEL_HOLDING: update ? 'update' : '',
    // The set of colours the pages import (astro.config.ts): the charter's, or the neutral one.
    CEL_TOKENS: neutral ? 'neutral' : '',
    CEL_HOST: host === 'preview' ? 'preview' : '',
  },
});
console.log(`✓ astro build (${String(Date.now() - astroStarted)} ms)`);

// Old links must land somewhere (D15.4, D15.8). The output is emptied before every build, so
// a file written here can never survive into a build of the other mode. The holding site redirects
// every old prefix to its one page; the app answers `/m/`, `/a/`, `/s/` and `/r/` with real
// bridge pages and only redirects the two prefixes it has nothing to put behind.
writeFileSync(
  resolve(root, outDir, '_redirects'),
  mode === 'holding' ? holdingRedirects() : appRedirects(),
);
console.log(`✓ ${outDir}/_redirects (${mode})`);

const tree = askTest === null ? treeState(root) : null;
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
      ...(update ? { update: true } : {}),
      // Which colours went out: a neutral build is said, for the deploy to say it (T8, M7).
      ...(neutral ? { tokens: 'neutral' } : {}),
      // From what: the commit, and whether a tracked file differed from it (M8, T9) — what
      // goes out is what is committed, or the deploy says so.
      ...(tree === null ? {} : { commit: tree.commit, dirty: tree.dirty }),
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
      ? update
        ? 'build:update'
        : 'build:holding'
      : fast
        ? 'build:fast'
        : 'build';
const seconds = (total / 1000).toFixed(1);
// The last line says which build is in the output: the host and the colours too (review 12,
// T17) — three builds printed the same line.
const which = [
  ...(host === 'preview' ? ['for the preview host'] : []),
  ...(neutral ? ['NEUTRAL colours'] : []),
];
const about = which.length === 0 ? '' : ` (${which.join(', ')})`;
console.log(`${label}${about}: ${String(n)} data step(s) + astro, ${seconds} s → ${outDir}/`);
