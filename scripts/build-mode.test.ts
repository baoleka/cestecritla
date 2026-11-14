/**
 * The deploy rule and the two wrangler configurations (D15.4, D15.5, D15.12, D16.7).
 *
 * Read in wrangler 4.130.0's source before writing this: outside an interactive terminal,
 * `wrangler deploy` re-points a custom domain that belongs to another Worker WITHOUT asking.
 * So "which build goes where" cannot rest on someone reading a prompt — it is a gate, and the
 * rule is tested here without needing a dist/.
 *
 * Run: npx tsx --test scripts/build-mode.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  APP_REDIRECT_PREFIXES,
  CHAT_CONFIG,
  HOLDING_PAGES,
  HOLDING_REDIRECT_PREFIXES,
  SILENCE_APPROACH_MS,
  STATIC_CONFIG,
  UNSET_DATABASE_ID,
  WORKER_CONFIG,
  CHAT_WORKERS,
  appRedirects,
  builtAskMode,
  chatDeployArgs,
  chatDeployRefusal,
  chatWithdrawArgs,
  chatWithdrawRefusal,
  chatWorkerName,
  citationPolicyValidated,
  deployRefusal,
  distProblems,
  holdingRedirects,
  insideSilenceWindow,
  nearSilenceWindow,
  readAskMode,
  readBuildHost,
  readBuildScrutin,
  readDist,
  refusedArguments,
  workerProblems,
  wranglerConfig,
  wranglerDeployArgs,
  type ChatDeployContext,
  type DeployContext,
} from './build-mode.js';
import { parseJsonc, stripJsoncComments } from './jsonc.js';

/** The editor has dated the citation policy, and this is a real deployment. */
const VALIDATED: DeployContext = {
  policyValidated: true,
  dryRun: false,
  launchBlockers: ['the launch has not been decided'],
  insideSilenceWindow: false,
  scrutinBuild: false,
  ask: 'off',
  workerProblems: [],
  previewBlockers: [],
  distProblems: [],
};

interface Route {
  pattern: string;
  custom_domain?: boolean;
  zone_name?: string;
}
interface Environment {
  routes?: Route[];
  vars?: Record<string, string>;
  ai?: { binding?: string };
  d1_databases?: { binding?: string; database_name?: string; database_id?: string }[];
  durable_objects?: { bindings?: { name?: string; class_name?: string }[] };
  ratelimits?: { name?: string; namespace_id?: string }[];
  analytics_engine_datasets?: unknown;
  kv_namespaces?: unknown;
  triggers?: unknown;
  tail_consumers?: unknown;
  logpush?: unknown;
  observability?: { enabled?: boolean };
}
interface WranglerConfig extends Environment {
  name?: string;
  main?: string;
  workers_dev?: boolean;
  preview_urls?: boolean;
  assets?: { directory?: string; binding?: string; run_worker_first?: unknown };
  migrations?: { tag?: string; new_sqlite_classes?: string[] }[];
  env?: Record<string, Environment>;
}

const read = (file: string): WranglerConfig =>
  parseJsonc(readFileSync(file, 'utf8')) as WranglerConfig;
const hosts = (routes: Route[] | undefined): string[] =>
  (routes ?? []).map((r) => r.pattern).sort();

/** The Worker of « Demander »: deployed with the app only when the site answers questions. */
const app = read(WORKER_CONFIG);
/** The static configuration: the holding page always, the app while it answers no question. */
const holding = read(STATIC_CONFIG);
/** « Demander » as a Worker of its own, in front of static files (lot C10). */
const chat = read(CHAT_CONFIG);
const APEX = ['cestecritla.fr', 'www.cestecritla.fr'];

void test('the JSONC reader keeps a URL inside a string and drops a comment after it', () => {
  const text = '{ "a": "https://x.fr/y", // gone\n "b": [1, 2,], /* gone */ }';
  assert.equal(stripJsoncComments('"https://x.fr" // c'), '"https://x.fr" ');
  assert.deepEqual(parseJsonc(text), { a: 'https://x.fr/y', b: [1, 2] });
});

void test('the apex refuses an app build until launch day', () => {
  const refusal = deployRefusal('apex', 'app', ['index.html', 's/c1-s02/index.html'], VALIDATED);
  assert.match(String(refusal), /holding page until the launch is decided/);
});

void test('the apex accepts a holding build made of exactly its two pages', () => {
  assert.equal(deployRefusal('apex', 'holding', [...HOLDING_PAGES], VALIDATED), null);
});

void test('a holding build that carries one page of the app is refused everywhere', () => {
  const leaked = [...HOLDING_PAGES, 'm/c12-s01-k01/index.html'];
  assert.match(
    String(deployRefusal('apex', 'holding', leaked, VALIDATED)),
    /unexpected: m\/c12-s01-k01/,
  );
  assert.match(
    String(deployRefusal('preview', 'holding', leaked, VALIDATED)),
    /unexpected: m\/c12-s01-k01/,
  );
});

void test('a holding build with a page missing is refused', () => {
  assert.match(
    String(deployRefusal('apex', 'holding', ['index.html'], VALIDATED)),
    /missing: 404\.html/,
  );
});

void test('the preview host takes either build', () => {
  assert.equal(
    deployRefusal('preview', 'app', ['index.html', 's/c1-s02/index.html'], VALIDATED),
    null,
  );
  assert.equal(deployRefusal('preview', 'holding', [...HOLDING_PAGES], VALIDATED), null);
});

