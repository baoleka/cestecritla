/**
 * Where does a word stand in the 2026 edition? — a local probe (the corpus is private: this
 * runs only on the machine that holds private/).
 *
 *   npx tsx scripts/probe-2026.ts "peine de mort" "peine capitale"
 *   npx tsx scripts/probe-2026.ts "double peine" --with "retrait" --with "expuls"
 *
 * Each pattern is a regular expression, matched on text folded as the search index folds it:
 * no case, no accent — and NO ELISION. « l'euro » is « euro » there, « d'heure » is « heure ».
 * Write the pattern the same way, or it finds nothing and proves nothing (it happened: the
 * first probes of « sortie de l'euro » were written `l.euro` and could not match). Each pattern
 * is tried against every item of the book — key measures, measures, sub-measures, the paragraphs around them — and against
 * every official title. `--with` asks, for each item found, whether it ALSO holds another
 * pattern: the way to tell two homonyms apart without reading either.
 *
 * It prints identifiers, kinds and counts. Never a word of the text: a tool that printed what
 * it reads would be the shortest way for the book to end up in a terminal log (D15.6).
 *
 * Used to label the evaluation set (eval/ask-2026.json): a subject is "absent" there only if
 * its probes find nothing in the measures, in the prose and in the titles alike.
 */
import { existsSync, readFileSync } from 'node:fs';
import { normalize } from '../src/lib/search-core.js';
import { flatItems } from './aec26-core.js';
import type { PrivateCorpus } from './aec26-types.js';

export const PRIVATE_CORPUS = 'private/corpus/aec-2026.json';

export interface Probed {
  id: string;
  /** `key_measure`, `measure`, `sub_measure`, `paragraph`, `heading` or `title`. */
  kind: string;
  text: string;
}

/** Everything a reader of the official pages can read, each with the identifier we know it by. */
export function everything(corpus: PrivateCorpus): Probed[] {
  const out: Probed[] = [];
  const push = (items: PrivateCorpus['sections'][number]['items']): void => {
    for (const item of flatItems(items))
      out.push({ id: item.id, kind: item.kind, text: item.text });
  };
  out.push({ id: 'title:p0', kind: 'title', text: corpus.introduction.title });
  push(corpus.introduction.items);
  for (const part of corpus.parts) {
    out.push({ id: `title:${part.id}`, kind: 'title', text: part.title });
    push(part.items);
  }
  for (const chapter of corpus.chapters) {
    out.push({ id: `title:${chapter.id}`, kind: 'title', text: chapter.title });
    push(chapter.items);
  }
  for (const section of corpus.sections) {
    out.push({ id: `title:${section.id}`, kind: 'title', text: section.title });
    push(section.items);
  }
  return out;
}

/** A pattern as it is matched: without case or accents, on text folded the same way. */
export function probePattern(source: string): RegExp {
  return new RegExp(normalize(source), 'u');
}

/** Identifiers of the items a pattern is found in, in the order of the book. */
export function probe(all: readonly Probed[], source: string): Probed[] {
  const pattern = probePattern(source);
  return all.filter((item) => pattern.test(normalize(item.text)));
}

function main(): void {
  const args = process.argv.slice(2);
  const withPatterns: string[] = [];
  const patterns: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? '';
    if (arg === '--with') {
      withPatterns.push(args[i + 1] ?? '');
      i += 1;
    } else patterns.push(arg);
  }
  if (patterns.length === 0) {
    console.error('usage: tsx scripts/probe-2026.ts "<pattern>"… [--with "<pattern>"]…');
    process.exitCode = 2;
    return;
  }
  if (!existsSync(PRIVATE_CORPUS)) {
    console.error(`probe: ${PRIVATE_CORPUS} is not on this machine`);
    process.exitCode = 1;
    return;
  }
  const corpus = JSON.parse(readFileSync(PRIVATE_CORPUS, 'utf8')) as PrivateCorpus;
  const all = everything(corpus);
  console.log(`corpus ${corpus.meta.corpus_version}: ${String(all.length)} items and titles`);
  for (const source of patterns) {
    const found = probe(all, source);
    const byKind = new Map<string, number>();
    for (const item of found) byKind.set(item.kind, (byKind.get(item.kind) ?? 0) + 1);
    const kinds = [...byKind].map(([kind, n]) => `${kind} ${String(n)}`).join(', ');
    console.log(
      `\n/${source}/ — ${String(found.length)} item(s)${kinds === '' ? '' : ` (${kinds})`}`,
    );
    for (const item of found) {
      const also = withPatterns
        .map((w) => `${w}=${probePattern(w).test(normalize(item.text)) ? 'oui' : 'non'}`)
        .join(' ');
      console.log(`  ${item.id} [${item.kind}]${also === '' ? '' : ` ${also}`}`);
    }
  }
}

if (process.argv[1] !== undefined && /probe-2026\.ts$/.test(process.argv[1])) main();
