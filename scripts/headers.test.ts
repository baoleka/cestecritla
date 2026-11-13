/**
 * public/_headers: no header may leave with two values (D12.8, P8).
 *
 * Static Assets applies EVERY matching rule and joins a header set twice with a comma — it does
 * not let the more specific rule win. Found on 12/11/2026 by reading the asset worker
 * (`attachCustomHeaders`) and then measured under `wrangler dev`, before the file was ever
 * deployed: the fonts came out with two `max-age`, and the L49 kill switch `/flags.json` with
 * `max-age=300` next to its `no-cache`. The file had looked correct for two months, because it
 * reads the way CSS would cascade.
 *
 * The rule checked here is the documented remedy: a rule that sets a header already set by a
 * broader rule must detach it first (`! Header-Name`).
 *
 * Run: npx tsx --test scripts/headers.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

interface Rule {
  readonly path: string;
  readonly set: Map<string, string>;
  readonly unset: Set<string>;
}

function parseHeaders(text: string): Rule[] {
  const rules: Rule[] = [];
  let current: { path: string; set: Map<string, string>; unset: Set<string> } | undefined;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = { path: raw.trim(), set: new Map(), unset: new Set() };
      rules.push(current);
      continue;
    }
    assert.ok(current, `header line before any path: ${raw}`);
    const line = raw.trim();
    if (line.startsWith('! ')) {
      current.unset.add(line.slice(2).trim().toLowerCase());
      continue;
    }
    const colon = line.indexOf(':');
    assert.ok(colon > 0, `not a "Name: value" line: ${line}`);
    current.set.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
  }
  return rules;
}

/** `/fonts/*` is covered by `/*`; an absolute-URL rule is covered by nothing relative. */
function covers(broad: string, narrow: string): boolean {
  if (broad === narrow) return false;
  if (!broad.endsWith('*')) return false;
  if (broad.startsWith('https://') !== narrow.startsWith('https://')) return false;
  return narrow.startsWith(broad.slice(0, -1));
}

const rules = parseHeaders(readFileSync('public/_headers', 'utf8'));

void test('the catch-all rule comes first, so every detach has something to detach', () => {
  assert.equal(rules[0]?.path, '/*');
});

void test('a header set by a broader rule is detached before it is set again', () => {
  const offenders: string[] = [];
  for (const [index, rule] of rules.entries()) {
    for (const earlier of rules.slice(0, index)) {
      if (!covers(earlier.path, rule.path)) continue;
      for (const name of rule.set.keys()) {
        if (earlier.set.has(name) && !rule.unset.has(name)) {
          offenders.push(`${rule.path}: "${name}" is also set by ${earlier.path} — values join`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join('\n'));
});

void test('nothing is detached that no broader rule sets (a stale detach hides a typo)', () => {
  const offenders: string[] = [];
  for (const [index, rule] of rules.entries()) {
    const inherited = new Set(
      rules
        .slice(0, index)
        .filter((earlier) => covers(earlier.path, rule.path))
        .flatMap((earlier) => [...earlier.set.keys()]),
    );
    for (const name of rule.unset) {
      if (!inherited.has(name)) offenders.push(`${rule.path}: detaches "${name}", set by no one`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join('\n'));
});

void test('the kill switch is never cacheable, and says one thing (D12.8)', () => {
  const rule = rules.find((r) => r.path === '/flags.json');
  assert.equal(rule?.set.get('cache-control'), 'no-cache', 'it must revalidate every time');
  assert.ok(rule.unset.has('cache-control'), 'it still inherits max-age=300');
  // No rule for a file the site does not have: there is no service worker.
  assert.deepEqual(
    rules.filter((r) => /sw/.test(r.path)),
    [],
  );
  // One field. A public file that said "events: on" would say the site measures something.
  const flags = JSON.parse(readFileSync('public/flags.json', 'utf8')) as Record<string, unknown>;
  assert.deepEqual(Object.keys(flags), ['silence_override']);
  assert.ok(['auto', 'on', 'off'].includes(String(flags['silence_override'])));
});

void test('the preview host is never indexed, and the rule cannot reach the apex', () => {
  const preview = rules.filter((r) => r.path.startsWith('https://'));
  assert.deepEqual(
    preview.map((r) => r.path),
    ['https://beta.cestecritla.fr/*'],
  );
  assert.equal(preview[0]?.set.get('x-robots-tag'), 'noindex');
  // The apex must stay indexable once the app is live: no relative rule may carry noindex,
  // except the Worker's own /api/ prefix.
  const relativeNoindex = rules.filter(
    (r) => !r.path.startsWith('https://') && r.set.has('x-robots-tag') && r.path !== '/api/*',
  );
  assert.deepEqual(relativeNoindex, []);
});

void test('the file stays within the documented limits (100 rules, 2 000 characters a line)', () => {
  assert.ok(rules.length <= 100, `${String(rules.length)} rules`);
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    assert.ok(line.length <= 2000, `line too long: ${line.slice(0, 60)}…`);
  }
});