void test('holding redirects are temporary, one per old prefix, and never touch the root', () => {
  const lines = holdingRedirects()
    .split('\n')
    .filter((l) => l !== '' && !l.startsWith('#'));
  assert.equal(lines.length, HOLDING_REDIRECT_PREFIXES.length);
  for (const line of lines) {
    // A 301 would be cached by browsers and defeat the bridges these prefixes get later.
    assert.match(line, /^\/[a-z]+\/\* \/ 302$/, `not a temporary prefix redirect: ${line}`);
  }
  // The eight links sent on 9/9/2026 used these five prefixes (prototypes/spike-share).
  for (const prefix of ['m', 'a', 'r', 'p', 'res']) {
    assert.ok(HOLDING_REDIRECT_PREFIXES.includes(prefix), `/${prefix}/ would 404`);
  }
});

void test('each build is deployed with its own configuration, to a named environment', () => {
  assert.deepEqual(wranglerDeployArgs('apex', 'holding'), [
    'deploy',
    '--config',
    'wrangler.static.jsonc',
    '--env=',
  ]);
  // An app that answers no question is static files too: no script, nothing to invoke.
  assert.deepEqual(wranglerDeployArgs('preview', 'app', ['--dry-run']), [
    'deploy',
    '--config',
    'wrangler.static.jsonc',
    '--env=preview',
    '--dry-run',
  ]);
  // The mode is data (D16.4): as soon as the site answers questions the Worker goes with it.
  for (const ask of ['chat', 'bench'] as const) {
    assert.deepEqual(wranglerDeployArgs('preview', 'app', [], ask), [
      'deploy',
      '--config',
      'wrangler.jsonc',
      '--env=preview',
    ]);
    // …with the app, never with the holding page, whatever the mode says.
    assert.equal(wranglerConfig('holding', ask), STATIC_CONFIG);
  }
  assert.equal(wranglerConfig('app', 'off'), STATIC_CONFIG);
  assert.notEqual(STATIC_CONFIG, WORKER_CONFIG);
  // The apex is files whatever the mode (lot C10): a page that asks goes there as files, and
  // its chat is another Worker — never this one, and never the bench.
  for (const ask of ['off', 'chat', 'bench'] as const) {
    assert.equal(wranglerConfig('app', ask, 'apex'), STATIC_CONFIG, ask);
    assert.deepEqual(wranglerDeployArgs('apex', 'app', [], ask), [
      'deploy',
      '--config',
      'wrangler.static.jsonc',
      '--env=',
    ]);
  }
});

void test('the mode read from the file is "off" unless it plainly says otherwise', () => {
  assert.equal(readAskMode('data/2026/does-not-exist.json'), 'off');
  const committed = JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as { mode: string };
  assert.equal(readAskMode(), committed.mode === 'chat' ? 'chat' : 'off');
  // The modes of the ladder of D16.4 open nothing any more: a file that still said one of them
  // is a site that answers no question.
  const old = join(mkdtempSync(join(tmpdir(), 'ask-')), 'ask.json');
  for (const mode of ['answer', 'select', 'on', '']) {
    writeFileSync(old, JSON.stringify({ mode }));
    assert.equal(readAskMode(old), 'off', mode);
  }
  writeFileSync(old, JSON.stringify({ mode: 'chat' }));
  assert.equal(readAskMode(old), 'chat');
});

void test('the Worker is deployed only when it is ready, and the bench only on the preview host', () => {
  const pages = ['index.html', 's/p1c1-s01/index.html'];
  const open: DeployContext = { ...VALIDATED, launchBlockers: [] };
  const unready = ['wrangler.jsonc (top level): the private base has no identifier yet (lot I3)'];
  for (const ask of ['chat', 'bench'] as const) {
    assert.match(
      String(deployRefusal('preview', 'app', pages, { ...open, ask, workerProblems: unready })),
      /the Worker is not ready to be deployed — .*no identifier yet/,
    );
    // A dry run uploads nothing: CI keeps bundling the Worker before the base exists.
    assert.equal(
      deployRefusal('preview', 'app', pages, {
        ...open,
        ask,
        workerProblems: unready,
        dryRun: true,
      }),
      null,
    );
    assert.equal(deployRefusal('preview', 'app', pages, { ...open, ask }), null);
  }
  // The bench never reaches the apex: no model runs there that nobody has chosen yet.
  assert.match(
    String(deployRefusal('apex', 'app', pages, { ...open, ask: 'bench' })),
    /bench runs on the preview host only/,
  );
  // A page that asks goes to the apex as files (lot C10): what keeps it from going there too
  // early is the launch — which, with the mode "chat", asks for every gate of the plan, the
  // rehearsal of the chat's own deployment among them — dry run or not…
  const waiting = ['data/2026/ask.json: the deployment of the chat has not been rehearsed'];
  for (const dryRun of [false, true]) {
    assert.match(
      String(
        deployRefusal('apex', 'app', pages, {
          ...open,
          ask: 'chat',
          dryRun,
          launchBlockers: waiting,
        }),
      ),
      /holding page until the launch is decided.*has not been rehearsed/,
    );
  }
  // …and once nothing stands in the way, what the Worker's files lack is not its business:
  // no script goes to the apex with the pages.
  assert.equal(
    deployRefusal('apex', 'app', pages, { ...open, ask: 'chat', workerProblems: unready }),
    null,
  );
  // An app that answers no question does not care what the Worker lacks…
  assert.equal(deployRefusal('preview', 'app', pages, { ...open, workerProblems: unready }), null);
  // …and neither does the holding page, ever: it is also the withdrawal gesture.
  assert.equal(
    deployRefusal('apex', 'holding', [...HOLDING_PAGES], {
      ...open,
      ask: 'chat',
      workerProblems: unready,
    }),
    null,
  );
});

