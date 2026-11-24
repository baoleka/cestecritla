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
import { ROUND, type GameData, type GameEntry, type GamePart } from './game-engine.js';
import {
  LOCAL_CHECKS,
  proveWords,
  type GameSources,
  type GameWordsFile,
  type ProvenWord,
} from './game.js';
import { WORD_LINKS_PATH, highlightedWords, wordFragment, wordsFingerprint } from './word-links.js';
import { termsIn, withoutCards, type TermEntry, type TermWording } from './terms.js';
import { cardBlockers, explainedTerms, prose } from './words-data.js';

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

/**
 * What the cards of the game explain (PLAN-MOTS, lot 14; D20.4): the words of their sentences,
 * read with our cards — a word inside the name of a card is the card's, never explained here
 * (D20.14) — and the labels that travel with them in the file (D20.11).
 */
export interface GameExplaining {
  entries: readonly TermEntry[];
  blockers: readonly TermWording[];
  labels: { title: string; badge: string };
}

/**
 * The explaining of this state of the files. The build passes it where data/2026/words.json
 * opens the game for its host (src/lib/game-built.ts); the deploy guard, where it opens it for
 * the host it deploys to (scripts/deploy.ts): both compute the same file, and the same name.
 */
export function gameExplaining(): GameExplaining {
  // Read from the file rather than through src/lib/strings.ts: the gates read this module too,
  // outside the build. The two strings have no parameter: what the file holds is what is shown.
  const strings = read('design/strings.json') as Record<string, unknown>;
  const label = (key: string): string => {
    const value = strings[key];
    if (typeof value !== 'string') throw new Error(`design/strings.json: no string ${key}`);
    return prose(value);
  };
  return {
    entries: explainedTerms(),
    blockers: cardBlockers(),
    labels: { title: label('words.game.title'), badge: label('chat.terms.badge') },
  };
}

/** The explained words a sentence uses, as a dictionary orders them: identifiers. */
function wordsOfSentence(gist: string, explaining: GameExplaining): string[] {
  const { entries, blockers } = explaining;
  const all = [...blockers, ...entries];
  const known = new Map(entries.map((entry) => [entry.id, entry]));
  return withoutCards(termsIn([gist], all, all.length))
    .flatMap((found) => {
      const entry = known.get(found.id);
      return entry === undefined ? [] : [entry];
    })
    .sort(
      (a, b) =>
        a.term.localeCompare(b.term, 'fr', { sensitivity: 'base' }) || a.id.localeCompare(b.id),
    )
    .map((entry) => entry.id);
}

/**
 * The file with the words of its sentences explained (D20.4) — or as it was, where none is: a
 * build that explains nothing keeps, byte for byte, the file and the name it had before.
 */
function withExplained(data: GameData, explaining: GameExplaining | null): GameData {
  if (explaining === null) return data;
  const used = new Map<string, [string, string]>();
  const byId = new Map(explaining.entries.map((entry) => [entry.id, entry]));
  const words: GameEntry[] = data.words.map((word) => {
    if (word.gist === undefined) return word;
    const ids = wordsOfSentence(word.gist, explaining);
    for (const id of ids) {
      const entry = byId.get(id);
      if (entry !== undefined) used.set(id, [prose(entry.term), prose(entry.plain)]);
    }
    return ids.length === 0 ? word : { ...word, terms: ids };
  });
  if (used.size === 0) return data;
  return {
    ...data,
    words,
    explained: {
      written_by: 'ai',
      read_by_a_person: false,
      labels: explaining.labels,
      terms: Object.fromEntries([...used].sort(([a], [b]) => a.localeCompare(b))),
    },
  };
}

export interface BuiltGame {
  data: GameData;
  proven: ProvenWord[];
  /** In the name of the published file: a new list gets a new name, never stale bytes. */
  fingerprint: string;
}

/**
 * The game of this state of the book, or an error that names every word that cannot be shown.
 *
 * `gists`: the sentences THIS build may put on its cards, by measure (D19.2, D19.5:
 * src/lib/game-gists.ts) — none by default. Whoever builds a page passes them
 * (src/lib/game-built.ts); whoever looks at a build from outside it — scripts/deploy.ts, the
 * gates — passes the sentences of that build, so that the file name computed here is the one
 * it holds. `explaining`: likewise, the words of those sentences explained (D20.4) — none by
 * default.
 */
export function buildGame(
  file: GameWordsFile = gameWords(),
  sources: GamePublicSources = gameSources(),
  links: unknown = wordLinks(),
  gists: ReadonlyMap<string, string> | null = null,
  explaining: GameExplaining | null = null,
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
    words: proven.map((word) => {
      const gist = gists?.get(word.pin.id);
      return {
        id: word.id,
        word: word.word,
        section: word.sectionId,
        url: urls.get(word.sectionId) ?? '',
        fragment: wordFragment(locators.get(word.pin.id) ?? '', word.word, lit.has(word.id)),
        places: word.sections,
        hint: word.hint,
        // Added only where there is one: a build without sentences holds, byte for byte, the
        // file it held before they existed — same content, same fingerprint, same name. (A key
        // set to `undefined` would not do: the fingerprint writes it as null.)
        ...(gist === undefined ? {} : { gist }),
      };
    }),
  };
  // A file that holds sentences says who wrote them. Added only where there is one, like the
  // sentences themselves: a build without them keeps the file, and the name, it had before.
  if (data.words.some((word) => word.gist !== undefined)) {
    data.sentences = { written_by: 'ai', read_by_a_person: false };
  }
  const shown = withExplained(data, explaining);
  return { data: shown, proven, fingerprint: canonicalHash(shown).slice(0, 16) };
}
