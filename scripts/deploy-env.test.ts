/**
 * What the deploy guard reads besides its gates (review 11): what wrangler reads by itself can
 * neither open the guard nor retarget a deploy (M15); a base without an identifier is none, and
 * two absent versions are no version (M17); a byte-order mark is no character of a file (M18);
 * the citation policy holds only as the editor validated it, on a day that has come (M19).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import {
  POLICY_AS_VALIDATED,
  citationPolicyValidated,
  envFileProblems,
  guardedEnv,
  policyFingerprint,
  workerProblems,
} from './build-mode.js';

const GUARD = resolve('scripts/deploy-guard.mjs');

const scratch = (): string => mkdtempSync(join(tmpdir(), 'cel-deploy-env-'));

void test('what retargets wrangler never reaches it, and no file of environment opens the guard', () => {
  const env = guardedEnv({
    WRANGLER_CI_OVERRIDE_NAME: 'cestecritla',
    WRANGLER_CI_MATCH_TAG: 'x',
    CLOUDFLARE_ENV: 'preview',
    PATH: process.env['PATH'] ?? '',
  });
  assert.equal(env['WRANGLER_CI_OVERRIDE_NAME'], undefined);
  assert.equal(env['WRANGLER_CI_MATCH_TAG'], undefined);
  assert.equal(env['CLOUDFLARE_ENV'], undefined);
  assert.equal(env['CEL_DEPLOY_FROM'], 'scripts/deploy.ts');

  const dir = scratch();
  try {
    assert.deepEqual(envFileProblems(dir), []);
    writeFileSync(join(dir, '.env'), 'FOO=1\n');
    assert.deepEqual(envFileProblems(dir), []);
    // Added so that `wrangler dev` runs, it opened every later bare `wrangler deploy`.
    writeFileSync(join(dir, '.env.local'), '# dev\nexport CEL_DEPLOY_FROM=nothing-is-sent\n');
    writeFileSync(join(dir, '.env.preview'), 'WRANGLER_CI_OVERRIDE_NAME=cestecritla\n');
    assert.equal(envFileProblems(dir).length, 2);

    // The guard itself, run where such a file is: refused, whoever says he started it.
    const guard = (said: string): number | null =>
      spawnSync(process.execPath, [GUARD], {
        cwd: dir,
        env: { ...process.env, CEL_DEPLOY_FROM: said },
        encoding: 'utf8',
      }).status;
    assert.equal(guard('scripts/deploy.ts'), 1);
    rmSync(join(dir, '.env.local'));
    assert.equal(guard('scripts/deploy.ts'), 0);
    assert.equal(guard(''), 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

void test('a base without an identifier is none, two absent versions are no version, and a byte-order mark is no character', () => {
  const dir = scratch();
  try {
    mkdirSync(join(dir, 'data/2026'), { recursive: true });
    for (const file of ['wrangler.jsonc', 'wrangler.chat.jsonc', 'data/2026/manifest.json']) {
      copyFileSync(file, join(dir, file));
    }
    assert.deepEqual(workerProblems(dir), []);
    const chat = readFileSync('wrangler.chat.jsonc', 'utf8');
    // An empty identifier made wrangler create a base of that name, outside « eu ».
    writeFileSync(
      join(dir, 'wrangler.chat.jsonc'),
      chat.replace(/"database_id":\s*"[^"]*"/, '"database_id": ""'),
    );
    assert.ok(workerProblems(dir).some((problem) => problem.includes('no identifier')));
    // Saved with a byte-order mark, the file reads as it is.
    writeFileSync(join(dir, 'wrangler.chat.jsonc'), String.fromCharCode(0xfeff) + chat);
    assert.deepEqual(workerProblems(dir), []);
    // A manifest without its version is said, not passed.
    writeFileSync(join(dir, 'data/2026/manifest.json'), '{"meta":{}}');
    assert.ok(workerProblems(dir).includes('data/2026/manifest.json carries no corpus version'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

void test('the citation policy holds as the editor validated it: its ceilings, on a day that has come', () => {
  assert.equal(citationPolicyValidated(), true);
  const policy = JSON.parse(readFileSync('data/2026/exposure-policy.json', 'utf8')) as Record<
    string,
    unknown
  >;
  assert.equal(policyFingerprint(policy), POLICY_AS_VALIDATED);
  const dir = scratch();
  try {
    const path = join(dir, 'exposure-policy.json');
    const now = new Date('2026-11-25T12:00:00.000Z');
    const at = (changes: Record<string, unknown>): boolean => {
      writeFileSync(path, JSON.stringify({ ...policy, ...changes }));
      return citationPolicyValidated(path, now);
    };
    assert.equal(at({}), true);
    // A ceiling moved under the same date: not what he validated.
    assert.equal(at({ max_share: 0.3 }), false);
    assert.equal(at({ locator_display: 'href' }), false);
    // A day that is none, or one to come.
    for (const day of ['2026-02-30', '0000-00-00', '2026-12-01', '12/11/2026']) {
      assert.equal(at({ validated_on: day }), false, day);
    }
    // Unreadable is not validated, and throws nothing.
    writeFileSync(path, '{"validated_on": "2026-11-12",}');
    assert.equal(citationPolicyValidated(path, now), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
