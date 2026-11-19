/**
 * The files the page downloads, generated at build time from PUBLIC data only:
 *
 *   /data/index-<version>.json   the serialised index (data/2026/search-index.json): stems;
 *   /data/meta-<version>.json    what a result shows: official titles, where each section is,
 *                                the label and the link locator of each proposition, and the
 *                                rationed incipit of the key measures. Plus our synonyms.
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
 *
 * The corpus version is in the file name, so the files can be cached for a year
 * (public/_headers): a new edition of the book gets new names, not stale bytes.
 */
import { readFileSync } from 'node:fs';
import type { APIRoute } from 'astro';
import {
  chapterOf,
  chapterShort,
  isProposition,
  manifest,
  numberOf,
  partOf,
  partShort,
  sections,
} from '../../lib/edition.ts';
import { askSite } from '../../lib/ask-config.ts';
import { chatPlain } from '../../lib/chat-data.ts';
import { builtWords, wordsNames } from '../../lib/words-data.ts';
import { builtGame } from '../../lib/game-built.ts';
import { gameSite } from '../../lib/game-data.ts';
import { t } from '../../lib/strings.ts';

const version = manifest().meta.corpus_version;

/** The game's data exists only in a build that shows the game (src/lib/game-data.ts). */
const game = gameSite().on ? builtGame() : null;
/** The texts of « En clair » exist only in a build whose field opens the sheet. */
const plain = askSite().mode === 'chat' ? chatPlain() : null;
/** So do the explained words: they follow the mode of the site (D20.11). */
const words = askSite().mode === 'chat' ? builtWords() : null;
const wordFiles = words === null ? null : wordsNames(words.fingerprint);

export function getStaticPaths() {
  return [
    { params: { name: `index-${version}` } },
    { params: { name: `meta-${version}` } },
    ...(game === null ? [] : [{ params: { name: `jeu-${game.fingerprint}` } }]),
    ...(plain === null ? [] : [{ params: { name: `clair-${plain.fingerprint}` } }]),
    ...(wordFiles === null
      ? []
      : [wordFiles.finder, wordFiles.meanings, wordFiles.examples].map((name) => ({
          params: { name },
        }))),
  ];
}

function index(): string {
  const file = JSON.parse(readFileSync('data/2026/search-index.json', 'utf8')) as {
    meta: { corpus_version: string };
    index: unknown;
  };
  if (file.meta.corpus_version !== version) {
    throw new Error('data/2026/search-index.json was not built from the corpus of the manifest');
  }
  return JSON.stringify(file.index);
}

function meta(): string {
  const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
  const sectionEntries: Record<string, [string, string, string]> = {};
  const items: Record<string, [string, string, string]> = {};
  for (const section of sections()) {
    const where = `${capital(partShort(partOf(section)))} · ${chapterShort(chapterOf(section))}`;
    sectionEntries[section.id] = [section.title, where, section.url];
    for (const item of section.items.filter(isProposition)) {
      const n = numberOf(item);
      const label = n === null ? t('measure.key_label') : t('pointer.item', { n });
      items[item.id] = [label, item.locator ?? '', item.incipit ?? ''];
    }
  }
  const synonyms = (
    JSON.parse(readFileSync('data/2026/synonyms.json', 'utf8')) as { groups: string[][] }
  ).groups;
  return JSON.stringify({ sections: sectionEntries, items, synonyms });
}

function body(name: string | undefined): string {
  if (name?.startsWith('index-') === true) return index();
  if (name?.startsWith('jeu-') === true && game !== null) return JSON.stringify(game.data);
  if (name?.startsWith('clair-') === true && plain !== null) return JSON.stringify(plain.data);
  if (words !== null && wordFiles !== null) {
    if (name === wordFiles.finder) return JSON.stringify(words.finder);
    if (name === wordFiles.meanings) return JSON.stringify(words.meanings);
    if (name === wordFiles.examples) return JSON.stringify(words.examples);
  }
  return meta();
}

export const GET: APIRoute = ({ params }) =>
  new Response(body(params.name), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
