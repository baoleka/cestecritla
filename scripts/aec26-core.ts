/**
 * From parsed pages to the private corpus of the 2026 edition: identifiers, hashes, the
 * cross-checks between pages, and the counts. Pure — no file, no network — so that the whole
 * chain is tested on markup built in memory (aec26.test.ts).
 *
 * The cross-checks are the point. One parser reading one page can be wrong in a way that still
 * looks plausible; three independent statements of the same structure cannot agree by accident:
 *
 *   the landing page       lists the parts and their chapters
 *   each part page         lists its chapters AND every section title, with its anchor
 *   each chapter page      carries the sections themselves
 *
 * And a fourth, which the 2025 edition never offered: the site announces "1 069 mesures", and
 * the extraction must find exactly that many (D15.11). In 2025 the two numbers disagreed (831
 * against 837) and nobody could say why; here an inequality stops everything.
 */
import { normalizeText, pad2, sha256 } from './aec-common.js';
import type { FetchLog, ParsedItem, Toc } from './aec26-source.js';
import {
  ParseError26,
  parseChapterPage,
  parseIntroductionPage,
  parseOfficialCount,
  parsePartPage,
} from './aec26-source.js';
import {
  ID26,
  PROPOSITION_KINDS,
  isId26,
  type Anomaly26,
  type Counts26,
  type PageRef,
  type PrivateCorpus,
  type PrivateItem,
  type PrivateSection,
} from './aec26-types.js';

/** Characters that must never reach a hash unnoticed: a replacement character is a decoding
 * failure, and an invisible one makes two equal-looking sentences differ. */
const REPLACEMENT = /\uFFFD/;
const INVISIBLE = /[\u00AD\u200B-\u200D\u2060\uFEFF]/;
/** C0/C1 controls other than tab, line feed and carriage return: the trace of a wrong encoding. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;

export function toPrivateItem(id: string, parsed: ParsedItem, source: string): PrivateItem {
  const text = normalizeText(parsed.raw);
  if (text === '') throw new ParseError26(source, `${id}: empty text`);
  if (REPLACEMENT.test(parsed.raw)) {
    throw new ParseError26(source, `${id}: replacement character U+FFFD — the page was misdecoded`);
  }
  const out: PrivateItem = {
    id,
    kind: parsed.kind,
    text,
    hash: sha256(text),
    raw: parsed.raw,
    words: text.split(' ').length,
    inline: parsed.inline,
  };
  if (parsed.subs !== undefined) {
    out.subMeasures = parsed.subs.map((sub, index) =>
      toPrivateItem(`${id}.s${String(index + 1)}`, sub, source),
    );
  }
  return out;
}

/** Numbers items by kind, in document order: p01…, k01, m01… — the scheme of aec26-types.ts. */
function numberItems(prefix: string, parsed: readonly ParsedItem[], source: string): PrivateItem[] {
  const counters: Record<string, number> = {};
  const letter: Record<string, string> = {
    heading: 'h',
    paragraph: 'p',
    key_measure: 'k',
    measure: 'm',
  };
  return parsed.map((p) => {
    const l = letter[p.kind];
    if (l === undefined) throw new ParseError26(source, `cannot number a ${p.kind} at top level`);
    const n = (counters[l] ?? 0) + 1;
    counters[l] = n;
    return toPrivateItem(`${prefix}-${l}${pad2(n)}`, p, source);
  });
}

/** Every item of a list, sub-measures included, in reading order. */
export function flatItems(items: readonly PrivateItem[]): PrivateItem[] {
  return items.flatMap((i) => [i, ...(i.subMeasures ?? [])]);
}

function characterAnomaly(kind: string, what: string, ids: readonly string[]): Anomaly26[] {
  if (ids.length === 0) return [];
  return [
    {
      page: '*',
      kind,
      fingerprint: sha256(ids.join(',')).slice(0, 16),
      note: `${what} in ${String(ids.length)} item(s): ${ids.join(', ')}`,
    },
  ];
}

