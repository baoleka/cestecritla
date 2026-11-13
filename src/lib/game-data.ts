/**
 * The game, as the build publishes it (lots J3 and L2) — from PUBLIC files only: the word list,
 * the manifest, the search index and the map of the 2025 edition. Nothing here can read the
 * text of the programme: it is not in the repository.
 *
 * Two questions are answered here, and nowhere else:
 *
 *   - is there a game in this build? Only if the editor validated the list of words as it
 *     stands (D15.18, D16.15: a word shown alone is a new kind of extract), and the local check
 *     attested it against the text. Until then no page shows a word or a tile — exactly as no
 *     page shows « Demander » while data/2026/ask.json says "off". A test build may pretend
 *     (CEL_GAME_TEST=1): it goes to dist-ask/, which nothing ever deploys;
 *   - what does it hold? Every word proven (src/lib/game.ts) or the build stops: a pin whose
 *     text moved, a word whose stem reached a section no word is taken from, a title that gives the
 *     answer away. The places and the tiles are computed; no number is typed.
 */
import { existsSync, readFileSync } from 'node:fs';
import { canonicalHash, listFingerprint } from './fingerprint.js';
import { ROUND, type GameData, type GamePart } from './game-engine.js';
import {
  LOCAL_CHECKS,
  proveWords,
  type GameSources,
  type GameWordsFile,
  type ProvenWord,
} from './game.js';
import { WORD_LINKS_PATH, highlightedWords, wordFragment, wordsFingerprint } from './word-links.js';

export const GAME_WORDS_PATH = 'data/2026/game-words.json';

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

export const gameWords = (): GameWordsFile => read(GAME_WORDS_PATH) as GameWordsFile;

/** What the browsers said of the words' links, when they were asked (src/lib/word-links.ts). */
export const wordLinks = (): unknown =>
  existsSync(WORD_LINKS_PATH) ? read(WORD_LINKS_PATH) : null;

/** The manifest as the game reads it: what src/lib/game.ts proves on, and the official pages. */
type Manifest = Omit<GameSources['manifest'], 'sections'> & {
  sections: (GameSources['manifest']['sections'][number] & { url: string })[];
};

/** The public files of the game, the manifest read with its links to the official pages. */
export interface GamePublicSources extends Omit<GameSources, 'manifest'> {
  manifest: Manifest;
}

export function gameSources(): GamePublicSources {
  return {
    manifest: read('data/2026/manifest.json') as Manifest,
    index: (read('data/2026/search-index.json') as { index: GameSources['index'] }).index,
    idMap: read('data/2026/id-map-2025.json') as GameSources['idMap'],
  };
}

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Why the list may not be shown yet, in words — empty when the editor validated this very list
 * and the local check attested it on this state of the book.
 */
export function wordsNotReady(file: GameWordsFile, corpus: string): string[] {
  const out: string[] = [];
  const list = listFingerprint(file.words, file.meta.pool);
  if (file.words.length === 0) out.push('the list holds no word');
  else if (file.words.length < ROUND) out.push('the list holds fewer than a round of words');
  if (!isDate(file.meta.validated.on)) {
    out.push('the editor has not validated the list: meta.validated.on');
  } else if (file.meta.validated.list_sha256 !== list) {
    out.push('the list, or the pool of sections, changed after it was validated');
  }
  if (file.meta.attested.list_sha256 !== list || file.meta.attested.corpus_version !== corpus) {
    out.push('the local check has not attested this list on this corpus');
  } else if (LOCAL_CHECKS.some((check) => !(file.meta.attested.checks ?? []).includes(check))) {
    out.push('the list was attested before a check that exists today: attest it again');
  }
  return out;
}

export interface GameSite {
  /** A page of this build shows the game. */
  on: boolean;
  /**
   * The site shows the game outside electoral silence, so a phone may hold its memory: the
   * privacy page says so and offers « Tout effacer » — in the scrutin build too, where the game
   * itself is not shown (D16.16: the gesture that erases stays within reach during a freeze).
   */
  writes: boolean;
  /** …because a test build was asked to pretend, not because the list is validated. */
  test: boolean;
}

export function gameSite(): GameSite {
  const test = process.env['CEL_GAME_TEST'] === '1';
  const writes =
    test || wordsNotReady(gameWords(), gameSources().manifest.meta.corpus_version).length === 0;
  // The build deployed before each silence window holds neither a word nor a tile.
  const scrutin = process.env['CEL_SCRUTIN'] === '1';
  return { on: writes && !scrutin, writes, test };
}

/**
 * The tiles: every part, every chapter, every section, by its official title (D16.26). What a
 * player sees of the book in the game is its table of contents, whole: a section no word is
 * taken from (`wordlessSections`) is still a place the book has, and leaving its title out
 * would show a chapter with a hole in it.
 */
function tiles(sources: GameSources): GamePart[] {
  const { manifest } = sources;
  return manifest.parts
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((part) => ({
      number: part.order,
      title: part.title,
      chapters: manifest.chapters
        .filter((chapter) => chapter.partId === part.id)
        .map((chapter) => ({
          id: chapter.id,
          number: chapter.number,
          title: chapter.title,
          sections: manifest.sections
            .filter((section) => section.chapterId === chapter.id)
            .map((section) => ({ id: section.id, title: section.title })),
        })),
    }));
}

export interface BuiltGame {
  data: GameData;
  proven: ProvenWord[];
  /** In the name of the published file: a new list gets a new name, never stale bytes. */
  fingerprint: string;
}

/** The game of this state of the book, or an error that names every word that cannot be shown. */
export function buildGame(
  file: GameWordsFile = gameWords(),
  sources: GamePublicSources = gameSources(),
  links: unknown = wordLinks(),
): BuiltGame {
  const { proven, problems } = proveWords(file, sources);
  if (problems.length > 0) {
    throw new Error(`${GAME_WORDS_PATH}: the game cannot be built\n  ${problems.join('\n  ')}`);
  }
  const urls = new Map(sources.manifest.sections.map((s) => [s.id, s.url]));
  const locators = new Map(
    sources.manifest.sections.flatMap((s) =>
      s.items.map((item) => [item.id, item.locator] as const),
    ),
  );
  // The word itself is lit up only where three browsers were seen to light it up in its own
  // measure, on this list and this book; anywhere else the link keeps its locator alone.
  const lit = highlightedWords(links, {
    corpus: sources.manifest.meta.corpus_version,
    words: wordsFingerprint(file.words),
  }).ids;
  const data: GameData = {
    corpus: sources.manifest.meta.corpus_version,
    parts: tiles(sources),
    words: proven.map((word) => ({
      id: word.id,
      word: word.word,
      section: word.sectionId,
      url: urls.get(word.sectionId) ?? '',
      fragment: wordFragment(locators.get(word.pin.id) ?? '', word.word, lit.has(word.id)),
      places: word.sections,
      hint: word.hint,
    })),
  };
  return { data, proven, fingerprint: canonicalHash(data).slice(0, 16) };
}
