/**
 * Canonical ingestion of "L'Avenir en commun, édition 2025" (https://melenchon2027.fr/programme2025/livre/).
 *
 * Algorithm (the only allowed one — the site's `/chapitreN/sM/` URLs are NOT hierarchical, so URL
 * patterns are never enumerated): landing `nav.tdm` → introduction + 4 part pages + 18 chapter pages
 * → each chapter's `nav.tdm` → its sections. Concurrency <= 4, one pass, canonical URLs only.
 *
 * Usage:
 *   npx tsx scripts/ingest.ts                  # crawl, validate against data/expected-invariants.json
 *   npx tsx scripts/ingest.ts --write-expected # first run: record the measured invariants
 *   npx tsx scripts/ingest.ts --rss            # also run the RSS cross-check afterwards
 *   npx tsx scripts/ingest.ts --out <path>     # write the dataset elsewhere (see `outputPathsFor`)
 *
 * Outputs (default): data/aec-2025.json, data/hashes.json, data/badge.json. With `--out <path>`
 * the dataset goes to `<path>` and its companions next to it as `<stem>.hashes.json` and
 * `<stem>.badge.json`, so a candidate corpus never overwrites the committed one (scripts/diff.ts
 * compares the two; the weekly GitHub Actions job promotes the candidate through a pull request).
 * The expected-invariants file is always the committed one, whatever `--out` says.
 *
 * Text is stored verbatim (CC BY-NC-SA 4.0, attribution "La France insoumise – L'Avenir en commun").
 * The parsers are exported so tests can run them on fixtures without crawling.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { NodeType, parse, type HTMLElement, type Node } from 'node-html-parser';
import {
  ATTRIBUTION,
  BOOK_URL,
  LICENSE,
  MAX_CONCURRENCY,
  canonicalUrl,
  fetchDocument,
  fetchStats,
  fetchText,
  mapWithConcurrency,
  normalizeHtml,
  normalizeText,
  pad2,
  sha256,
} from './aec-common.js';
import type {
  BadgeFile,
  Chapter,
  Chiffre,
  Counts,
  Dataset,
  DuplicateProposition,
  Epigraph,
  ExpectedInvariants,
  HashesFile,
  Introduction,
  KeyMeasure,
  Measure,
  Paragraph,
  Part,
  Section,
  SectionItem,
  SourceAnomaly,
  SubMeasure,
} from './aec-types.js';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = resolve(ROOT_DIR, 'data');
export const DATASET_PATH = resolve(DATA_DIR, 'aec-2025.json');
export const HASHES_PATH = resolve(DATA_DIR, 'hashes.json');
export const BADGE_PATH = resolve(DATA_DIR, 'badge.json');
export const EXPECTED_PATH = resolve(DATA_DIR, 'expected-invariants.json');

export interface OutputPaths {
  dataset: string;
  hashes: string;
  badge: string;
}

/**
 * Where a run writes its three files. Without `--out` the committed locations are used; with
 * `--out <path>` the companions sit next to the dataset, named after its stem
 * (`/tmp/x/aec-2025.json` → `/tmp/x/aec-2025.hashes.json`, `/tmp/x/aec-2025.badge.json`).
 */
export function outputPathsFor(datasetPath: string | undefined): OutputPaths {
  if (datasetPath === undefined) {
    return { dataset: DATASET_PATH, hashes: HASHES_PATH, badge: BADGE_PATH };
  }
  const dataset = resolve(datasetPath);
  const dir = dirname(dataset);
  const stem = basename(dataset).replace(/\.json$/i, '');
  return {
    dataset,
    hashes: resolve(dir, `${stem}.hashes.json`),
    badge: resolve(dir, `${stem}.badge.json`),
  };
}

/** First 16 hex chars of SHA-256 over all section hashes concatenated in reading order. */
export function computeCorpusVersion(sections: readonly Pick<Section, 'hash'>[]): string {
  return sha256(sections.map((s) => s.hash).join('')).slice(0, 16);
}

/** shields.io endpoint badge "corpus à jour au <date>", date = UTC day of the crawl. */
export function badgeFor(dataset: Pick<Dataset, 'meta'>): BadgeFile {
  return {
    schemaVersion: 1,
    label: 'corpus à jour au',
    message: dataset.meta.crawled_at.slice(0, 10),
    color: 'brightgreen',
  };
}

const BOOK_PATH = '/programme2025/livre/';
const OFFICIAL_COUNT = 831;
const ID_SCHEME =
  'Chapitre "c{N}" (N = numéro de chapitre, 1..18) ; section "c{N}-s{MM}" (MM = numéro du slug sM, ' +
  'sur 2 chiffres) ; dans une section, numérotation par nature et dans l’ordre du document : ' +
  'paragraphe "c{N}-s{MM}-p{PP}", mesure clé "c{N}-s{MM}-k{KK}", mesure "c{N}-s{MM}-m{MM}", ' +
  'sous-mesure "c{N}-s{MM}-m{MM}.s{S}" (rattachée à la mesure qui la précède), ' +
  'encadré « À savoir » "c{N}-s{MM}-a{AA}". Parties "part{1..4}" (paragraphes "part{X}-p{PP}", ' +
  'épigraphes "part{X}-e{EE}"), introduction "intro" (paragraphes "intro-p{PP}"). ' +
  'Chaque item porte le SHA-256 de son texte normalisé ; chaque section le SHA-256 de son HTML normalisé.';

// ---------------------------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------------------------

