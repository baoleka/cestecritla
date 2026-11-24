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
 *   npm run deploy:chat:preview -- --withdraw --accord <today>   takes that Worker away again
 *   npx tsx scripts/deploy.ts apex --dry-run --outdir /tmp/x     what CI runs
 *
 * Why a script and not a habit. Read in wrangler 4.130.0 (`publishCustomDomains`): when a custom
 * domain already belongs to another Worker, wrangler asks "Update them to point to this script
 * instead?" — in an interactive terminal. Anywhere else it sets the override flags itself and
 * takes the domain without a word. And `dist/` still held the 979 pages of the 2025 edition from
 * September: one bare `wrangler deploy` away from publishing a superseded programme as the
 * current one. So the rule is executable (`deployRefusal`, tested in build-mode.test.ts), and a
 * bare `wrangler deploy` is no longer anyone's reflex — nor anyone's accident: every
 * configuration runs scripts/deploy-guard.mjs as its build step, which stops wrangler unless
 * this script started it (`guardedEnv`, below).
 *
 * Learning note — stdio: 'inherit' is what keeps wrangler's confirmation prompt alive. A child
 * process only sees a terminal if it inherits ours; with piped stdio wrangler would conclude it
 * is running unattended and skip the question, which is exactly the behaviour described above.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import {
  buildGame,
  gameExplaining,
  gameSite,
  gameSources,
  gameWords,
  wordLinks,
} from '../src/lib/game-data.js';
import { wordsFor } from '../src/lib/words-switch.js';
import { GAME_GISTS_PATH, gameGists, gameGistsWhyNot } from '../src/lib/game-gists.js';
import {
  chatDeployArgs,
  chatDeployRefusal,
  chatWithdrawArgs,
  chatWithdrawRefusal,
  chatWorkerName,
  citationPolicyValidated,
  deployRefusal,
  distLeftovers,
  distProblems,
  guardedEnv,
  htmlPages,
  nearSilenceWindow,
  readAskMode,
  readBuildMarker,
  readDist,
  refusedArguments,
  swallowedFlags,
  withdrawalContext,
  workerProblems,
  wranglerDeployArgs,
  type AskDeploy,
} from './build-mode.js';
import {
  WORDS_SWITCH_PATH,
  homeBlockers,
  launchBlockers,
  previewChatBlockers,
  readLaunchInputs,
  wordsBlockers,
} from './launch.js';

// A deploy reads the committed state of the site, never a test of it: two variables a shell may
// still hold from a test build are dropped before anything is read (security review, 19/11/2026).
delete process.env['CEL_GAME_TEST'];
delete process.env['CEL_SCRUTIN'];

