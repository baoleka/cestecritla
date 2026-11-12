/**
 * Where does an address of the 2025 edition lead now? (D15.8, D15.9)
 *
 *   npx tsx scripts/id-map.ts            writes private/id-map/full.json (everything measured)
 *                                        and data/2026/id-map-2025.json (sections only)
 *   npx tsx scripts/id-map.ts --report   prints the histograms, writes nothing
 *
 * The 2025 edition is no longer served by its publisher, and eight of its addresses on this
 * site were sent to people in September. They must keep answering — with a bridge page that
 * points at the section of the 2026 edition where the subject is treated now.
 *
 * Two files, and the difference between them is a decision (D15.9):
 *
 *   private   every 2025 item, its closest 2026 item, a class and a score. Useful to re-anchor
 *             the editorial content. Never published: a list of "measures that disappeared" is
 *             exactly what a hostile reading of this project would quote.
 *   public    2025 section → 2026 section(s). No score, no class, nothing about single measures.
 *
 * Method. Exact equality of the normalised text first (same SHA-256), then the Dice coefficient
 * on character trigrams of the folded text. Classes: exact · typo (>= 0.95) · close (>= 0.75) ·
 * reworked (>= 0.50) · none. A 2025 section inherits the 2026 sections its propositions went to,
 * weighted by score; a section whose propositions went nowhere falls back on its chapter.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Dataset } from './aec-types.js';
import { flatItems } from './aec26-core.js';
import type { IdMapPublic, PrivateCorpus } from './aec26-types.js';
import { PRIVATE_CORPUS_PATH } from './ingest-2026.js';

export const ID_MAP_PUBLIC_PATH = 'data/2026/id-map-2025.json';
export const ID_MAP_PRIVATE_PATH = 'private/id-map/full.json';

export type MatchClass = 'exact' | 'typo' | 'close' | 'reworked' | 'none';

export function classOf(score: number, exact: boolean): MatchClass {
  if (exact) return 'exact';
  if (score >= 0.95) return 'typo';
  if (score >= 0.75) return 'close';
  if (score >= 0.5) return 'reworked';
  return 'none';
}

/** Case, accents, punctuation and spacing do not make two sentences different. */
export function foldForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function trigrams(text: string): Map<string, number> {
  const folded = ` ${foldForMatch(text)} `;
  const out = new Map<string, number>();
  for (let i = 0; i + 3 <= folded.length; i += 1) {
    const gram = folded.slice(i, i + 3);
    out.set(gram, (out.get(gram) ?? 0) + 1);
  }
  return out;
}

/** Dice coefficient on multisets: 2·|A∩B| / (|A| + |B|), between 0 and 1. */
export function dice(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): number {
  let shared = 0;
  let sizeA = 0;
  let sizeB = 0;
  for (const n of a.values()) sizeA += n;
  for (const [gram, n] of b) {
    sizeB += n;
    shared += Math.min(n, a.get(gram) ?? 0);
  }
  return sizeA + sizeB === 0 ? 0 : (2 * shared) / (sizeA + sizeB);
}

export interface Candidate {
  id: string;
  sectionId: string | null;
  chapterId: string | null;
  text: string;
  hash: string;
}

export interface ItemMatch {
  from: string;
  to: string | null;
  toSection: string | null;
  toChapter: string | null;
  score: number;
  class: MatchClass;
}

/** The closest candidate for each source item. Quadratic, and small enough not to care. */
export function matchItems(
  sources: readonly Candidate[],
  targets: readonly Candidate[],
): ItemMatch[] {
  const byHash = new Map(targets.map((t) => [t.hash, t]));
  const grams = targets.map((t) => trigrams(t.text));
  return sources.map((source) => {
    const twin = byHash.get(source.hash);
    if (twin !== undefined) {
      return {
        from: source.id,
        to: twin.id,
        toSection: twin.sectionId,
        toChapter: twin.chapterId,
        score: 1,
        class: 'exact',
      };
    }
    const own = trigrams(source.text);
    let best = -1;
    let bestScore = 0;
    grams.forEach((candidate, index) => {
      const score = dice(own, candidate);
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    });
    const target = targets[best];
    const matchClass = classOf(bestScore, false);
    if (target === undefined || matchClass === 'none') {
      return {
        from: source.id,
        to: null,
        toSection: null,
        toChapter: null,
        score: Math.round(bestScore * 1000) / 1000,
        class: 'none',
      };
    }
    return {
      from: source.id,
      to: target.id,
      toSection: target.sectionId,
      toChapter: target.chapterId,
      score: Math.round(bestScore * 1000) / 1000,
      class: matchClass,
    };
  });
}

