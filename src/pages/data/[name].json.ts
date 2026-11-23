/**
 * The files the page downloads, generated at build time from PUBLIC data only:
 *
 *   /data/index-<fingerprint>.json  the serialised index (data/2026/search-index.json): stems;
 *   /data/meta-<fingerprint>.json   what a result shows: official titles, where each section
 *                                is, the label and the link locator of each proposition, and
 *                                the rationed incipit of the key measures. Plus our synonyms
 *                                (src/lib/search-data.ts).
 *   /data/jeu-<fingerprint>.json the game: its words, where each is written, and the titles
 *                                of the tiles — only in a build that shows the game. Where the
 *                                site asks questions, also OUR sentence for the measure of each
 *                                word (D19.2: src/lib/game-gists.ts) — ours, never the book's.
 *   /data/clair-<fingerprint>.json  « En clair »: our cards and our answers to objections, the
 *                                texts a person re-read — only in a build whose field asks
 *                                (src/lib/chat-data.ts). Fetched with the sheet, never with
 *                                the page.
 *   /data/mots-<fingerprint>.json, -sens.json, -exemples.json
 *                                the explained words: how they are found, what they mean,
 *                                their examples (src/lib/words-data.ts) — only in a build
 *                                whose field asks (D20.11). No name depends on a word (D20.13).
 *   /data/mots-<fingerprint>-<s|c|r>-<page>.json
 *                                the words of one page — a section, a card, an answer —, each
 *                                with what it means and its example, and the labels that go
 *                                with them: only in a build that explains words on its pages.
 *
 * Every name carries the fingerprint of what its file holds (one fingerprint for the three files
 * of the sheet's words, which go together), so the files can be cached for a year
 * (public/_headers): a file that changes gets a new name, never new bytes under an old one. The
 * index and the titles carried the version of the book until 23/11/2026, and the titles changed
 * under it (R73). scripts/check-build.test.ts holds the rule for every file of /data/.
 */
import type { APIRoute } from 'astro';
import { askSite } from '../../lib/ask-config.ts';
import { chatPlain } from '../../lib/chat-data.ts';
import { searchFiles } from '../../lib/search-data.ts';
import { wordsSite } from '../../lib/words-config.ts';
import { builtPageWords } from '../../lib/words-built.ts';
import { builtWords, wordsNames } from '../../lib/words-data.ts';
import { builtGame } from '../../lib/game-built.ts';
import { gameSite } from '../../lib/game-data.ts';

/** The index and the titles: in every build that searches. */
const search = searchFiles();
/** The game's data exists only in a build that shows the game (src/lib/game-data.ts). */
const game = gameSite().on ? builtGame() : null;
/** The texts of « En clair » exist only in a build whose field opens the sheet. */
const plain = askSite().mode === 'chat' ? chatPlain() : null;
/** So do the explained words: they follow the mode of the site (D20.11). */
const words = askSite().mode === 'chat' ? builtWords() : null;
const wordFiles = words === null ? null : wordsNames(words.fingerprint);
/** The file of each page that explains words, where the build shows them on its pages. */
const pageFiles = words !== null && wordsSite().pages ? [...builtPageWords().values()] : [];

export function getStaticPaths() {
  return [
    { params: { name: search.index.name } },
    { params: { name: search.meta.name } },
    ...(game === null ? [] : [{ params: { name: `jeu-${game.fingerprint}` } }]),
    ...(plain === null ? [] : [{ params: { name: `clair-${plain.fingerprint}` } }]),
    ...(wordFiles === null
      ? []
      : [wordFiles.finder, wordFiles.meanings, wordFiles.examples].map((name) => ({
          params: { name },
        }))),
    ...pageFiles.map(({ name }) => ({ params: { name } })),
  ];
}

function body(name: string | undefined): string {
  if (name === search.index.name) return JSON.stringify(search.index.data);
  if (name === search.meta.name) return JSON.stringify(search.meta.data);
  if (game !== null && name === `jeu-${game.fingerprint}`) return JSON.stringify(game.data);
  if (plain !== null && name === `clair-${plain.fingerprint}`) return JSON.stringify(plain.data);
  if (words !== null && wordFiles !== null) {
    if (name === wordFiles.finder) return JSON.stringify(words.finder);
    if (name === wordFiles.meanings) return JSON.stringify(words.meanings);
    if (name === wordFiles.examples) return JSON.stringify(words.examples);
  }
  const page = pageFiles.find((file) => file.name === name);
  if (page !== undefined) return JSON.stringify(page.file);
  // Every name above is one getStaticPaths gave: anything else is a mistake of the build.
  throw new Error(`/data/${name ?? ''}.json is not a file of this build`);
}

export const GET: APIRoute = ({ params }) =>
  new Response(body(params.name), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
