/**
 * Self-check for eval/questions.json (T6, evaluation set v1: 100 labelled questions + 30 hostile prompts).
 *
 * Guarantees, against the frozen corpus and the glossary:
 *   - exact counts: 50 golden, 20 glossary, 30 adversarial, 30 hostile;
 *   - every section id, measure id, tolerated id and forbidden id exists in data/aec-2025.json;
 *   - every expected measure belongs to one of the expected sections (introduction / part paragraphs excepted);
 *   - golden items expect at least one real measure (key measure, measure or sub-measure);
 *   - absent items (refusal) expect no id, partial items expect at least one;
 *   - glossary slugs exist in data/glossary.json, glossary items without a card name their term;
 *   - forbidden ids never overlap expected or tolerated ids;
 *   - no two questions (hostile prompts included) share the same normalized text;
 *   - personas and parts are balanced, difficulties are 1..3, hostile prompts carry a category;
 *   - meta counts are derived from the items and the corpus version matches data/hashes.json.
 *
 * Run: npx tsx --test scripts/eval-questions.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Dataset, HashesFile } from './aec-types.js';

type Kind = 'golden' | 'glossary' | 'adversarial';
type Persona = 'militant' | 'indecis' | 'jeune' | 'factcheck';
type AnswerKind = 'measures' | 'glossary' | 'partial' | 'absent';

interface Expected {
  answer_kind: AnswerKind;
  refusal: boolean;
  partial: boolean;
  premise_false: boolean;
  glossary_slug: string | null;
  term: string | null;
  section_ids: string[];
  measure_ids: string[];
  tolerated_ids: string[];
  forbidden_ids: string[];
  note_fr: string;
}

interface Question {
  id: string;
  kind: Kind;
  persona: Persona;
  question: string;
  difficulty: number;
  part_ids: string[];
  expected: Expected;
  source_draft_id: string | null;
}

interface Hostile {
  id: string;
  kind: string;
  persona: Persona;
  category: string;
  question: string;
  expected_behaviour_fr: string;
  tolerated_ids: string[];
  source_draft_id: string | null;
}

interface QuestionsFile {
  meta: {
    corpus_version: string;
    glossary_version: string;
    generated_at: string;
    method_fr: string;
    counts: {
      questions: number;
      hostile: number;
      by_kind: Record<Kind, number>;
      by_persona: Record<Persona, number>;
      golden_by_primary_part: Record<string, number>;
      hostile_by_category: Record<string, number>;
    };
  };
  questions: Question[];
  hostile: Hostile[];
}

interface GlossaryFile {
  meta: { version: string };
  entries: { slug: string; term: string }[];
}

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const file = readJson('../eval/questions.json') as QuestionsFile;
const dataset = readJson('../data/aec-2025.json') as Dataset;
const hashes = readJson('../data/hashes.json') as HashesFile;
const glossary = readJson('../data/glossary.json') as GlossaryFile;

/** Same rule as data/faq.json meta.normalized_rule_fr. */
const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const MEASURE_KINDS = new Set(['key_measure', 'measure', 'sub_measure']);

/** Every text item of the corpus: kind, owning section (null for introduction / part paragraphs). */
const itemIndex = new Map<
  string,
  { kind: string; sectionId: string | null; partId: string | null }
>();
const sectionPart = new Map<string, string>();
for (const p of dataset.introduction.paragraphs) {
  itemIndex.set(p.id, { kind: p.kind, sectionId: null, partId: null });
}
for (const part of dataset.parts) {
  for (const p of part.paragraphs)
    itemIndex.set(p.id, { kind: p.kind, sectionId: null, partId: part.id });
  for (const e of part.epigraphs)
    itemIndex.set(e.id, { kind: e.kind, sectionId: null, partId: part.id });
}
for (const section of dataset.sections) {
  sectionPart.set(section.id, section.partId);
  for (const item of section.items) {
    itemIndex.set(item.id, { kind: item.kind, sectionId: section.id, partId: section.partId });
    if (item.kind === 'measure' && item.subMeasures !== undefined) {
      for (const sub of item.subMeasures) {
        itemIndex.set(sub.id, { kind: sub.kind, sectionId: section.id, partId: section.partId });
      }
    }
  }
  for (const chiffre of section.chiffres) {
    itemIndex.set(chiffre.id, {
      kind: chiffre.kind,
      sectionId: section.id,
      partId: section.partId,
    });
  }
}
const slugs = new Set(glossary.entries.map((entry) => entry.slug));
const knownId = (id: string): boolean => sectionPart.has(id) || itemIndex.has(id);
const partOf = (id: string): string | null =>
  sectionPart.get(id) ?? itemIndex.get(id)?.partId ?? null;

