/**
 * The build pipeline (§18.7). Nothing chained these scripts before: they existed separately and
 * the dossier called the missing orchestration the critical path (H-PLA-18).
 *
 * Every step declares what it reads and what it writes, so a broken contract fails here rather
 * than three steps later. The order is fixed and not negotiable: the projection must fuse the
 * measure_split and pose scope_id BEFORE anything downstream — search index, ~970 OG cards,
 * share pages, game pools — consumes the corpus, otherwise each of those has to be regenerated.
 *
 *   npm run build        everything
 *   npm run build:fast   everything except the OG cards and the share pages, for an urgent
 *                        deploy. The runbook claims "~1-2 min" for that path and it has never
 *                        been timed; this script prints the real number.
 *
 * The build is deterministic: no timestamp, no random seed, no network. Two runs in a row
 * produce byte-identical output.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

interface Step {
  readonly name: string;
  readonly script: string;
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  /** Skipped by `build:fast`. */
  readonly slow?: true;
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

const astroStarted = Date.now();
execFileSync('npx', ['--no-install', 'astro', 'build'], { stdio: 'inherit', cwd: root });
console.log(`✓ astro build (${String(Date.now() - astroStarted)} ms)`);

const total = Date.now() - t0;
const slim = statSync(resolve(root, 'build/slim.json')).size;
console.log(
  `${fast ? 'build:fast' : 'build'}: ${String(n)} data step(s) + astro, ${(total / 1000).toFixed(1)} s, slim.json ${String(slim)} B`,
);
if (PENDING.length > 0) {
  console.log(`not built yet (${String(PENDING.length)}): ${PENDING.join(' · ')}`);
}
