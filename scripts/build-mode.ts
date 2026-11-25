/**
 * Which build is sitting in dist/ — and where it is allowed to go (D15.4, D15.5).
 *
 * Two builds exist since the 2026 edition replaced the 2025 one at the source (D15.1):
 *
 *   app      the full site, built by `npm run build`
 *   holding  two pages and nothing of the programme, built by `npm run build:holding`
 *
 * Until launch day the apex serves the holding build and nothing else; the app is only ever
 * deployed to the preview host. `scripts/build.ts` records the mode in build/last-build.json
 * when it finishes, and every dist-bound gate reads it from here — so a holding dist/ is judged
 * as a holding dist/, not as an app with 977 pages missing. `scripts/deploy.ts` is the only
 * caller of wrangler: it applies the rule below, then picks the configuration for the build —
 * static files, or the Worker of « Demander » when data/2026/ask.json says the site answers
 * questions (D16.4, D16.7).
 *
 * The holding mode is not a one-off. It is also the withdrawal gesture of runbook sheet 9
 * (D14.10: if exposure becomes untenable the app is withdrawn), and the first answer to the next
 * re-edition of the programme: one command, two static files, nothing to decide in a hurry.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { modeFor } from '../src/lib/ask-mode.js';
import { SILENCE_APPROACH_MS, silenceWindows, type SilenceWindow } from '../src/lib/silence.js';
import { parseJsonc } from './jsonc.js';
import { quietEnv } from './quiet-env.js';

export type BuildMode = 'app' | 'holding';
export type DeployTarget = 'apex' | 'preview';

export const BUILD_MARKER = 'build/last-build.json';

/**
 * Static files only: no script, no binding, no variable. The holding page is always deployed
 * with it — the page that stands in for the app depends on nothing a script could break — and
 * so is the app while it answers no question.
 */
export const STATIC_CONFIG = 'wrangler.static.jsonc';

/**
 * The Worker of « Demander » (src/worker/, D16.7, D16.51): `/api/gists` and `/api/chat`, the AI
 * binding, the private base, the allowance. Deployed with the app only when the site answers
 * questions — and, for the bench, on the preview host.
 */
export const WORKER_CONFIG = 'wrangler.jsonc';

/**
 * « Demander » as a Worker of its own (PLAN-CHAT §4, lot C10): the same script on two exact
 * addresses, in front of static files — a route wins over a custom domain on the same host.
 * This is how the chat reaches the apex: the site stays files, and taking the Worker away
 * leaves a site that never knew. `scripts/deploy.ts <target> --chat` deploys it, and nothing
 * else does.
 */
export const CHAT_CONFIG = 'wrangler.chat.jsonc';

export const ASK_PATH = 'data/2026/ask.json';

/**
 * The guard every wrangler configuration of this repository runs as its « build » step
 * (scripts/deploy-guard.mjs): wrangler stops before it bundles or sends anything unless the
 * variable says who started it. scripts/deploy.ts says so once its gates have passed; the two
 * commands that send nothing (`wrangler types`, `wrangler check startup`) say that instead.
 * A tripwire for the command typed too fast, not a lock (14-risques.md R41).
 */
export const DEPLOY_GUARD = {
  command: 'node scripts/deploy-guard.mjs',
  variable: 'CEL_DEPLOY_FROM',
  caller: 'scripts/deploy.ts',
  readsOnly: 'nothing-is-sent',
} as const;

/**
 * The environment scripts/deploy.ts hands wrangler: ours, with its usage reports off
 * (scripts/quiet-env.ts), plus the word the guard waits for.
 */
export function guardedEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...quietEnv(env), [DEPLOY_GUARD.variable]: DEPLOY_GUARD.caller };
}

/**
 * How the build about to be deployed answers a question: the mode of data/2026/ask.json —
 * or "bench", the one case where the Worker goes out while the page still answers nothing
 * (`npm run deploy:preview -- --bench`: the bench measures the candidates on the preview host).
 */
export type AskDeploy = 'off' | 'chat' | 'bench';

/**
 * The mode the committed file says for a host (src/lib/ask-mode.ts): production's unless the
 * preview host is named — it may ask first. Anything unreadable is "off": no Worker by accident.
 */
export function readAskMode(
  path: string = ASK_PATH,
  target: DeployTarget = 'apex',
): Exclude<AskDeploy, 'bench'> {
  if (!existsSync(path)) return 'off';
  try {
    return modeFor(JSON.parse(readFileSync(path, 'utf8')) as unknown, target);
  } catch {
    return 'off';
  }
}

/**
 * The host the build in dist/ was made for (`npm run build -- --host preview`). A build made
 * before the marker said so is production's: the one that opens last.
 */
export function readBuildHost(marker: string = BUILD_MARKER): DeployTarget {
  if (!existsSync(marker)) return 'apex';
  try {
    const parsed: unknown = JSON.parse(readFileSync(marker, 'utf8'));
    return typeof parsed === 'object' &&
      parsed !== null &&
      'host' in parsed &&
      parsed.host === 'preview'
      ? 'preview'
      : 'apex';
  } catch {
    return 'apex';
  }
}