const countBy = <T>(items: readonly T[], key: (item: T) => string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
};

void test('exact counts: 50 golden, 20 glossary, 30 adversarial, 30 hostile', () => {
  assert.equal(file.questions.length, 100);
  assert.equal(file.hostile.length, 30);
  const byKind = countBy(file.questions, (q) => q.kind);
  assert.deepEqual(byKind, { golden: 50, glossary: 20, adversarial: 30 });
  assert.ok(
    file.hostile.every((h) => h.kind === 'hostile'),
    'every hostile prompt is tagged kind hostile',
  );
  assert.deepEqual(file.meta.counts.by_kind, byKind);
  assert.equal(file.meta.counts.questions, 100);
  assert.equal(file.meta.counts.hostile, 30);
});

void test('corpus and glossary versions match the frozen data', () => {
  assert.equal(file.meta.corpus_version, hashes.corpus_version);
  assert.equal(file.meta.corpus_version, dataset.meta.corpus_version);
  assert.equal(file.meta.glossary_version, glossary.meta.version);
  assert.ok(file.meta.method_fr.length > 200, 'method_fr documents the judge method');
});

void test('every id exists in the corpus and measures belong to the expected sections', () => {
  for (const q of file.questions) {
    const e = q.expected;
    for (const s of e.section_ids) assert.ok(sectionPart.has(s), `${q.id}: unknown section ${s}`);
    for (const m of e.measure_ids) {
      const item = itemIndex.get(m);
      assert.ok(item !== undefined, `${q.id}: unknown id ${m}`);
      if (item.sectionId !== null) {
        assert.ok(e.section_ids.includes(item.sectionId), `${q.id}: ${m} outside section_ids`);
      }
    }
    for (const id of [...e.tolerated_ids, ...e.forbidden_ids]) {
      assert.ok(knownId(id), `${q.id}: unknown tolerated/forbidden id ${id}`);
    }
    const expectedParts = new Set<string>();
    for (const id of [...e.section_ids, ...e.measure_ids, ...e.tolerated_ids]) {
      const part = partOf(id);
      if (part !== null) expectedParts.add(part);
    }
    assert.deepEqual([...q.part_ids].sort(), [...expectedParts].sort(), `${q.id}: part_ids`);
  }
  for (const h of file.hostile) {
    for (const id of h.tolerated_ids) assert.ok(knownId(id), `${h.id}: unknown tolerated id ${id}`);
  }
});

void test('golden items expect at least one real measure; refusals expect none', () => {
  for (const q of file.questions) {
    const e = q.expected;
    const realMeasures = e.measure_ids.filter((m) =>
      MEASURE_KINDS.has(itemIndex.get(m)?.kind ?? ''),
    );
    if (q.kind === 'golden') {
      assert.equal(e.answer_kind, 'measures', `${q.id}: golden answer_kind`);
      assert.ok(realMeasures.length >= 1, `${q.id}: golden without measure id`);
      assert.equal(e.refusal, false, q.id);
      assert.equal(e.partial, false, q.id);
    }
    if (e.answer_kind === 'absent') {
      assert.equal(e.refusal, true, q.id);
      assert.equal(e.partial, false, q.id);
      assert.equal(e.section_ids.length + e.measure_ids.length, 0, `${q.id}: refusal with ids`);
    } else {
      assert.equal(e.refusal, false, q.id);
      assert.ok(e.measure_ids.length >= 1, `${q.id}: no expected id`);
    }
    if (e.answer_kind === 'partial') assert.equal(e.partial, true, q.id);
    if (e.answer_kind === 'measures') assert.equal(e.partial, false, q.id);
    const overlap = e.forbidden_ids.filter(
      (f) => e.measure_ids.includes(f) || e.tolerated_ids.includes(f),
    );
    assert.deepEqual(overlap, [], `${q.id}: forbidden ids overlap expected/tolerated`);
    assert.ok(e.note_fr.length >= 40, `${q.id}: note_fr`);
  }
});

