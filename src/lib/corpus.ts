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

/**
 * Where "Lire sur melenchon2027.fr" points.
 *
 * Observed and archived 10/9/2026 (D14.14, docs/discovery/captures/2026-09-10/source-404/):
 * every sub-page of the book answers 404 — including the URLs the landing page publishes
 * itself. The 89 section URLs recorded in the corpus on 7 September are dead. The book's
 * landing page still answers 200, and `/programme2025/` redirects to it.
 *
 * So the deep link degrades to the work itself rather than sending a reader to a 404: the app's
 * whole premise is "va vérifier, c'est écrit là", and a broken source link is the one thing that
 * makes that promise ring hollow. The licence obligation is unaffected either way — CC BY-NC-SA
 * asks for attribution and a link to the WORK (H-CNF-17m), which is exactly what this is.
 *
 * One boolean to flip when the source restores its sections, plus its test.
 */
export const SOURCE_DEEP_LINKS_ALIVE = false;

/** The work itself: stable, and answering 200 on 10/9/2026. */
export const BOOK_URL = 'https://melenchon2027.fr/programme2025/livre/';

export const sourceLink = (section: SlimSection): string =>
  SOURCE_DEEP_LINKS_ALIVE ? section.url : BOOK_URL;
