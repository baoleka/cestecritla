/**
 * Self-check for data/glossary.json (T2, glossary cards).
 *
 * Guarantees, against the frozen corpus and its side corpora:
 *   - every id cited by a card (verbatim_ids, related_measure_ids, objection.support_ids,
 *     sentence_support[].support_ids, sources[].ref) exists in data/aec-2025.json, or, for URLs,
 *     in data/livrets-2022.json / data/desintox.json (nothing is invented);
 *   - every sentence of one_liner, why_it_matters and objection.answer has a sentence_support
 *     entry for the same field, and the entries reproduce the field exactly (nothing unlabeled);
 *   - sentences are <= 15 words (16-18 tolerated with a warning count, > 18 fails);
 *   - a 'reformule' sentence carries no digit sequence absent from its support passages;
 *   - a 'verbatim' sentence is an exact substring of one of its support passages;
 *   - a quoted fragment « … » inside a 'reformule' / 'contexte-2022' sentence is an exact
 *     substring of one of its support passages;
 *   - a 'contexte-2022' sentence says "2022", is supported by 2022 material only, lives only in
 *     why_it_matters, at most once, in last position;
 *   - budgets of the style guide (design/glossary-style-guide.md §2.2) are respected;
 *   - every support of a sentence and every verbatim id has a provenance line in sources;
 *   - no forbidden word (guide §2.4), no « vous », no emoji in the app voice;
 *   - metadata: corpus_version matches data/hashes.json and the corpus, statuses are known,
 *     routing aliases are lowercase and unique, dangling related_terms are declared, readability
 *     numbers match a fresh measurement.
 *
 * Run: npx tsx --test scripts/glossary.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Dataset, HashesFile } from './aec-types.js';

type SentenceKind = 'verbatim' | 'reformule' | 'contexte-2022';
type SentenceField = 'one_liner' | 'why_it_matters' | 'objection.answer';

interface SentenceSupport {
  field: SentenceField;
  sentence: string;
  kind: SentenceKind;
  support_ids: string[];
}

interface Source {
  kind: string;
  ref: string;
  date: string | null;
}

interface Readability {
  sentences: number;
  max_sentence_words: number;
  sentences_over_15_words: number;
  words_one_liner: number;
  words_why_it_matters: number;
  words_objection_text: number;
  words_objection_answer: number;
}

interface GlossaryEntry {
  slug: string;
  term: string;
  aliases: string[];
  aliases_from_card: string[];
  one_liner: string;
  why_it_matters: string;
  verbatim_ids: string[];
  related_measure_ids: string[];
  objection: {
    text: string;
    answer: string;
    desintox_url: string | null;
    support_ids: string[];
  };
  related_terms: string[];
  sources: Source[];
  sentence_support: SentenceSupport[];
  review_status: string;
  readability: Readability;
  review: { status: string; verifier: { pass: boolean } };
}

interface GlossaryFile {
  meta: {
    version: string;
    corpus_version: string;
    review_status_values: Record<string, string>;
    dangling_related_terms: string[];
  };
  entries: GlossaryEntry[];
}

interface LivretsFile {
  items: { kind: string; url: string; text: string }[];
}

interface DesintoxFile {
  posts: { url: string; cited_snippets?: readonly string[] }[];
}

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const glossary = readJson('../data/glossary.json') as GlossaryFile;
const corpus = readJson('../data/aec-2025.json') as Dataset;
const hashes = readJson('../data/hashes.json') as HashesFile;
const livrets = readJson('../data/livrets-2022.json') as LivretsFile;
const desintox = readJson('../data/desintox.json') as DesintoxFile;

const MAX_WORDS = 15;
const MAX_WORDS_TOLERATED = 18;
const SENTENCE_FIELDS: readonly SentenceField[] = [
  'one_liner',
  'why_it_matters',
  'objection.answer',
];
const CORPUS_ID =
  /^(?:c\d{1,2}-s\d{2}-(?:p|k|m|a)\d{2}(?:\.s\d+)?|intro-p\d{2}|part[1-4]-(?:p|e)\d{2})$/;
const SOURCE_KINDS = new Set([
  'programme-2025',
  'livret-2022',
  'plan-2022',
  'falc-2022',
  'désintox',
]);

/** Budgets of the style guide §2.2 (DÉCISION). */
const BUDGETS = {
  one_liner: { sentences: [2, 4], words: 40 },
  why_it_matters: { sentences: [4, 8], words: 80 },
  'objection.text': { sentences: [1, 2], words: 15 },
  'objection.answer': { sentences: [2, 3], words: 45 },
  verbatim_ids: [1, 4],
  related_measure_ids: [2, 8],
  related_terms: [3, 8],
} as const;