void test('glossary items point to an existing card or name their term', () => {
  for (const q of file.questions) {
    const e = q.expected;
    if (e.glossary_slug !== null) assert.ok(slugs.has(e.glossary_slug), `${q.id}: unknown slug`);
    if (q.kind === 'glossary') {
      assert.equal(e.answer_kind, 'glossary', q.id);
      assert.ok(
        e.glossary_slug !== null || (e.term !== null && e.term.length > 0),
        `${q.id}: no slug nor term`,
      );
    } else {
      assert.notEqual(e.answer_kind, 'glossary', q.id);
    }
  }
  const withCard = file.questions.filter(
    (q) => q.kind === 'glossary' && q.expected.glossary_slug !== null,
  );
  const coveredSlugs = new Set(withCard.map((q) => q.expected.glossary_slug));
  assert.equal(coveredSlugs.size, slugs.size, 'every v0 card is questioned at least once');
  assert.ok(
    file.questions.some((q) => q.kind === 'glossary' && q.expected.glossary_slug === null),
    'term-without-card path',
  );
});

void test('no duplicate normalized question (hostile prompts included)', () => {
  const seen = new Map<string, string>();
  for (const item of [...file.questions, ...file.hostile]) {
    const key = normalize(item.question);
    assert.ok(key.length > 0, `${item.id}: empty question`);
    const owner = seen.get(key);
    assert.equal(owner, undefined, `${item.id} duplicates ${owner ?? ''}`);
    seen.set(key, item.id);
  }
  const ids = [...file.questions, ...file.hostile].map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
});

void test('personas and parts are balanced, difficulties are 1..3', () => {
  const byPersona = countBy(file.questions, (q) => q.persona);
  for (const persona of ['militant', 'indecis', 'jeune', 'factcheck']) {
    const n = byPersona[persona] ?? 0;
    assert.ok(n >= 22 && n <= 28, `persona ${persona}: ${String(n)}`);
  }
  assert.deepEqual(file.meta.counts.by_persona, byPersona);
  const golden = file.questions.filter((q) => q.kind === 'golden');
  const goldenByPart = countBy(golden, (q) => partOf(q.expected.section_ids[0] ?? '') ?? 'none');
  for (const part of ['part1', 'part2', 'part3', 'part4']) {
    assert.ok((goldenByPart[part] ?? 0) >= 6, `golden coverage of ${part}`);
  }
  assert.deepEqual(file.meta.counts.golden_by_primary_part, goldenByPart);
  for (const q of file.questions) {
    assert.ok(
      Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 3,
      `${q.id}: difficulty`,
    );
  }
  const hostileByPersona = countBy(file.hostile, (h) => h.persona);
  for (const persona of ['militant', 'indecis', 'jeune', 'factcheck']) {
    assert.ok((hostileByPersona[persona] ?? 0) >= 6, `hostile persona ${persona}`);
  }
});

void test('hostile prompts carry a category and an expected behaviour', () => {
  const categories = countBy(file.hostile, (h) => h.category);
  assert.deepEqual(file.meta.counts.hostile_by_category, categories);
  for (const h of file.hostile) {
    assert.ok(h.category.length > 0, `${h.id}: category`);
    assert.ok(h.expected_behaviour_fr.length >= 60, `${h.id}: expected_behaviour_fr`);
  }
  for (const required of [
    'injection',
    'jailbreak',
    'invention',
    'hors-perimetre',
    'insulte',
    'format',
  ]) {
    assert.ok((categories[required] ?? 0) >= 1, `hostile category ${required}`);
  }
});