/** What the build sitting in dist/ does with a question: the mode of the host it was made for. */
export function builtAskMode(
  path: string = ASK_PATH,
  marker: string = BUILD_MARKER,
): Exclude<AskDeploy, 'bench'> {
  return readAskMode(path, readBuildHost(marker));
}

/**
 * The configuration a build is deployed with (the mode is data: D16.4). The apex is files,
 * whatever the mode: its chat is another Worker, on its own two addresses (`CHAT_CONFIG`).
 * The preview host takes the Worker with its files when the page asks — or for the bench.
 */
export function wranglerConfig(
  mode: BuildMode,
  ask: AskDeploy = 'off',
  target: DeployTarget = 'preview',
): string {
  return mode === 'app' && ask !== 'off' && target === 'preview' ? WORKER_CONFIG : STATIC_CONFIG;
}

/** A base nobody has created yet: `wrangler d1 create` gives the real identifier. */
export const UNSET_DATABASE_ID = '00000000-0000-0000-0000-000000000000';

/**
 * What the Worker's configuration still lacks before it may be deployed — read from the files,
 * so that the rule runs without Cloudflare. Empty when it is ready.
 */
export function workerProblems(root = '.'): string[] {
  const out: string[] = [];
  const read = (path: string): unknown => {
    try {
      return parseJsonc(readFileSync(join(root, path), 'utf8'));
    } catch {
      return null;
    }
  };
  const record = (value: unknown): Record<string, unknown> =>
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const manifest = record(record(read('data/2026/manifest.json'))['meta'])['corpus_version'];
  // Both files that carry the script: the Worker of the preview host, and the chat's own.
  for (const file of [WORKER_CONFIG, CHAT_CONFIG]) {
    const config = record(read(file));
    const environments: [string, Record<string, unknown>][] = [
      ['top level', config],
      ['env.preview', record(record(config['env'])['preview'])],
    ];
    for (const [name, env] of environments) {
      const bases = Array.isArray(env['d1_databases']) ? env['d1_databases'] : [];
      const id = record(bases[0])['database_id'];
      if (typeof id !== 'string' || id === UNSET_DATABASE_ID) {
        out.push(`${file} (${name}): the private base has no identifier yet (lot I3)`);
      }
      if (record(env['vars'])['CORPUS_VERSION'] !== manifest) {
        out.push(`${file} (${name}): CORPUS_VERSION is not the corpus of the manifest`);
      }
    }
  }
  return out;
}

/**
 * The arguments of `wrangler deploy` for this build and this target.
 *
 * `--env=` (empty) names the top-level environment on purpose: as soon as a configuration
 * declares a second environment, wrangler warns on any deploy that does not say which one it
 * means — and the top-level one is the apex.
 */
export function wranglerDeployArgs(
  target: DeployTarget,
  mode: BuildMode,
  passthrough: readonly string[] = [],
  ask: AskDeploy = 'off',
): string[] {
  return [
    'deploy',
    '--config',
    wranglerConfig(mode, ask, target),
    `--env=${target === 'preview' ? 'preview' : ''}`,
    ...passthrough,
  ];
}

/** The arguments of `wrangler deploy` for the Worker of the chat alone: no file goes with it. */
export function chatDeployArgs(
  target: DeployTarget,
  passthrough: readonly string[] = [],
): string[] {
  return [
    'deploy',
    '--config',
    CHAT_CONFIG,
    `--env=${target === 'preview' ? 'preview' : ''}`,
    ...passthrough,
  ];
}

/** The only two Workers this script may ever delete: the chat's, on each target. */
export const CHAT_WORKERS: Readonly<Record<DeployTarget, string>> = {
  apex: 'cestecritla-chat',
  preview: 'cestecritla-chat-preview',
};

/**
 * The Worker the chat's configuration names on a target — as wrangler computes it: the name of
 * the file, and the environment after it. Null when the file cannot be read.
 */
export function chatWorkerName(target: DeployTarget, root = '.'): string | null {
  try {
    const config: unknown = parseJsonc(readFileSync(join(root, CHAT_CONFIG), 'utf8'));
    const name =
      typeof config === 'object' && config !== null && 'name' in config ? config.name : null;
    if (typeof name !== 'string') return null;
    if (target === 'apex') return name;
    // wrangler names an environment by its own `name` when it has one, `<name>-<env>` when not:
    // the name checked is the one it would act on (review 9, D9).
    const env =
      typeof config === 'object' && config !== null && 'env' in config ? config.env : null;
    const preview =
      typeof env === 'object' && env !== null && 'preview' in env ? env.preview : null;
    const own =
      typeof preview === 'object' && preview !== null && 'name' in preview ? preview.name : null;
    return typeof own === 'string' ? own : `${name}-preview`;
  } catch {
    return null;
  }
}

/**
 * The arguments of `wrangler delete` for the Worker of the chat on this target: the withdrawal
 * of sheet 12 of the runbook. The name comes from the configuration, never from a hand — the
 * one way to delete this Worker cannot name another.
 */
export function chatWithdrawArgs(target: DeployTarget): string[] {
  return ['delete', '--config', CHAT_CONFIG, `--env=${target === 'preview' ? 'preview' : ''}`];
}

