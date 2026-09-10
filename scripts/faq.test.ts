/**
 * Self-check for data/faq.json (T2, FAQ v0: 50 questions routed to the programme without any LLM).
 *
 * Guarantees, against the frozen corpus and the string kit:
 *   - every section id and measure id exists in data/aec-2025.json (nothing is invented);
 *   - "absent" entries carry no id and use the refusal wording of design/strings.json;
 *   - the liant has no digit, at most 2 sentences of at most 15 words (a quoted title counts as one),
 *     French spacing outside the quoted titles, and every title quoted between « » is a verbatim
 *     section or chapter title (titles keep the source spacing, plain space before « : » included);
 *   - `normalized` is the deterministic normalization of the question, aliases are unique file-wide;
 *   - part ids and coverage stats match the entries.
 *
 * Run: npx tsx --test scripts/faq.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Dataset, Measure, Section, SubMeasure } from './aec-types.js';

type Voice = 'militant' | 'indecis' | 'jeune';
type AnswerKind = 'sections' | 'measures' | 'absent' | 'partial' | 'premise-false';

interface FaqEntry {
  id: string;
  question: string;
  voice: Voice;
  normalized: string;
  aliases: string[];
  answer_kind: AnswerKind;
  answer_section_ids: string[];
  answer_measure_ids: string[];
  /** Three hand-picked neighbours of an `absent` entry; never computed by the retrieval (D6.4). */
  neighbour_ids?: string[];
  /** False friends of the search engine, filtered out of what a refusal screen shows. */
  excluded_ids?: string[];
  absence_probe?: {
    queries: string[];
    hits_outside_excluded: number;
    corpus_version: string;
    replayed_at: string;
  };
  part_ids: string[];
  liant_fr: string;
  liant_kind: 'reformulé';
  support_note: string;
}

interface FaqFile {
  meta: {
    corpus_version: string;
    coverage: {
      entries: number;
      per_part: Record<string, number>;
      per_voice: Record<Voice, number>;
      per_answer_kind: Record<AnswerKind, number>;
      absent_count: number;
      partial_count: number;
      premise_false_count: number;
      honest_negative_count: number;
      sections_cited: number;
      measures_cited: number;
    };
    absent_topics_fr: string[];
    partial_topics_fr: string[];
    premise_false_topics_fr: string[];
  };
  entries: FaqEntry[];
}

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const faq = readJson('../data/faq.json') as FaqFile;
const corpus = readJson('../data/aec-2025.json') as Dataset;
const strings = readJson('../design/strings.json') as Record<string, string>;

const ENTRIES = 50;
const MIN_ALIASES = 2;
const MAX_QUESTION_WORDS = 15;
const MAX_LIANT_SENTENCES = 2;
const MAX_SENTENCE_WORDS = 15;
const MIN_HONEST_NEGATIVE = 8;
const NBSP = ' ';
const VOICES: readonly Voice[] = ['militant', 'indecis', 'jeune'];
const KINDS: readonly AnswerKind[] = [
  'sections',
  'measures',
  'absent',
  'partial',
  'premise-false',
];

/** Same rule as data/faq.json meta.normalized_rule_fr. */
const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Index of every measure, key measure and sub-measure of the corpus, with its section. */
const measureIndex = new Map<string, { text: string; section: Section }>();
const sectionIndex = new Map<string, Section>();
for (const section of corpus.sections) {
  sectionIndex.set(section.id, section);
  for (const item of section.items) {
    if (item.kind === 'paragraph') continue;
    measureIndex.set(item.id, { text: item.text, section });
    const subMeasures: SubMeasure[] = (item as Measure).subMeasures ?? [];
    for (const sub of subMeasures) measureIndex.set(sub.id, { text: sub.text, section });
  }
}

/** Verbatim titles a liant may quote: section titles, chapter titles, and chapter titles without "Chapitre N : ". */
const quotableTitles = new Set<string>();
for (const section of corpus.sections) quotableTitles.add(section.title);
for (const chapter of corpus.chapters) {
  quotableTitles.add(chapter.title);
  const bare = /^Chapitre \d+ : (.+)$/.exec(chapter.title);
  if (bare?.[1] !== undefined) quotableTitles.add(bare[1]);
}

const quotedSegments = (text: string): string[] =>
  (text.match(/«[^»]*»/g) ?? []).map((segment) => segment.slice(1, -1).replace(/^\s+|\s+$/gu, ''));

/** A liant with its quoted titles masked: titles are verbatim (plain space before « : » included) and are checked apart. */
const maskTitles = (text: string): string => text.replace(/«[^»]*»/g, 'TITRE');

/** Sentences of a liant; quoted titles are masked first so their punctuation does not split. */
const sentencesOf = (text: string): string[] =>
  maskTitles(text)
    .split(/[.!?]+(?:\s|$)/)
    .filter((part) => part.trim().length > 0);