export class ParseError extends Error {
  constructor(source: string, message: string) {
    super(`${source}: ${message}`);
    this.name = 'ParseError';
  }
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

/** Element children of a node, ignoring whitespace-only text nodes; any other text node is an error. */
function elementChildren(parent: HTMLElement, source: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const child of parent.childNodes) {
    if (isElement(child)) {
      out.push(child);
    } else if (child.text.trim() !== '') {
      throw new ParseError(source, `unexpected text node "${child.text.trim().slice(0, 60)}"`);
    }
  }
  return out;
}

function requireOne(root: HTMLElement, selector: string, source: string): HTMLElement {
  const found = root.querySelectorAll(selector);
  const first = found[0];
  if (found.length !== 1 || first === undefined) {
    throw new ParseError(source, `expected exactly 1 "${selector}", found ${String(found.length)}`);
  }
  return first;
}

function classes(el: HTMLElement): string[] {
  return (el.getAttribute('class') ?? '').split(/\s+/).filter((c) => c !== '');
}

/** The part slug carried by `<main class="section <part-slug>">` / `<main class="chapitre <part-slug>">`. */
function partSlugOf(main: HTMLElement, source: string): string {
  const [, slug, ...rest] = classes(main);
  if (slug === undefined || rest.length > 0) {
    throw new ParseError(
      source,
      `cannot read the part slug from main class "${classes(main).join(' ')}"`,
    );
  }
  return slug;
}

function requireHref(a: HTMLElement, source: string): string {
  const href = a.getAttribute('href');
  if (href === undefined || href === '') throw new ParseError(source, 'link without href');
  return href;
}

function textOf(el: HTMLElement): string {
  return normalizeText(el.text);
}

function textItem(
  id: string,
  el: HTMLElement,
  source: string,
): { id: string; text: string; hash: string } {
  const text = textOf(el);
  if (text === '') throw new ParseError(source, `empty text for ${id}`);
  return { id, text, hash: sha256(text) };
}

function paragraphItem(id: string, el: HTMLElement, source: string): Paragraph {
  return { kind: 'paragraph', ...textItem(id, el, source), html: normalizeHtml(el.innerHTML) };
}

// ---------------------------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------------------------

export type LandingEntryKind = 'introduction' | 'part' | 'chapter';

export interface LandingEntry {
  kind: LandingEntryKind;
  slug: string;
  title: string;
  url: string;
}

const CHAPTER_SLUG = /^chapitre(\d{1,2})$/;
const SECTION_SLUG = /^s(\d{1,2})$/;

/** `main.livre nav.tdm` → reading-order list of introduction, parts and chapters. */
export function parseLandingPage(html: string, source = 'landing'): LandingEntry[] {
  const root = parse(html);
  const main = requireOne(root, 'main.livre', source);
  const nav = requireOne(main, 'nav.tdm', source);
  const entries: LandingEntry[] = [];
  for (const a of nav.querySelectorAll('a')) {
    const href = requireHref(a, source);
    const url = canonicalUrl(href);
    const path = new URL(url).pathname;
    if (!path.startsWith(BOOK_PATH)) throw new ParseError(source, `link outside the book: ${href}`);
    const slug = path.slice(BOOK_PATH.length).replace(/\/$/, '');
    if (slug === '' || slug.includes('/'))
      throw new ParseError(source, `unexpected landing link ${href}`);
    const kind: LandingEntryKind =
      slug === 'introduction' ? 'introduction' : CHAPTER_SLUG.test(slug) ? 'chapter' : 'part';
    entries.push({ kind, slug, title: textOf(a), url });
  }
  return entries;
}

// ---------------------------------------------------------------------------------------------
// Chapter page
// ---------------------------------------------------------------------------------------------

export interface ParsedChapter {
  title: string;
  partSlug: string;
  sections: { slug: string; number: number; title: string; url: string }[];
}

/** `main.chapitre` → title, part slug and the chapter's own sections (its `nav.tdm`). */
export function parseChapterPage(
  html: string,
  chapterSlug: string,
  source = chapterSlug,
): ParsedChapter {
  const root = parse(html);
  const main = requireOne(root, 'main.chapitre', source);
  const title = textOf(requireOne(main, 'h1', source));
  const partSlug = partSlugOf(main, source);
  const nav = requireOne(main, 'nav.tdm', source);
  const sections: ParsedChapter['sections'] = [];
  for (const a of nav.querySelectorAll('a')) {
    const href = requireHref(a, source);
    const url = canonicalUrl(href);
    const expectedPrefix = `${BOOK_PATH}${chapterSlug}/`;
    const path = new URL(url).pathname;
    if (!path.startsWith(expectedPrefix)) {
      throw new ParseError(source, `section link ${href} is not under ${expectedPrefix}`);
    }
    const slug = path.slice(expectedPrefix.length).replace(/\/$/, '');
    const match = SECTION_SLUG.exec(slug);
    if (!match || match[1] === undefined)
      throw new ParseError(source, `unexpected section slug "${slug}"`);
    sections.push({ slug, number: Number(match[1]), title: textOf(a), url });
  }
  return { title, partSlug, sections };
}

// ---------------------------------------------------------------------------------------------
// Section page (also used on RSS `content:encoded`, which embeds the same markup)
// ---------------------------------------------------------------------------------------------

export interface ParsedSection {
  title: string;
  partSlug: string;
  hash: string;
  items: SectionItem[];
  chiffres: Chiffre[];
  /** `<link rel="canonical">` of the page, null on fragments (RSS content). */
  canonicalUrl: string | null;
  /** Href of `nav.tdm a.actuelle`, i.e. the book-navigation URL of this section (null if absent). */
  currentHref: string | null;
  /** Non-fatal deviations from the expected markup, for the anomaly report. */
  warnings: string[];
}