/**
 * Why the Worker of the chat must not be taken away now — or null when it may. What closes
 * always may (the same rule as the holding page): nothing is asked but the editor's accord,
 * given that day, because deleting a Worker is his decision each time (CLAUDE.md).
 */
export function chatWithdrawRefusal(
  accord: string | null,
  today: string,
  target: DeployTarget,
  named: string | null,
): string | null {
  // Outside a terminal wrangler deletes without asking (read in 4.130.0: its confirmation
  // falls back to « yes »). So the name is checked here, before anything is started: a
  // configuration edited to name the site's own Worker deletes nothing.
  if (named !== CHAT_WORKERS[target]) {
    return (
      `${CHAT_CONFIG} names ${named ?? 'no Worker'} for this target, not ` +
      `${CHAT_WORKERS[target]}: nothing is deleted`
    );
  }
  return accord === today
    ? null
    : `deleting the Worker of the chat needs the editor's accord, given today: add --accord ${today}`;
}

export interface ChatDeployContext {
  /** `--dry-run`: wrangler bundles and uploads nothing. */
  dryRun: boolean;
  /**
   * The Worker the configuration names for this target (`chatWorkerName`): a configuration
   * edited to name the site's own Worker would replace it (review 11, M3).
   */
  named?: string | null;
  /** The day given with `--accord`, and today: sending a Worker is the editor's decision. */
  accord: string | null;
  today: string;
  /** What the configuration still lacks (`workerProblems`). */
  workerProblems: readonly string[];
  /** The mode of data/2026/ask.json: what the site does with a question. */
  ask: Exclude<AskDeploy, 'bench'>;
  /** What still stands between the app and the apex (scripts/launch.ts). */
  launchBlockers: readonly string[];
  /**
   * What still stands between the preview host and its first question (`previewChatBlockers`):
   * this Worker carries the mode of that host, so deploying it there is what opens the routes.
   */
  previewBlockers: readonly string[];
}

/**
 * Why the Worker of the chat must not be deployed to this target — or null when it may.
 *
 * A dry run sends nothing and is never refused: CI bundles this Worker on every pull request.
 * Anything else is the editor's decision at the time (CLAUDE.md: the first deployment of a
 * Worker), so the command line carries the day it was given. The preview host is where this
 * deployment is rehearsed and where the chat answers first; the apex takes it only when the
 * site answers questions and every gate of the launch holds — the rehearsal among them.
 */
export function chatDeployRefusal(target: DeployTarget, context: ChatDeployContext): string | null {
  if (context.named !== undefined && context.named !== CHAT_WORKERS[target]) {
    return (
      `${CHAT_CONFIG} names ${context.named ?? 'no Worker'} for this target, not ` +
      `${CHAT_WORKERS[target]}: nothing is deployed`
    );
  }
  if (context.dryRun) return null;
  if (context.workerProblems.length > 0) {
    return `the Worker is not ready to be deployed — ${context.workerProblems.join(' · ')}`;
  }
  if (target === 'apex' && context.ask !== 'chat') {
    return (
      `${ASK_PATH} says the site answers no question: a Worker that reads questions has no ` +
      'place in front of the apex before the chat is opened (PLAN-CHAT, lot C12)'
    );
  }
  if (target === 'apex' && context.launchBlockers.length > 0) {
    return `the chat does not go to the apex yet — ${context.launchBlockers.join(' · ')}`;
  }
  if (target === 'preview' && context.previewBlockers.length > 0) {
    return `the preview host does not ask yet — ${context.previewBlockers.join(' · ')}`;
  }
  if (context.accord !== context.today) {
    return (
      "deploying the Worker of the chat needs the editor's accord, given today: " +
      `add --accord ${context.today}`
    );
  }
  return null;
}

/**
 * Flags of ours that npm took for its own: written before `--` (`npm run deploy --dry-run`,
 * `npm run build --holding`), a flag goes to npm and never reaches the script. npm 11 keeps the
 * ones it knows as `npm_config_*` (`--dry-run` among them: the deploy then went out for real,
 * review 9, D1) and drops the others with a warning; npm 10 kept them all. What it kept is
 * refused here; what it dropped leaves its value behind as a lone word, which the strict
 * reading of the arguments refuses.
 */
export function swallowedFlags(
  flags: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return flags.filter(
    (flag) => env[`npm_config_${flag.replace(/^--/, '').replace(/-/g, '_')}`] !== undefined,
  );
}

/**
 * What `scripts/deploy.ts` hands on to wrangler: `--dry-run`, and `--outdir <dir>` for the
 * bundle of a dry run. Nothing else — `--config`, `--env`, `--name`, `--assets` or `--route`
 * would each undo a choice the guard has just made, and wrangler reads the last one it is given.
 * `--bench`, `--chat`, `--withdraw` and `--accord <day>` are the script's own and never reach
 * wrangler.
 * Returns the arguments it refuses.
 */
