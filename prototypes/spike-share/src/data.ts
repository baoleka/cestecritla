/**
 * Runtime data access. slim.json and stat-cards.json are served as Static Assets and
 * fetched through the ASSETS binding once per isolate, so the Worker bundle holds no data.
 */
import type { SlimChapter, SlimCorpus, SlimItem, SlimSection, SlimSubMeasure, StatCard, StatCards } from './types.ts';

export interface Corpus {
  meta: SlimCorpus['meta'];
  chapters: Map<string, SlimChapter>;
  sections: SlimSection[];
  sectionById: Map<string, SlimSection>;
  /** Measures and sub-measures by id. */
  measureById: Map<string, { item: SlimItem | SlimSubMeasure; section: SlimSection }>;
  chiffreById: Map<string, { text: string; section: SlimSection }>;
  statById: Map<string, StatCard>;
  /** Number of sections per part, in book order (progress bar segments). */
  sectionsPerPart: { partId: string; count: number }[];
}

export interface MeasureView {
  id: string;
  kind: 'key_measure' | 'measure' | 'sub_measure';
  text: string;
  section: SlimSection;
  chapter: SlimChapter;
  partId: string;
}

export interface StatView extends MeasureView {
  card: StatCard;
}

/** Module-level cache is fine here: this is immutable data, not request state. */
let corpusPromise: Promise<Corpus> | undefined;

const fetchAsset = async (assets: Fetcher, path: string): Promise<Response> => {
  const res = await assets.fetch(new Request(`https://assets.local${path}`));
  if (!res.ok) throw new Error(`asset ${path}: HTTP ${res.status}`);
  return res;
};

const build = (slim: SlimCorpus, stats: StatCards): Corpus => {
  const chapters = new Map(slim.chapters.map((c) => [c.id, c]));
  const sectionById = new Map(slim.sections.map((s) => [s.id, s]));
  const measureById = new Map<string, { item: SlimItem | SlimSubMeasure; section: SlimSection }>();
  const chiffreById = new Map<string, { text: string; section: SlimSection }>();
  for (const section of slim.sections) {
    for (const item of section.items) {
      if (item.kind === 'paragraph') continue;
      measureById.set(item.id, { item, section });
      for (const sub of item.subMeasures ?? []) measureById.set(sub.id, { item: sub, section });
    }
    for (const chiffre of section.chiffres) chiffreById.set(chiffre.id, { text: chiffre.text, section });
  }
  const perPart = new Map<string, number>();
  for (const section of slim.sections) {
    const partId = chapters.get(section.chapterId)?.partId ?? 'part1';
    perPart.set(partId, (perPart.get(partId) ?? 0) + 1);
  }
  return {
    meta: slim.meta,
    chapters,
    sections: slim.sections,
    sectionById,
    measureById,
    chiffreById,
    statById: new Map(stats.cards.map((c) => [c.id, c])),
    sectionsPerPart: [...perPart.entries()].map(([partId, count]) => ({ partId, count })),
  };
};

export const loadCorpus = (assets: Fetcher): Promise<Corpus> => {
  corpusPromise ??= (async () => {
    const [slimRes, statsRes] = await Promise.all([
      fetchAsset(assets, '/data/slim.json'),
      fetchAsset(assets, '/data/stat-cards.json'),
    ]);
    const [slim, stats] = await Promise.all([slimRes.json<SlimCorpus>(), statsRes.json<StatCards>()]);
    return build(slim, stats);
  })().catch((err: unknown) => {
    corpusPromise = undefined; // allow a retry on the next request
    throw err;
  });
  return corpusPromise;
};

export const getMeasure = (corpus: Corpus, id: string): MeasureView | undefined => {
  const hit = corpus.measureById.get(id);
  if (!hit || hit.item.kind === 'paragraph') return undefined;
  const chapter = corpus.chapters.get(hit.section.chapterId);
  if (!chapter) return undefined;
  return { id, kind: hit.item.kind, text: hit.item.text, section: hit.section, chapter, partId: chapter.partId };
};

export const getStat = (corpus: Corpus, id: string): StatView | undefined => {
  const hit = corpus.chiffreById.get(id);
  const card = corpus.statById.get(id);
  if (!hit || !card) return undefined;
  const chapter = corpus.chapters.get(hit.section.chapterId);
  if (!chapter) return undefined;
  return { id, kind: 'measure', text: hit.text, section: hit.section, chapter, partId: chapter.partId, card };
};
