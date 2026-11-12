/**
 * From the private corpus to what the repository publishes: the manifest (structure, official
 * titles, anchors, one SHA-256 per item, rationed incipits and link locators), the quotes file,
 * and the measure of how many words of the programme all of that lets out. Pure — no file, no
 * network — so the same functions serve the publisher, the tests and the CI gate.
 *
 * The 2026 edition is "© La France insoumise, tous droits réservés": links are encouraged and
 * short extracts are allowed with the author and a link to the page of origin (D15.1). So the
 * question this file answers, in numbers, is "how short?" (D15.7):
 *
 *   incipit   the first words of a KEY measure, shown next to its section
 *   locator   the first words of a proposition, inside an `href` only, so the link lands on it
 *   quote     a whole proposition, printed by a riposte or a concept card, attributed and linked
 *
 * `measureExposure` and `validateManifest` need the manifest and nothing else: CI, which never
 * sees the corpus, recomputes the same sums and checks the same ceilings.
 */
import { parse } from 'node-html-parser';
import { normalizeText, sha256 } from './aec-common.js';
import { pageTextNodes } from './aec26-source.js';
import {
  ID26,
  PROPOSITION_KINDS,
  isId26,
  type ExposurePolicy,
  type Kind26,
  type Manifest,
  type ManifestExposure,
  type ManifestItem,
  type PrivateCorpus,
  type PrivateItem,
  type Quote,
  type QuotesFile,
} from './aec26-types.js';
import {
  computeLocator,
  decodeLocator,
  deepLink,
  pageText,
  wordCount,
  type AnchorOnlyReason,
  type PageText,
} from './locator.js';

export const EDITION_TITLE = 'L’Avenir en commun — Le programme de la Nouvelle France';
export const ATTRIBUTION_2026 = 'La France insoumise, L’Avenir en commun, édition 2026';
export const RIGHTS_HOLDER = 'La France insoumise';
export const ID_SCHEME =
  'p{P} part · p{P}c{K} chapter · p{P}c{K}-s{MM} section · -p{PP} paragraph · -k{KK} key measure · ' +
  '-m{MM} measure · -m{MM}.s{S} sub-measure · p0-h{NN}/p0-p{PP} introduction';
export const HASH_RULE =
  'sha256(utf8(t)), t = text content of the element (nested lists excluded) after NFC, removal of ' +
  'U+200B and U+FEFF, every run of Unicode whitespace collapsed to one space, trimmed';

const isProposition = (kind: Kind26): boolean => PROPOSITION_KINDS.includes(kind);

/** The "Licence" clause of the source's legal notice: what the policy is decided under. */
export function licenseClause(html: string): { text: string; sha256: string } {
  const headings = parse(html)
    .querySelectorAll('h2')
    .filter((h) => normalizeText(h.text) === 'Licence');
  const heading = headings[0];
  if (headings.length !== 1 || heading === undefined) {
    throw new Error(
      `legal notice: expected one "Licence" heading, found ${String(headings.length)}`,
    );
  }
  const blocks: string[] = [];
  for (
    let el = heading.nextElementSibling;
    el !== null && !/^h[1-6]$/i.test(el.rawTagName);
    el = el.nextElementSibling
  ) {
    const text = normalizeText(pageTextNodes(el.outerHTML).join(' '));
    if (text !== '') blocks.push(text);
  }
  if (blocks.length === 0) throw new Error('legal notice: the "Licence" section is empty');
  const text = blocks.join('\n');
  return { text, sha256: sha256(text) };
}

/**
 * The visible incipit of a key measure: its first words, never more than the policy allows and
 * never more than its share of the measure — or null when that leaves too little to say anything.
 */