void test('what the Worker lacks is read from the files: the base, and the state of the book', () => {
  const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as {
    meta: { corpus_version: string };
  };
  const preview = app.env?.['preview'];
  assert.ok(preview, 'wrangler.jsonc must declare env.preview');
  // The corpus version of both environments is the manifest's: a page and a Worker built from
  // two states of the book would never understand each other's identifiers.
  for (const env of [app, preview]) {
    assert.equal((env.vars ?? {})['CORPUS_VERSION'], manifest.meta.corpus_version);
  }
  const problems = workerProblems();
  assert.ok(!problems.some((p) => p.includes('CORPUS_VERSION')), problems.join('\n'));
  // The base: its identifier is the editor's to write, once created. Until then, a refusal.
  const unset = [app, preview].filter(
    (env) => (env.d1_databases ?? [])[0]?.database_id === UNSET_DATABASE_ID,
  ).length;
  assert.equal(problems.filter((p) => p.includes('no identifier yet')).length, unset);
});

/**
 * `routes` is an INHERITABLE key of a wrangler environment (Cloudflare docs, "Inheritable
 * keys"). An environment that forgot to define its own would inherit the apex and take it over
 * on its first deploy. This is the test that makes that mistake impossible to commit.
 */
void test('in both configurations the preview environment has its own host, never the apex', () => {
  for (const [file, config] of [
    [WORKER_CONFIG, app],
    [STATIC_CONFIG, holding],
  ] as const) {
    assert.deepEqual(hosts(config.routes), APEX, `${file}: top-level routes`);
    const preview = config.env?.['preview'];
    assert.ok(preview, `${file} must declare env.preview`);
    const previewHosts = hosts(preview.routes);
    assert.ok(previewHosts.length > 0, `${file}: env.preview must declare routes (inherited)`);
    for (const host of previewHosts) {
      assert.ok(!APEX.includes(host), `${file}: env.preview claims the apex host ${host}`);
      assert.match(host, /^[a-z0-9-]+\.cestecritla\.fr$/, `${file}: not a subdomain: ${host}`);
    }
  }
});

void test('the two configurations name the same Worker and the same hosts', () => {
  // One Worker serves the holding page today and the app on launch day. If these drift, the
  // "takeover" on launch day silently becomes a second Worker on a different hostname.
  assert.equal(holding.name, app.name);
  assert.deepEqual(hosts(holding.routes), hosts(app.routes));
  assert.deepEqual(hosts(holding.env?.['preview']?.routes), hosts(app.env?.['preview']?.routes));
  assert.equal(holding.assets?.directory, app.assets?.directory);
});

void test('the static configuration runs no code at all', () => {
  assert.equal(holding.main, undefined, 'a script makes the holding page depend on the app');
  assert.equal(holding.vars, undefined);
  for (const env of [holding, holding.env?.['preview']]) {
    assert.equal(env?.ai, undefined);
    assert.equal(env?.d1_databases, undefined);
    assert.equal(env?.durable_objects, undefined);
    assert.equal(env?.ratelimits, undefined);
    assert.equal(env?.analytics_engine_datasets, undefined);
  }
  assert.equal(holding.assets?.binding, undefined, 'an assets binding only exists for a script');
  assert.equal(holding.assets?.run_worker_first, undefined);
});

void test('the Worker binds what a question needs, and nothing that could keep a trace (D16.7)', () => {
  const preview = app.env?.['preview'];
  assert.ok(preview, 'wrangler.jsonc must declare env.preview');
  const environments: [string, Environment][] = [
    ['top level', app],
    ['env.preview', preview],
  ];
  for (const [name, env] of environments) {
    assert.equal(env.ai?.binding, 'AI', `${name}: the AI binding`);
    assert.equal((env.d1_databases ?? [])[0]?.binding, 'DB', `${name}: the private base`);
    assert.equal(
      (env.durable_objects?.bindings ?? [])[0]?.name,
      'BUDGET',
      `${name}: the allowance`,
    );
    assert.equal((env.ratelimits ?? [])[0]?.name, 'RATE', `${name}: the rate limiter`);
    // No measurement, no key-value store, no schedule, no log shipped anywhere.
    const absent: (keyof Environment)[] = [
      'analytics_engine_datasets',
      'kv_namespaces',
      'triggers',
      'tail_consumers',
      'logpush',
    ];
    for (const key of absent) assert.equal(env[key], undefined, `${name}: ${key}`);
  }
  // One copy of the text at Cloudflare, not two: both environments read the same base.
  assert.deepEqual(preview.d1_databases, app.d1_databases);
  // …but each counts its own questions: two limiters, two namespaces.
  assert.notEqual(
    (preview.ratelimits ?? [])[0]?.namespace_id,
    (app.ratelimits ?? [])[0]?.namespace_id,
  );
  assert.deepEqual(app.assets?.run_worker_first, ['/api/*']);
});

