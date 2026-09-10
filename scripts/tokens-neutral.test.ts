/**
 * The light rebrand must stay executable (D0.17, H-PLA-23, promoted by D14.12).
 *
 * `design/tokens.neutral.json` was described in the dossier since 7 September and did not exist:
 * the contingency was documented, not runnable. Since D14.12 removed the message 0 to LFI, it is
 * the ONLY prepared answer to a takedown request or a public disavowal (risk R3) — so it is a
 * launch prerequisite, and it is replayed on every pull request rather than trusted.
 *
 * A rebrand nobody tests is a rebrand that fails the day it is needed, which is a day nobody
 * gets to choose.
 *
 * Run: npx tsx --test scripts/tokens-neutral.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { contrast } from './contrast.js';

interface TokenLeaf {
  $value?: string;
}
interface Tokens {
  color: Record<string, TokenLeaf>;
  'color-role': Record<string, Record<string, string>>;
}

const load = (path: string): Tokens => JSON.parse(readFileSync(path, 'utf8')) as Tokens;
const main = load('design/tokens.json');
const neutral = load('design/tokens.neutral.json');

function resolve(tokens: Tokens, theme: string, role: string): string {
  const raw = tokens['color-role'][theme]?.[role];
  assert.ok(raw !== undefined, `color-role.${theme}.${role} is missing`);
  const ref = /^\{color\.([a-z0-9-]+)\}$/.exec(raw);
  if (ref === null) return raw.toUpperCase();
  const value = tokens.color[ref[1] ?? '']?.$value;
  assert.ok(value !== undefined, `color.${ref[1] ?? ''} is missing`);
  return value.toUpperCase();
}

/** The same fourteen pairs the interface really renders (scripts/contrast.ts). */
const ROLE_PAIRS = [
  ['text', 'bg', 'text'],
  ['text', 'bg-elevated', 'text'],
  ['text-muted', 'bg', 'text'],
  ['text', 'verbatim-bg', 'text'],
  ['brand', 'bg', 'text'],
  ['brand-on', 'brand', 'text'],
  ['action', 'bg', 'text'],
  ['action-on', 'action', 'text'],
  ['warn-text', 'warn-bg', 'text'],
  ['wordmark', 'bg', 'text'],
  ['wordmark-accent', 'bg', 'text'],
  ['verbatim-rule', 'verbatim-bg', 'non-text'],
  ['focus', 'bg', 'non-text'],
  ['focus', 'bg-elevated', 'non-text'],
] as const;

const MIN = { text: 4.5, 'non-text': 3 } as const;

void test('the neutral set declares exactly the same roles as the main one', () => {
  for (const theme of ['light', 'dark']) {
    const expected = Object.keys(main['color-role'][theme] ?? {}).filter((k) => !k.startsWith('$'));
    const actual = Object.keys(neutral['color-role'][theme] ?? {}).filter(
      (k) => !k.startsWith('$'),
    );
    assert.deepEqual(actual.sort(), expected.sort(), `${theme}: role sets differ`);
  }
});

void test('the neutral set passes the same 28-pair contrast gate', () => {
  const failures: string[] = [];
  for (const theme of ['light', 'dark']) {
    for (const [fg, bg, kind] of ROLE_PAIRS) {
      const ratio = contrast(resolve(neutral, theme, fg), resolve(neutral, theme, bg));
      if (ratio < MIN[kind]) {
        failures.push(`${theme} ${fg} on ${bg}: ${ratio.toFixed(2)} < ${String(MIN[kind])}`);
      }
    }
  }
  assert.deepEqual(failures, [], failures.join('\n'));
});

void test('no colour of the 2027 charte survives the rebrand', () => {
  // Violet, Rouge, Crème, Charbon, the three surfaces borrowed from LOGO-M27.svg, the six vives.
  const charte = Object.values(main.color)
    .map((c) => c.$value?.toUpperCase())
    .filter((v): v is string => v !== undefined);
  const used = Object.values(neutral.color)
    .map((c) => c.$value?.toUpperCase())
    .filter((v): v is string => v !== undefined);
  const survivors = used.filter((c) => charte.includes(c));
  assert.deepEqual(
    survivors,
    [],
    `charte colours still in the neutral set: ${survivors.join(', ')}`,
  );
});

void test('the neutral set uses no banned colour', () => {
  const banned = ['#0098B6', '#0E8A9C', '#C9462C', '#8B24D9', '#4C0297', '#D1271C'];
  const used = Object.values(neutral.color)
    .map((c) => c.$value?.toUpperCase())
    .filter((v): v is string => v !== undefined);
  const hits = used.filter((c) => banned.includes(c));
  assert.deepEqual(hits, [], `ban-list colours in the neutral set: ${hits.join(', ')}`);
});

void test('the neutral dark theme substitutes every role, like the main one', () => {
  for (const role of Object.keys(neutral['color-role'].light ?? {})) {
    const light = resolve(neutral, 'light', role);
    const dark = resolve(neutral, 'dark', role);
    assert.notEqual(dark, light, `${role} is identical in both themes: no substitution`);
  }
});
