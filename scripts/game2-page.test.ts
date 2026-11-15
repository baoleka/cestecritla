/**
 * The game block of the second generation of the mascot, as BUILT (lot C of
 * docs/discovery/PLAN-TORTUE.md; D17.9, D17.13, D17.14) — and, before anything else, that a
 * build of the first generation carries nothing of the second.
 *
 * Two generations of the mascot live side by side while the second is being made. What keeps
 * the turtle that is online exactly as the editor validated it is not a habit: a page of a
 * build of the first generation does not even import the second (`__CEL_MASCOT2__`, a constant
 * the bundler folds). This file reads what was built and checks it, byte for byte:
 *
 *   - dist-ask/, dist-gists/ and dist-scrutin/ (test builds, always of the first generation)
 *     and dist/ whenever data/mascot.json gives the host it was built for the first generation:
 *     not her name, not a class of her drawing, not an attribute her script writes, not a
 *     sentence that is hers, not her script;
 *   - dist-mascot2/ (`npm run build:mascot2`, never deployed): she is in the game block, once,
 *     drawn from the very file the editor validated, and nowhere else on the site; the turtle
 *     of the first generation is not there; the privacy page lists the one field she adds;
 *     and everything stays within the ceilings of D17.13.
 *
 * Run: npm run build && npm run build:ask && npm run build:mascot2 &&
 *      npx tsx --test scripts/game2-page.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { buildGame } from '../src/lib/game-data.js';
import { ROUND, type GameData } from '../src/lib/game-engine.js';
import { KEPT_FIELDS2, STORAGE_KEY, TAB_FIELDS2 } from '../src/lib/game-state2.js';
import { mascotMarkup } from '../src/lib/mascot2.js';
import { storageMap, storageStrings } from '../src/lib/storage-map2.js';
import { MASCOT2_MARKS, readBuildHost, readBuildMode, readDist, readMascot } from './build-mode.js';
import { MASCOT2_SVG_PATH } from './mascot2-kit.js';

const SECOND = 'dist-mascot2';

const walk = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
};
const isText = (file: string): boolean => /\.(?:html|js|mjs|css|json|txt|xml)$/.test(file);
const gzip = (bytes: Uint8Array | string): number => gzipSync(bytes, { level: 9 }).byteLength;

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

/** The keys of the kit that only the second generation says. */
const HERS =
  /^(?:turtle\.(?:goal|passage|tint|figure)\.|turtle\.(?:skip|keep\.tint)$|turtle\.sheet\.(?:link|path|replay|on_phone_tint)$|privacy\.game\.field\.tint$)/;
const hers = Object.keys(kit).filter((key) => HERS.test(key));

/**
 * What the second generation leaves in a build: her name (a class, a token, a file), the
 * attributes only her script writes, the classes of her drawing and of her place in the block.
 */
const TRACES: readonly RegExp[] = [
  /mascot/i,
  /data-(?:stage|phase|tint|sign|wait)\b/,
  /data-field="tint"/,
  /\bm-(?:bird|surge|dusk|quill|star|wing)\b/,
  /\bg-her(?!\w)|\bg-swap\b|\bg-line\b|\bg-goal\b|\bt-(?:path|tints?|swatch)\b/,
];

/**
 * Her sentences, as a page prints them — the ones that prove something by being somewhere: a
 * single common word (« Passer », « Vert ») is said elsewhere on the site, a sentence of three
 * words or more is not.
 */
const sentences = hers
  .filter((key) => said(key).split(/\s+/).length >= 3)
  .map((key) => ({ key, text: printed(said(key)) }));

/** The builds that must be of the first generation, as things stand. */
function firstGenerationBuilds(): string[] {
  const roots = ['dist-ask', 'dist-gists', 'dist-scrutin'].filter((root) =>
    existsSync(join(root, 'index.html')),
  );
  // dist/ is of the generation data/mascot.json gives the host it was built for — the first,
  // on both hosts, until the editor says otherwise (lots D and E).
  if (
    existsSync('dist/index.html') &&
    readBuildMode() === 'app' &&
    readMascot(undefined, readBuildHost()) === 1
  ) {
    roots.unshift('dist');
  }
  return roots;
}

void test('the kit knows which sentences are hers, and they can be told from any other', () => {
  // The list below is what the next test looks for in a build of the first generation: a key
  // added for her under another name would escape it, so every family is counted.
  const families = (prefix: string): number => hers.filter((key) => key.startsWith(prefix)).length;
  assert.equal(families('turtle.goal.'), 7);
  assert.equal(families('turtle.passage.'), 4);
  assert.equal(families('turtle.tint.'), 10);
  assert.equal(families('turtle.figure.'), 3);
  assert.equal(hers.length, 7 + 4 + 10 + 3 + 2 + 4 + 1);
  // The sentences looked for in a build of the first generation: enough of them, and none that
  // another key of the kit also says — it could not be told apart.
  assert.ok(sentences.length >= 15, `${String(sentences.length)} sentences of hers to look for`);
  const others = Object.entries(kit)
    .filter(([key, value]) => !HERS.test(key) && typeof value === 'string')
    .map(([, value]) => printed(value as string));
  for (const { key, text } of sentences) {
    assert.ok(!others.some((other) => other.includes(text)), `${key} is also said by another key`);
  }
});

