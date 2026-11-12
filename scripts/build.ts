/**
 * The build pipeline (§18.7). Nothing chained these scripts before: they existed separately and
 * the dossier called the missing orchestration the critical path (H-PLA-18).
 *
 * Every step declares what it reads and what it writes, so a broken contract fails here rather
 * than three steps later. The order is fixed and not negotiable: the projection must fuse the
 * measure_split and pose scope_id BEFORE anything downstream — search index, ~970 OG cards,
 * share pages, game pools — consumes the corpus, otherwise each of those has to be regenerated.
 *
 *   npm run build          everything
 *   npm run build:fast     everything except the OG cards and the share pages, for an urgent
 *                          deploy. The runbook claims "~1-2 min" for that path and it has never
 *                          been timed; this script prints the real number.
 *   npm run build:holding  the holding site (D15.4): two pages, nothing of the programme, and a
 *                          _redirects file so old links land on it. Also the withdrawal gesture
 *                          of runbook sheet 9 (D14.10). See scripts/build-mode.ts.
 *
 * The build is deterministic: no timestamp, no random seed, no network. Two runs in a row
 * produce byte-identical output.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUILD_MARKER, holdingRedirects, type BuildMode } from './build-mode.js';

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
    name: 'projection',
    script: 'scripts/build-projection.ts',
    reads: ['data/aec-2025.json'],
    writes: ['build/slim.json'],
    corpus: true,
  },
  {
    name: 'fonts',
    script: 'scripts/build-fonts.ts',
    reads: ['design/fonts'],
    writes: ['public/fonts'],
  },
];

export const PENDING: readonly string[] = [
  'search index (serialised MiniSearch, lot 3)',
  'glossary / FAQ / riposte projections (lot 3)',
  'game pools with corpus version + seed (v3)',
  'OG cards, ~970 files (lot 2, scripts/build-cards.ts)',
  'share pages (lot 2)',
  'exactitude.html (lot 5)',
];

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

const astroStarted = Date.now();
execFileSync('npx', ['--no-install', 'astro', 'build'], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, CEL_BUILD: mode },
});
console.log(`✓ astro build (${String(Date.now() - astroStarted)} ms)`);

// Old links must land somewhere (D15.4). Astro empties dist/ on every build, so a file written
// here can never survive into a build of the other mode.
if (mode === 'holding') {
  writeFileSync(resolve(root, 'dist/_redirects'), holdingRedirects());
  console.log('✓ dist/_redirects (holding)');
}

// What the dist-bound gates and the deploy guard read. Written last, so a build that failed
// half-way leaves the previous marker — and the guard then inspects dist/ itself anyway.
mkdirSync(resolve(root, 'build'), { recursive: true });
writeFileSync(resolve(root, BUILD_MARKER), `${JSON.stringify({ mode })}\n`);

const total = Date.now() - t0;
const label = mode === 'holding' ? 'build:holding' : fast ? 'build:fast' : 'build';
const seconds = (total / 1000).toFixed(1);
if (mode === 'holding') {
  console.log(`${label}: ${String(n)} data step(s) + astro, ${seconds} s`);
} else {
  const slim = statSync(resolve(root, 'build/slim.json')).size;
  console.log(
    `${label}: ${String(n)} data step(s) + astro, ${seconds} s, slim.json ${String(slim)} B`,
  );
  if (PENDING.length > 0) {
    console.log(`not built yet (${String(PENDING.length)}): ${PENDING.join(' · ')}`);
  }
}
