/**
 * Types and identifier grammar for the 2026 edition of the programme — "L'Avenir en commun, le
 * programme de la Nouvelle France" (D15.1).
 *
 * Two shapes, and the line between them is the whole design (D15.6):
 *
 *   PrivateCorpus   the text itself. Lives under private/, ignored by git, never in dist/. The
 *                   2026 edition is "© La France insoumise, tous droits réservés": this
 *                   repository is public, so committing the corpus would be reproducing it.
 *   Manifest        what the repository does publish: structure, official titles, anchors, a
 *                   SHA-256 per item, and the few leading words used to point at a sentence.
 *                   Enough to build the site and to prove a quotation exact; not the text.
 *
 * Learning note — a hash is a commitment, not a copy. `sha256(normalizeText(text))` lets anyone
 * holding a sentence check that it is word for word the published one, and lets CI verify a
 * quotation without ever seeing the corpus. It cannot be run backwards into the sentence.
 *
 * Identifiers (D15.8). Chapter numbers restart at 1 in every part, so the 2025 scheme `c{N}`
 * would collide; a 2026 identifier names its part first:
 *
 *   part            p{P}                    p1 … p6      (p0 is the introduction)
 *   chapter         p{P}c{K}                p4c7
 *   section         p{P}c{K}-s{MM}          p4c7-s03     position in the chapter, 2 digits
 *   paragraph       …-p{PP}                 p4c7-s03-p01
 *   key measure     …-k{KK}                 p4c7-s03-k01
 *   measure         …-m{MM}                 p4c7-s03-m12
 *   sub-measure     …-m{MM}.s{S}            p4c7-s03-m12.s2   attached to the measure above it
 *   part text       p{P}-p{PP}              p3-p01
 *   chapter text    p{P}c{K}-p{PP}          p6c1-p02     a chapter's own introduction (one has one)
 *   introduction    p0-h{NN} / p0-p{PP}     headings and paragraphs, numbered separately
 *
 * Every 2026 id starts with `p<digit>`; every 2025 id starts with `c<digit>`, `part<digit>` or
 * `intro`. The two namespaces cannot meet — aec26.test.ts checks it against all the 2025 ids.
 * Positions are positional: an insertion shifts what follows. The section's official anchor and
 * each item's hash are stored next to the id precisely so that a shift can be detected and
 * repaired by the re-crawl rather than silently pointing at another sentence.
 */

export type Kind26 = 'heading' | 'paragraph' | 'key_measure' | 'measure' | 'sub_measure';

/** What counts as a proposition: the units the official "1 069 mesures" are made of. */
export const PROPOSITION_KINDS: readonly Kind26[] = ['key_measure', 'measure', 'sub_measure'];

export const ID26 = {
  part: /^p([1-9])$/,
  chapter: /^p([1-9])c([1-9]\d?)$/,
  section: /^p([1-9])c([1-9]\d?)-s(\d{2})$/,
  sectionItem: /^p([1-9])c([1-9]\d?)-s(\d{2})-(?:p\d{2}|k\d{2}|m\d{2}(?:\.s[1-9]\d?)?)$/,
  partItem: /^p([1-9])-p(\d{2})$/,
  chapterItem: /^p([1-9])c([1-9]\d?)-p(\d{2})$/,
  introItem: /^p0-(?:h|p)(\d{2})$/,
} as const;

/** True for any identifier of the 2026 edition, whatever it names. */
export function isId26(id: string): boolean {
  return Object.values(ID26).some((re) => re.test(id));
}

/** `p4c7-s03-m12.s2` → `p4c7-s03`; null for anything that is not inside a section. */
export function sectionIdOf(id: string): string | null {
  const m = /^(p[1-9]c[1-9]\d?-s\d{2})(?:-|$)/.exec(id);
  return m?.[1] ?? null;
}

// ---------------------------------------------------------------------------------------------
// Private corpus — never committed
// ---------------------------------------------------------------------------------------------

