/**
 * Build the runtime projection `slim.json` from the canonical corpus (D1.6, D4.2).
 *
 * Promoted from prototypes/spike-share/scripts/build-data.ts, which produced the projection but
 * shipped the source anomalies untouched. Three of the five anomaly kinds change what the reader
 * sees, and every one of them reaches a public URL and a share card:
 *
 *   measure_split (5)        the canonical text of five propositions is a sentence cut in half.
 *                            `c7-s08-m02` stops on "et l'autorité" and loses "hiérarchique du
 *                            préfet" -- the State's control over municipal police. `c10-s03-k01`,
 *                            already cited by faq-29, stops on "(1 216 euros pour une".
 *                            FUSED here, exactly as the retrieval already does (D6.1); the
 *                            fragment id survives as a redirect alias so no link ever breaks.
 *   heading_paragraph (2)    "Par la loi :" and "Dans le cadre de l'Assemblée constituante :"
 *                            carry the legal scope of the measures that follow. Without it,
 *                            c1-s02-m01 (proportional voting, by law) and c1-s02-m03 (abolishing
 *                            the 49.3, only inside a new Constituent Assembly) are served with
 *                            exactly the same status. A measure conditioned on a new constitution
 *                            shared as an immediate repeal is the confusion adversaries exploit
 *                            most readily. Recorded here as `scopeId`.
 *   prose_after_measures (2) closing prose, rendered at the end of the section, never as a chapeau.
 *
 * No text is ever rewritten: fusion concatenates two verbatim strings with a single space, and
 * no typo is corrected (D1.8). The only other transformation is the D3.6 whitespace rule.
 *
 * Run from the repository root:  npx tsx scripts/build-projection.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import type { Dataset, SourceAnomaly } from './aec-types.ts';

export interface SlimSubMeasure {
  kind: 'sub_measure';
  id: string;
  text: string;
}

export interface SlimItem {
  kind: 'paragraph' | 'key_measure' | 'measure';
  id: string;
  text: string;
  subMeasures?: SlimSubMeasure[];
  /** Id of the `heading_paragraph` that scopes this item, when there is one. */
  scopeId?: string;
  /** Set on the `heading_paragraph` itself, so the renderer never treats it as a chapeau. */
  isScopeHeading?: true;
  /** Set on a `statistic_as_paragraph`, rendered as a stat card rather than as prose. */
  isStatistic?: true;
  /** Set on `prose_after_measures`, rendered at the end of the section. */
  isClosingProse?: true;
  /** Ids merged into this text by `measure_split` fusion; they redirect here. */
  mergedIds?: string[];
}

export interface SlimSection {
  id: string;
  chapterId: string;
  partId: string;
  title: string;
  url: string;
  items: SlimItem[];
  chiffres: { id: string; text: string }[];
}

export interface SlimCorpus {
  meta: { corpus_version: string; official_count: number };
  chapters: { id: string; number: number; title: string; partId: string }[];
  sections: SlimSection[];
  /** Fragment id -> id of the proposition that now carries the whole sentence. */
  redirects: Record<string, string>;
}

/** D3.6: U+202F is absent from the subset fonts; normalise to U+00A0. */
const normaliseSpaces = (text: string): string => text.replace(/\u202f/g, '\u00a0');

const byKind = (anomalies: SourceAnomaly[], kind: SourceAnomaly['kind']): SourceAnomaly[] =>
  anomalies.filter((a) => a.kind === kind);

