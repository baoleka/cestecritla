/**
 * The game, as BUILT (lots J3 and L2): what a build that shows it publishes, and that a build
 * that must not show it publishes nothing of it.
 *
 * A word of the game is the one extract of the site with no sentence around it (D16.15). So the
 * gate is the same as for every other extract: every word on a page is accounted for, it is
 * where it is declared to be and nowhere else, and the file the game downloads holds nothing of
 * the book but the validated words and the official titles.
 *
 * Reads dist/ (the build that may be deployed) and dist-ask/ (the test build, where the game is
 * on whatever the validation — scripts/build.ts) when they are there.
 *
 * Run: npm run build && npm run build:ask && npx tsx --test scripts/game-page.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import {
  buildGame,
  gameSite,
  gameSources,
  gameWords,
  wordsNotReady,
} from '../src/lib/game-data.js';
import { wordFragment } from '../src/lib/word-links.js';
import { ROUND, type GameData } from '../src/lib/game-engine.js';
import { KEPT_FIELDS, STORAGE_KEY, TAB_FIELDS } from '../src/lib/game-state.js';
import { STORAGE_MAP, STORAGE_STRINGS } from '../src/lib/storage-map.js';
import { BUILD_MARKER } from './build-mode.js';

/** Every HTML page of a build, as paths relative to its root. */
function pages(root: string, dir = ''): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(root, path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}
const marked = (html: string): string[] =>
  [...html.matchAll(/<[a-z0-9]+\b[^>]*\bdata-programme="word"[^>]*>([^<]*)</g)].map((m) =>
    (m[1] ?? '').trim(),
  );
const gameFile = (root: string): string | undefined =>
  existsSync(join(root, 'data'))
    ? readdirSync(join(root, 'data')).find((name) => name.startsWith('jeu-'))
    : undefined;

const manifestWords = (
  JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as {
    meta: { exposure: { proposition_words: number } };
  }
).meta.exposure.proposition_words;

const appBuilt =
  existsSync(BUILD_MARKER) &&
  (JSON.parse(readFileSync(BUILD_MARKER, 'utf8')) as { mode?: string }).mode === 'app' &&
  existsSync('dist/index.html');
const site = gameSite();

void test('the game is shown only when the editor validated this very list', () => {
  const file = gameWords();
  const corpus = gameSources().manifest.meta.corpus_version;
  const missing = wordsNotReady(file, corpus);
  // The committed state and the rule agree: a list that is not validated shows nothing.
  assert.equal(site.on, missing.length === 0 || site.test);
  // Each reason is one the editor can act on.
  const validated = { on: '2026-12-01', list_sha256: file.meta.attested.list_sha256 };
  const ready = { ...file, meta: { ...file.meta, validated } };
  if (file.words.length >= ROUND && file.meta.attested.corpus_version === corpus) {
    assert.deepEqual(wordsNotReady(ready, corpus), []);
  }
  assert.match(wordsNotReady({ ...ready, words: [] }, corpus).join('\n'), /holds no word/);
  assert.match(
    wordsNotReady({ ...ready, words: ready.words.slice(0, 1) }, corpus).join('\n'),
    /fewer than a round/,
  );
  assert.match(
    wordsNotReady({ ...ready, words: ready.words.slice(1) }, corpus).join('\n'),
    /changed after it was validated[\s\S]*has not attested this list/,
  );
  assert.match(wordsNotReady(ready, 'another').join('\n'), /has not attested this list/);
  // An attestation older than one of today's checks does not count: the list was not held to it.
  assert.match(
    wordsNotReady(
      {
        ...ready,
        meta: { ...ready.meta, attested: { ...ready.meta.attested, checks: ['written'] } },
      },
      corpus,
    ).join('\n'),
    /attested before a check that exists today/,
  );
  assert.match(
    wordsNotReady(
      { ...file, meta: { ...file.meta, validated: { on: null, list_sha256: null } } },
      corpus,
    ).join('\n'),
    /has not validated the list/,
  );
});

void test(
  'a build that does not show the game publishes nothing of it',
  { skip: !appBuilt || site.on },
  () => {
    assert.equal(gameFile('dist'), undefined, 'the game’s data is in dist/data');
    for (const page of pages('dist')) {
      const html = readFileSync(join('dist', page), 'utf8');
      assert.deepEqual(marked(html), [], `${page}: a word of the game`);
      assert.ok(!html.includes('class="turtle"'), `${page}: the turtle`);
      assert.ok(!html.includes('id="jeu"'), `${page}: the game block`);
      // Not even its styles: a page that does not show the game does not import it.
      assert.ok(!/\.g-tile|\.t-shell/.test(html), `${page}: the game’s stylesheet`);
      // And no page claims a storage that this build never writes.
      assert.ok(!html.includes(STORAGE_KEY), `${page}: names the game’s storage key`);
      assert.ok(!html.includes('id="erase-all"'), `${page}: offers to erase what is never written`);
      assert.ok(
        !html.includes('id="mots-du-jeu"'),
        `${page}: counts the words of a game not shown`,
      );
    }
    assert.ok(
      !readdirSync('dist/_astro').some((name) => name.startsWith('Game.')),
      'the script of the game is shipped',
    );
  },
);