void test('neither configuration answers anywhere but the .fr, and neither keeps logs', () => {
  for (const config of [app, holding]) {
    assert.equal(config.workers_dev, false);
    assert.equal(config.preview_urls, false);
    assert.equal(config.observability?.enabled, false, 'D0.22: no invocation log');
    // Said again in every environment: the preview Worker is the one the bench asks.
    for (const [name, env] of Object.entries(config.env ?? {})) {
      assert.equal(env.observability?.enabled, false, `${name}: no invocation log`);
    }
  }
});

void test('the Worker carries its non-inherited settings into the preview environment', () => {
  // `vars` and bindings are NOT inherited: without its own copy the preview Worker would
  // compare a corpus version against undefined and accept tokens for no hostname at all.
  const preview = app.env?.['preview'];
  assert.ok(preview, 'wrangler.jsonc must declare env.preview');
  const top = app.vars ?? {};
  const own = preview.vars ?? {};
  assert.deepEqual(Object.keys(own).sort(), Object.keys(top).sort());
  assert.equal(own['ENVIRONMENT'], 'preview');
  assert.equal(top['ENVIRONMENT'], 'production');
  // No bot check in either environment (D16.23): no host list for a token nobody mints.
  for (const vars of [top, own]) assert.equal(vars['TURNSTILE_HOSTNAMES'], undefined);
});

void test('an app build is deployed nowhere before the citation policy is validated (D15.7)', () => {
  const pages = ['index.html', 's/p1c1-s01/index.html'];
  const pending: DeployContext = { ...VALIDATED, policyValidated: false };
  // Not even to the noindex preview host: noindex is not private.
  assert.match(
    String(deployRefusal('preview', 'app', pages, pending)),
    /citation policy has not been validated/,
  );
  // A dry run uploads nothing: CI keeps exercising the configuration.
  assert.equal(
    deployRefusal('preview', 'app', pages, { ...VALIDATED, policyValidated: false, dryRun: true }),
    null,
  );
  // The holding page carries nothing of the programme: it never waits for the policy.
  assert.equal(deployRefusal('apex', 'holding', [...HOLDING_PAGES], pending), null);
  assert.equal(deployRefusal('preview', 'holding', [...HOLDING_PAGES], pending), null);
});

void test('the policy counts as validated only when it carries a date', () => {
  assert.equal(citationPolicyValidated('data/2026/does-not-exist.json'), false);
  const policy = JSON.parse(readFileSync('data/2026/exposure-policy.json', 'utf8')) as {
    validated_on: string | null;
  };
  assert.equal(citationPolicyValidated(), policy.validated_on !== null);
});

void test('the app redirects only the two old prefixes it has nothing to put behind', () => {
  const lines = appRedirects()
    .split('\n')
    .filter((l) => l !== '' && !l.startsWith('#'));
  assert.deepEqual(lines, ['/p/* / 302', '/res/* / 302']);
  // `/m/`, `/a/`, `/s/` and `/r/` are real pages in the app: a redirect rule would shadow them.
  for (const prefix of ['m', 'a', 's', 'r']) {
    assert.ok(!APP_REDIRECT_PREFIXES.includes(prefix), `/${prefix}/ must stay a real page`);
  }
});