export interface CorpusInput {
  toc: Toc;
  /** Page id (`p0`, `p3`, `p3c2`, `discover`…) → stored HTML. */
  pages: ReadonlyMap<string, string>;
  log: FetchLog;
  siteOrigin: string;
}

function pageRef(log: FetchLog, id: string): PageRef {
  const page = log.pages.find((p) => p.id === id);
  if (page === undefined) throw new Error(`fetch log has no page "${id}"`);
  return { url: page.url, file: page.file, sha256: page.sha256 };
}

function html(input: CorpusInput, id: string): string {
  const body = input.pages.get(id);
  if (body === undefined) throw new Error(`crawl has no page "${id}"`);
  return body;
}

function sameUrl(a: string | null, b: string): boolean {
  return a !== null && a.replace(/\/$/, '') === b.replace(/\/$/, '');
}

export function buildCorpus(input: CorpusInput): PrivateCorpus {
  const { toc, log } = input;
  const failures: string[] = [];
  const fail = (message: string): void => {
    failures.push(message);
  };

  // --- introduction
  const introRef = pageRef(log, 'p0');
  const intro = parseIntroductionPage(html(input, 'p0'), 'p0');
  if (!sameUrl(intro.canonical, introRef.url)) fail(`p0: canonical is ${String(intro.canonical)}`);
  const introduction: PrivateCorpus['introduction'] = {
    id: 'p0',
    title: intro.title,
    url: introRef.url,
    items: numberItems('p0', intro.items, 'p0'),
    page: introRef,
  };

  // --- parts and chapters
  const parts: PrivateCorpus['parts'] = [];
  const chapters: PrivateCorpus['chapters'] = [];
  const sections: PrivateSection[] = [];

  toc.parts.forEach((tocPart, partIndex) => {
    const partRef = pageRef(log, tocPart.id);
    const part = parsePartPage(html(input, tocPart.id), tocPart.id);
    if (part.slug !== tocPart.slug) fail(`${tocPart.id}: slug ${part.slug} ≠ ${tocPart.slug}`);
    if (part.title !== tocPart.title) fail(`${tocPart.id}: title differs from the landing page`);
    if (!sameUrl(part.canonical, partRef.url))
      fail(`${tocPart.id}: canonical ${String(part.canonical)}`);
    parts.push({
      id: tocPart.id,
      order: partIndex + 1,
      slug: tocPart.slug,
      title: part.title,
      url: partRef.url,
      chapterIds: tocPart.chapters.map((c) => c.id),
      items: numberItems(tocPart.id, part.paragraphs, tocPart.id),
      page: partRef,
    });

    for (const tocChapter of tocPart.chapters) {
      const ref = pageRef(log, tocChapter.id);
      const chapter = parseChapterPage(html(input, tocChapter.id), tocChapter.id);
      if (chapter.partSlug !== tocPart.slug) fail(`${tocChapter.id}: in part ${chapter.partSlug}`);
      if (chapter.partTitle !== tocPart.title) fail(`${tocChapter.id}: part title differs`);
      if (chapter.number !== tocChapter.number)
        fail(`${tocChapter.id}: numbered ${String(chapter.number)}`);
      if (chapter.title !== tocChapter.title)
        fail(`${tocChapter.id}: title differs from the landing page`);
      if (!sameUrl(chapter.canonical, ref.url))
        fail(`${tocChapter.id}: canonical ${String(chapter.canonical)}`);

      const chapterSections = chapter.sections.map((s, index): PrivateSection => {
        const id = `${tocChapter.id}-s${pad2(index + 1)}`;
        const items = numberItems(id, s.items, id);
        const contentHash = sha256(
          JSON.stringify([s.title, s.anchor, ...flatItems(items).map((i) => [i.kind, i.hash])]),
        );
        return {
          id,
          chapterId: tocChapter.id,
          partId: tocPart.id,
          position: index + 1,
          anchor: s.anchor,
          title: s.title,
          url: `${ref.url}#${s.anchor}`,
          contentHash,
          items,
        };
      });

      // The part page states the same sections, independently: same anchors, same titles,
      // same order. Its chapter links (no anchor) must carry the chapter's title.
      const stated = part.toc.filter((e) => e.chapter === tocChapter.number);
      const chapterLink = stated.filter((e) => e.anchor === null);
      const sectionLinks = stated.filter((e) => e.anchor !== null);
      if (chapterLink.length !== 1 || chapterLink[0]?.title !== chapter.title) {
        fail(`${tocChapter.id}: the part page does not link the chapter once, by its title`);
      }
      const a = JSON.stringify(sectionLinks.map((e) => [e.anchor, e.title]));
      const b = JSON.stringify(chapterSections.map((s) => [s.anchor, s.title]));
      if (a !== b) {
        fail(
          `${tocChapter.id}: the part page lists ${String(sectionLinks.length)} section(s), the ` +
            `chapter page has ${String(chapterSections.length)}, or their anchors/titles differ`,
        );
      }

      chapters.push({
        id: tocChapter.id,
        partId: tocPart.id,
        number: tocChapter.number,
        title: chapter.title,
        url: ref.url,
        sectionIds: chapterSections.map((s) => s.id),
        items: chapter.intro.map((p, index) =>
          toPrivateItem(`${tocChapter.id}-p${pad2(index + 1)}`, p, tocChapter.id),
        ),
        page: ref,
      });
      sections.push(...chapterSections);
    }
    // No link of the part page may point at a chapter the landing page does not know.
    const known = new Set(tocPart.chapters.map((c) => c.number));
    if (part.toc.some((e) => !known.has(e.chapter)))
      fail(`${tocPart.id}: links to an unknown chapter`);
  });

  // --- identifiers and text hygiene
  const all: PrivateItem[] = [
    ...flatItems(introduction.items),
    ...parts.flatMap((p) => flatItems(p.items)),
    ...chapters.flatMap((c) => flatItems(c.items)),
    ...sections.flatMap((s) => flatItems(s.items)),
  ];
  const ids = [
    'p0',
    ...parts.map((p) => p.id),
    ...chapters.map((c) => c.id),
    ...sections.map((s) => s.id),
    ...all.map((i) => i.id),
  ];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(`duplicate id ${id}`);
    seen.add(id);
    if (id !== 'p0' && !isId26(id)) fail(`id outside the grammar: ${id}`);
  }
  for (const s of sections) if (!ID26.section.test(s.id)) fail(`not a section id: ${s.id}`);
  const invisible = all.filter((i) => INVISIBLE.test(i.raw)).map((i) => i.id);
  const control = all.filter((i) => CONTROL.test(i.raw)).map((i) => i.id);
  const decomposed = all.filter((i) => i.raw !== i.raw.normalize('NFC')).map((i) => i.id);

  // --- counts
  const sectionItems = sections.flatMap((s) => flatItems(s.items));
  const of = (kind: string): number => sectionItems.filter((i) => i.kind === kind).length;
  const counts: Counts26 = {
    parts: parts.length,
    chapters: chapters.length,
    sections: sections.length,
    key_measures: of('key_measure'),
    measures: of('measure'),
    sub_measures: of('sub_measure'),
    propositions: sectionItems.filter((i) => PROPOSITION_KINDS.includes(i.kind)).length,
    section_paragraphs: of('paragraph'),
    sections_without_key_measure: sections.filter(
      (s) => !s.items.some((i) => i.kind === 'key_measure'),
    ).length,
    sections_multi_paragraph: sections.filter(
      (s) => s.items.filter((i) => i.kind === 'paragraph').length > 1,
    ).length,
    measures_with_sub_measures: sectionItems.filter((i) => (i.subMeasures?.length ?? 0) > 0).length,
    introduction_headings: introduction.items.filter((i) => i.kind === 'heading').length,
    introduction_paragraphs: introduction.items.filter((i) => i.kind === 'paragraph').length,
    part_paragraphs: parts.reduce((n, p) => n + p.items.length, 0),
    chapter_paragraphs: chapters.reduce((n, c) => n + c.items.length, 0),
  };

  // --- the official count (D15.11)
  const official = parseOfficialCount(html(input, 'discover'));
  if (official === null) fail('the "Découvrir" page no longer announces a number of measures');
  else if (official !== counts.propositions) {
    fail(
      `the site announces ${String(official)} measures, the extraction finds ${String(counts.propositions)}`,
    );
  }

  if (failures.length > 0) {
    throw new Error(`INGESTION FAILED (${String(failures.length)}):\n- ${failures.join('\n- ')}`);
  }

  const corpusVersion = sha256(
    [
      ...flatItems(introduction.items).map((i) => i.hash),
      ...parts.flatMap((p) => p.items.map((i) => i.hash)),
      ...chapters.flatMap((c) => c.items.map((i) => i.hash)),
      ...sections.map((s) => s.contentHash),
    ].join(''),
  ).slice(0, 16);

  return {
    meta: {
      edition: '2026',
      source: `${input.siteOrigin}/programme/livre/`,
      crawl_stamp: log.stamp,
      crawled_at: log.started_at,
      corpus_version: corpusVersion,
      counts,
      official_count: official ?? 0,
      official_count_source: `${input.siteOrigin}/programme/decouvrir/`,
      license: 'all-rights-reserved',
      anomalies: [
        ...chapters
          .filter((c) => c.items.length > 0)
          .map((c) => ({
            page: c.id,
            kind: 'chapter_introduction',
            fingerprint: sha256(c.items.map((i) => i.hash).join('')).slice(0, 16),
            note: `${String(c.items.length)} paragraph(s) above the sections, in main > section.chapitre`,
          })),
        // Kept as the source wrote them (no typo is ever corrected); listed so that nobody
        // discovers them through a hash that will not match a retyped sentence.
        ...characterAnomaly(
          'invisible_characters',
          'soft hyphen or zero-width character',
          invisible,
        ),
        ...characterAnomaly('control_characters', 'C0/C1 control character', control),
        ...characterAnomaly(
          'decomposed_characters',
          'text not in NFC (combining mark)',
          decomposed,
        ),
      ],
    },
    introduction,
    parts,
    chapters,
    sections,
  };
}

