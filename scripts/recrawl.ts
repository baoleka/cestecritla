/**
 * Weekly re-crawl, run LOCALLY (D1.3 amended, D14.13).
 *
 * Why it is not a GitHub Actions job any more. Measured 10/9/2026, on the first real execution
 * the dossier ever attempted (H-COR-2): melenchon2027.fr sits behind Cloudflare and answers
 * HTTP 403 to GitHub Actions runners. Isolated precisely — from a residential connection every
 * client gets 200 (curl with the project UA, curl with a browser UA, curl with no UA at all,
 * and Node's fetch, which is the exact code path used here); from the runner, 403. It is the
 * source IP range, not the User-Agent and not the TLS fingerprint. The scheduled workflow now
 * only opens a reminder issue, which it CAN do.
 *
 * What this preserves from the workflow it replaces: the same order, the same gates, the same
 * discipline. Nothing is written to data/ unless the invariants hold, and a change never lands
 * on main directly — it opens a pull request that a human reads.
 *
 *   npx tsx scripts/recrawl.ts            ingest, diff, and open a PR if the source moved
 *   npx tsx scripts/recrawl.ts --dry-run  ingest and diff, write nothing, open nothing
 *
 * Crawling policy, unchanged and non-negotiable: identifiable User-Agent, concurrency <= 4, one
 * pass, canonical URLs only, ~108 requests, once a week.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const root = process.cwd();
const dir = resolve(tmpdir(), 'cestecritla-recrawl');
mkdirSync(dir, { recursive: true });

const run = (cmd: string, args: string[]): number => {
  try {
    execFileSync(cmd, args, { stdio: 'inherit', cwd: root });
    return 0;
  } catch (error) {
    const code = (error as { status?: number }).status;
    return typeof code === 'number' ? code : 1;
  }
};

const step = (label: string): void => {
  console.log(`\n── ${label}`);
};

// The tooling must be sound before it is allowed to touch the corpus.
step('Portes de l’outillage');
if (run('npx', ['--no-install', 'tsc', '--noEmit']) !== 0) process.exit(1);
if (run('npx', ['--no-install', 'tsx', '--test', 'scripts/ingest.test.ts']) !== 0) process.exit(1);

// Exit 1 on any violated invariant (site structure, the counts of expected-invariants.json,
// canonical URLs): we stop here, loudly, and nothing is written to data/.
step('Ingestion vers un dossier temporaire (invariants imposés)');
const candidate = resolve(dir, 'aec-2025.json');
if (run('npx', ['--no-install', 'tsx', 'scripts/ingest.ts', '--out', candidate]) !== 0) {
  console.error('\nIngestion en échec : data/ n’est pas touché.');
  process.exit(1);
}

// 0 = no change, 3 = changes detected, anything else = error.
step('Diff avec le corpus commité');
const report = resolve(dir, 'diff.md');
const code = run('npx', ['--no-install', 'tsx', 'scripts/diff.ts', candidate, '--out', report]);

if (code === 0) {
  console.log('\nAucun changement : le corpus commité est à jour.');
  process.exit(0);
}
if (code !== 3) {
  console.error(`\nscripts/diff.ts a échoué (code ${String(code)}).`);
  process.exit(code);
}

const badge = JSON.parse(readFileSync(resolve(dir, 'aec-2025.badge.json'), 'utf8')) as {
  message?: string;
};
const date = badge.message ?? 'date inconnue';
console.log(`\nChangements détectés, corpus du ${date}.`);
console.log(`Rapport : ${report} (${String(statSync(report).size)} o)`);

if (dryRun) {
  console.log('\n--dry-run : rien n’est écrit, rien n’est ouvert.');
  process.exit(0);
}

step('Promotion du corpus candidat dans data/');
for (const [from, to] of [
  ['aec-2025.json', 'data/aec-2025.json'],
  ['aec-2025.hashes.json', 'data/hashes.json'],
  ['aec-2025.badge.json', 'data/badge.json'],
] as const) {
  copyFileSync(resolve(dir, from), resolve(root, to));
}
run('git', ['status', '--short', 'data/']);

// A corpus change is never pushed to main: it opens a pull request that a human reads, because
// a diff can be a real amendment of the programme as easily as a parser regression.
step('Branche et pull request');
const day = new Date().toISOString().slice(0, 10);
const branch = `recrawl/${day}`;
run('git', ['checkout', '-b', branch]);
run('git', ['add', 'data/aec-2025.json', 'data/hashes.json', 'data/badge.json']);
run('git', [
  'commit',
  '-m',
  `chore(corpus): re-crawl du ${day}\n\nCorpus officiel au ${date}. Diff complet en pièce jointe de la PR.`,
]);

if (!existsSync(resolve(root, '.git'))) process.exit(0);
run('git', ['push', '-u', 'origin', branch]);
run('gh', [
  'pr',
  'create',
  '--title',
  `Re-crawl du ${day} — corpus au ${date}`,
  '--body-file',
  report,
  '--label',
  'corpus',
]);
console.log(
  '\nPull request ouverte. À relire à la main : un diff peut être une actualisation du programme, ou une régression du parseur.',
);
