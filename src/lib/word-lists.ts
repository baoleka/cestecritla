/**
 * The three lists of words the sheet of « Demander » judges a question with, as its file gives
 * them to the phone — read at build time (src/lib/chat-data.ts) and by the tools that ask as
 * the page does (scripts/ask-page.ts): public files only.
 *
 *   data/2026/ordinary.json   `words`: neutral words; `people`: people and proper names that
 *                             are no politician — both as the index cuts them;
 *   data/2026/sensitive.json  the sensitive subjects (`groups`) and the softer ones — the
 *                             countries one lends allegiances to, a fortune (`soft`) —,
 *                             as stems.
 *
 * What they are for: src/lib/chat-local.ts, `measuresFor`.
 */
import { readFileSync } from 'node:fs';
import type { WordLists } from './chat-local.js';
import { terms } from './search-core.js';

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const cut = (list: readonly string[]): string[] =>
  [...new Set(list.flatMap((word) => terms(word)))].sort();

export function wordLists(): WordLists {
  const ordinary = read('data/2026/ordinary.json') as { words: string[]; people: string[] };
  const sensitive = read('data/2026/sensitive.json') as {
    groups: Record<string, string[]>;
    soft: Record<string, string[]>;
    suggested: string[];
  };
  return {
    neutral: cut(ordinary.words),
    people: cut(ordinary.people),
    sensitive: Object.values(sensitive.groups).flat().sort(),
    soft: Object.values(sensitive.soft).flat().sort(),
    askable: sensitive.suggested.flatMap((group) => sensitive.groups[group] ?? []).sort(),
  };
}
