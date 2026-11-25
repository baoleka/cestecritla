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
  giveLock,
  envFileProblems,
  takeLock,
  treeState,
  refusedArguments,
  swallowedFlags,
  withdrawalContext,
  workerProblems,
  wranglerDeployArgs,
  type AskDeploy,
} from './build-mode.js';
import {
  WORDS_SWITCH_PATH,
  chatLaunchBlockers,
  gameArtefactBlockers,
  homeBlockers,
  launchBlockers,
  previewChatBlockers,
  previewPageBlockers,
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
    `deploy refused: ${refused.join(' ')} — only --bench, --chat, --withdraw, --without-game, --accord <day>, --dry-run and --outdir`,
  );
  process.exit(2);
}

// What wrangler would read by itself, from a file of environment in this directory: the word
// the guard waits for, or a name that retargets the deploy (review 11, M15).
const envFiles = envFileProblems();
if (envFiles.length > 0) {
  console.error(`deploy refused: ${envFiles.join(' · ')} — nothing was sent`);
  process.exit(1);
}

// The script's own arguments never reach wrangler.
const accordAt = given.indexOf('--accord');
const accord =
  accordAt !== -1
    ? (given[accordAt + 1] ?? null)
    : (given.find((arg) => arg.startsWith('--accord='))?.slice('--accord='.length) ?? null);
const forWrangler = given.filter(
  (arg, i) =>
    arg !== '--without-game' &&
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
    named: chatWorkerName(target),
    dryRun: forWrangler.includes('--dry-run'),
    accord,
    today,
    workerProblems: workerProblems(),
    ask: readAskMode(undefined, 'apex'),
    // The gates of the chat, and none of the pages' (review 10, A6).
    launchBlockers: chatLaunchBlockers(),
    previewBlockers: previewChatBlockers('.', undefined, { pages: false }),
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
// One build or deploy at a time (T6, M9): a build started while wrangler uploads would send
// half of it. Taken before dist/ is read, given back at the exit.
const held = takeLock(`a deploy (${target})`);
if (held !== null) {
  console.error(`deploy refused: ${held} — wait for it`);
  process.exit(1);
}
process.on('exit', () => {
  giveLock();
});
const marker = readBuildMarker();
if (marker === null || !marker.complete) {
  console.error(
    'deploy refused: dist/ holds no finished build — build/last-build.json is missing or ' +
      'unfinished (a build that stopped half-way leaves none): build again',
  );
  process.exit(1);
}
const mode = marker.mode;
// What goes out is what is committed (review 11, M8; review 12, T9): a build of a tree with an
// uncommitted change, or of a commit that is no longer the one checked out, or a tree changed
// since — build, revert, deploy passed every gate that reads the files of today. The withdrawal
// is exempt: its own gesture edits data/launch.json just before it. A dry run sends nothing.
if (mode === 'app' && !passthrough.includes('--dry-run')) {
  const now = treeState();
  const why =
    marker.commit === null || marker.dirty === null
      ? 'dist/ does not say what it was built from'
      : marker.dirty
        ? 'dist/ was built from a tree with uncommitted changes'
        : now === null
          ? 'the tree cannot be read by git'
          : now.commit !== marker.commit
            ? `dist/ was built from ${marker.commit.slice(0, 7)}, and ${now.commit.slice(0, 7)} is checked out`
            : now.dirty
              ? 'the tree has uncommitted changes since dist/ was built'
              : null;
  if (why !== null) {
    console.error(`deploy refused: ${why} — commit, build, then deploy`);
    process.exit(1);
  }
}
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
  // Committed is not published: the repository the site points to is main on GitHub, as this
  // machine last saw it (review 9, D8; review 11 — a commit of a worktree's branch passed).
  if (git('diff', '--quiet', 'origin/main', '--', GAME_GISTS_PATH) !== 0) {
    return [`${GAME_GISTS_PATH} is shown by this build and is not the file of origin/main`];
  }
  return [];
}
// The withdrawal reads nothing of the app: its pages are its one rule (`withdrawalContext`).
// Every reader below is for an app build only — none of them may stand between the editor and
// the holding page (review 9, D5; review 10, A1; review 11, M5).
/** The launch's lines, without those of the game's list and her sheet. */
function withoutGameArtefacts(lines: readonly string[]): string[] {
  const game = new Set(gameArtefactBlockers());
  return lines.filter((line) => !game.has(line));
}
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
        // A build that shows no game — the scrutin build, or sheet 9's taken at the operator's
        // word — is not held by what only the game ships: its list and her sheet (C4, D6).
        launchBlockers:
          scrutinBuild || (gameFile === null && given.includes('--without-game'))
            ? withoutGameArtefacts(launchBlockers(readLaunchInputs()))
            : launchBlockers(readLaunchInputs()),
        insideSilenceWindow: nearSilenceWindow(new Date()),
        scrutinBuild,
        showsNoGame: gameFile === null && !scrutinBuild,
        withoutGame: given.includes('--without-game'),
        ask,
        workerProblems: workerProblems(),
        previewBlockers: previewChatBlockers(),
        previewPageBlockers: target === 'preview' ? previewPageBlockers() : [],
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

// The preview Worker carries the bench's Durable Object class: a holding build goes there as
// static files, a descent never tried (R27) — said before it goes (review 11, M16).
if (mode === 'holding' && target === 'preview' && !passthrough.includes('--dry-run')) {
  console.warn(
    'deploy: the preview Worker carries the Durable Object class of the bench — a static deploy ' +
      'there was never tried (R27): if wrangler refuses it, runbook sheet 11',
  );
}
const args = wranglerDeployArgs(target, mode, passthrough, ask);
console.log(
  `deploy: ${mode} build, ${String(pages.length)} page(s) → ${target}` +
    (mode === 'app' ? ` — questions: ${ask}` : '') +
    // Said before it goes: the neutral set is the answer to a takedown (D14.12).
    (marker.tokens === 'neutral' ? ' — NEUTRAL COLOURS' : ''),
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
// An npx that could not start leaves no word of its own (review 9, D15).
if (result.error !== undefined)
  console.error(`deploy: npx did not start — ${result.error.message}`);
// The holding page closes the site's pages, and nothing else (review 9, D7; D21.36): the Worker
// of the sentences answers on its own addresses until it is stopped, withdrawn, and its base
// emptied — the other gestures of sheet 9 (14-risques.md §4).
if (
  result.status === 0 &&
  mode === 'holding' &&
  target === 'apex' &&
  !passthrough.includes('--dry-run')
) {
  console.log(
    'deploy: the pages are withdrawn. The Worker of the sentences still answers: ' +
      '`npx tsx scripts/seed-ask-2026.ts --switch stopped --what gists --remote cestecritla-ask`, ' +
      'then `npm run deploy:chat -- --withdraw --accord <day>` and ' +
      '`npx tsx scripts/seed-ask-2026.ts --withdraw-gists --remote cestecritla-ask --accord <day>` ' +
      '(sheet 9)',
  );
}
process.exit(result.status ?? 1);
