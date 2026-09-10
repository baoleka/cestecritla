/**
 * Freshness diff: compares a candidate corpus (freshly produced by `ingest.ts --out`) with the
 * committed one (data/aec-2025.json + data/hashes.json) and prints a French Markdown report.
 * The source site sends no Last-Modified / ETag, so freshness is decided on the SHA-256 hashes
 * recorded by the ingestion: one per section (normalized HTML) and one per text item.
 *
 * Usage:
 *   npx tsx scripts/diff.ts [candidate.json] [--out report.md]
 *     candidate.json  defaults to data/aec-2025.next.json
 *     --out           also write the report to this path (it is always printed to stdout)
 *
 * Exit codes: 0 = no change, 3 = changes detected, 1 = error (missing/inconsistent files).
 * The last line of the report is always "AUCUN CHANGEMENT" or "N SECTION(S) MODIFIÉE(S)".
 *
 * Nothing is rewritten: every excerpt is the verbatim source text, truncated to 100 characters
 * (CC BY-NC-SA 4.0, attribution "La France insoumise – L'Avenir en commun").
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { DATASET_PATH, DATA_DIR, HASHES_PATH, computeCorpusVersion } from './ingest.js';
import type {
  Counts,
  Dataset,
  HashesFile,
  Introduction,
  Part,
  Section,
  Chapter,
} from './aec-types.js';

export const EXIT_NO_CHANGE = 0;
export const EXIT_ERROR = 1;
export const EXIT_CHANGES = 3;

const DEFAULT_CANDIDATE_PATH = resolve(DATA_DIR, 'aec-2025.next.json');
const EXCERPT_LENGTH = 100;
const ROOT_DIR = resolve(DATA_DIR, '..');

export class DiffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiffError';
  }
}

// ---------------------------------------------------------------------------------------------
// Loading and validation
// ---------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJson(path: string, label: string): unknown {
  if (!existsSync(path)) throw new DiffError(`${label} introuvable : ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new DiffError(`${label} illisible (${path}) : ${reason}`);
  }
}

/** Shallow shape check: enough to trust the fields the diff reads, without a full validator. */
function assertDataset(value: unknown, label: string): asserts value is Dataset {
  const ok =
    isRecord(value) &&
    isRecord(value.meta) &&
    typeof value.meta.corpus_version === 'string' &&
    typeof value.meta.crawled_at === 'string' &&
    isRecord(value.meta.counts) &&
    Array.isArray(value.meta.duplicate_propositions) &&
    Array.isArray(value.meta.source_anomalies) &&
    Array.isArray(value.meta.redirected_section_ids) &&
    isRecord(value.introduction) &&
    Array.isArray(value.introduction.paragraphs) &&
    Array.isArray(value.parts) &&
    Array.isArray(value.chapters) &&
    Array.isArray(value.sections) &&
    value.sections.every(
      (s: unknown) =>
        isRecord(s) &&
        typeof s.id === 'string' &&
        typeof s.hash === 'string' &&
        typeof s.title === 'string' &&
        typeof s.url === 'string' &&
        Array.isArray(s.items) &&
        Array.isArray(s.chiffres),
    );
  if (!ok) throw new DiffError(`${label} n’a pas la forme attendue d’un jeu de données AEC`);
}

function assertHashesFile(value: unknown, label: string): asserts value is HashesFile {
  const ok =
    isRecord(value) && typeof value.corpus_version === 'string' && isRecord(value.sections);
  if (!ok) throw new DiffError(`${label} n’a pas la forme attendue (corpus_version, sections)`);
}

/** The committed pair must agree with itself, otherwise the comparison base is meaningless. */
function assertCommittedConsistency(base: Dataset, hashes: HashesFile): void {
  const problems: string[] = [];
  if (hashes.corpus_version !== base.meta.corpus_version) {
    problems.push(
      `corpus_version ${hashes.corpus_version} (hashes.json) ≠ ${base.meta.corpus_version} (aec-2025.json)`,
    );
  }
  const recomputed = computeCorpusVersion(base.sections);
  if (recomputed !== base.meta.corpus_version) {
    problems.push(
      `corpus_version recalculée ${recomputed} ≠ ${base.meta.corpus_version} (aec-2025.json)`,
    );
  }
  const hashedIds = new Set(Object.keys(hashes.sections));
  for (const section of base.sections) {
    const entry = hashes.sections[section.id];
    if (entry === undefined) problems.push(`section ${section.id} absente de hashes.json`);
    else if (entry.hash !== section.hash) problems.push(`empreinte de ${section.id} divergente`);
    hashedIds.delete(section.id);
  }
  for (const id of hashedIds)
    problems.push(`section ${id} dans hashes.json mais pas dans le corpus`);
  if (problems.length > 0) {
    throw new DiffError(
      `data/aec-2025.json et data/hashes.json sont incohérents (relancer l’ingestion) :\n - ${problems.join('\n - ')}`,
    );
  }
}

