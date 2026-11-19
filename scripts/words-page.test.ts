/**
 * The explained words as each build ships them (PLAN-MOTS, lot 3; D20.11, D20.12, D20.13):
 *
 *   - where the field asks, three files under /data/ — the finder, the meanings, the examples —
 *     with the fingerprint of data/2026/terms.json as it stands, and the addresses the sheet is
 *     given name exactly those three;
 *   - where it does not (mode "off", the « scrutin » build), none of them, and no address.
 *
 * Read on the builds: `npm run build`, `npm run build:ask`, `npm run build:gists`,
 * `npm run build:scrutin:test`. A build that is not there is skipped, and says so.
 *
 * Run: npx tsx --test scripts/words-page.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { builtWords, wordsNames } from '../src/lib/words-data.js';
import { builtAskMode } from './build-mode.js';

const built = builtWords();
const names = wordsNames(built.fingerprint);

/** The builds, and whether the field of each asks questions. */
const BUILDS: readonly (readonly [string, () => boolean])[] = [
  ['dist', () => builtAskMode() === 'chat'],
  ['dist-ask', () => true],
  ['dist-gists', () => true],
  ['dist-scrutin', () => false],
];

/** What the sheet of a build is told of the words: the three addresses. */
function sheetWords(root: string): unknown {
  const home = readFileSync(join(root, 'index.html'), 'utf8');
  const island = /<script type="application\/json" id="chat-config">([^<]*)<\/script>/.exec(home);
  if (island?.[1] === undefined) return null;
  return (JSON.parse(island[1]) as { words?: unknown }).words ?? null;
}

for (const [root, asks] of BUILDS) {
  const there = existsSync(join(root, 'sommaire', 'index.html'));
  void test(
    `${root}: the files of the explained words are there exactly where the field asks`,
    {
      skip: !there && `no ${root}/ — build it first`,
    },
    () => {
      const words = readdirSync(join(root, 'data')).filter((name) => name.startsWith('mots-'));
      if (!asks()) {
        assert.deepEqual(words, [], `${root} ships words, and its field asks nothing`);
        assert.equal(sheetWords(root), null);
        return;
      }
      assert.deepEqual(
        words.sort(),
        [names.finder, names.examples, names.meanings].map((name) => `${name}.json`).sort(),
      );
      const read = (name: string): unknown =>
        JSON.parse(readFileSync(join(root, 'data', `${name}.json`), 'utf8'));
      assert.deepEqual(read(names.finder), built.finder);
      assert.deepEqual(read(names.meanings), built.meanings);
      assert.deepEqual(read(names.examples), built.examples);
      assert.deepEqual(sheetWords(root), {
        finder: `/data/${names.finder}.json`,
        meanings: `/data/${names.meanings}.json`,
        examples: `/data/${names.examples}.json`,
      });
    },
  );
}

void test('the texts of « En clair » no longer carry the explained words', () => {
  const root = 'dist-gists';
  if (!existsSync(join(root, 'data'))) return;
  const clair = readdirSync(join(root, 'data')).find((name) => name.startsWith('clair-'));
  assert.ok(clair !== undefined);
  const file = JSON.parse(readFileSync(join(root, 'data', clair), 'utf8')) as Record<
    string,
    unknown
  >;
  assert.deepEqual(Object.keys(file).sort(), ['cards', 'objections', 'words']);
});
