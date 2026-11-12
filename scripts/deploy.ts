/**
 * The one way to deploy (D15.4, D15.5): checks that this build may go to this target, then runs
 * wrangler with the configuration that matches the build.
 *
 *   npm run deploy                     the apex — holding build only, until launch day
 *   npm run deploy:preview             the preview host (noindex) — either build
 *   npx tsx scripts/deploy.ts apex --dry-run --outdir /tmp/x     what CI runs
 *
 * Why a script and not a habit. Read in wrangler 4.130.0 (`publishCustomDomains`): when a custom
 * domain already belongs to another Worker, wrangler asks "Update them to point to this script
 * instead?" — in an interactive terminal. Anywhere else it sets the override flags itself and
 * takes the domain without a word. And `dist/` still held the 979 pages of the 2025 edition from
 * September: one bare `wrangler deploy` away from publishing a superseded programme as the
 * current one. So the rule is executable (`deployRefusal`, tested in build-mode.test.ts), and a
 * bare `wrangler deploy` is no longer anyone's reflex.
 *
 * Learning note — stdio: 'inherit' is what keeps wrangler's confirmation prompt alive. A child
 * process only sees a terminal if it inherits ours; with piped stdio wrangler would conclude it
 * is running unattended and skip the question, which is exactly the behaviour described above.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  citationPolicyValidated,
  deployRefusal,
  htmlPages,
  readBuildMode,
  wranglerDeployArgs,
} from './build-mode.js';
import { launchBlockers, readLaunchInputs } from './launch.js';

const [target, ...passthrough] = process.argv.slice(2);
if (target !== 'apex' && target !== 'preview') {
  console.error('usage: tsx scripts/deploy.ts apex|preview [--dry-run] [--outdir <dir>]');
  process.exit(2);
}
if (!existsSync('dist')) {
  console.error('deploy refused: no dist/ — build first');
  process.exit(1);
}

const mode = readBuildMode();
const pages = htmlPages('dist');
const refusal = deployRefusal(target, mode, pages, {
  policyValidated: citationPolicyValidated(),
  dryRun: passthrough.includes('--dry-run'),
  launchBlockers: launchBlockers(readLaunchInputs()),
});
if (refusal !== null) {
  console.error(`deploy refused (${target}, ${mode} build): ${refusal}`);
  process.exit(1);
}

const args = wranglerDeployArgs(target, mode, passthrough);
console.log(`deploy: ${mode} build, ${String(pages.length)} page(s) → ${target}`);
console.log(`        wrangler ${args.join(' ')}`);
const result = spawnSync('npx', ['--no-install', 'wrangler', ...args], { stdio: 'inherit' });
process.exit(result.status ?? 1);
