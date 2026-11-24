/**
 * No tool this repository starts reports on us (scripts/quiet-env.ts; review 12, T3; review 13,
 * G12): Astro's usage report carries an identifier anyone can recompute from the public
 * repository, sent from the machine that builds; wrangler's go to Cloudflare on every command.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { guardedEnv } from './build-mode.js';
import { NO_TELEMETRY, quietEnv } from './quiet-env.js';

void test('the environment of a command we start has the usage reports off, whatever the shell held', () => {
  for (const env of [quietEnv({ PATH: '/bin' }), guardedEnv({ PATH: '/bin' })]) {
    assert.equal(env['ASTRO_TELEMETRY_DISABLED'], '1');
    assert.equal(env['WRANGLER_SEND_METRICS'], 'false');
    assert.equal(env['PATH'], '/bin');
  }
  const turnedOn = { ASTRO_TELEMETRY_DISABLED: '', WRANGLER_SEND_METRICS: 'true' };
  assert.deepEqual(
    { ...quietEnv(turnedOn) },
    { ...turnedOn, ...NO_TELEMETRY },
    'a variable left in a shell does not turn a report back on',
  );
});

void test('every script that starts astro or wrangler hands it that environment', () => {
  const starts = /'--no-install',\s*'(astro|wrangler)'/g;
  let seen = 0;
  for (const name of readdirSync('scripts').filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.test.ts'),
  )) {
    const source = readFileSync(`scripts/${name}`, 'utf8');
    for (const match of source.matchAll(starts)) {
      seen += 1;
      // The call that starts it, as far as its options: the environment is given there.
      const call = source.slice(match.index, match.index + 500);
      assert.match(
        call,
        /env:\s*(?:\{\s*\.\.\.quietEnv\(|quietEnv\(|guardedEnv\()/,
        `scripts/${name} starts ${String(match[1])} without the quiet environment`,
      );
    }
  }
  assert.ok(seen >= 4, `only ${String(seen)} start(s) found: the pattern no longer reads them`);
});

void test('the npm scripts that run astro or wrangler themselves turn the reports off', () => {
  const scripts = (
    JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    }
  ).scripts;
  let seen = 0;
  for (const [name, command] of Object.entries(scripts)) {
    for (const step of command.split(/&&|\|\|/)) {
      if (/(?:^|\s)astro\s/.test(step)) {
        seen += 1;
        assert.match(step, /ASTRO_TELEMETRY_DISABLED=1\s+astro\s/, `npm run ${name}: ${step}`);
      }
      if (/(?:^|\s)wrangler\s/.test(step)) {
        seen += 1;
        assert.match(step, /WRANGLER_SEND_METRICS=false\s+wrangler\s/, `npm run ${name}: ${step}`);
      }
    }
  }
  assert.ok(seen >= 4, `only ${String(seen)} command(s) found`);
});

void test('the CI turns both reports off for every job', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  const head = ci.slice(0, ci.indexOf('\njobs:'));
  assert.match(head, /^env:\n(?: {2}.*\n)*? {2}ASTRO_TELEMETRY_DISABLED: '1'$/m);
  assert.match(head, /^env:\n(?: {2}.*\n)*? {2}WRANGLER_SEND_METRICS: 'false'$/m);
  assert.doesNotMatch(ci, /WRANGLER_SEND_METRICS: '?true|ASTRO_TELEMETRY_DISABLED: '?0/);
});
