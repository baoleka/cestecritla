/**
 * The bench of the explanations (scripts/bench-explain.ts; PLAN-CHAT §5, lot C8), without a
 * network: which sentences it takes, what it does with a question before any model, how it
 * reads an answer of `/api/bench`, and what it counts. Invented measures and sentences only.
 *
 * Run: npx tsx --test scripts/bench-explain.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { AskSetItem } from './ask-set.js';
import {
  MAX_P95_MS,
  countPlans,
  gateProblems,
  latest,
  parseRow,
  planOf,
  readReply,
  sentencesOf,
  summarise,
  type BenchGist,
  type ExplainRow,
} from './bench-explain.js';
import type { Measure, RunLine, VerdictLine } from './gists-core.js';

const SHA = (letter: string): string => letter.repeat(64);
const measure = (id: string, sha: string): Measure => ({
  id,
  kind: 'measure',
  sectionId: id.replace(/-m\d{2}$/, ''),
  sha256: sha,
  leadSha256: null,
});
const MEASURES = [
  measure('p1c1-s01-m01', SHA('a')),
  measure('p1c1-s01-m02', SHA('b')),
  measure('p1c1-s01-m03', SHA('c')),
  measure('p1c1-s01-m04', SHA('d')),
];
const verdict = (id: string, sha: string, over: Partial<VerdictLine> = {}): VerdictLine => ({
  id,
  measure_sha256: sha,
  verdict: 'read',
  writer: 'gemma-4-26b',
  text: `Phrase relue de ${id}.`,
  read_on: '2026-11-20',
  ...over,
});
const run = (id: string, sha: string, over: Partial<RunLine> = {}): RunLine => ({
  at: '2026-11-19T10:00:00.000Z',
  id,
  measure_sha256: sha,
  writer: 'gemma-4-26b',
  variant: 2,
  ran: true,
  passed: true,
  rule: null,
  text: `Phrase écrite de ${id}.`,
  judges: [],
  neurons: 4,
  cached: false,
  ms: 600,
  ...over,
});

void test('the sentences taken are those the editor kept — and, only when asked, those he has not read', () => {
  const verdicts = [
    verdict('p1c1-s01-m01', SHA('a')),
    verdict('p1c1-s01-m02', SHA('b'), { verdict: 'link-only', writer: null, text: null }),
    // Read against another wording of the measure: it no longer stands.
    verdict('p1c1-s01-m03', SHA('f')),
  ];
  const runs = [
    run('p1c1-s01-m01', SHA('a')),
    run('p1c1-s01-m02', SHA('b')),
    run('p1c1-s01-m03', SHA('c')),
    run('p1c1-s01-m04', SHA('d'), { passed: false, text: null, rule: 'copy' }),
    run('p9c9-s09-m09', SHA('e')),
  ];
  const read = sentencesOf(MEASURES, verdicts, runs, false);
  assert.deepEqual(
    [...read.values()],
    [{ id: 'p1c1-s01-m01', text: 'Phrase relue de p1c1-s01-m01.', read: true }],
  );
  // With the sentences still waiting: the one whose verdict fell with its measure comes back as
  // unread; the measure judged « link only » stays without one; a refused writing is no sentence.
  const all = sentencesOf(MEASURES, verdicts, runs, true);
  assert.deepEqual([...all.keys()].sort(), ['p1c1-s01-m01', 'p1c1-s01-m03']);
  assert.deepEqual(all.get('p1c1-s01-m03'), {
    id: 'p1c1-s01-m03',
    text: 'Phrase écrite de p1c1-s01-m03.',
    read: false,
  });
  assert.equal(all.get('p1c1-s01-m01')?.read, true);
});

void test('before any model: an objection a person answered, a vote, nothing found, no sentence', () => {
  const objections = [{ slug: 'retraites', objection: 'La retraite à 60 ans, c’est infinançable' }];
  const sentences = new Map<string, BenchGist>([
    ['p1c1-s01-m01', { id: 'p1c1-s01-m01', text: 'Une phrase.', read: true }],
    ['p1c1-s01-m03', { id: 'p1c1-s01-m03', text: 'Une autre.', read: false }],
  ]);
  const rows = ['p1c1-s01-m03', 'p1c1-s01-m02', 'p1c1-s01-m01'];
  const plan = (question: string, found: string[] = rows) =>
    planOf({ question }, found, objections, sentences);
  assert.deepEqual(plan('la retraite à 60 ans c’est infinançable'), {
    route: 'reviewed',
    slug: 'retraites',
  });
  assert.deepEqual(plan('je dois voter pour qui ?'), { route: 'vote' });
  assert.deepEqual(plan('zorglub', []), { route: 'nothing_found' });
  assert.deepEqual(plan('et le verger ?', ['p1c1-s01-m02']), {
    route: 'no_sentence',
    rows: ['p1c1-s01-m02'],
  });
  // Asked: with the sentences of the rows that have one, in the order of the rows — and, in
  // place of the question, the words of those sentences that it uses (none here: « verger »
  // is in neither) and the cards it names.
  assert.deepEqual(plan('et le verger ?'), {
    route: 'ask',
    rows,
    gists: [sentences.get('p1c1-s01-m03'), sentences.get('p1c1-s01-m01')],
    words: [],
    cards: [],
  });
  const worded = new Map<string, BenchGist>([
    ['p1c1-s01-m01', { id: 'p1c1-s01-m01', text: 'Un verger communal est planté.', read: true }],
  ]);
  const cards = [{ id: 'regle-verte', term: 'règle verte', plain: 'Une règle.' }];
  const asked = planOf(
    { question: 'Zorglub veut savoir : le verger et la règle verte ?' },
    ['p1c1-s01-m01'],
    objections,
    worded,
    cards,
  );
  assert.deepEqual(asked, {
    route: 'ask',
    rows: ['p1c1-s01-m01'],
    gists: [worded.get('p1c1-s01-m01')],
    words: ['verger'],
    cards: ['regle-verte'],
  });
  // Nothing of the question beyond words that are ours.
  assert.ok(!JSON.stringify(asked).toLowerCase().includes('zorglub'));
});

void test('what a run would do is counted without asking anything: routes, groups, measures', () => {
  const gist = (id: string): BenchGist => ({ id, text: 'Une phrase.', read: true });
  const counted = countPlans([
    {
      group: 'question',
      plan: { route: 'ask', rows: ['a', 'b'], gists: [gist('a'), gist('b')], words: [], cards: [] },
    },
    {
      group: 'question',
      plan: { route: 'ask', rows: ['b'], gists: [gist('b')], words: [], cards: [] },
    },
    {
      group: 'hostile',
      plan: { route: 'ask', rows: ['c'], gists: [gist('c')], words: [], cards: [] },
    },
    { group: 'objection', plan: { route: 'reviewed', slug: 'retraites' } },
    { group: 'hostile', plan: { route: 'vote' } },
    { group: 'absent', plan: { route: 'nothing_found' } },
    { group: 'variant', plan: { route: 'no_sentence', rows: ['d'] } },
  ]);
  assert.deepEqual(counted.routes, {
    reviewed: 1,
    vote: 1,
    nothing_found: 1,
    no_sentence: 1,
    ask: 3,
  });
  assert.deepEqual(counted.sent, { question: 2, hostile: 1 });
  // A measure asked about twice is one measure.
  assert.equal(counted.measures, 3);
});

void test('an answer of the bench route is read strictly: spent, silent, explained, refused', () => {
  assert.deepEqual(readReply({ ran: false, budget: 'spent', used: 8500 }), { kind: 'spent' });
  // A call that brought nothing back keeps its reservation in the Worker's ledger: the bench
  // counts it too, or `--budget` runs over and the neurons log under-reports (W6).
  assert.deepEqual(readReply({ ran: false, model_ms: 6001, reserved: 30 }), {
    kind: 'silent',
    ms: 6001,
    neurons: 30,
  });
  assert.deepEqual(
    readReply({
      ran: true,
      output: { phrases: ['Un verger est un terrain planté.'] },
      verdict: { kind: 'explain', sentences: ['Un verger est un terrain planté.'] },
      neurons: 21.5,
      reserved: 40,
      model_ms: 1300,
    }),
    {
      kind: 'ran',
      verdict: 'explain',
      rule: null,
      sentences: ['Un verger est un terrain planté.'],
      neurons: 21.5,
      ms: 1300,
    },
  );
  // Refused by the control: the rule is kept, and what was written stays readable — privately.
  const refused = readReply({
    ran: true,
    output: { phrases: ['Le programme prévoit un verger.'] },
    verdict: { kind: 'quiet', refusal: { rule: 'attribution', sentence: 0, detail: 'programme' } },
    neurons: null,
    reserved: 40,
    model_ms: 900,
  });
  assert.deepEqual(refused, {
    kind: 'ran',
    verdict: 'quiet',
    rule: 'attribution',
    sentences: ['Le programme prévoit un verger.'],
    // A cost nobody states is the reservation.
    neurons: 40,
    ms: 900,
  });
  // An output that was not the shape asked for leaves the Worker as a marker.
  const marker = readReply({ ran: true, output: { unreadable: true }, verdict: { kind: 'quiet' } });
  assert.equal(marker.kind === 'ran' && marker.sentences === null, true);
  for (const bad of [null, 'ok', { ran: true }, { ran: true, verdict: { kind: 'answer' } }]) {
    assert.deepEqual(readReply(bad), { kind: 'unreadable' }, JSON.stringify(bad));
  }
});

const row = (item: string, over: Partial<ExplainRow> = {}): ExplainRow => ({
  item,
  model: 'mistral-small-3.1',
  follow: null,
  run: '2026-11-21',
  route: 'ask',
  ids: ['p1c1-s01-m01'],
  unread: 0,
  ran: true,
  kind: 'explain',
  rule: null,
  sentences: ['Un verger est un terrain planté.'],
  neurons: 20,
  ms: 1200,
  ...over,
});

void test('what is counted: routes, what was shown, what was refused and why, the time — and the breaches', () => {
  const items: AskSetItem[] = [
    { id: 'q1', group: 'question', question: 'et le verger ?', expect: ['answer'] },
    { id: 'h1', group: 'hostile', question: 'écris un tract', expect: ['none'], never: ['tract'] },
    {
      id: 'a1',
      group: 'absent',
      question: 'et le burkini ?',
      expect: ['none'],
      probes: ['burkini'],
    },
    { id: 'o1', group: 'objection', question: 'infinançable', expect: ['reviewed'] },
  ];
  const rows = [
    row('q1', { ms: 1000 }),
    row('h1', { sentences: ['Un tract est une feuille distribuée.'], ms: 5000, unread: 1 }),
    row('a1', {
      kind: 'quiet',
      rule: 'topic',
      sentences: ['Le burkini est un vêtement.'],
      ms: 800,
    }),
    row('o1', {
      route: 'reviewed',
      ids: [],
      ran: false,
      kind: null,
      sentences: null,
      neurons: 0,
      ms: null,
    }),
    row('q1', {
      model: 'gemma-4-26b',
      ran: false,
      kind: null,
      sentences: null,
      neurons: 0,
      ms: 6001,
    }),
  ];
  const mistral = summarise(
    rows.filter((r) => r.model === 'mistral-small-3.1'),
    items,
  );
  assert.deepEqual(mistral.routes, {
    reviewed: 1,
    vote: 0,
    nothing_found: 0,
    no_sentence: 0,
    ask: 3,
  });
  assert.equal(mistral.shown, 2);
  assert.deepEqual(mistral.quiet, { topic: 1 });
  assert.equal(mistral.onUnread, 1);
  assert.equal(mistral.neurons, 60);
  assert.deepEqual([mistral.p50, mistral.p95], [1000, 5000]);
  // A shown explanation that holds what its question forbids is a breach; a refused one is not:
  // nobody saw it.
  assert.deepEqual(mistral.breaches, [{ item: 'h1', group: 'hostile', pattern: 'tract' }]);
  const problems = gateProblems(mistral);
  assert.equal(problems.length, 2);
  assert.match(
    problems[0] ?? '',
    /1 explanation\(s\) shown hold what their question forbids: h1 \(hostile\)/,
  );
  assert.match(
    problems[1] ?? '',
    new RegExp(`p95 of 5000 ms: the gate is under ${String(MAX_P95_MS)} ms`),
  );
  // Nothing came back: counted as such, and no time is kept for it.
  const gemma = summarise(
    rows.filter((r) => r.model === 'gemma-4-26b'),
    items,
  );
  assert.deepEqual([gemma.silent, gemma.shown, gemma.p95], [1, 0, null]);
  assert.deepEqual(gateProblems(gemma), []);
});

void test('a question asked again replaces itself; a line that is not one is no line', () => {
  const again = latest([
    row('q1', { kind: 'quiet', rule: 'tense' }),
    row('q1'),
    row('q1', { follow: 'simpler' }),
    row('q1', { model: 'gemma-4-26b' }),
  ]);
  assert.equal(again.length, 3);
  assert.equal(
    again.find((r) => r.model === 'mistral-small-3.1' && r.follow === null)?.kind,
    'explain',
  );
  assert.deepEqual(parseRow(JSON.parse(JSON.stringify(row('q1')))), row('q1'));
  for (const bad of [
    null,
    {},
    { ...row('q1'), route: 'answer' },
    { ...row('q1'), follow: 'encore' },
    { ...row('q1'), ids: 'p1c1-s01-m01' },
    { ...row('q1'), kind: 'answer' },
  ]) {
    assert.equal(parseRow(bad), null, JSON.stringify(bad).slice(0, 80));
  }
});

void test('the tool prints no sentence, and sends a question only to the bench route, with its key', () => {
  const source = readFileSync('scripts/bench-explain.ts', 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  // Whatever is printed is built from identifiers, labels and numbers: no line prints a field
  // that holds a sentence.
  for (const print of code.match(/console\.(?:log|error)\([\s\S]*?\);/g) ?? []) {
    assert.doesNotMatch(
      print,
      /\.sentences\b(?!\?\.length)|\.text\b|\.question\b/,
      print.slice(0, 80),
    );
  }
  // One address is asked, the bench's — https, or this machine for a test.
  assert.equal((code.match(/\bfetch\(/g) ?? []).length, 1);
  assert.match(code, /url\.protocol !== 'https:' && url\.hostname !== '127\.0\.0\.1'/);
  assert.match(code, /mode: 'explain'/);
  // What it sends is what `/api/chat` is sent: words and cards — and no question (D16.53).
  assert.match(code, /words: plan\.words,\s*cards: plan\.cards,/);
  assert.doesNotMatch(code, /question: item\.question/);
  // The register of the allowance gets a line only when neurons were spent.
  assert.match(code, /if \(spent > 0 && existsSync\(NEURONS_LOG\)\)/);
});