export function refusedArguments(given: readonly string[]): string[] {
  const refused: string[] = [];
  // A flag written twice reaches wrangler half-read — a second `--accord`'s day as a word
  // (review 9, D13); `--outdir` keeps a bundle, and only a dry run makes one (D14).
  const seen = new Set<string>();
  for (const arg of given) {
    const flag = arg.split('=')[0] ?? arg;
    if (flag.startsWith('--') && seen.has(flag)) refused.push(`${flag} (twice)`);
    seen.add(flag);
  }
  if (seen.has('--outdir') && !seen.has('--dry-run')) refused.push('--outdir (without --dry-run)');
  for (let i = 0; i < given.length; i += 1) {
    const arg = given[i] ?? '';
    if (
      arg === '--bench' ||
      arg === '--chat' ||
      arg === '--withdraw' ||
      arg === '--dry-run' ||
      arg === '--without-game'
    ) {
      continue;
    }
    if (/^--outdir=.+/.test(arg) || /^--accord=\d{4}-\d{2}-\d{2}$/.test(arg)) continue;
    const value = given[i + 1] ?? '';
    if (arg === '--outdir' && value !== '' && !value.startsWith('-')) {
      i += 1;
      continue;
    }
    if (arg === '--accord' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      i += 1;
      continue;
    }
    refused.push(arg);
  }
  return refused;
}

/** What a build directory shows of the game and of the questions, read from its files. */
export interface DistContent {
  /** The published files of the game: `data/jeu-<fingerprint>.json`. */
  gameFiles: string[];
  /** The home page carries the sheet that sends a question (`id="chat-config"`). */
  asks: boolean;
}

export function readDist(dir = 'dist'): DistContent {
  const data = join(dir, 'data');
  const home = join(dir, 'index.html');
  const holds = (path: string, mark: string): boolean =>
    existsSync(path) && readFileSync(path, 'utf8').includes(mark);
  return {
    gameFiles: existsSync(data)
      ? readdirSync(data)
          .filter((name) => /^jeu-.*\.json$/.test(name))
          .sort()
      : [],
    asks: holds(home, 'id="chat-config"'),
  };
}

/**
 * Where a build directory disagrees with the data it would be deployed under. The marker says
 * how the last `npm run build` was made; it says nothing of a directory filled another way — a
 * test build copied over it, an `astro build` run by hand with a test variable, a build older
 * than the list of words. So the directory itself is read:
 *   - it shows the game only if the editor validated the list as it stands, and from that list;
 *   - it sends questions only if data/2026/ask.json says the site answers them.
 * (From 15 to 16 November 2026 a third rule refused a build showing the second generation of
 * the mascot to a host data/mascot.json gave the first; it went with the first generation, lot
 * F of docs/discovery/PLAN-TORTUE.md. Of the two hosts, only what they do with a question can
 * differ now — and that rule is the one above.)
 * `gameFile` is the file a build of today would publish — null while the list is not ready.
 */
export function distProblems(
  dist: DistContent,
  expected: { gameFile: string | null; ask: AskDeploy },
): string[] {
  const out: string[] = [];
  const stray = dist.gameFiles.filter((name) => name !== expected.gameFile);
  if (expected.gameFile === null && dist.gameFiles.length > 0) {
    out.push('dist/ shows the game, and the list of words is not validated as it stands');
  } else if (expected.gameFile !== null && dist.gameFiles.length === 0) {
    // Built while the list was not validated, or by hand without the game: a build of today
    // would show it, and the turtle with it (review 11, M11).
    out.push('dist/ shows no game, and a build of today would: build again');
  } else if (stray.length > 0) {
    out.push('dist/ shows a game built from another list of words');
  }
  if (dist.asks && (expected.ask === 'off' || expected.ask === 'bench')) {
    out.push(`dist/ sends questions, and ${ASK_PATH} says this host answers none`);
  }
  return out;
}

/**
 * Every HTML file a holding build may contain. Anything else is a leak of the app into it. The
 * legal notice stays served during a withdrawal (D21.18).
 */
export const HOLDING_PAGES: readonly string[] = [
  '404.html',
  'index.html',
  'mentions-legales/index.html',
];

/**
 * Old public paths that must land on the holding page instead of breaking (D15.4).
 *
 * `/m/`, `/a/`, `/r/`, `/p/` and `/res/` were served by the September share spike and eight such
 * links were sent on 9/9/2026; `/s/` belongs to the app. Always 302, never 301: these prefixes
 * get real pages again with the 2026 edition, and a browser that cached a permanent redirect
 * would never see them.
 */
export const HOLDING_REDIRECT_PREFIXES: readonly string[] = ['m', 'a', 'r', 'p', 'res', 's'];

/**
 * Prefixes of the September spike that the app does not rebuild: a progress card (`/p/`) and a
 * "my three measures" result (`/res/`). `/m/`, `/a/`, `/s/` and `/r/` get real bridge pages
 * (D15.8); these two have nothing to bridge to, so they land on the home page.
 */
export const APP_REDIRECT_PREFIXES: readonly string[] = ['p', 'res'];

export function appRedirects(): string {
  return [
    '# Generated by scripts/build.ts. Temporary by design: 302, never 301.',
    ...APP_REDIRECT_PREFIXES.map((prefix) => `/${prefix}/* / 302`),
    '',
  ].join('\n');
}