function hasInlineMarkup(el: HTMLElement): boolean {
  return el.childNodes.some((n) => isElement(n));
}

/** Parse one section: `main.section` > `h1.section` + `section.contenu` [+ `section.chiffres`]. */
export function parseSectionPage(
  html: string,
  sectionId: string,
  source = sectionId,
): ParsedSection {
  const root = parse(html);
  const main = requireOne(root, 'main.section', source);
  const title = textOf(requireOne(main, 'h1.section', source));
  const partSlug = partSlugOf(main, source);
  const contenu = requireOne(main, 'section.contenu', source);
  const chiffresSections = main.querySelectorAll('section.chiffres');
  if (chiffresSections.length > 1) {
    throw new ParseError(
      source,
      `expected at most 1 section.chiffres, found ${String(chiffresSections.length)}`,
    );
  }
  const chiffresSection = chiffresSections[0];
  const warnings: string[] = [];

  const items: SectionItem[] = [];
  let paragraphs = 0;
  let keyMeasures = 0;
  let measures = 0;
  let lastMeasure: Measure | undefined;

  for (const el of elementChildren(contenu, source)) {
    const cls = classes(el);
    const where = `${sectionId} <${el.tagName.toLowerCase()} class="${cls.join(' ')}">`;
    if (el.tagName === 'P' && cls.includes('wp-block-paragraph')) {
      paragraphs += 1;
      items.push(paragraphItem(`${sectionId}-p${pad2(paragraphs)}`, el, where));
      lastMeasure = undefined;
    } else if (el.tagName === 'DIV' && cls.includes('mesure-cle')) {
      keyMeasures += 1;
      const item: KeyMeasure = {
        kind: 'key_measure',
        ...textItem(`${sectionId}-k${pad2(keyMeasures)}`, el, where),
      };
      if (hasInlineMarkup(el))
        warnings.push(`${item.id}: key measure contains inline markup (stripped)`);
      items.push(item);
      lastMeasure = undefined;
    } else if (el.tagName === 'DIV' && cls.includes('mesure')) {
      measures += 1;
      const item: Measure = {
        kind: 'measure',
        ...textItem(`${sectionId}-m${pad2(measures)}`, el, where),
      };
      if (hasInlineMarkup(el))
        warnings.push(`${item.id}: measure contains inline markup (stripped)`);
      items.push(item);
      lastMeasure = item;
    } else if (el.tagName === 'DIV' && cls.includes('sous-mesure')) {
      if (lastMeasure === undefined) {
        throw new ParseError(where, 'sub-measure without a preceding measure');
      }
      const subs = lastMeasure.subMeasures ?? [];
      const sub: SubMeasure = {
        kind: 'sub_measure',
        ...textItem(`${lastMeasure.id}.s${String(subs.length + 1)}`, el, where),
      };
      if (hasInlineMarkup(el))
        warnings.push(`${sub.id}: sub-measure contains inline markup (stripped)`);
      subs.push(sub);
      lastMeasure.subMeasures = subs;
    } else {
      throw new ParseError(where, 'unexpected element in section.contenu');
    }
  }

  const chiffres: Chiffre[] = [];
  if (chiffresSection !== undefined) {
    const heading = chiffresSection.querySelector('h2');
    if (heading === null || textOf(heading) !== 'À savoir') {
      warnings.push(`${sectionId}: section.chiffres heading is not "À savoir"`);
    }
    for (const div of chiffresSection.querySelectorAll('div.chiffre')) {
      const item: Chiffre = {
        kind: 'chiffre',
        ...textItem(`${sectionId}-a${pad2(chiffres.length + 1)}`, div, `${sectionId} div.chiffre`),
      };
      if (hasInlineMarkup(div))
        warnings.push(`${item.id}: chiffre contains inline markup (stripped)`);
      chiffres.push(item);
    }
    if (chiffres.length === 0) warnings.push(`${sectionId}: section.chiffres without div.chiffre`);
  }

  const hash = sha256(
    `${normalizeHtml(contenu.innerHTML)}\n${chiffresSection ? normalizeHtml(chiffresSection.innerHTML) : ''}`,
  );
  const canonicalHref = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const canonical =
    canonicalHref !== undefined && canonicalHref !== '' ? canonicalUrl(canonicalHref) : null;
  const currentLinks = root.querySelectorAll('nav.tdm a.actuelle');
  const current = currentLinks[0];
  if (currentLinks.length > 1) warnings.push(`${sectionId}: several nav.tdm a.actuelle links`);
  const currentHref = current === undefined ? null : canonicalUrl(requireHref(current, source));
  return { title, partSlug, hash, items, chiffres, canonicalUrl: canonical, currentHref, warnings };
}

/** Content-only fingerprint of a section (title + every text), independent of markup details. */
export function sectionFingerprint(
  parsed: Pick<ParsedSection, 'title' | 'items' | 'chiffres'>,
): string {
  const texts: string[] = [parsed.title];
  for (const item of parsed.items) {
    texts.push(item.text);
    if (item.kind === 'measure') for (const sub of item.subMeasures ?? []) texts.push(sub.text);
  }
  for (const c of parsed.chiffres) texts.push(c.text);
  return sha256(JSON.stringify(texts));
}

// ---------------------------------------------------------------------------------------------
// Introduction and part pages
// ---------------------------------------------------------------------------------------------

export interface ParsedProse {
  title: string;
  epigraphs: Epigraph[];
  paragraphs: Paragraph[];
  /** Chapter urls listed in the page's `nav.tdm` (parts only, empty for the introduction). */
  chapterUrls: string[];
  /** Non-fatal deviations from the expected markup, for the anomaly report. */
  warnings: string[];
}

