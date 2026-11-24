/**
 * scripts/deploy.ts, run for real in a scratch tree (reviews 9, 10, 11 and 12).
 *
 * The withdrawal goes out whatever state the app's files are in (D14.10; D5, A1, M5); nothing
 * goes out of a build that stopped half-way or holds a server file (D2, T1); a flag npm took
 * for itself stops the deploy (D1).
 *
 * wrangler is never reached: `npx` is a stand-in placed first on the PATH, which writes down
 * what it was asked and sends nothing — and every command carries `--dry-run` all the same, so
 * that even a PATH that missed the stand-in would upload nothing.
 */
import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';

const ROOT = resolve('.');
const TSX = join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const HOLDING_PAGES = ['index.html', '404.html', 'mentions-legales/index.html'];

interface Scratch {
  put: (path: string, text: string) => void;
  /** Runs scripts/deploy.ts there; `asked` is what the stand-in for npx was asked, or null. */
  deploy: (
    args: readonly string[],
    env?: NodeJS.ProcessEnv,
  ) => { run: SpawnSyncReturns<string>; asked: string | null };
}

function inScratch(body: (scratch: Scratch) => void): void {
  const tree = mkdtempSync(join(tmpdir(), 'cel-deploy-'));
  const log = join(tree, 'npx.log');
  const put = (path: string, text: string): void => {
    mkdirSync(dirname(join(tree, path)), { recursive: true });
    writeFileSync(join(tree, path), text);
  };
  put('bin/npx', `#!/bin/sh\necho "$@" >> "${log}"\nexit 0\n`);
  chmodSync(join(tree, 'bin/npx'), 0o755);
  try {
    body({
      put,
      deploy: (args, env = {}) => {
        const run = spawnSync(process.execPath, [TSX, join(ROOT, 'scripts/deploy.ts'), ...args], {
          cwd: tree,
          env: {
            ...process.env,
            ...env,
            PATH: `${join(tree, 'bin')}:${process.env['PATH'] ?? ''}`,
          },
          encoding: 'utf8',
        });
        return { run, asked: existsSync(log) ? readFileSync(log, 'utf8') : null };
      },
    });
  } finally {
    rmSync(tree, { recursive: true, force: true });
  }
}

const holdingBuild = (put: Scratch['put']): void => {
  for (const page of HOLDING_PAGES) put(`dist/${page}`, '<!doctype html><title>x</title>');
  put('build/last-build.json', '{"mode":"holding","complete":true}');
};

void test('a holding build is deployed even when every file of the app is broken', () => {
  inScratch(({ put, deploy }) => {
    holdingBuild(put);
    // The very edit that withdraws, left with a comma; a draft answer without its review; a
    // card file cut short; a word without its pin; a policy and a mode file that do not parse.
    put('data/launch.json', '{ "apex": "holding", }');
    put('data/2026/riposte.json', '{ "entries": [ { "id": "rip-99" } ] }');
    put('data/2026/glossary.json', '{');
    put('data/2026/game-words.json', '{ "words": [ { "pin": null } ] }');
    put('data/2026/exposure-policy.json', '{ "validated_on": ,');
    put('data/2026/ask.json', 'not json');
    const { run, asked } = deploy(['apex', '--dry-run']);
    assert.equal(run.status, 0, `deploy.ts refused the withdrawal:\n${run.stdout}\n${run.stderr}`);
    assert.match(
      asked ?? '',
      /^--no-install wrangler deploy --config wrangler\.static\.jsonc --env= --dry-run$/m,
    );
  });
});

void test('nothing goes out of a build that stopped half-way: no finished marker, or a server file left in dist/', () => {
  for (const marker of [null, '{"mode":"holding"}', '{"mode":"app"}', 'not json']) {
    inScratch(({ put, deploy }) => {
      for (const page of HOLDING_PAGES) put(`dist/${page}`, '<!doctype html><title>x</title>');
      if (marker !== null) put('build/last-build.json', marker);
      const { run, asked } = deploy(['apex', '--dry-run']);
      assert.equal(run.status, 1, String(marker));
      assert.match(run.stderr, /no finished build/);
      assert.equal(asked, null, 'wrangler was asked something');
    });
  }
  // Astro's server files carry the absolute path of the checkout (D0.15): never sent, the
  // withdrawal included, and whatever path they name.
  for (const [file, text] of [
    ['chunks/pages/index.astro.mjs', 'export const x = 1;'],
    ['manifest_abc.mjs', 'export const x = 1;'],
    ['robots.txt', `Sitemap: file://${process.cwd()}/dist/sitemap.xml`],
  ] as const) {
    inScratch(({ put, deploy }) => {
      holdingBuild(put);
      put(`dist/${file}`, text);
      const { run, asked } = deploy(['apex', '--dry-run']);
      assert.equal(run.status, 1, file);
      assert.match(run.stderr, /what no finished build ships/, file);
      assert.equal(asked, null, file);
    });
  }
});

void test('a flag npm took for itself stops the deploy: `npm run deploy --dry-run` sends nothing', () => {
  inScratch(({ put, deploy }) => {
    holdingBuild(put);
    const { run, asked } = deploy(['apex'], { npm_config_dry_run: 'true' });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /npm took --dry-run for itself/);
    assert.equal(asked, null);
  });
});