void test('inside an electoral silence window only what closes is deployed (L49, D16.16)', () => {
  const pages = ['index.html', 's/p1c1-s01/index.html'];
  const inside: DeployContext = { ...VALIDATED, launchBlockers: [], insideSilenceWindow: true };
  // What opens is refused on both hosts: the preview is public too.
  for (const target of ['apex', 'preview'] as const) {
    assert.match(String(deployRefusal(target, 'app', pages, inside)), /electoral silence \(L49/);
    // The scrutin build shows neither a word nor a tile: deploying it closes, so it may go.
    assert.equal(deployRefusal(target, 'app', pages, { ...inside, scrutinBuild: true }), null);
    // The holding page is the withdrawal gesture: never blocked, least of all then.
    assert.equal(deployRefusal(target, 'holding', [...HOLDING_PAGES], inside), null);
    // A dry run uploads nothing, and CI runs on polling Sundays too.
    assert.equal(deployRefusal(target, 'app', pages, { ...inside, dryRun: true }), null);
  }
  // Outside a window the rule is silent.
  assert.equal(
    deployRefusal('preview', 'app', pages, { ...inside, insideSilenceWindow: false }),
    null,
  );
});

void test('the windows are those of the calendar, to the second', () => {
  // First round: Friday 16 April 2027 00:00 Paris (22:00 UTC the day before) to Sunday 20:00 Paris.
  assert.equal(insideSilenceWindow(new Date('2027-04-15T21:59:59Z')), false);
  assert.equal(insideSilenceWindow(new Date('2027-04-15T22:00:00Z')), true);
  assert.equal(insideSilenceWindow(new Date('2027-04-18T17:59:59Z')), true);
  assert.equal(insideSilenceWindow(new Date('2027-04-18T18:00:00Z')), false);
  // Second round.
  assert.equal(insideSilenceWindow(new Date('2027-05-01T12:00:00Z')), true);
  // Any ordinary day.
  assert.equal(insideSilenceWindow(new Date('2026-11-13T12:00:00Z')), false);
});

void test('the day before a window is already too late for anything that opens', () => {
  // The first round's window opens on Thursday 15 April 2027 at 22:00 UTC.
  assert.equal(nearSilenceWindow(new Date('2027-04-14T21:59:59Z')), false);
  assert.equal(nearSilenceWindow(new Date('2027-04-14T22:00:00Z')), true);
  assert.equal(nearSilenceWindow(new Date('2027-04-15T22:00:00Z')), true);
  assert.equal(nearSilenceWindow(new Date('2027-04-18T17:59:59Z')), true);
  assert.equal(nearSilenceWindow(new Date('2027-04-18T18:00:00Z')), false);
  // Between the rounds the site reopens, until the day before the second window.
  assert.equal(nearSilenceWindow(new Date('2027-04-25T12:00:00Z')), false);
  assert.equal(nearSilenceWindow(new Date('2027-04-28T21:59:59Z')), false);
  assert.equal(nearSilenceWindow(new Date('2027-04-28T22:00:00Z')), true);
  assert.equal(nearSilenceWindow(new Date('2026-11-13T12:00:00Z')), false);
  assert.equal(SILENCE_APPROACH_MS, 86_400_000);
  // …and it is this reading, not the window alone, that the deploy script hands to the rule.
  const deploy = readFileSync('scripts/deploy.ts', 'utf8');
  assert.match(deploy, /insideSilenceWindow: nearSilenceWindow\(new Date\(\)\)/);
});

void test('nothing reaches wrangler that could undo a choice of the guard', () => {
  assert.deepEqual(refusedArguments([]), []);
  assert.deepEqual(refusedArguments(['--bench', '--dry-run', '--outdir', 'build/worker']), []);
  assert.deepEqual(refusedArguments(['--dry-run', '--outdir=build/worker']), []);
  // The script's own: the Worker of the chat, and the day of the accord it is deployed under.
  assert.deepEqual(refusedArguments(['--chat', '--accord', '2026-11-14']), []);
  assert.deepEqual(refusedArguments(['--chat', '--accord=2026-11-14', '--dry-run']), []);
  for (const args of [
    ['--accord'],
    ['--accord', 'yes'],
    ['--accord=today'],
    ['--chat', '--accord', '--env='],
    ['--env', 'production'],
    ['--env='],
    ['--config', 'wrangler.jsonc'],
    ['--name', 'cestecritla'],
    ['--assets', 'dist-ask'],
    ['--route', 'cestecritla.fr'],
    ['--var', 'ENVIRONMENT:preview'],
    ['dist-ask'],
    ['--outdir'],
    ['--outdir', '--env='],
    ['--dry-run', '--minify=false'],
  ]) {
    assert.notDeepEqual(refusedArguments(args), [], args.join(' '));
  }
  assert.deepEqual(refusedArguments(['--dry-run', '--env', 'x']), ['--env', 'x']);
  // The script refuses before it reads anything else, and long before it starts wrangler.
  const deploy = readFileSync('scripts/deploy.ts', 'utf8');
  const refusedAt = deploy.indexOf('refusedArguments(given)');
  assert.ok(refusedAt > -1 && refusedAt < deploy.indexOf("existsSync('dist')"));
  assert.ok(refusedAt < deploy.indexOf('spawnSync('));
  // …and what is its own never reaches wrangler: neither path hands on the raw arguments.
  assert.match(deploy, /chatDeployArgs\(target, forWrangler\)/);
  assert.match(deploy, /const passthrough = forWrangler;/);
  assert.deepEqual(deploy.match(/'wrangler', \.\.\.\w+/g), [
    "'wrangler', ...withdrawArgs",
    "'wrangler', ...chatArgs",
    "'wrangler', ...args",
  ]);
});

void test('the preview host may ask before production does, never the other way (lot C11)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'host-'));
  const file = join(dir, 'ask.json');
  const says = (content: unknown): void => {
    writeFileSync(file, JSON.stringify(content));
  };
  says({ mode: 'off', preview_mode: 'chat' });
  assert.equal(readAskMode(file, 'preview'), 'chat');
  assert.equal(readAskMode(file, 'apex'), 'off');
  assert.equal(readAskMode(file), 'off', 'without a host, the mode is production’s');
  // When production asks, the preview asks too: it is where production is tried.
  says({ mode: 'chat', preview_mode: 'off' });
  assert.equal(readAskMode(file, 'preview'), 'chat');
  assert.equal(readAskMode(file, 'apex'), 'chat');
  for (const odd of [{ mode: 'off', preview_mode: 'on' }, { preview_mode: 'chat ' }, [], null]) {
    says(odd);
    assert.equal(readAskMode(file, 'preview'), 'off', JSON.stringify(odd));
  }
  // The build says which host it was made for; a marker that says nothing is production's.
  const marker = join(dir, 'last-build.json');
  assert.equal(readBuildHost(marker), 'apex');
  writeFileSync(marker, '{"mode":"app"}');
  assert.equal(readBuildHost(marker), 'apex');
  writeFileSync(marker, '{"mode":"app","host":"preview"}');
  assert.equal(readBuildHost(marker), 'preview');
  writeFileSync(marker, '{ not json');
  assert.equal(readBuildHost(marker), 'apex');
  // What a build in dist/ does with a question is the mode of the host it was made for.
  says({ mode: 'off', preview_mode: 'chat' });
  writeFileSync(marker, '{"mode":"app","host":"preview"}');
  assert.equal(builtAskMode(file, marker), 'chat');
  writeFileSync(marker, '{"mode":"app"}');
  assert.equal(builtAskMode(file, marker), 'off');

  // A build that asks, made for the preview host, never reaches the apex: the directory is
  // read, and production's mode says the site answers none.
  const pages = ['index.html', 's/p1c1-s01/index.html'];
  const open: DeployContext = { ...VALIDATED, launchBlockers: [] };
  const asks = distProblems({ gameFiles: [], asks: true }, { gameFile: null, ask: 'off' });
  assert.match(
    String(deployRefusal('apex', 'app', pages, { ...open, ask: 'off', distProblems: asks })),
    /dist\/ sends questions, and data\/2026\/ask\.json says this host answers none/,
  );
  // On the preview host it goes out — once nothing stands before the first question.
  assert.equal(deployRefusal('preview', 'app', pages, { ...open, ask: 'chat' }), null);
  const before = ['data/2026/ask.json: the legal file of the chat is not done for real'];
  assert.match(
    String(
      deployRefusal('preview', 'app', pages, { ...open, ask: 'chat', previewBlockers: before }),
    ),
    /the preview host does not ask yet — .*legal file of the chat/,
  );
  assert.equal(
    deployRefusal('preview', 'app', pages, {
      ...open,
      ask: 'chat',
      previewBlockers: before,
      dryRun: true,
    }),
    null,
  );
  // The bench goes out whatever the preview host waits for: its pages do not ask.
  assert.equal(
    deployRefusal('preview', 'app', pages, { ...open, ask: 'bench', previewBlockers: before }),
    null,
  );
  // The script asks the mode of the host it deploys to, and the gates of that host.
  const deploy = readFileSync('scripts/deploy.ts', 'utf8');
  assert.match(deploy, /const hostAsk = readAskMode\(undefined, target\);/);
  assert.match(deploy, /given\.includes\('--bench'\) && hostAsk === 'off' \? 'bench' : hostAsk/);
  assert.equal((deploy.match(/previewBlockers: previewChatBlockers\(\)/g) ?? []).length, 2);
  // One rule, three readers: the pages are built for a host the build names — a variable set
  // by the build script on every run, so that none left in a shell can open anything…
  const pagesConfig = readFileSync('src/lib/ask-config.ts', 'utf8');
  assert.equal((pagesConfig.match(/modeFor\(file(?:Mode\(\))?, buildHost\(\)\)/g) ?? []).length, 2);
  assert.match(pagesConfig, /process\.env\['CEL_HOST'\] === 'preview' \? 'preview' : 'apex'/);
  assert.doesNotMatch(pagesConfig, /\['mode'\] === 'chat'|\.mode === 'chat'/);
  const build = readFileSync('scripts/build.ts', 'utf8');
  assert.match(build, /CEL_HOST: host === 'preview' \? 'preview' : ''/);
  assert.match(build, /--host and --ask-test do not mix/);
  // …and the Worker reads the same rule for the host it serves, by its own variable.
  const worker = readFileSync('src/worker/index.ts', 'utf8');
  assert.match(worker, /modeFor\(config, env\.ENVIRONMENT === 'preview' \? 'preview' : 'apex'\)/);
  assert.equal((worker.match(/chatConfigured\(env\)/g) ?? []).length, 2);
  assert.doesNotMatch(worker, /chatConfigured\(\)/);
  // The committed file opens nothing yet.
  assert.equal(readAskMode(undefined, 'preview'), 'off');
});

