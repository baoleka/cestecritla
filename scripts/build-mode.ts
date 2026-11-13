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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { silenceWindows, type SilenceWindow } from '../src/lib/silence.js';
import { parseJsonc } from './jsonc.js';

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
 * The Worker of « Demander » (src/worker/, D16.7): `/api/ask`, the AI binding, the private
 * base, the daily allowance. Deployed with the app only when the site answers questions.
 */
export const WORKER_CONFIG = 'wrangler.jsonc';

export const ASK_PATH = 'data/2026/ask.json';

/**
 * How the build about to be deployed answers a question: the mode of data/2026/ask.json —
 * or "bench", the one case where the Worker goes out while the page still answers nothing
 * (`npm run deploy:preview -- --bench`: the bench measures the candidates on the preview host).
 */
export type AskDeploy = 'off' | 'answer' | 'select' | 'bench';

/** The mode the committed file says. Anything unreadable is "off": no Worker by accident. */
export function readAskMode(path: string = ASK_PATH): Exclude<AskDeploy, 'bench'> {
  if (!existsSync(path)) return 'off';
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof parsed === 'object' && parsed !== null && 'mode' in parsed) {
      if (parsed.mode === 'answer' || parsed.mode === 'select') return parsed.mode;
    }
  } catch {
    return 'off';
  }
  return 'off';
}

/** The configuration a build is deployed with (the mode is data: D16.4). */
export function wranglerConfig(mode: BuildMode, ask: AskDeploy = 'off'): string {
  return mode === 'app' && ask !== 'off' ? WORKER_CONFIG : STATIC_CONFIG;
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
  const config = record(read(WORKER_CONFIG));
  const manifest = record(record(read('data/2026/manifest.json'))['meta'])['corpus_version'];
  const environments: [string, Record<string, unknown>][] = [
    ['top level', config],
    ['env.preview', record(record(config['env'])['preview'])],
  ];
  for (const [name, env] of environments) {
    const bases = Array.isArray(env['d1_databases']) ? env['d1_databases'] : [];
    const id = record(bases[0])['database_id'];
    if (typeof id !== 'string' || id === UNSET_DATABASE_ID) {
      out.push(`${WORKER_CONFIG} (${name}): the private base has no identifier yet (lot I3)`);
    }
    if (record(env['vars'])['CORPUS_VERSION'] !== manifest) {
      out.push(`${WORKER_CONFIG} (${name}): CORPUS_VERSION is not the corpus of the manifest`);
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
    wranglerConfig(mode, ask),
    `--env=${target === 'preview' ? 'preview' : ''}`,
    ...passthrough,
  ];
}

/**
 * What `scripts/deploy.ts` hands on to wrangler: `--dry-run`, and `--outdir <dir>` for the
 * bundle of a dry run. Nothing else — `--config`, `--env`, `--name`, `--assets` or `--route`
 * would each undo a choice the guard has just made, and wrangler reads the last one it is given.
 * Returns the arguments it refuses.
 */
export function refusedArguments(given: readonly string[]): string[] {
  const refused: string[] = [];
  for (let i = 0; i < given.length; i += 1) {
    const arg = given[i] ?? '';
    if (arg === '--bench' || arg === '--dry-run' || /^--outdir=.+/.test(arg)) continue;
    const value = given[i + 1] ?? '';
    if (arg === '--outdir' && value !== '' && !value.startsWith('-')) {
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
  /** The home page carries the block that sends a question (`id="ask-config"`). */
  asks: boolean;
}

export function readDist(dir = 'dist'): DistContent {
  const data = join(dir, 'data');
  const home = join(dir, 'index.html');
  return {
    gameFiles: existsSync(data)
      ? readdirSync(data)
          .filter((name) => /^jeu-.*\.json$/.test(name))
          .sort()
      : [],
    asks: existsSync(home) && readFileSync(home, 'utf8').includes('id="ask-config"'),
  };
}

/**
 * Where a build directory disagrees with the data it would be deployed under. The marker says
 * how the last `npm run build` was made; it says nothing of a directory filled another way — a
 * test build copied over it, an `astro build` run by hand with a test variable, a build older
 * than the list of words. So the directory itself is read:
 *   - it shows the game only if the editor validated the list as it stands, and from that list;
 *   - it sends questions only if data/2026/ask.json says the site answers them.
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
  } else if (stray.length > 0) {
    out.push('dist/ shows a game built from another list of words');
  }
  if (dist.asks && (expected.ask === 'off' || expected.ask === 'bench')) {
    out.push(`dist/ sends questions, and ${ASK_PATH} says the site answers none`);
  }
  return out;
}

/** Every HTML file a holding build may contain. Anything else is a leak of the app into it. */
export const HOLDING_PAGES: readonly string[] = ['404.html', 'index.html'];

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
  /** Where dist/ disagrees with the data it would go out under (`distProblems`). */
  distProblems: readonly string[];
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

/** A day: what is deployed that close to a window is what the window will be served with. */
export const SILENCE_APPROACH_MS = 24 * 60 * 60 * 1000;

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
  if (target === 'apex' && mode !== 'holding' && context.launchBlockers.length > 0) {
    return (
      'the apex serves the holding page until the launch is decided (D15.15): ' +
      'run `npm run build:holding` first, or deploy the app with `npm run deploy:preview`. ' +
      `Before the app can go there — ${context.launchBlockers.join(' · ')}`
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
  if (mode === 'app' && context.distProblems.length > 0) {
    return `${context.distProblems.join(' · ')} — run \`npm run build\` and deploy that`;
  }
  // The Worker (D16.7) goes out only with an app that answers questions — and, for the bench,
  // to the preview host alone: the apex never runs a model nobody has chosen yet.
  if (mode === 'app' && context.ask === 'bench' && target !== 'preview') {
    return 'the bench runs on the preview host only: `npm run deploy:preview -- --bench`';
  }
  if (
    mode === 'app' &&
    context.ask !== 'off' &&
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