export interface PrivateItem {
  id: string;
  kind: Kind26;
  /** Verbatim, normalised exactly like the 2025 corpus (`normalizeText`), so hashes compare. */
  text: string;
  /** SHA-256 of `text`. */
  hash: string;
  /**
   * The same text as it stands in the DOM, entities decoded, NOT normalised. `normalizeText`
   * turns every no-break space into a plain one; a browser matching a text fragment does not.
   * The link locator is therefore computed from this, never from `text`.
   */
  raw: string;
  /** `text.split(' ').length`. */
  words: number;
  /** Inline elements found inside the item (`sup`, `em`…), for the record. */
  inline: string[];
  subMeasures?: PrivateItem[];
}

export interface PageRef {
  /** Canonical URL fetched. */
  url: string;
  /** File name inside the crawl directory. */
  file: string;
  /** SHA-256 of the stored file — its identity, not a freshness signal (pages carry tokens). */
  sha256: string;
}

export interface PrivateSection {
  id: string;
  chapterId: string;
  partId: string;
  /** 1-based position in the chapter. */
  position: number;
  /** The `id` of the official `<h3 class="section-title">`: the anchor of every deep link. */
  anchor: string;
  title: string;
  /** Chapter URL + `#anchor`. */
  url: string;
  /** SHA-256 over title, anchor and the ordered (kind, hash) of every item: the version unit. */
  contentHash: string;
  items: PrivateItem[];
}

export interface Counts26 {
  parts: number;
  chapters: number;
  sections: number;
  key_measures: number;
  measures: number;
  sub_measures: number;
  /** key_measures + measures + sub_measures: must equal the official count (D15.11). */
  propositions: number;
  section_paragraphs: number;
  sections_without_key_measure: number;
  sections_multi_paragraph: number;
  measures_with_sub_measures: number;
  introduction_headings: number;
  introduction_paragraphs: number;
  part_paragraphs: number;
  /** Paragraphs a chapter carries above its sections (the Europe chapter has four). */
  chapter_paragraphs: number;
}

export interface Anomaly26 {
  /** Page id (`p5c1`…) where the source departs from the expected markup. */
  page: string;
  kind: string;
  /** SHA-256 of the tag skeleton of the offending node: what makes an acceptance specific. */
  fingerprint: string;
  note: string;
}

export interface PrivateCorpus {
  meta: {
    edition: '2026';
    source: string;
    crawl_stamp: string;
    crawled_at: string;
    corpus_version: string;
    counts: Counts26;
    official_count: number;
    official_count_source: string;
    license: 'all-rights-reserved';
    anomalies: Anomaly26[];
  };
  introduction: { id: 'p0'; title: string; url: string; items: PrivateItem[]; page: PageRef };
  parts: {
    id: string;
    order: number;
    slug: string;
    title: string;
    url: string;
    chapterIds: string[];
    items: PrivateItem[];
    page: PageRef;
  }[];
  chapters: {
    id: string;
    partId: string;
    /** Number inside the part, as the source prints it. */
    number: number;
    title: string;
    url: string;
    sectionIds: string[];
    /** The chapter's own introduction, when the source gives it one. */
    items: PrivateItem[];
    page: PageRef;
  }[];
  sections: PrivateSection[];
}

// ---------------------------------------------------------------------------------------------
// Public manifest — committed
// ---------------------------------------------------------------------------------------------

export type LocatorKind = 'start' | 'anchor_only';

export interface ManifestItem {
  id: string;
  kind: Kind26;
  /** SHA-256 of the normalised text. */
  sha256: string;
  words: number;
  /** The measure a sub-measure belongs to. */
  parent?: string;
  /**
   * The first words of a key measure, shown next to its section (D15.7). Never present on any
   * other kind: the visible extract is rationed, and this field is where the ration is spent.
   */
  incipit?: string;
  /**
   * What follows `:~:` in a deep link — `text=…`, percent-encoded — or null when no short prefix
   * of the item is unique in its page, in which case the link stops at the section anchor.
   * It lives inside an `href` and is never displayed.
   */
  locator?: string | null;
  /** How many leading words of the item the locator carries (0 when it is null). */
  locator_words?: number;
}

export interface ManifestExposure {
  /** Words of all propositions: the denominator of every share below. */
  proposition_words: number;
  /** Words shown as visible incipits (key measures only). */
  incipit_words: number;
  /** Words carried by link locators (inside `href` only). */
  locator_words: number;
  /** Words of whole propositions quoted by editorial content (data/2026/quotes.json). */
  quote_words: number;
  /** Words covered by any of the three, counted once per item. */
  covered_words: number;
  share: number;
  /** Items left with at most two words uncovered: with the public hash, as good as published. */
  fully_exposed: number;
  locators_anchor_only: number;
}