export interface ExpectedInvariants26 {
  counts: Counts26;
  chapters_per_part: number[];
  sections_per_chapter: Record<string, number>;
  sections_without_key_measure: string[];
  chapters_with_introduction: string[];
  official_count: number;
}

export function measureInvariants(corpus: PrivateCorpus): ExpectedInvariants26 {
  return {
    counts: corpus.meta.counts,
    chapters_per_part: corpus.parts.map((p) => p.chapterIds.length),
    sections_per_chapter: Object.fromEntries(
      corpus.chapters.map((c) => [c.id, c.sectionIds.length]),
    ),
    sections_without_key_measure: corpus.sections
      .filter((s) => !s.items.some((i) => i.kind === 'key_measure'))
      .map((s) => s.id),
    chapters_with_introduction: corpus.chapters.filter((c) => c.items.length > 0).map((c) => c.id),
    official_count: corpus.meta.official_count,
  };
}

/** Every difference between what was measured and what the repository expects. */
export function compareInvariants(
  measured: ExpectedInvariants26,
  expected: ExpectedInvariants26,
): string[] {
  const out: string[] = [];
  const walk = (a: unknown, b: unknown, path: string): void => {
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of keys) {
        walk(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
          `${path}.${key}`,
        );
      }
      return;
    }
    if (a !== b)
      out.push(`${path.slice(1)}: expected ${JSON.stringify(b)}, measured ${JSON.stringify(a)}`);
  };
  walk(measured, expected, '');
  return out;
}