export function buildProjection(source: Dataset): SlimCorpus {
  const anomalies = source.meta.source_anomalies;

  // measure_split: continuation paragraph id -> proposition it completes.
  const continuationOf = new Map<string, string>();
  for (const a of byKind(anomalies, 'measure_split')) {
    if (a.relatedId !== null) continuationOf.set(a.id, a.relatedId);
  }
  const headingIds = new Set(byKind(anomalies, 'heading_paragraph').map((a) => a.id));
  const statisticIds = new Set(byKind(anomalies, 'statistic_as_paragraph').map((a) => a.id));
  const closingIds = new Set(byKind(anomalies, 'prose_after_measures').map((a) => a.id));

  const redirects: Record<string, string> = {};

  const sections: SlimSection[] = source.sections.map((s) => {
    // Pass 1: collect the continuation text keyed by the proposition it belongs to.
    const tail = new Map<string, { id: string; text: string }>();
    for (const item of s.items) {
      const base = continuationOf.get(item.id);
      if (base !== undefined) tail.set(base, { id: item.id, text: item.text });
    }

    // Pass 2: emit items in document order, fusing and scoping as we go.
    const items: SlimItem[] = [];
    let scopeId: string | undefined;

    for (const raw of s.items) {
      // The continuation paragraph is not served on its own: its text now lives in the measure.
      if (continuationOf.has(raw.id)) continue;

      const item: SlimItem = { kind: raw.kind, id: raw.id, text: normaliseSpaces(raw.text) };

      const merged = tail.get(raw.id);
      if (merged !== undefined) {
        // Verbatim + verbatim, joined by one space. Nothing is rewritten.
        item.text = normaliseSpaces(`${raw.text} ${merged.text}`);
        item.mergedIds = [merged.id];
        redirects[merged.id] = raw.id;
      }

      if (headingIds.has(raw.id)) {
        // A heading opens a scope and closes the previous one; it is not scoped by itself.
        scopeId = raw.id;
        item.isScopeHeading = true;
      } else if (raw.kind === 'paragraph' && (statisticIds.has(raw.id) || closingIds.has(raw.id))) {
        if (statisticIds.has(raw.id)) item.isStatistic = true;
        if (closingIds.has(raw.id)) item.isClosingProse = true;
      } else if (scopeId !== undefined && raw.kind !== 'paragraph') {
        item.scopeId = scopeId;
      }

      if (raw.kind === 'measure' && raw.subMeasures !== undefined && raw.subMeasures.length > 0) {
        item.subMeasures = raw.subMeasures.map((sm) => ({
          kind: 'sub_measure' as const,
          id: sm.id,
          text: normaliseSpaces(sm.text),
        }));
      }

      items.push(item);
    }

    return {
      id: s.id,
      chapterId: s.chapterId,
      partId: s.partId,
      title: s.title,
      url: s.url,
      items,
      chiffres: s.chiffres.map((c) => ({ id: c.id, text: normaliseSpaces(c.text) })),
    };
  });

  return {
    // No build timestamp: `npm run build` twice in a row must produce byte-identical output,
    // and corpus_version is the real key of cache, PWA and /exactitude anyway (D7.11, ADR-12).
    meta: {
      corpus_version: source.meta.corpus_version,
      official_count: source.meta.official_count,
    },
    chapters: source.chapters.map((c) => ({
      id: c.id,
      number: c.number,
      title: c.title,
      partId: c.partId,
    })),
    sections,
    redirects,
  };
}

/** Every text served under the "Texte du programme" label. */
export function servedTexts(slim: SlimCorpus): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  for (const s of slim.sections) {
    for (const i of s.items) {
      if (i.kind === 'paragraph') continue;
      out.push({ id: i.id, text: i.text });
      for (const sm of i.subMeasures ?? []) out.push({ id: sm.id, text: sm.text });
    }
  }
  return out;
}

/**
 * The blocking build test of H-COR-10.
 *
 * Note what it does NOT test. Measures in this corpus are imperative clauses with no final
 * period -- "Élire l'Assemblée nationale au scrutin proportionnel" is complete and correct.
 * A "must end on strong punctuation" rule flags 741 of 837 propositions: it would be a rule
 * about the source's house style, not about truncation, and turning it on would mean either
 * disabling the gate on day two or "fixing" verbatim text, which D1.8 forbids.
 *
 * What is actually checked is exact rather than heuristic: every `measure_split` recorded in
 * `meta.source_anomalies` must have been fused, and its fragment must no longer be served on
 * its own. A lexical rule could not do this job anyway -- of the five real splits, three end on
 * an ordinary noun or adjective ("et l'autorité", "ses missions", "foncier agricole, forestier")
 * and are indistinguishable from a complete measure by shape alone. The corpus already knows
 * where the cuts are; the gate's job is to prove they were all closed.
 *
 * The dangling-word and unbalanced-parenthesis checks stay as a cheap net for a future
 * re-crawl that introduces a split the ingester did not label.
 */