void test('the map of what is written is the game’s memory, field for field', () => {
  const kit = JSON.parse(readFileSync('design/strings.json', 'utf8')) as Record<string, unknown>;
  for (const key of STORAGE_STRINGS) {
    assert.equal(typeof kit[key], 'string', `design/strings.json has no ${key}`);
  }
  const fields = (storage: string): string[] =>
    STORAGE_MAP.find((entry) => entry.storage === storage)?.fields.map((f) => f.name) ?? [];
  assert.deepEqual(fields('sessionStorage'), [...TAB_FIELDS]);
  assert.deepEqual(fields('localStorage'), [...KEPT_FIELDS]);
  // One key, in both: a single purpose under an explicit name (CNIL, recommandation §6).
  assert.deepEqual([...new Set(STORAGE_MAP.map((entry) => entry.key))], [STORAGE_KEY]);
  assert.match(STORAGE_KEY, /^cestecritla\.jeu\.v\d+$/);
});

void test(
  'the scrutin build of a site that plays: neither question nor game, and the gesture that erases',
  { skip: !existsSync('dist-scrutin/index.html') },
  () => {
    // dist-scrutin/ is the scrutin build of the TEST site (npm run build:scrutin:test): the
    // list counts as validated there, so everything the game would show must be absent because
    // the build closes it — not because there was nothing to show.
    assert.equal(gameFile('dist-scrutin'), undefined, 'the game’s data is published');
    for (const page of pages('dist-scrutin')) {
      const html = readFileSync(join('dist-scrutin', page), 'utf8');
      assert.deepEqual(marked(html), [], `${page}: a word of the game`);
      assert.ok(!html.includes('class="turtle"'), `${page}: the turtle`);
      assert.ok(
        !/id="(?:jeu|ask|answer|turnstile)"/.test(html),
        `${page}: the game or « Demander »`,
      );
      assert.ok(!html.includes('challenges.cloudflare.com'), `${page}: opens a third-party origin`);
    }
    assert.ok(
      !readdirSync('dist-scrutin/_astro').some((name) => name.startsWith('Game.')),
      'the script of the game is shipped',
    );
    const home = readFileSync('dist-scrutin/index.html', 'utf8');
    // (Said with booleans: a failed match would print the whole page.)
    assert.ok(home.includes('id="scrutin-note"'), 'the scrutin note is missing');
    assert.ok(
      home.includes('Les questions, le jeu et le partage sont en pause.'),
      'the scrutin note does not say what is paused',
    );
    assert.match(home, /id="search"/);
    // What was written before the freeze can still be erased during it.
    const privacy = readFileSync('dist-scrutin/confidentialite/index.html', 'utf8');
    assert.match(privacy, /<button[^>]*id="erase-all"/);
    assert.ok(privacy.includes(STORAGE_KEY));
  },
);

