/**
 * Retrieval core shared by the T6 benches (`eval/retrieval.ts`, `eval/harness.ts`).
 *
 * Variant A of the plan: client-side lexical search (MiniSearch, French normalization, glossary and
 * FAQ aliases as query expansion) over proposition units built from data/aec-2025.json. No embedding,
 * no LLM: everything here runs in 0 neuron and would ship to the browser as is.
 *
 * Units (the D1.6 runtime projection, built in memory):
 *   - proposition = key measure / measure / sub-measure, text enriched by a non-displayed prefix
 *     (chapter title + section title + first sentence of the chapeau + bold heading paragraph, if any);
 *     a `measure_split` paragraph (meta.source_anomalies, D1.8) is merged into its proposition;
 *   - introduction and part paragraphs are indexed as extra units (the evaluation set expects
 *     `intro-p04` for the official measure count, D1.2);
 *   - section = title + chapeau + all propositions (routing unit for variant C).
 */
import { readFileSync } from 'node:fs';
import MiniSearch, { type Query, type SearchOptions, type SearchResult } from 'minisearch';
import type { Dataset, Section } from '../scripts/aec-types.js';

// ---------------------------------------------------------------------------------------------
// Input files
// ---------------------------------------------------------------------------------------------

export type QuestionKind = 'golden' | 'glossary' | 'adversarial';
export type AnswerKind = 'measures' | 'glossary' | 'partial' | 'absent';

export interface Expected {
  readonly answer_kind: AnswerKind;
  readonly refusal: boolean;
  readonly partial: boolean;
  readonly premise_false: boolean;
  readonly glossary_slug: string | null;
  readonly term: string | null;
  readonly section_ids: readonly string[];
  readonly measure_ids: readonly string[];
  readonly tolerated_ids: readonly string[];
  readonly forbidden_ids: readonly string[];
  readonly note_fr: string;
}

export interface Question {
  readonly id: string;
  readonly kind: QuestionKind;
  readonly persona: string;
  readonly question: string;
  readonly difficulty: number;
  readonly expected: Expected;
}

export interface HostilePrompt {
  readonly id: string;
  readonly kind: 'hostile';
  readonly persona: string;
  readonly category: string;
  readonly question: string;
  readonly expected_behaviour_fr: string;
  readonly tolerated_ids: readonly string[];
}

export interface QuestionsFile {
  readonly meta: { readonly version: string; readonly corpus_version: string };
  readonly questions: readonly Question[];
  readonly hostile: readonly HostilePrompt[];
}

export interface GlossaryFile {
  readonly entries: readonly {
    readonly slug: string;
    readonly term: string;
    readonly aliases: readonly string[];
  }[];
}

export interface FaqFile {
  readonly entries: readonly {
    readonly id: string;
    readonly question: string;
    readonly aliases: readonly string[];
  }[];
}

export interface Inputs {
  readonly dataset: Dataset;
  readonly glossary: GlossaryFile;
  readonly faq: FaqFile;
  readonly questionsFile: QuestionsFile;
}

/** Reads the corpus, the glossary, the FAQ and the evaluation set; fails when the set targets another corpus. */
export function loadInputs(): Inputs {
  const dataset = JSON.parse(readFileSync('data/aec-2025.json', 'utf8')) as Dataset;
  const glossary = JSON.parse(readFileSync('data/glossary.json', 'utf8')) as GlossaryFile;
  const faq = JSON.parse(readFileSync('data/faq.json', 'utf8')) as FaqFile;
  const questionsFile = JSON.parse(readFileSync('eval/questions.json', 'utf8')) as QuestionsFile;
  if (questionsFile.meta.corpus_version !== dataset.meta.corpus_version) {
    throw new Error(
      `eval/questions.json targets corpus ${questionsFile.meta.corpus_version}, data/aec-2025.json is ${dataset.meta.corpus_version}`,
    );
  }
  return { dataset, glossary, faq, questionsFile };
}

// ---------------------------------------------------------------------------------------------
// French normalization (shared by indexing and querying)
// ---------------------------------------------------------------------------------------------

