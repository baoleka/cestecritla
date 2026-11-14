/**
 * The one way to deploy (D15.4, D15.5): checks that this build may go to this target, then runs
 * wrangler with the configuration that matches the build.
 *
 *   npm run deploy                     the apex — holding build only, until launch day
 *   npm run deploy:preview             the preview host (noindex) — either build
 *   npm run deploy:preview -- --bench  the same, with the Worker, for the bench of the models
 *   npm run deploy:chat:preview -- --accord <today>   the Worker of the chat alone, on its two
 *                                      addresses of the preview host (lot C10)
 *   npm run deploy:chat -- --accord <today>           the same in front of the apex (lot C12)
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
import { buildGame, gameSite } from '../src/lib/game-data.js';
import {
  chatDeployArgs,
  chatDeployRefusal,
  citationPolicyValidated,
  deployRefusal,
  distProblems,
  htmlPages,
  nearSilenceWindow,
  readAskMode,
  readBuildMode,
  readBuildScrutin,
  readDist,
  refusedArguments,
  workerProblems,
  wranglerDeployArgs,
  type AskDeploy,
} from './build-mode.js';
import { launchBlockers, readLaunchInputs } from './launch.js';

const [target, ...given] = process.argv.slice(2);
if (target !== 'apex' && target !== 'preview') {
  console.error(
    'usage: tsx scripts/deploy.ts apex|preview [--bench] [--dry-run] [--outdir <dir>]\n' +
      '       tsx scripts/deploy.ts apex|preview --chat --accord <YYYY-MM-DD> | --chat --dry-run',
  );
  process.exit(2);
}
// Nothing reaches wrangler that could undo a choice made here: a second `--env` or `--config`
// is the bare `wrangler deploy` this script exists to prevent.
const refused = refusedArguments(given);
if (refused.length > 0) {
  console.error(
    `deploy refused: ${refused.join(' ')} — only --bench, --chat, --accord <day>, --dry-run and --outdir`,
  );
  process.exit(2);
}

// The script's own arguments never reach wrangler.
const accordAt = given.indexOf('--accord');
const accord =
  accordAt !== -1
    ? (given[accordAt + 1] ?? null)
    : (given.find((arg) => arg.startsWith('--accord='))?.slice('--accord='.length) ?? null);
const forWrangler = given.filter(
  (arg, i) =>
    arg !== '--bench' &&
    arg !== '--chat' &&
    arg !== '--accord' &&
    !arg.startsWith('--accord=') &&
    !(accordAt !== -1 && i === accordAt + 1),
);

// The Worker of the chat alone (lot C10): no file goes with it, so dist/ is not looked at.
if (given.includes('--chat')) {
  if (given.includes('--bench')) {
    console.error('deploy refused: --chat and --bench name two different Workers');
    process.exit(2);
  }
  const refusal = chatDeployRefusal(target, {
    dryRun: forWrangler.includes('--dry-run'),
    accord,
    today: new Date().toISOString().slice(0, 10),
    workerProblems: workerProblems(),
    ask: readAskMode(),
    launchBlockers: launchBlockers(readLaunchInputs()),
  });
  if (refusal !== null) {
    console.error(`deploy refused (${target}, the Worker of the chat): ${refusal}`);
    process.exit(1);
  }
  const chatArgs = chatDeployArgs(target, forWrangler);
  console.log(`deploy: the Worker of the chat → ${target}`);
  console.log(`        wrangler ${chatArgs.join(' ')}`);
  const sent = spawnSync('npx', ['--no-install', 'wrangler', ...chatArgs], { stdio: 'inherit' });
  process.exit(sent.status ?? 1);
}
// `--bench` is ours, not wrangler's: the Worker goes to the preview host while the page still
// answers no question, so that the bench can measure the candidates on the production path.
const passthrough = forWrangler;
const ask: AskDeploy = given.includes('--bench') ? 'bench' : readAskMode();
if (!existsSync('dist')) {
  console.error('deploy refused: no dist/ — build first');
  process.exit(1);
}

const mode = readBuildMode();
const pages = htmlPages('dist');
// What a build of today would publish of the game: its one file, or nothing — while the editor
// has not validated the list as it stands, and in the build served during a silence window.
const scrutinBuild = readBuildScrutin();
const gameFile =
  mode === 'app' && !scrutinBuild && gameSite().on ? `jeu-${buildGame().fingerprint}.json` : null;
const refusal = deployRefusal(target, mode, pages, {
  policyValidated: citationPolicyValidated(),
  dryRun: passthrough.includes('--dry-run'),
  launchBlockers: launchBlockers(readLaunchInputs()),
  insideSilenceWindow: nearSilenceWindow(new Date()),
  scrutinBuild,
  ask,
  workerProblems: workerProblems(),
  distProblems: mode === 'app' ? distProblems(readDist('dist'), { gameFile, ask }) : [],
});
if (refusal !== null) {
  console.error(`deploy refused (${target}, ${mode} build): ${refusal}`);
  process.exit(1);
}

const args = wranglerDeployArgs(target, mode, passthrough, ask);
console.log(
  `deploy: ${mode} build, ${String(pages.length)} page(s) → ${target}` +
    (mode === 'app' ? ` — questions: ${ask}` : ''),
);
console.log(`        wrangler ${args.join(' ')}`);
const result = spawnSync('npx', ['--no-install', 'wrangler', ...args], { stdio: 'inherit' });
process.exit(result.status ?? 1);