for (const root of ['dist', 'dist-ask']) {
  const shows = root === 'dist' ? appBuilt && site.on : existsSync('dist-ask/index.html');
  void test(
    `${root}: every word shown is a proven word of the list, where it is declared`,
    { skip: !shows },
    () => {
      const { data, fingerprint } = buildGame();
      const name = gameFile(root);
      // The file is the list, proven, under the name of its own fingerprint: never stale bytes.
      assert.equal(name, `jeu-${fingerprint}.json`);
      const published = JSON.parse(readFileSync(join(root, 'data', name), 'utf8')) as GameData;
      assert.deepEqual(published, data);

      // On the pages: the first round on the home page, and not a word anywhere else.
      const first = data.words.slice(0, ROUND).map((w) => w.word);
      for (const page of pages(root)) {
        const html = readFileSync(join(root, page), 'utf8');
        if (page === 'index.html') {
          assert.deepEqual(marked(html), first);
          // She lives in the game block, once, and the block comes after the field.
          assert.equal((html.match(/class="turtle"/g) ?? []).length, 1);
          assert.ok(html.indexOf('id="jeu"') > html.indexOf('id="search"'));
        } else {
          assert.deepEqual(marked(html), [], `${page}: a word of the game`);
          assert.ok(!html.includes('class="turtle"'), `${page}: the turtle`);
        }
      }

      // The privacy page says what the game writes: every sentence of the map, the key by its
      // name, and the gesture that erases.
      const kit = JSON.parse(readFileSync('design/strings.json', 'utf8')) as Record<string, string>;
      const shown = (text: string): string =>
        text.replace(/'/g, '’').replace(/&/g, '&amp;').replace(/\s+/g, ' ');
      const privacy = readFileSync(join(root, 'confidentialite/index.html'), 'utf8')
        .replace(/&#39;/g, '’')
        .replace(/\s+/g, ' ');
      for (const key of STORAGE_STRINGS) {
        assert.ok(privacy.includes(shown(kit[key] ?? '')), `confidentialite does not print ${key}`);
      }
      assert.ok(privacy.includes(STORAGE_KEY), 'confidentialite does not name the key');
      assert.match(privacy, /<button[^>]*id="erase-all"/);
      // No page of a build that writes on the phone says « rien n’est enregistré » of anything
      // but the search: the sentence that carries the words must be about it.
      for (const page of pages(root)) {
        const html = readFileSync(join(root, page), 'utf8').replace(
          /<script[\s\S]*?<\/script>/g,
          ' ',
        );
        for (const match of html.matchAll(/[^.<>]*rien n(?:’|'|&#39;)est enregistré[^.<>]*/gi)) {
          assert.match(match[0], /recherche/i, `${page}: « ${match[0].trim()} »`);
        }
      }

      // /exactitude says what the game shows of the book, with numbers nobody typed.
      const accuracy = readFileSync(join(root, 'exactitude/index.html'), 'utf8').replace(
        /\s+/g,
        ' ',
      );
      const count = gameWords().words.length;
      const share = ((count / manifestWords) * 100).toFixed(3).replace('.', ',');
      assert.ok(
        accuracy.includes(`Le jeu montre ${String(count)} mots du programme`),
        'exactitude does not count the words of the game',
      );
      assert.ok(accuracy.includes(`${share} %`), `exactitude does not print ${share} %`);

      // Nothing of the book in the file but the words of the list and official titles: every
      // string is accounted for by a public file.
      const { manifest } = gameSources();
      const known = new Set<string>([
        manifest.meta.corpus_version,
        ...gameWords().words.flatMap((w) => [w.id, w.word]),
        ...manifest.parts.map((p) => p.title),
        ...manifest.chapters.flatMap((c) => [c.id, c.title]),
        ...manifest.sections.flatMap((s) => [
          s.id,
          s.title,
          s.url,
          ...s.items.flatMap((item) => (typeof item.locator === 'string' ? [item.locator] : [])),
        ]),
        '',
      ]);
      // A word lit up in its measure (lot J4): the locator of that measure, then the word —
      // two things a public file already holds, and nothing between them.
      const locatorOf = new Map(
        manifest.sections.flatMap((s) => s.items.map((item) => [item.id, item.locator] as const)),
      );
      for (const word of gameWords().words) {
        const locator = locatorOf.get(word.pin.id);
        if (typeof locator === 'string') known.add(wordFragment(locator, word.word, true));
      }
      const strings: string[] = [];
      const walk = (value: unknown): void => {
        if (typeof value === 'string') strings.push(value);
        else if (Array.isArray(value)) value.forEach(walk);
        else if (typeof value === 'object' && value !== null) Object.values(value).forEach(walk);
      };
      walk(published);
      const strangers = [...new Set(strings.filter((s) => !known.has(s)))];
      assert.deepEqual(strangers, [], 'strings no public file accounts for');
      // Every word leads somewhere a link can land.
      for (const word of published.words) {
        assert.match(word.url, /^https:\/\/melenchon2027\.fr\/programme\/livre\/[^#]+#.+/, word.id);
        assert.ok(word.places.includes(word.section), word.id);
        assert.equal(word.hint.length, 3, word.id);
      }
    },
  );

  void test(
    `${root}: the sentence of the freeze names what this site has, and nothing else`,
    { skip: !shows },
    () => {
      const home = readFileSync(join(root, 'index.html'), 'utf8');
      const note = /<p[^>]*id="game-silence"[^>]*>([^<]*)/.exec(home)?.[1]?.trim() ?? '';
      // The test build answers questions (simulated); the build of a site whose mode is "off"
      // answers none — and a pause of « les questions » there names something nobody ever saw.
      const asks =
        root === 'dist-ask' ||
        ['answer', 'select'].includes(
          String(
            (JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as { mode?: unknown }).mode,
          ),
        );
      assert.equal(/questions/i.test(note), asks, note);
      assert.match(note, /Le jeu et le partage sont en pause|le jeu et le partage sont en pause/);
    },
  );

  void test(`${root}: the game stays light`, { skip: !shows }, () => {
    const name = gameFile(root);
    assert.ok(name !== undefined);
    const data = gzipSync(readFileSync(join(root, 'data', name)), { level: 9 }).byteLength;
    // Measured 13/11/2026: 3.8 KB with nine words, most of it the titles of the tiles; 7 KB with
    // the whole list of 48 (D16.31).
    assert.ok(data <= 12 * 1024, `the game’s data: ${String(data)} B gzip`);
    const script = readdirSync(join(root, '_astro')).find((f) => f.startsWith('Game.'));
    assert.ok(script !== undefined, 'the script of the game is missing');
    const js = gzipSync(readFileSync(join(root, '_astro', script)), { level: 9 }).byteLength;
    assert.ok(js <= 10 * 1024, `the game’s script: ${String(js)} B gzip`);
    console.log(`  ${root}: game data ${String(data)} B, script ${String(js)} B (gzip)`);
  });
}
