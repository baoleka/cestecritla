/**
 * The two files of the search, as the phone fetches them — computed at build time from PUBLIC
 * data only. src/pages/data/[name].json.ts writes them; src/components/Search.astro names them.
 *
 *   /data/index-<fp>.json   the serialised index (data/2026/search-index.json): stems, no sentence;
 *   /data/meta-<fp>.json    what a result shows: official titles, where each section is, the
 *                           label and the link locator of each proposition, the rationed incipit
 *                           of the key measures — and our synonyms, and the phrases the book
 *                           writes in other words (D21.8).
 *
 * Each name carries the fingerprint of what the file holds — not the version of the book: a
 * browser keeps these files a year without asking again (public/_headers). Until 23/11/2026 they
 * carried the version of the book. That day the titles gained a field under the name they had
 * had since 12/11, every browser that had searched before kept the file of then, the new script
 * could not read it, and « Demander » searched for ever (R73). A file that changes changes its
 * name; scripts/check-build.test.ts holds it for every file under /data/.
 */
import { readFileSync } from 'node:fs';
import {
  chapterOf,
  chapterShort,
  isProposition,
  manifest,
  numberOf,
  partOf,
  partShort,
  sections,
} from './edition.ts';
import { canonicalHash } from './fingerprint.ts';
import { t } from './strings.ts';

/** A file of the search: its name under /data/, without « .json », and what it holds. */
export interface SearchFile {
  name: string;
  data: unknown;
}

export interface SearchFiles {
  index: SearchFile;
  meta: SearchFile;
}

/** What the file is, then the fingerprint of what it holds — the one way the build has (fingerprint.ts). */
const named = (what: 'index' | 'meta', data: unknown): SearchFile => ({
  name: `${what}-${canonicalHash(data).slice(0, 16)}`,
  data,
});

/** The index, as data/2026/search-index.json holds it — refused if built from another state of the book. */
function index(): unknown {
  const file = JSON.parse(readFileSync('data/2026/search-index.json', 'utf8')) as {
    meta: { corpus_version: string };
    index: unknown;
  };
  if (file.meta.corpus_version !== manifest().meta.corpus_version) {
    throw new Error('data/2026/search-index.json was not built from the corpus of the manifest');
  }
  return file.index;
}

/** The titles, the locators and the incipits of the manifest, with our synonyms. */
function meta(): unknown {
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
  const file = JSON.parse(readFileSync('data/2026/synonyms.json', 'utf8')) as {
    groups: string[][];
    book_words?: { said: string[]; searched: string; why_fr: string }[];
  };
  // The phrases the book writes in other words travel without their reason: the page searches.
  const bookWords = (file.book_words ?? []).map(({ said, searched }) => ({ said, searched }));
  return {
    sections: sectionEntries,
    items,
    synonyms: file.groups,
    book_words: bookWords,
  };
}

let built: SearchFiles | null = null;
/** The two files of this build, computed once: two pages name them, one endpoint writes them. */
export function searchFiles(): SearchFiles {
  built ??= { index: named('index', index()), meta: named('meta', meta()) };
  return built;
}