/**
 * Prose of the introduction / part pages: `main > section` holding `<p>` paragraphs and
 * `<blockquote>` epigraphs. Some pages use raw `<p>` without the `wp-block-paragraph` class and
 * leave WordPress block comments behind (comments are dropped by the parser); both are tolerated
 * and reported as warnings.
 */
function parseProse(
  main: HTMLElement,
  idPrefix: string,
  source: string,
): Pick<ParsedProse, 'epigraphs' | 'paragraphs' | 'warnings'> {
  const body = requireOne(main, ':scope > section', source);
  const epigraphs: Epigraph[] = [];
  const paragraphs: Paragraph[] = [];
  const warnings: string[] = [];
  for (const el of elementChildren(body, source)) {
    const cls = classes(el);
    if (el.tagName === 'P') {
      const item = paragraphItem(`${idPrefix}-p${pad2(paragraphs.length + 1)}`, el, source);
      if (!cls.includes('wp-block-paragraph'))
        warnings.push(`${item.id}: <p> without wp-block-paragraph class`);
      paragraphs.push(item);
    } else if (el.tagName === 'BLOCKQUOTE') {
      const quoteParagraphs = el.querySelectorAll('p');
      const cite = el.querySelector('cite');
      if (quoteParagraphs.length === 0 || cite === null) {
        throw new ParseError(source, 'blockquote without <p> or <cite>');
      }
      const text = normalizeText(quoteParagraphs.map((p) => p.text).join(' '));
      const id = `${idPrefix}-e${pad2(epigraphs.length + 1)}`;
      if (text === '') throw new ParseError(source, `empty epigraph ${id}`);
      if (!cls.includes('wp-block-quote'))
        warnings.push(`${id}: <blockquote> without wp-block-quote class`);
      if (/—\s*[^—]*$/.test(text) && text.trimEnd().endsWith(',')) {
        warnings.push(`${id}: attribution seems to sit inside the quote text, not in <cite>`);
      }
      epigraphs.push({ kind: 'epigraph', id, text, hash: sha256(text), cite: textOf(cite) });
    } else {
      throw new ParseError(
        source,
        `unexpected <${el.tagName.toLowerCase()} class="${cls.join(' ')}">`,
      );
    }
  }
  return { epigraphs, paragraphs, warnings };
}

/** `main.introduction` → title + paragraphs. */
export function parseIntroductionPage(html: string, source = 'introduction'): ParsedProse {
  const root = parse(html);
  const main = requireOne(root, 'main.introduction', source);
  const title = textOf(requireOne(main, 'h1', source));
  return { title, ...parseProse(main, 'intro', source), chapterUrls: [] };
}

/** `main.partie` → title, epigraphs, paragraphs and the chapters it lists. */
export function parsePartPage(html: string, partId: string, source = partId): ParsedProse {
  const root = parse(html);
  const main = requireOne(root, 'main.partie', source);
  const title = textOf(requireOne(main, 'h1', source));
  const nav = requireOne(main, 'nav.tdm', source);
  const chapterUrls = nav
    .querySelectorAll('div.chapitre > h2 > a')
    .map((a) => canonicalUrl(requireHref(a, source)));
  return { title, ...parseProse(main, partId, source), chapterUrls };
}

// ---------------------------------------------------------------------------------------------
// Dataset assembly, invariants, reporting
// ---------------------------------------------------------------------------------------------

function fail(message: string): never {
  console.error(`\nINGESTION FAILED: ${message}\n`);
  process.exit(1);
}

export function computeCounts(
  dataset: Pick<Dataset, 'parts' | 'chapters' | 'sections' | 'introduction'>,
): Counts {
  const counts: Counts = {
    parts: dataset.parts.length,
    chapters: dataset.chapters.length,
    sections: dataset.sections.length,
    mesure_cle: 0,
    mesure: 0,
    sous_mesure: 0,
    propositions: 0,
    chiffres: 0,
    paragraphs: 0,
    sections_without_mesure_cle: 0,
    sections_without_chiffre: 0,
    sections_multi_paragraph: 0,
    sections_with_sous_mesure: 0,
    introduction_paragraphs: dataset.introduction.paragraphs.length,
    part_paragraphs: dataset.parts.reduce((n, p) => n + p.paragraphs.length, 0),
    part_epigraphs: dataset.parts.reduce((n, p) => n + p.epigraphs.length, 0),
    source_anomalies: detectSourceAnomalies(dataset.sections).length,
  };
  for (const section of dataset.sections) {
    let keys = 0;
    let paragraphs = 0;
    let subs = 0;
    for (const item of section.items) {
      switch (item.kind) {
        case 'paragraph':
          paragraphs += 1;
          break;
        case 'key_measure':
          keys += 1;
          break;
        case 'measure':
          counts.mesure += 1;
          subs += item.subMeasures?.length ?? 0;
          break;
      }
    }
    counts.mesure_cle += keys;
    counts.paragraphs += paragraphs;
    counts.sous_mesure += subs;
    counts.chiffres += section.chiffres.length;
    if (keys === 0) counts.sections_without_mesure_cle += 1;
    if (section.chiffres.length === 0) counts.sections_without_chiffre += 1;
    if (paragraphs > 1) counts.sections_multi_paragraph += 1;
    if (subs > 0) counts.sections_with_sous_mesure += 1;
  }
  counts.propositions = counts.mesure_cle + counts.mesure + counts.sous_mesure;
  return counts;
}

export function sectionsPerChapter(chapters: Chapter[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const chapter of chapters) out[chapter.id] = chapter.sectionIds.length;
  return out;
}