/** An heir must carry at least this share of what the old section passed on. */
const HEIR_SHARE = 0.2;

export interface SectionFlow {
  /** 2026 sections, the main heir first. */
  heirs: string[];
  /** 2026 chapter the section falls back on when it has no heir; null when nothing matched. */
  chapter: string | null;
}

export function sectionFlow(matches: readonly ItemMatch[]): SectionFlow {
  const bySection = new Map<string, number>();
  const byChapter = new Map<string, number>();
  for (const m of matches) {
    if (m.toSection !== null)
      bySection.set(m.toSection, (bySection.get(m.toSection) ?? 0) + m.score);
    if (m.toChapter !== null)
      byChapter.set(m.toChapter, (byChapter.get(m.toChapter) ?? 0) + m.score);
  }
  const total = [...bySection.values()].reduce((a, b) => a + b, 0);
  const ranked = (votes: Map<string, number>): [string, number][] =>
    [...votes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'));
  const heirs = ranked(bySection)
    .filter(([, weight]) => weight >= total * HEIR_SHARE)
    .map(([id]) => id);
  return { heirs, chapter: ranked(byChapter)[0]?.[0] ?? null };
}

function main(): void {
  const dataset = JSON.parse(readFileSync('data/aec-2025.json', 'utf8')) as Dataset;
  const corpus = JSON.parse(readFileSync(PRIVATE_CORPUS_PATH, 'utf8')) as PrivateCorpus;

  const targets: Candidate[] = [
    ...corpus.sections.flatMap((s) =>
      flatItems(s.items).map((i) => ({
        id: i.id,
        sectionId: s.id,
        chapterId: s.chapterId,
        text: i.text,
        hash: i.hash,
      })),
    ),
    ...corpus.chapters.flatMap((c) =>
      c.items.map((i) => ({
        id: i.id,
        sectionId: null,
        chapterId: c.id,
        text: i.text,
        hash: i.hash,
      })),
    ),
    ...[...corpus.introduction.items, ...corpus.parts.flatMap((p) => p.items)].map((i) => ({
      id: i.id,
      sectionId: null,
      chapterId: null,
      text: i.text,
      hash: i.hash,
    })),
  ];
  const propositionTargets = targets.filter((t) => /-(?:k|m)\d{2}(?:\.s\d+)?$/.test(t.id));

  const perSection = new Map<string, ItemMatch[]>();
  const all: ItemMatch[] = [];
  const histogram: Record<MatchClass, number> = {
    exact: 0,
    typo: 0,
    close: 0,
    reworked: 0,
    none: 0,
  };
  for (const section of dataset.sections) {
    const propositions: Candidate[] = section.items.flatMap((i) =>
      i.kind === 'paragraph'
        ? []
        : [i, ...(i.kind === 'measure' ? (i.subMeasures ?? []) : [])].map((x) => ({
            id: x.id,
            sectionId: section.id,
            chapterId: section.chapterId,
            text: x.text,
            hash: x.hash,
          })),
    );
    // Propositions decide where a section went: prose was rewritten too freely to vote.
    const matches = matchItems(propositions, propositionTargets);
    for (const m of matches) histogram[m.class] += 1;
    perSection.set(section.id, matches);
    all.push(...matches);
    const prose: Candidate[] = [
      ...section.items.filter((i) => i.kind === 'paragraph'),
      ...section.chiffres,
    ].map((x) => ({
      id: x.id,
      sectionId: section.id,
      chapterId: section.chapterId,
      text: x.text,
      hash: x.hash,
    }));
    all.push(...matchItems(prose, targets));
  }
  const frontMatter: Candidate[] = [
    ...dataset.introduction.paragraphs,
    ...dataset.parts.flatMap((p) => [...p.paragraphs, ...p.epigraphs]),
  ].map((x) => ({ id: x.id, sectionId: null, chapterId: null, text: x.text, hash: x.hash }));
  all.push(...matchItems(frontMatter, targets));

  // Which 2026 propositions have no ancestor at all (private statistic).
  const reached = new Set(all.filter((m) => m.to !== null).map((m) => m.to));
  const orphans = propositionTargets.filter((t) => !reached.has(t.id)).length;

  const publicMap: IdMapPublic = {
    meta: {
      from: { edition: '2025', corpus_version: dataset.meta.corpus_version },
      to: { edition: '2026', corpus_version: corpus.meta.corpus_version },
      note_fr:
        'Pour chaque section de l’édition 2025, la ou les sections de l’édition 2026 où le sujet est traité. ' +
        'Sert aux pages de pont des anciennes adresses. Ne dit rien d’une mesure prise isolément.',
    },
    sections: {},
    chapters: {},
  };
  const flows: Record<string, number> = {
    '1 heir': 0,
    '2 heirs': 0,
    '3 or more': 0,
    'chapter only': 0,
    nothing: 0,
  };
  const titles2026 = new Map(corpus.sections.map((s) => [foldForMatch(s.title), s.id]));
  let sameTitle = 0;
  for (const section of dataset.sections) {
    const flow = sectionFlow(perSection.get(section.id) ?? []);
    // An identical title is a stronger sign than any vote: that section leads the list.
    const namesake = titles2026.get(foldForMatch(section.title));
    if (namesake !== undefined) {
      sameTitle += 1;
      flow.heirs = [namesake, ...flow.heirs.filter((id) => id !== namesake)];
    }
    publicMap.sections[section.id] = flow.heirs;
    if (flow.heirs.length === 0 && flow.chapter !== null)
      publicMap.chapters[section.id] = flow.chapter;
    const key =
      flow.heirs.length === 1
        ? '1 heir'
        : flow.heirs.length === 2
          ? '2 heirs'
          : flow.heirs.length >= 3
            ? '3 or more'
            : flow.chapter !== null
              ? 'chapter only'
              : 'nothing';
    flows[key] = (flows[key] ?? 0) + 1;
  }

  const total = Object.values(histogram).reduce((a, b) => a + b, 0);
  console.log(
    [
      `2025 (${dataset.meta.corpus_version}) → 2026 (${corpus.meta.corpus_version})`,
      `  ${String(total)} propositions of 2025: ` +
        Object.entries(histogram)
          .map(([name, n]) => `${name} ${String(n)}`)
          .join(' · '),
      `  ${String(orphans)} of the ${String(propositionTargets.length)} propositions of 2026 are nobody's closest match`,
      `  ${String(dataset.sections.length)} sections of 2025: ` +
        Object.entries(flows)
          .map(([name, n]) => `${name} ${String(n)}`)
          .join(' · ') +
        ` · ${String(sameTitle)} keep their exact title`,
      `  ${String(all.length)} items matched in all (propositions, prose, statistics, front matter)`,
    ].join('\n'),
  );
  if (process.argv.includes('--report')) return;

  mkdirSync(dirname(ID_MAP_PRIVATE_PATH), { recursive: true });
  writeFileSync(
    ID_MAP_PRIVATE_PATH,
    `${JSON.stringify({ meta: publicMap.meta, histogram, flows, items: all }, null, 2)}\n`,
  );
  mkdirSync(dirname(ID_MAP_PUBLIC_PATH), { recursive: true });
  writeFileSync(ID_MAP_PUBLIC_PATH, `${JSON.stringify(publicMap, null, 2)}\n`);
  console.log(`Written: ${ID_MAP_PRIVATE_PATH} (private), ${ID_MAP_PUBLIC_PATH} (public)`);
}

if (process.argv[1] !== undefined && /id-map\.ts$/.test(process.argv[1])) main();
