/**
 * Self-check for data/riposte.json (T8, "Mode riposte").
 *
 * Guarantees, against the frozen corpus and its derivatives:
 *   - every measure id and stat card id exists (nothing is invented);
 *   - the "liant" never carries a number that is absent from the cited passages;
 *   - objections, share titles and liants respect the length rules of docs/discovery/10-riposte.md;
 *   - themes come from data/section-tags.json, désintox links from data/desintox.json;
 *   - the counting rules of the task hold (>= 8 grounded in désintox, <= 7 field-only);
 *   - the D5.11 corrections hold (docs/discovery/07-mecaniques.md §7.4): neutral slugs from the
 *     closed list of meta.theme_slugs, no accusation word in what travels in a URL, rip-08 and
 *     rip-12 without a stat card, rip-06 / rip-10 / rip-13 opening on a measure that answers.
 *
 * Run: npx tsx --test scripts/riposte.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Dataset, Measure, Section, SubMeasure } from './aec-types.js';

interface ShareCard {
  title_fr: string;
  /** `claim` asserts something about the text and must be supported by the printed verbatim. */
  title_kind: 'claim' | 'topic';
  title_note_fr?: string;
  verbatim_id: string;
}

interface RiposteEntry {
  id: string;
  objection_fr: string;
  theme: string;
  slug: string;
  button_label_fr: string;
  source: 'desintox' | 'terrain';
  answer_kind: 'verbatim-first';
  measure_ids: string[];
  stat_card_id: string | null;
  stat_card_note_fr?: string;
  desintox_url: string | null;
  desintox_title: string | null;
  desintox_post_id: number | null;
  desintox_fit?: 'partial';
  desintox_note_fr?: string;
  liant_fr: string;
  liant_kind: 'reformulé';
  share_card_fr: ShareCard;
  flashcard_seconds: number;
  reversal_note_fr: string;
  review_status?: 'pending-review';
  revision_note_fr?: string;
}

interface RiposteFile {
  meta: {
    corpus_version: string;
    excluded_stat_card_ids: string[];
    theme_slugs: Record<string, { theme: string; label_fr: string }>;
    counts: {
      entries: number;
      grounded_in_desintox: number;
      field_only: number;
      with_stat_card: number;
      distinct_slugs: number;
    };
  };
  entries: RiposteEntry[];
}

interface StatCardsFile {
  meta: { corpus_version: string };
  cards: { id: string; section_id: string; chapter_id: string; text: string }[];
}

interface SectionTagsFile {
  vocab: { themes: string[] };
}

interface DesintoxFile {
  posts: { id: number; url: string; title: string }[];
}

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const riposte = readJson('../data/riposte.json') as RiposteFile;
const corpus = readJson('../data/aec-2025.json') as Dataset;
const statCards = readJson('../data/stat-cards.json') as StatCardsFile;
const sectionTags = readJson('../data/section-tags.json') as SectionTagsFile;
const desintox = readJson('../data/desintox.json') as DesintoxFile;

const MAX_OBJECTION_WORDS = 15;
const MAX_TITLE_WORDS = 8;
const MAX_LIANT_SENTENCES = 2;
const MIN_MEASURES = 2;
const MAX_MEASURES = 4;
const MIN_GROUNDED = 8;
const MAX_FIELD_ONLY = 7;
const FLASHCARD_SECONDS = 10;
/** Words that must never travel in a slug, a button word or an objection (D5.11: no accusation, no religion). */
const ACCUSATION_WORDS = /islam|musulman|juif|chrétien|catholi|arabe|terror|antisémit/i;

/** Index of every measure, key measure and sub-measure of the corpus, with its section. */
const measureIndex = new Map<string, { text: string; section: Section }>();
for (const section of corpus.sections) {
  for (const item of section.items) {
    if (item.kind === 'paragraph') continue;
    measureIndex.set(item.id, { text: item.text, section });
    const subMeasures: SubMeasure[] = (item as Measure).subMeasures ?? [];
    for (const sub of subMeasures) measureIndex.set(sub.id, { text: sub.text, section });
  }
}
const cardIndex = new Map(statCards.cards.map((card) => [card.id, card]));
const themeVocab = new Set(sectionTags.vocab.themes);
const desintoxByUrl = new Map(desintox.posts.map((post) => [post.url, post]));

