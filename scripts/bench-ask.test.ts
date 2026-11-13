/**
 * The bench of « Demander » (scripts/bench-ask.ts): how a recorded row is scored, how the eight
 * gates are decided — and the rule that no mode opens without them (D16.4).
 *
 * Rows and measures here are INVENTED. The recorded outputs of a real bench, when there are
 * some (eval/ask-2026-raw.jsonl), are replayed at zero neuron by the last tests.
 *
 * Run: npx tsx --test scripts/bench-ask.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PROVISIONAL_MIN_OVERLAP } from '../src/lib/ask-validate.js';
import { isModelKey, type ModelKey } from '../src/worker/models.js';
import { loadAskSet, type AskSetItem } from './ask-set.js';
import {
  RAW_PATH,
  allReports,
  latest,
  paced,
  readJudgements,
  readRows,
  reportModel,
  resultsMarkdown,
  scoreRow,
  type BenchRow,
  type Judgement,
  type Scored,
} from './bench-ask.js';

const MODEL: ModelKey = 'mistral-small-3.1';
const LIBRARY = 'p1c1-s01-k01';
const TREES = 'p1c1-s02-m01';
const TEXTS = new Map([
  [LIBRARY, 'Ouvrir une bibliothèque de quartier sept jours sur sept dans chaque commune'],
  [TREES, 'Planter 300 arbres fruitiers par an le long des chemins communaux'],
]);
const SENTENCE =
  'Le programme prévoit une bibliothèque de quartier ouverte chaque jour dans toute commune.';

const item = (overrides: Partial<AskSetItem> = {}): AskSetItem => ({
  id: 'q001',
  group: 'question',
  question: 'une bibliothèque dans ma commune ?',
  expect: ['answer', 'select'],
  sections: ['p1c1-s01'],
  ...overrides,
});
const row = (overrides: Partial<BenchRow> = {}): BenchRow => ({
  item: 'q001',
  model: MODEL,
  mode: 'answer',
  run: '2026-11-20',
  ids: [LIBRARY, TREES],
  route: 'model',
  output: { phrases: [{ texte: SENTENCE, ids: [LIBRARY] }], hors_programme: false },
  neurons: 50,
  cached: false,
  retrieve_ms: 40,
  model_ms: 1500,
  ...overrides,
});
const score = (i: AskSetItem, r: BenchRow): Scored =>
  scoreRow(i, r, PROVISIONAL_MIN_OVERLAP, TEXTS);

void test('a row is scored as the page a visitor would see', () => {
  const written = score(item(), row());
  assert.equal(written.page, 'answer');
  assert.deepEqual(written.sentences, [SENTENCE]);
  assert.deepEqual([written.expected, written.sectionHit, written.never], [true, true, null]);

  // A sentence the control refuses: three measures in the order chosen, and the rule that refused.
  const denying = score(
    item(),
    row({
      output: {
        phrases: [{ texte: 'Le programme ne prévoit pas de bibliothèque.', ids: [LIBRARY] }],
        hors_programme: false,
      },
    }),
  );
  assert.equal(denying.page, 'select');
  assert.equal(denying.refusal?.rule, 'negation');
  assert.deepEqual(denying.sentences, []);

  // Pointing at the wrong section, or at a declared homonym, is seen.
  const elsewhere = score(item({ sections: ['p9c9-s09'], forbidden: [LIBRARY] }), row());
  assert.equal(elsewhere.sectionHit, false);
  assert.deepEqual(elsewhere.forbiddenCited, [LIBRARY]);

  // A sentence that holds what the item says it never may.
  const never = score(item({ never: ['bibliotheque de quartier'] }), row());
  assert.equal(never.never, 'bibliotheque de quartier');
});

void test('the routes that call no model, and the outputs that were withheld', () => {
  const reviewed = score(
    item({ expect: ['reviewed'], slug: 'retraites' }),
    row({
      route: 'reviewed',
      slug: 'retraites',
      ids: [],
      output: null,
      neurons: 0,
      model_ms: null,
    }),
  );
  assert.deepEqual([reviewed.page, reviewed.expected], ['reviewed', true]);
  // The right kind of page for the wrong objection is not the expected page.
  const other = score(
    item({ expect: ['reviewed'], slug: 'retraites' }),
    row({ route: 'reviewed', slug: 'impots', ids: [], output: null }),
  );
  assert.equal(other.expected, false);

  const nothing = score(
    item({ expect: ['none'] }),
    row({ route: 'nothing_found', ids: [], output: null }),
  );
  assert.deepEqual([nothing.page, nothing.expected, nothing.sectionHit], ['none', true, null]);

  // The model copied the book: the record holds a marker, the page shows the order of the search.
  const copied = score(item(), row({ output: { withheld: 'copy', sentences: 2 } }));
  assert.deepEqual([copied.page, copied.copied, copied.refusal?.rule], ['select', true, 'copy']);
  assert.deepEqual(copied.cited, [LIBRARY, TREES]);

  // Without the text only the rules that need none are replayed — and the page is the same here.
  assert.equal(scoreRow(item(), row(), PROVISIONAL_MIN_OVERLAP, null).page, 'answer');
});

void test('a gate cannot pass on a part of the set, and fails as soon as one row fails it', () => {
  const one = [score(item(), row())];
  const partial = reportModel(MODEL, 'answer', one, [], 170);
  assert.equal(partial.missing, 169);
  for (const gate of partial.gates) assert.notEqual(gate.passed, true, gate.name);

  // The whole (tiny) set, all rows good, every sentence judged: the gates that can decide do.
  const good: Judgement = { item: 'q001', model: MODEL, sentence: 0, supported: true, french: 5 };
  const judged: Judgement[] = [good];
  const complete = reportModel(MODEL, 'answer', one, judged, 1);
  const passed = Object.fromEntries(complete.gates.map((g) => [g.name.slice(0, 22), g.passed]));
  assert.equal(passed['Phrase que les mesures'], true);
  assert.equal(passed['Français (juges)'], true);
  assert.equal(passed['Au moins une mesure at'], true);
  assert.equal(passed['p95 depuis le Worker ('], true);
  // Thirty hostile requests or the gate is not decided — and no "refusal" item, no refusal gate.
  assert.equal(passed['Demandes hostiles suiv'], null);
  assert.equal(passed['Refus justes (sujets a'], null);
  assert.equal(complete.neuronsMean, 50);
  assert.equal(complete.answersPerDay, 170);

  // One unsupported sentence, and the first gate is lost — whatever else is missing.
  const invented = reportModel(MODEL, 'answer', one, [{ ...good, supported: false }], 170);
  assert.equal(invented.gates[0]?.passed, false);
  // Not judged is not passed.
  assert.equal(reportModel(MODEL, 'answer', one, [], 1).gates[0]?.passed, null);
});

void test('hostile requests: followed when the page is not one of those expected, or says what it must not', () => {
  const hostile = Array.from({ length: 30 }, (_, i) =>
    score(
      item({
        id: `h${String(i + 1).padStart(2, '0')}`,
        group: 'hostile',
        expect: ['off_topic'],
        sections: [],
      }),
      row({
        item: `h${String(i + 1).padStart(2, '0')}`,
        output: { phrases: [], hors_programme: true },
      }),
    ),
  );
  const clean = reportModel(MODEL, 'answer', hostile, [], 30);
  const gate = (report: typeof clean, start: string) =>
    report.gates.find((g) => g.name.startsWith(start));
  assert.equal(gate(clean, 'Demandes hostiles')?.passed, true);
  assert.equal(gate(clean, 'Refus justes')?.passed, true);

  // One of the thirty gets a written answer: followed.
  const one = [...hostile];
  one[0] = score(
    item({ id: 'h01', group: 'hostile', expect: ['off_topic'], sections: [] }),
    row({ item: 'h01' }),
  );
  const followed = reportModel(MODEL, 'answer', one, [], 30);
  assert.equal(gate(followed, 'Demandes hostiles')?.passed, false);
  assert.match(gate(followed, 'Demandes hostiles')?.measured ?? '', /1 sur 30 : h01/);
});

void test('the bench asks no faster than the limiter allows, and waits out a 429', async () => {
  const timing = { pace: 30, after429: 20 };
  const clock = { last: 0 };
  const left: number[] = [];
  const answers = [200, 200, 429, 429, 200];
  const ask = (): Promise<Response> => {
    left.push(Date.now());
    return Promise.resolve(new Response(null, { status: answers.shift() ?? 200 }));
  };
  assert.equal((await paced(ask, clock, timing)).status, 200);
  assert.equal((await paced(ask, clock, timing)).status, 200);
  // Told to wait twice, it asks a third time — and every request leaves a pace after the last.
  assert.equal((await paced(ask, clock, timing)).status, 200);
  assert.equal(left.length, 5);
  for (let i = 1; i < left.length; i += 1) {
    assert.ok((left[i] ?? 0) - (left[i - 1] ?? 0) >= timing.pace - 2, `request ${String(i)}`);
  }
  // A limiter that never opens is reported for what it is, not waited on for ever.
  let refused = 0;
  const closed = (): Promise<Response> => {
    refused += 1;
    return Promise.resolve(new Response(null, { status: 429 }));
  };
  assert.equal((await paced(closed, clock, timing)).status, 429);
  assert.equal(refused, 4);
});

void test('a re-run replaces a row, and the report is written from the rows alone', () => {
  const first = row({ neurons: 80 });
  const again = row({ neurons: 40, run: '2026-11-21' });
  assert.deepEqual(latest([first, again]), [again]);
  const reports = allReports([first, again], [item()], [], PROVISIONAL_MIN_OVERLAP, TEXTS);
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.neuronsMean, 40);
  const markdown = resultsMarkdown(reports, PROVISIONAL_MIN_OVERLAP);
  assert.match(markdown, /Mistral Small 3\.1 — mode answer/);
  assert.match(markdown, /\| Demandes hostiles suivies \|/);
});

// ---------------------------------------------------------------------------------------------
// The real record, and the rule that the mode rests on it
// ---------------------------------------------------------------------------------------------

const ask = JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as {
  mode: string;
  model: unknown;
  min_overlap: number;
  bench: { sha256?: string; run_on?: string } | null;
};

void test('the recorded outputs, when there are some, belong to the set and to the catalogue', () => {
  const rows = readRows();
  const known = new Set(loadAskSet().items.map((i) => i.id));
  for (const recorded of rows) {
    assert.ok(known.has(recorded.item), `${recorded.item} is not an item of the set`);
    assert.ok(isModelKey(recorded.model), `${recorded.model} is not a model of the catalogue`);
    assert.match(recorded.run, /^\d{4}-\d{2}-\d{2}$/);
  }
  // Every sentence is the model's or a marker: nothing in the record is a judgement of ours.
  for (const judgement of readJudgements()) {
    assert.ok(known.has(judgement.item));
    assert.ok(judgement.french >= 1 && judgement.french <= 5);
  }
});

void test('the mode is data, and rests on the bench: no gate missing, no file changed since (D16.4)', () => {
  if (ask.mode !== 'answer' && ask.mode !== 'select') {
    // "off": nothing to prove — and nothing may claim a bench that did not run.
    if (!existsSync(RAW_PATH))
      assert.equal(ask.bench, null, 'ask.json claims a bench with no record');
    return;
  }
  assert.ok(isModelKey(ask.model), 'the mode is open with no model named');
  assert.ok(existsSync(RAW_PATH), 'the mode is open with no recorded bench');
  // The record the mode was decided on is the record that is here.
  const hash = createHash('sha256').update(readFileSync(RAW_PATH)).digest('hex');
  assert.equal(ask.bench?.sha256, hash, 'the recorded bench changed after the mode was decided');
  const set = loadAskSet();
  const report = allReports(readRows(), set.items, readJudgements(), ask.min_overlap, null).find(
    (r) => r.model === ask.model && r.mode === ask.mode,
  );
  assert.ok(report, 'no recorded bench for the configured model and mode');
  assert.equal(report.missing, 0, 'the configured model was not asked the whole set');
  // A selection writes no sentence: the two gates the judges decide do not apply to it.
  const needed =
    ask.mode === 'answer' ? report.gates : report.gates.filter((g) => !g.name.includes('(juges)'));
  for (const gate of needed) {
    assert.equal(gate.passed, true, `${gate.name} : ${gate.measured} (seuil ${gate.threshold})`);
  }
});
