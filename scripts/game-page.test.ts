/**
 * The game, as BUILT (lots J3 and L2): what a build that shows it publishes, and that a build
 * that must not show it publishes nothing of it.
 *
 * A word of the game is the one extract of the site with no sentence around it (D16.15). So the
 * gate is the same as for every other extract: every word on a page is accounted for, it is
 * where it is declared to be and nowhere else, and the file the game downloads holds nothing of
 * the book but the validated words and the official titles.
 *
 * And her, the mascot (lot C of docs/discovery/PLAN-TORTUE.md; D17.9, D17.13): in the game
 * block, once, drawn from the very file the editor validated, and nowhere else on the site; her
 * block whole without script; the one field she adds listed on the privacy page; everything
 * within the ceilings of D17.13. (Until lot F this half was scripts/game2-page.test.ts, which
 * also held that a build of the first generation carried not a byte of the second; the first
 * generation is gone.)
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
import { KEPT_FIELDS2, STORAGE_KEY, TAB_FIELDS2 } from '../src/lib/game-state2.js';
import { mascotMarkup } from '../src/lib/mascot2.js';
import { STORAGE_MAP, STORAGE_STRINGS, TINT_LABEL } from '../src/lib/storage-map.js';
import { BUILD_MARKER, builtAskMode } from './build-mode.js';
import { MASCOT2_SVG_PATH } from './mascot2-kit.js';

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

/** Her drawing, and the script of the game, as a build names them. */
const HER = 'class="mascot"';
const GAME_SCRIPT = 'Game2.';
/** What a build without the game must not carry. */
const ANY_MASCOT = /class="mascot"/;
const ANY_GAME_SCRIPT = /^Game2\./;

const kit = JSON.parse(readFileSync('design/strings.json', 'utf8')) as Record<string, unknown>;
const said = (key: string): string => {
  const value = kit[key];
  if (typeof value !== 'string') throw new Error(`design/strings.json has no ${key}`);
  return value;
};
/** A sentence of the kit as a page prints it: typographic apostrophe, entities, one space. */
const printed = (text: string): string =>
  text.replace(/'/g, '’').replace(/&/g, '&amp;').replace(/\s+/g, ' ');
const flat = (html: string): string => html.replace(/&#39;/g, '’').replace(/\s+/g, ' ');
/** The keys of the kit that are said of her, the mascot of the second generation. */
const HERS =
  /^(?:turtle\.(?:goal|passage|tint|figure)\.|turtle\.(?:skip|keep\.tint|keep\.not_kept\.tint)$|turtle\.sheet\.(?:link|path|replay|on_phone_tint)$|privacy\.(?:game\.field|never\.05)\.tint$|accuracy\.unverified\.06$)/;
const hers = Object.keys(kit).filter((key) => HERS.test(key));

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
      assert.ok(!ANY_MASCOT.test(html), `${page}: the turtle`);
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
      !readdirSync('dist/_astro').some((name) => ANY_GAME_SCRIPT.test(name)),
      'the script of the game is shipped',
    );
  },
);