void test('the chat is a Worker of its own: two exact addresses a host, no file, its own name (lot C10)', () => {
  const preview = chat.env?.['preview'];
  assert.ok(preview, `${CHAT_CONFIG} must declare env.preview`);
  // Another Worker than the one that serves the pages: deploying it replaces nothing.
  assert.notEqual(chat.name, app.name);
  assert.equal(chat.name, 'cestecritla-chat');
  assert.equal(chat.main, app.main, 'the same script as the Worker of the preview host');
  assert.equal(chat.assets, undefined, 'no file goes with the chat');
  // Routes, never custom domains: the hosts stay with the Worker that serves the files, and a
  // route wins over a custom domain on the same host. Two exact paths, no wildcard: nothing
  // else under /api/ reaches this script.
  const paths = ['/api/chat', '/api/gists'];
  assert.deepEqual(
    hosts(chat.routes),
    APEX.flatMap((host) => paths.map((path) => `${host}${path}`)).sort(),
  );
  assert.deepEqual(
    hosts(preview.routes),
    paths.map((path) => `beta.cestecritla.fr${path}`),
  );
  for (const route of [...(chat.routes ?? []), ...(preview.routes ?? [])]) {
    assert.equal(route.custom_domain, undefined, route.pattern);
    assert.equal(route.zone_name, 'cestecritla.fr', route.pattern);
    assert.doesNotMatch(route.pattern, /\*/, route.pattern);
  }
  // `routes` is inherited: the preview environment names its own, and none is an apex address.
  for (const pattern of hosts(preview.routes)) {
    assert.ok(!APEX.some((host) => pattern.startsWith(`${host}/`)), pattern);
  }
  // The bench stays where its key is: this Worker is never given its address.
  for (const pattern of [...hosts(chat.routes), ...hosts(preview.routes)]) {
    assert.doesNotMatch(pattern, /bench/);
  }
  assert.equal(chat.workers_dev, false);
  assert.equal(chat.preview_urls, false);
});