const countWords = (text: string): number =>
  text
    .replace(/[«»"]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

const countSentences = (text: string): number =>
  text.split(/[.!?]+(?:\s|$)/).filter((part) => part.trim().length > 0).length;

/** Digit runs of `text` ("1600", "60", "77-808" gives "77" and "808"). */
const digitRuns = (text: string): string[] => text.match(/\d+/g) ?? [];

void test('the file is built on the frozen corpus version and has 15 well-formed entries', () => {
  assert.equal(riposte.meta.corpus_version, corpus.meta.corpus_version);
  assert.equal(riposte.meta.corpus_version, statCards.meta.corpus_version);
  assert.equal(riposte.entries.length, 15);
  assert.equal(riposte.meta.counts.entries, riposte.entries.length);
  riposte.entries.forEach((entry, index) => {
    assert.equal(entry.id, `rip-${String(index + 1).padStart(2, '0')}`);
    assert.equal(entry.answer_kind, 'verbatim-first');
    assert.equal(entry.liant_kind, 'reformulé');
    assert.equal(entry.flashcard_seconds, FLASHCARD_SECONDS);
    assert.ok(entry.reversal_note_fr.trim().length > 0, `${entry.id}: empty reversal note`);
  });
});

void test('every measure id exists in the corpus (2 to 4 per entry, no duplicates)', () => {
  for (const entry of riposte.entries) {
    assert.ok(
      entry.measure_ids.length >= MIN_MEASURES && entry.measure_ids.length <= MAX_MEASURES,
      `${entry.id}: ${String(entry.measure_ids.length)} measures`,
    );
    assert.equal(
      new Set(entry.measure_ids).size,
      entry.measure_ids.length,
      `${entry.id}: duplicate ids`,
    );
    for (const id of entry.measure_ids) {
      assert.ok(measureIndex.has(id), `${entry.id}: unknown measure ${id}`);
    }
  }
});

void test('every stat card id exists, is not excluded, and belongs to a cited chapter', () => {
  const excluded = new Set(riposte.meta.excluded_stat_card_ids);
  assert.ok(excluded.has('c13-s03-a02'), 'the nuclear votation card must stay excluded (D1.9)');
  for (const entry of riposte.entries) {
    if (entry.stat_card_id === null) continue;
    const card = cardIndex.get(entry.stat_card_id);
    assert.ok(card, `${entry.id}: unknown stat card ${entry.stat_card_id}`);
    assert.ok(!excluded.has(card.id), `${entry.id}: excluded stat card ${card.id}`);
    const chapters = new Set(
      entry.measure_ids.map((id) => measureIndex.get(id)?.section.chapterId ?? ''),
    );
    assert.ok(chapters.has(card.chapter_id), `${entry.id}: card ${card.id} is off-chapter`);
  }
});

void test('the liant carries no digit that is absent from the cited passages', () => {
  for (const entry of riposte.entries) {
    const cited = entry.measure_ids.map((id) => measureIndex.get(id)?.text ?? '');
    if (entry.stat_card_id !== null) cited.push(cardIndex.get(entry.stat_card_id)?.text ?? '');
    const support = cited.join('\n');
    for (const run of digitRuns(entry.liant_fr)) {
      assert.ok(support.includes(run), `${entry.id}: digit "${run}" is not in a cited passage`);
    }
  }
});

void test('objections are at most 15 words, quoted as heard', () => {
  for (const entry of riposte.entries) {
    const words = countWords(entry.objection_fr);
    assert.ok(words <= MAX_OBJECTION_WORDS, `${entry.id}: ${String(words)} words`);
    assert.ok(entry.objection_fr.startsWith('«') && entry.objection_fr.endsWith('»'), entry.id);
  }
});

void test('liants are at most 2 sentences; share titles at most 8 words and point to a cited verbatim', () => {
  for (const entry of riposte.entries) {
    const sentences = countSentences(entry.liant_fr);
    assert.ok(sentences <= MAX_LIANT_SENTENCES, `${entry.id}: ${String(sentences)} sentences`);
    const titleWords = countWords(entry.share_card_fr.title_fr);
    assert.ok(titleWords <= MAX_TITLE_WORDS, `${entry.id}: title has ${String(titleWords)} words`);
    assert.ok(
      entry.measure_ids.includes(entry.share_card_fr.verbatim_id),
      `${entry.id}: verbatim ${entry.share_card_fr.verbatim_id} is not among measure_ids`,
    );
    assert.ok(
      !/\p{Extended_Pictographic}/u.test(entry.share_card_fr.title_fr),
      `${entry.id}: emoji`,
    );
  }
});

void test('themes come from the closed vocabulary of data/section-tags.json', () => {
  for (const entry of riposte.entries) {
    assert.ok(themeVocab.has(entry.theme), `${entry.id}: unknown theme "${entry.theme}"`);
  }
});

void test('désintox links resolve to fetched posts; at least 8 grounded, at most 7 field-only', () => {
  let grounded = 0;
  for (const entry of riposte.entries) {
    if (entry.desintox_url === null) {
      assert.equal(entry.source, 'terrain', entry.id);
      assert.equal(entry.desintox_title, null, entry.id);
      continue;
    }
    grounded += 1;
    assert.equal(entry.source, 'desintox', entry.id);
    const post = desintoxByUrl.get(entry.desintox_url);
    assert.ok(post, `${entry.id}: désintox url not in data/desintox.json`);
    assert.equal(entry.desintox_title, post.title, entry.id);
    assert.equal(entry.desintox_post_id, post.id, entry.id);
    if (entry.desintox_fit === 'partial') {
      assert.ok(
        entry.desintox_note_fr !== undefined && entry.desintox_note_fr.length > 0,
        entry.id,
      );
    }
  }
  const fieldOnly = riposte.entries.length - grounded;
  assert.ok(grounded >= MIN_GROUNDED, `only ${String(grounded)} grounded entries`);
  assert.ok(fieldOnly <= MAX_FIELD_ONLY, `${String(fieldOnly)} field-only entries`);
  assert.equal(riposte.meta.counts.grounded_in_desintox, grounded);
  assert.equal(riposte.meta.counts.field_only, fieldOnly);
});

void test('D5.11: neutral slugs from the closed list, no accusation word, and the corrected entries', () => {
  const slugs = new Set<string>();
  let withStatCard = 0;
  for (const entry of riposte.entries) {
    assert.match(entry.slug, /^[a-z0-9-]{3,24}$/, `${entry.id}: malformed slug "${entry.slug}"`);
    assert.ok(!slugs.has(entry.slug), `${entry.id}: slug "${entry.slug}" already used`);
    slugs.add(entry.slug);
    const declared = riposte.meta.theme_slugs[entry.slug];
    assert.ok(declared, `${entry.id}: slug "${entry.slug}" is not in meta.theme_slugs`);
    assert.equal(declared.theme, entry.theme, `${entry.id}: slug and theme disagree`);
    assert.equal(declared.label_fr, entry.button_label_fr, `${entry.id}: button word differs`);
    assert.ok(countWords(entry.button_label_fr) <= 2, `${entry.id}: button word too long`);
    for (const text of [entry.slug, entry.button_label_fr, entry.objection_fr]) {
      assert.ok(!ACCUSATION_WORDS.test(text), `${entry.id}: accusation word in "${text}"`);
    }
    if (entry.stat_card_id !== null) withStatCard += 1;
    if (entry.review_status === 'pending-review') {
      assert.ok(
        (entry.revision_note_fr ?? '').length > 0,
        `${entry.id}: pending review without a note`,
      );
    }
  }
  assert.equal(riposte.meta.counts.distinct_slugs, slugs.size);
  assert.equal(riposte.meta.counts.with_stat_card, withStatCard);

  const byId = new Map(riposte.entries.map((entry) => [entry.id, entry]));
  const first = (id: string): string | undefined => byId.get(id)?.measure_ids[0];
  // The measure confirming the premise stays, never first (07-mecaniques.md §7.4).
  assert.equal(first('rip-06'), 'c7-s08-m06');
  assert.equal(byId.get('rip-06')?.measure_ids.at(-1), 'c7-s08-k01');
  assert.equal(first('rip-10'), 'c13-s02-m02');
  assert.equal(first('rip-13'), 'c13-s03-m02');
  // Off-topic stat cards removed.
  assert.equal(byId.get('rip-08')?.stat_card_id, null);
  assert.equal(byId.get('rip-12')?.stat_card_id, null);
  // rip-11 reformulated: laïcité theme, neutral slug, review pending (D0.27).
  const rip11 = byId.get('rip-11');
  assert.ok(rip11);
  assert.equal(rip11.slug, 'laicite');
  assert.equal(rip11.review_status, 'pending-review');
});

// -------------------------------------------------------------------------------------------
// Gates added by the panel rouge (T12), docs/discovery/13-tests-humains.md §T12.

/**
 * Universal negations and exhaustivity claims. D6.4 forbids the chat from asserting an absence on
 * the whole programme (the v1 bench produced three, all invisible to the validator). A "liant" of
 * riposte.json is exactly the same kind of sentence, printed on a share card and on a flashcard:
 * no `measure_id` can support "no measure does X" over 837 propositions.
 */
const UNIVERSAL_NEGATION =
  /aucune mesure|aucun passage|ne contient (pas|ni|aucun)|\buniquement\b|\bseulement\b|\bjamais\b|rien dans le programme|nulle part/i;

/** French stop words, for the title / proof coherence check. */
const TITLE_STOP_WORDS = new Set(
  ('le la les un une des du de d et ou a au aux en dans sur pour par avec sans ce cette ces qui que ' +
    'quoi ni est sont son sa ses leur leurs il elle ils elles on nous vous se plus moins tout toute ' +
    'tous toutes exacte exact vraiment ici')
    .split(' ')
    .filter((w) => w.length > 0),
);

/** Lowercase, accent-free word tokens. */
const tokensOf = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .match(/[a-z0-9]+/g) ?? [];

/** Content words of a share title: no stop word, at least three characters. */
const contentWordsOf = (title: string): string[] =>
  tokensOf(title).filter((word) => word.length > 2 && !TITLE_STOP_WORDS.has(word));

/** Sentences of a liant, trimmed. */
const sentencesOf = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

/** Openings that attribute a sentence to the text, or refer back to it (D2.2, guide rule 7). */
const ATTRIBUTED = /^(Le programme|Le texte|Selon le programme|Selon le texte|La réponse Désintox)\b/;
const ANAPHORIC = /^(Il|Elle|Ils|Elles)\b/;

void test('no liant carries a universal negation or an exhaustivity claim (D6.4 applied to riposte)', () => {
  for (const entry of riposte.entries) {
    const match = UNIVERSAL_NEGATION.exec(entry.liant_fr);
    assert.equal(
      match,
      null,
      `${entry.id}: "${match?.[0] ?? ''}" asserts something about the whole programme, which no id supports: ${entry.liant_fr}`,
    );
  }
});

void test('every liant sentence attributes what it says to the text (guide rule 7, D2.2)', () => {
  for (const entry of riposte.entries) {
    const sentences = sentencesOf(entry.liant_fr);
    assert.ok(sentences.length > 0, `${entry.id}: empty liant`);
    assert.match(
      sentences[0] ?? '',
      ATTRIBUTED,
      `${entry.id}: the first sentence must name the text as its subject: "${sentences[0] ?? ''}"`,
    );
    for (const sentence of sentences.slice(1)) {
      assert.ok(
        ATTRIBUTED.test(sentence) || ANAPHORIC.test(sentence),
        `${entry.id}: unattributed sentence "${sentence}"`,
      );
    }
  }
});

void test('a share title that asserts is supported by the verbatim it prints; a topic title says so', () => {
  for (const entry of riposte.entries) {
    const card = entry.share_card_fr;
    // Widened on purpose: the declared type says 'claim' | 'topic', but this suite validates
    // JSON read from disk, where the field may be missing or anything at all. Comparing the
    // narrow type is what ESLint (rightly) calls an always-true condition.
    const titleKind: string = card.title_kind;
    assert.ok(
      titleKind === 'claim' || titleKind === 'topic',
      `${entry.id}: missing share_card_fr.title_kind`,
    );
    if (card.title_kind === 'topic') {
      assert.ok(
        (card.title_note_fr ?? '').length > 0,
        `${entry.id}: a topic title must carry the reason it asserts nothing`,
      );
      continue;
    }
    const verbatim = measureIndex.get(card.verbatim_id)?.text ?? '';
    const stems = new Set(tokensOf(verbatim).map((word) => word.slice(0, 5)));
    const words = contentWordsOf(card.title_fr);
    assert.ok(words.length > 0, `${entry.id}: title has no content word`);
    const shared = words.filter((word) => stems.has(word.slice(0, 5)));
    assert.ok(
      shared.length > 0,
      `${entry.id}: the printed title "${card.title_fr}" shares no word with its printed proof ${card.verbatim_id}`,
    );
  }
});

void test('every entry says what must not be said, and no reversal note is a bare placeholder', () => {
  for (const entry of riposte.entries) {
    const note = entry.reversal_note_fr;
    assert.ok(note.length >= 40, `${entry.id}: reversal note too short to be usable`);
    assert.ok(/Ne pas/i.test(note), `${entry.id}: the reversal note must name what not to say`);
  }
});
