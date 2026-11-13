/**
 * Build-time access to the 2026 edition — through the public manifest, and only through it
 * (D15.6). Nothing here can read the text of the programme: it is not in the repository.
 *
 * Imported by pages at build time. Nothing in this file ships to the browser.
 */
import { readFileSync } from 'node:fs';
import type {
  IdMapPublic,
  Manifest,
  ManifestItem,
  Quote,
  QuotesFile,
} from '../../scripts/aec26-types.ts';

export type { ManifestItem, Quote };
export type Section = Manifest['sections'][number];
export type Chapter = Manifest['chapters'][number];
export type Part = Manifest['parts'][number];

/** A published JSON file. The caller names the shape it expects: the cast is visible there. */
function read(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

let manifestCache: Manifest | undefined;
let quotesCache: QuotesFile | undefined;
let idMapCache: IdMapPublic | undefined;

export function manifest(): Manifest {
  manifestCache ??= read('data/2026/manifest.json') as Manifest;
  return manifestCache;
}
export function quotes(): QuotesFile {
  quotesCache ??= read('data/2026/quotes.json') as QuotesFile;
  return quotesCache;
}
export function idMap(): IdMapPublic {
  idMapCache ??= read('data/2026/id-map-2025.json') as IdMapPublic;
  return idMapCache;
}

export const LEGAL_URL = 'https://melenchon2027.fr/mentions-legales/';
export const bookUrl = (): string => manifest().meta.source;

export const sections = (): Section[] => manifest().sections;
export const parts = (): Part[] => manifest().parts;

export function sectionById(id: string): Section {
  const section = manifest().sections.find((s) => s.id === id);
  if (section === undefined) throw new Error(`edition: no section ${id}`);
  return section;
}
export function chapterOf(section: Section): Chapter {
  const chapter = manifest().chapters.find((c) => c.id === section.chapterId);
  if (chapter === undefined) throw new Error(`edition: no chapter ${section.chapterId}`);
  return chapter;
}
export function partOf(section: Section): Part {
  const part = manifest().parts.find((p) => p.id === section.partId);
  if (part === undefined) throw new Error(`edition: no part ${section.partId}`);
  return part;
}
export function chaptersOf(part: Part): Chapter[] {
  return manifest().chapters.filter((c) => c.partId === part.id);
}
export function sectionsOf(chapter: Chapter): Section[] {
  return manifest().sections.filter((s) => s.chapterId === chapter.id);
}

/** A proposition is a key measure, a measure or a sub-measure: never prose. */
export const isProposition = (item: ManifestItem): boolean => item.kind !== 'paragraph';
export const propositions = (section: Section): ManifestItem[] =>
  section.items.filter(isProposition);
export const keyMeasure = (section: Section): ManifestItem | undefined =>
  section.items.find((i) => i.kind === 'key_measure');

/**
 * The number a reader would give a proposition: `7` for the seventh measure of its section,
 * `7.2` for the second point of that measure. Null for the key measure, which has a name.
 */
export function numberOf(item: ManifestItem): string | null {
  const m = /-m(\d{2})(?:\.s(\d+))?$/.exec(item.id);
  if (m === null) return null;
  const measure = String(Number(m[1]));
  return m[2] === undefined ? measure : `${measure}.${m[2]}`;
}

export interface OfficialLink {
  /** The official page at the section anchor: what every browser understands. */
  href: string;
  /** `text=…`, appended after `:~:` by the page script where the browser can highlight. */
  fragment: string | null;
}

/**
 * Where "C'est écrit là" points. The `href` written in the page is always the section anchor;
 * the text directive travels next to it and is only appended by a script that has checked the
 * browser knows what to do with it — an older browser handed `#anchor:~:text=…` would look for
 * an element with that whole string as its id, find none, and leave the reader at the top.
 */
export function officialLink(section: Section, item?: ManifestItem): OfficialLink {
  return { href: section.url, fragment: item?.locator ?? null };
}

export interface SectionCounts {
  key: number;
  measures: number;
  subs: number;
}
export function countsOf(section: Section): SectionCounts {
  const of = (kind: ManifestItem['kind']): number =>
    section.items.filter((i) => i.kind === kind).length;
  return { key: of('key_measure'), measures: of('measure'), subs: of('sub_measure') };
}

/** The section before and the one after, in the reading order of the book. */
export function neighbours(section: Section): { previous?: Section; next?: Section } {
  const all = manifest().sections;
  const index = all.findIndex((s) => s.id === section.id);
  const out: { previous?: Section; next?: Section } = {};
  const previous = all[index - 1];
  const next = all[index + 1];
  if (previous !== undefined) out.previous = previous;
  if (next !== undefined) out.next = next;
  return out;
}

/** `Chapitre 3 : Titre` → `chapitre 3`: the short form used next to a part. */
export const chapterShort = (chapter: Chapter): string => `chapitre ${String(chapter.number)}`;
export const partShort = (part: Part): string => `partie ${String(part.order)}`;