/** Identical normalized proposition texts that appear in at least two different sections. */
export function findDuplicatePropositions(sections: Section[]): DuplicateProposition[] {
  const byHash = new Map<string, { text: string; ids: string[]; sectionIds: Set<string> }>();
  const add = (sectionId: string, item: { id: string; text: string; hash: string }): void => {
    const entry = byHash.get(item.hash) ?? {
      text: item.text,
      ids: [],
      sectionIds: new Set<string>(),
    };
    entry.ids.push(item.id);
    entry.sectionIds.add(sectionId);
    byHash.set(item.hash, entry);
  };
  for (const section of sections) {
    for (const item of section.items) {
      if (item.kind === 'paragraph') continue;
      add(section.id, item);
      if (item.kind === 'measure') for (const sub of item.subMeasures ?? []) add(section.id, sub);
    }
  }
  return [...byHash.entries()]
    .filter(([, entry]) => entry.sectionIds.size >= 2)
    .map(([hash, entry]) => ({ hash, text: entry.text, ids: entry.ids }));
}

/**
 * Paragraphs that follow a proposition deviate from the regular schema (argument paragraphs come
 * first). Fixed rules classify them; nothing is rewritten.
 */
export function detectSourceAnomalies(sections: Section[]): SourceAnomaly[] {
  const anomalies: SourceAnomaly[] = [];
  for (const section of sections) {
    let lastPropositionId: string | null = null;
    for (const item of section.items) {
      if (item.kind !== 'paragraph') {
        const subs = item.kind === 'measure' ? (item.subMeasures ?? []) : [];
        lastPropositionId = subs[subs.length - 1]?.id ?? item.id;
        continue;
      }
      if (lastPropositionId === null) continue;
      const isHeading = /^<strong>[^<]*<\/strong>$/.test(item.html) && item.text.endsWith(':');
      const isStatistic = /^\d+(?:[,.]\d+)? %/.test(item.text);
      const startsMidSentence = /^[\p{Ll})\],;]/u.test(item.text);
      let kind: SourceAnomaly['kind'];
      if (isHeading) kind = 'heading_paragraph';
      else if (isStatistic) kind = 'statistic_as_paragraph';
      else if (startsMidSentence) kind = 'measure_split';
      else kind = 'prose_after_measures';
      anomalies.push({
        id: item.id,
        kind,
        relatedId: kind === 'measure_split' ? lastPropositionId : null,
      });
    }
  }
  return anomalies;
}

function countingRuleFr(counts: Counts, paragraphId: string): string {
  const withoutSubs = counts.mesure_cle + counts.mesure;
  return (
    `Le programme annonce officiellement « ${String(OFFICIAL_COUNT)} mesures » (phrase de l’introduction de ` +
    `l’édition 2025, conservée mot pour mot dans introduction.paragraphs, id ${paragraphId}). ` +
    `Ce jeu de données ne compte pas des mesures mais des blocs HTML publiés : ${String(counts.mesure_cle)} ` +
    `mesures clés (div.mesure-cle) + ${String(counts.mesure)} mesures (div.mesure) + ` +
    `${String(counts.sous_mesure)} sous-mesures (div.sous-mesure, puces rattachées à la mesure qui les ` +
    `précède) = ${String(counts.propositions)} propositions ; sans les sous-mesures, ${String(withoutSubs)} blocs. ` +
    (counts.propositions === OFFICIAL_COUNT || withoutSubs === OFFICIAL_COUNT
      ? 'L’une de ces sommes coïncide avec le chiffre officiel, mais la méthode de comptage des auteurs n’est pas publiée : la coïncidence ne vaut pas preuve. '
      : 'Aucune de ces sommes ne reproduit 831 : la méthode de comptage des auteurs n’est pas publiée, l’écart n’est donc ni une erreur du site ni une erreur du jeu de données. ') +
    `Règle d’affichage : l’app affiche uniquement le chiffre officiel « ${String(OFFICIAL_COUNT)} mesures » ` +
    `comme nombre de mesures du programme ; le nombre de propositions extraites (${String(counts.propositions)}) ` +
    `et ce mode de calcul n’apparaissent que sur la page méthodologie / exactitude, avec la version du corpus.`
  );
}

interface InvariantIssue {
  key: string;
  expected: number;
  measured: number;
}

export function compareInvariants(
  expected: ExpectedInvariants,
  measured: ExpectedInvariants,
): InvariantIssue[] {
  const issues: InvariantIssue[] = [];
  for (const key of Object.keys(expected.counts) as (keyof Counts)[]) {
    if (expected.counts[key] !== measured.counts[key]) {
      issues.push({
        key: `counts.${key}`,
        expected: expected.counts[key],
        measured: measured.counts[key],
      });
    }
  }
  const chapterIds = new Set([
    ...Object.keys(expected.sections_per_chapter),
    ...Object.keys(measured.sections_per_chapter),
  ]);
  for (const id of [...chapterIds].sort()) {
    const e = expected.sections_per_chapter[id] ?? -1;
    const m = measured.sections_per_chapter[id] ?? -1;
    if (e !== m) issues.push({ key: `sections_per_chapter.${id}`, expected: e, measured: m });
  }
  return issues;
}