/** Words and turns banned from the app voice (guide §2.4 and rule 11), matched on word boundaries. */
const FORBIDDEN = [
  'expert',
  'experts',
  'on sait que',
  'écrasante majorité',
  'historique',
  'enfin',
  'vraiment',
  'bien sûr',
  'évidemment',
  'hélas',
  'attention',
  'en théorie',
  'vous',
  "c'est faux",
];

// ---------------------------------------------------------------------------------------------
// Indexes

/** Every text item of the corpus by id (introduction, parts, section items, sub-measures, stats). */
const corpusText = new Map<string, string>();
for (const p of corpus.introduction.paragraphs) corpusText.set(p.id, p.text);
for (const part of corpus.parts) {
  for (const p of part.paragraphs) corpusText.set(p.id, p.text);
  for (const e of part.epigraphs) corpusText.set(e.id, e.text);
}
for (const section of corpus.sections) {
  for (const item of section.items) {
    corpusText.set(item.id, item.text);
    if (item.kind === 'measure') {
      for (const sub of item.subMeasures ?? []) corpusText.set(sub.id, sub.text);
    }
  }
  for (const chiffre of section.chiffres) corpusText.set(chiffre.id, chiffre.text);
}

/** 2022 material (livrets, plans, FALC) and désintox posts by URL. */
const livretText = new Map(livrets.items.map((item) => [item.url, item.text]));
const desintoxText = new Map(
  desintox.posts.map((post) => [post.url, (post.cited_snippets ?? []).join('\n')]),
);

const isUrl = (ref: string): boolean => /^https?:\/\//.test(ref);