/**
 * Function words, modal verbs and the question frames of the evaluation set ("ils proposent quoi
 * sur…", "c'est vrai que…"). Applied at index time and query time alike.
 */
export const STOPWORDS = new Set(
  `le la les l un une des du de d et ou a au aux en dans pour par sur avec sans sous ce cet cette ces se sa son
   ses leur leurs mon ma mes ton ta tes notre nos votre vos il ils elle elles on nous vous je tu me te moi toi lui y
   qui que quoi qu quel quelle quels
   quelles dont ne pas plus non oui est sont etre ete avoir ai as ont fait faire fais font comme mais donc si
   car ni or ca cela ceci celui celle ceux celles tout tous toute toutes meme memes autre autres aussi encore
   bien tres peu deja jamais toujours entre vers chez ici s c m t j n jusqu lorsqu puisqu
   peut peux peuvent pouvoir pourra pourrai pourrais pourrait pourraient doit doivent devoir devrait faut
   faudra faudrait
   programme propose proposent proposer dit dis dire disent veut veulent vouloir prevoit prevoient prevu prevue
   va vont vais vas aller allait allaient compte comptent vraiment concretement exactement juste truc chose
   choses vrai vraie comment pourquoi combien quand seulement egalement notamment particulierement surtout
   plutot tellement beaucoup moins trop assez
   dame madame monsieur oncle tante cousin cousine voisin voisine collegue copain copine pote mec gars type
   ami amie demande demandent demander demande sais sait savoir aider laquelle lequel lesquels lesquelles
   repond reponds repondre`
    .split(/\s+/)
    .filter((w) => w.length > 0),
);

