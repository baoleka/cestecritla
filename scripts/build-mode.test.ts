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
  HOLDING_PAGES,
  HOLDING_REDIRECT_PREFIXES,
  WRANGLER_CONFIG,
  deployRefusal,
  holdingRedirects,
  wranglerDeployArgs,
} from './build-mode.js';
import { parseJsonc, stripJsoncComments } from './jsonc.js';

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

const app = read(WRANGLER_CONFIG.app);
const holding = read(WRANGLER_CONFIG.holding);
const APEX = ['cestecritla.fr', 'www.cestecritla.fr'];

void test('the JSONC reader keeps a URL inside a string and drops a comment after it', () => {
  const text = '{ "a": "https://x.fr/y", // gone\n "b": [1, 2,], /* gone */ }';
  assert.equal(stripJsoncComments('"https://x.fr" // c'), '"https://x.fr" ');
  assert.deepEqual(parseJsonc(text), { a: 'https://x.fr/y', b: [1, 2] });
});

void test('the apex refuses an app build until launch day', () => {
  const refusal = deployRefusal('apex', 'app', ['index.html', 's/c1-s02/index.html']);
  assert.match(String(refusal), /holding page until launch day/);
});

void test('the apex accepts a holding build made of exactly its two pages', () => {
  assert.equal(deployRefusal('apex', 'holding', [...HOLDING_PAGES]), null);
});

void test('a holding build that carries one page of the app is refused everywhere', () => {
  const leaked = [...HOLDING_PAGES, 'm/c12-s01-k01/index.html'];
  assert.match(String(deployRefusal('apex', 'holding', leaked)), /unexpected: m\/c12-s01-k01/);
  assert.match(String(deployRefusal('preview', 'holding', leaked)), /unexpected: m\/c12-s01-k01/);
});

void test('a holding build with a page missing is refused', () => {
  assert.match(String(deployRefusal('apex', 'holding', ['index.html'])), /missing: 404\.html/);
});

void test('the preview host takes either build', () => {
  assert.equal(deployRefusal('preview', 'app', ['index.html', 's/c1-s02/index.html']), null);
  assert.equal(deployRefusal('preview', 'holding', [...HOLDING_PAGES]), null);
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
    'wrangler.holding.jsonc',
    '--env=',
  ]);
  assert.deepEqual(wranglerDeployArgs('preview', 'app', ['--dry-run']), [
    'deploy',
    '--config',
    'wrangler.jsonc',
    '--env=preview',
    '--dry-run',
  ]);
});

/**
 * `routes` is an INHERITABLE key of a wrangler environment (Cloudflare docs, "Inheritable
 * keys"). An environment that forgot to define its own would inherit the apex and take it over
 * on its first deploy. This is the test that makes that mistake impossible to commit.
 */
void test('in both configurations the preview environment has its own host, never the apex', () => {
  for (const [file, config] of [
    [WRANGLER_CONFIG.app, app],
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