export function incipitOf(text: string, policy: ExposurePolicy): string | null {
  const tokens = text.split(' ');
  const n = Math.min(
    policy.incipit_max_words,
    Math.floor(tokens.length * policy.incipit_max_item_share),
  );
  if (n < policy.incipit_min_words) return null;
  // Cut on a word: a dangling comma, colon or opening quote is the mark of a careless extract.
  const incipit = tokens
    .slice(0, n)
    .join(' ')
    .replace(/[\s,;:«(]+$/u, '');
  return wordCount(incipit) < policy.incipit_min_words ? null : incipit;
}

export interface PublishInput {
  corpus: PrivateCorpus;
  /** Chapter id → stored HTML of its page: locators are unique in the page or do not exist. */
  pages: ReadonlyMap<string, string>;
  policy: ExposurePolicy;
  /** Propositions quoted whole by editorial content. */
  quoted: ReadonlySet<string>;
  license: { statement_url: string; statement_sha256: string };
}

export interface PublishResult {
  manifest: Manifest;
  /** Why some propositions got no locator. */
  anchorOnly: Record<AnchorOnlyReason, number>;
  /** Locator length in words → number of locators. */
  locatorLengths: Record<string, number>;
}

function plainItem(item: PrivateItem, parent?: string): ManifestItem {
  const out: ManifestItem = { id: item.id, kind: item.kind, sha256: item.hash, words: item.words };
  if (parent !== undefined) out.parent = parent;
  return out;
}

export function buildManifest(input: PublishInput): PublishResult {
  const { corpus, policy, quoted } = input;
  const anchorOnly: Record<AnchorOnlyReason, number> = {
    too_short: 0,
    not_unique: 0,
    inline_markup: 0,
    not_encodable: 0,
  };
  const locatorLengths: Record<string, number> = {};
  const pageCache = new Map<string, PageText>();
  const pageOf = (chapterId: string): PageText => {
    const cached = pageCache.get(chapterId);
    if (cached !== undefined) return cached;
    const html = input.pages.get(chapterId);
    if (html === undefined) throw new Error(`no stored page for chapter ${chapterId}`);
    const text = pageText(html);
    pageCache.set(chapterId, text);
    return text;
  };
  const inScope = (item: PrivateItem): boolean =>
    policy.locator_scope === 'all' ||
    (policy.locator_scope === 'key_and_quoted' &&
      (item.kind === 'key_measure' || quoted.has(item.id)));

  const publishItem = (item: PrivateItem, chapterId: string, parent?: string): ManifestItem => {
    const out = plainItem(item, parent);
    if (!isProposition(item.kind)) return out;
    if (item.kind === 'key_measure') {
      const incipit = incipitOf(item.text, policy);
      if (incipit !== null) out.incipit = incipit;
    }
    if (inScope(item)) {
      const found = computeLocator(item.raw, item.inline, pageOf(chapterId), {
        minWords: policy.locator_min_words,
        maxWords: policy.locator_max_words,
        maxItemShare: policy.locator_max_item_share,
      });
      if (found.kind === 'start') {
        out.locator = found.locator;
        out.locator_words = found.words;
        const key = String(found.words);
        locatorLengths[key] = (locatorLengths[key] ?? 0) + 1;
      } else {
        out.locator = null;
        out.locator_words = 0;
        anchorOnly[found.reason] += 1;
      }
    }
    return out;
  };

  const sections: Manifest['sections'] = corpus.sections.map((s) => ({
    id: s.id,
    chapterId: s.chapterId,
    partId: s.partId,
    position: s.position,
    anchor: s.anchor,
    title: s.title,
    url: s.url,
    items: s.items.flatMap((item) => [
      publishItem(item, s.chapterId),
      ...(item.subMeasures ?? []).map((sub) => publishItem(sub, s.chapterId, item.id)),
    ]),
  }));

  const manifest: Manifest = {
    meta: {
      schema: 1,
      edition: '2026',
      title: EDITION_TITLE,
      source: corpus.meta.source,
      crawled_at: corpus.meta.crawled_at,
      corpus_version: corpus.meta.corpus_version,
      counts: corpus.meta.counts,
      official_count: corpus.meta.official_count,
      official_count_source: corpus.meta.official_count_source,
      license: {
        status: 'all-rights-reserved',
        holder: RIGHTS_HOLDER,
        statement_url: input.license.statement_url,
        statement_sha256: input.license.statement_sha256,
      },
      attribution: ATTRIBUTION_2026,
      id_scheme: ID_SCHEME,
      hash_rule: HASH_RULE,
      exposure: {
        proposition_words: 0,
        incipit_words: 0,
        locator_words: 0,
        quote_words: 0,
        covered_words: 0,
        share: 0,
        fully_exposed: 0,
        locators_anchor_only: 0,
      },
    },
    introduction: {
      id: 'p0',
      title: corpus.introduction.title,
      url: corpus.introduction.url,
      items: corpus.introduction.items.map((i) => plainItem(i)),
    },
    parts: corpus.parts.map((p) => ({
      id: p.id,
      order: p.order,
      slug: p.slug,
      title: p.title,
      url: p.url,
      chapterIds: p.chapterIds,
      items: p.items.map((i) => plainItem(i)),
    })),
    chapters: corpus.chapters.map((c) => ({
      id: c.id,
      partId: c.partId,
      number: c.number,
      title: c.title,
      url: c.url,
      sectionIds: c.sectionIds,
      items: c.items.map((i) => plainItem(i)),
    })),
    sections,
  };
  manifest.meta.exposure = measureExposure(manifest, quoted);
  return { manifest, anchorOnly, locatorLengths };
}

/** Every proposition of a manifest, in reading order. */
export function manifestPropositions(manifest: Manifest): ManifestItem[] {
  return manifest.sections.flatMap((s) => s.items.filter((i) => isProposition(i.kind)));
}

/**
 * How many words of the propositions the manifest and the quotes let out. An incipit and a
 * locator are both prefixes of the same sentence, so an item is covered by the longer of the two,
 * not by their sum; a quoted item is covered whole.
 */
export function measureExposure(manifest: Manifest, quoted: ReadonlySet<string>): ManifestExposure {
  const out: ManifestExposure = {
    proposition_words: 0,
    incipit_words: 0,
    locator_words: 0,
    quote_words: 0,
    covered_words: 0,
    share: 0,
    fully_exposed: 0,
    locators_anchor_only: 0,
  };
  for (const item of manifestPropositions(manifest)) {
    const incipit = item.incipit === undefined ? 0 : wordCount(item.incipit);
    const locator = item.locator_words ?? 0;
    out.proposition_words += item.words;
    out.incipit_words += incipit;
    out.locator_words += locator;
    if (item.locator === null) out.locators_anchor_only += 1;
    if (quoted.has(item.id)) {
      out.quote_words += item.words;
      out.covered_words += item.words;
      continue;
    }
    const covered = Math.min(item.words, Math.max(incipit, locator));
    out.covered_words += covered;
    // Two words left to guess, and a public hash to check the guess against: as good as printed.
    if (covered > 0 && item.words - covered <= 2) out.fully_exposed += 1;
  }
  out.share =
    out.proposition_words === 0
      ? 0
      : Math.round((out.covered_words / out.proposition_words) * 10_000) / 10_000;
  return out;
}

/** The ceilings of the policy an exposure breaks; empty when it breaks none. */
export function ceilingViolations(
  exposure: ManifestExposure,
  quotedCount: number,
  policy: ExposurePolicy,
): string[] {
  const out: string[] = [];
  const pct = (x: number): string => `${(x * 100).toFixed(2)} %`;
  if (exposure.share > policy.max_share) {
    out.push(`covered share ${pct(exposure.share)} is over the ceiling ${pct(policy.max_share)}`);
  }
  if (exposure.fully_exposed > policy.max_fully_exposed) {
    out.push(
      `${String(exposure.fully_exposed)} proposition(s) are left with two words or fewer ` +
        `uncovered (ceiling ${String(policy.max_fully_exposed)})`,
    );
  }
  if (quotedCount > policy.max_quotes) {
    out.push(`${String(quotedCount)} whole quotations (ceiling ${String(policy.max_quotes)})`);
  }
  const quoteShare =
    exposure.proposition_words === 0 ? 0 : exposure.quote_words / exposure.proposition_words;
  if (quoteShare > policy.max_quote_share) {
    out.push(`quoted share ${pct(quoteShare)} is over the ceiling ${pct(policy.max_quote_share)}`);
  }
  return out;
}

const ITEM_KEYS = new Set([
  'id',
  'kind',
  'sha256',
  'words',
  'parent',
  'incipit',
  'locator',
  'locator_words',
]);
const KINDS: readonly string[] = ['heading', 'paragraph', 'key_measure', 'measure', 'sub_measure'];

/**
 * Everything that can be checked about a manifest WITHOUT the corpus. Returns the problems found.
 *
 * The key whitelist is the leak gate in its simplest form: an item can carry an id, numbers, a
 * hash, a rationed incipit and a rationed locator. There is no field a sentence could hide in.
 */
export function validateManifest(manifest: Manifest, policy: ExposurePolicy): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const check = (item: ManifestItem, where: string, allowed: readonly Kind26[]): void => {
    const at = `${where}/${item.id}`;
    for (const key of Object.keys(item)) {
      if (!ITEM_KEYS.has(key)) problems.push(`${at}: unexpected field "${key}"`);
    }
    if (seen.has(item.id)) problems.push(`${at}: duplicate id`);
    seen.add(item.id);
    if (!isId26(item.id)) problems.push(`${at}: id outside the grammar`);
    if (!KINDS.includes(item.kind) || !allowed.includes(item.kind)) {
      problems.push(`${at}: kind "${item.kind}" not allowed here`);
    }
    if (!/^[0-9a-f]{64}$/.test(item.sha256)) problems.push(`${at}: sha256 is not 64 hex digits`);
    if (!Number.isInteger(item.words) || item.words < 1) problems.push(`${at}: words`);
    if ((item.kind === 'sub_measure') !== (item.parent !== undefined)) {
      problems.push(`${at}: only a sub-measure has a parent, and it always has one`);
    }
    if (item.incipit !== undefined) {
      const n = wordCount(item.incipit);
      if (item.kind !== 'key_measure') problems.push(`${at}: incipit on a ${item.kind}`);
      if (
        n < policy.incipit_min_words ||
        n > policy.incipit_max_words ||
        n > Math.floor(item.words * policy.incipit_max_item_share)
      ) {
        problems.push(`${at}: incipit of ${String(n)} words breaks the policy`);
      }
    }
    if (item.locator !== undefined) {
      if (!isProposition(item.kind)) problems.push(`${at}: locator on a ${item.kind}`);
      if (policy.locator_scope === 'none') problems.push(`${at}: locator under scope "none"`);
      if (item.locator === null) {
        if (item.locator_words !== 0) problems.push(`${at}: null locator with words`);
      } else {
        const text = decodeLocator(item.locator);
        const n = text === null ? -1 : wordCount(text);
        if (text === null) problems.push(`${at}: locator is not a plain text= directive`);
        else if (
          n !== item.locator_words ||
          n < policy.locator_min_words ||
          n > policy.locator_max_words ||
          n > Math.floor(item.words * policy.locator_max_item_share)
        ) {
          problems.push(`${at}: locator of ${String(n)} words breaks the policy`);
        }
      }
    } else if (item.locator_words !== undefined) {
      problems.push(`${at}: locator_words without locator`);
    }
  };

  for (const i of manifest.introduction.items) check(i, 'p0', ['heading', 'paragraph']);
  for (const p of manifest.parts) {
    if (!ID26.part.test(p.id)) problems.push(`${p.id}: not a part id`);
    for (const i of p.items) check(i, p.id, ['paragraph']);
  }
  for (const c of manifest.chapters) {
    if (!ID26.chapter.test(c.id)) problems.push(`${c.id}: not a chapter id`);
    for (const i of c.items) check(i, c.id, ['paragraph']);
  }
  const anchors = new Set<string>();
  for (const s of manifest.sections) {
    if (!ID26.section.test(s.id)) problems.push(`${s.id}: not a section id`);
    if (!s.url.endsWith(`#${s.anchor}`)) problems.push(`${s.id}: url does not end with its anchor`);
    if (!s.url.startsWith(manifest.meta.source)) problems.push(`${s.id}: url outside the book`);
    if (anchors.has(s.url)) problems.push(`${s.id}: duplicate url`);
    anchors.add(s.url);
    for (const i of s.items) {
      check(i, s.id, ['paragraph', 'key_measure', 'measure', 'sub_measure']);
      if (!i.id.startsWith(`${s.id}-`)) problems.push(`${s.id}/${i.id}: item outside its section`);
    }
  }
  const counted = manifestPropositions(manifest).length;
  if (counted !== manifest.meta.official_count) {
    problems.push(
      `${String(counted)} propositions, official count ${String(manifest.meta.official_count)}`,
    );
  }
  return problems;
}

