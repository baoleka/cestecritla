/**
 * A build never falls back to production's when it was asked for another one (review 12, T4,
 * T13; review 11, U11): scripts/build.ts, run in an empty scratch tree, stops on a flag that is
 * not its own, on a lone word, and on a flag npm took for itself — before it touches anything.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const ROOT = resolve('.');
const TSX = join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

void test('a build asked for something it does not know stops before it removes the last marker', () => {
  const cases: [readonly string[], NodeJS.ProcessEnv][] = [
    // npm 11 passes the value of `npm run build --host preview` alone.
    [['preview'], {}],
    [['--tokens=neutral'], {}],
    [['--holdng'], {}],
    [['--host'], {}],
    [['--ask-test=tests'], {}],
    [['--mascot', '2'], {}],
    // npm 10 kept the flags it took as its own configuration.
    [[], { npm_config_holding: 'true' }],
    [[], { npm_config_host: 'preview' }],
  ];
  for (const [args, env] of cases) {
    const tree = mkdtempSync(join(tmpdir(), 'cel-build-'));
    try {
      mkdirSync(join(tree, 'build'));
      writeFileSync(join(tree, 'build/last-build.json'), '{"mode":"app","complete":true}\n');
      const run = spawnSync(process.execPath, [TSX, join(ROOT, 'scripts/build.ts'), ...args], {
        cwd: tree,
        env: { ...process.env, ...env },
        encoding: 'utf8',
      });
      const label = `${args.join(' ')} ${JSON.stringify(env)}`;
      assert.notEqual(run.status, 0, label);
      assert.ok(existsSync(join(tree, 'build/last-build.json')), `${label}: the marker went`);
      assert.ok(!existsSync(join(tree, 'dist')), `${label}: dist/ was touched`);
    } finally {
      rmSync(tree, { recursive: true, force: true });
    }
  }
});
