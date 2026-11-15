/**
 * The three lists of words the sheet of « Demander » judges a question with, as its file gives
 * them to the phone — read at build time (src/lib/chat-data.ts) and by the tools that ask as
 * the page does (scripts/ask-page.ts): public files only.
 *
 *   data/2026/ordinary.json   `words`: neutral words; `people`: people and proper names that
 *                             are no politician — both as the index cuts them;
 *   data/2026/sensitive.json  the sensitive subjects (`groups`) and the softer ones — the
 *                             countries one lends allegiances to, a fortune (`soft`) —,
 *                             as stems; the words one points at somebody with (`pointing`),
 *                             the faces of every day (`feelings`), the peoples a hateful
 *                             sentence is thrown at (`peoples`), what it says of them
 *                             (`predicates`, `crimes`), the coded phrases (`tropes`).
 *
 * What they are for: src/lib/chat-local.ts, `measuresFor`.
 */
import { readFileSync } from 'node:fs';
import type { WordLists } from './chat-local.js';
import { spelled, stem, terms } from './search-core.js';

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const cut = (list: readonly string[]): string[] =>
  [...new Set(list.flatMap((word) => terms(word)))].sort();

export function wordLists(): WordLists {
  const ordinary = read('data/2026/ordinary.json') as { words: string[]; people: string[] };
  const sensitive = read('data/2026/sensitive.json') as {
    groups: Record<string, string[]>;
    soft: Record<string, string[]>;
    suggested: string[];
    pointing: {
      roles: string[];
      somebody: string[];
      pointed: string[];
      own: string[];
      ours: string[];
      verbal: string[];
      asking: string;
    };
    feelings: number[];
    peoples: string[];
    tropes: Record<string, string[]>;
    predicates: string[];
    crimes: string[];
    insults: string[];
  };
  return {
    neutral: cut(ordinary.words),
    people: cut(ordinary.people),
    sensitive: Object.values(sensitive.groups).flat().sort(),
    soft: Object.values(sensitive.soft).flat().sort(),
    askable: sensitive.suggested.flatMap((group) => sensitive.groups[group] ?? []).sort(),
    ...sensitive.pointing,
    feelings: sensitive.feelings.map((code) => String.fromCodePoint(code)).join(''),
    peoples: [...sensitive.peoples].sort(),
    // A coded phrase as the rules read a question — folded, each word cut to its stem —, with
    // the subject to ask in its place.
    tropes: Object.entries(sensitive.tropes).flatMap(([subject, phrases]) =>
      [...new Set(phrases.map((phrase) => spelled(phrase).map(stem).join(' ')))].map(
        (phrase): [string, string] => [phrase, subject],
      ),
    ),
    predicates: [...sensitive.predicates].sort(),
    crimes: [...sensitive.crimes].sort(),
    insults: [...sensitive.insults].sort(),
  };
}
