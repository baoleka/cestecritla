/**
 * The deploy rule and the two wrangler configurations (D15.4, D15.5, D15.12).
 *
 * Read in wrangler 4.130.0's source before writing this: outside an interactive terminal,
 * `wrangler deploy` re-points a custom domain that belongs to another Worker WITHOUT asking.
 * So "which build goes where" cannot rest on someone reading a prompt — it is a gate, and the
 * rule is tested here without needing a dist/.
 *
 * Run: npx tsx --test scripts/build-mode.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  APP_REDIRECT_PREFIXES,
  HOLDING_PAGES,
  HOLDING_REDIRECT_PREFIXES,
  WORKER_CONFIG,
  WRANGLER_CONFIG,
  appRedirects,
  citationPolicyValidated,
  deployRefusal,
  holdingRedirects,
  insideSilenceWindow,
  readBuildScrutin,
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
};

interface Route {
  pattern: string;
  custom_domain?: boolean;
}
interface Environment {
  routes?: Route[];
  vars?: Record<string, string>;
  analytics_engine_datasets?: { binding: string; dataset: string }[];
}
interface WranglerConfig extends Environment {
  name?: string;
  main?: string;
  workers_dev?: boolean;
  preview_urls?: boolean;
  observability?: { enabled?: boolean };
  assets?: { directory?: string; binding?: string; run_worker_first?: unknown };
  env?: Record<string, Environment>;
}

const read = (file: string): WranglerConfig =>
  parseJsonc(readFileSync(file, 'utf8')) as WranglerConfig;
const hosts = (routes: Route[] | undefined): string[] =>
  (routes ?? []).map((r) => r.pattern).sort();

/** The Worker configuration: not deployed in v1 (D15.14), kept honest for its return. */
const app = read(WORKER_CONFIG);
/** The static configuration both builds are deployed with. */
const holding = read(WRANGLER_CONFIG.holding);
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
  // v1 has no beacon (D15.14): the app is static files too, and deploys without Analytics Engine.
  assert.deepEqual(wranglerDeployArgs('preview', 'app', ['--dry-run']), [
    'deploy',
    '--config',
    'wrangler.static.jsonc',
    '--env=preview',
    '--dry-run',
  ]);
  assert.equal(WRANGLER_CONFIG.app, WRANGLER_CONFIG.holding);
  assert.notEqual(WRANGLER_CONFIG.app, WORKER_CONFIG);
});

/**
 * `routes` is an INHERITABLE key of a wrangler environment (Cloudflare docs, "Inheritable
 * keys"). An environment that forgot to define its own would inherit the apex and take it over
 * on its first deploy. This is the test that makes that mistake impossible to commit.
 */
void test('in both configurations the preview environment has its own host, never the apex', () => {
  for (const [file, config] of [
    [WORKER_CONFIG, app],
    [WRANGLER_CONFIG.holding, holding],
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

void test('the holding configuration runs no code at all', () => {
  assert.equal(holding.main, undefined, 'a script makes the holding page depend on the app');
  assert.equal(holding.vars, undefined);
  assert.equal(holding.analytics_engine_datasets, undefined);
  assert.equal(holding.assets?.binding, undefined, 'an assets binding only exists for a script');
  assert.equal(holding.assets?.run_worker_first, undefined);
});

void test('neither configuration answers anywhere but the .fr, and neither keeps logs', () => {
  for (const config of [app, holding]) {
    assert.equal(config.workers_dev, false);
    assert.equal(config.preview_urls, false);
    assert.equal(config.observability?.enabled, false, 'D0.22: no invocation log');
  }
});

void test('the app carries its non-inherited settings into the preview environment', () => {
  // `vars` and bindings are NOT inherited: without its own copy the preview beacon would
  // compare a corpus version against undefined, and write to no dataset.
  const preview = app.env?.['preview'];
  assert.equal(preview?.vars?.['CORPUS_VERSION'], app.vars?.['CORPUS_VERSION']);
  const dataset = preview?.analytics_engine_datasets?.[0];
  assert.equal(dataset?.binding, app.analytics_engine_datasets?.[0]?.binding);
  // A test session must never land in the figures we publish.
  assert.notEqual(dataset?.dataset, app.analytics_engine_datasets?.[0]?.dataset);
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

void test('a build is a scrutin build only when its marker says so', () => {
  assert.equal(readBuildScrutin('build/does-not-exist.json'), false);
});