// ---------------------------------------------------------------------------------------------
// Comparing two states of the book
// ---------------------------------------------------------------------------------------------

export interface CorpusDiff {
  /** Sections present on one side only, by official anchor (`chapterId#anchor`). */
  sectionsAdded: string[];
  sectionsRemoved: string[];
  /** Sections on both sides whose title, order or content changed. */
  sectionsChanged: string[];
  /** Items whose text is new, and items whose text is gone — counted, never shown. */
  itemsAdded: number;
  itemsRemoved: number;
  /**
   * Identifiers that no longer name the same sentence: the id exists on both sides with a
   * different hash, or exists on one side only. This is what breaks a pinned quotation.
   */
  idsMoved: string[];
  frontMatterChanged: string[];
}

/**
 * What changed between two ingestions. Sections are matched by their official anchor, not by
 * our positional id: an inserted section shifts every id after it, and reporting each of those
 * as "changed" would bury the one real change.
 */
export function diffCorpora(before: PrivateCorpus, after: PrivateCorpus): CorpusDiff {
  const key = (s: PrivateSection): string => `${s.chapterId}#${s.anchor}`;
  const old = new Map(before.sections.map((s) => [key(s), s]));
  const now = new Map(after.sections.map((s) => [key(s), s]));
  const hashes = (corpus: PrivateCorpus): Map<string, string> =>
    new Map(
      [
        ...flatItems(corpus.introduction.items),
        ...corpus.parts.flatMap((p) => flatItems(p.items)),
        ...corpus.chapters.flatMap((c) => flatItems(c.items)),
        ...corpus.sections.flatMap((s) => flatItems(s.items)),
      ].map((i) => [i.id, i.hash]),
    );
  const a = hashes(before);
  const b = hashes(after);
  const count = (from: Map<string, string>, to: Map<string, string>): number => {
    const there = new Set(to.values());
    return [...from.values()].filter((h) => !there.has(h)).length;
  };
  const front = (corpus: PrivateCorpus): Map<string, string> =>
    new Map([
      ['p0', sha256(corpus.introduction.items.map((i) => i.hash).join(''))],
      ...corpus.parts.map((p): [string, string] => [
        p.id,
        sha256(p.title + p.items.map((i) => i.hash).join('')),
      ]),
      ...corpus.chapters.map((c): [string, string] => [
        c.id,
        sha256(c.title + c.items.map((i) => i.hash).join('')),
      ]),
    ]);
  const frontBefore = front(before);
  const frontAfter = front(after);
  return {
    sectionsAdded: [...now.keys()].filter((k) => !old.has(k)),
    sectionsRemoved: [...old.keys()].filter((k) => !now.has(k)),
    sectionsChanged: [...now]
      .filter(([k, s]) => {
        const previous = old.get(k);
        return (
          previous !== undefined && (previous.contentHash !== s.contentHash || previous.id !== s.id)
        );
      })
      .map(([k]) => k),
    itemsAdded: count(b, a),
    itemsRemoved: count(a, b),
    idsMoved: [...new Set([...a.keys(), ...b.keys()])]
      .filter((id) => a.get(id) !== b.get(id))
      .sort(),
    frontMatterChanged: [...new Set([...frontBefore.keys(), ...frontAfter.keys()])].filter(
      (id) => frontBefore.get(id) !== frontAfter.get(id),
    ),
  };
}

export function isEmptyDiff(diff: CorpusDiff): boolean {
  return (
    diff.sectionsAdded.length + diff.sectionsRemoved.length + diff.sectionsChanged.length === 0 &&
    diff.itemsAdded + diff.itemsRemoved === 0 &&
    diff.idsMoved.length + diff.frontMatterChanged.length === 0
  );
}