export function holdingRedirects(): string {
  const rules = HOLDING_REDIRECT_PREFIXES.map((prefix) => `/${prefix}/* / 302`);
  return [
    '# Generated by scripts/build.ts --holding. Temporary by design: 302, never 301.',
    ...rules,
    '',
  ].join('\n');
}

/**
 * The mode of the build in dist/. A dist/ produced before the marker existed is an app build,
 * which is the safe reading: an app build is the one the apex refuses.
 */
export function readBuildMode(marker: string = BUILD_MARKER): BuildMode {
  if (!existsSync(marker)) return 'app';
  const parsed: unknown = JSON.parse(readFileSync(marker, 'utf8'));
  if (typeof parsed === 'object' && parsed !== null && 'mode' in parsed) {
    if (parsed.mode === 'holding') return 'holding';
  }
  return 'app';
}

/** Every .html under `dir`, as sorted paths relative to it. */
export function htmlPages(dir = 'dist'): string[] {
  const walk = (current: string): string[] => {
    if (!existsSync(current)) return [];
    return readdirSync(current).flatMap((name) => {
      const path = join(current, name);
      if (statSync(path).isDirectory()) return walk(path);
      return path.endsWith('.html') ? [relative(dir, path)] : [];
    });
  };
  return walk(dir).sort();
}

export const EXPOSURE_POLICY_PATH = 'data/2026/exposure-policy.json';

/** True once the editor has dated the citation policy (`validated_on`, D15.7). */
export function citationPolicyValidated(path: string = EXPOSURE_POLICY_PATH): boolean {
  if (!existsSync(path)) return false;
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'validated_on' in parsed &&
    typeof parsed.validated_on === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(parsed.validated_on)
  );
}

export interface DeployContext {
  /** The editor has validated the citation policy on the measured numbers (D15.7). */
  policyValidated: boolean;
  /** `--dry-run`: wrangler bundles and uploads nothing. */
  dryRun: boolean;
  /**
   * What still stands between the app and the apex (scripts/launch.ts): the editor's decision,
   * the legal declaration, the contact address, the reviews. Empty on launch day, and only then.
   */
  launchBlockers: readonly string[];
  /**
   * Now is inside an electoral silence window (L49: Friday 00:00 to Sunday 20:00, Paris) — or
   * less than a day before one (`nearSilenceWindow`): what goes out then is what will be served
   * when it starts.
   */
  insideSilenceWindow: boolean;
  /** The app build in dist/ is the "scrutin" one: its HTML holds neither a word nor a tile. */
  scrutinBuild: boolean;
  /** How this build answers a question — which decides whether a Worker goes out with it. */
  ask: AskDeploy;
  /** What the Worker's configuration still lacks (`workerProblems`): empty when it is ready. */
  workerProblems: readonly string[];
  /**
   * What still stands between the preview host and its first question (scripts/launch.ts,
   * `previewChatBlockers`): empty when it may ask — and when it does not ask at all.
   */
  previewBlockers: readonly string[];
  /** Where dist/ disagrees with the data it would go out under (`distProblems`). */
  distProblems: readonly string[];
  /**
   * Why the sentences this build shows on the cards of the game may not go out yet
   * (`gistsUnpublished`, scripts/deploy.ts): their file is not in the repository as committed.
   * Empty when the build shows none, and when the file it shows is the committed one.
   */
  gistsProblems?: readonly string[];
  /**
   * What keeps the code of main from production while the game-first redesign is being written
   * (scripts/launch.ts, `homeBlockers`, D19.12): empty once the editor has dated his yes.
   */
  homeBlockers: readonly string[];
  /**
   * What keeps the explained words of main from production (scripts/launch.ts,
   * `wordsBlockers`, D20.15): empty when the file is sealed as it stands, and opened when it
   * must be.
   */
  wordsBlockers?: readonly string[];
  /**
   * What dist/ holds that no finished static build ships (`distLeftovers`): server files of a
   * build that stopped half-way, a path of this machine. Empty for a build that went to its end.
   */
  leftovers?: readonly string[];
  /** The host the app build in dist/ was made for (its marker): it goes to that host only. */
  builtFor?: DeployTarget;
  /**
   * A build of today shows no game — and no turtle with it — outside the scrutin build: the list
   * of words is not validated as it stands (`gameSite().on` false).
   */
  showsNoGame?: boolean;
  /** `--without-game`: the operator says it is the gesture of sheet 9 (a word taken out). */
  withoutGame?: boolean;
  /**
   * What holds back the preview host's pages whatever they ask (scripts/launch.ts,
   * `previewPageBlockers`): the line of the privacy page about her colour (A5).
   */
  previewPageBlockers?: readonly string[];
}

/**
 * The context a holding build is judged in: nothing of the app is read for it (D14.10). The
 * withdrawal goes out whatever state the app's own files are in — a draft answer, a field left
 * at null, a comma left in data/launch.json by the very edit that withdraws (review 9, D5;
 * review 10, A1; review 11, M5). Its one rule is the list of its pages (`deployRefusal`).
 */
