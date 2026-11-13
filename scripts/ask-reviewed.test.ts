/**
 * Recognising one of the fifteen objections in a question (src/lib/ask-reviewed.ts), held on
 * the evaluation set: every objection is recognised word for word, and no question that
 * deserves an answer of its own is sent to ours.
 *
 * Run: npx tsx --test scripts/ask-reviewed.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { reviewedFor, type ReviewedEntry } from '../src/lib/ask-reviewed.js';
import { loadAskSet } from './ask-set.js';

const entries = (
  JSON.parse(readFileSync('data/2026/riposte.json', 'utf8')) as { entries: ReviewedEntry[] }
).entries;
const set = loadAskSet();

void test('each of the fifteen objections is recognised, as written and as someone would retype it', () => {
  for (const entry of entries) {
    assert.equal(reviewedFor(entry.objection, entries), entry.slug, entry.objection);
    // Without the quotation marks, in lower case, with a question mark: still the objection.
    const retyped = `${entry.objection.replace(/[«»]/g, '').trim().toLowerCase()} ?`;
    assert.equal(reviewedFor(retyped, entries), entry.slug, retyped);
  }
});

void test('a question about the same measure keeps its own answer', () => {
  for (const question of [
    "Retraite à 60 ans : combien d'annuités demande le programme ?",
    'Ils proposent quoi pour les agriculteurs ?',
    'Le programme dit quoi sur la laïcité ?',
    'Le SMIC, il passe à combien ?',
    'Et le nucléaire ?',
    '',
    'Bonjour',
  ]) {
    assert.equal(reviewedFor(question, entries), null, question);
  }
});

void test('on the evaluation set, only the questions that accept our answer are sent to it', () => {
  const routed: string[] = [];
  for (const item of set.items) {
    const slug = reviewedFor(item.question, entries);
    if (slug === null) continue;
    routed.push(item.id);
    assert.ok(
      item.expect.includes('reviewed'),
      `${item.id} is sent to « ${slug} » and does not accept a re-read answer`,
    );
    assert.equal(slug, item.slug, `${item.id} is sent to the wrong answer`);
  }
  for (const item of set.items.filter((i) => i.group === 'objection')) {
    assert.ok(routed.includes(item.id), `${item.id} is not recognised`);
  }
  console.log(`  recognised: ${routed.join(', ')}`);
});