const [target, ...given] = process.argv.slice(2);
if (target !== 'apex' && target !== 'preview') {
  console.error(
    'usage: tsx scripts/deploy.ts apex|preview [--bench] [--dry-run] [--outdir <dir>]\n' +
      '       tsx scripts/deploy.ts apex|preview --chat --accord <YYYY-MM-DD> | --chat --dry-run\n' +
      '       tsx scripts/deploy.ts apex|preview --chat --withdraw --accord <YYYY-MM-DD>',
  );
  process.exit(2);
}
// A flag npm took for itself never reached us: `npm run deploy --dry-run` would deploy for real
// (review 9, D1). Flags go after `--`.
const swallowed = swallowedFlags([
  '--dry-run',
  '--bench',
  '--chat',
  '--withdraw',
  '--accord',
  '--outdir',
]);
if (swallowed.length > 0) {
  console.error(
    `deploy refused: npm took ${swallowed.join(' ')} for itself — write the flags after \`--\`, ` +
      'as in `npm run deploy -- --dry-run`',
  );
  process.exit(2);
}
// Nothing reaches wrangler that could undo a choice made here: a second `--env` or `--config`
// is the bare `wrangler deploy` this script exists to prevent.
const refused = refusedArguments(given);
if (refused.length > 0) {
  console.error(
    `deploy refused: ${refused.join(' ')} — only --bench, --chat, --withdraw, --accord <day>, --dry-run and --outdir`,
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
    arg !== '--withdraw' &&
    arg !== '--accord' &&
    !arg.startsWith('--accord=') &&
    !(accordAt !== -1 && i === accordAt + 1),
);

if (given.includes('--withdraw') && !given.includes('--chat')) {
  console.error(
    'deploy refused: --withdraw takes away the Worker of the chat (--chat --withdraw); the ' +
      'site itself is withdrawn with the holding build',
  );
  process.exit(2);
}

// The Worker of the chat alone (lot C10): no file goes with it, so dist/ is not looked at.
if (given.includes('--chat')) {
  if (given.includes('--bench')) {
    console.error('deploy refused: --chat and --bench name two different Workers');
    process.exit(2);
  }
  const today = new Date().toISOString().slice(0, 10);
  // Taking it away again: what closes always may, with the accord of the day. The name of the
  // Worker comes from its configuration, and nothing else of the command line reaches wrangler.
  if (given.includes('--withdraw')) {
    if (forWrangler.length > 0) {
      console.error(`deploy refused: --withdraw takes --accord <day> and nothing else`);
      process.exit(2);
    }
    const named = chatWorkerName(target);
    const kept = chatWithdrawRefusal(accord, today, target, named);
    if (kept !== null) {
      console.error(`withdrawal refused (${target}, the Worker of the chat): ${kept}`);
      process.exit(1);
    }
    const withdrawArgs = chatWithdrawArgs(target);
    console.log(`withdraw: the Worker of the chat ← ${target} (${String(named)})`);
    console.log(`          wrangler ${withdrawArgs.join(' ')}`);
    const gone = spawnSync('npx', ['--no-install', 'wrangler', ...withdrawArgs], {
      stdio: 'inherit',
      env: guardedEnv(),
    });
    process.exit(gone.status ?? 1);
  }
  const refusal = chatDeployRefusal(target, {
    dryRun: forWrangler.includes('--dry-run'),
    accord,
    today,
    workerProblems: workerProblems(),
    ask: readAskMode(undefined, 'apex'),
    launchBlockers: launchBlockers(readLaunchInputs()),
    previewBlockers: previewChatBlockers(),
  });
  if (refusal !== null) {
    console.error(`deploy refused (${target}, the Worker of the chat): ${refusal}`);
    process.exit(1);
  }
  const chatArgs = chatDeployArgs(target, forWrangler);
  console.log(`deploy: the Worker of the chat → ${target}`);
  console.log(`        wrangler ${chatArgs.join(' ')}`);
  const sent = spawnSync('npx', ['--no-install', 'wrangler', ...chatArgs], {
    stdio: 'inherit',
    env: guardedEnv(),
  });
  process.exit(sent.status ?? 1);
}
// `--bench` is ours, not wrangler's: the Worker goes to the preview host while the page still
// answers no question, so that the bench can measure the candidates on the production path.
const passthrough = forWrangler;
// What this host does with a question (src/lib/ask-mode.ts): the preview host may ask first.
// With `--bench` the Worker goes out all the same — unless the pages of that host ask already.
const hostAsk = readAskMode(undefined, target);
const ask: AskDeploy = given.includes('--bench') && hostAsk === 'off' ? 'bench' : hostAsk;
if (!existsSync('dist')) {
  console.error('deploy refused: no dist/ — build first');
  process.exit(1);
}

// A build removes the last marker when it begins and writes its own when it is done: without a
// finished one, dist/ is a build that stopped half-way (review 9, D2; review 12, T1).
const marker = readBuildMarker();
if (marker === null || !marker.complete) {
  console.error(
    'deploy refused: dist/ holds no finished build — build/last-build.json is missing or ' +
      'unfinished (a build that stopped half-way leaves none): build again',
  );
  process.exit(1);
}
const mode = marker.mode;
const pages = htmlPages('dist');
const leftovers = distLeftovers('dist');
// What a build of today would publish of the game: its one file, or nothing — while the editor
// has not validated the list as it stands, and in the build served during a silence window.
const scrutinBuild = marker.scrutin;
// …with the sentences a build made for THIS host may show (D19.5: they follow the host's mode —
// src/lib/game-gists.ts): the name computed here is then the name of the file that build holds.
const shownGists =
  mode === 'app' && !scrutinBuild && gameSite().on
    ? gameGists(gameWords().words, gameSources().manifest.meta.corpus_version, {
        mode: hostAsk === 'off' ? 'off' : 'chat',
        test: false,
      })
    : null;
// …and with the words of those sentences explained under the card, where data/2026/words.json
// opens the game for THIS host (D20.4) — never in a build whose field asks nothing.
const explainsGame =
  shownGists !== null &&
  hostAsk !== 'off' &&
  wordsFor(
    JSON.parse(readFileSync(WORDS_SWITCH_PATH, 'utf8')) as unknown,
    target === 'preview' ? 'preview' : 'apex',
  ).game;
const gameFile =
  mode === 'app' && !scrutinBuild && gameSite().on
    ? `jeu-${
        buildGame(
          gameWords(),
          gameSources(),
          wordLinks(),
          shownGists,
          explainsGame ? gameExplaining() : null,
        ).fingerprint
      }.json`
    : null;
/**
 * Why the file of the sentences is not the one of the repository: untracked (it was kept out of
 * git until the editor's go), or changed since the last commit. Asked of git itself.
 */
function gistsUnpublished(): string[] {
  const git = (...args: string[]): number =>
    spawnSync('git', args, { stdio: 'ignore' }).status ?? 1;
  if (git('ls-files', '--error-unmatch', '--', GAME_GISTS_PATH) !== 0) {
    return [`${GAME_GISTS_PATH} is shown by this build and is not in the repository`];
  }
  if (git('diff', '--quiet', 'HEAD', '--', GAME_GISTS_PATH) !== 0) {
    return [`${GAME_GISTS_PATH} is shown by this build and differs from the committed file`];
  }
  return [];
}
// The withdrawal reads nothing of the app: its pages are its one rule (`withdrawalContext`).
// Every reader below is for an app build only — none of them may stand between the editor and
// the holding page (review 9, D5; review 10, A1; review 11, M5).
const refusal = deployRefusal(
  target,
  mode,
  pages,
  mode === 'holding'
    ? withdrawalContext(passthrough.includes('--dry-run'), ask, leftovers)
    : {
        leftovers,
        builtFor: marker.host,
        policyValidated: citationPolicyValidated(),
        dryRun: passthrough.includes('--dry-run'),
        launchBlockers: launchBlockers(readLaunchInputs()),
        insideSilenceWindow: nearSilenceWindow(new Date()),
        scrutinBuild,
        ask,
        workerProblems: workerProblems(),
        previewBlockers: previewChatBlockers(),
        distProblems: distProblems(readDist('dist'), { gameFile, ask }),
        gistsProblems: shownGists === null ? [] : gistsUnpublished(),
        homeBlockers: homeBlockers(),
        wordsBlockers: wordsBlockers(),
      },
);
if (refusal !== null) {
  console.error(`deploy refused (${target}, ${mode} build): ${refusal}`);
  process.exit(1);
}

const args = wranglerDeployArgs(target, mode, passthrough, ask);
console.log(
  `deploy: ${mode} build, ${String(pages.length)} page(s) → ${target}` +
    (mode === 'app' ? ` — questions: ${ask}` : ''),
);
// What goes out of the game's sentences, said before it goes: a build never fails on a file it
// will not show — it keeps every card at its link alone —, so the reason is printed here.
if (gameFile !== null) {
  if (shownGists !== null) {
    console.log(`        the cards of the game show ${String(shownGists.size)} sentence(s)`);
  } else {
    const why = gameGistsWhyNot(gameWords().words, gameSources().manifest.meta.corpus_version, {
      mode: hostAsk === 'off' ? 'off' : 'chat',
      test: false,
    });
    console.log(`        the cards of the game show no sentence: ${why.join('; ')}`);
  }
}
console.log(`        wrangler ${args.join(' ')}`);
const result = spawnSync('npx', ['--no-install', 'wrangler', ...args], {
  stdio: 'inherit',
  env: guardedEnv(),
});
process.exit(result.status ?? 1);