function assertCandidateIntegrity(candidate: Dataset): void {
  const recomputed = computeCorpusVersion(candidate.sections);
  if (recomputed !== candidate.meta.corpus_version) {
    throw new DiffError(
      `corpus candidat corrompu : corpus_version recalculée ${recomputed} ≠ ${candidate.meta.corpus_version}`,
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Item-level diff (ids are positional, so renumbering is told apart from real edits)
// ---------------------------------------------------------------------------------------------

export interface Atom {
  id: string;
  /** French label of the item kind, for the report. */
  kind: string;
  text: string;
  hash: string;
}

const KIND_FR: Record<string, string> = {
  paragraph: 'paragraphe',
  key_measure: 'mesure clé',
  measure: 'mesure',
  sub_measure: 'sous-mesure',
  chiffre: 'À savoir',
  epigraph: 'épigraphe',
};

function atom(item: { id: string; kind: string; text: string; hash: string }): Atom {
  return { id: item.id, kind: KIND_FR[item.kind] ?? item.kind, text: item.text, hash: item.hash };
}

export function atomsOfSection(section: Section): Atom[] {
  const out: Atom[] = [];
  for (const item of section.items) {
    out.push(atom(item));
    if (item.kind === 'measure') for (const sub of item.subMeasures ?? []) out.push(atom(sub));
  }
  for (const c of section.chiffres) out.push(atom(c));
  return out;
}

export function atomsOfProse(page: Introduction | Part): Atom[] {
  const out: Atom[] = [];
  if ('epigraphs' in page) for (const e of page.epigraphs) out.push(atom(e));
  for (const p of page.paragraphs) out.push(atom(p));
  return out;
}

export interface AtomPair {
  before: Atom;
  after: Atom;
}

export interface AtomDiff {
  added: Atom[];
  removed: Atom[];
  /** Same id, different text. */
  modified: AtomPair[];
  /** Same text, different id (an insertion or deletion shifted the positional numbering). */
  renumbered: AtomPair[];
}

export function isEmptyAtomDiff(diff: AtomDiff): boolean {
  return (
    diff.added.length === 0 &&
    diff.removed.length === 0 &&
    diff.modified.length === 0 &&
    diff.renumbered.length === 0
  );
}

export function diffAtoms(before: readonly Atom[], after: readonly Atom[]): AtomDiff {
  const beforeById = new Map(before.map((a) => [a.id, a]));
  const afterById = new Map(after.map((a) => [a.id, a]));
  const unchanged = new Set<string>();
  for (const [id, a] of afterById) {
    if (beforeById.get(id)?.hash === a.hash) unchanged.add(id);
  }
  const pendingBefore = before.filter((a) => !unchanged.has(a.id));
  const pendingAfter = after.filter((a) => !unchanged.has(a.id));

  // 1. Same text under another id: renumbered (greedy, in reading order).
  const beforeByHash = new Map<string, Atom[]>();
  for (const a of pendingBefore) beforeByHash.set(a.hash, [...(beforeByHash.get(a.hash) ?? []), a]);
  const consumedBefore = new Set<string>();
  const consumedAfter = new Set<string>();
  const renumbered: AtomPair[] = [];
  for (const a of pendingAfter) {
    const candidates = beforeByHash.get(a.hash);
    const match = candidates?.shift();
    if (match === undefined) continue;
    renumbered.push({ before: match, after: a });
    consumedBefore.add(match.id);
    consumedAfter.add(a.id);
  }

  // 2. Same id, different text: modified.
  const modified: AtomPair[] = [];
  for (const a of pendingAfter) {
    if (consumedAfter.has(a.id)) continue;
    const b = beforeById.get(a.id);
    if (b === undefined || consumedBefore.has(b.id)) continue;
    modified.push({ before: b, after: a });
    consumedBefore.add(b.id);
    consumedAfter.add(a.id);
  }

  // 3. Whatever is left.
  const added = pendingAfter.filter((a) => !consumedAfter.has(a.id));
  const removed = pendingBefore.filter((a) => !consumedBefore.has(a.id));
  return { added, removed, modified, renumbered };
}

// ---------------------------------------------------------------------------------------------
// Corpus-level diff
// ---------------------------------------------------------------------------------------------

interface FieldChange {
  label: string;
  before: string;
  after: string;
}

interface SectionChange {
  id: string;
  title: string;
  url: string;
  fields: FieldChange[];
  atoms: AtomDiff;
}

interface ProseChange {
  id: string;
  title: string;
  fields: FieldChange[];
  atoms: AtomDiff;
}

interface CountChange {
  key: keyof Counts;
  before: number;
  after: number;
}

export interface CorpusDiff {
  basePath: string;
  candidatePath: string;
  base: Pick<Dataset['meta'], 'corpus_version' | 'crawled_at'>;
  candidate: Pick<Dataset['meta'], 'corpus_version' | 'crawled_at'>;
  sectionsAdded: Section[];
  sectionsRemoved: Section[];
  sectionsModified: SectionChange[];
  /** Introduction and part pages whose prose or metadata changed. */
  proseModified: ProseChange[];
  /** Chapter list / membership changes (structure, no text). */
  structure: string[];
  counts: CountChange[];
  meta: FieldChange[];
}

function fieldChanges<T extends object>(
  before: T,
  after: T,
  fields: { key: keyof T; label: string }[],
): FieldChange[] {
  const out: FieldChange[] = [];
  for (const { key, label } of fields) {
    const b = JSON.stringify(before[key]);
    const a = JSON.stringify(after[key]);
    if (b !== a) out.push({ label, before: String(before[key]), after: String(after[key]) });
  }
  return out;
}

function diffSections(
  base: Dataset,
  candidate: Dataset,
): Pick<CorpusDiff, 'sectionsAdded' | 'sectionsRemoved' | 'sectionsModified'> {
  const baseById = new Map(base.sections.map((s) => [s.id, s]));
  const candidateById = new Map(candidate.sections.map((s) => [s.id, s]));
  const sectionsAdded = candidate.sections.filter((s) => !baseById.has(s.id));
  const sectionsRemoved = base.sections.filter((s) => !candidateById.has(s.id));
  const sectionsModified: SectionChange[] = [];
  for (const after of candidate.sections) {
    const before = baseById.get(after.id);
    if (before === undefined) continue;
    const fields = fieldChanges(before, after, [
      { key: 'hash', label: 'Empreinte' },
      { key: 'title', label: 'Titre' },
      { key: 'url', label: 'URL' },
      { key: 'canonicalUrl', label: 'URL canonique' },
      { key: 'chapterId', label: 'Chapitre' },
      { key: 'partId', label: 'Partie' },
    ]);
    const atoms = diffAtoms(atomsOfSection(before), atomsOfSection(after));
    if (fields.length > 0 || !isEmptyAtomDiff(atoms)) {
      sectionsModified.push({ id: after.id, title: after.title, url: after.url, fields, atoms });
    }
  }
  return { sectionsAdded, sectionsRemoved, sectionsModified };
}

function diffProse(base: Dataset, candidate: Dataset): ProseChange[] {
  const out: ProseChange[] = [];
  const introFields = fieldChanges(base.introduction, candidate.introduction, [
    { key: 'title', label: 'Titre' },
    { key: 'url', label: 'URL' },
  ]);
  const introAtoms = diffAtoms(
    atomsOfProse(base.introduction),
    atomsOfProse(candidate.introduction),
  );
  if (introFields.length > 0 || !isEmptyAtomDiff(introAtoms)) {
    out.push({
      id: candidate.introduction.id,
      title: candidate.introduction.title,
      fields: introFields,
      atoms: introAtoms,
    });
  }
  const baseParts = new Map(base.parts.map((p) => [p.id, p]));
  for (const after of candidate.parts) {
    const before = baseParts.get(after.id);
    if (before === undefined) continue;
    const fields = fieldChanges(before, after, [
      { key: 'title', label: 'Titre' },
      { key: 'url', label: 'URL' },
      { key: 'slug', label: 'Slug' },
    ]);
    const atoms = diffAtoms(atomsOfProse(before), atomsOfProse(after));
    if (fields.length > 0 || !isEmptyAtomDiff(atoms)) {
      out.push({ id: after.id, title: after.title, fields, atoms });
    }
  }
  return out;
}

function describeChapter(c: Chapter): string {
  return `\`${c.id}\` « ${c.title} » (${String(c.sectionIds.length)} section(s), ${c.partId})`;
}

function diffStructure(base: Dataset, candidate: Dataset): string[] {
  const out: string[] = [];
  const baseParts = new Map(base.parts.map((p) => [p.id, p]));
  const candidateParts = new Map(candidate.parts.map((p) => [p.id, p]));
  for (const p of candidate.parts) {
    const b = baseParts.get(p.id);
    if (b === undefined) out.push(`Partie ajoutée : \`${p.id}\` « ${p.title} »`);
    else if (b.chapterIds.join(',') !== p.chapterIds.join(',')) {
      out.push(
        `Chapitres de \`${p.id}\` : ${b.chapterIds.join(', ')} → ${p.chapterIds.join(', ')}`,
      );
    }
  }
  for (const p of base.parts) {
    if (!candidateParts.has(p.id)) out.push(`Partie supprimée : \`${p.id}\` « ${p.title} »`);
  }
  const baseChapters = new Map(base.chapters.map((c) => [c.id, c]));
  const candidateChapters = new Map(candidate.chapters.map((c) => [c.id, c]));
  for (const c of candidate.chapters) {
    const b = baseChapters.get(c.id);
    if (b === undefined) {
      out.push(`Chapitre ajouté : ${describeChapter(c)}`);
      continue;
    }
    for (const f of fieldChanges(b, c, [
      { key: 'title', label: 'Titre' },
      { key: 'url', label: 'URL' },
      { key: 'partId', label: 'Partie' },
    ])) {
      out.push(`${f.label} de \`${c.id}\` : « ${f.before} » → « ${f.after} »`);
    }
    if (b.sectionIds.join(',') !== c.sectionIds.join(',')) {
      out.push(`Sections de \`${c.id}\` : ${b.sectionIds.join(', ')} → ${c.sectionIds.join(', ')}`);
    }
  }
  for (const c of base.chapters) {
    if (!candidateChapters.has(c.id)) out.push(`Chapitre supprimé : ${describeChapter(c)}`);
  }
  return out;
}

function diffCounts(base: Counts, candidate: Counts): CountChange[] {
  const keys = new Set<keyof Counts>([
    ...(Object.keys(base) as (keyof Counts)[]),
    ...(Object.keys(candidate) as (keyof Counts)[]),
  ]);
  const out: CountChange[] = [];
  for (const key of keys) {
    const before = base[key];
    const after = candidate[key];
    if (before !== after) out.push({ key, before, after });
  }
  return out;
}

function diffMeta(base: Dataset['meta'], candidate: Dataset['meta']): FieldChange[] {
  const out: FieldChange[] = [];
  const dup = [base.duplicate_propositions.length, candidate.duplicate_propositions.length];
  if (dup[0] !== dup[1]) {
    out.push({
      label: 'Propositions dupliquées',
      before: String(dup[0]),
      after: String(dup[1]),
    });
  }
  const anomalies = [base.source_anomalies.length, candidate.source_anomalies.length];
  if (anomalies[0] !== anomalies[1]) {
    out.push({
      label: 'Anomalies de source',
      before: String(anomalies[0]),
      after: String(anomalies[1]),
    });
  }
  const redirected = [
    base.redirected_section_ids.join(', '),
    candidate.redirected_section_ids.join(', '),
  ];
  if (redirected[0] !== redirected[1]) {
    out.push({
      label: 'Sections redirigées',
      before: redirected[0] === '' ? '(aucune)' : (redirected[0] ?? ''),
      after: redirected[1] === '' ? '(aucune)' : (redirected[1] ?? ''),
    });
  }
  if (base.official_count_paragraph_id !== candidate.official_count_paragraph_id) {
    out.push({
      label: 'Paragraphe « 831 mesures »',
      before: base.official_count_paragraph_id,
      after: candidate.official_count_paragraph_id,
    });
  }
  return out;
}

export function diffCorpus(
  base: Dataset,
  candidate: Dataset,
  paths: { basePath: string; candidatePath: string },
): CorpusDiff {
  return {
    basePath: paths.basePath,
    candidatePath: paths.candidatePath,
    base: { corpus_version: base.meta.corpus_version, crawled_at: base.meta.crawled_at },
    candidate: {
      corpus_version: candidate.meta.corpus_version,
      crawled_at: candidate.meta.crawled_at,
    },
    ...diffSections(base, candidate),
    proseModified: diffProse(base, candidate),
    structure: diffStructure(base, candidate),
    counts: diffCounts(base.meta.counts, candidate.meta.counts),
    meta: diffMeta(base.meta, candidate.meta),
  };
}

/** Number of "pages" that changed: sections added + removed + modified, introduction and parts. */
export function changedSectionCount(diff: CorpusDiff): number {
  return (
    diff.sectionsAdded.length +
    diff.sectionsRemoved.length +
    diff.sectionsModified.length +
    diff.proseModified.length
  );
}

export function hasChanges(diff: CorpusDiff): boolean {
  return (
    changedSectionCount(diff) > 0 ||
    diff.structure.length > 0 ||
    diff.counts.length > 0 ||
    diff.base.corpus_version !== diff.candidate.corpus_version
  );
}

// ---------------------------------------------------------------------------------------------
// Report (French Markdown)
// ---------------------------------------------------------------------------------------------

const GRAPHEMES = new Intl.Segmenter('fr', { granularity: 'grapheme' });
/** Graphemes of context kept before the first difference when an edit sits deep in a text. */
const CONTEXT_BEFORE_DIFF = 30;

function graphemes(text: string): string[] {
  return Array.from(GRAPHEMES.segment(text), (s) => s.segment);
}

/**
 * At most `length` graphemes of a verbatim text, starting at grapheme `from` (never splits a
 * combining sequence); "…" marks whatever was cut on either side.
 */
export function excerpt(text: string, length = EXCERPT_LENGTH, from = 0): string {
  const all = graphemes(text);
  const head = from > 0 ? '…' : '';
  const budget = length - head.length;
  if (all.length - from <= budget) return `${head}${all.slice(from).join('')}`;
  return `${head}${all.slice(from, from + budget - 1).join('')}…`;
}

/** Index of the first grapheme where two texts differ (their common length if one is a prefix). */
export function firstDifference(a: string, b: string): number {
  const ga = graphemes(a);
  const gb = graphemes(b);
  let i = 0;
  while (i < ga.length && i < gb.length && ga[i] === gb[i]) i += 1;
  return i;
}

function quote(text: string): string {
  return `« ${excerpt(text)} »`;
}

/** Before/after excerpts of a modified text, windowed so that the edit is actually visible. */
function quotePair(before: string, after: string): [string, string] {
  const at = firstDifference(before, after);
  const from = at + CONTEXT_BEFORE_DIFF < EXCERPT_LENGTH ? 0 : at - CONTEXT_BEFORE_DIFF;
  return [
    `« ${excerpt(before, EXCERPT_LENGTH, from)} »`,
    `« ${excerpt(after, EXCERPT_LENGTH, from)} »`,
  ];
}

function displayPath(path: string): string {
  const rel = relative(ROOT_DIR, path);
  return rel === '' || rel.startsWith('..') || isAbsolute(rel) ? path : rel;
}

function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${String(n)} ${n > 1 ? pluralForm : singular}`;
}

function atomDiffLines(diff: AtomDiff): string[] {
  const lines: string[] = [];
  if (diff.added.length > 0) {
    lines.push(`- Éléments ajoutés (${String(diff.added.length)}) :`);
    for (const a of diff.added) lines.push(`  - \`${a.id}\` (${a.kind}) : ${quote(a.text)}`);
  }
  if (diff.removed.length > 0) {
    lines.push(`- Éléments supprimés (${String(diff.removed.length)}) :`);
    for (const a of diff.removed) lines.push(`  - \`${a.id}\` (${a.kind}) : ${quote(a.text)}`);
  }
  if (diff.modified.length > 0) {
    lines.push(`- Éléments modifiés (${String(diff.modified.length)}) :`);
    for (const { before, after } of diff.modified) {
      const [beforeQuote, afterQuote] = quotePair(before.text, after.text);
      lines.push(`  - \`${after.id}\` (${after.kind})`);
      lines.push(`    - avant : ${beforeQuote}`);
      lines.push(`    - après : ${afterQuote}`);
    }
  }
  if (diff.renumbered.length > 0) {
    lines.push(
      `- Éléments renumérotés (${String(diff.renumbered.length)}, texte identique, identifiant décalé) :`,
    );
    for (const { before, after } of diff.renumbered) {
      lines.push(`  - \`${before.id}\` → \`${after.id}\` (${after.kind}) : ${quote(after.text)}`);
    }
  }
  return lines;
}