export function withdrawalContext(
  dryRun: boolean,
  ask: AskDeploy,
  leftovers: readonly string[] = [],
): DeployContext {
  return {
    leftovers,
    policyValidated: true,
    dryRun,
    launchBlockers: [],
    insideSilenceWindow: false,
    scrutinBuild: false,
    ask,
    workerProblems: [],
    previewBlockers: [],
    distProblems: [],
    gistsProblems: [],
    homeBlockers: [],
    wordsBlockers: [],
  };
}

/** The commit checked out and whether a tracked file differs from it — null outside git. */
export function treeState(cwd = '.'): { commit: string; dirty: boolean } | null {
  const run = (...args: string[]): string | null => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
  };
  const commit = run('rev-parse', 'HEAD');
  const changes = run('status', '--porcelain', '--untracked-files=no');
  return commit === null || changes === null ? null : { commit, dirty: changes !== '' };
}

/** The lock a build and a deploy share: one of them at a time in a checkout (T6, M9). */
export const BUILD_LOCK = 'build/.lock';

/**
 * Takes the lock, or says who holds it. A lock whose process is gone is taken over: a build
 * killed half-way leaves its lock behind, and no marker (`readBuildMarker`).
 */
export function takeLock(what: string, lock: string = BUILD_LOCK): string | null {
  mkdirSync(dirname(lock), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeFileSync(lock, `${String(process.pid)} ${what}\n`, { flag: 'wx' });
      return null;
    } catch {
      const [pid = '', ...rest] = (existsSync(lock) ? readFileSync(lock, 'utf8') : '')
        .trim()
        .split(' ');
      const alive = (() => {
        try {
          process.kill(Number(pid), 0);
          return true;
        } catch {
          return false;
        }
      })();
      if (alive && pid !== '')
        return `${rest.join(' ') || 'a build or a deploy'} runs here (process ${pid})`;
      rmSync(lock, { force: true });
    }
  }
  return 'the lock of this checkout could not be taken';
}

/** Gives the lock back — only if this process holds it. */
export function giveLock(lock: string = BUILD_LOCK): void {
  if (!existsSync(lock)) return;
  if (readFileSync(lock, 'utf8').split(' ')[0] === String(process.pid))
    rmSync(lock, { force: true });
}

/** What build/last-build.json says of the build in dist/. */
export interface BuildMarker {
  mode: BuildMode;
  scrutin: boolean;
  /** The host it was made for (`--host preview`), production's without the flag. */
  host: DeployTarget;
  /** Written by a build whose every step succeeded (scripts/build.ts): its last act. */
  complete: boolean;
  /** A holding build of a re-edition (`npm run build:update`, D21.37), not of a withdrawal. */
  update: boolean;
  /** The commit it was built from, and whether a tracked file differed from it then (M8, T9). */
  commit: string | null;
  dirty: boolean | null;
}

/**
 * The marker of the build in dist/, or null when there is none to read: no file (a build that
 * stopped half-way removed it and never wrote its own), or one that does not parse or names no
 * mode. Never throws: the withdrawal reads it too.
 */
export function readBuildMarker(marker: string = BUILD_MARKER): BuildMarker | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(marker, 'utf8'));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const mode = record['mode'];
  if (mode !== 'app' && mode !== 'holding') return null;
  return {
    mode,
    scrutin: record['scrutin'] === true,
    host: record['host'] === 'preview' ? 'preview' : 'apex',
    complete: record['complete'] === true,
    update: record['update'] === true,
    commit: typeof record['commit'] === 'string' ? record['commit'] : null,
    dirty: typeof record['dirty'] === 'boolean' ? record['dirty'] : null,
  };
}

/** Files of a server build: a static site never serves them, a build that stopped leaves them. */
const SERVER_FILE = /(?:^|\/)(?:chunks|pages)\/|\.mjs$|(?:^|\/)(?:manifest_[^/]*|renderers)\.m?js$/;
/** Files read as text when looking for a path of this machine. */
const TEXT_FILE =
  /\.(?:html|js|mjs|css|json|txt|xml|svg|webmanifest|map|md)$|(?:^|\/)_(?:headers|redirects)$/;

/**
 * What dist/ holds that no finished static build ships: the server files Astro writes while it
 * renders and removes when it is done — they carry the absolute path of the checkout — and any
 * text that names a path of this machine (D0.15: no absolute path, no personal address in what
 * goes out; review 12, T1). Read for every deploy, the withdrawal included: it reads dist/ only.
 */
export function distLeftovers(
  dir = 'dist',
  paths: readonly string[] = [process.cwd(), homedir()],
): string[] {
  const named = paths.filter((path) => path.length > 1);
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      const rel = relative(dir, path);
      if (SERVER_FILE.test(rel)) {
        found.push(`a server file: ${rel}`);
        continue;
      }
      if (!TEXT_FILE.test(rel)) continue;
      const text = readFileSync(path, 'utf8');
      if (named.some((name) => text.includes(name))) found.push(`a path of this machine in ${rel}`);
    }
  };
  if (existsSync(dir)) walk(dir);
  return found;
}

