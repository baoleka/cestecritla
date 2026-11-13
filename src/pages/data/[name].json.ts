/**
 * The files the page downloads, generated at build time from PUBLIC data only:
 *
 *   /data/index-<version>.json   the serialised index (data/2026/search-index.json): stems;
 *   /data/meta-<version>.json    what a result shows: official titles, where each section is,
 *                                the label and the link locator of each proposition, and the
 *                                rationed incipit of the key measures. Plus our synonyms.
 *   /data/jeu-<fingerprint>.json the game: its words, where each is written, and the titles
 *                                of the tiles — only in a build that shows the game.
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
import { buildGame, gameSite } from '../../lib/game-data.ts';
import { t } from '../../lib/strings.ts';

const version = manifest().meta.corpus_version;

/** The game's data exists only in a build that shows the game (src/lib/game-data.ts). */
const game = gameSite().on ? buildGame() : null;

export function getStaticPaths() {
  return [
    { params: { name: `index-${version}` } },
    { params: { name: `meta-${version}` } },
    ...(game === null ? [] : [{ params: { name: `jeu-${game.fingerprint}` } }]),
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
  return meta();
}

export const GET: APIRoute = ({ params }) =>
  new Response(body(params.name), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
