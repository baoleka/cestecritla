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
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  APP_REDIRECT_PREFIXES,
  HOLDING_PAGES,
  HOLDING_REDIRECT_PREFIXES,
  SILENCE_APPROACH_MS,
  STATIC_CONFIG,
  UNSET_DATABASE_ID,
  WORKER_CONFIG,
  appRedirects,
  citationPolicyValidated,
  deployRefusal,
  distProblems,
  holdingRedirects,
  insideSilenceWindow,
  nearSilenceWindow,
  readAskMode,
  readBuildScrutin,
  readDist,
  refusedArguments,
  workerProblems,
  wranglerConfig,
  wranglerDeployArgs,
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
  distProblems: [],
};

interface Route {
  pattern: string;
  custom_domain?: boolean;
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
  for (const ask of ['answer', 'select', 'bench'] as const) {
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
});

void test('the mode read from the file is "off" unless it plainly says otherwise', () => {
  assert.equal(readAskMode('data/2026/does-not-exist.json'), 'off');
  const committed = JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as { mode: string };
  assert.equal(
    readAskMode(),
    committed.mode === 'answer' || committed.mode === 'select' ? committed.mode : 'off',
  );
});

void test('the Worker is deployed only when it is ready, and the bench only on the preview host', () => {
  const pages = ['index.html', 's/p1c1-s01/index.html'];
  const open: DeployContext = { ...VALIDATED, launchBlockers: [] };
  const unready = ['wrangler.jsonc (top level): the private base has no identifier yet (lot I3)'];
  for (const ask of ['answer', 'select', 'bench'] as const) {
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
  // An app that answers no question does not care what the Worker lacks…
  assert.equal(deployRefusal('preview', 'app', pages, { ...open, workerProblems: unready }), null);
  // …and neither does the holding page, ever: it is also the withdrawal gesture.
  assert.equal(
    deployRefusal('apex', 'holding', [...HOLDING_PAGES], {
      ...open,
      ask: 'answer',
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
  // A token is accepted only for the hosts of its own environment.
  assert.deepEqual((top['TURNSTILE_HOSTNAMES'] ?? '').split(',').sort(), APEX);
  assert.deepEqual((own['TURNSTILE_HOSTNAMES'] ?? '').split(','), hosts(preview.routes));
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
  for (const args of [
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
    distProblems({ gameFiles: [], asks: true }, { gameFile: null, ask: 'answer' }),
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