/** True when the build in dist/ was made with `--scrutin` (the build deployed before each window). */
export function readBuildScrutin(marker: string = BUILD_MARKER): boolean {
  if (!existsSync(marker)) return false;
  const parsed: unknown = JSON.parse(readFileSync(marker, 'utf8'));
  return (
    typeof parsed === 'object' && parsed !== null && 'scrutin' in parsed && parsed.scrutin === true
  );
}

/** Whether `now` falls inside one of the electoral silence windows of the calendar (D9.7). */
export function insideSilenceWindow(
  now: Date,
  windows: readonly SilenceWindow[] = silenceWindows(),
): boolean {
  return windows.some(
    (w) => now.getTime() >= w.startUtc.getTime() && now.getTime() < w.endUtc.getTime(),
  );
}

// One day, defined with the calendar: the page of a scrutin build reads the same number.
export { SILENCE_APPROACH_MS };

/**
 * Whether `now` is inside a silence window or less than a day before one. The deploy rule reads
 * this, not the window alone: a correction pushed on the Friday morning would otherwise replace
 * the scrutin build deployed the day before, and stay through the vote.
 */
export function nearSilenceWindow(
  now: Date,
  windows: readonly SilenceWindow[] = silenceWindows(),
): boolean {
  return windows.some(
    (w) =>
      now.getTime() >= w.startUtc.getTime() - SILENCE_APPROACH_MS &&
      now.getTime() < w.endUtc.getTime(),
  );
}

/**
 * Why this build must not be deployed to this target — or null when it may.
 *
 * Kept pure so the rule is tested without a dist/: the apex takes the holding build until every
 * launch condition is met (scripts/launch.ts), a holding build is exactly its two pages, and an
 * app build — which carries incipits, locators
 * and quotations of a book that is all rights reserved — goes nowhere public, not even to the
 * noindex preview host, before the editor has seen and dated the measured exposure.
 */