void test('the Worker of the chat binds what the other binds, keeps no log, and counts for itself', () => {
  const preview = chat.env?.['preview'];
  assert.ok(preview);
  const environments: [string, Environment][] = [
    ['top level', chat],
    ['env.preview', preview],
  ];
  for (const [name, env] of environments) {
    assert.equal(env.ai?.binding, 'AI', `${name}: the AI binding`);
    assert.equal((env.d1_databases ?? [])[0]?.binding, 'DB', `${name}: the private base`);
    assert.equal(
      (env.durable_objects?.bindings ?? [])[0]?.name,
      'BUDGET',
      `${name}: the allowance`,
    );
    assert.equal((env.ratelimits ?? [])[0]?.name, 'RATE', `${name}: the rate limiter`);
    assert.equal(env.observability?.enabled, false, `${name}: no logs`);
    const absent: (keyof Environment)[] = [
      'analytics_engine_datasets',
      'kv_namespaces',
      'triggers',
      'tail_consumers',
      'logpush',
    ];
    for (const key of absent) assert.equal(env[key], undefined, `${name}: ${key}`);
  }
  // One copy of the text at Cloudflare: the same base as the other Worker, in both environments.
  assert.deepEqual(chat.d1_databases, app.d1_databases);
  assert.deepEqual(preview.d1_databases, app.d1_databases);
  // The same book, the same ceiling.
  assert.equal(chat.vars?.['CORPUS_VERSION'], app.vars?.['CORPUS_VERSION']);
  assert.equal(preview.vars?.['CORPUS_VERSION'], app.vars?.['CORPUS_VERSION']);
  assert.equal(chat.vars?.['ENVIRONMENT'], 'production');
  assert.equal(preview.vars?.['ENVIRONMENT'], 'preview');
  // Its own counter — the class is created with this Worker — and four limiters, four names.
  assert.deepEqual(chat.migrations, app.migrations);
  const namespaces = [chat, preview, app, app.env?.['preview']].map(
    (env) => (env?.ratelimits ?? [])[0]?.namespace_id,
  );
  assert.equal(new Set(namespaces).size, 4, namespaces.join(' '));
  // Both files that carry the script are read by the rule that waits for the base.
  assert.deepEqual(workerProblems(), []);
});

void test('the Worker of the chat is deployed by the script alone, with an accord given that day', () => {
  assert.deepEqual(chatDeployArgs('preview', ['--dry-run']), [
    'deploy',
    '--config',
    'wrangler.chat.jsonc',
    '--env=preview',
    '--dry-run',
  ]);
  assert.deepEqual(chatDeployArgs('apex'), ['deploy', '--config', 'wrangler.chat.jsonc', '--env=']);
  const ready: ChatDeployContext = {
    dryRun: false,
    accord: '2026-11-20',
    today: '2026-11-20',
    workerProblems: [],
    ask: 'chat',
    launchBlockers: [],
    previewBlockers: [],
  };
  for (const target of ['preview', 'apex'] as const) {
    assert.equal(chatDeployRefusal(target, ready), null, target);
    // Sending a Worker is the editor's decision at the time: no day, another day — nothing goes.
    for (const accord of [null, '2026-11-19', 'oui']) {
      assert.match(
        String(chatDeployRefusal(target, { ...ready, accord })),
        /needs the editor's accord, given today: add --accord 2026-11-20/,
      );
    }
    assert.match(
      String(chatDeployRefusal(target, { ...ready, workerProblems: ['no identifier yet'] })),
      /not ready to be deployed — no identifier yet/,
    );
    // A dry run sends nothing: CI bundles this Worker whatever is still missing.
    assert.equal(
      chatDeployRefusal(target, {
        ...ready,
        dryRun: true,
        accord: null,
        ask: 'off',
        workerProblems: ['no identifier yet'],
        launchBlockers: ['the launch has not been decided'],
      }),
      null,
    );
  }
  // The preview host is where it is rehearsed and where the chat answers first: the mode of
  // the site and the gates of the launch do not hold it back there…
  assert.equal(
    chatDeployRefusal('preview', { ...ready, ask: 'off', launchBlockers: ['not rehearsed'] }),
    null,
  );
  // …and they do in front of the apex: no Worker that reads questions before the chat opens,
  // and none while a gate of the launch stands — an accord does not stand in for them.
  assert.match(
    String(chatDeployRefusal('apex', { ...ready, ask: 'off' })),
    /says the site answers no question/,
  );
  assert.match(
    String(chatDeployRefusal('apex', { ...ready, launchBlockers: ['not rehearsed'] })),
    /does not go to the apex yet — not rehearsed/,
  );
  // Taking it away again is one command too, and names its Worker by the configuration alone:
  // what closes always may — with the accord of the day, like any deletion of a Worker.
  assert.deepEqual(chatWithdrawArgs('preview'), [
    'delete',
    '--config',
    'wrangler.chat.jsonc',
    '--env=preview',
  ]);
  assert.deepEqual(chatWithdrawArgs('apex'), [
    'delete',
    '--config',
    'wrangler.chat.jsonc',
    '--env=',
  ]);
  for (const target of ['preview', 'apex'] as const) {
    const named = chatWorkerName(target);
    assert.equal(named, CHAT_WORKERS[target], 'the committed file names the Worker of the chat');
    assert.equal(chatWithdrawRefusal('2026-11-20', '2026-11-20', target, named), null);
    for (const accord of [null, '2026-11-19']) {
      assert.match(
        String(chatWithdrawRefusal(accord, '2026-11-20', target, named)),
        /deleting the Worker of the chat needs the editor's accord, given today/,
      );
    }
    // Outside a terminal wrangler deletes without asking: a configuration that names another
    // Worker — the site's own, the preview's, none — deletes nothing, accord or not.
    for (const other of ['cestecritla', 'cestecritla-preview', `${CHAT_WORKERS[target]}-x`, null]) {
      assert.match(
        String(chatWithdrawRefusal('2026-11-20', '2026-11-20', target, other)),
        /nothing is deleted/,
        String(other),
      );
    }
  }
  assert.notEqual(CHAT_WORKERS.apex, app.name);
  assert.notEqual(CHAT_WORKERS.preview, `${String(app.name)}-preview`);
  assert.equal(chatWorkerName('preview', '/nonexistent'), null);
  assert.deepEqual(refusedArguments(['--chat', '--withdraw', '--accord', '2026-11-20']), []);
  // On the preview host this Worker carries that host's mode: deploying it is what opens the
  // two addresses there. Whatever stands before the first question holds it back — an accord
  // does not stand in for a gate, and a dry run still sends nothing.
  const before = ['data/2026/ask.json: no bench of the explanations is recorded'];
  assert.match(
    String(chatDeployRefusal('preview', { ...ready, previewBlockers: before })),
    /the preview host does not ask yet — .*no bench of the explanations/,
  );
  assert.equal(
    chatDeployRefusal('preview', { ...ready, previewBlockers: before, dryRun: true }),
    null,
  );
  // …and what holds the preview back is not the apex's business.
  assert.equal(chatDeployRefusal('apex', { ...ready, previewBlockers: before }), null);
  // The script looks at no build for it, and refuses to mix it with the bench.
  const deploy = readFileSync('scripts/deploy.ts', 'utf8');
  // `wrangler delete` is reached by one path, which never names a Worker by hand…
  assert.equal((deploy.match(/'delete'/g) ?? []).length, 0, 'the script spells no delete itself');
  assert.match(deploy, /chatWithdrawRefusal\(accord, today, target, named\)/);
  assert.match(deploy, /--withdraw takes --accord <day> and nothing else/);
  // …and it means nothing without `--chat`: the site is withdrawn with the holding build.
  assert.match(deploy, /given\.includes\('--withdraw'\) && !given\.includes\('--chat'\)/);
  const chatAt = deploy.indexOf("given.includes('--chat')");
  assert.ok(chatAt > -1 && chatAt < deploy.indexOf("existsSync('dist')"));
  assert.match(deploy, /--chat and --bench name two different Workers/);
});

