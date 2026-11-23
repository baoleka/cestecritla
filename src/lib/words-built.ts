/**
 * The files of the pages that explain words, as the build under way writes them (PLAN-MOTS,
 * lot 4) — a section, one of our cards, one of our answers: each its file, named by what it
 * holds (src/lib/words-data.ts, `pageWordsName`; R73).
 *
 * Apart from src/lib/words-data.ts on purpose, like src/lib/game-built.ts: that file is read by
 * the gates too, outside the build, and this one prints the strings of the kit
 * (src/lib/strings.ts), which are the build's alone.
 */
import { t } from './strings.ts';
import {
  explainedTerms,
  pageWords,
  pageWordsName,
  wordsPages,
  type PageLabels,
  type PageWordsFile,
  type WordsPage,
} from './words-data.ts';

/** A page's file of words as this build writes it: its name, and what it holds. */
export interface BuiltPageWords {
  name: string;
  file: PageWordsFile;
}

let built: Map<string, BuiltPageWords> | null = null;
/**
 * The files of the pages that explain words, by « kind:key » — computed once per build: 111
 * sections, our cards and our answers name theirs, and src/pages/data/[name].json.ts writes
 * them. The labels are the strings of the kit, as the pages print them.
 */
export function builtPageWords(): ReadonlyMap<string, BuiltPageWords> {
  if (built === null) {
    const entries = explainedTerms();
    const labels: PageLabels = {
      badge: t('chat.terms.badge'),
      how: t('chat.method_link'),
      example: t('words.example'),
    };
    built = new Map(
      wordsPages(entries).map((page) => {
        const file = pageWords(page.ids, entries, labels);
        return [`${page.kind}:${page.key}`, { name: pageWordsName(file, page), file }];
      }),
    );
  }
  return built;
}

/** The address of a page's file of words, or null when the page has none to explain. */
export function pageWordsFile(kind: WordsPage['kind'], key: string): string | null {
  const page = builtPageWords().get(`${kind}:${key}`);
  return page === undefined ? null : `/data/${page.name}.json`;
}