function fieldLines(fields: FieldChange[]): string[] {
  return fields.map((f) =>
    f.label === 'Empreinte'
      ? `- ${f.label} : \`${f.before.slice(0, 12)}…\` → \`${f.after.slice(0, 12)}…\``
      : `- ${f.label} : « ${f.before} » → « ${f.after} »`,
  );
}

export function finalLine(diff: CorpusDiff): string {
  return hasChanges(diff)
    ? `${String(changedSectionCount(diff))} SECTION(S) MODIFIÉE(S)`
    : 'AUCUN CHANGEMENT';
}

export function renderReport(diff: CorpusDiff): string {
  const lines: string[] = [];
  const changed = hasChanges(diff);
  const n = changedSectionCount(diff);
  lines.push('# Rapport de re-crawl — L’Avenir en commun 2025');
  lines.push('');
  lines.push(
    `- Corpus de référence : \`${displayPath(diff.basePath)}\` — corpus_version \`${diff.base.corpus_version}\`, crawlé le ${diff.base.crawled_at}`,
  );
  lines.push(
    `- Corpus candidat : \`${displayPath(diff.candidatePath)}\` — corpus_version \`${diff.candidate.corpus_version}\`, crawlé le ${diff.candidate.crawled_at}`,
  );
  lines.push(
    '- Source : https://melenchon2027.fr/programme2025/livre/ — textes sous CC BY-NC-SA 4.0, attribution « La France insoumise – L’Avenir en commun ». Les extraits ci-dessous sont reproduits mot pour mot, tronqués à 100 caractères.',
  );
  lines.push('');
  lines.push('## Résumé');
  lines.push('');
  lines.push('| | Avant | Après |');
  lines.push('|---|---|---|');
  lines.push(
    `| corpus_version | \`${diff.base.corpus_version}\` | \`${diff.candidate.corpus_version}\` |`,
  );
  lines.push(`| Sections ajoutées | | ${String(diff.sectionsAdded.length)} |`);
  lines.push(`| Sections supprimées | | ${String(diff.sectionsRemoved.length)} |`);
  lines.push(`| Sections modifiées | | ${String(diff.sectionsModified.length)} |`);
  lines.push(`| Introduction / parties modifiées | | ${String(diff.proseModified.length)} |`);
  lines.push(`| Changements de structure | | ${String(diff.structure.length)} |`);
  lines.push(`| Compteurs modifiés | | ${String(diff.counts.length)} |`);
  lines.push('');
  if (changed && n === 0) {
    lines.push(
      '> Aucune section n’a changé, mais les métadonnées (corpus_version, compteurs ou structure) diffèrent : vérifier que les scripts d’ingestion n’ont pas changé de méthode de calcul.',
    );
    lines.push('');
  }

  lines.push(`## Sections ajoutées (${String(diff.sectionsAdded.length)})`);
  lines.push('');
  if (diff.sectionsAdded.length === 0) lines.push('Aucune.');
  for (const s of diff.sectionsAdded) {
    const atoms = atomsOfSection(s);
    lines.push(`- \`${s.id}\` « ${s.title} » — ${s.url} — ${plural(atoms.length, 'élément')}`);
  }
  lines.push('');

  lines.push(`## Sections supprimées (${String(diff.sectionsRemoved.length)})`);
  lines.push('');
  if (diff.sectionsRemoved.length === 0) lines.push('Aucune.');
  for (const s of diff.sectionsRemoved) {
    const atoms = atomsOfSection(s);
    lines.push(`- \`${s.id}\` « ${s.title} » — ${s.url} — ${plural(atoms.length, 'élément')}`);
  }
  lines.push('');

  lines.push(`## Sections modifiées (${String(diff.sectionsModified.length)})`);
  lines.push('');
  if (diff.sectionsModified.length === 0) lines.push('Aucune.', '');
  for (const s of diff.sectionsModified) {
    lines.push(`### \`${s.id}\` « ${s.title} »`);
    lines.push('');
    lines.push(`- URL : ${s.url}`);
    lines.push(...fieldLines(s.fields));
    lines.push(...atomDiffLines(s.atoms));
    lines.push('');
  }

  lines.push(`## Introduction et parties modifiées (${String(diff.proseModified.length)})`);
  lines.push('');
  if (diff.proseModified.length === 0) lines.push('Aucune.', '');
  for (const p of diff.proseModified) {
    lines.push(`### \`${p.id}\` « ${p.title} »`);
    lines.push('');
    lines.push(...fieldLines(p.fields));
    lines.push(...atomDiffLines(p.atoms));
    lines.push('');
  }

  lines.push(`## Structure (${String(diff.structure.length)})`);
  lines.push('');
  if (diff.structure.length === 0) lines.push('Aucun changement de parties ni de chapitres.');
  for (const line of diff.structure) lines.push(`- ${line}`);
  lines.push('');

  lines.push(`## Compteurs (${String(diff.counts.length)})`);
  lines.push('');
  if (diff.counts.length === 0) lines.push('Aucun compteur modifié.');
  else {
    lines.push('| Compteur | Avant | Après | Écart |');
    lines.push('|---|---:|---:|---:|');
    for (const c of diff.counts) {
      const delta = c.after - c.before;
      lines.push(
        `| ${c.key} | ${String(c.before)} | ${String(c.after)} | ${delta > 0 ? '+' : ''}${String(delta)} |`,
      );
    }
  }
  lines.push('');

  if (diff.meta.length > 0) {
    lines.push('## Métadonnées (informatif)');
    lines.push('');
    for (const f of diff.meta) lines.push(`- ${f.label} : ${f.before} → ${f.after}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(finalLine(diff));
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------------------------

interface CliOptions {
  candidatePath: string;
  outPath: string | undefined;
}

function parseCli(argv: readonly string[]): CliOptions {
  const { values, positionals } = parseArgs({
    args: [...argv],
    options: { out: { type: 'string' } },
    strict: true,
    allowPositionals: true,
  });
  if (positionals.length > 1) {
    throw new DiffError(
      `un seul chemin de corpus candidat attendu, reçu : ${positionals.join(' ')}`,
    );
  }
  const candidate = positionals[0];
  return {
    candidatePath: candidate === undefined ? DEFAULT_CANDIDATE_PATH : resolve(candidate),
    outPath: values.out === undefined ? undefined : resolve(values.out),
  };
}

export function run(argv: readonly string[]): number {
  const cli = parseCli(argv);
  if (cli.candidatePath === DATASET_PATH) {
    throw new DiffError(
      'le corpus candidat est le corpus de référence lui-même (data/aec-2025.json)',
    );
  }
  const baseRaw = readJson(DATASET_PATH, 'Corpus de référence');
  assertDataset(baseRaw, 'data/aec-2025.json');
  const hashesRaw = readJson(HASHES_PATH, 'Fichier d’empreintes');
  assertHashesFile(hashesRaw, 'data/hashes.json');
  assertCommittedConsistency(baseRaw, hashesRaw);
  const candidateRaw = readJson(cli.candidatePath, 'Corpus candidat');
  assertDataset(candidateRaw, displayPath(cli.candidatePath));
  assertCandidateIntegrity(candidateRaw);

  const diff = diffCorpus(baseRaw, candidateRaw, {
    basePath: DATASET_PATH,
    candidatePath: cli.candidatePath,
  });
  const report = renderReport(diff);
  process.stdout.write(report);
  if (cli.outPath !== undefined) {
    mkdirSync(dirname(cli.outPath), { recursive: true });
    writeFileSync(cli.outPath, report);
    console.error(`rapport écrit dans ${cli.outPath}`);
  }
  return hasChanges(diff) ? EXIT_CHANGES : EXIT_NO_CHANGE;
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`\nDIFF FAILED: ${message}\n`);
    process.exitCode = EXIT_ERROR;
  }
}
