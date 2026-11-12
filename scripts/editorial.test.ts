/**
 * Our own writing about the 2026 edition, held to the text it rests on (lot E).
 *
 *   everywhere   every support is a proposition (or a paragraph) of the manifest, pinned by its
 *                hash; quotations are whole propositions listed in quotes.json, two per entry
 *                at most; the sentences obey the voice rules; the state of the review is said;
 *   locally      (where the private corpus is) every figure one of our sentences states is in
 *                the text of one of its supports. A number is the easiest thing to get wrong
 *                from memory and the first thing a hostile reader checks.
 *
 * Run: npx tsx --test scripts/editorial.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { flatItems } from './aec26-core.js';
import type { ExposurePolicy, Manifest, PrivateCorpus, QuotesFile } from './aec26-types.js';

interface Support {
  id: string;
  sha256: string;
  quote?: boolean;
}
interface Review {
  status: string;
  by: string | null;
  on: string | null;
}
interface Entry {
  id: string;
  supports: Support[];
  review: Review;
  /** Every sentence of ours the entry prints. */
  texts: string[];
}

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const manifest = json('data/2026/manifest.json') as Manifest;
const quotes = json('data/2026/quotes.json') as QuotesFile;
const policy = json('data/2026/exposure-policy.json') as ExposurePolicy;

interface RiposteFile {
  entries: (Omit<Entry, 'texts'> & {
    slug: string;
    theme: string;
    objection: string;
    answer: string;
    avoid: string;
  })[];
}
interface GlossaryFile {
  entries: (Omit<Entry, 'texts'> & {
    term: string;
    plain: string;
    why: string;
    objection: { text: string; answer: string };
    related: string[];
  })[];
}
const riposte = json('data/2026/riposte.json') as RiposteFile;
const glossary = json('data/2026/glossary.json') as GlossaryFile;

const entries: Entry[] = [
  ...riposte.entries.map((e) => ({
    ...e,
    id: `riposte:${e.id}`,
    texts: [e.objection, e.answer, e.avoid],
  })),
  ...glossary.entries.map((e) => ({
    ...e,
    id: `mot:${e.id}`,
    texts: [e.plain, e.why, e.objection.text, e.objection.answer],
  })),
];
const published = new Map(manifest.sections.flatMap((s) => s.items).map((i) => [i.id, i]));
const NBSP = String.fromCodePoint(0xa0);

void test('every support is in the manifest, pinned by the hash it has there', () => {
  for (const entry of entries) {
    assert.ok(entry.supports.length >= 2, `${entry.id}: an answer rests on at least two supports`);
    for (const support of entry.supports) {
      const item = published.get(support.id);
      assert.ok(item, `${entry.id}: ${support.id} is not in the manifest`);
      assert.equal(
        item.sha256,
        support.sha256,
        `${entry.id}: ${support.id} changed since it was pinned`,
      );
    }
  }
});

void test('quotations: whole propositions, listed, two per entry at most', () => {
  const listed = new Map(quotes.quotes.map((q) => [q.id, q]));
  const asked = new Set<string>();
  for (const entry of entries) {
    const quoted = entry.supports.filter((s) => s.quote === true);
    assert.ok(quoted.length <= 2, `${entry.id}: ${String(quoted.length)} quotations`);
    for (const support of quoted) {
      assert.notEqual(
        published.get(support.id)?.kind,
        'paragraph',
        `${entry.id}: prose is never quoted`,
      );
      const quote = listed.get(support.id);
      assert.ok(
        quote,
        `${entry.id}: ${support.id} is quoted but not in quotes.json (run publish-2026.ts)`,
      );
      assert.ok(
        quote.used_by.includes(entry.id),
        `${support.id}: quotes.json does not credit ${entry.id}`,
      );
      asked.add(support.id);
    }
  }
  assert.equal(asked.size, quotes.quotes.length, 'quotes.json lists a quotation nobody asks for');
  assert.ok(asked.size <= policy.max_quotes);
});

void test('identifiers and addresses are stable, unique and never collide', () => {
  const slugs = riposte.entries.map((e) => e.slug);
  const ids = riposte.entries.map((e) => e.id);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(new Set(ids).size, ids.length);
  for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  // /r/<slug>/ and /r/<old id>/ share a prefix: an id must never be somebody's slug.
  for (const id of ids) {
    assert.match(id, /^rip-\d{2}$/);
    assert.ok(!slugs.includes(id));
  }
  const cards = glossary.entries.map((e) => e.id);
  assert.equal(new Set(cards).size, cards.length);
  for (const card of glossary.entries) {
    assert.match(card.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const other of card.related) assert.ok(cards.includes(other), `${card.id} → ${other}`);
    assert.ok(!card.related.includes(card.id));
  }
});