void test('dist/ is read, whatever the marker says: no game without its list, no question without its mode', () => {
  const game = 'jeu-0123456789abcdef.json';
  const off = { gameFile: null, ask: 'off' } as const;
  const playing = { gameFile: game, ask: 'off' } as const;
  // Nothing shown is nothing to refuse — the scrutin build, or a build older than the list.
  assert.deepEqual(distProblems({ gameFiles: [], asks: false }, off), []);
  assert.deepEqual(distProblems({ gameFiles: [], asks: false }, playing), []);
  assert.deepEqual(distProblems({ gameFiles: [game], asks: false }, playing), []);
  // A test build copied over dist/, an `astro build` run by hand with the test variable.
  assert.match(distProblems({ gameFiles: [game], asks: false }, off).join(), /not validated/);
  // A build made before the list changed.
  assert.match(
    distProblems({ gameFiles: ['jeu-ffffffffffffffff.json'], asks: false }, playing).join(),
    /another list of words/,
  );
  assert.match(
    distProblems({ gameFiles: [game, 'jeu-ffffffffffffffff.json'], asks: false }, playing).join(),
    /another list of words/,
  );
  // A page that sends questions while the data says none is answered — the bench included:
  // there the Worker goes out, and the page still asks nothing.
  assert.match(distProblems({ gameFiles: [], asks: true }, off).join(), /sends questions/);
  assert.match(
    distProblems({ gameFiles: [], asks: true }, { gameFile: null, ask: 'bench' }).join(),
    /sends questions/,
  );
  assert.deepEqual(
    distProblems({ gameFiles: [], asks: true }, { gameFile: null, ask: 'chat' }),
    [],
  );

  // Any of them refuses the deployment, on both hosts; the holding page is never concerned.
  const pages = ['index.html', 's/p1c1-s01/index.html'];
  const wrong: DeployContext = {
    ...VALIDATED,
    launchBlockers: [],
    distProblems: distProblems({ gameFiles: [game], asks: true }, off),
  };
  for (const target of ['apex', 'preview'] as const) {
    const refusal = String(deployRefusal(target, 'app', pages, wrong));
    assert.match(refusal, /shows the game.*sends questions.*npm run build/);
    assert.equal(deployRefusal(target, 'holding', [...HOLDING_PAGES], wrong), null);
  }

  assert.deepEqual(readDist('build/does-not-exist'), { gameFiles: [], asks: false });
  // The test builds are exactly what this refuses: they show everything, validated or not.
  if (existsSync('dist-ask/index.html')) {
    const test = readDist('dist-ask');
    assert.equal(test.asks, true);
    assert.equal(test.gameFiles.length, 1);
    assert.notDeepEqual(distProblems(test, off), []);
  }
});

void test('a build is a scrutin build only when its marker says so', () => {
  assert.equal(readBuildScrutin('build/does-not-exist.json'), false);
});