/** Lowercase, NFD accent stripping, unified apostrophes, elisions, digit groups merged ("1 600" -> "1600"). */
export function normalize(text: string): string {
  let s = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`´]/g, "'")
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/aujourd'hui/g, 'aujourdhui');
  // Elisions: l'eau -> eau, d'emploi -> emploi, qu'il -> il, jusqu'a -> a…
  s = s.replace(/\b(l|d|qu|j|n|s|c|m|t|jusqu|lorsqu|puisqu)'(?=[a-z0-9])/g, '');
  // Thousands separators written with a space (corpus: "10 000", questions: "1 600").
  let previous = '';
  while (previous !== s) {
    previous = s;
    s = s.replace(/(\d)\s(\d{3})(?!\d)/g, '$1$2');
  }
  return s;
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/** Light French stemming: plural 's', feminine 'ée' -> 'é', 'eaux' -> 'eau', 'aux' -> 'al', 'ement' / 'ent'. */
export function stem(term: string): string {
  let t = term;
  if (t.length >= 4 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
  if (t.length >= 4 && t.endsWith('ee')) t = t.slice(0, -1);
  if (t.length >= 5 && t.endsWith('eaux')) t = t.slice(0, -1);
  else if (t.length >= 5 && t.endsWith('aux')) t = `${t.slice(0, -3)}al`;
  if (t.endsWith('ement') && t.length - 5 >= 4) t = t.slice(0, -5);
  else if (t.endsWith('ent') && !t.endsWith('ement') && t.length - 3 >= 5) t = t.slice(0, -3);
  return t;
}

/** MiniSearch `processTerm`: stopword removal then stemming; `null` drops the term. */
export function processTerm(term: string): string | null {
  if (STOPWORDS.has(term)) return null;
  if (term.length < 2 && !/\d/.test(term)) return null;
  return stem(term);
}

/** Full query-side pipeline (tokens as MiniSearch would see them). */
export function terms(text: string): string[] {
  return tokenize(text)
    .map(processTerm)
    .filter((t): t is string => t !== null);
}

// ---------------------------------------------------------------------------------------------
// Runtime projection: proposition units and section units
// ---------------------------------------------------------------------------------------------

export type UnitKind =
  'key_measure' | 'measure' | 'sub_measure' | 'intro_paragraph' | 'part_paragraph';

export interface Unit {
  readonly id: string;
  readonly kind: UnitKind;
  readonly sectionId: string | null;
  readonly chapterId: string | null;
  /** Verbatim proposition text (a measure_split continuation is appended, D1.8). */
  readonly text: string;
  /** Non-displayed context: chapter title + section title + chapeau first sentence (+ heading). */
  readonly prefix: string;
  /** Ids covered by this unit besides `id` (the merged measure_split paragraph). */
  readonly mergedIds: readonly string[];
}

export interface SectionUnit {
  readonly id: string;
  readonly chapterId: string;
  readonly text: string;
  readonly prefix: string;
}

export interface Projection {
  readonly propositionUnits: readonly Unit[];
  readonly introUnits: readonly Unit[];
  /** Propositions then introduction / part paragraphs. */
  readonly units: readonly Unit[];
  readonly unitById: ReadonlyMap<string, Unit>;
  /** Expected id -> unit id that covers it (itself, or the proposition a measure_split was merged into). */
  readonly coveringUnitId: ReadonlyMap<string, string>;
  readonly sectionUnits: readonly SectionUnit[];
  /** Propositions of a chapter in reading order (variant C context). */
  readonly chapterContext: ReadonlyMap<string, readonly Unit[]>;
  readonly chapterById: ReadonlyMap<string, Dataset['chapters'][number]>;
  readonly sectionById: ReadonlyMap<string, Section>;
  /** Chapter title without its "Chapitre N :" prefix. */
  readonly chapterLabel: (chapterId: string) => string;
}

/** First sentence of a chapeau, cut at a word boundary (a cut inside a word would index a broken token). */
function firstSentence(text: string, max = 320): string {
  const match = /^(.+?[.!?])(?:\s|$)/u.exec(text);
  const sentence = match?.[1] ?? text;
  if (sentence.length <= max) return sentence;
  const cut = sentence.lastIndexOf(' ', max);
  return sentence.slice(0, cut > 0 ? cut : max);
}

export function buildProjection(dataset: Dataset): Projection {
  const chapterById = new Map(dataset.chapters.map((c) => [c.id, c]));
  const sectionById = new Map(dataset.sections.map((s) => [s.id, s]));
  const anomalyById = new Map(dataset.meta.source_anomalies.map((a) => [a.id, a]));

  const chapterLabel = (chapterId: string): string => {
    const title = chapterById.get(chapterId)?.title ?? '';
    return title.replace(/^Chapitre \d+\s*:\s*/u, '');
  };

  const buildUnits = (section: Section): Unit[] => {
    const chapeau = section.items[0]?.kind === 'paragraph' ? section.items[0].text : '';
    const basePrefix = `${chapterLabel(section.chapterId)}. ${section.title}. ${firstSentence(chapeau)}`;
    let heading = '';
    const out: Unit[] = [];
    const items = section.items;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item === undefined) continue;
      if (item.kind === 'paragraph') {
        if (anomalyById.get(item.id)?.kind === 'heading_paragraph') heading = item.text;
        continue;
      }
      const merged: string[] = [];
      let text = item.text;
      const next = items[i + 1];
      if (next !== undefined && next.kind === 'paragraph') {
        const anomaly = anomalyById.get(next.id);
        if (anomaly?.kind === 'measure_split' && anomaly.relatedId === item.id) {
          text = `${text} ${next.text}`;
          merged.push(next.id);
        }
      }
      const prefix = heading.length > 0 ? `${basePrefix} ${heading}` : basePrefix;
      out.push({
        id: item.id,
        kind: item.kind,
        sectionId: section.id,
        chapterId: section.chapterId,
        text,
        prefix,
        mergedIds: merged,
      });
      if (item.kind === 'measure' && item.subMeasures !== undefined) {
        for (const sub of item.subMeasures) {
          out.push({
            id: sub.id,
            kind: 'sub_measure',
            sectionId: section.id,
            chapterId: section.chapterId,
            text: sub.text,
            prefix: `${prefix} ${item.text}`,
            mergedIds: [],
          });
        }
      }
    }
    return out;
  };

  const propositionUnits: Unit[] = dataset.sections.flatMap(buildUnits);
  const introUnits: Unit[] = [
    ...dataset.introduction.paragraphs.map((p): Unit => ({
      id: p.id,
      kind: 'intro_paragraph',
      sectionId: null,
      chapterId: null,
      text: p.text,
      prefix: dataset.introduction.title,
      mergedIds: [],
    })),
    ...dataset.parts.flatMap((part) =>
      part.paragraphs.map((p): Unit => ({
        id: p.id,
        kind: 'part_paragraph',
        sectionId: null,
        chapterId: null,
        text: p.text,
        prefix: part.title,
        mergedIds: [],
      })),
    ),
  ];
  const units: Unit[] = [...propositionUnits, ...introUnits];
  const unitById = new Map(units.map((u) => [u.id, u]));
  const coveringUnitId = new Map<string, string>();
  for (const u of units) {
    coveringUnitId.set(u.id, u.id);
    for (const m of u.mergedIds) coveringUnitId.set(m, u.id);
  }

  const sectionUnits: SectionUnit[] = dataset.sections.map((section) => {
    const chapeau = section.items
      .filter((i) => i.kind === 'paragraph')
      .map((i) => i.text)
      .join(' ');
    const propositions = propositionUnits
      .filter((u) => u.sectionId === section.id)
      .map((u) => u.text)
      .join(' ');
    return {
      id: section.id,
      chapterId: section.chapterId,
      text: `${section.title}. ${chapeau} ${propositions}`,
      prefix: chapterLabel(section.chapterId),
    };
  });

  const chapterContext = new Map<string, Unit[]>(
    dataset.chapters.map((c) => [c.id, propositionUnits.filter((u) => u.chapterId === c.id)]),
  );

  return {
    propositionUnits,
    introUnits,
    units,
    unitById,
    coveringUnitId,
    sectionUnits,
    chapterContext,
    chapterById,
    sectionById,
    chapterLabel,
  };
}

// ---------------------------------------------------------------------------------------------
// Synonyms (glossary + FAQ aliases) injected as query expansion
// ---------------------------------------------------------------------------------------------

export interface SynonymGroup {
  readonly source: 'glossary' | 'faq';
  readonly key: string;
  readonly phrases: readonly string[];
  /** Processed tokens of each phrase (same pipeline as the index). */
  readonly phraseTerms: readonly (readonly string[])[];
}

function makeGroup(
  source: 'glossary' | 'faq',
  key: string,
  phrases: readonly string[],
): SynonymGroup {
  const unique = [...new Set(phrases.map((p) => p.trim()).filter((p) => p.length > 0))];
  return {
    source,
    key,
    phrases: unique,
    phraseTerms: unique.map(terms).filter((t) => t.length > 0),
  };
}

export function buildSynonymGroups(glossary: GlossaryFile, faq: FaqFile): SynonymGroup[] {
  return [
    ...glossary.entries.map((e) => makeGroup('glossary', e.slug, [e.term, ...e.aliases])),
    ...faq.entries.map((e) => makeGroup('faq', e.id, [e.question, ...e.aliases])),
  ];
}

function containsSequence(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export interface Expansion {
  readonly groups: readonly string[];
  /** Raw phrases handed to MiniSearch as a second, lower-weighted sub-query. */
  readonly text: string;
  readonly addedTerms: readonly string[];
}

export const NO_EXPANSION: Expansion = { groups: [], text: '', addedTerms: [] };
export const MAX_EXPANSION_TERMS = 30;

/** A group fires when one of its phrases appears, as a contiguous processed-token sequence, in the question. */
export function makeExpander(
  synonymGroups: readonly SynonymGroup[],
): (question: string) => Expansion {
  return (question: string): Expansion => {
    const qTerms = terms(question);
    const present = new Set(qTerms);
    const matched: string[] = [];
    const phrases: string[] = [];
    const added: string[] = [];
    for (const group of synonymGroups) {
      if (!group.phraseTerms.some((p) => containsSequence(qTerms, p))) continue;
      matched.push(`${group.source}:${group.key}`);
      for (const phrase of group.phrases) {
        const newTerms = terms(phrase).filter((t) => !present.has(t));
        if (newTerms.length === 0) continue;
        if (added.length + newTerms.length > MAX_EXPANSION_TERMS) break;
        for (const t of newTerms) {
          present.add(t);
          added.push(t);
        }
        phrases.push(phrase);
      }
    }
    return { groups: matched, text: phrases.join(' '), addedTerms: added };
  };
}

// ---------------------------------------------------------------------------------------------
// Search configurations (the plan's spec first, then ablations)
// ---------------------------------------------------------------------------------------------

export interface SearchConfig {
  readonly name: string;
  readonly description_fr: string;
  /** Minimum processed-term length for fuzzy matching (0 = every term, as in the spec). */
  readonly fuzzyMinLength: number;
  /** Minimum processed-term length for prefix matching (0 = every term, as in the spec). */
  readonly prefixMinLength: number;
  readonly boost: { readonly text: number; readonly prefix: number };
  readonly expansion: boolean;
  /** Weight of the expansion sub-query relative to the question (field boosts multiplied by it). */
  readonly expansionBoost: number;
  /** BM25 length-normalization parameter b (MiniSearch default 0.7). */
  readonly bm25b: number;
  /** Maximum edit distance for fuzzy matches (MiniSearch default 6). */
  readonly maxFuzzy: number;
}

export const CONFIGS: readonly SearchConfig[] = [
  {
    name: 'A-spec',
    description_fr:
      'Spécification du plan : fuzzy 0,2 et préfixe sur tous les termes, champs text 1 / prefix 0,6, synonymes glossaire + FAQ',
    fuzzyMinLength: 0,
    prefixMinLength: 0,
    boost: { text: 1, prefix: 0.6 },
    expansion: true,
    expansionBoost: 0.5,
    bm25b: 0.7,
    maxFuzzy: 6,
  },
  {
    name: 'A-sans-synonymes',
    description_fr:
      'Ablation : A-spec sans expansion de requête (mesure la valeur des alias glossaire + FAQ)',
    fuzzyMinLength: 0,
    prefixMinLength: 0,
    boost: { text: 1, prefix: 0.6 },
    expansion: false,
    expansionBoost: 0.5,
    bm25b: 0.7,
    maxFuzzy: 6,
  },
  {
    name: 'A-court-exact',
    description_fr:
      'Réglage : fuzzy seulement sur les termes ≥ 6 caractères, préfixe seulement ≥ 4 (moins de bruit sur les mots courts)',
    fuzzyMinLength: 6,
    prefixMinLength: 4,
    boost: { text: 1, prefix: 0.6 },
    expansion: true,
    expansionBoost: 0.5,
    bm25b: 0.7,
    maxFuzzy: 6,
  },
  {
    name: 'A-prefixe-1',
    description_fr:
      'Réglage : comme A-court-exact avec le contexte (chapitre/section/chapeau) au même poids que le texte',
    fuzzyMinLength: 6,
    prefixMinLength: 4,
    boost: { text: 1, prefix: 1 },
    expansion: true,
    expansionBoost: 0.5,
    bm25b: 0.7,
    maxFuzzy: 6,
  },
  {
    name: 'A-synonymes-0.25',
    description_fr:
      'Réglage : comme A-court-exact avec les synonymes à 0,25 (un alias générique comme « école » ne noie plus la question)',
    fuzzyMinLength: 6,
    prefixMinLength: 4,
    boost: { text: 1, prefix: 0.6 },
    expansion: true,
    expansionBoost: 0.25,
    bm25b: 0.7,
    maxFuzzy: 6,
  },
  {
    name: 'A-longueur',
    description_fr:
      'Réglage : comme A-court-exact avec une normalisation de longueur BM25 réduite (b 0,3 : une mesure longue n’est pas pénalisée)',
    fuzzyMinLength: 6,
    prefixMinLength: 4,
    boost: { text: 1, prefix: 0.6 },
    expansion: true,
    expansionBoost: 0.5,
    bm25b: 0.3,
    maxFuzzy: 6,
  },
  {
    name: 'A-fuzzy-1',
    description_fr: 'Réglage : comme A-longueur avec une seule faute tolérée (maxFuzzy 1)',
    fuzzyMinLength: 6,
    prefixMinLength: 4,
    boost: { text: 1, prefix: 0.6 },
    expansion: true,
    expansionBoost: 0.5,
    bm25b: 0.3,
    maxFuzzy: 1,
  },
];

/** Configuration retained by the retrieval bench (D6.1): the harness reuses it as the chat's engine. */
export const RETAINED_CONFIG_NAME = 'A-synonymes-0.25';

export function configByName(name: string): SearchConfig {
  const config = CONFIGS.find((c) => c.name === name);
  if (config === undefined) throw new Error(`unknown search configuration ${name}`);
  return config;
}

function searchOptionsFor(config: SearchConfig): SearchOptions {
  return {
    fuzzy: (term) => (term.length >= config.fuzzyMinLength ? 0.2 : false),
    prefix: (term) => term.length >= config.prefixMinLength,
    boost: { ...config.boost },
    bm25: { k: 1.2, b: config.bm25b, d: 0.5 },
    maxFuzzy: config.maxFuzzy,
  };
}

function buildQuery(question: string, expansion: Expansion, config: SearchConfig): Query {
  if (expansion.text.length === 0) return question;
  return {
    combineWith: 'OR',
    queries: [
      { queries: [question], boost: { ...config.boost } },
      {
        queries: [expansion.text],
        boost: {
          text: config.boost.text * config.expansionBoost,
          prefix: config.boost.prefix * config.expansionBoost,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// Variant A: MiniSearch over proposition units (and over section units for routing)
// ---------------------------------------------------------------------------------------------

export function buildIndex<T extends { id: string; text: string; prefix: string }>(
  docs: readonly T[],
): MiniSearch<T> {
  const index = new MiniSearch<T>({
    fields: ['text', 'prefix'],
    idField: 'id',
    tokenize,
    processTerm,
  });
  index.addAll([...docs]);
  return index;
}

export interface Ranked {
  readonly id: string;
  readonly score: number;
  readonly queryTerms: readonly string[];
  /** Matched index term -> fields it was found in. */
  readonly match: Readonly<Record<string, readonly string[]>>;
}

export function search<T extends { id: string; text: string; prefix: string }>(
  index: MiniSearch<T>,
  question: string,
  expansion: Expansion,
  config: SearchConfig,
): Ranked[] {
  const results: SearchResult[] = index.search(
    buildQuery(question, expansion, config),
    searchOptionsFor(config),
  );
  return results.map((r) => ({
    id: String(r.id),
    score: r.score,
    queryTerms: r.queryTerms,
    match: r.match,
  }));
}

// ---------------------------------------------------------------------------------------------
// Ready-to-use retriever (what the chat Worker / client would embed)
// ---------------------------------------------------------------------------------------------

export interface Candidate {
  readonly id: string;
  readonly score: number;
  readonly unit: Unit;
}

export interface Retriever {
  readonly inputs: Inputs;
  readonly projection: Projection;
  readonly synonymGroups: readonly SynonymGroup[];
  readonly expand: (question: string) => Expansion;
  readonly unitIndex: MiniSearch<Unit>;
  readonly sectionIndex: MiniSearch<SectionUnit>;
  /** Variant A top-k proposition units for a question, with the retained configuration by default. */
  readonly retrieve: (question: string, k: number, config?: SearchConfig) => Candidate[];
}

export function createRetriever(inputs: Inputs = loadInputs()): Retriever {
  const projection = buildProjection(inputs.dataset);
  const synonymGroups = buildSynonymGroups(inputs.glossary, inputs.faq);
  const expand = makeExpander(synonymGroups);
  const unitIndex = buildIndex(projection.units);
  const sectionIndex = buildIndex(projection.sectionUnits);
  const retained = configByName(RETAINED_CONFIG_NAME);
  const retrieve = (question: string, k: number, config: SearchConfig = retained): Candidate[] => {
    const expansion = config.expansion ? expand(question) : NO_EXPANSION;
    const out: Candidate[] = [];
    for (const r of search(unitIndex, question, expansion, config)) {
      const unit = projection.unitById.get(r.id);
      if (unit === undefined) continue;
      out.push({ id: r.id, score: r.score, unit });
      if (out.length >= k) break;
    }
    return out;
  };
  return { inputs, projection, synonymGroups, expand, unitIndex, sectionIndex, retrieve };
}
