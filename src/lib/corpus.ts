/**
 * Build-time access to the runtime projection. Imported by pages only: nothing here ships to
 * the client, and the Worker never reads the corpus at all (D1.3, ADR-1).
 */
import { readFileSync } from 'node:fs';
import type { SlimCorpus, SlimSection, SlimItem } from '../../scripts/build-projection.ts';

export type { SlimCorpus, SlimSection, SlimItem };

let cache: SlimCorpus | undefined;

/** `build/slim.json` is produced by scripts/build-projection.ts, which runs before astro build. */
export function corpus(): SlimCorpus {
  if (cache === undefined) {
    cache = JSON.parse(readFileSync('build/slim.json', 'utf8')) as SlimCorpus;
  }
  return cache;
}

export const sections = (): SlimSection[] => corpus().sections;

export function chapterOf(section: SlimSection): { id: string; number: number; title: string } {
  const c = corpus().chapters.find((x) => x.id === section.chapterId);
  if (c === undefined) throw new Error(`chapter ${section.chapterId} missing for ${section.id}`);
  return c;
}

/** The scope heading that applies to an item, when there is one. */
export function scopeOf(section: SlimSection, item: SlimItem): SlimItem | undefined {
  if (item.scopeId === undefined) return undefined;
  return section.items.find((i) => i.id === item.scopeId);
}

/** A proposition is anything that is not argument prose. */
export const isProposition = (i: SlimItem): boolean => i.kind !== 'paragraph';