void test('the map of what is written is the game’s memory, field for field', () => {
  for (const key of STORAGE_STRINGS) {
    assert.equal(typeof kit[key], 'string', `design/strings.json has no ${key}`);
  }
  const fields = (storage: string): string[] =>
    STORAGE_MAP.find((entry) => entry.storage === storage)?.fields.map((f) => f.name) ?? [];
  assert.deepEqual(fields('sessionStorage'), [...TAB_FIELDS2]);
  assert.deepEqual(fields('localStorage'), [...KEPT_FIELDS2]);
  // Her colour is in both, said by its own sentence (D17.3) — the line the editor dated apart.
  for (const entry of STORAGE_MAP) {
    assert.deepEqual(
      entry.fields.filter((field) => field.name === 'tint').map((field) => field.label),
      [TINT_LABEL],
    );
  }
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
      assert.ok(!ANY_MASCOT.test(html), `${page}: the turtle`);
      assert.ok(
        !/id="(?:jeu|ask|answer|turnstile)"/.test(html),
        `${page}: the game or « Demander »`,
      );
      assert.ok(!html.includes('challenges.cloudflare.com'), `${page}: opens a third-party origin`);
    }
    assert.ok(
      !readdirSync('dist-scrutin/_astro').some((name) => ANY_GAME_SCRIPT.test(name)),
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
    // Until when: a place for the hour, and the sentence the script will finish (D16.41). The
    // sentence says « après »: on this build the game comes back with a redeploy.
    assert.ok(
      /id="scrutin-reopen"[^>]*data-reopen="Tout revient après \{reopenTime\}\."/.test(home),
      'the scrutin note has no place for the hour it reopens',
    );
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
          assert.equal(html.split(HER).length - 1, 1);
          assert.ok(html.indexOf('id="jeu"') > html.indexOf('id="search"'));
        } else {
          assert.deepEqual(marked(html), [], `${page}: a word of the game`);
          assert.ok(!ANY_MASCOT.test(html), `${page}: the turtle`);
        }
      }

      // The privacy page says what the game writes: every sentence of the map, the key by its
      // name, and the gesture that erases.
      const privacyHtml = readFileSync(join(root, 'confidentialite/index.html'), 'utf8');
      const privacy = flat(privacyHtml);
      for (const key of STORAGE_STRINGS) {
        assert.ok(privacy.includes(printed(said(key))), `confidentialite does not print ${key}`);
      }
      assert.ok(privacy.includes(STORAGE_KEY), 'confidentialite does not name the key');
      assert.match(privacy, /<button[^>]*id="erase-all"/);
      // Field by field, in the order of the map, in each storage: her colour too.
      const listed = [
        ...privacyHtml.matchAll(/<ul[^>]*data-storage="([^"]+)"[^>]*>([\s\S]*?)<\/ul>/g),
      ].map((match) => [
        match[1] ?? '',
        [...(match[2] ?? '').matchAll(/data-field="([^"]+)"/g)].map((field) => field[1] ?? ''),
      ]);
      assert.deepEqual(
        listed,
        STORAGE_MAP.map((entry) => [entry.storage, entry.fields.map((field) => field.name)]),
      );
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
      const asks = root === 'dist-ask' || builtAskMode() === 'chat';
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
    const scripts = readdirSync(join(root, '_astro')).filter((f) => f.startsWith(GAME_SCRIPT));
    assert.equal(scripts.length, 1, 'the script of the game is missing, or there are two');
    const js = gzipSync(readFileSync(join(root, '_astro', scripts[0] ?? '')), {
      level: 9,
    }).byteLength;
    assert.ok(js <= 10 * 1024, `the game’s script: ${String(js)} B gzip`);
    // The home page, her drawing and her two stylesheets in it: the ceiling of D17.13 (20 KB).
    const home = gzipSync(readFileSync(join(root, 'index.html')), { level: 9 }).byteLength;
    assert.ok(home <= 20 * 1024, `the home page: ${String(home)} B gzip`);
    console.log(
      `  ${root}: game data ${String(data)} B, script ${String(js)} B, home page ${String(home)} B (gzip)`,
    );
  });

  void test(
    `${root}: she is in the game block, once, as the editor validated her — and nowhere else`,
    { skip: !shows },
    () => {
      const home = readFileSync(join(root, 'index.html'), 'utf8');
      // The block says which mascot it holds: two generations were served side by side until
      // lot F, and the attribute stayed.
      assert.ok(home.includes('data-mascot="2"'), 'the game block does not say its generation');
      const drawings = [...home.matchAll(/<svg\b[^>]*\bclass="mascot"[\s\S]*?<\/svg>/g)].map(
        (match) => match[0],
      );
      assert.equal(drawings.length, 1, 'the page holds more than one drawing of her, or none');
      // The page is the file: every shape, in order, with its class and its geometry. (Compared
      // tag by tag: the build folds the white space between them, and nothing else.)
      const tags = (svg: string): string[] =>
        [...svg.matchAll(/<[^>]+>/g)].map((match) => match[0].replace(/\s+/g, ' '));
      const validated = mascotMarkup(readFileSync(MASCOT2_SVG_PATH, 'utf8').trim(), { state: 0 });
      assert.deepEqual(tags(drawings[0] ?? ''), tags(validated));
      // She arrives as the turtle, at rest, with no colour: what the game remembers is given to
      // her by the script, never by the page.
      assert.match(
        drawings[0] ?? '',
        /data-state="0" data-pose="rest" data-tint="0" data-sign="0"/,
      );
      assert.ok(!/data-(?:live|phase|passage)/.test(drawings[0] ?? ''), 'she arrives moving');
      // In the block, after its title and before the round; the block after the field.
      const at = (mark: string): number => home.indexOf(mark);
      assert.ok(at('id="search"') < at('id="jeu"'));
      assert.ok(at('id="game-title"') < at(HER));
      assert.ok(at(HER) < at('id="game-static"'));
      // The game block, and nowhere else (D17.9): not a section page, not a legal page, not the
      // page of an answer, not the 404.
      for (const page of pages(root).filter((path) => path !== 'index.html')) {
        const html = readFileSync(join(root, page), 'utf8');
        assert.ok(!/class="mascot"|data-mascot=/.test(html), `${page}: she is on this page`);
      }
    },
  );

  void test(
    `${root}: her block is whole without script, and offers nothing a script must answer`,
    { skip: !shows },
    () => {
      const home = readFileSync(join(root, 'index.html'), 'utf8');
      // What only a script can answer is not offered without one: the row under the stage is
      // hidden in the page as it arrives, and her sheet is a dialog nobody has opened.
      assert.match(home, /<p[^>]*\bid="game-her-with"[^>]*\bhidden\b/);
      assert.match(home, /<button[^>]*\bid="game-skip"[^>]*\bdata-wait\b/);
      assert.match(home, /<button[^>]*\bid="game-tint-link"[^>]*\bhidden\b/);
      assert.ok(!/<dialog[^>]*\bid="turtle-sheet"[^>]*\bopen\b/.test(home));
      // No sentence about her is said by the page as it arrives: without script she does not
      // change, and the page must not say that she will. One only keeps its room — what is said
      // of her before a first word is found —, held back until a script can say it
      // (`data-wait`; src/styles/game2.css shows it at once where a script can run).
      const start = printed(said('turtle.goal.start'));
      const HELD = /<p class="g-goal" data-wait[^>]*>([^<]*)<\/p>/g;
      const held = [...home.matchAll(HELD)].map((match) => flat(match[1] ?? '').trim());
      assert.deepEqual(held, [start, start, start]);
      const text = flat(home.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(HELD, ' '));
      for (const key of hers.filter((k) => /^turtle\.(?:goal|passage|figure)\./.test(k))) {
        assert.ok(!text.includes(printed(said(key))), `the page says ${key} before any script`);
      }
      // The rule that holds it back, and the one that shows it where a script can run.
      assert.ok(home.includes('.game [data-wait]{visibility:hidden}'), 'nothing holds it back');
      assert.ok(
        home.includes(
          '@media(scripting:enabled){.g-static .g-goal[data-wait]{visibility:visible}}',
        ),
        'the room of her first sentence is never filled before the script',
      );
      // Her sheet carries the label itself.
      const sheet = /<dialog[^>]*id="turtle-sheet"[\s\S]*?<\/dialog>/.exec(home)?.[0] ?? '';
      assert.ok(sheet.includes('Site non officiel.'), 'her sheet has lost « Site non officiel. »');
      // No number is typed in what is said of her: her goal is in words (D17.5).
      assert.ok(hers.length > 0);
      for (const key of hers) assert.doesNotMatch(said(key), /\d/, `${key} holds a number`);
    },
  );
}
