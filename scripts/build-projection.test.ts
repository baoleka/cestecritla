/**
 * Self-check for the runtime projection (scripts/build-projection.ts).
 *
 * This is the blocking build gate of H-COR-10, promoted to priority 1 on 10/9/2026 with the
 * deadline "before the ~970 cards are generated". What it protects, concretely: five
 * propositions whose canonical text is a sentence cut in half, each about to receive a public
 * URL and a share card, and two heading paragraphs carrying the legal scope of the measures
 * that follow -- without which a measure conditioned on a new Constituent Assembly is served,
 * shared and indexed with exactly the same status as an immediate repeal.
 *
 * Run: npx tsx --test scripts/build-projection.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Dataset } from './aec-types.js';
import {
  buildProjection,
  danglingTexts,
  servedTexts,
  unfusedSplits,
  type SlimCorpus,
  type SlimItem,
} from './build-projection.js';

const source = JSON.parse(readFileSync('data/aec-2025.json', 'utf8')) as Dataset;
const slim: SlimCorpus = buildProjection(source);

const itemById = (id: string): SlimItem | undefined =>
  slim.sections.flatMap((s) => s.items).find((i) => i.id === id);

const textById = (id: string): string => {
  const t = servedTexts(slim).find((x) => x.id === id);
  assert.ok(t !== undefined, `${id} is not served`);
  return t.text;
};

void test('the projection keeps the corpus invariants', () => {
  assert.equal(slim.sections.length, 89, '89 sections');
  assert.equal(slim.chapters.length, 18, '18 chapters');
  assert.equal(servedTexts(slim).length, 837, '837 propositions (87 key + 706 measures + 44 sub)');
  assert.equal(slim.meta.corpus_version, source.meta.corpus_version);
});

void test('every recorded measure_split is fused, and its fragment redirects', () => {
  assert.deepEqual(unfusedSplits(source, slim), []);
  assert.equal(Object.keys(slim.redirects).length, 5, '5 fragments redirect');
});

void test('c7-s08-m02 regains the State control over municipal police', () => {
  // The cut removed "hiérarchique du préfet": the measure read as if the mayor alone commanded.
  const text = textById('c7-s08-m02');
  assert.ok(text.includes('hiérarchique du préfet'), text.slice(-60));
  assert.ok(!text.endsWith('l’autorité'));
});

void test('c10-s03-k01, already cited by faq-29, closes its parenthesis', () => {
  const text = textById('c10-s03-k01');
  assert.ok(text.includes('1 216 euros pour une personne seule)'), text.slice(-60));
  const opens = (text.match(/\(/g) ?? []).length;
  assert.equal(opens, (text.match(/\)/g) ?? []).length, 'balanced parentheses');
});

void test('c13-s05-m05 regains "zéro artificialisation nette"', () => {
  assert.ok(textById('c13-s05-m05').includes('artificialisation nette'));
});

void test('fusion concatenates verbatim text and rewrites nothing (D1.8)', () => {
  const sourceItems = new Map(source.sections.flatMap((s) => s.items).map((i) => [i.id, i.text]));
  for (const [fragmentId, baseId] of Object.entries(slim.redirects)) {
    const base = sourceItems.get(baseId);
    const fragment = sourceItems.get(fragmentId);
    assert.ok(base !== undefined && fragment !== undefined);
    // U+202F -> U+00A0 (D3.6) is the only permitted transformation.
    const expected = `${base} ${fragment}`.replace(/\u202f/g, '\u00a0');
    assert.equal(textById(baseId), expected, `${baseId} is base + " " + continuation, verbatim`);
  }
});

void test('a fragment is never served on its own', () => {
  const served = new Set(servedTexts(slim).map((t) => t.id));
  for (const fragmentId of Object.keys(slim.redirects)) {
    assert.ok(!served.has(fragmentId), `${fragmentId} must not be served separately`);
  }
});

// The render test the plan makes mandatory: these two are the pair that proves the point.
void test('c1-s02-m02 and c1-s02-m03 are scoped to the Constituent Assembly', () => {
  for (const id of ['c1-s02-m02', 'c1-s02-m03']) {
    const item = itemById(id);
    assert.ok(item !== undefined, `${id} exists`);
    assert.equal(item.scopeId, 'c1-s02-p03', `${id} must carry the Constituante scope`);
  }
  const scope = itemById('c1-s02-p03');
  assert.ok(scope !== undefined, 'c1-s02-p03 exists');
  assert.ok(scope.text.includes('Assemblée constituante'), scope.text);
});

void test('c1-s02-m01 is scoped "par la loi", not to the Constituent Assembly', () => {
  const item = itemById('c1-s02-m01');
  assert.equal(item?.scopeId, 'c1-s02-p02');
  assert.ok(itemById('c1-s02-p02')?.text.startsWith('Par la loi'));
});

void test('heading paragraphs are marked and never scoped by themselves', () => {
  for (const id of ['c1-s02-p02', 'c1-s02-p03']) {
    const item = itemById(id);
    assert.ok(item !== undefined, `${id} exists`);
    assert.equal(item.isScopeHeading, true, `${id} is a scope heading`);
    assert.equal(item.scopeId, undefined, `${id} is not scoped by itself`);
  }
});

void test('a scope never leaks past its section', () => {
  for (const s of slim.sections) {
    const headings = new Set(s.items.filter((i) => i.isScopeHeading === true).map((i) => i.id));
    for (const i of s.items) {
      if (i.scopeId === undefined) continue;
      assert.ok(headings.has(i.scopeId), `${i.id} scoped by ${i.scopeId}, outside its section`);
    }
  }
});

void test('statistics and closing prose are marked, so neither is rendered as a chapeau', () => {
  for (const id of [
    'c1-s01-p02',
    'c1-s03-p03',
    'c1-s04-p02',
    'c1-s04-p03',
    'c1-s05-p02',
    'c10-s01-p02',
  ]) {
    assert.equal(itemById(id)?.isStatistic, true, `${id} is a statistic`);
  }
  for (const id of ['c17-s02-p02', 'c17-s02-p03']) {
    assert.equal(itemById(id)?.isClosingProse, true, `${id} is closing prose`);
  }
});

void test('no served verbatim ends on a dangling function word or an open parenthesis', () => {
  assert.deepEqual(danglingTexts(slim), []);
});

void test('the projection is deterministic', () => {
  assert.equal(JSON.stringify(buildProjection(source)), JSON.stringify(slim));
});

void test('U+202F never survives into the projection (D3.6, absent from the subset fonts)', () => {
  for (const { id, text } of servedTexts(slim)) {
    assert.ok(!text.includes('\u202f'), `${id} still contains U+202F`);
  }
});
