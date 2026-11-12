/**
 * The 2025 edition, as far as the app still needs it: the addresses it used to serve, so that
 * each of them keeps answering with a bridge to the 2026 edition (D15.8, D15.9).
 *
 * Identifiers and section titles only. The text of the archive (data/aec-2025.json, CC
 * BY-NC-SA 4.0) is not rendered anywhere any more: it is no longer "the programme".
 */
import { readFileSync } from 'node:fs';
import type { Dataset } from '../../scripts/aec-types.ts';
import { idMap, manifest, type Chapter, type Section } from './edition.ts';

export interface OldAddress {
  /** Identifier in the 2025 edition: `c12-s01`, `c12-s01-k01`, `c13-s02-a01`. */
  id: string;
  /** The 2025 section it belonged to. */
  sectionId: string;
}

let cache: Dataset | undefined;
function archive(): Dataset {
  cache ??= JSON.parse(readFileSync('data/aec-2025.json', 'utf8')) as Dataset;
  return cache;
}

export const oldSections = (): OldAddress[] =>
  archive().sections.map((s) => ({ id: s.id, sectionId: s.id }));

/** Every proposition that had a page under `/m/`, sub-measures included. */
export const oldMeasures = (): OldAddress[] =>
  archive().sections.flatMap((s) =>
    s.items.flatMap((item) =>
      item.kind === 'paragraph'
        ? []
        : [item, ...(item.kind === 'measure' ? (item.subMeasures ?? []) : [])].map((x) => ({
            id: x.id,
            sectionId: s.id,
          })),
    ),
  );

/** Every "À savoir" statistic that had a page under `/a/`. */
export const oldStatistics = (): OldAddress[] =>
  archive().sections.flatMap((s) => s.chiffres.map((c) => ({ id: c.id, sectionId: s.id })));

export interface BridgeTarget {
  sections: Section[];
  chapter: Chapter | null;
}

/** Where the subject of a 2025 section is treated in the 2026 edition. */
export function bridgeTarget(sectionId2025: string): BridgeTarget {
  const map = idMap();
  const byId = new Map(manifest().sections.map((s) => [s.id, s]));
  const heirs = (map.sections[sectionId2025] ?? [])
    .map((id) => byId.get(id))
    .filter((s): s is Section => s !== undefined);
  const chapterId = map.chapters[sectionId2025];
  const chapter = manifest().chapters.find((c) => c.id === chapterId) ?? null;
  return { sections: heirs, chapter };
}