const sentencesOf = (text: string): string[] =>
  text
    .split(/[.!?…]+(?=[\s»]|$)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
const wordsOf = (sentence: string): string[] =>
  sentence.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token));

void test('our sentences obey the voice: short, typeset, calm, and they name no machine', () => {
  for (const entry of entries) {
    for (const text of entry.texts) {
      const where = `${entry.id}: « ${text.slice(0, 40)}… »`;
      for (const sentence of sentencesOf(text)) {
        assert.ok(
          wordsOf(sentence).length <= 25,
          `${where}: a sentence of ${String(wordsOf(sentence).length)} words`,
        );
      }
      assert.ok(!/ [:;!?»%]/.test(text), `${where}: breaking space before punctuation`);
      assert.ok(!/« /.test(text), `${where}: breaking space after «`);
      assert.ok(
        !text.includes(String.fromCodePoint(0x202f)),
        `${where}: U+202F is absent from the fonts`,
      );
      assert.ok(!/\.\.\./.test(text), `${where}: three dots`);
      assert.ok(
        !/\d \d{3}\b/.test(text),
        `${where}: a thousands separator must be a no-break space`,
      );
      assert.ok(!/\p{Extended_Pictographic}/u.test(text), `${where}: emoji`);
      assert.ok(
        !/\b(panne|erreur|désolé|malheureusement)\b/i.test(text),
        `${where}: a word of failure`,
      );
      assert.ok(!/munition|riposte|clash/i.test(text), `${where}: campaign vocabulary`);
      assert.ok(
        !/\bIA\b|intelligence artificielle|Mistral/i.test(text),
        `${where}: names a machine`,
      );
      assert.equal(text, text.trim());
    }
  }
  // An objection is someone else's sentence: it stands in quotation marks, with their spaces.
  for (const e of riposte.entries) {
    assert.match(e.objection, new RegExp(`^«${NBSP}.+${NBSP}»$`), `${e.id}: objection`);
  }
});

void test('the state of the review is said, and a review names who and when', () => {
  for (const entry of entries) {
    assert.ok(['pending', 'reviewed'].includes(entry.review.status), entry.id);
    if (entry.review.status === 'reviewed') {
      assert.ok(
        entry.review.by !== null && entry.review.on !== null,
        `${entry.id}: reviewed by whom, when?`,
      );
      assert.match(entry.review.on, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
});

const NUMBER_WORDS = [
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'quinze',
  'vingt',
  'trente',
  'quarante',
];
const figures = (text: string): string[] =>
  [...text.matchAll(/\d(?:[\d\s]*\d)?/g)].map((m) => m[0].replace(/\D/g, ''));

const skip = existsSync('private/corpus/aec-2026.json')
  ? false
  : 'no private corpus on this machine: figures are checked where the text is';

void test('every figure we state is written in one of the supports', { skip }, () => {
  const corpus = json('private/corpus/aec-2026.json') as PrivateCorpus;
  const texts = new Map(
    corpus.sections.flatMap((s) => flatItems(s.items)).map((i) => [i.id, i.text]),
  );
  const unsupported: string[] = [];
  for (const entry of entries) {
    const source = entry.supports.map((s) => texts.get(s.id) ?? '').join(' \n ');
    const written = new Set(figures(source));
    const lower = source.toLowerCase();
    // The objection is not ours: what an opponent says needs no support.
    const ours = entry.id.startsWith('riposte:')
      ? entry.texts.slice(1)
      : [entry.texts[0], entry.texts[1], entry.texts[3]];
    for (const text of ours) {
      for (const figure of figures(text ?? '')) {
        if (!written.has(figure)) unsupported.push(`${entry.id}: ${figure}`);
      }
      for (const word of NUMBER_WORDS) {
        if (
          new RegExp(`\\b${word}\\b`, 'i').test(text ?? '') &&
          !new RegExp(`\\b${word}\\b`).test(lower)
        ) {
          unsupported.push(`${entry.id}: « ${word} »`);
        }
      }
    }
  }
  assert.deepEqual(unsupported, [], 'figures stated by us and written in none of the supports');
});