const FUNCTION_WORD =
  /^(?:et|ou|ni|mais|donc|car|de|du|des|d'|à|au|aux|en|dans|sur|sous|par|pour|avec|sans|vers|chez|entre|comme|que|qui|dont|où|le|la|les|un|une|ce|cet|cette|ses|son|sa|leur|leurs|notamment|dès|selon)$/iu;

export interface ProjectionProblem {
  id: string;
  reason: string;
  tail: string;
}

/** A recorded split that is still served in two pieces. */
export function unfusedSplits(source: Dataset, slim: SlimCorpus): ProjectionProblem[] {
  const problems: ProjectionProblem[] = [];
  const servedIds = new Set(servedTexts(slim).map((t) => t.id));
  const byId = new Map(servedTexts(slim).map((t) => [t.id, t.text]));

  for (const a of source.meta.source_anomalies) {
    if (a.kind !== 'measure_split' || a.relatedId === null) continue;
    if (servedIds.has(a.id)) {
      problems.push({
        id: a.id,
        reason: `fragment of ${a.relatedId} is still served on its own`,
        tail: '',
      });
    }
    if (slim.redirects[a.id] !== a.relatedId) {
      problems.push({ id: a.id, reason: `no redirect to ${a.relatedId}`, tail: '' });
    }
    const fused = byId.get(a.relatedId);
    const original = source.sections
      .flatMap((s) => s.items)
      .find((i) => i.id === a.relatedId)?.text;
    if (fused === undefined || original === undefined || fused.length <= original.length) {
      problems.push({
        id: a.relatedId,
        reason: 'text was not extended by its continuation',
        tail: '',
      });
    }
  }
  return problems;
}

/** Cheap net for an unlabelled split introduced by a future re-crawl. */
export function danglingTexts(slim: SlimCorpus): ProjectionProblem[] {
  const bad: ProjectionProblem[] = [];
  for (const { id, text } of servedTexts(slim)) {
    const t = text.trimEnd();
    const opens = (t.match(/\(/g) ?? []).length;
    const closes = (t.match(/\)/g) ?? []).length;
    // Only a text ending on a bare word can be dangling. One ending on punctuation is finished
    // as published: "(désamiantage notamment)" and "notamment pour :" are both complete, the
    // second deliberately introducing its sub-measures.
    const endsOnWord = /[\p{L}\p{N}]$/u.test(t);
    const lastWord = endsOnWord ? (t.split(/[\s\u00a0]+/u).pop() ?? '') : '';
    if (opens > closes)
      bad.push({ id, reason: 'unbalanced opening parenthesis', tail: t.slice(-50) });
    else if (endsOnWord && FUNCTION_WORD.test(lastWord)) {
      bad.push({ id, reason: `ends on "${lastWord}"`, tail: t.slice(-50) });
    }
  }
  return bad;
}

const isMain = process.argv[1]?.endsWith('build-projection.ts') ?? false;
if (isMain) {
  const root = process.cwd();
  const source = JSON.parse(readFileSync(resolve(root, 'data/aec-2025.json'), 'utf8')) as Dataset;
  const slim = buildProjection(source);

  const problems = [...unfusedSplits(source, slim), ...danglingTexts(slim)];
  if (problems.length > 0) {
    console.error(`FAIL: ${String(problems.length)} served verbatim(s) are truncated:`);
    for (const d of problems)
      console.error(`  ${d.id}: ${d.reason}${d.tail ? ` — …${d.tail}` : ''}`);
    process.exit(1);
  }

  mkdirSync(resolve(root, 'build'), { recursive: true });
  const json = JSON.stringify(slim);
  writeFileSync(resolve(root, 'build/slim.json'), json);

  const raw = Buffer.byteLength(json, 'utf8');
  const gz = gzipSync(json, { level: 9 }).byteLength;
  const merged = Object.keys(slim.redirects).length;
  const scoped = slim.sections.reduce(
    (n, s) => n + s.items.filter((i) => i.scopeId !== undefined).length,
    0,
  );
  console.log(
    `slim.json: ${String(slim.sections.length)} sections, ${String(servedTexts(slim).length)} served texts, ` +
      `${String(merged)} measure_split fused, ${String(scoped)} items scoped, corpus ${slim.meta.corpus_version}`,
  );
  // zlib level 9 is the tool that produced the published corpus figure; `gzip -9` gives a
  // different number for the same bytes, so the tool is named wherever a size is asserted.
  console.log(
    `slim.json: raw ${String(raw)} B, zlib level 9 ${String(gz)} B (${(gz / 1024).toFixed(1)} KB)`,
  );
}
