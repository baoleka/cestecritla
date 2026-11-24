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
import {
  builtWords,
  explainedTerms,
  pageWords,
  pageWordsName,
  wordsNames,
  wordsPages,
  type PageLabels,
} from '../src/lib/words-data.js';
import { wordsFor } from '../src/lib/words-switch.js';
import { builtAskMode, readBuildHost } from './build-mode.js';

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
      // The three files of the sheet; the files of the pages are below.
      const words = readdirSync(join(root, 'data')).filter((name) =>
        /^mots-[0-9a-f]{16}(?:-sens|-exemples)?\.json$/.test(name),
      );
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

void test('the line under the search opens with « Mots du programme », never without it (review of 24/11/2026, S21)', () => {
  const on = { pages: 'on', search: 'on', game: 'on' };
  // Its link is /mot/#mot-<id>, an anchor only the page of the words builds.
  for (const host of ['apex', 'preview'] as const) {
    const closed = wordsFor({ production: { ...on, pages: 'off' }, preview: {} }, host);
    assert.deepEqual([closed.pages, closed.search, closed.game], [false, false, true], host);
    const open = wordsFor({ production: on, preview: {} }, host);
    assert.deepEqual([open.pages, open.search, open.game], [true, true, true], host);
  }
  // The preview opens what production keeps closed, both together or not at all.
  const preview = wordsFor(
    { production: { pages: 'off', search: 'on' }, preview: { pages: 'on' } },
    'preview',
  );
  assert.deepEqual([preview.pages, preview.search], [true, true]);
});

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

/** The labels a page's file carries — the strings of the kit, as the pages print them. */
function labels(): PageLabels {
  const kit = JSON.parse(readFileSync('design/strings.json', 'utf8')) as Record<string, string>;
  const printed = (key: string): string => (kit[key] ?? '').replace(/'/g, '’');
  return {
    badge: printed('chat.terms.badge'),
    how: printed('chat.method_link'),
    example: printed('words.example'),
  };
}

/** The builds that explain words on their pages: the test builds; production, if its switch says so. */
const PAGE_BUILDS: readonly (readonly [string, () => boolean])[] = [
  [
    'dist',
    () =>
      builtAskMode() === 'chat' &&
      wordsFor(
        JSON.parse(readFileSync('data/2026/words.json', 'utf8')) as unknown,
        readBuildHost() === 'preview' ? 'preview' : 'apex',
      ).pages,
  ],
  ['dist-ask', () => true],
  ['dist-gists', () => true],
  ['dist-scrutin', () => false],
];

for (const [root, shows] of PAGE_BUILDS) {
  const there = existsSync(join(root, 'sommaire', 'index.html'));
  void test(
    `${root}: a page explains its words exactly where the build shows them, and its HTML names none`,
    {
      skip: !there && `no ${root}/ — build it first`,
    },
    () => {
      const files = readdirSync(join(root, 'data')).filter((name) =>
        /^mots-[0-9a-f]{16}-[scr]-/.test(name),
      );
      const pages = wordsPages();
      if (!shows()) {
        assert.deepEqual(files, [], `${root} ships the words of its pages, and shows none`);
        const section = readFileSync(join(root, 's', 'p1c1-s01', 'index.html'), 'utf8');
        assert.doesNotMatch(section, /data-words|class="words"/);
        return;
      }
      // Each file is named by what it holds (R73): what the page's file should hold, then its name.
      const entries = explainedTerms();
      const expected = (page: (typeof pages)[number]): unknown =>
        pageWords(page.ids, entries, labels());
      const nameOf = (page: (typeof pages)[number]): string =>
        pageWordsName(pageWords(page.ids, entries, labels()), page);
      assert.deepEqual(files.sort(), pages.map((page) => `${nameOf(page)}.json`).sort());
      for (const page of pages) {
        const name = nameOf(page);
        const file = JSON.parse(
          readFileSync(join(root, 'data', `${name}.json`), 'utf8'),
        ) as unknown;
        assert.deepEqual(file, expected(page), name);
        const where =
          page.kind === 's'
            ? join(root, 's', page.key, 'index.html')
            : page.kind === 'c'
              ? join(root, 'mot', page.key, 'index.html')
              : join(root, 'r', page.key, 'index.html');
        const html = readFileSync(where, 'utf8');
        assert.ok(html.includes(`data-words="/data/${name}.json"`), `${where}: no folded line`);
        // The HTML holds the line and its address: no word of the file, no text an AI wrote.
        const words = file as { terms: string[][] };
        for (const [, , plain] of words.terms) {
          assert.ok(
            !html.includes((plain ?? '').slice(0, 40)),
            `${where}: an explanation in the HTML`,
          );
        }
        assert.doesNotMatch(html, /Explications écrites et vérifiées par une IA/);
      }
    },
  );
}