export interface Manifest {
  meta: {
    schema: 1;
    edition: '2026';
    title: string;
    source: string;
    crawled_at: string;
    corpus_version: string;
    counts: Counts26;
    official_count: number;
    official_count_source: string;
    license: {
      status: 'all-rights-reserved';
      holder: string;
      statement_url: string;
      /** SHA-256 of the "Licence" section of the legal notice the manifest was published under. */
      statement_sha256: string;
    };
    attribution: string;
    id_scheme: string;
    hash_rule: string;
    exposure: ManifestExposure;
  };
  introduction: { id: 'p0'; title: string; url: string; items: ManifestItem[] };
  parts: {
    id: string;
    order: number;
    slug: string;
    title: string;
    url: string;
    chapterIds: string[];
    items: ManifestItem[];
  }[];
  chapters: {
    id: string;
    partId: string;
    number: number;
    title: string;
    url: string;
    sectionIds: string[];
    items: ManifestItem[];
  }[];
  sections: {
    id: string;
    chapterId: string;
    partId: string;
    position: number;
    anchor: string;
    title: string;
    url: string;
    items: ManifestItem[];
  }[];
}

/**
 * data/2026/exposure-policy.json — edited by hand: a change to it is a visible decision (D15.7).
 *
 * Every number below rations one way a few words of the programme leave the private corpus.
 * The publisher refuses to write a manifest that breaks a ceiling, and CI recomputes the same
 * sums from the manifest alone.
 */
export interface ExposurePolicy {
  /** Fewest leading words a link locator may carry. */
  locator_min_words: number;
  /** Most leading words a link locator may carry; past it, the link stops at the anchor. */
  locator_max_words: number;
  /** Largest share of an item its locator may carry (0.5: never more than half of it). */
  locator_max_item_share: number;
  /** `all`: every proposition gets a locator. `key_and_quoted`: only those shown or quoted. */
  locator_scope: 'all' | 'key_and_quoted' | 'none';
  /** Below this many words an incipit says nothing: the key measure gets none. */
  incipit_min_words: number;
  /** Most words of a key measure shown as its visible incipit. */
  incipit_max_words: number;
  /** Largest share of a key measure its incipit may show. */
  incipit_max_item_share: number;
  /** Ceiling on covered words / proposition words. */
  max_share: number;
  /** Ceiling on unquoted propositions left with at most two words uncovered. */
  max_fully_exposed: number;
  /** Ceiling on the number of propositions quoted whole by editorial content. */
  max_quotes: number;
  /** Ceiling on quoted words / proposition words. */
  max_quote_share: number;
  /**
   * SHA-256 of the "Licence" clause of the source's legal notice these numbers were chosen
   * under. If the clause changes, the publisher stops: the policy has to be decided again.
   */
  license_statement_sha256: string;
  /** Date the editor validated these numbers on the real corpus; null until then. */
  validated_on: string | null;
}

/** data/2026/quotes.json — the whole propositions editorial content is allowed to print. */
export interface Quote {
  id: string;
  text: string;
  words: number;
  /** Must equal the manifest's `sha256` for `id`: this is what CI checks without the corpus. */
  sha256: string;
  /** Official page, anchor and locator: the link the legal notice asks for. */
  url: string;
  /** Who quotes it — `riposte:rip-01`, `mot:regle-verte`. No orphan quote. */
  used_by: string[];
}

export interface QuotesFile {
  meta: { corpus_version: string; count: number; words: number };
  quotes: Quote[];
}

/** data/2026/id-map-2025.json — where an address of the 2025 edition leads now (D15.8, D15.9). */
export interface IdMapPublic {
  meta: {
    from: { edition: '2025'; corpus_version: string };
    to: { edition: '2026'; corpus_version: string };
    note_fr: string;
  };
  /** 2025 section id → 2026 section ids, the main heir first. Empty: the chapter is the target. */
  sections: Record<string, string[]>;
  /** 2025 section id → 2026 chapter id, for sections with no heir section. */
  chapters: Record<string, string>;
}