/** Text of a support reference: corpus id, 2022 URL or désintox URL; null when unknown. */
function supportText(ref: string): string | null {
  return corpusText.get(ref) ?? livretText.get(ref) ?? desintoxText.get(ref) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Text helpers

/** Tokens carrying at least one letter or digit (punctuation-only tokens such as « are ignored). */
function wordCount(sentence: string): number {
  return sentence.split(/\s+/u).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Split a field into sentences on ., ! or ? followed by whitespace and a capital, « or digit. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[\p{Lu}«\p{N}])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Digit groups, thousands separators (space, NBSP, narrow NBSP) removed: "300 000" -> "300000". */
function digitGroups(text: string): Set<string> {
  const groups = text.match(/\d+(?:[ \u00A0\u202F]\d{3})*/gu) ?? [];
  return new Set(groups.map((g) => g.replace(/[ \u00A0\u202F]/g, '')));
}

/** Fragments quoted with French guillemets, without the guillemets. */
function quotedFragments(text: string): string[] {
  return [...text.matchAll(/«\s*([^«»]+?)\s*»/gu)].map((m) => m[1] ?? '');
}

/** Normalization for verbatim comparison: NBSP variants to space, typographic apostrophe to straight. */
function plain(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/’/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function fieldText(entry: GlossaryEntry, field: SentenceField): string {
  return field === 'objection.answer' ? entry.objection.answer : entry[field];
}

/** Every sentence of the app voice: labeled sentences plus the objection's own sentences. */
function voiceSentences(entry: GlossaryEntry): { where: string; text: string }[] {
  return [
    ...entry.sentence_support.map((s) => ({ where: s.field, text: s.sentence })),
    ...splitSentences(entry.objection.text).map((text) => ({ where: 'objection.text', text })),
  ];
}

function inRange(n: number, [min, max]: readonly [number, number]): boolean {
  return n >= min && n <= max;
}

// ---------------------------------------------------------------------------------------------
// Tests

void test('meta: corpus version, statuses, entries', () => {
  assert.equal(glossary.meta.corpus_version, hashes.corpus_version);
  assert.equal(glossary.meta.corpus_version, corpus.meta.corpus_version);
  assert.ok(glossary.entries.length > 0, 'at least one entry');
  const slugs = new Set<string>();
  for (const entry of glossary.entries) {
    assert.match(entry.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `slug format: ${entry.slug}`);
    assert.ok(!slugs.has(entry.slug), `duplicate slug ${entry.slug}`);
    slugs.add(entry.slug);
    assert.ok(
      Object.hasOwn(glossary.meta.review_status_values, entry.review_status),
      `${entry.slug}: unknown review_status ${entry.review_status}`,
    );
    assert.equal(entry.review.status, entry.review_status, `${entry.slug}: review.status mismatch`);
    assert.equal(
      entry.review_status === 'draft',
      !entry.review.verifier.pass,
      `${entry.slug}: draft iff the verifier failed`,
    );
  }
});

void test('every cited id exists in the corpus (or, for URLs, in the 2022 / désintox files)', () => {
  for (const entry of glossary.entries) {
    const refs = new Map<string, string>();
    for (const id of entry.verbatim_ids) refs.set(id, 'verbatim_ids');
    for (const id of entry.related_measure_ids) refs.set(id, 'related_measure_ids');
    for (const id of entry.objection.support_ids) refs.set(id, 'objection.support_ids');
    for (const source of entry.sources) refs.set(source.ref, `sources(${source.kind})`);
    for (const support of entry.sentence_support) {
      for (const id of support.support_ids) refs.set(id, `sentence_support(${support.field})`);
    }
    for (const [ref, where] of refs) {
      assert.notEqual(
        supportText(ref),
        null,
        `${entry.slug}: unknown reference ${ref} in ${where}`,
      );
    }
    for (const id of [...entry.verbatim_ids, ...entry.related_measure_ids]) {
      assert.match(id, CORPUS_ID, `${entry.slug}: ${id} is not a 2025 corpus id`);
    }
    for (const id of entry.related_measure_ids) {
      assert.match(id, /-(?:k|m)\d{2}(?:\.s\d+)?$/, `${entry.slug}: ${id} is not a measure`);
    }
    if (entry.objection.desintox_url !== null) {
      assert.ok(
        desintoxText.has(entry.objection.desintox_url),
        `${entry.slug}: desintox_url not in data/desintox.json`,
      );
    }
  }
});

void test('every sentence of one_liner / why_it_matters / objection.answer is labeled', () => {
  for (const entry of glossary.entries) {
    for (const field of SENTENCE_FIELDS) {
      const text = fieldText(entry, field);
      const labeled = entry.sentence_support.filter((s) => s.field === field);
      assert.ok(labeled.length > 0, `${entry.slug}: ${field} has no sentence_support`);
      for (const sentence of splitSentences(text)) {
        assert.ok(
          labeled.some((s) => s.sentence === sentence),
          `${entry.slug}: unlabeled sentence in ${field}: « ${sentence} »`,
        );
      }
      assert.equal(
        labeled.map((s) => s.sentence).join(' '),
        text,
        `${entry.slug}: sentence_support(${field}) does not reproduce the field`,
      );
    }
    for (const support of entry.sentence_support) {
      assert.ok(
        (SENTENCE_FIELDS as readonly string[]).includes(support.field),
        `${entry.slug}: unknown field ${support.field}`,
      );
      assert.ok(support.support_ids.length > 0, `${entry.slug}: empty support_ids`);
    }
    // The objection's support_ids are exactly the union of its answer's supports.
    const answerSupports = new Set(
      entry.sentence_support
        .filter((s) => s.field === 'objection.answer')
        .flatMap((s) => s.support_ids),
    );
    assert.deepEqual(
      [...entry.objection.support_ids].sort(),
      [...answerSupports].sort(),
      `${entry.slug}: objection.support_ids is not the union of the answer's supports`,
    );
  }
});

void test('sentence length: <= 15 words, 16-18 tolerated with a warning', (t) => {
  const warnings: string[] = [];
  for (const entry of glossary.entries) {
    for (const { where, text } of voiceSentences(entry)) {
      const words = wordCount(text);
      assert.ok(
        words <= MAX_WORDS_TOLERATED,
        `${entry.slug}: ${String(words)} words (> ${String(MAX_WORDS_TOLERATED)}) in ${where}: « ${text} »`,
      );
      if (words > MAX_WORDS)
        warnings.push(`${entry.slug} ${where} (${String(words)} words): « ${text} »`);
    }
  }
  t.diagnostic(`sentences over ${String(MAX_WORDS)} words (tolerated): ${String(warnings.length)}`);
  for (const w of warnings) t.diagnostic(w);
});

void test('budgets of the style guide (§2.2): sentences and words per zone, ids per list', () => {
  for (const entry of glossary.entries) {
    const zones = [
      { name: 'one_liner', text: entry.one_liner, budget: BUDGETS.one_liner },
      { name: 'why_it_matters', text: entry.why_it_matters, budget: BUDGETS.why_it_matters },
      { name: 'objection.text', text: entry.objection.text, budget: BUDGETS['objection.text'] },
      {
        name: 'objection.answer',
        text: entry.objection.answer,
        budget: BUDGETS['objection.answer'],
      },
    ];
    for (const { name, text, budget } of zones) {
      const sentences = splitSentences(text).length;
      const words = wordCount(text);
      assert.ok(
        inRange(sentences, budget.sentences),
        `${entry.slug}: ${name} has ${String(sentences)} sentences (budget ${budget.sentences.join('-')})`,
      );
      assert.ok(
        words <= budget.words,
        `${entry.slug}: ${name} has ${String(words)} words (budget <= ${String(budget.words)})`,
      );
    }
    assert.ok(
      inRange(entry.verbatim_ids.length, BUDGETS.verbatim_ids),
      `${entry.slug}: verbatim_ids count ${String(entry.verbatim_ids.length)}`,
    );
    assert.ok(
      inRange(entry.related_measure_ids.length, BUDGETS.related_measure_ids),
      `${entry.slug}: related_measure_ids count ${String(entry.related_measure_ids.length)}`,
    );
    assert.ok(
      inRange(entry.related_terms.length, BUDGETS.related_terms),
      `${entry.slug}: related_terms count ${String(entry.related_terms.length)}`,
    );
  }
});

void test("digits in a 'reformule' sentence exist verbatim in a support passage", () => {
  for (const entry of glossary.entries) {
    for (const support of entry.sentence_support) {
      if (support.kind !== 'reformule') continue;
      const groups = digitGroups(support.sentence);
      if (groups.size === 0) continue;
      const supported = new Set<string>();
      for (const id of support.support_ids) {
        for (const g of digitGroups(supportText(id) ?? '')) supported.add(g);
      }
      for (const g of groups) {
        assert.ok(
          supported.has(g),
          `${entry.slug}: digit sequence ${g} not in supports ${support.support_ids.join(', ')} for « ${support.sentence} »`,
        );
      }
    }
  }
});

void test("a 'verbatim' sentence is an exact substring of a cited 2025 passage", () => {
  for (const entry of glossary.entries) {
    for (const support of entry.sentence_support) {
      if (support.kind !== 'verbatim') continue;
      const needle = plain(support.sentence);
      const found = support.support_ids.some((id) => {
        if (!corpusText.has(id)) return false;
        return plain(corpusText.get(id) ?? '').includes(needle);
      });
      assert.ok(
        found,
        `${entry.slug}: verbatim sentence not found in ${support.support_ids.join(', ')}: « ${support.sentence} »`,
      );
    }
  }
});

void test('a quoted fragment « … » in a paraphrase is an exact substring of a support passage', () => {
  for (const entry of glossary.entries) {
    for (const support of entry.sentence_support) {
      if (support.kind === 'verbatim') continue;
      for (const fragment of quotedFragments(support.sentence)) {
        const needle = plain(fragment);
        const found = support.support_ids.some((id) =>
          plain(supportText(id) ?? '').includes(needle),
        );
        assert.ok(
          found,
          `${entry.slug}: quoted fragment « ${fragment} » not in supports ${support.support_ids.join(', ')}`,
        );
      }
    }
  }
});

void test("a 'contexte-2022' sentence is dated, supported by 2022 material only, last in why_it_matters; other kinds cite 2025 passages", () => {
  for (const entry of glossary.entries) {
    const context = entry.sentence_support.filter((s) => s.kind === 'contexte-2022');
    assert.ok(context.length <= 1, `${entry.slug}: more than one contexte-2022 sentence`);
    for (const support of entry.sentence_support) {
      if (support.kind === 'contexte-2022') {
        assert.equal(
          support.field,
          'why_it_matters',
          `${entry.slug}: contexte-2022 sentence outside why_it_matters`,
        );
        assert.ok(
          support.sentence.includes('2022'),
          `${entry.slug}: contexte-2022 sentence must say 2022: « ${support.sentence} »`,
        );
        const why = entry.sentence_support.filter((s) => s.field === 'why_it_matters');
        assert.equal(
          why.at(-1)?.sentence,
          support.sentence,
          `${entry.slug}: contexte-2022 sentence is not the last of why_it_matters`,
        );
        for (const id of support.support_ids) {
          assert.ok(
            livretText.has(id),
            `${entry.slug}: contexte-2022 support ${id} is not a 2022 page`,
          );
        }
        continue;
      }
      for (const id of support.support_ids) {
        if (corpusText.has(id)) continue;
        // A désintox URL is admissible only inside the objection answer (D1.5);
        // a 2022 page never supports a 'verbatim' or 'reformule' sentence.
        assert.ok(
          isUrl(id) && support.field === 'objection.answer' && desintoxText.has(id),
          `${entry.slug}: ${support.kind} sentence in ${support.field} cites non-2025 material ${id}`,
        );
      }
    }
  }
});

void test('sources: known kinds, dates only for non-2025 material, every support has a provenance line', () => {
  for (const entry of glossary.entries) {
    const refs = new Set(entry.sources.map((s) => s.ref));
    for (const source of entry.sources) {
      assert.ok(SOURCE_KINDS.has(source.kind), `${entry.slug}: unknown source kind ${source.kind}`);
      assert.equal(
        source.date === null,
        source.kind === 'programme-2025',
        `${entry.slug}: source ${source.ref} date must be null iff programme-2025`,
      );
      assert.equal(
        isUrl(source.ref),
        source.kind !== 'programme-2025',
        `${entry.slug}: source ${source.ref} ref/kind mismatch`,
      );
    }
    const needed = new Set<string>([
      ...entry.verbatim_ids,
      ...entry.sentence_support.flatMap((s) => s.support_ids),
    ]);
    for (const ref of needed) {
      assert.ok(refs.has(ref), `${entry.slug}: ${ref} is cited but absent from sources`);
    }
  }
});

void test('app voice: no forbidden word, no « vous », no emoji (guide §2.1 rule 11, §2.4)', () => {
  const emoji = /\p{Extended_Pictographic}/u;
  for (const entry of glossary.entries) {
    const texts = [
      entry.one_liner,
      entry.why_it_matters,
      entry.objection.text,
      entry.objection.answer,
    ];
    for (const text of texts) {
      assert.ok(!emoji.test(text), `${entry.slug}: emoji in « ${text} »`);
      const lower = plain(text).toLowerCase();
      for (const word of FORBIDDEN) {
        const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, 'u');
        assert.ok(!pattern.test(lower), `${entry.slug}: forbidden « ${word} » in « ${text} »`);
      }
    }
  }
});

void test('routing aliases are lowercase, unique and include the term', () => {
  for (const entry of glossary.entries) {
    const seen = new Set<string>();
    for (const alias of entry.aliases) {
      assert.equal(alias, alias.toLowerCase(), `${entry.slug}: alias not lowercase: ${alias}`);
      assert.equal(
        alias,
        alias.normalize('NFC').trim(),
        `${entry.slug}: alias not NFC-trimmed: ${alias}`,
      );
      assert.ok(!seen.has(alias), `${entry.slug}: duplicate alias ${alias}`);
      seen.add(alias);
    }
    assert.ok(seen.has(entry.term.toLowerCase()), `${entry.slug}: aliases must include the term`);
    for (const alias of entry.aliases_from_card) {
      assert.ok(
        seen.has(alias.toLowerCase()),
        `${entry.slug}: card alias missing from routing aliases: ${alias}`,
      );
    }
  }
});

void test('related_terms: known slugs are linked, dangling slugs are declared in meta', (t) => {
  const slugs = new Set(glossary.entries.map((e) => e.slug));
  const dangling = new Set<string>();
  for (const entry of glossary.entries) {
    for (const term of entry.related_terms) {
      assert.notEqual(term, entry.slug, `${entry.slug}: links to itself`);
      if (!slugs.has(term)) dangling.add(term);
    }
  }
  assert.deepEqual([...dangling].sort(), [...glossary.meta.dangling_related_terms].sort());
  t.diagnostic(`dangling related_terms: ${String(dangling.size)}`);
});

void test('readability numbers in the file match a fresh measurement', () => {
  for (const entry of glossary.entries) {
    const lengths = voiceSentences(entry).map((s) => wordCount(s.text));
    const r = entry.readability;
    assert.equal(r.sentences, lengths.length, `${entry.slug}: sentences`);
    assert.equal(r.max_sentence_words, Math.max(...lengths), `${entry.slug}: max_sentence_words`);
    assert.equal(
      r.sentences_over_15_words,
      lengths.filter((n) => n > MAX_WORDS).length,
      `${entry.slug}: sentences_over_15_words`,
    );
    assert.equal(r.words_one_liner, wordCount(entry.one_liner), `${entry.slug}: words_one_liner`);
    assert.equal(
      r.words_why_it_matters,
      wordCount(entry.why_it_matters),
      `${entry.slug}: words_why_it_matters`,
    );
    assert.equal(
      r.words_objection_text,
      wordCount(entry.objection.text),
      `${entry.slug}: words_objection_text`,
    );
    assert.equal(
      r.words_objection_answer,
      wordCount(entry.objection.answer),
      `${entry.slug}: words_objection_answer`,
    );
  }
});

// -------------------------------------------------------------------------------------------
// Gates added by the panel rouge (T12), docs/discovery/13-tests-humains.md §T12.

/**
 * A `reformule` sentence is written by us and must be covered by the 2025 text: its supports are
 * corpus ids, never a URL. Only a `contexte-2022` sentence may lean on a 2022 page, and D9.10
 * reduces Désintox to a title and a link — never a figure attributed to the movement (D2.2).
 */
void test('a reformule sentence is supported by corpus ids only, never by a URL (D2.2, D9.10)', () => {
  for (const entry of glossary.entries) {
    for (const support of entry.sentence_support) {
      if (support.kind === 'contexte-2022') continue;
      for (const id of support.support_ids) {
        assert.ok(
          !/^https?:/i.test(id),
          `${entry.slug}: a ${support.kind} sentence points to a URL (${id}): « ${support.sentence} »`,
        );
        assert.ok(
          corpusText.has(id),
          `${entry.slug}: support ${id} is not an id of the frozen corpus`,
        );
      }
    }
  }
});

/**
 * Verbal mode (guide §2 rule 7): a proposal is not a fact. A sentence that is ours (anything but a
 * `verbatim`, which is the programme's own words) may use a future indicative only when it opens on
 * an attribution. This is the rule the panel found violated by `6e-republique`, on the most
 * quotable line of a shared card.
 */
const FUTURE_INDICATIVE = /\b[a-zà-öø-ÿ]+(?:ra|ras|rons|rez|ront)\b/i;
const ATTRIBUTED_OPENING =
  /^(Le programme|Le texte|Selon le programme|Selon le texte|Dans le cadre de|En \d{4},|Un plan de campagne|Le livret|Un livret)/;

void test('no unattributed future indicative in a sentence of ours (guide rule 7)', () => {
  for (const entry of glossary.entries) {
    for (const support of entry.sentence_support) {
      if (support.kind === 'verbatim') continue; // the programme's own words, quoted as they are
      const match = FUTURE_INDICATIVE.exec(support.sentence);
      if (match === null) continue;
      assert.ok(
        ATTRIBUTED_OPENING.test(support.sentence),
        `${entry.slug}: "${match[0]}" is a future indicative in an unattributed sentence: « ${support.sentence} »`,
      );
    }
  }
});

/**
 * A measure that lives under a `heading_paragraph` carries that heading's legal scope
 * (meta.source_anomalies). `c1-s02-p03` is « Dans le cadre de l'Assemblée constituante : » — a bare
 * colon. Citing it as the support of a sentence is legitimate (it IS the scope); rendering it as a
 * quotable passage is not. The rule enforced here: whenever a heading paragraph is a support, the
 * sentence must carry the scope in words, so a reader who never opens the JSON still sees it.
 */
const HEADING_SCOPE_WORDS: Readonly<Record<string, RegExp>> = {
  'c1-s02-p02': /par la loi/i,
  'c1-s02-p03': /constituante/i,
};

void test('a sentence supported by a heading_paragraph says that scope in words (D1.8)', () => {
  for (const entry of glossary.entries) {
    for (const support of entry.sentence_support) {
      for (const id of support.support_ids) {
        const scope = HEADING_SCOPE_WORDS[id];
        if (scope === undefined) continue;
        assert.match(
          support.sentence,
          scope,
          `${entry.slug}: « ${support.sentence} » leans on the heading ${id} without saying its scope`,
        );
      }
    }
  }
});
