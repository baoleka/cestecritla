/**
 * The private base, as the Worker will find it — checked where the text of the 2026 edition
 * is (the editor's machine), skipped and said so elsewhere.
 *
 *   - loaded on Node's SQLite, every row is the text whose hash the public manifest publishes:
 *     the base cannot hold another state of the book, or a retouched sentence;
 *   - the search of the Worker (src/worker/retrieve.ts) finds, for the questions of the
 *     dossier, a measure of a section where the subject is treated. An answer can only be as
 *     right as what the model was handed: this floor is the first gate of « Demander ».
 *
 * Run: npx tsx --test scripts/ask-retrieval.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Manifest, PrivateCorpus } from './aec26-types.js';
import { retrievalReport } from './ask-retrieval.js';
import { loadAskSet } from './ask-set.js';
import { PRIVATE_CORPUS_PATH } from './ingest-2026.js';
import { baseProblems, localBase, seedRows } from './seed-ask-2026.js';

const skip = existsSync(PRIVATE_CORPUS_PATH)
  ? false
  : 'the text of the 2026 edition is not on this machine';
const corpus = (): PrivateCorpus =>
  JSON.parse(readFileSync(PRIVATE_CORPUS_PATH, 'utf8')) as PrivateCorpus;
const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as Manifest;

void test(
  'the base holds exactly the propositions the manifest publishes the hash of',
  { skip },
  () => {
    const text = corpus();
    assert.deepEqual(baseProblems(localBase(text), manifest), []);
    const rows = seedRows(text);
    assert.equal(rows.length, manifest.meta.official_count);
    // Propositions only: the prose around them is never given to a model.
    assert.ok(rows.every((row) => /-[km]\d{2}(?:\.s\d+)?$/.test(row.id)));
    // A sub-measure carries the measure it details; nothing else carries a lead.
    for (const row of rows) assert.equal(row.lead !== '', row.kind === 'sub_measure', row.id);
  },
);

void test('the base starts stopped: answers open by a second gesture', { skip }, () => {
  const db = localBase(corpus(), 'stopped');
  const row = db.db.prepare("SELECT value FROM meta WHERE key = 'ask'").get();
  assert.equal(row?.['value'], 'stopped');
});

void test(
  'for the questions of the dossier, the base finds a measure of an expected section',
  { skip },
  async () => {
    const set = loadAskSet();
    const questions = await retrievalReport(
      corpus(),
      set.items.filter((i) => i.group === 'question'),
    );
    console.log(
      `  ${String(questions.inContext)}/${String(questions.questions)} among the candidates, ` +
        `${String(questions.inFirstThree)} among the first three ; ${String(questions.meanCandidates)} ` +
        `candidates, ${String(questions.meanCharacters)} characters on average`,
    );
    // Measured on 13/11/2026: 86 of 87 among the candidates, 82 among the first three. The
    // floors are those values less one question — a re-crawl may move one, not three.
    assert.equal(questions.questions, 87);
    assert.ok(
      questions.inContext >= 85,
      `only ${String(questions.inContext)} among the candidates`,
    );
    assert.ok(
      questions.inFirstThree >= 81,
      `only ${String(questions.inFirstThree)} in the first three`,
    );
    assert.equal(questions.empty, 0, 'a question of the dossier finds nothing at all');
    // What one question costs is bounded by what the model is given to read.
    assert.ok(questions.maxCharacters <= 6000 && questions.meanCharacters <= 4500);

    const variants = await retrievalReport(
      corpus(),
      set.items.filter((i) => i.group === 'variant'),
    );
    assert.equal(variants.inContext, variants.questions, `missed: ${variants.misses.join(', ')}`);
  },
);