/** Structural invariants that do not depend on the expected-invariants file. */
export function assertStructuralInvariants(dataset: Dataset): void {
  const problems: string[] = [];
  if (dataset.parts.length !== 4)
    problems.push(`expected 4 parts, got ${String(dataset.parts.length)}`);
  if (dataset.chapters.length !== 18)
    problems.push(`expected 18 chapters, got ${String(dataset.chapters.length)}`);
  for (const chapter of dataset.chapters) {
    if (chapter.sectionIds.length === 0) problems.push(`chapter ${chapter.id} has no section`);
  }
  const urls = new Set<string>();
  const canonicalUrls = new Set<string>();
  const ids = new Set<string>();
  const checkId = (id: string): void => {
    if (ids.has(id)) problems.push(`duplicate id ${id}`);
    ids.add(id);
  };
  for (const p of dataset.introduction.paragraphs) checkId(p.id);
  for (const part of dataset.parts) {
    checkId(part.id);
    for (const e of part.epigraphs) checkId(e.id);
    for (const p of part.paragraphs) checkId(p.id);
  }
  for (const chapter of dataset.chapters) checkId(chapter.id);
  for (const section of dataset.sections) {
    checkId(section.id);
    if (urls.has(section.url)) problems.push(`duplicate section url ${section.url}`);
    urls.add(section.url);
    if (canonicalUrls.has(section.canonicalUrl))
      problems.push(`duplicate canonical url ${section.canonicalUrl}`);
    canonicalUrls.add(section.canonicalUrl);
    let paragraphs = 0;
    let propositions = 0;
    for (const item of section.items) {
      checkId(item.id);
      if (item.kind === 'paragraph') paragraphs += 1;
      else propositions += 1;
      if (item.kind === 'measure') for (const sub of item.subMeasures ?? []) checkId(sub.id);
    }
    for (const c of section.chiffres) checkId(c.id);
    if (paragraphs === 0) problems.push(`section ${section.id} has no paragraph`);
    if (propositions === 0) problems.push(`section ${section.id} has no measure nor key measure`);
  }
  if (!dataset.introduction.paragraphs.some((p) => p.text.includes('831 mesures'))) {
    problems.push('introduction does not contain the official "831 mesures" sentence');
  }
  if (problems.length > 0) fail(`structural invariants violated:\n - ${problems.join('\n - ')}`);
}

// ---------------------------------------------------------------------------------------------
// Crawl
// ---------------------------------------------------------------------------------------------

interface ChapterPlan {
  chapter: Chapter;
  partSlug: string;
}