export interface QuoteRequest {
  id: string;
  /** The hash the editorial content was proved against: a stale pin stops the publication. */
  sha256: string;
  usedBy: string;
}

export function buildQuotes(
  corpus: PrivateCorpus,
  manifest: Manifest,
  requests: readonly QuoteRequest[],
): QuotesFile {
  const items = new Map<string, { item: PrivateItem; sectionUrl: string }>();
  for (const s of corpus.sections) {
    for (const item of s.items) {
      items.set(item.id, { item, sectionUrl: s.url });
      for (const sub of item.subMeasures ?? []) items.set(sub.id, { item: sub, sectionUrl: s.url });
    }
  }
  const published = new Map(manifestPropositions(manifest).map((i) => [i.id, i]));
  const byId = new Map<string, Quote>();
  const problems: string[] = [];
  for (const request of requests) {
    const found = items.get(request.id);
    if (found === undefined || !isProposition(found.item.kind)) {
      // Prose (section paragraphs, the introduction) is never quoted — D15.7.
      problems.push(`${request.usedBy}: ${request.id} is not a proposition of the 2026 edition`);
      continue;
    }
    if (found.item.hash !== request.sha256) {
      problems.push(`${request.usedBy}: ${request.id} changed since it was pinned`);
      continue;
    }
    const existing = byId.get(request.id);
    if (existing !== undefined) {
      if (!existing.used_by.includes(request.usedBy)) existing.used_by.push(request.usedBy);
      continue;
    }
    byId.set(request.id, {
      id: request.id,
      text: found.item.text,
      words: found.item.words,
      sha256: found.item.hash,
      url: deepLink(found.sectionUrl, published.get(request.id)?.locator),
      used_by: [request.usedBy],
    });
  }
  if (problems.length > 0) {
    throw new Error(`QUOTES REFUSED (${String(problems.length)}):\n- ${problems.join('\n- ')}`);
  }
  const quotes = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  for (const q of quotes) q.used_by.sort();
  return {
    meta: {
      corpus_version: corpus.meta.corpus_version,
      count: quotes.length,
      words: quotes.reduce((n, q) => n + q.words, 0),
    },
    quotes,
  };
}

