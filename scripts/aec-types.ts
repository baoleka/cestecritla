/**
 * Strict types for the canonical dataset of "L'Avenir en commun, édition 2025".
 *
 * Source: https://melenchon2027.fr/programme2025/livre/ — texts are CC BY-NC-SA 4.0,
 * attribution "La France insoumise – L'Avenir en commun". Every text item stores the
 * source text verbatim (normalized: NFC, zero-width characters U+200B/U+FEFF removed, trimmed,
 * whitespace collapsed, entities decoded, tags stripped) together with a SHA-256 hash of that normalized text.
 *
 * Naming convention: `meta` keys are snake_case (they are read by tooling and the public
 * "exactitude" page); structural entities use camelCase.
 */

/** Text carried by every atomic item of the corpus. */
export interface TextItem {
  /** Stable identifier, see `Meta.id_scheme`. */
  id: string;
  /** Verbatim text: NFC, trimmed, internal whitespace collapsed to one space, no tags. */
  text: string;
  /** SHA-256 (hex, lowercase) of `text`. */
  hash: string;
}

/** Argument paragraph (`p.wp-block-paragraph`); `html` keeps inline markup such as `<em>`. */
export interface Paragraph extends TextItem {
  kind: 'paragraph';
  /** Inner HTML of the paragraph (NFC, whitespace collapsed), for faithful rendering. */
  html: string;
}

/** Key measure (`div.mesure-cle`), at most one expected per section. */
export interface KeyMeasure extends TextItem {
  kind: 'key_measure';
}

/** Sub-measure (`div.sous-mesure`), always attached to the preceding measure. */
export interface SubMeasure extends TextItem {
  kind: 'sub_measure';
}

/** Measure (`div.mesure`); `subMeasures` is present only when the source has sub-measures. */
export interface Measure extends TextItem {
  kind: 'measure';
  subMeasures?: SubMeasure[];
}

/** Content of `section.contenu`, in document order. */
export type SectionItem = Paragraph | KeyMeasure | Measure;

export type SectionItemKind = SectionItem['kind'];

/** Sourced statistic from the "À savoir" box (`section.chiffres div.chiffre`). */
export interface Chiffre extends TextItem {
  kind: 'chiffre';
}

/** Epigraph quoted at the top of a part page (`blockquote.wp-block-quote`). */
export interface Epigraph extends TextItem {
  kind: 'epigraph';
  /** Attribution line (`<cite>`), verbatim, normalized like `text`. */
  cite: string;
}

export interface Section {
  /** e.g. "c12-s01" */
  id: string;
  /** e.g. "c12" */
  chapterId: string;
  /** e.g. "part3" */
  partId: string;
  /** Section number inside its chapter, taken from the slug (`s1` → 1). */
  number: number;
  /** WordPress slug, e.g. "s1". */
  slug: string;
  title: string;
  /** Absolute URL used by the book navigation (`/programme2025/livre/chapitreN/sM/`). */
  url: string;
  /**
   * URL declared by `<link rel="canonical">` on the fetched page. Equals `url` except for the few
   * sections whose WordPress permalink differs (the server redirects `url` to `canonicalUrl`).
   */
  canonicalUrl: string;
  /** SHA-256 of the normalized inner HTML of `section.contenu` + `section.chiffres`. */
  hash: string;
  items: SectionItem[];
  chiffres: Chiffre[];
}

export interface Chapter {
  /** e.g. "c12" */
  id: string;
  /** 1..18 */
  number: number;
  /** e.g. "chapitre12" */
  slug: string;
  /** Full title as displayed, e.g. "Chapitre 12 : Planification écologique". */
  title: string;
  url: string;
  partId: string;
  /** Section ids in reading order. */
  sectionIds: string[];
}

export interface Part {
  /** e.g. "part3" */
  id: string;
  /** e.g. "l-harmonie-des-etres-humains-avec-la-nature" */
  slug: string;
  title: string;
  url: string;
  /** 1..4, reading order. */
  order: number;
  /** Chapter ids in reading order. */
  chapterIds: string[];
  /** Quotations opening the part (may be empty). */
  epigraphs: Epigraph[];
  /** Introductory paragraphs of the part (may be empty). */
  paragraphs: Paragraph[];
}