async function crawl(): Promise<{ dataset: Dataset; warnings: string[] }> {
  const t0 = Date.now();
  const warnings: string[] = [];
  const log = (msg: string): void => {
    console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s] ${msg}`);
  };

  log(`GET ${BOOK_URL}`);
  const entries = parseLandingPage(await fetchText(BOOK_URL));
  const introEntry = entries.filter((e) => e.kind === 'introduction');
  const partEntries = entries.filter((e) => e.kind === 'part');
  const chapterEntries = entries.filter((e) => e.kind === 'chapter');
  log(
    `landing nav.tdm: ${String(entries.length)} links (${String(introEntry.length)} introduction, ` +
      `${String(partEntries.length)} parts, ${String(chapterEntries.length)} chapters)`,
  );
  const intro = introEntry[0];
  if (introEntry.length !== 1 || intro === undefined)
    fail('landing nav must contain exactly one introduction link');
  if (partEntries.length !== 4)
    fail(`landing nav must contain exactly 4 part links, found ${String(partEntries.length)}`);
  if (chapterEntries.length !== 18)
    fail(
      `landing nav must contain exactly 18 chapter links, found ${String(chapterEntries.length)}`,
    );

  // Part membership = the part link preceding the chapter in the landing nav.
  const parts: Part[] = [];
  const chapterPlans: ChapterPlan[] = [];
  let currentPart: Part | undefined;
  for (const entry of entries) {
    if (entry.kind === 'part') {
      currentPart = {
        id: `part${String(parts.length + 1)}`,
        slug: entry.slug,
        title: entry.title,
        url: entry.url,
        order: parts.length + 1,
        chapterIds: [],
        epigraphs: [],
        paragraphs: [],
      };
      parts.push(currentPart);
    } else if (entry.kind === 'chapter') {
      if (currentPart === undefined)
        fail(`chapter ${entry.slug} appears before any part in the landing nav`);
      const match = CHAPTER_SLUG.exec(entry.slug);
      const number = Number(match?.[1]);
      if (!Number.isInteger(number) || number < 1) fail(`bad chapter slug ${entry.slug}`);
      const chapter: Chapter = {
        id: `c${String(number)}`,
        number,
        slug: entry.slug,
        title: entry.title,
        url: entry.url,
        partId: currentPart.id,
        sectionIds: [],
      };
      currentPart.chapterIds.push(chapter.id);
      chapterPlans.push({ chapter, partSlug: currentPart.slug });
    }
  }
  const expectedNumbers = chapterPlans.map((p) => p.chapter.number).join(',');
  const wantedNumbers = Array.from({ length: 18 }, (_, i) => i + 1).join(',');
  if (expectedNumbers !== wantedNumbers)
    fail(`chapters are not 1..18 in order: ${expectedNumbers}`);

  // Introduction, parts and chapters: 23 requests, concurrency <= 4.
  type Job =
    | { kind: 'introduction'; url: string }
    | { kind: 'part'; url: string; part: Part }
    | { kind: 'chapter'; url: string; plan: ChapterPlan };
  const jobs: Job[] = [
    { kind: 'introduction', url: intro.url },
    ...parts.map((part): Job => ({ kind: 'part', url: part.url, part })),
    ...chapterPlans.map((plan): Job => ({ kind: 'chapter', url: plan.chapter.url, plan })),
  ];
  let introduction: Introduction | undefined;
  const sectionPlans: {
    section: Omit<Section, 'canonicalUrl' | 'hash' | 'items' | 'chiffres'>;
    partSlug: string;
  }[] = [];
  const chapterResults = await mapWithConcurrency(jobs, MAX_CONCURRENCY, async (job) => {
    const html = await fetchText(job.url);
    log(`GET ${job.url}`);
    return { job, html };
  });
  for (const { job, html } of chapterResults) {
    switch (job.kind) {
      case 'introduction': {
        const parsed = parseIntroductionPage(html);
        warnings.push(...parsed.warnings);
        introduction = {
          id: 'intro',
          slug: 'introduction',
          title: parsed.title,
          url: job.url,
          paragraphs: parsed.paragraphs,
        };
        break;
      }
      case 'part': {
        const parsed = parsePartPage(html, job.part.id);
        warnings.push(...parsed.warnings);
        if (parsed.title !== job.part.title) {
          warnings.push(
            `${job.part.id}: page title "${parsed.title}" differs from landing title "${job.part.title}"`,
          );
        }
        job.part.epigraphs = parsed.epigraphs;
        job.part.paragraphs = parsed.paragraphs;
        const expectedChapterUrls = job.part.chapterIds.map(
          (id) => chapterPlans.find((p) => p.chapter.id === id)?.chapter.url ?? '',
        );
        if (JSON.stringify(parsed.chapterUrls) !== JSON.stringify(expectedChapterUrls)) {
          fail(
            `${job.part.id}: chapters listed on the part page differ from the landing nav membership`,
          );
        }
        break;
      }
      case 'chapter': {
        const { chapter, partSlug } = job.plan;
        const parsed = parseChapterPage(html, chapter.slug);
        if (parsed.partSlug !== partSlug) {
          fail(
            `${chapter.id}: main class says part "${parsed.partSlug}" but landing nav says "${partSlug}"`,
          );
        }
        if (parsed.title !== chapter.title) {
          warnings.push(
            `${chapter.id}: page title "${parsed.title}" differs from landing title "${chapter.title}"`,
          );
        }
        if (parsed.sections.length === 0) fail(`${chapter.id}: no section in nav.tdm`);
        for (const s of parsed.sections) {
          const sectionId = `${chapter.id}-s${pad2(s.number)}`;
          chapter.sectionIds.push(sectionId);
          sectionPlans.push({
            section: {
              id: sectionId,
              chapterId: chapter.id,
              partId: chapter.partId,
              number: s.number,
              slug: s.slug,
              title: s.title,
              url: s.url,
            },
            partSlug,
          });
        }
        break;
      }
    }
  }
  if (introduction === undefined) fail('introduction page missing');
  log(`chapters resolved: ${String(sectionPlans.length)} sections to fetch`);

  const redirectedSectionIds: string[] = [];
  const sections = await mapWithConcurrency(
    sectionPlans,
    MAX_CONCURRENCY,
    async ({ section, partSlug }) => {
      // One same-site redirect is tolerated: a few posts have a WordPress permalink that differs
      // from the book-navigation URL. The landed page must then prove it is the expected section.
      const { body: html, finalUrl } = await fetchDocument(section.url, 'text/html', 1);
      log(`GET ${section.url}${finalUrl !== section.url ? ` → ${finalUrl}` : ''}`);
      const parsed = parseSectionPage(html, section.id, section.url);
      if (parsed.partSlug !== partSlug)
        fail(`${section.id}: main class says part "${parsed.partSlug}", expected "${partSlug}"`);
      if (parsed.currentHref !== section.url) {
        fail(
          `${section.id}: landed page marks "${String(parsed.currentHref)}" as current, expected ${section.url}`,
        );
      }
      if (parsed.title !== section.title) {
        fail(
          `${section.id}: h1 "${parsed.title}" differs from chapter nav title "${section.title}"`,
        );
      }
      if (parsed.canonicalUrl === null) fail(`${section.id}: page without <link rel="canonical">`);
      if (parsed.canonicalUrl !== finalUrl) {
        fail(
          `${section.id}: <link rel="canonical"> ${parsed.canonicalUrl} differs from the fetched URL ${finalUrl}`,
        );
      }
      if (finalUrl !== section.url) {
        redirectedSectionIds.push(section.id);
        warnings.push(`${section.id}: ${section.url} redirected to canonical ${finalUrl}`);
      }
      warnings.push(...parsed.warnings);
      const full: Section = {
        ...section,
        title: parsed.title,
        canonicalUrl: parsed.canonicalUrl,
        hash: parsed.hash,
        items: parsed.items,
        chiffres: parsed.chiffres,
      };
      return full;
    },
  );

  const chapters = chapterPlans.map((p) => p.chapter);
  const counts = computeCounts({ parts, chapters, sections, introduction });
  const corpusVersion = computeCorpusVersion(sections);
  const officialParagraph = introduction.paragraphs.find((p) => p.text.includes('831 mesures'));
  const officialParagraphId = officialParagraph?.id ?? 'MISSING';
  const dataset: Dataset = {
    meta: {
      source: BOOK_URL,
      license: LICENSE,
      attribution: ATTRIBUTION,
      crawled_at: new Date().toISOString(),
      corpus_version: corpusVersion,
      counts,
      counting_rule_fr: countingRuleFr(counts, officialParagraphId),
      official_count: OFFICIAL_COUNT,
      official_count_paragraph_id: officialParagraphId,
      id_scheme: ID_SCHEME,
      duplicate_propositions: findDuplicatePropositions(sections),
      redirected_section_ids: redirectedSectionIds.sort(),
      source_anomalies: detectSourceAnomalies(sections),
    },
    introduction,
    parts,
    chapters,
    sections,
  };
  log(
    `crawl done: ${String(fetchStats.requests)} requests, ${String(fetchStats.retries)} retries, ${String(fetchStats.bytes)} bytes received`,
  );
  return { dataset, warnings };
}

// ---------------------------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------------------------

interface CliOptions {
  writeExpected: boolean;
  rss: boolean;
  out: OutputPaths;
}

function parseCli(argv: readonly string[]): CliOptions {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      'write-expected': { type: 'boolean', default: false },
      rss: { type: 'boolean', default: false },
      out: { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });
  return {
    writeExpected: values['write-expected'],
    rss: values.rss,
    out: outputPathsFor(values.out),
  };
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));
  const started = Date.now();
  const { dataset, warnings } = await crawl();
  assertStructuralInvariants(dataset);

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(dirname(cli.out.dataset), { recursive: true });
  const previous = existsSync(EXPECTED_PATH)
    ? (JSON.parse(readFileSync(EXPECTED_PATH, 'utf8')) as ExpectedInvariants)
    : null;
  const measured: ExpectedInvariants = {
    counts: dataset.meta.counts,
    sections_per_chapter: sectionsPerChapter(dataset.chapters),
    // The RSS allowlist is reviewed by hand, never measured: carry it over.
    rss_known_missing_section_ids: previous?.rss_known_missing_section_ids ?? [],
  };
  if (cli.writeExpected) {
    writeFileSync(EXPECTED_PATH, `${JSON.stringify(measured, null, 2)}\n`);
    console.log(`wrote ${EXPECTED_PATH} from the measured invariants`);
  } else if (previous === null) {
    fail(
      `${EXPECTED_PATH} is missing; sanity-check the fixtures, then run with --write-expected once`,
    );
  } else {
    const issues = compareInvariants(previous, measured);
    if (issues.length > 0) {
      fail(
        'measured invariants differ from data/expected-invariants.json:\n' +
          issues
            .map(
              (i) => ` - ${i.key}: expected ${String(i.expected)}, measured ${String(i.measured)}`,
            )
            .join('\n'),
      );
    }
    console.log('invariants OK (match data/expected-invariants.json)');
  }

  const json = `${JSON.stringify(dataset, null, 2)}\n`;
  writeFileSync(cli.out.dataset, json);
  const hashes: HashesFile = {
    corpus_version: dataset.meta.corpus_version,
    generated_at: dataset.meta.crawled_at,
    sections: Object.fromEntries(dataset.sections.map((s) => [s.id, { url: s.url, hash: s.hash }])),
  };
  writeFileSync(cli.out.hashes, `${JSON.stringify(hashes, null, 2)}\n`);
  writeFileSync(cli.out.badge, `${JSON.stringify(badgeFor(dataset), null, 2)}\n`);

  const raw = Buffer.byteLength(json, 'utf8');
  const gz = gzipSync(Buffer.from(json, 'utf8'), { level: 9 }).length;
  const c = dataset.meta.counts;
  console.log('\n=== SUMMARY ===');
  console.log(`corpus_version   ${dataset.meta.corpus_version}`);
  console.log(`crawled_at       ${dataset.meta.crawled_at}`);
  console.log(
    `requests         ${String(fetchStats.requests)} (retries ${String(fetchStats.retries)})`,
  );
  console.log(`duration         ${((Date.now() - started) / 1000).toFixed(1)} s`);
  console.log(`parts/chapters   ${String(c.parts)} / ${String(c.chapters)}`);
  console.log(
    `sections         ${String(c.sections)} (without key measure ${String(c.sections_without_mesure_cle)}, without chiffre ${String(c.sections_without_chiffre)}, multi-paragraph ${String(c.sections_multi_paragraph)}, with sub-measures ${String(c.sections_with_sous_mesure)})`,
  );
  console.log(
    `propositions     ${String(c.propositions)} = ${String(c.mesure_cle)} key + ${String(c.mesure)} measures + ${String(c.sous_mesure)} sub-measures`,
  );
  console.log(`chiffres         ${String(c.chiffres)}`);
  console.log(
    `paragraphs       ${String(c.paragraphs)} in sections, ${String(c.introduction_paragraphs)} in introduction, ${String(c.part_paragraphs)} in parts (+ ${String(c.part_epigraphs)} epigraphs)`,
  );
  console.log(
    `duplicates       ${String(dataset.meta.duplicate_propositions.length)} proposition text(s) shared by several sections`,
  );
  for (const d of dataset.meta.duplicate_propositions)
    console.log(`   - ${d.ids.join(', ')}: "${d.text.slice(0, 100)}"`);
  console.log(
    `redirected       ${String(dataset.meta.redirected_section_ids.length)} section(s) with a distinct canonical url: ${dataset.meta.redirected_section_ids.join(', ')}`,
  );
  console.log(
    `source anomalies ${String(dataset.meta.source_anomalies.length)} paragraph(s) after a proposition`,
  );
  for (const a of dataset.meta.source_anomalies) {
    console.log(
      `   - ${a.id} ${a.kind}${a.relatedId === null ? '' : ` (continues ${a.relatedId})`}`,
    );
  }
  console.log(`warnings         ${String(warnings.length)}`);
  for (const w of warnings) console.log(`   - ${w}`);
  console.log(
    `output           ${cli.out.dataset}: ${String(raw)} bytes raw, ${String(gz)} bytes gzip (level 9)`,
  );
  console.log(`                 ${cli.out.hashes}`);
  console.log(`                 ${cli.out.badge}`);

  if (cli.rss) {
    const { runRssCrosscheck } = await import('./rss-crosscheck.js');
    await runRssCrosscheck(dataset);
  }
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((error: unknown) => {
    fail(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  });
}