export function deployRefusal(
  target: DeployTarget,
  mode: BuildMode,
  pages: readonly string[],
  context: DeployContext,
): string | null {
  // What no finished build ships goes nowhere — dry run or not, the withdrawal included: a
  // server file carries the absolute path of the checkout (D0.15; review 12, T1).
  const left = context.leftovers ?? [];
  if (left.length > 0) {
    return (
      `dist/ holds what no finished build ships — ${left.slice(0, 5).join(' · ')}` +
      `${left.length > 5 ? ` (+${String(left.length - 5)} more)` : ''}: build again`
    );
  }
  // An app build is made for one host (review 9, D11; review 7, C7): what its pages ask and the
  // words they explain may differ between the two. A dry run sends nothing.
  if (
    mode === 'app' &&
    !context.dryRun &&
    context.builtFor !== undefined &&
    context.builtFor !== target
  ) {
    return (
      `this build was made for the ${context.builtFor === 'preview' ? 'preview host' : 'apex'} — ` +
      `build it for this one: ${target === 'preview' ? '`npm run build:preview`' : '`npm run build`'}`
    );
  }
  // Since the launch (14/11/2026, D16.36) a gate that stands again is a change awaiting its
  // date — never a reason to put the holding page back, which is the withdrawal and the
  // editor's decision (review 11, M1).
  // The game is not optional (D16.11): production goes without it only when sheet 9 takes a
  // word out, and the operator says so — a list broken by accident looks the same (review 9,
  // D6; review 10, A9). The scrutin build shows no game by law (D16.16). A dry run sends nothing.
  if (
    target === 'apex' &&
    mode === 'app' &&
    !context.dryRun &&
    context.showsNoGame === true &&
    !context.scrutinBuild &&
    context.withoutGame !== true
  ) {
    return (
      'this build shows no game, and no turtle with it (D16.11): the list of words is not ' +
      'validated as it stands. If this is the gesture of sheet 9 — a word taken out until the ' +
      'editor validates the list again —, say so: `npm run deploy -- --without-game`'
    );
  }
  if (target === 'apex' && mode !== 'holding' && context.launchBlockers.length > 0) {
    return (
      `production does not take this app build — ${context.launchBlockers.join(' · ')}. ` +
      'Show it on the preview host with `npm run build:preview && npm run deploy:preview -- --bench`; ' +
      'putting the holding page back (`npm run build:holding`) is the withdrawal (D14.10), ' +
      "the editor's decision"
    );
  }
  // The game-first home (D19.1) is written on main before production serves it — one code path,
  // no second generation (D19.12). Until the editor's dated word the apex takes no app build
  // from here, whatever it holds: an urgent fix of production is built from the commit that
  // production serves (runbook sheet 14). What closes always may: the holding page is not an
  // app build. The preview host is where the redesign is shown first, and a dry run sends
  // nothing — CI bundles the apex on every push.
  if (target === 'apex' && mode === 'app' && !context.dryRun && context.homeBlockers.length > 0) {
    return (
      'production does not take the code of main yet (D19.12): ' +
      `${context.homeBlockers.join(' · ')}. ` +
      'Show it on the preview host with `npm run build:preview && npm run deploy:preview -- --bench`; ' +
      'for an urgent fix of production, runbook sheet 14 (docs/discovery/09-architecture.md)'
    );
  }
  // The explained words (PLAN-MOTS, D20.15): production takes them sealed as they stand — and,
  // for the new charter or a surface opened there, opened after an independent reviewer's yes on
  // the preview host. The preview host is where they are shown first; a dry run sends nothing.
  const words = context.wordsBlockers ?? [];
  // The scrutin build shows no explained word (src/lib/words-config.ts): the rule protects
  // nothing there, and must not hold back the build that closes before a window (review 11,
  // M2). The home's rule above does hold it: before his yes it would carry the new home page.
  if (
    target === 'apex' &&
    mode === 'app' &&
    !context.dryRun &&
    !context.scrutinBuild &&
    words.length > 0
  ) {
    return (
      'production does not take these explained words yet (D20.15): ' +
      `${words.join(' · ')}. ` +
      'Show them on the preview host first; for an urgent fix of production, runbook sheet 15 ' +
      '(docs/discovery/09-architecture.md)'
    );
  }
  // L49 (D16.16): inside a window, and from the day before, nothing that OPENS is deployed.
  // What closes always may — the holding page (the withdrawal) and the scrutin build, whose
  // HTML shows no word and no tile. A dry run uploads nothing, and CI must stay green on a
  // polling Sunday.
  if (context.insideSilenceWindow && mode === 'app' && !context.scrutinBuild && !context.dryRun) {
    return (
      'electoral silence (L49, D16.16): inside a window and the day before it, only what ' +
      'closes is deployed — the scrutin build (`npm run build:scrutin`) or the holding page'
    );
  }
  // The directory is read, whatever the marker says of the last build.
  // The sentences of the game are published in a file of the PUBLIC repository (D19.2), and the
  // site says so: a build may not serve them from a file that only this machine holds — one the
  // editor's word was written into before it was ever pushed, or one edited since (found by
  // the security review of 19/11/2026). A dry run sends nothing.
  if (mode === 'app' && !context.dryRun && (context.gistsProblems ?? []).length > 0) {
    return `${(context.gistsProblems ?? []).join(' · ')} — commit and push the file first, then build again`;
  }
  if (mode === 'app' && context.distProblems.length > 0) {
    return `${context.distProblems.join(' · ')} — run \`npm run build\` and deploy that`;
  }
  // The Worker (D16.7) goes out only with an app that answers questions — and, for the bench,
  // to the preview host alone: the apex never runs a model nobody has chosen yet.
  if (mode === 'app' && context.ask === 'bench' && target !== 'preview') {
    return 'the bench runs on the preview host only: `npm run deploy:preview -- --bench`';
  }
  // The line of the privacy page about her colour is read before any host shows it — the preview
  // host first, as its own rule says (review 10, A5; D17.26). A dry run sends nothing.
  if (
    mode === 'app' &&
    target === 'preview' &&
    !context.dryRun &&
    (context.previewPageBlockers ?? []).length > 0
  ) {
    return `the preview host does not take these pages yet — ${(context.previewPageBlockers ?? []).join(' · ')}`;
  }
  // The preview host is public: before its pages ask, the gates that come before any question
  // hold (scripts/launch.ts, `previewChatBlockers`). A dry run sends nothing.
  if (
    mode === 'app' &&
    target === 'preview' &&
    context.ask === 'chat' &&
    context.previewBlockers.length > 0 &&
    !context.dryRun
  ) {
    return `the preview host does not ask yet — ${context.previewBlockers.join(' · ')}`;
  }
  // A page that asks goes to the apex as files, like any other (lot C10): its chat is another
  // Worker (`CHAT_CONFIG`, `chatDeployRefusal`). What keeps it from going there too early is
  // the first rule above: with the mode "chat" the launch asks for every gate of PLAN-CHAT §5,
  // the rehearsal of that deployment among them (scripts/launch.ts).
  if (
    mode === 'app' &&
    context.ask !== 'off' &&
    target === 'preview' &&
    context.workerProblems.length > 0 &&
    !context.dryRun
  ) {
    return `the Worker is not ready to be deployed — ${context.workerProblems.join(' · ')}`;
  }
  if (mode === 'app' && !context.policyValidated && !context.dryRun) {
    return (
      'the citation policy has not been validated (D15.7): run ' +
      '`npx tsx scripts/publish-2026.ts --report`, decide, then set "validated_on" in ' +
      `${EXPOSURE_POLICY_PATH} — until then the app is not deployed anywhere, preview included`
    );
  }
  if (mode === 'holding') {
    const unexpected = pages.filter((p) => !HOLDING_PAGES.includes(p));
    const missing = HOLDING_PAGES.filter((p) => !pages.includes(p));
    if (unexpected.length > 0 || missing.length > 0) {
      return (
        'a holding build ships exactly index.html and 404.html — ' +
        `unexpected: ${unexpected.slice(0, 5).join(', ') || 'none'}` +
        `${unexpected.length > 5 ? ` (+${String(unexpected.length - 5)} more)` : ''}; ` +
        `missing: ${missing.join(', ') || 'none'}`
      );
    }
  }
  return null;
}