void test('a build of the first generation carries nothing of the second: not a byte', () => {
  const roots = firstGenerationBuilds();
  if (roots.length === 0) {
    console.log('  (skipped: no build of the first generation — run `npm run build` first)');
    return;
  }
  for (const root of roots) {
    assert.equal(readDist(root).mascot, 1, `${root} is marked as a build of the second`);
    for (const file of walk(root)) {
      const name = relative(root, file);
      assert.doesNotMatch(name, /Game2|mascot/i, `${root}: ${name} is a file of hers`);
      if (!isText(file)) continue;
      const text = readFileSync(file, 'utf8');
      for (const trace of TRACES) {
        assert.ok(!trace.test(text), `${root}/${name} carries ${String(trace)}`);
      }
      const page = flat(text);
      for (const sentence of sentences) {
        assert.ok(!page.includes(sentence.text), `${root}/${name} says ${sentence.key}`);
      }
    }
    // …and the turtle that is online is there, with her own script.
    if (root === 'dist-scrutin') continue;
    const home = readFileSync(join(root, 'index.html'), 'utf8');
    if (!home.includes('id="jeu"')) continue;
    assert.equal((home.match(/class="turtle"/g) ?? []).length, 1, `${root}: the turtle`);
    assert.ok(
      readdirSync(join(root, '_astro')).some((file) => file.startsWith('Game.')),
      `${root}: the script of the game is missing`,
    );
  }
  console.log(`  read: ${roots.join(', ')}`);
});

const built = existsSync(join(SECOND, 'index.html'));
const skipped = { skip: !built };

void test('the test build of the second generation is told from its files', skipped, () => {
  assert.equal(readDist(SECOND).mascot, 2);
  const home = readFileSync(join(SECOND, 'index.html'), 'utf8');
  assert.ok(home.includes(MASCOT2_MARKS.home), 'the game block does not say its generation');
  const privacy = readFileSync(join(SECOND, 'confidentialite/index.html'), 'utf8');
  assert.ok(privacy.includes(MASCOT2_MARKS.privacy), 'the privacy page does not list her colour');
  // …and what the test above looks for in a build of the first generation is what a build of
  // hers really holds: a detector that finds nothing here would find nothing anywhere.
  const all = walk(SECOND)
    .filter(isText)
    .map((file) => readFileSync(file, 'utf8'));
  for (const trace of TRACES) {
    assert.ok(
      all.some((text) => trace.test(text)),
      `${String(trace)} is in no file of her build`,
    );
  }
  const pages = all.map(flat);
  for (const sentence of sentences) {
    assert.ok(
      pages.some((text) => text.includes(sentence.text)),
      `${sentence.key} is in no file of her build`,
    );
  }
  assert.ok(walk(SECOND).some((file) => /Game2/.test(file)));
});

void test(
  'she is in the game block, once, as the editor validated her — and nowhere else',
  skipped,
  () => {
    const home = readFileSync(join(SECOND, 'index.html'), 'utf8');
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
    assert.match(drawings[0] ?? '', /data-state="0" data-pose="rest" data-tint="0" data-sign="0"/);
    assert.ok(!/data-(?:live|phase|passage)/.test(drawings[0] ?? ''), 'she arrives already moving');
    // In the block, after its title and before the round; the block after the field.
    const at = (mark: string): number => home.indexOf(mark);
    assert.ok(at('id="search"') < at('id="jeu"'));
    assert.ok(at('id="game-title"') < at('class="mascot"'));
    assert.ok(at('class="mascot"') < at('id="game-static"'));
    // The turtle of the first generation is not in this build, and neither is her script.
    for (const file of walk(SECOND).filter((f) => f.endsWith('.html'))) {
      const html = readFileSync(file, 'utf8');
      const page = relative(SECOND, file);
      assert.ok(!html.includes('class="turtle"'), `${page}: the turtle of the first generation`);
      if (page !== 'index.html') {
        // The game block, and nowhere else (D17.9): not a section page, not a legal page, not
        // the page of an answer, not the 404.
        assert.ok(!/class="mascot"|data-mascot=/.test(html), `${page}: she is on this page`);
      }
    }
    const scripts = readdirSync(join(SECOND, '_astro'));
    assert.ok(!scripts.some((file) => file.startsWith('Game.')), 'the script of the first is here');
    assert.equal(scripts.filter((file) => file.startsWith('Game2.')).length, 1);
  },
);