const countWords = (text: string): number =>
  text
    .replace(/[«»"]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

const partsOf = (entry: FaqEntry): string[] => {
  const parts = new Set<string>();
  for (const id of entry.answer_section_ids) parts.add(sectionIndex.get(id)?.partId ?? '');
  for (const id of entry.answer_measure_ids) parts.add(measureIndex.get(id)?.section.partId ?? '');
  return [...parts].sort();
};

void test('the file is built on the frozen corpus and has 50 well-formed entries', () => {
  assert.equal(faq.meta.corpus_version, corpus.meta.corpus_version);
  assert.equal(faq.entries.length, ENTRIES);
  faq.entries.forEach((entry, index) => {
    assert.equal(entry.id, `faq-${String(index + 1).padStart(2, '0')}`);
    assert.ok(VOICES.includes(entry.voice), `${entry.id}: voice ${entry.voice}`);
    assert.ok(KINDS.includes(entry.answer_kind), `${entry.id}: kind ${entry.answer_kind}`);
    assert.equal(entry.liant_kind, 'reformulé', entry.id);
    assert.ok(entry.question.trim().length > 0, `${entry.id}: empty question`);
    assert.ok(entry.support_note.trim().length > 0, `${entry.id}: empty support note`);
    assert.ok(
      entry.aliases.length >= MIN_ALIASES,
      `${entry.id}: ${String(entry.aliases.length)} aliases`,
    );
    const words = countWords(entry.question);
    assert.ok(words <= MAX_QUESTION_WORDS, `${entry.id}: question has ${String(words)} words`);
    assert.ok(
      entry.question.endsWith(`${NBSP}?`),
      `${entry.id}: question must end with NBSP + "?"`,
    );
    assert.ok(!/ [?!:;]/.test(entry.question), `${entry.id}: plain space before punctuation`);
    assert.ok(
      !/\p{Extended_Pictographic}/u.test(entry.question + entry.liant_fr),
      `${entry.id}: emoji`,
    );
  });
});

void test('every section id and measure id exists in the corpus, no duplicates, sections carry a cited measure', () => {
  for (const entry of faq.entries) {
    assert.equal(
      new Set(entry.answer_section_ids).size,
      entry.answer_section_ids.length,
      `${entry.id}: duplicate section ids`,
    );
    assert.equal(
      new Set(entry.answer_measure_ids).size,
      entry.answer_measure_ids.length,
      `${entry.id}: duplicate measure ids`,
    );
    for (const id of entry.answer_section_ids) {
      assert.ok(sectionIndex.has(id), `${entry.id}: unknown section ${id}`);
    }
    for (const id of entry.answer_measure_ids) {
      assert.ok(
        measureIndex.has(id),
        `${entry.id}: unknown measure ${id} (paragraphs and chiffres are not measures)`,
      );
    }
    const citedSections = new Set(
      entry.answer_measure_ids.map((id) => measureIndex.get(id)?.section.id ?? ''),
    );
    for (const id of entry.answer_section_ids) {
      assert.ok(citedSections.has(id), `${entry.id}: section ${id} has no cited measure`);
    }
  }
});

void test('answer kinds: absent entries have no id and use the refusal wording; the others cite something', () => {
  const refusalTitle = strings['refusal.title'];
  const refusalLead = strings['refusal.lead'];
  assert.ok(refusalTitle !== undefined && refusalLead !== undefined, 'refusal strings missing');
  const refusalFirstSentence = refusalLead.split('. ')[0] ?? '';
  for (const entry of faq.entries) {
    if (entry.answer_kind === 'absent') {
      assert.equal(entry.answer_section_ids.length, 0, `${entry.id}: absent entry cites a section`);
      assert.equal(entry.answer_measure_ids.length, 0, `${entry.id}: absent entry cites a measure`);
      assert.equal(entry.part_ids.length, 0, `${entry.id}: absent entry has a part`);
      assert.ok(
        entry.liant_fr.startsWith(refusalTitle),
        `${entry.id}: liant must start with refusal.title`,
      );
      assert.ok(
        entry.liant_fr.includes(refusalFirstSentence),
        `${entry.id}: liant must carry refusal.lead`,
      );
      continue;
    }
    assert.ok(entry.answer_section_ids.length > 0, `${entry.id}: no section`);
    assert.ok(entry.answer_measure_ids.length > 0, `${entry.id}: no measure`);
    if (entry.answer_kind === 'partial') {
      assert.equal(
        entry.answer_section_ids.length,
        1,
        `${entry.id}: partial entries point to one section`,
      );
    }
  }
});

void test('liants: no digit, at most 2 sentences of at most 15 words, quoted titles verbatim', () => {
  for (const entry of faq.entries) {
    assert.ok(!/\d/.test(entry.liant_fr), `${entry.id}: digit in liant`);
    assert.ok(
      !/ [?!:;]/.test(maskTitles(entry.liant_fr)),
      `${entry.id}: plain space before punctuation in liant`,
    );
    const sentences = sentencesOf(entry.liant_fr);
    assert.ok(
      sentences.length >= 1 && sentences.length <= MAX_LIANT_SENTENCES,
      `${entry.id}: ${String(sentences.length)} sentences`,
    );
    for (const sentence of sentences) {
      const words = countWords(sentence);
      assert.ok(
        words <= MAX_SENTENCE_WORDS,
        `${entry.id}: sentence of ${String(words)} words: ${sentence}`,
      );
    }
    for (const title of quotedSegments(entry.liant_fr)) {
      assert.ok(
        quotableTitles.has(title),
        `${entry.id}: quoted title is not verbatim: « ${title} »`,
      );
    }
    if (entry.answer_kind !== 'absent') {
      const quoted = quotedSegments(entry.liant_fr);
      assert.ok(quoted.length > 0, `${entry.id}: liant names no section or chapter`);
    }
  }
});

void test('normalized is derived from the question; aliases are unique file-wide', () => {
  const seen = new Map<string, string>();
  for (const entry of faq.entries) {
    assert.equal(entry.normalized, normalize(entry.question), `${entry.id}: normalized`);
    assert.ok(entry.normalized.length > 0, entry.id);
    const owner = seen.get(entry.normalized);
    assert.equal(owner, undefined, `${entry.id}: question collides with ${owner ?? ''}`);
    seen.set(entry.normalized, entry.id);
  }
  for (const entry of faq.entries) {
    for (const alias of entry.aliases) {
      const key = normalize(alias);
      assert.ok(key.length > 0, `${entry.id}: empty alias`);
      const owner = seen.get(key);
      assert.equal(owner, undefined, `${entry.id}: alias "${alias}" collides with ${owner ?? ''}`);
      seen.set(key, entry.id);
    }
  }
});

void test('part ids and coverage stats match the entries; at least 8 honest negatives', () => {
  const perPart: Record<string, number> = { part1: 0, part2: 0, part3: 0, part4: 0, none: 0 };
  const perVoice: Record<Voice, number> = { militant: 0, indecis: 0, jeune: 0 };
  const perKind: Record<AnswerKind, number> = {
    sections: 0,
    measures: 0,
    partial: 0,
    absent: 0,
    'premise-false': 0,
  };
  const sections = new Set<string>();
  const measures = new Set<string>();
  for (const entry of faq.entries) {
    assert.deepEqual(entry.part_ids, partsOf(entry), `${entry.id}: part_ids`);
    for (const part of entry.part_ids.length > 0 ? entry.part_ids : ['none']) {
      perPart[part] = (perPart[part] ?? 0) + 1;
    }
    perVoice[entry.voice] += 1;
    perKind[entry.answer_kind] += 1;
    for (const id of entry.answer_section_ids) sections.add(id);
    for (const id of entry.answer_measure_ids) measures.add(id);
  }
  const { coverage } = faq.meta;
  assert.equal(coverage.entries, faq.entries.length);
  assert.deepEqual(coverage.per_part, perPart);
  assert.deepEqual(coverage.per_voice, perVoice);
  assert.deepEqual(coverage.per_answer_kind, perKind);
  assert.equal(coverage.absent_count, perKind.absent);
  assert.equal(coverage.partial_count, perKind.partial);
  assert.equal(coverage.premise_false_count, perKind['premise-false']);
  assert.equal(
    coverage.honest_negative_count,
    perKind.absent + perKind.partial + perKind['premise-false'],
  );
  assert.ok(coverage.honest_negative_count >= MIN_HONEST_NEGATIVE, 'fewer than 8 honest negatives');
  assert.equal(coverage.sections_cited, sections.size);
  assert.equal(coverage.measures_cited, measures.size);
  for (const part of ['part1', 'part2', 'part3', 'part4']) {
    assert.ok((perPart[part] ?? 0) > 0, `no question reaches ${part}`);
  }
  assert.deepEqual(
    faq.meta.absent_topics_fr,
    faq.entries.filter((e) => e.answer_kind === 'absent').map((e) => e.question),
  );
  assert.deepEqual(
    faq.meta.partial_topics_fr,
    faq.entries.filter((e) => e.answer_kind === 'partial').map((e) => e.question),
  );
  assert.deepEqual(
    faq.meta.premise_false_topics_fr,
    faq.entries.filter((e) => e.answer_kind === 'premise-false').map((e) => e.question),
  );
});

// -------------------------------------------------------------------------------------------
// Gates added by the panel rouge (T12), docs/discovery/13-tests-humains.md §T12.

/** Same normalization as the absence probe: lowercase, accent-free, apostrophes unified. */
const probeNormalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/’/g, "'");

/**
 * Every text of the frozen corpus, by id: paragraphs, measures, key measures, sub-measures and the
 * « À savoir » figures, which live in `section.chiffres` and not in `section.items`.
 */
const corpusTextById = new Map<string, string>();
for (const section of corpus.sections) {
  for (const item of section.items) {
    corpusTextById.set(item.id, item.text);
    const subMeasures: SubMeasure[] = (item as Measure).subMeasures ?? [];
    for (const sub of subMeasures) corpusTextById.set(sub.id, sub.text);
  }
  for (const figure of section.chiffres) corpusTextById.set(figure.id, figure.text);
}

void test('an absent entry carries exactly 3 hand-picked neighbours, none of them a false friend (D6.4)', () => {
  for (const entry of faq.entries) {
    if (entry.answer_kind !== 'absent') continue;
    const neighbours = entry.neighbour_ids ?? [];
    assert.equal(
      neighbours.length,
      3,
      `${entry.id}: an absence screen never appears without its three neighbours`,
    );
    const excluded = new Set(entry.excluded_ids ?? []);
    for (const id of neighbours) {
      assert.ok(
        corpusTextById.has(id) || sectionIndex.has(id),
        `${entry.id}: neighbour ${id} is not in the frozen corpus`,
      );
      assert.ok(!excluded.has(id), `${entry.id}: neighbour ${id} is also declared a false friend`);
    }
    assert.equal(new Set(neighbours).size, neighbours.length, `${entry.id}: duplicate neighbour`);
  }
});

void test('every declared false friend exists, on absent and partial entries alike', () => {
  for (const entry of faq.entries) {
    if (entry.answer_kind === 'sections' || entry.answer_kind === 'measures') continue;
    assert.ok(
      Array.isArray(entry.excluded_ids),
      `${entry.id}: ${entry.answer_kind} entries must declare excluded_ids (possibly empty)`,
    );
    for (const id of entry.excluded_ids ?? []) {
      assert.ok(
        corpusTextById.has(id) || sectionIndex.has(id),
        `${entry.id}: excluded id ${id} is not in the frozen corpus`,
      );
    }
  }
});

/**
 * The absence is replayed, not declared. Each query of the probe is searched, whole word, in the
 * 1 033 items of the frozen corpus. Anything it finds must be declared in excluded_ids; otherwise
 * the entry claims an absence the text contradicts, and the build fails loudly.
 */
void test('the absence probe of every absent entry is replayed on the current corpus_version', () => {
  for (const entry of faq.entries) {
    if (entry.answer_kind !== 'absent') continue;
    const probe = entry.absence_probe;
    assert.ok(probe !== undefined, `${entry.id}: an absent entry needs an absence_probe`);
    assert.equal(
      probe.corpus_version,
      faq.meta.corpus_version,
      `${entry.id}: the probe was replayed on another corpus version`,
    );
    assert.ok(probe.queries.length > 0, `${entry.id}: empty probe`);
    const excluded = new Set(entry.excluded_ids ?? []);
    const found: string[] = [];
    for (const query of probe.queries) {
      const needle = probeNormalize(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|[^a-z0-9])${needle}([^a-z0-9]|$)`, 'u');
      for (const [id, text] of corpusTextById) {
        if (excluded.has(id)) continue;
        if (pattern.test(probeNormalize(text))) found.push(`${id} (« ${query} »)`);
      }
    }
    assert.deepEqual(
      found,
      [],
      `${entry.id}: the probe finds passages that are neither excluded nor cited: ${found.join(', ')}`,
    );
    assert.equal(probe.hits_outside_excluded, 0, `${entry.id}: the probe declares hits`);
  }
});

void test('a premise-false entry answers with the subject and never uses refusal.title', () => {
  const premiseFalse = strings['refusal.premise_false'];
  const refusalTitle = strings['refusal.title'];
  assert.ok(premiseFalse !== undefined, 'refusal.premise_false is missing from the string kit');
  for (const entry of faq.entries) {
    if (entry.answer_kind !== 'premise-false') continue;
    assert.ok(
      entry.liant_fr.startsWith(premiseFalse),
      `${entry.id}: the liant must start with refusal.premise_false`,
    );
    assert.ok(
      !entry.liant_fr.includes(refusalTitle ?? '§'),
      `${entry.id}: « ${refusalTitle ?? ''} » is reserved for absent-subject entries`,
    );
    assert.ok(entry.answer_section_ids.length > 0, `${entry.id}: no section on the subject`);
    assert.ok(entry.answer_measure_ids.length > 0, `${entry.id}: no passage on the subject`);
  }
});
