/**
 * Builds the search index of the 2026 edition (D15.7, "index" level of the citation policy).
 *
 *   npx tsx scripts/index-2026.ts            writes data/2026/search-index.json
 *   npx tsx scripts/index-2026.ts --check    rebuilds in memory, compares with the file
 *   npx tsx scripts/index-2026.ts --report   numbers only
 *
 * What the index is. One entry per proposition, holding the STEMS of its words — lower case, no
 * accent, no stop word, no order — and how often each occurs. Nothing is stored: MiniSearch
 * keeps a term → documents table, not sentences. That is enough for the browser to answer
 * "which propositions talk about this?" and not enough to print one.
 *
 * What it lets out, said plainly: the vocabulary of each proposition. It is the price of a
 * search that runs on the reader's phone, with no server and no log (D0.22) — and the dial
 * "one entry per section" exists if that price is judged too high.
 *
 * Reads private/, so it is a local tool, never a build step (scripts/check-repo.test.ts): the
 * site is built from the file this writes. The name deliberately does not start with "build".
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import MiniSearch from 'minisearch';
import { INDEX_OPTIONS, terms, type SearchDoc } from '../src/lib/search-core.js';
import type { PrivateCorpus } from './aec26-types.js';
import { PRIVATE_CORPUS_PATH } from './ingest-2026.js';

export const SEARCH_INDEX_PATH = 'data/2026/search-index.json';

export interface SearchIndexFile {
  meta: {
    corpus_version: string;
    documents: number;
    /** Distinct stems in the whole index. */
    terms: number;
    /** Mean number of distinct stems per proposition (its own words, context excluded). */
    stems_per_document: number;
    fields: string[];
  };
  index: unknown;
}

/** `Chapitre 3 : Titre` → `Titre`: the number says nothing a reader would search for. */
const withoutNumber = (title: string): string =>
  title.replace(/^(?:Chapitre|Partie) \d+\s*[:–-]\s*/u, '');

export function searchDocs(corpus: PrivateCorpus): SearchDoc[] {
  const chapters = new Map(corpus.chapters.map((c) => [c.id, c]));
  const docs: SearchDoc[] = [];
  for (const section of corpus.sections) {
    const chapter = chapters.get(section.chapterId);
    const context = `${withoutNumber(chapter?.title ?? '')}. ${section.title}.`;
    for (const item of section.items) {
      if (item.kind === 'paragraph') continue;
      docs.push({ id: item.id, text: item.text, prefix: context });
      for (const sub of item.subMeasures ?? []) {
        // A sub-measure often makes sense only under its measure: "Pour cela :" … "créer X".
        docs.push({ id: sub.id, text: sub.text, prefix: `${context} ${item.text}` });
      }
    }
  }
  return docs;
}

export function buildSearchIndex(corpus: PrivateCorpus): SearchIndexFile {
  const docs = searchDocs(corpus);
  const index = new MiniSearch<SearchDoc>(INDEX_OPTIONS);
  index.addAll(docs);
  const stems = docs.reduce((n, d) => n + new Set(terms(d.text)).size, 0);
  return {
    meta: {
      corpus_version: corpus.meta.corpus_version,
      documents: docs.length,
      terms: index.termCount,
      stems_per_document: Math.round((stems / docs.length) * 10) / 10,
      fields: [...INDEX_OPTIONS.fields],
    },
    index: JSON.parse(JSON.stringify(index)) as unknown,
  };
}

function main(): void {
  const corpus = JSON.parse(readFileSync(PRIVATE_CORPUS_PATH, 'utf8')) as PrivateCorpus;
  const file = buildSearchIndex(corpus);
  const body = `${JSON.stringify(file)}\n`;
  console.log(
    `index of corpus ${file.meta.corpus_version}: ${String(file.meta.documents)} propositions, ` +
      `${String(file.meta.terms)} distinct stems, ${String(file.meta.stems_per_document)} stems per ` +
      `proposition, ${String(Buffer.byteLength(body))} bytes`,
  );
  if (process.argv.includes('--report')) return;
  if (process.argv.includes('--check')) {
    if (!existsSync(SEARCH_INDEX_PATH) || readFileSync(SEARCH_INDEX_PATH, 'utf8') !== body) {
      console.error(`${SEARCH_INDEX_PATH} is out of date: run index-2026.ts`);
      process.exit(1);
    }
    console.log('the committed index is exactly what the corpus produces');
    return;
  }
  writeFileSync(SEARCH_INDEX_PATH, body);
  console.log(`written: ${SEARCH_INDEX_PATH}`);
}

if (process.argv[1] !== undefined && /index-2026\.ts$/.test(process.argv[1])) main();