void test(
  'her block is whole without script, and offers nothing a script must answer',
  skipped,
  () => {
    const { data, fingerprint } = buildGame();
    const home = readFileSync(join(SECOND, 'index.html'), 'utf8');
    // The same game: the same published file, the same first round in the HTML.
    const name = readdirSync(join(SECOND, 'data')).find((file) => file.startsWith('jeu-'));
    assert.equal(name, `jeu-${fingerprint}.json`);
    const published = JSON.parse(readFileSync(join(SECOND, 'data', name), 'utf8')) as GameData;
    assert.deepEqual(published, data);
    const marked = [
      ...home.matchAll(/<[a-z0-9]+\b[^>]*\bdata-programme="word"[^>]*>([^<]*)</g),
    ].map((match) => (match[1] ?? '').trim());
    assert.deepEqual(
      marked,
      data.words.slice(0, ROUND).map((word) => word.word),
    );
    // What only a script can answer is not offered without one: the row under the stage is
    // hidden in the page as it arrives, and her sheet is a dialog nobody has opened.
    assert.match(home, /<p[^>]*\bid="game-her-with"[^>]*\bhidden\b/);
    assert.match(home, /<button[^>]*\bid="game-skip"[^>]*\bdata-wait\b/);
    assert.match(home, /<button[^>]*\bid="game-tint-link"[^>]*\bhidden\b/);
    assert.ok(!/<dialog[^>]*\bid="turtle-sheet"[^>]*\bopen\b/.test(home));
    // No sentence about her is said by the page as it arrives: without script she does not
    // change, and the page must not say that she will. One only keeps its room — what is said
    // of her before a first word is found —, held back until a script can say it (`data-wait`;
    // src/styles/game2.css shows it at once where the browser says a script can run).
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
      home.includes('@media(scripting:enabled){.g-static .g-goal[data-wait]{visibility:visible}}'),
      'the room of her first sentence is never filled before the script',
    );
    // Her sheet carries the label itself, like the first one.
    const sheet = /<dialog[^>]*id="turtle-sheet"[\s\S]*?<\/dialog>/.exec(home)?.[0] ?? '';
    assert.ok(sheet.includes('Site non officiel.'), 'her sheet has lost « Site non officiel. »');
    // No number is typed in what is said of her: her goal is in words (D17.5).
    for (const key of hers) assert.doesNotMatch(said(key), /\d/, `${key} holds a number`);
  },
);

void test(
  'the privacy page lists what her build writes: the same key, one field more',
  skipped,
  () => {
    const fields = (storage: string): string[] =>
      storageMap(2)
        .find((entry) => entry.storage === storage)
        ?.fields.map((field) => field.name) ?? [];
    assert.deepEqual(fields('sessionStorage'), [...TAB_FIELDS2]);
    assert.deepEqual(fields('localStorage'), [...KEPT_FIELDS2]);
    const html = readFileSync(join(SECOND, 'confidentialite/index.html'), 'utf8');
    const privacy = flat(html);
    for (const key of storageStrings(2)) {
      assert.ok(privacy.includes(printed(said(key))), `confidentialite does not print ${key}`);
    }
    // Field by field, in the order of the map, in each storage.
    const listed = [...html.matchAll(/<ul[^>]*data-storage="([^"]+)"[^>]*>([\s\S]*?)<\/ul>/g)].map(
      (match) => [
        match[1] ?? '',
        [...(match[2] ?? '').matchAll(/data-field="([^"]+)"/g)].map((field) => field[1] ?? ''),
      ],
    );
    assert.deepEqual(
      listed,
      storageMap(2).map((entry) => [entry.storage, entry.fields.map((field) => field.name)]),
    );
    assert.ok(privacy.includes(STORAGE_KEY), 'confidentialite does not name the key');
    assert.match(html, /<button[^>]*id="erase-all"/);
  },
);

void test('her build stays within the ceilings of D17.13', skipped, () => {
  const scripts = readdirSync(join(SECOND, '_astro')).filter((file) => file.startsWith('Game2.'));
  const script = gzip(readFileSync(join(SECOND, '_astro', scripts[0] ?? '')));
  // The script of the game: the ceiling of the first generation, unchanged (10 KB).
  assert.ok(script <= 10 * 1024, `the game’s script: ${String(script)} B gzip`);
  // The home page, her drawing and her two stylesheets in it: a new ceiling (20 KB).
  const home = gzip(readFileSync(join(SECOND, 'index.html')));
  assert.ok(home <= 20 * 1024, `the home page: ${String(home)} B gzip`);
  const name = readdirSync(join(SECOND, 'data')).find((file) => file.startsWith('jeu-'));
  const data = gzip(readFileSync(join(SECOND, 'data', name ?? '')));
  assert.ok(data <= 12 * 1024, `the game’s data: ${String(data)} B gzip`);
  console.log(
    `  ${SECOND}: script ${String(script)} B, home page ${String(home)} B, data ${String(data)} B (gzip)`,
  );
});