export interface Introduction {
  id: 'intro';
  slug: 'introduction';
  title: string;
  url: string;
  /** All paragraphs of the introduction page, in document order (bold sub-headings included). */
  paragraphs: Paragraph[];
}

/** Measured counts, compared against `data/expected-invariants.json` on every run. */
export interface Counts {
  parts: number;
  chapters: number;
  sections: number;
  /** `div.mesure-cle` */
  mesure_cle: number;
  /** `div.mesure` */
  mesure: number;
  /** `div.sous-mesure` */
  sous_mesure: number;
  /** mesure_cle + mesure + sous_mesure */
  propositions: number;
  /** `div.chiffre` */
  chiffres: number;
  /** Section argument paragraphs only (introduction and parts are counted separately). */
  paragraphs: number;
  sections_without_mesure_cle: number;
  sections_without_chiffre: number;
  sections_multi_paragraph: number;
  sections_with_sous_mesure: number;
  introduction_paragraphs: number;
  part_paragraphs: number;
  part_epigraphs: number;
  /** Number of `Meta.source_anomalies`. */
  source_anomalies: number;
}

/** Shape of `data/expected-invariants.json`. */
export interface ExpectedInvariants {
  counts: Counts;
  /** Number of sections per chapter id, e.g. { "c1": 6, ... }. */
  sections_per_chapter: Record<string, number>;
  /**
   * Canonical sections known to be absent from the RSS feed (site-side gap, reviewed by hand).
   * The RSS cross-check fails on any other missing section.
   */
  rss_known_missing_section_ids: string[];
}

export type SourceAnomalyKind =
  /** A `<p>` that is the continuation of the preceding proposition (measure split in the source). */
  | 'measure_split'
  /** A sourced statistic published as a `<p>` in `section.contenu` instead of the "À savoir" box. */
  | 'statistic_as_paragraph'
  /** A bold sub-heading (`<p><strong>… :</strong></p>`) grouping the measures that follow. */
  | 'heading_paragraph'
  /** Genuine argument prose placed after the measures (layout variant, not an error). */
  | 'prose_after_measures';

/**
 * Deviation of the published HTML from the regular section schema, detected by fixed rules on
 * paragraphs that follow a proposition. The text itself is left untouched (verbatim).
 */
export interface SourceAnomaly {
  /** Id of the paragraph concerned. */
  id: string;
  kind: SourceAnomalyKind;
  /** For `measure_split`: id of the proposition the paragraph continues; otherwise null. */
  relatedId: string | null;
}

export interface DuplicateProposition {
  hash: string;
  text: string;
  /** Ids of the propositions sharing this text (from at least two different sections). */
  ids: string[];
}

export interface Meta {
  source: string;
  license: 'CC BY-NC-SA 4.0';
  attribution: "La France insoumise – L'Avenir en commun";
  /** ISO 8601 UTC timestamp of the crawl. */
  crawled_at: string;
  /** First 16 hex chars of SHA-256 over all section hashes concatenated in reading order. */
  corpus_version: string;
  counts: Counts;
  /** Explanation (French) of how the dataset count relates to the official "831 mesures". */
  counting_rule_fr: string;
  official_count: 831;
  /** Id of the introduction paragraph containing the official "831 mesures" sentence. */
  official_count_paragraph_id: string;
  id_scheme: string;
  /** Identical proposition texts found in two different sections (informational). */
  duplicate_propositions: DuplicateProposition[];
  /** Sections whose navigation URL was redirected by the server to a different canonical URL. */
  redirected_section_ids: string[];
  /** Schema deviations found in the published HTML (see `SourceAnomaly`). */
  source_anomalies: SourceAnomaly[];
}

export interface Dataset {
  meta: Meta;
  introduction: Introduction;
  parts: Part[];
  chapters: Chapter[];
  sections: Section[];
}

/** Shape of `data/hashes.json`, used for hash-based freshness checks. */
export interface HashesFile {
  corpus_version: string;
  generated_at: string;
  sections: Record<string, { url: string; hash: string }>;
}

/**
 * Shape of `data/badge.json`: shields.io "endpoint" schema
 * (https://shields.io/badges/endpoint-badge), served as a static asset for the README badge.
 */
export interface BadgeFile {
  schemaVersion: 1;
  label: string;
  /** Crawl date, `YYYY-MM-DD` (UTC). */
  message: string;
  color: string;
}