/** What CI can check about the quotes: each is exactly the proposition the manifest commits to. */
export function validateQuotes(quotes: QuotesFile, manifest: Manifest): string[] {
  const problems: string[] = [];
  const published = new Map(manifestPropositions(manifest).map((i) => [i.id, i]));
  if (quotes.meta.corpus_version !== manifest.meta.corpus_version) {
    problems.push('quotes and manifest come from different corpus versions');
  }
  for (const q of quotes.quotes) {
    const item = published.get(q.id);
    if (item === undefined) problems.push(`${q.id}: not a proposition of the manifest`);
    else if (item.sha256 !== q.sha256) problems.push(`${q.id}: hash differs from the manifest`);
    if (sha256(normalizeText(q.text)) !== q.sha256)
      problems.push(`${q.id}: text does not hash to sha256`);
    if (q.text !== normalizeText(q.text)) problems.push(`${q.id}: text is not normalised`);
    if (q.words !== q.text.split(' ').length) problems.push(`${q.id}: wrong word count`);
    if (q.used_by.length === 0) problems.push(`${q.id}: quoted by nobody`);
    if (!q.url.startsWith(manifest.meta.source)) problems.push(`${q.id}: url outside the book`);
  }
  if (quotes.meta.count !== quotes.quotes.length) problems.push('meta.count is wrong');
  return problems;
}
