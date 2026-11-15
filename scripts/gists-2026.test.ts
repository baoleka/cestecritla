/**
 * The sentences written ahead (scripts/gists-core.ts, scripts/gists-2026.ts) and their deposit
 * in the base (scripts/seed-ask-2026.ts) — without a network, without Cloudflare, and without
 * a word of the book: the order of the work, what the two files say of a measure, the next
 * call, what a call answered, when a session stops; then the editor's desk, and what may enter
 * the base.
 *
 * The book used here is INVENTED (a library, school buses, an orchard), like the one of
 * scripts/ask-worker.test.ts: no sentence of the programme may stand in a tracked file, and
 * none is needed to test a path. The bench route is simulated with the control itself, so that
 * what the tool reads here has the shape the Worker gives it.
 *
 * Run: npx tsx --test scripts/gists-2026.test.ts
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { MAX_GIST_CHARS, MAX_GIST_IDS, parseGistsResponse } from '../src/lib/chat-contract.js';
import { benchOutput, control } from '../src/worker/ask.js';
import { loadGists, loadMeasures } from '../src/worker/measures.js';
import { MODELS, type ModelKey } from '../src/worker/models.js';
import { GIST_VARIANTS, type JudgeVerdict } from '../src/worker/prompt.js';
import { sha256 } from './aec-common.js';
import type { Manifest } from './aec26-types.js';
import { LocalD1 } from './d1-local.js';
import {
  DEFAULT_WRITERS,
  JUDGE_POOL,
  VARIANT_ORDER,
  agreement,
  deskHandle,
  deskPage,
  judgesFor,
  knowledge,
  knownOf,
  measureLabel,
  measureTexts,
  nextAction,
  parseTaken,
  readReply,
  startDesk,
  statusLines,
  statusOf,
  takeSession,
  writeSession,
  type BenchAsk,
  type DeskDeps,
  type DeskResponse,
  type WriteOptions,
} from './gists-2026.js';
import {
  EDITOR,
  SESSION,
  appendLine,
  controlGist,
  lastVerdicts,
  measuresOf,
  parseRunLine,
  parseVerdictLine,
  pinOf,
  pinned,
  readBy,
  readMinOverlap,
  readRuns,
  readVerdicts,
  readerOf,
  recheckWith,
  shownText,
  stands,
  unservable,
  validated,
  writeOrder,
  type GistRow,
  type Measure,
  type RunLine,
  type VerdictLine,
} from './gists-core.js';
import {
  ASTRAY,
  BOOK,
  BOOKMOBILES,
  BUSES,
  CORPUS,
  LENDING,
  LIBRARY,
  MANIFEST,
  MEASURES,
  ORCHARDS,
  PRIVATE,
  SAID,
  TITLES,
  TREES,
  corpusOf,
  linkOnly,
  manifestOf,
  measure,
  refusedRun,
  run,
  said,
  verdict,
} from './gists-fixture.js';
import { buildLeakIndex } from './leak-scan.js';
import {
  SCHEMA_PATH,
  baseProblems,
  gistProblems,
  gistsBaseProblems,
  gistsFingerprint,
  gistsSql,
  seedSql,
  shownTexts,
  switchSql,
  textWithdrawalSql,
} from './seed-ask-2026.js';

// ---------------------------------------------------------------------------------------------
// The invented book of scripts/gists-fixture.ts: two sections, six measures, one a sub-measure
// ---------------------------------------------------------------------------------------------

const SCHEMA = readFileSync(SCHEMA_PATH, 'utf8');
const ORDER = writeOrder(MEASURES);
const TEXTS = shownTexts(PRIVATE);

/** Every way of every default writer, refused: a measure nobody could write. */
const exhausted = (id: string): RunLine[] =>
  DEFAULT_WRITERS.flatMap((writer) =>
    VARIANT_ORDER.map((variant) => refusedRun(id, variant, writer)),
  );

/** True when a text holds three words in a row of an invented measure, or one of our sentences. */
function holdsBook(output: string): string | null {
  const folded = output.toLowerCase();
  for (const { id, text } of BOOK) {
    const words = text.toLowerCase().split(' ');
    for (let i = 0; i + 3 <= words.length; i += 1) {
      if (folded.includes(words.slice(i, i + 3).join(' '))) return id;
    }
  }
  for (const [id, sentence] of Object.entries(SAID)) {
    if (folded.includes(sentence.toLowerCase().slice(0, 30))) return `the sentence of ${id}`;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// The order of the work, the pins, the two files
// ---------------------------------------------------------------------------------------------

void test('the order of the work: key measures first, then the book in its order — never the prose', () => {
  assert.deepEqual(
    MEASURES.map((m) => m.id),
    [LIBRARY, BUSES, LENDING, BOOKMOBILES, TREES, ORCHARDS],
  );
  assert.deepEqual(
    ORDER.map((m) => m.id),
    [LIBRARY, TREES, BUSES, LENDING, BOOKMOBILES, ORCHARDS],
  );

  // The book itself, from the public manifest: its 1,069 measures and not one paragraph.
  const published = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as Manifest;
  const all = measuresOf(published);
  assert.equal(all.length, published.meta.official_count);
  assert.equal(new Set(all.map((m) => m.id)).size, all.length);
  assert.ok(all.every((m) => /-[km]\d{2}(?:\.s\d+)?$/.test(m.id)));
  const order = writeOrder(all);
  const keys = published.meta.counts.key_measures;
  assert.ok(order.slice(0, keys).every((m) => m.kind === 'key_measure'));
  assert.ok(order.slice(keys).every((m) => m.kind !== 'key_measure'));
  // Each group keeps the order of the book.
  const rank = new Map(all.map((m, index) => [m.id, index]));
  for (const group of [order.slice(0, keys), order.slice(keys)]) {
    const ranks = group.map((m) => rank.get(m.id) ?? -1);
    assert.deepEqual(
      ranks,
      [...ranks].sort((a, b) => a - b),
    );
  }
  // A sub-measure is pinned to the measure above it; nothing else is.
  for (const m of all) assert.equal(m.leadSha256 !== null, m.kind === 'sub_measure', m.id);
});

void test('a line is pinned to its measure — and a sub-measure to the measure it details too', () => {
  assert.deepEqual(pinOf(measure(LIBRARY)), { measure_sha256: sha256(BOOK[0]?.text ?? '') });
  assert.deepEqual(pinOf(measure(BOOKMOBILES)), {
    measure_sha256: sha256('des bibliobus pour les villages'),
    lead_sha256: sha256('Créer un service public du prêt de livres :'),
  });
  assert.ok(pinned(run(LIBRARY), measure(LIBRARY)));
  assert.ok(pinned(verdict(BOOKMOBILES), measure(BOOKMOBILES)));

  // The book is published again with one measure reworded: what was written against the old
  // wording no longer stands — for it, and for the sub-measure read under it.
  const moved = measuresOf(
    manifestOf(
      BOOK.map((m) =>
        m.id === LENDING ? { ...m, text: 'Créer un service public du prêt de disques :' } : m,
      ),
    ),
  );
  const now = (id: string): Measure => moved.find((m) => m.id === id) ?? measure(id);
  assert.equal(pinned(run(LENDING), now(LENDING)), false);
  assert.equal(pinned(verdict(BOOKMOBILES), now(BOOKMOBILES)), false);
  // …and for nothing else.
  assert.ok(pinned(run(BUSES), now(BUSES)));
  assert.ok(pinned(verdict(LIBRARY), now(LIBRARY)));
});

void test('the two files: read in the order written, stopped by a line that does not read', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cel-gists-'));
  try {
    // The directory is made the first time something is kept.
    const runs = join(dir, 'private', 'gists', 'runs.jsonl');
    const verdicts = join(dir, 'private', 'gists', 'verdicts.jsonl');
    assert.deepEqual(readRuns(runs), []);
    assert.deepEqual(readVerdicts(verdicts), []);
    const lines = [
      run(LIBRARY),
      refusedRun(BUSES, 2),
      run(BOOKMOBILES, { ran: false, passed: false, text: null, judges: [] }),
    ];
    for (const line of lines) appendLine(runs, line);
    assert.deepEqual(readRuns(runs), lines);
    const ruled = [
      verdict(LIBRARY),
      linkOnly(BUSES),
      verdict(BOOKMOBILES, { writer: 'editor', from: 'gemma-4-26b' }),
    ];
    for (const line of ruled) appendLine(verdicts, line);
    assert.deepEqual(readVerdicts(verdicts), ruled);

    // A write still under way is not a line yet; a broken line in the middle is an alarm —
    // which names the line, and quotes nothing of it.
    writeFileSync(runs, `${JSON.stringify(run(LIBRARY))}\n{"id":"${BUSES}","text":"${said(BUSES)}`);
    assert.deepEqual(readRuns(runs), [run(LIBRARY)]);
    writeFileSync(
      runs,
      `{"id":"${BUSES}","text":"${said(BUSES)}\n${JSON.stringify(run(LIBRARY))}\n`,
    );
    assert.throws(
      () => readRuns(runs),
      (error: Error) =>
        /line 1 is not JSON$/.test(error.message) && holdsBook(error.message) === null,
    );
    writeFileSync(verdicts, `${JSON.stringify({ id: LIBRARY, verdict: 'maybe' })}\n`);
    assert.throws(() => readVerdicts(verdicts), /line 1 is not a line of this file$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // What a line must be to be one.
  const good = verdict(LIBRARY);
  assert.deepEqual(parseVerdictLine(JSON.parse(JSON.stringify(good))), good);
  assert.deepEqual(
    parseVerdictLine(JSON.parse(JSON.stringify(linkOnly(LIBRARY)))),
    linkOnly(LIBRARY),
  );
  for (const odd of [
    null,
    [],
    { ...good, verdict: 'faithful' },
    { ...good, text: '' },
    { ...good, text: null },
    { ...good, writer: null },
    { ...good, read_on: '16/11/2026' },
    { ...good, measure_sha256: 'abc' },
    { ...good, lead_sha256: 'abc' },
    { ...linkOnly(LIBRARY), text: said(LIBRARY) },
    // Every field but the sentence is an identifier or a name — the tools print them, so a
    // line where one of them could hold words is not a line.
    { ...good, id: said(LIBRARY) },
    { ...good, id: 'p1c1-s01-p01' },
    { ...good, writer: said(LIBRARY) },
    { ...good, writer: 'Gemma 4' },
    { ...good, from: 'un modèle' },
  ]) {
    assert.equal(parseVerdictLine(odd), null, JSON.stringify(odd).slice(0, 60));
  }
  const line = run(LIBRARY);
  assert.deepEqual(parseRunLine(JSON.parse(JSON.stringify(line))), line);
  for (const odd of [
    { ...line, text: null },
    { ...line, variant: '2' },
    { ...line, neurons: null },
    { ...line, judges: [{ model: 'llama-3.3-70b', verdict: 'oui', answered: true }] },
    { ...line, judges: [{ model: 'llama-3.3-70b', verdict: 'fidele' }] },
    { ...line, measure_sha256: undefined },
    { ...line, id: 'la bibliothèque' },
    { ...line, writer: said(LIBRARY) },
    { ...line, passed: false, text: null, rule: said(LIBRARY) },
    { ...line, judges: [{ model: said(LIBRARY), verdict: 'fidele', answered: true }] },
  ]) {
    assert.equal(parseRunLine(odd), null, JSON.stringify(odd).slice(0, 60));
  }
  // The threshold of the control is the site's own, read from its file.
  assert.equal(readMinOverlap(), 0.5);
});

void test('verdicts: the file only grows, and the last line for a measure wins', () => {
  const first = verdict(LIBRARY);
  const second = linkOnly(LIBRARY);
  const third = verdict(LIBRARY, {
    writer: 'editor',
    text: 'Chaque commune ouvre une bibliothèque de quartier tous les jours de la semaine.',
  });
  assert.equal(lastVerdicts([first]).get(LIBRARY), first);
  assert.equal(lastVerdicts([first, second]).get(LIBRARY), second);
  assert.equal(lastVerdicts([first, second, third, verdict(TREES)]).get(LIBRARY), third);
  assert.equal(lastVerdicts([second, first]).get(LIBRARY), first);

  // What the verdicts let into the base: the sentences read and kept, in the order of the
  // book, each with the pin of its verdict — and the rest counted, not lost.
  const elsewhere = { ...verdict(LIBRARY), id: 'p9c9-s09-m09' };
  const set = validated(
    MEASURES,
    lastVerdicts([
      verdict(TREES),
      verdict(BOOKMOBILES),
      linkOnly(BUSES),
      verdict(LIBRARY),
      verdict(ORCHARDS, { measure_sha256: sha256('another wording') }),
      elsewhere,
    ]),
  );
  assert.deepEqual(
    set.rows.map((row) => row.id),
    [LIBRARY, BOOKMOBILES, TREES],
  );
  assert.deepEqual(set.rows[1], {
    id: BOOKMOBILES,
    text: said(BOOKMOBILES),
    read_on: '2026-11-16',
    ...pinOf(measure(BOOKMOBILES)),
  });
  assert.deepEqual([set.linkOnly, set.waiting], [1, 1]);
  assert.deepEqual([set.stale, set.refused], [[ORCHARDS], []]);
  assert.deepEqual(set.orphans, ['p9c9-s09-m09']);

  // Where the book is, a sentence the control refuses today leaves its measure out — and only
  // it: what still stands goes to the base while that one is read again.
  const kept = lastVerdicts([
    verdict(LIBRARY, {
      text: 'Le programme prévoit 500 bibliothèques de quartier dans les communes.',
    }),
    verdict(TREES),
    linkOnly(BUSES),
  ]);
  assert.deepEqual(
    validated(MEASURES, kept).rows.map((row) => row.id),
    [LIBRARY, TREES],
  );
  const today = validated(MEASURES, kept, recheckWith(TEXTS, 0.5));
  assert.deepEqual(
    today.rows.map((row) => row.id),
    [TREES],
  );
  assert.deepEqual(
    [today.refused, today.stale, today.linkOnly, today.waiting],
    [[LIBRARY], [], 1, 3],
  );
});

// ---------------------------------------------------------------------------------------------
// What is known of a measure, and the next call
// ---------------------------------------------------------------------------------------------

void test('what is known of a measure: the last sentence of each writer, its labels, the ways tried', () => {
  const nothing = knownOf(measure(LIBRARY), [], undefined);
  assert.deepEqual([nothing.sentences, nothing.verdict, nothing.previous], [[], null, null]);

  const runs = [
    refusedRun(LIBRARY, 2),
    // A call the model did not answer is not an answer.
    run(LIBRARY, { variant: 0, ran: false, passed: false, text: null, judges: [] }),
    run(LIBRARY, {
      variant: 0,
      judges: [
        { model: 'mistral-small-3.1', verdict: 'ajout', answered: true },
        { model: 'llama-3.3-70b', verdict: null, answered: false },
      ],
    }),
    // Asked again the same way for the label that did not come: the labels add up.
    run(LIBRARY, {
      variant: 0,
      cached: true,
      judges: [
        { model: 'mistral-small-3.1', verdict: 'ajout', answered: true },
        { model: 'llama-3.3-70b', verdict: 'fidele', answered: true },
      ],
    }),
    // Lines of other measures, and a line written against another wording, do not count.
    run(TREES),
    run(LIBRARY, { writer: 'mistral-small-3.1', measure_sha256: sha256('another wording') }),
  ];
  const known = knownOf(measure(LIBRARY), runs, verdict(LIBRARY));
  assert.equal(known.sentences.length, 1);
  const [sentence] = known.sentences;
  assert.deepEqual(
    [sentence?.writer, sentence?.variant, sentence?.text],
    ['gemma-4-26b', 0, said(LIBRARY)],
  );
  assert.deepEqual(
    [...(sentence?.labels ?? [])],
    [
      ['mistral-small-3.1', 'ajout'],
      ['llama-3.3-70b', 'fidele'],
    ],
  );
  assert.deepEqual([...(known.answered.get('gemma-4-26b') ?? [])], [2, 0]);
  assert.equal(known.answered.has('mistral-small-3.1'), false);
  assert.equal(known.verdict?.verdict, 'read');

  // A sentence written again differently replaces the first, and starts its labels afresh.
  const again = knownOf(
    measure(LIBRARY),
    [
      run(LIBRARY),
      run(LIBRARY, {
        text: 'Chaque commune ouvre une bibliothèque de quartier tous les jours de la semaine.',
        judges: [],
      }),
    ],
    undefined,
  );
  assert.equal(again.sentences.length, 1);
  assert.equal(again.sentences[0]?.labels.size, 0);
  // A judge that answered something unreadable has answered: its label is « none ».
  const unread = knownOf(
    measure(LIBRARY),
    [run(LIBRARY, { judges: [{ model: 'llama-3.3-70b', verdict: null, answered: true }] })],
    undefined,
  );
  assert.deepEqual([...(unread.sentences[0]?.labels ?? [])], [['llama-3.3-70b', null]]);

  // A verdict given on another wording is no verdict: the measure is to be read again — and
  // what was ruled then is kept in sight, not lost.
  const moved = verdict(LIBRARY, { measure_sha256: sha256('x') });
  const stale = knownOf(measure(LIBRARY), [], moved);
  assert.deepEqual([stale.verdict, stale.previous], [null, moved]);
  // Where the text of the book is, the control of today is asked too: a sentence kept under
  // yesterday's control that today's refuses is not kept any more. A link alone has no
  // sentence to refuse.
  const today = recheckWith(TEXTS, 0.5);
  const kept = verdict(LIBRARY);
  const denying = verdict(LIBRARY, {
    text: 'Le programme ne prévoit pas de bibliothèque payante.',
  });
  assert.equal(today(measure(LIBRARY), said(LIBRARY)), null);
  assert.equal(today(measure(LIBRARY), denying.text ?? ''), 'negation');
  assert.equal(today({ ...measure(LIBRARY), id: 'p9c9-s09-m09' }, said(LIBRARY)), 'text');
  assert.deepEqual(
    [stands(kept, measure(LIBRARY)), stands(kept, measure(LIBRARY), today)],
    [true, true],
  );
  assert.deepEqual(
    [stands(denying, measure(LIBRARY)), stands(denying, measure(LIBRARY), today)],
    [true, false],
  );
  assert.equal(stands(linkOnly(LIBRARY), measure(LIBRARY), today), true);
  assert.equal(stands(moved, measure(LIBRARY), today), false);
  const refused = knownOf(measure(LIBRARY), [], denying, today);
  assert.deepEqual([refused.verdict, refused.previous], [null, denying]);
  assert.equal(knownOf(measure(LIBRARY), [], denying).verdict, denying);
  // The threshold the site runs with decides: stricter, and a sentence that stood falls.
  assert.equal(knownOf(measure(TREES), [], verdict(TREES), recheckWith(TEXTS, 0.95)).verdict, null);
  // All of it at once, by identifier.
  const all = knowledge(MEASURES, runs, lastVerdicts([verdict(LIBRARY)]));
  assert.equal(all.size, MEASURES.length);
  assert.equal(all.get(TREES)?.sentences.length, 1);
  assert.equal(all.get(BUSES)?.sentences.length, 0);
});

void test('the next call: the ways in the order 2, 0, 1, the second writer only when the first could not', () => {
  const next = (runs: RunLine[], asked: string[] = [], judges?: ModelKey[], line?: VerdictLine) =>
    nextAction(knownOf(measure(LIBRARY), runs, line), DEFAULT_WRITERS, judges, new Set(asked));

  // The ways the Worker knows, each once: none is forgotten, none is invented.
  assert.deepEqual(
    [...VARIANT_ORDER].sort((a, b) => a - b),
    Array.from({ length: GIST_VARIANTS }, (_, way) => way),
  );
  assert.deepEqual(VARIANT_ORDER, [2, 0, 1]);
  assert.deepEqual(DEFAULT_WRITERS, ['gemma-4-26b', 'mistral-small-3.1']);

  const gemma = ['mistral-small-3.1', 'llama-3.3-70b'];
  const mistral = ['gemma-4-26b', 'llama-3.3-70b'];
  const ask = (writer: string, variant: number, judges: string[], why = 'write') => ({
    kind: 'ask',
    writer,
    variant,
    judges,
    why,
  });
  assert.deepEqual(next([]), ask('gemma-4-26b', 2, gemma));
  assert.deepEqual(next([refusedRun(LIBRARY, 2)]), ask('gemma-4-26b', 0, gemma));
  assert.deepEqual(
    next([refusedRun(LIBRARY, 2), refusedRun(LIBRARY, 0)]),
    ask('gemma-4-26b', 1, gemma),
  );
  // Gemma was asked every way and none passed: Mistral, and Gemma among its judges.
  const three = VARIANT_ORDER.map((variant) => refusedRun(LIBRARY, variant));
  assert.deepEqual(next(three), ask('mistral-small-3.1', 2, mistral));
  assert.deepEqual(
    next([...three, refusedRun(LIBRARY, 2, 'mistral-small-3.1')]),
    ask('mistral-small-3.1', 0, mistral),
  );
  // Both were asked every way: nothing is left to ask — the editor writes one, or the link alone.
  assert.deepEqual(next(exhausted(LIBRARY)), { kind: 'none', why: 'unwritten' });

  // A sentence and every label: nothing — and the second writer is not asked for one more.
  assert.deepEqual(next([run(LIBRARY)]), { kind: 'none', why: 'written' });
  // A label that did not come: the same writer, the same way — the cache gives the sentence back.
  const half = run(LIBRARY, {
    variant: 0,
    judges: [
      { model: 'mistral-small-3.1', verdict: 'fidele', answered: true },
      { model: 'llama-3.3-70b', verdict: null, answered: false },
    ],
  });
  assert.deepEqual(next([refusedRun(LIBRARY, 2), half]), ask('gemma-4-26b', 0, gemma, 'labels'));
  // …once in a session, not until it comes.
  assert.deepEqual(next([refusedRun(LIBRARY, 2), half], ['gemma-4-26b|0']), {
    kind: 'none',
    why: 'later',
  });
  // A judge that answered without a label we know is not asked again.
  const unread = run(LIBRARY, {
    judges: [
      { model: 'mistral-small-3.1', verdict: 'fidele', answered: true },
      { model: 'llama-3.3-70b', verdict: null, answered: true },
    ],
  });
  assert.deepEqual(next([unread]), { kind: 'none', why: 'written' });
  // A call made a moment ago that got no answer is not made twice, and the next way does not
  // jump the queue: the measure waits for the next session.
  const silent = run(LIBRARY, { ran: false, passed: false, text: null, judges: [] });
  assert.deepEqual(next([silent]), ask('gemma-4-26b', 2, gemma));
  assert.deepEqual(next([silent], ['gemma-4-26b|2']), { kind: 'none', why: 'later' });
  // The editor ruled: nothing is asked, whatever is missing.
  assert.deepEqual(next([], [], undefined, linkOnly(LIBRARY)), { kind: 'none', why: 'verdict' });
  assert.deepEqual(next([half], [], undefined, verdict(LIBRARY)), { kind: 'none', why: 'verdict' });

  // The judges are those listed, less the writer — never its own reader — three at most.
  assert.deepEqual(JUDGE_POOL, ['gemma-4-26b', 'mistral-small-3.1', 'llama-3.3-70b']);
  assert.deepEqual(judgesFor('gemma-4-26b'), gemma);
  assert.deepEqual(judgesFor('mistral-small-3.1'), mistral);
  assert.deepEqual(judgesFor('gemma-4-26b', ['gemma-4-26b']), []);
  assert.deepEqual(judgesFor('gemma-4-26b', ['llama-3.3-70b', 'gemma-4-26b', 'llama-3.3-70b']), [
    'llama-3.3-70b',
  ]);
  const every = Object.keys(MODELS) as ModelKey[];
  assert.ok(every.length >= 4);
  assert.equal(judgesFor('editor', every).length, 3);
  assert.deepEqual(next([], [], ['llama-3.3-70b']), ask('gemma-4-26b', 2, ['llama-3.3-70b']));
  // Another judge is listed: the sentence lacks its label, and is asked again for it.
  assert.deepEqual(
    next([run(LIBRARY)], [], ['gpt-oss-120b']),
    ask('gemma-4-26b', 2, ['gpt-oss-120b'], 'labels'),
  );
});

// ---------------------------------------------------------------------------------------------
// The bench route, simulated with the control itself
// ---------------------------------------------------------------------------------------------

interface Script {
  /** What a writer says of a measure, asked one way. Null: the model does not answer. */
  says?: (id: string, writer: ModelKey, variant: number) => string | null;
  /** The label a judge gives; `silent` when it does not answer. */
  judge?: (judge: ModelKey, id: string) => JudgeVerdict | null | 'silent';
  /** True when the gateway serves the writer's answer from its cache. */
  cached?: (id: string) => boolean;
  corpus?: string;
}

/** The route as src/worker/index.ts answers it, for the invented book. */
function bench(script: Script = {}): {
  ask: WriteOptions['ask'];
  calls: BenchAsk[];
} {
  const calls: BenchAsk[] = [];
  const ask: WriteOptions['ask'] = (request) => {
    calls.push(request);
    const [id] = request.ids;
    const held = BOOK.find((candidate) => candidate.id === id);
    const base = {
      corpus: script.corpus ?? CORPUS,
      ids: held === undefined ? [] : [id],
      load_ms: 3,
    };
    if (held === undefined) return Promise.resolve({ status: 200, body: { ...base, ran: false } });
    const sentence = (script.says ?? ((): string => said(id)))(id, request.model, request.variant);
    if (sentence === null) {
      return Promise.resolve({
        status: 200,
        body: { ...base, ran: false, model_ms: 6000, reserved: 7.25 },
      });
    }
    const candidate = { id, text: TEXTS.get(id) ?? '' };
    const output = { phrases: [{ texte: sentence, ids: [id] }] };
    const verdictOf = control('answer', output, [candidate], request.min_overlap);
    const passed = verdictOf.kind === 'answer' && verdictOf.sentences.length === 1;
    const judges = !passed
      ? []
      : request.judges.map((judge) => {
          const label = (script.judge ?? ((): JudgeVerdict => 'fidele'))(judge, id);
          return label === 'silent'
            ? { model: judge, verdict: null, neurons: null, cached: false, ms: 90 }
            : { model: judge, verdict: label, neurons: 1.5, cached: false, ms: 300 };
        });
    return Promise.resolve({
      status: 200,
      body: {
        ...base,
        ran: true,
        output: benchOutput(output, [candidate]),
        verdict: verdictOf,
        judges,
        neurons: 4.5,
        reserved: 6,
        cached: script.cached?.(id) ?? false,
        model_ms: 1200,
        used: 0,
      },
    });
  };
  return { ask, calls };
}

interface Session {
  options: WriteOptions;
  calls: BenchAsk[];
  recorded: RunLine[];
  printed: string[];
}

function session(script: Script = {}, overrides: Partial<WriteOptions> = {}): Session {
  const { ask, calls } = bench(script);
  const recorded: RunLine[] = [];
  const printed: string[] = [];
  const options: WriteOptions = {
    measures: ORDER,
    corpus: CORPUS,
    runs: [],
    verdicts: new Map(),
    writers: DEFAULT_WRITERS,
    budget: 1000,
    minOverlap: 0.5,
    ask,
    record: (line) => {
      recorded.push(line);
    },
    print: (line) => {
      printed.push(line);
    },
    now: () => new Date('2026-11-15T08:00:00.000Z'),
    ...overrides,
  };
  return { options, calls, recorded, printed };
}

const asked = (calls: readonly BenchAsk[]): string[] =>
  calls.map((call) => `${call.ids[0]} ${call.model} ${String(call.variant)}`);

/** Gemma writes most of the book; one measure needs its second way, one Mistral, one nobody. */
const STORY: Script = {
  says: (id, writer, variant) => {
    if (id === TREES) return variant === 0 ? said(id) : ASTRAY;
    if (id === BUSES) return writer === 'mistral-small-3.1' ? said(id) : ASTRAY;
    if (id === BOOKMOBILES) return ASTRAY;
    return said(id);
  },
  judge: (judge, id) => (id === TREES && judge === 'mistral-small-3.1' ? 'ajout' : 'fidele'),
};

void test('what a call answered is read strictly: one sentence about that measure, or the rule that refused', () => {
  const base = { corpus: CORPUS, ids: [LIBRARY], load_ms: 3 };
  const ran = {
    ...base,
    ran: true,
    verdict: { kind: 'answer', sentences: [{ text: said(LIBRARY), ids: [LIBRARY] }] },
    judges: [
      { model: 'mistral-small-3.1', verdict: 'fidele', neurons: 1.5, cached: false, ms: 300 },
      { model: 'llama-3.3-70b', verdict: 'ecart', neurons: 9, cached: true, ms: 40 },
    ],
    neurons: 4.5,
    reserved: 6,
    cached: false,
    model_ms: 1200,
  };
  assert.deepEqual(readReply(200, ran, LIBRARY), {
    kind: 'ran',
    corpus: CORPUS,
    passed: true,
    rule: null,
    text: said(LIBRARY),
    judges: [
      { model: 'mistral-small-3.1', verdict: 'fidele', answered: true },
      { model: 'llama-3.3-70b', verdict: 'ecart', answered: true },
    ],
    // The writer and the judge that was billed: what the cache served costs nothing.
    neurons: 6,
    cached: false,
    ms: 1200,
  });
  const read = (body: unknown, status = 200) => readReply(status, body, LIBRARY);
  const cost = (body: unknown): number => {
    const reply = read(body);
    assert.ok(reply.kind === 'ran' || reply.kind === 'silent');
    return reply.neurons;
  };
  assert.equal(cost({ ...ran, cached: true }), 1.5);
  // An unknown cost is counted in full: what the Worker had reserved.
  assert.equal(cost({ ...ran, neurons: null }), 7.5);
  assert.equal(cost({ ...ran, neurons: Number.NaN, judges: [] }), 6);

  // A judge that did not answer, one that answered nothing we know, one that is not ours.
  const judged = read({
    ...ran,
    judges: [
      { model: 'mistral-small-3.1', verdict: null, neurons: null, cached: false, ms: 80 },
      { model: 'llama-3.3-70b', verdict: 'oui', neurons: 2, cached: false, ms: 300 },
      { model: said(LIBRARY), verdict: 'fidele', neurons: 1, cached: false },
      'fidele',
    ],
  });
  assert.ok(judged.kind === 'ran');
  assert.deepEqual(judged.judges, [
    { model: 'mistral-small-3.1', verdict: null, answered: false },
    { model: 'llama-3.3-70b', verdict: null, answered: true },
  ]);
  assert.equal(judged.neurons, 6.5);

  // Refused by the control: the rule, and no sentence.
  const refusedBy = (verdictOf: unknown): [boolean, string | null, string | null] => {
    const reply = read({ ...ran, verdict: verdictOf, judges: [] });
    assert.ok(reply.kind === 'ran');
    return [reply.passed, reply.rule, reply.text];
  };
  const refusal = { rule: 'negation', sentence: 0, detail: 'ne' };
  assert.deepEqual(refusedBy({ kind: 'select', ids: [LIBRARY], refusal }), [
    false,
    'negation',
    null,
  ]);
  assert.deepEqual(refusedBy({ kind: 'select', ids: [LIBRARY] }), [false, 'shape', null]);
  assert.deepEqual(refusedBy({ kind: 'none' }), [false, 'none', null]);
  // What came back in place of a rule's name is never kept as one.
  assert.deepEqual(
    refusedBy({ kind: 'select', ids: [LIBRARY], refusal: { rule: said(LIBRARY) } }),
    [false, 'other', null],
  );
  // More than one sentence, a sentence about another measure, one too long for a screen.
  const two = [
    { text: said(LIBRARY), ids: [LIBRARY] },
    { text: said(TREES), ids: [LIBRARY] },
  ];
  assert.deepEqual(refusedBy({ kind: 'answer', sentences: two }), [false, 'count', null]);
  assert.deepEqual(
    refusedBy({ kind: 'answer', sentences: [{ text: said(TREES), ids: [TREES] }] }),
    [false, 'count', null],
  );
  assert.deepEqual(refusedBy({ kind: 'answer', sentences: [] }), [false, 'count', null]);
  const long = 'Le programme prévoit des livres. '.repeat(10);
  assert.ok(long.length > MAX_GIST_CHARS);
  assert.deepEqual(refusedBy({ kind: 'answer', sentences: [{ text: long, ids: [LIBRARY] }] }), [
    false,
    'chars',
    null,
  ]);
  // A sentence the page would not show — on two lines, or with a character nobody sees — is
  // no sentence to read, whatever let it through.
  for (const unseen of ['\n', String.fromCodePoint(0x2028), String.fromCodePoint(0xad)]) {
    const broken = said(LIBRARY).replace(' de quartier', `${unseen}de quartier`);
    assert.deepEqual(refusedBy({ kind: 'answer', sentences: [{ text: broken, ids: [LIBRARY] }] }), [
      false,
      'line',
      null,
    ]);
  }

  // Nothing ran: the Worker's counter or the platform's refusal, a measure the base does not
  // hold, a model that is silent.
  assert.deepEqual(read({ ...base, ran: false, budget: 'spent', used: 8500 }), {
    kind: 'spent',
    corpus: CORPUS,
    used: 8500,
  });
  assert.deepEqual(read({ ...base, ran: false, budget: 'spent' }), {
    kind: 'spent',
    corpus: CORPUS,
    used: null,
  });
  assert.deepEqual(read({ corpus: CORPUS, ids: [], load_ms: 3, ran: false }), {
    kind: 'absent',
    corpus: CORPUS,
  });
  assert.deepEqual(read({ ...base, ran: false, model_ms: 6000, reserved: 7.25 }), {
    kind: 'silent',
    corpus: CORPUS,
    neurons: 7.25,
    ms: 6000,
  });
  // What this tool cannot read is not guessed at.
  assert.deepEqual(read(null), { kind: 'unreadable' });
  assert.deepEqual(read('{}'), { kind: 'unreadable' });
  assert.deepEqual(read({ ...ran, verdict: undefined }), { kind: 'unreadable' });
  assert.deepEqual(read({ ...ran, verdict: { kind: 'essay' } }), { kind: 'unreadable' });
  for (const status of [400, 404, 429, 500]) {
    assert.deepEqual(read(ran, status), { kind: 'http', status });
  }
});

// ---------------------------------------------------------------------------------------------
// A session
// ---------------------------------------------------------------------------------------------

void test('a session writes what is missing, in the order of the work, and keeps a line per call', async () => {
  const { options, calls, recorded, printed } = session(STORY);
  const result = await writeSession(options);
  assert.deepEqual(asked(calls), [
    `${LIBRARY} gemma-4-26b 2`,
    // The second key measure: its third way is refused, its first passes.
    `${TREES} gemma-4-26b 2`,
    `${TREES} gemma-4-26b 0`,
    // Gemma could not write it, any way: Mistral is asked.
    `${BUSES} gemma-4-26b 2`,
    `${BUSES} gemma-4-26b 0`,
    `${BUSES} gemma-4-26b 1`,
    `${BUSES} mistral-small-3.1 2`,
    `${LENDING} gemma-4-26b 2`,
    // Nobody could: six calls, and no seventh.
    `${BOOKMOBILES} gemma-4-26b 2`,
    `${BOOKMOBILES} gemma-4-26b 0`,
    `${BOOKMOBILES} gemma-4-26b 1`,
    `${BOOKMOBILES} mistral-small-3.1 2`,
    `${BOOKMOBILES} mistral-small-3.1 0`,
    `${BOOKMOBILES} mistral-small-3.1 1`,
    `${ORCHARDS} gemma-4-26b 2`,
  ]);
  assert.deepEqual(result, {
    code: 0,
    reason: 'done',
    detail: '',
    calls: 15,
    // Five sentences with two judges each, ten refusals.
    neurons: 5 * 7.5 + 10 * 4.5,
    measures: 6,
    written: 5,
  });
  // Each request is one measure, one writer, one way — and judges that are not the writer.
  for (const call of calls) {
    assert.deepEqual(Object.keys(call).sort(), [
      'ids',
      'judges',
      'min_overlap',
      'mode',
      'model',
      'terms',
      'variant',
    ]);
    assert.deepEqual([call.mode, call.terms, call.min_overlap], ['gist', [], 0.5]);
    assert.equal(call.judges.length, 2);
    assert.ok(!call.judges.includes(call.model));
  }
  // One line per call, each pinned to its measure, and the sentence only when the control let
  // it through.
  assert.equal(recorded.length, 15);
  for (const line of recorded) {
    assert.deepEqual(parseRunLine(JSON.parse(JSON.stringify(line))), line);
    assert.ok(pinned(line, measure(line.id)));
    assert.equal(line.text !== null, line.passed);
    assert.equal(line.rule, line.passed ? null : 'overlap');
  }
  assert.deepEqual(recorded[2], {
    at: '2026-11-15T08:00:00.000Z',
    id: TREES,
    ...pinOf(measure(TREES)),
    writer: 'gemma-4-26b',
    variant: 0,
    ran: true,
    passed: true,
    rule: null,
    text: said(TREES),
    judges: [
      { model: 'mistral-small-3.1', verdict: 'ajout', answered: true },
      { model: 'llama-3.3-70b', verdict: 'fidele', answered: true },
    ],
    neurons: 7.5,
    cached: false,
    ms: 1200,
  });
  // What is printed: one line per call — identifiers, labels, numbers.
  assert.equal(printed.length, 15);
  assert.equal(
    printed[2],
    `${TREES} gemma-4-26b v0 ✔ mistral-small-3.1=ajout llama-3.3-70b=fidele · 7.50 n · 1200 ms`,
  );
  assert.equal(printed[1], `${TREES} gemma-4-26b v2 ✖ overlap · 4.50 n · 1200 ms`);
  assert.equal(holdsBook(printed.join('\n')), null);
});

void test('a session resumes where the files stop: nothing they answer is asked again', async () => {
  const first = session(STORY);
  await writeSession(first.options);

  // Everything is written or was tried every way: not one call.
  const second = session(STORY, { runs: first.recorded });
  assert.deepEqual(await writeSession(second.options), {
    code: 0,
    reason: 'done',
    detail: '',
    calls: 0,
    neurons: 0,
    measures: 0,
    written: 0,
  });
  assert.equal(second.calls.length, 0);

  // Stopped half-way, then run again: the second run starts where the first stopped.
  const half = session(STORY, { runs: first.recorded.slice(0, 5) });
  await writeSession(half.options);
  assert.deepEqual(asked(half.calls), asked(first.calls).slice(5));

  // A measure the editor ruled on is not written: his verdict is the last word.
  const ruled = session(STORY, {
    verdicts: lastVerdicts([linkOnly(BUSES), linkOnly(BOOKMOBILES)]),
  });
  await writeSession(ruled.options);
  assert.ok(asked(ruled.calls).every((call) => !call.startsWith(BUSES)));
  assert.equal(ruled.calls.length, 5);

  // A label that did not come: the next session asks the same writer the same way — the
  // gateway serves the sentence from its cache, and only the judges are paid.
  let llama: JudgeVerdict | 'silent' = 'silent';
  const script: Script = { judge: (judge) => (judge === 'llama-3.3-70b' ? llama : 'fidele') };
  const one = session(script, { measures: [measure(LIBRARY)] });
  assert.equal((await writeSession(one.options)).code, 0);
  assert.deepEqual(one.recorded[0]?.judges, [
    { model: 'mistral-small-3.1', verdict: 'fidele', answered: true },
    { model: 'llama-3.3-70b', verdict: null, answered: false },
  ]);
  llama = 'ecart';
  const two = session(
    { ...script, cached: () => true },
    { measures: [measure(LIBRARY)], runs: one.recorded },
  );
  const again = await writeSession(two.options);
  assert.deepEqual(asked(two.calls), [`${LIBRARY} gemma-4-26b 2`]);
  // Nothing new was written, and the writer cost nothing this time.
  assert.deepEqual([again.written, again.neurons], [0, 3]);
  const three = session(script, {
    measures: [measure(LIBRARY)],
    runs: [...one.recorded, ...two.recorded],
  });
  await writeSession(three.options);
  assert.equal(three.calls.length, 0);

  // A call the model did not answer is made again, the same way.
  let awake = false;
  const sleepy: Script = { says: (id) => (awake ? said(id) : null) };
  const night = session(sleepy, { measures: [measure(LIBRARY)] });
  await writeSession(night.options);
  assert.deepEqual(asked(night.calls), [`${LIBRARY} gemma-4-26b 2`]);
  assert.deepEqual(
    [night.recorded[0]?.ran, night.recorded[0]?.neurons, night.recorded[0]?.text],
    [false, 7.25, null],
  );
  awake = true;
  const morning = session(sleepy, { measures: [measure(LIBRARY)], runs: night.recorded });
  await writeSession(morning.options);
  assert.deepEqual(asked(morning.calls), [`${LIBRARY} gemma-4-26b 2`]);
});

void test('a session stops cleanly: the budget or the end (0), the allowance spent (3), a route that is not the one expected (1)', async () => {
  const stop = async (
    script: Script,
    overrides: Partial<WriteOptions> = {},
  ): Promise<[number, string, number, number]> => {
    const run = session(script, overrides);
    const result = await writeSession(run.options);
    return [result.code, result.reason, result.calls, run.recorded.length];
  };

  // The budget: what the route reports as billed, checked before each call.
  assert.deepEqual(await stop(STORY, { budget: 10 }), [0, 'budget', 2, 2]);
  assert.deepEqual(await stop(STORY, { budget: 12 }), [0, 'budget', 2, 2]);
  assert.deepEqual(await stop(STORY, { budget: 12.5 }), [0, 'budget', 3, 3]);
  // What the cache serves is not counted: a budget of one neuron goes through a whole book
  // whose sentences are all in the cache, with no judge to pay.
  const free = { cached: () => true };
  assert.deepEqual(
    await stop(free, { budget: 1, judges: ['gemma-4-26b'], writers: ['gemma-4-26b'] }),
    [0, 'done', 6, 6],
  );
  // So many measures, and no more.
  const limited = session(STORY, { limit: 2 });
  const two = await writeSession(limited.options);
  assert.deepEqual([two.code, two.reason, two.measures, two.calls], [0, 'limit', 2, 3]);

  // The Worker's own counter says the day is spent: at once, and nothing is kept of the call.
  let count = 0;
  const spent = bench(STORY);
  const afterOne: WriteOptions['ask'] = (request) => {
    count += 1;
    return count < 2
      ? spent.ask(request)
      : Promise.resolve({
          status: 200,
          body: {
            corpus: CORPUS,
            ids: request.ids,
            load_ms: 3,
            ran: false,
            budget: 'spent',
            used: 8500,
          },
        });
  };
  assert.deepEqual(await stop(STORY, { ask: afterOne }), [3, 'spent', 2, 1]);

  // Two calls in a row with no answer: the free allowance is spent. Each is kept, with what
  // the Worker had reserved for it.
  assert.deepEqual(await stop({ says: () => null }), [3, 'silent', 2, 2]);
  // One silent call between two answers stops nothing.
  const hiccup: Script = { says: (id) => (id === TREES ? null : said(id)) };
  assert.deepEqual(await stop(hiccup), [0, 'done', 6, 6]);

  // Judges asked, and none answered, twice in a row — a refused sentence in between changes
  // nothing: the writer comes back from the cache, and nothing more is served.
  const mute: Script = { ...STORY, judge: () => 'silent' };
  assert.deepEqual(await stop(mute), [3, 'judges', 3, 3]);
  // One label is enough for the count to start again.
  const half: Script = {
    judge: (judge, id) => (id === TREES || judge === 'llama-3.3-70b' ? 'silent' : 'fidele'),
  };
  assert.deepEqual(await stop(half), [0, 'done', 6, 6]);
  const twice: Script = { judge: (_, id) => (id === TREES || id === BUSES ? 'silent' : 'fidele') };
  assert.deepEqual(await stop(twice), [3, 'judges', 3, 3]);
  // No judge asked, no judge missed.
  assert.deepEqual(
    await stop({ judge: () => 'silent' }, { judges: ['gemma-4-26b'], writers: ['gemma-4-26b'] }),
    [0, 'done', 6, 6],
  );

  // The route itself: still counting too many after its waits (come back later), or refusing.
  const answering =
    (status: number, body: unknown = null): WriteOptions['ask'] =>
    () =>
      Promise.resolve({ status, body });
  assert.deepEqual(await stop({}, { ask: answering(429) }), [3, 'rate', 1, 0]);
  for (const status of [400, 404, 500]) {
    const refused = session({}, { ask: answering(status) });
    const result = await writeSession(refused.options);
    assert.deepEqual(
      [result.code, result.reason, result.detail],
      [1, 'http', `HTTP ${String(status)}`],
    );
    assert.equal(refused.recorded.length, 0);
  }
  assert.deepEqual(await stop({}, { ask: answering(200, 'ok') }), [1, 'unreadable', 1, 0]);
  // No network, or no answer in a minute: the session ends with what it has kept, not with a
  // stack — so that what it spent is still counted.
  let reached = 0;
  const working = bench(STORY);
  const cutOff: WriteOptions['ask'] = (request) => {
    reached += 1;
    return reached < 3 ? working.ask(request) : Promise.reject(new TypeError('fetch failed'));
  };
  const cut = session(STORY, { ask: cutOff });
  const ended = await writeSession(cut.options);
  assert.deepEqual(
    [ended.code, ended.reason, ended.detail, ended.calls, ended.neurons],
    [1, 'unreachable', TREES, 2, 12],
  );
  assert.equal(cut.recorded.length, 2);
  // The base holds another state of the book than the manifest: the pins would be false.
  assert.deepEqual(await stop({ corpus: 'bbbbbbbbbbbbbbbb' }), [1, 'corpus', 1, 0]);
  // The base does not hold the measure.
  const unknown: Measure = { ...measure(LIBRARY), id: 'p9c9-s09-m09' };
  const absent = session({}, { measures: [unknown] });
  const missing = await writeSession(absent.options);
  assert.deepEqual([missing.code, missing.reason, missing.detail], [1, 'absent', 'p9c9-s09-m09']);
});

void test('where the work stands: what is written, judged, read — and the judges against the reading', () => {
  const runs = [
    run(LIBRARY),
    run(TREES, {
      judges: [
        { model: 'mistral-small-3.1', verdict: 'ajout', answered: true },
        { model: 'llama-3.3-70b', verdict: 'fidele', answered: true },
      ],
    }),
    ...VARIANT_ORDER.map((variant) => refusedRun(BUSES, variant)),
    run(BUSES, {
      writer: 'mistral-small-3.1',
      judges: [
        { model: 'gemma-4-26b', verdict: 'ecart', answered: true },
        { model: 'llama-3.3-70b', verdict: null, answered: true },
      ],
    }),
    ...exhausted(BOOKMOBILES),
    run(ORCHARDS, {
      judges: [
        { model: 'mistral-small-3.1', verdict: 'fidele', answered: true },
        { model: 'llama-3.3-70b', verdict: null, answered: false },
      ],
    }),
  ];
  const verdicts = lastVerdicts([
    verdict(LIBRARY),
    linkOnly(TREES),
    verdict(BUSES, { writer: 'editor', from: 'mistral-small-3.1', text: said(BUSES) }),
    verdict(LENDING, { measure_sha256: sha256('another wording') }),
  ]);
  const known = knowledge(MEASURES, runs, verdicts);
  const status = statusOf(MEASURES, runs, known);
  assert.deepEqual(
    { ...status, byWriter: [...status.byWriter] },
    {
      measures: 6,
      keyMeasures: 2,
      written: 4,
      judged: 3,
      byWriter: [
        ['gemma-4-26b', 3],
        ['mistral-small-3.1', 1],
      ],
      unwritten: 1,
      // The measure whose wording moved: to write again — and, meanwhile, the sentence kept
      // before is there to be read against the new wording.
      toWrite: 1,
      read: 2,
      linkOnly: 1,
      bySession: 0,
      waiting: 3,
      readable: 2,
      again: 1,
      calls: runs.length,
      neurons: runs.reduce((sum, line) => sum + line.neurons, 0),
    },
  );
  // Where the text is, the control of today counts too: a sentence it refuses is to read again.
  const strict = statusOf(
    MEASURES,
    runs,
    knowledge(MEASURES, runs, verdicts, recheckWith(TEXTS, 0.95)),
  );
  assert.deepEqual([strict.read, strict.again, strict.waiting], [1, 2, 4]);

  // The judges against the editor: the sentence he kept as written, those he refused with the
  // link alone, the one he had to correct. A sentence he has not ruled on says nothing.
  const judged = agreement(known);
  const cells = (judge: string): [string, number, number][] =>
    [...(judged.get(judge) ?? [])].map(([label, tally]) => [label, tally.kept, tally.refused]);
  assert.deepEqual(cells('mistral-small-3.1'), [
    ['fidele', 1, 0],
    ['ajout', 0, 1],
  ]);
  assert.deepEqual(cells('llama-3.3-70b'), [
    ['fidele', 1, 1],
    ['none', 0, 1],
  ]);
  assert.deepEqual(cells('gemma-4-26b'), [['ecart', 0, 1]]);

  const lines = statusLines(CORPUS, status, judged);
  assert.equal(lines[0], `corpus ${CORPUS}: 6 measures, 2 of them key measures`);
  assert.ok(lines.some((line) => /read, 1 link only, 3 waiting — 2 of them/.test(line)));
  assert.ok(lines.some((line) => /^ {2}again {6}1 of those waiting were ruled on/.test(line)));
  assert.ok(lines.includes('  llama-3.3-70b: fidele 1/1 · none 0/1'));
  assert.ok(lines.includes('  mistral-small-3.1: fidele 1/0 · ajout 0/1'));
  // Identifiers and numbers: not a sentence, not a word of a measure.
  assert.equal(holdsBook(lines.join('\n')), null);

  // A part of the book is counted as a part.
  const orchard = MEASURES.filter((m) => m.id.startsWith('p1c1-s02'));
  const part = statusOf(orchard, runs, knowledge(orchard, runs, verdicts));
  assert.deepEqual([part.measures, part.written, part.linkOnly, part.calls], [2, 2, 1, 2]);
  // Nothing done yet: everything is to write.
  const empty = statusOf(MEASURES, [], knowledge(MEASURES, [], new Map()));
  assert.deepEqual([empty.written, empty.toWrite, empty.waiting, empty.neurons], [0, 6, 6, 0]);
});

// ---------------------------------------------------------------------------------------------
// The reading desk
// ---------------------------------------------------------------------------------------------

const TOKEN = 'a3f1c2d4e5b60718293a4b5c6d7e8f90';
const HOST = '127.0.0.1:4599';

/** What the files hold when the editor sits down. */
const DESK_RUNS: readonly RunLine[] = [
  run(LIBRARY, {
    judges: [
      { model: 'mistral-small-3.1', verdict: 'fidele', answered: true },
      { model: 'llama-3.3-70b', verdict: 'ajout', answered: true },
    ],
  }),
  refusedRun(TREES, 2),
  run(TREES, { variant: 0 }),
  ...VARIANT_ORDER.map((variant) => refusedRun(BUSES, variant)),
  run(BUSES, {
    writer: 'mistral-small-3.1',
    judges: [
      { model: 'gemma-4-26b', verdict: 'fidele', answered: true },
      { model: 'llama-3.3-70b', verdict: 'fidele', answered: true },
    ],
  }),
  ...exhausted(LENDING),
  run(BOOKMOBILES, {
    judges: [
      { model: 'mistral-small-3.1', verdict: 'ecart', answered: true },
      { model: 'llama-3.3-70b', verdict: null, answered: false },
    ],
  }),
];

interface Desk {
  deps: DeskDeps;
  kept: VerdictLine[];
  printed: string[];
}

function desk(overrides: Partial<DeskDeps> = {}, already: readonly VerdictLine[] = []): Desk {
  const kept: VerdictLine[] = [...already];
  const printed: string[] = [];
  const deps: DeskDeps = {
    token: TOKEN,
    manifest: MANIFEST,
    minOverlap: 0.5,
    lot: 150,
    unwritten: false,
    only: '',
    writers: DEFAULT_WRITERS,
    texts: () => measureTexts(PRIVATE),
    runs: () => [...DESK_RUNS],
    verdicts: () => [...kept],
    record: (line) => {
      kept.push(line);
    },
    today: () => '2026-11-16',
    nonce: () => 'bm9uY2UtZGUtdGVzdA==',
    print: (line) => {
      printed.push(line);
    },
    ...overrides,
  };
  return { deps, kept, printed };
}

const get = (deps: DeskDeps, path = `/${TOKEN}/`, host = HOST): DeskResponse =>
  deskHandle({ method: 'GET', path, host, origin: undefined, body: '' }, deps);

const post = (
  deps: DeskDeps,
  body: unknown,
  path = `/${TOKEN}/verdict`,
  origin: string | undefined = `http://${HOST}`,
): DeskResponse =>
  deskHandle(
    {
      method: 'POST',
      path,
      host: HOST,
      origin,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
    deps,
  );

const shownIds = (page: string): string[] =>
  [...page.matchAll(/<article data-id="([^"]+)"/g)].map((found) => found[1] ?? '');

/** The blocks of a page, without its style and its script. */
const blocksOf = (page: string): string =>
  page.slice(page.indexOf('<main>'), page.indexOf('</main>'));

const answered = (response: DeskResponse): Record<string, unknown> =>
  JSON.parse(response.body) as Record<string, unknown>;

void test('the desk answers this machine and the token, and nobody else', () => {
  const { deps, kept } = desk();
  assert.equal(get(deps).status, 200);
  // Without the token — or with one that is not it — the page does not say it exists: the
  // same two words whatever was asked, and nothing of what the desk holds.
  for (const path of [
    '/',
    '',
    `/${TOKEN}`,
    `/${TOKEN.slice(0, -1)}1/`,
    `/${TOKEN}x/`,
    `/${TOKEN.toUpperCase()}/`,
    `/${TOKEN}/verdict`,
    `/${TOKEN}/runs.jsonl`,
    `/${TOKEN}//`,
    `/x/${TOKEN}/`,
    '/favicon.ico',
  ]) {
    const refused = get(deps, path);
    assert.deepEqual([refused.status, refused.body], [404, 'Not found\n'], path);
    assert.equal(refused.headers['cache-control'], 'no-store');
  }
  // Asked under another name than this machine's: a page elsewhere made the browser call here.
  for (const host of [
    undefined,
    'cestecritla.fr',
    'evil.example:4599',
    '192.168.1.20:4599',
    '127.0.0.1.evil.example',
  ]) {
    const elsewhere = { method: 'GET', path: `/${TOKEN}/`, host, origin: undefined, body: '' };
    assert.equal(deskHandle(elsewhere, deps).status, 404, String(host));
  }
  assert.equal(get(deps, `/${TOKEN}/`, 'localhost:4599').status, 200);

  // A verdict is taken from the page itself, at its own address, and from nowhere else.
  const choice = { id: LIBRARY, action: 'link-only' };
  assert.equal(post(deps, choice, '/verdict').status, 404);
  assert.equal(post(deps, choice, `/${'0'.repeat(32)}/verdict`).status, 404);
  assert.equal(post(deps, choice, `/${TOKEN}/`).status, 404);
  assert.equal(post(deps, choice, `/${TOKEN}/verdict`, 'https://evil.example').status, 404);
  assert.equal(kept.length, 0);
  assert.equal(post(deps, choice).status, 200);
  assert.equal(kept.length, 1);
  assert.equal(
    deskHandle(
      { method: 'PUT', path: `/${TOKEN}/verdict`, host: HOST, origin: undefined, body: '{}' },
      deps,
    ).status,
    404,
  );
});

void test('the page: the measures to read with their text, the sentences, the judges — and nothing from outside', () => {
  const { deps } = desk();
  const response = get(deps);
  const page = response.body;
  // The measures that have a sentence and no verdict, in the order of the work: the one nobody
  // could write is not read here.
  assert.deepEqual(shownIds(page), [LIBRARY, TREES, BUSES, BOOKMOBILES]);
  assert.match(page, /<html lang="fr">/);
  assert.match(
    page,
    /<p class="banner">Page locale : elle contient le texte du livre, ne pas partager<\/p>/,
  );

  // Each block: the official title of its section, the name of the measure, ITS TEXT — a
  // sub-measure under the measure it details — then what was written about it.
  const block = (id: string): string => {
    const from = page.indexOf(`<article data-id="${id}"`);
    return page.slice(from, page.indexOf('</article>', from));
  };
  assert.match(block(LIBRARY), /<p class="where">Des livres &amp; des bus partout<\/p>/);
  assert.match(block(LIBRARY), /Mesure clé <span class="id">p1c1-s01-k01<\/span>/);
  assert.ok(
    block(LIBRARY).includes(
      `<div class="book"><p class="tag">Texte du livre</p><p class="text">${BOOK[0]?.text ?? ''}</p></div>`,
    ),
  );
  assert.match(block(TREES), /<p class="where">Des vergers pour tous<\/p>/);
  assert.match(block(BUSES), /Mesure 1 <span/);
  assert.match(block(BOOKMOBILES), /Mesure 2\.1 <span/);
  assert.ok(
    block(BOOKMOBILES).includes(
      '<p class="lead">Créer un service public du prêt de livres :</p><p class="text">des bibliobus pour les villages</p>',
    ),
  );
  assert.ok(block(LIBRARY).includes(`<p class="sentence">${said(LIBRARY)}</p>`));
  // Who wrote it, which way, and what each judge said — a sort, not a proof.
  assert.match(
    block(LIBRARY),
    /Gemma 4 26B · consigne 2 · juges — Mistral Small 3\.1 : fidèle ; Llama 3\.3 70B : ajout</,
  );
  assert.match(
    block(BUSES),
    /Mistral Small 3\.1 · consigne 2 · juges — Gemma 4 26B : fidèle ; Llama 3\.3 70B : fidèle</,
  );
  assert.match(block(BOOKMOBILES), /Mistral Small 3\.1 : écart ; Llama 3\.3 70B : pas de réponse</);
  assert.match(page, /Les étiquettes des juges sont un\s+tri, pas une preuve/);
  // The three choices.
  for (const id of shownIds(page)) {
    assert.match(block(id), /data-action="read"><kbd>1<\/kbd> Fidèle<\/button>/);
    assert.match(block(id), /data-action="edit">Corriger<\/button>/);
    assert.match(block(id), /data-action="link-only"><kbd>0<\/kbd> Aucune : lien seul<\/button>/);
    assert.match(block(id), /<textarea id="c-[^"]+" rows="3" maxlength="300"><\/textarea>/);
  }
  // How much is left: in this lot, in all, and what is already ruled on.
  assert.match(
    page,
    /Reste <span id="left-lot">4<\/span> dans ce lot · <span id="left-all">4<\/span> à lire en tout · <span id="ruled">0<\/span> verdicts sur 6 mesures/,
  );

  // Nothing comes from outside, and the policy of the page says so: no address is written in
  // it, no file is fetched, and only what carries the nonce of this response runs.
  assert.doesNotMatch(page, /https?:\/\/|\/\/[a-z0-9-]+\.[a-z]/i);
  assert.doesNotMatch(page, /<link|<img|<iframe|<object|<embed|\ssrc=|@import|url\(/i);
  assert.deepEqual(page.match(/href="[^"]*"/g), ['href="./"']);
  const policy = response.headers['content-security-policy'] ?? '';
  assert.equal(
    policy,
    "default-src 'none'; script-src 'nonce-bm9uY2UtZGUtdGVzdA=='; style-src 'nonce-bm9uY2UtZGUtdGVzdA=='; " +
      "connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  );
  assert.equal((page.match(/nonce="bm9uY2UtZGUtdGVzdA=="/g) ?? []).length, 2);
  assert.doesNotMatch(page, /\son[a-z]+="|style="/i);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['referrer-policy'], 'no-referrer');
  assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');

  // So many measures a page, and no more.
  assert.deepEqual(shownIds(deskPage({ ...deps, lot: 2 })), [LIBRARY, TREES]);
  // A part of the book only.
  assert.deepEqual(shownIds(deskPage({ ...deps, only: 'p1c1-s02' })), [TREES]);
});

void test('nothing a file holds becomes markup: sentences and measures are shown as text', () => {
  const hostile = '<img src=x onerror=alert(1)> & "guillemets" </script>';
  const book = BOOK.map((m) => (m.id === LIBRARY ? { ...m, text: hostile } : m));
  const { deps } = desk({
    manifest: manifestOf(book),
    texts: () => measureTexts(corpusOf(book)),
    runs: () => [{ ...run(LIBRARY, { text: hostile }), measure_sha256: sha256(hostile) }],
  });
  const page = deskPage(deps);
  assert.deepEqual(shownIds(page), [LIBRARY]);
  assert.doesNotMatch(page, /<img|onerror=alert\(1\)>/);
  assert.equal(
    (
      page.match(
        /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;guillemets&quot; &lt;\/script&gt;/g,
      ) ?? []
    ).length,
    2,
  );
  // One script, ours: the rules it names are data, not markup.
  assert.equal((page.match(/<script/g) ?? []).length, 1);
  assert.equal((page.match(/<\/script>/g) ?? []).length, 1);
});

void test('« Fidèle » keeps that sentence, « Aucune : lien seul » keeps the link — at once, pinned and dated', () => {
  const { deps, kept, printed } = desk();
  const faithful = post(deps, {
    id: LIBRARY,
    action: 'read',
    writer: 'gemma-4-26b',
    text: said(LIBRARY),
  });
  assert.deepEqual(answered(faithful), {
    ok: true,
    verdict: 'read',
    left: { measures: 6, ruled: 1, waiting: 3 },
  });
  assert.deepEqual(
    [...kept],
    [
      {
        id: LIBRARY,
        read_on: '2026-11-16',
        ...pinOf(measure(LIBRARY)),
        verdict: 'read',
        writer: 'gemma-4-26b',
        text: said(LIBRARY),
      },
    ],
  );
  // A sub-measure is pinned to the measure it was read under, too.
  const none = post(deps, { id: BOOKMOBILES, action: 'link-only' });
  assert.deepEqual(answered(none)['left'], { measures: 6, ruled: 2, waiting: 2 });
  assert.deepEqual(kept[1], {
    id: BOOKMOBILES,
    read_on: '2026-11-16',
    measure_sha256: sha256('des bibliobus pour les villages'),
    lead_sha256: sha256('Créer un service public du prêt de livres :'),
    verdict: 'link-only',
    writer: null,
    text: null,
  });
  // What is kept reads back as lines of the file, and the page moves on.
  for (const line of kept)
    assert.deepEqual(parseVerdictLine(JSON.parse(JSON.stringify(line))), line);
  assert.deepEqual(shownIds(deskPage(deps)), [TREES, BUSES]);
  // « Revenir »: another choice for the same measure, and the last one wins.
  post(deps, { id: LIBRARY, action: 'link-only' });
  assert.equal(lastVerdicts(kept).get(LIBRARY)?.verdict, 'link-only');
  assert.equal(kept.length, 3);

  // What is kept is what was on the screen: a sentence written again since is not that one,
  // and a sentence the page never showed is not one at all.
  const { deps: other, kept: nothing } = desk();
  assert.deepEqual(
    answered(
      post(other, { id: LIBRARY, action: 'read', writer: 'gemma-4-26b', text: said(TREES) }),
    ),
    { ok: false, rule: 'changed' },
  );
  for (const odd of [
    { id: LIBRARY, action: 'read', writer: 'mistral-small-3.1', text: said(LIBRARY) },
    { id: LIBRARY, action: 'read' },
    { id: LIBRARY, action: 'approve' },
    { id: 'p9c9-s09-m09', action: 'link-only' },
    { id: 'p1c1-s01-p01', action: 'link-only' },
    { action: 'link-only' },
    { id: LIBRARY, action: 'correct' },
    [],
    '{"id":',
  ]) {
    const refused = post(other, odd);
    assert.deepEqual([refused.status, answered(refused)], [400, { ok: false, rule: 'request' }]);
  }
  assert.equal(nothing.length, 0);

  // Each choice leaves a line in the terminal: an identifier and a verdict.
  assert.deepEqual(printed, [
    `${LIBRARY} read (gemma-4-26b)`,
    `${BOOKMOBILES} link-only`,
    `${LIBRARY} link-only`,
  ]);
});

void test('« Corriger »: the control decides — the rule is named when it refuses, the sentence is kept when it passes', () => {
  const { deps, kept } = desk();
  const correct = (id: string, text: string, from?: string): Record<string, unknown> =>
    answered(post(deps, { id, action: 'correct', text, ...(from === undefined ? {} : { from }) }));

  // Refused: the name of the rule and nothing else — and nothing is kept.
  const refusals: [string, string][] = [
    ['Le programme prévoit 500 bibliothèques de quartier dans les communes.', 'number'],
    ['Le programme ne prévoit pas de bibliothèque payante.', 'negation'],
    [
      'Le programme prévoit d’ouvrir une bibliothèque de quartier sept jours sur sept partout.',
      'copy',
    ],
    ['Le programme prévoit un grand plan pour la lecture publique.', 'overlap'],
    ['Le programme ouvre des bibliothèques. Il ouvre aussi des communes.', 'several'],
    ['', 'shape'],
    ['   ', 'shape'],
    [
      `Le programme prévoit une bibliothèque ${'de quartier '.repeat(30)}dans chaque commune.`,
      'length',
    ],
  ];
  for (const [text, rule] of refusals) {
    assert.deepEqual(correct(LIBRARY, text), { ok: false, rule }, text.slice(0, 40));
  }
  assert.equal(kept.length, 0);

  // Accepted: kept as the control returns it, under the editor's name, pinned like any other.
  const mine = 'Chaque commune ouvre une bibliothèque de quartier tous les jours de la semaine.';
  assert.deepEqual(correct(LIBRARY, `  ${mine}  `, 'gemma-4-26b'), {
    ok: true,
    verdict: 'read',
    left: { measures: 6, ruled: 1, waiting: 3 },
  });
  assert.deepEqual(
    [...kept],
    [
      {
        id: LIBRARY,
        read_on: '2026-11-16',
        ...pinOf(measure(LIBRARY)),
        verdict: 'read',
        writer: 'editor',
        text: mine,
        from: 'gemma-4-26b',
      },
    ],
  );
  // One spelling of apostrophes and spaces, whatever the keyboard typed — a return left at the
  // end of the box included: what is kept is one line.
  correct(BUSES, 'Le programme prévoit des transports \t scolaires\ngratuits jusqu’à 16 ans.\n');
  assert.deepEqual([kept[1]?.text, kept[1]?.from], [said(BUSES), undefined]);
  // A character nobody sees is not typed by accident: it is refused, not rubbed out.
  assert.deepEqual(
    correct(BUSES, said(BUSES).replace('scolaires', `sco${String.fromCodePoint(0x200b)}laires`)),
    { ok: false, rule: 'markup' },
  );
  assert.equal(kept.length, 2);
  // The sentence is checked against the measure it is about, and no other.
  assert.deepEqual(correct(TREES, mine), { ok: false, rule: 'overlap' });
  // A writer that is not one of ours is not kept as the origin of a correction.
  correct(TREES, said(TREES), said(LIBRARY));
  assert.equal(kept[2]?.from, undefined);
});

void test('the measures nobody could write have their own page: a sentence to write, or the link alone', () => {
  const { deps, kept } = desk({ unwritten: true });
  const page = deskPage(deps);
  assert.deepEqual(shownIds(page), [LENDING]);
  assert.match(page, /Aucune phrase n’a passé le contrôle pour cette mesure\./);
  assert.match(page, /<form data-fixed="1"><label for="c-p1c1-s01-m02">Écrire une phrase/);
  assert.doesNotMatch(blocksOf(page), /data-action="read"|data-action="edit"|class="candidate"/);
  assert.match(page, /<span id="left-all">1<\/span> sans phrase en tout/);
  assert.equal(
    answered(post(deps, { id: LENDING, action: 'correct', text: said(LENDING) }))['ok'],
    true,
  );
  assert.deepEqual([kept[0]?.writer, kept[0]?.text], ['editor', said(LENDING)]);
  assert.deepEqual(shownIds(deskPage(deps)), []);
  assert.match(deskPage(deps), /Rien sans phrase pour l’instant dans ce périmètre\./);
  // A measure still to be asked is on neither page: the tool has something left to try.
  const early = desk({ unwritten: true, runs: () => [refusedRun(LENDING, 2)] });
  assert.deepEqual(shownIds(deskPage(early.deps)), []);
});

void test('a sentence today’s control refuses cannot be kept as it is; a text that is not the published one cannot be read', () => {
  // The control moved since the sentence was written: no « Fidèle », and the reason.
  const runs = [
    run(LIBRARY, { text: 'Le programme prévoit 500 bibliothèques de quartier dans les communes.' }),
  ];
  const { deps, kept } = desk({ runs: () => runs });
  const page = deskPage(deps);
  assert.deepEqual(shownIds(page), [LIBRARY]);
  assert.doesNotMatch(blocksOf(page), /data-action="read"/);
  assert.match(
    page,
    /Le contrôle d’aujourd’hui refuse cette phrase — un nombre que la mesure n’écrit pas ainsi \(règle « number »\)/,
  );
  assert.match(page, /data-action="edit">Corriger/);
  assert.deepEqual(
    answered(
      post(deps, { id: LIBRARY, action: 'read', writer: 'gemma-4-26b', text: runs[0]?.text }),
    ),
    { ok: false, rule: 'number' },
  );
  assert.equal(kept.length, 0);

  // The text on this machine is not the one the manifest publishes the fingerprint of: what
  // would be read is not what is pinned. Left aside, counted, and no verdict is taken.
  const reworded = BOOK.map((m) =>
    m.id === LENDING ? { ...m, text: 'Créer un service public du prêt de disques :' } : m,
  );
  const astray = desk({ texts: () => measureTexts(corpusOf(reworded)) });
  const left = deskPage(astray.deps);
  assert.deepEqual(shownIds(left), [LIBRARY, TREES, BUSES]);
  assert.match(left, /1 mesure\(s\) laissée\(s\) de côté/);
  assert.deepEqual(answered(post(astray.deps, { id: BOOKMOBILES, action: 'link-only' })), {
    ok: false,
    rule: 'pin',
  });
  assert.equal(astray.kept.length, 0);
  // A verdict given on another wording is no verdict: the measure comes back to be read.
  const stale = desk({}, [
    verdict(LIBRARY, { measure_sha256: sha256('another wording') }),
    verdict(TREES),
  ]);
  assert.deepEqual(shownIds(deskPage(stale.deps)), [LIBRARY, BUSES, BOOKMOBILES]);
});

void test('a verdict that no longer holds brings its measure back, with the sentence that was kept', () => {
  const blockOf = (page: string, id: string): string => {
    const from = page.indexOf(`<article data-id="${id}"`);
    return page.slice(from, page.indexOf('</article>', from));
  };

  // The control moved: the sentence the editor wrote himself, and kept, is refused today. The
  // measure is back among those to read — first, in the order of the work — with that sentence
  // next to the one the model wrote, and the reason it cannot be kept as it is.
  const mine = 'Le programme prévoit 500 bibliothèques de quartier dans les communes.';
  const before = verdict(LIBRARY, { writer: 'editor', text: mine, from: 'gemma-4-26b' });
  const { deps, kept } = desk({}, [before, verdict(TREES)]);
  const page = deskPage(deps);
  assert.deepEqual(shownIds(page), [LIBRARY, BUSES, BOOKMOBILES]);
  const block = blockOf(page, LIBRARY);
  assert.match(block, /Déjà lue le 2026-11-16 : ce verdict ne tient\s+plus/);
  assert.equal((block.match(/class="candidate"/g) ?? []).length, 2);
  assert.ok(block.includes(`<p class="sentence">${said(LIBRARY)}</p>`));
  assert.ok(
    block.includes(
      `<li class="candidate" data-writer="editor" data-name="l’éditeur"><p class="sentence">${mine}</p>` +
        '<p class="about">l’éditeur · phrase gardée le 2026-11-16</p>' +
        '<p class="refused">Le contrôle d’aujourd’hui refuse cette phrase — un nombre que la mesure n’écrit pas ainsi (règle « number »).',
    ),
  );
  // One « Fidèle » only: on the sentence the control still lets through.
  assert.equal((block.match(/data-action="read"/g) ?? []).length, 1);
  assert.doesNotMatch(blockOf(page, BUSES), /Déjà lue/);
  assert.match(page, /<span id="ruled">1<\/span> verdicts sur 6 mesures/);
  assert.deepEqual(
    answered(post(deps, { id: LIBRARY, action: 'read', writer: 'editor', text: mine })),
    { ok: false, rule: 'number' },
  );
  assert.equal(kept.length, 2);
  // Read again and kept: the verdict holds, and the measure leaves the page.
  assert.deepEqual(
    answered(
      post(deps, { id: LIBRARY, action: 'read', writer: 'gemma-4-26b', text: said(LIBRARY) }),
    ),
    { ok: true, verdict: 'read', left: { measures: 6, ruled: 2, waiting: 2 } },
  );
  assert.deepEqual(shownIds(deskPage(deps)), [BUSES, BOOKMOBILES]);

  // The book moved: the measure is published with another wording. What was written about the
  // old one is about another measure — but the sentence that was kept is the first thing to
  // read against the new one, before any model is asked again.
  const reworded = BOOK.map((m) =>
    m.id === TREES
      ? { ...m, text: 'Planter 300 arbres fruitiers par an le long des routes des communes' }
      : m,
  );
  const mineToo =
    'Le programme prévoit de planter chaque année 300 arbres fruitiers dans les communes.';
  const moved = desk(
    { manifest: manifestOf(reworded), texts: () => measureTexts(corpusOf(reworded)) },
    [verdict(TREES, { writer: 'editor', text: mineToo, from: 'gemma-4-26b' }), verdict(ORCHARDS)],
  );
  const after = deskPage(moved.deps);
  assert.deepEqual(shownIds(after), [LIBRARY, TREES, BUSES, BOOKMOBILES]);
  const trees = blockOf(after, TREES);
  assert.match(trees, /Déjà lue le 2026-11-16/);
  assert.ok(
    trees.includes(
      '<p class="text">Planter 300 arbres fruitiers par an le long des routes des communes</p>',
    ),
  );
  // The sentences written for the old wording are gone; the one that was kept is offered.
  assert.equal((trees.match(/class="candidate"/g) ?? []).length, 1);
  assert.match(trees, /l’éditeur · phrase gardée le 2026-11-16/);
  assert.deepEqual(
    answered(post(moved.deps, { id: TREES, action: 'read', writer: 'editor', text: mineToo })),
    { ok: true, verdict: 'read', left: { measures: 6, ruled: 2, waiting: 3 } },
  );
  // Kept again: pinned to the wording of today, and still the correction it was.
  const again = moved.kept.at(-1);
  assert.deepEqual(again, {
    id: TREES,
    read_on: '2026-11-16',
    measure_sha256: sha256('Planter 300 arbres fruitiers par an le long des routes des communes'),
    verdict: 'read',
    writer: 'editor',
    text: mineToo,
    from: 'gemma-4-26b',
  });
  assert.deepEqual(shownIds(deskPage(moved.deps)), [LIBRARY, BUSES, BOOKMOBILES]);
  // A link alone that was chosen for the old wording is asked again too — once there is
  // something to read: with nothing written about the new wording, it waits for the writer.
  const linked = desk(
    { manifest: manifestOf(reworded), texts: () => measureTexts(corpusOf(reworded)) },
    [linkOnly(TREES)],
  );
  assert.ok(!shownIds(deskPage(linked.deps)).includes(TREES));
});

void test('the desk listens on this machine only, and serves the page behind its token', async () => {
  const { deps, kept } = desk();
  const server = await startDesk(deps, 0);
  try {
    const address = server.address();
    assert.ok(typeof address === 'object' && address !== null);
    // Never another interface: the text of the book is on that page.
    assert.equal(address.address, '127.0.0.1');
    const origin = `http://127.0.0.1:${String(address.port)}`;
    const bare = await fetch(`${origin}/`);
    assert.deepEqual([bare.status, await bare.text()], [404, 'Not found\n']);
    const wrong = await fetch(`${origin}/${'0'.repeat(32)}/`);
    assert.equal(wrong.status, 404);
    const page = await fetch(`${origin}/${TOKEN}/?utm=1`);
    assert.equal(page.status, 200);
    assert.match(
      await page.text(),
      /Page locale : elle contient le texte du livre, ne pas partager/,
    );
    const choice = await fetch(`${origin}/${TOKEN}/verdict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ id: TREES, action: 'read', writer: 'gemma-4-26b', text: said(TREES) }),
    });
    assert.deepEqual(await choice.json(), {
      ok: true,
      verdict: 'read',
      left: { measures: 6, ruled: 1, waiting: 3 },
    });
    assert.deepEqual([kept.length, kept[0]?.id, kept[0]?.text], [1, TREES, said(TREES)]);
    // A body longer than a request of the page is not read as one.
    const flood = await fetch(`${origin}/${TOKEN}/verdict`, {
      method: 'POST',
      headers: { origin },
      body: JSON.stringify({ id: TREES, action: 'correct', text: 'x'.repeat(20_000) }),
    });
    assert.equal(flood.status, 404);
    assert.equal(kept.length, 1);
  } finally {
    await new Promise((done) => server.close(done));
  }
});

// ---------------------------------------------------------------------------------------------
// The deposit in the base
// ---------------------------------------------------------------------------------------------

const row = (id: string, overrides: Partial<GistRow> = {}): GistRow => ({
  id,
  text: said(id),
  read_on: '2026-11-16',
  ...pinOf(measure(id)),
  ...overrides,
});
const ROWS: readonly GistRow[] = [row(LIBRARY), row(BUSES), row(BOOKMOBILES), row(TREES)];
const CHECKS = { minOverlap: 0.5, texts: TEXTS };

const metaOf = (db: LocalD1): Record<string, string> =>
  Object.fromEntries(
    db.db
      .prepare('SELECT key, value FROM meta ORDER BY key')
      .all()
      .map((line) => [String(line['key']), String(line['value'])]),
  );
const countOf = (db: LocalD1, table: 'gists' | 'propositions'): number =>
  Number(db.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.['n']);

void test('the control of one sentence: the measure as the only candidate, a sub-measure under its lead', () => {
  assert.deepEqual(controlGist(LIBRARY, said(LIBRARY), TEXTS.get(LIBRARY) ?? '', 0.5), {
    ok: true,
    text: said(LIBRARY),
  });
  assert.equal(
    TEXTS.get(BOOKMOBILES),
    shownText('des bibliobus pour les villages', 'Créer un service public du prêt de livres :'),
  );
  // The words of the lead count for the sub-measure: it is read under it.
  assert.equal(
    controlGist(BOOKMOBILES, said(BOOKMOBILES), TEXTS.get(BOOKMOBILES) ?? '', 0.5).ok,
    true,
  );
  assert.deepEqual(
    controlGist(BOOKMOBILES, said(BOOKMOBILES), 'des bibliobus pour les villages', 0.9),
    {
      ok: false,
      rule: 'overlap',
    },
  );
  // One sentence of a screen: the control counts words, this bounds characters.
  const long = `Le programme prévoit une bibliothèque de quartier dans la ${'très '.repeat(60)}grande commune.`;
  assert.ok(long.length > MAX_GIST_CHARS);
  assert.equal(controlGist(LIBRARY, long, TEXTS.get(LIBRARY) ?? '', 0).ok, false);
  const packed = `Le programme prévoit une bibliothèque de quartier dans la commune de ${'x'.repeat(280)}.`;
  assert.deepEqual(controlGist(LIBRARY, packed, TEXTS.get(LIBRARY) ?? '', 0), {
    ok: false,
    rule: 'chars',
  });

  // What the page would refuse is refused here, by the page's own reader: one sentence it
  // does not take makes it drop the whole answer, the sentences beside it included.
  assert.equal(unservable(LIBRARY, said(LIBRARY)), null);
  assert.equal(unservable(LIBRARY, 'x'.repeat(MAX_GIST_CHARS)), null);
  assert.equal(unservable(LIBRARY, 'x'.repeat(MAX_GIST_CHARS + 1)), 'chars');
  for (const unseen of [0x0a, 0x09, 0x2028, 0x2029, 0xad, 0x200b, 0xfeff]) {
    const text = `Une phrase${String.fromCodePoint(unseen)}de deux lignes.`;
    assert.equal(unservable(LIBRARY, text), 'line', unseen.toString(16));
    // …for a fact: with it among others, the page reads nothing at all.
    const answer = {
      kind: 'gists',
      corpus: CORPUS,
      gists: [
        { id: TREES, text: said(TREES) },
        { id: LIBRARY, text },
      ],
      ai: false,
    };
    assert.equal(parseGistsResponse(answer), null);
  }
  assert.equal(unservable(LIBRARY, '   '), 'line');
  assert.equal(unservable('une mesure', said(LIBRARY)), 'line');
  // Every sentence the control returns is one the page takes.
  for (const [id, sentence] of Object.entries(SAID)) {
    const checked = controlGist(id, `  ${sentence}  `, TEXTS.get(id) ?? '', 0.5);
    assert.ok(checked.ok, id);
    assert.equal(unservable(id, checked.text), null, id);
  }
});

void test('what may not enter the base: another measure, another wording, a sentence the control refuses today', () => {
  assert.deepEqual(gistProblems(ROWS, MANIFEST, CHECKS), []);
  const problems = (rows: readonly GistRow[], checks = CHECKS): string[] =>
    gistProblems(rows, MANIFEST, checks);

  // Not a measure of the manifest: unknown, or the prose of a section.
  assert.deepEqual(problems([row(LIBRARY, { id: 'p9c9-s09-m09' })]), [
    'p9c9-s09-m09: not a measure of the manifest',
  ]);
  assert.deepEqual(problems([row(LIBRARY, { id: 'p1c1-s01-p01' })]), [
    'p1c1-s01-p01: not a measure of the manifest',
  ]);
  // Whatever stands in place of an identifier is not printed.
  assert.deepEqual(problems([row(LIBRARY, { id: said(LIBRARY) })]), [
    'a row: not a measure of the manifest',
  ]);
  // Read against another wording of the measure — or, for a sub-measure, of the one above it.
  assert.deepEqual(problems([row(LIBRARY, { measure_sha256: sha256('another wording') })]), [
    `${LIBRARY}: read against another state of its measure`,
  ]);
  assert.deepEqual(problems([row(BOOKMOBILES, { lead_sha256: sha256('another wording') })]), [
    `${BOOKMOBILES}: read against another state of its measure`,
  ]);
  const unpinned: GistRow = {
    id: BOOKMOBILES,
    text: said(BOOKMOBILES),
    read_on: '2026-11-16',
    measure_sha256: measure(BOOKMOBILES).sha256,
  };
  assert.deepEqual(problems([unpinned]), [
    `${BOOKMOBILES}: read against another state of its measure`,
  ]);
  // The book moved under a set that was read: only what moved is refused.
  const moved = manifestOf(
    BOOK.map((m) => (m.id === TREES ? { ...m, text: 'Planter 400 arbres fruitiers par an' } : m)),
  );
  assert.deepEqual(gistProblems(ROWS, moved, { minOverlap: 0.5 }), [
    `${TREES}: read against another state of its measure`,
  ]);

  // The control of today, with the rule that refuses — on this machine only: without the text
  // nothing is checked, and nothing is said to have passed.
  const denied = row(LIBRARY, { text: 'Le programme ne prévoit pas de bibliothèque payante.' });
  const numbered = row(TREES, {
    text: 'Le programme prévoit de planter 400 arbres fruitiers chaque année.',
  });
  assert.deepEqual(problems([denied, numbered]), [
    `${LIBRARY}: refused by the control today (negation)`,
    `${TREES}: refused by the control today (number)`,
  ]);
  assert.deepEqual(problems([denied, numbered], { minOverlap: 0.5 } as typeof CHECKS), []);
  // The threshold is the site's: a stricter one refuses what a looser one let through.
  assert.deepEqual(problems([row(TREES)], { ...CHECKS, minOverlap: 0.95 }), [
    `${TREES}: refused by the control today (overlap)`,
  ]);
  assert.deepEqual(problems([row(LIBRARY)], { minOverlap: 0.5, texts: new Map() }), [
    `${LIBRARY}: its measure is not on this machine`,
  ]);

  // One sentence of a screen, and each measure once. What the page would not show — too long,
  // on two lines, with a character nobody sees — is said once, and not handed to the control.
  assert.deepEqual(problems([row(LIBRARY, { text: '  ' })]), [`${LIBRARY}: no sentence`]);
  const long = `${said(LIBRARY).slice(0, -1)} ${'et encore '.repeat(30)}.`;
  assert.deepEqual(problems([row(LIBRARY, { text: long })]), [
    `${LIBRARY}: ${String(long.length)} characters, ${String(MAX_GIST_CHARS)} at most`,
  ]);
  for (const unseen of ['\n', String.fromCodePoint(0x2029), String.fromCodePoint(0x200d)]) {
    const broken = said(LIBRARY).replace(' de quartier', `${unseen}de quartier`);
    for (const checks of [CHECKS, { minOverlap: 0.5 } as typeof CHECKS]) {
      assert.deepEqual(problems([row(LIBRARY, { text: broken })], checks), [
        `${LIBRARY}: not one line the page would show`,
      ]);
    }
  }
  // What passes here is read by the page as the Worker will hand it out: all of it, as it is.
  const handed = ROWS.slice(0, MAX_GIST_IDS).map(({ id, text }) => ({ id, text }));
  assert.equal(handed.length, MAX_GIST_IDS);
  assert.deepEqual(
    parseGistsResponse({ kind: 'gists', corpus: CORPUS, gists: handed, ai: false }),
    { kind: 'gists', corpus: CORPUS, gists: handed, ai: false },
  );
  assert.deepEqual(problems([row(LIBRARY), row(TREES), row(LIBRARY)]), [
    `${LIBRARY}: twice in the set`,
  ]);
  // Two measures that are not the same text cannot be said by the same sentence.
  assert.deepEqual(
    problems([row(LIBRARY), row(TREES, { text: said(LIBRARY) })], {
      minOverlap: 0.5,
    } as typeof CHECKS),
    [`${TREES}: the sentence of ${LIBRARY}, word for word`],
  );
  assert.deepEqual(problems([row(LIBRARY, { read_on: 'yesterday' })]), [
    `${LIBRARY}: read on no day`,
  ]);

  // Nine words in a row of the book, wherever they come from, are the book: the sentence of a
  // measure that recites another one is refused, and the report names measures, not words.
  const leaks = buildLeakIndex(
    BOOK.map(({ id, text }) => ({ id, text })),
    Object.values(TITLES),
  );
  assert.deepEqual(gistProblems(ROWS, MANIFEST, { minOverlap: 0.5, leaks }), []);
  const recited = row(ORCHARDS, { text: `Le programme reprend ceci : ${BOOK[0]?.text ?? ''}.` });
  assert.deepEqual(gistProblems([recited], MANIFEST, { minOverlap: 0.5, leaks }), [
    `${ORCHARDS}: words of the book in a row (${LIBRARY})`,
  ]);
  // A report never holds what it reports.
  const everything = problems([
    denied,
    numbered,
    recited,
    row(LIBRARY, { id: said(LIBRARY) }),
  ]).join('\n');
  assert.equal(holdsBook(everything), null);
});

void test('the deposit of the sentences: its own rows, its own keys, stopped — and the text left as it was', async () => {
  const sql = gistsSql(ROWS, CORPUS, SCHEMA);
  const db = new LocalD1();
  db.exec(sql);
  assert.deepEqual(gistsBaseProblems(db, ROWS, MANIFEST), []);
  assert.deepEqual(metaOf(db), {
    gists: 'stopped',
    gists_corpus: CORPUS,
    gists_count: '4',
    gists_sha256: gistsFingerprint(ROWS),
  });
  // The fingerprint is of the set, not of the order it was written in — and of every field.
  assert.match(gistsFingerprint(ROWS), /^[0-9a-f]{64}$/);
  assert.equal(gistsFingerprint([...ROWS].reverse()), gistsFingerprint(ROWS));
  assert.notEqual(gistsFingerprint(ROWS.slice(1)), gistsFingerprint(ROWS));
  assert.notEqual(
    gistsFingerprint([row(LIBRARY, { read_on: '2026-11-17' }), ...ROWS.slice(1)]),
    gistsFingerprint(ROWS),
  );
  // Only what the table has a column for is deposited: the pin of a lead stays on this machine.
  assert.doesNotMatch(sql, new RegExp(sha256('Créer un service public du prêt de livres :')));
  // An apostrophe in a sentence is a character, not the end of it.
  assert.equal(
    db.db.prepare('SELECT text FROM gists WHERE id = ?').get(BUSES)?.['text'],
    "Le programme prévoit des transports scolaires gratuits jusqu'à 16 ans.",
  );

  // As the Worker reads it: nothing while the sentences are stopped…
  const ids = ROWS.map((line) => line.id);
  assert.deepEqual((await loadGists(db, ids, CORPUS)).gists, []);
  // …and, once the editor opens them, the sentences read — in the order asked.
  assert.equal(switchSql('open', 'gists'), "UPDATE meta SET value = 'open' WHERE key = 'gists'");
  db.exec(switchSql('open', 'gists') ?? '');
  assert.deepEqual((await loadGists(db, [TREES, ORCHARDS, LIBRARY], CORPUS)).gists, [
    { id: TREES, text: said(TREES) },
    { id: LIBRARY, text: said(LIBRARY) },
  ]);

  // What a check on SQLite catches: a row that is not the one kept, a description that lies.
  const tampered = (change: string): string[] => {
    const copy = new LocalD1();
    copy.exec(sql);
    copy.exec(change);
    return gistsBaseProblems(copy, ROWS, MANIFEST);
  };
  assert.deepEqual(tampered(`UPDATE gists SET text = 'Autre chose.' WHERE id = '${TREES}'`), [
    `${TREES}: not the sentence that was kept`,
    'gists_sha256 is not the fingerprint of the rows',
  ]);
  assert.deepEqual(tampered(`DELETE FROM gists WHERE id = '${TREES}'`), [
    '3 rows, 4 sentences kept',
    'gists_count is not the number of rows',
    'gists_sha256 is not the fingerprint of the rows',
  ]);
  assert.deepEqual(tampered("UPDATE meta SET value = 'open' WHERE key = 'gists'"), [
    'the sentences do not start stopped',
  ]);
  assert.deepEqual(
    tampered("UPDATE meta SET value = 'bbbbbbbbbbbbbbbb' WHERE key = 'gists_corpus'"),
    ['the sentences are not at the corpus version of the manifest'],
  );
  assert.deepEqual(tampered('CREATE TABLE notes (id TEXT)'), [
    'tables: gists, meta, notes, propositions',
  ]);
  // No sentence kept yet: an empty set is a deposit too.
  const empty = new LocalD1();
  empty.exec(gistsSql([], CORPUS, SCHEMA));
  assert.deepEqual(gistsBaseProblems(empty, [], MANIFEST), []);
  assert.equal(metaOf(empty)['gists_count'], '0');
});

void test('each deposit owns its rows and its keys: the text does not erase the sentences, nor the reverse', () => {
  const db = new LocalD1();
  db.exec(seedSql(PRIVATE, SCHEMA, 'stopped'));
  // The text alone: the base is the one the manifest publishes the fingerprints of.
  assert.deepEqual(baseProblems(db, MANIFEST), []);
  assert.deepEqual(metaOf(db), { ask: 'stopped', corpus_version: CORPUS, propositions: '6' });
  db.exec(switchSql('open') ?? '');
  db.exec(gistsSql(ROWS, CORPUS, SCHEMA));
  db.exec(switchSql('open', 'gists') ?? '');
  const both = {
    ask: 'open',
    corpus_version: CORPUS,
    gists: 'open',
    gists_corpus: CORPUS,
    gists_count: '4',
    gists_sha256: gistsFingerprint(ROWS),
    propositions: '6',
  };
  assert.deepEqual(metaOf(db), both);
  assert.deepEqual([countOf(db, 'propositions'), countOf(db, 'gists')], [6, 4]);

  // The text is deposited again: its own switch starts stopped again — and not a key, not a
  // row of the sentences has moved. (It used to empty the whole description.)
  db.exec(seedSql(PRIVATE, SCHEMA, 'stopped'));
  assert.deepEqual(metaOf(db), { ...both, ask: 'stopped' });
  assert.deepEqual([countOf(db, 'propositions'), countOf(db, 'gists')], [6, 4]);
  assert.deepEqual(baseProblems(db, MANIFEST), []);

  // The sentences are deposited again, one fewer: they start stopped, and the text stays.
  db.exec(switchSql('open') ?? '');
  db.exec(gistsSql(ROWS.slice(0, 3), CORPUS, SCHEMA));
  assert.deepEqual(metaOf(db), {
    ...both,
    gists: 'stopped',
    gists_count: '3',
    gists_sha256: gistsFingerprint(ROWS.slice(0, 3)),
  });
  assert.deepEqual([countOf(db, 'propositions'), countOf(db, 'gists')], [6, 3]);
  assert.deepEqual(baseProblems(db, MANIFEST), []);
  assert.deepEqual(gistsBaseProblems(db, ROWS.slice(0, 3), MANIFEST), []);

  // Each switch moves alone, and only between its two positions.
  assert.equal(switchSql('stopped'), "UPDATE meta SET value = 'stopped' WHERE key = 'ask'");
  assert.equal(switchSql('open', 'ask'), "UPDATE meta SET value = 'open' WHERE key = 'ask'");
  db.exec(switchSql('stopped') ?? '');
  db.exec(switchSql('open', 'gists') ?? '');
  assert.deepEqual([metaOf(db)['ask'], metaOf(db)['gists']], ['stopped', 'open']);
  for (const [flip, what] of [
    ['on', 'ask'],
    ['open', 'propositions'],
    ['open', "ask' OR 1=1 --"],
    ["open' --", 'gists'],
    ['', 'gists'],
  ] as const) {
    assert.equal(switchSql(flip, what), null, `${flip} ${what}`);
  }
  // The text of the deposit says what it deletes: its keys by name, never the table.
  for (const deposit of [seedSql(PRIVATE, SCHEMA, 'stopped'), gistsSql(ROWS, CORPUS, SCHEMA)]) {
    assert.doesNotMatch(deposit, /DELETE FROM meta;/);
    assert.match(deposit, /DELETE FROM meta WHERE key IN \('[a-z0-9_]+'(?:, '[a-z0-9_]+')+\);/);
  }
});

void test('the text is taken out of a base: its rows and its keys go — the sentences stay, and are still served', async () => {
  const db = new LocalD1();
  db.exec(seedSql(PRIVATE, SCHEMA, 'stopped'));
  db.exec(switchSql('open') ?? '');
  db.exec(gistsSql(ROWS, CORPUS, SCHEMA));
  db.exec(switchSql('open', 'gists') ?? '');
  assert.deepEqual([countOf(db, 'propositions'), countOf(db, 'gists')], [6, 4]);
  const before = await loadGists(db, [ROWS[0]?.id ?? '', ROWS[1]?.id ?? ''], CORPUS);
  assert.equal(before.gists.length, 2);

  db.exec(textWithdrawalSql());
  // Nothing of the book is left, nor anything that described it…
  assert.deepEqual([countOf(db, 'propositions'), countOf(db, 'gists')], [0, 4]);
  assert.deepEqual(metaOf(db), {
    gists: 'open',
    gists_corpus: CORPUS,
    gists_count: '4',
    gists_sha256: gistsFingerprint(ROWS),
  });
  // …a Worker that asked for a measure would read none, and say "local"…
  const measures = await loadMeasures(db, [ROWS[0]?.id ?? '']);
  assert.equal(measures.state.open, false);
  assert.equal(measures.state.corpusVersion, null);
  assert.deepEqual(measures.candidates, []);
  // …and the sentences are served exactly as before.
  assert.deepEqual(await loadGists(db, [ROWS[0]?.id ?? '', ROWS[1]?.id ?? ''], CORPUS), before);
  // Done twice, it changes nothing; and the text can be deposited again on top.
  db.exec(textWithdrawalSql());
  assert.deepEqual([countOf(db, 'propositions'), countOf(db, 'gists')], [0, 4]);
  db.exec(seedSql(PRIVATE, SCHEMA, 'stopped'));
  assert.deepEqual([countOf(db, 'propositions'), countOf(db, 'gists')], [6, 4]);
  assert.deepEqual(baseProblems(db, MANIFEST), []);
  // What it deletes is named: its own keys, never the whole description, never the sentences.
  const sql = textWithdrawalSql();
  assert.doesNotMatch(sql, /DELETE FROM meta;|gists/);
  assert.match(sql, /DELETE FROM meta WHERE key IN \('corpus_version', 'propositions', 'ask'\);/);
});

void test('nothing the tool prints holds a word of a measure, nor a sentence', async () => {
  const printed: string[] = [];
  // A session with everything that can happen in one: sentences, refusals, a silent model.
  const story = session({
    ...STORY,
    says: (id, writer, variant) =>
      id === ORCHARDS ? null : (STORY.says?.(id, writer, variant) ?? null),
  });
  const result = await writeSession(story.options);
  printed.push(...story.printed, JSON.stringify(result));
  // The status of that session, read back.
  const verdicts = lastVerdicts([
    verdict(LIBRARY),
    linkOnly(TREES),
    verdict(LENDING, { text: 'Le programme ne prévoit pas de prêt de livres payant.' }),
  ]);
  const known = knowledge(MEASURES, story.recorded, verdicts, recheckWith(TEXTS, 0.5));
  printed.push(...statusLines(CORPUS, statusOf(MEASURES, story.recorded, known), agreement(known)));
  // The desk: what it says in the terminal, and what it answers to a choice.
  const { deps, printed: said_ } = desk();
  const answers = [
    post(deps, { id: LIBRARY, action: 'read', writer: 'gemma-4-26b', text: said(LIBRARY) }),
    post(deps, { id: TREES, action: 'correct', text: BOOK[4]?.text ?? '' }),
    post(deps, { id: BUSES, action: 'link-only' }),
    post(deps, { id: BOOKMOBILES, action: 'correct', text: said(BOOKMOBILES) }),
  ];
  printed.push(...said_, ...answers.map((response) => response.body));
  assert.ok(printed.length > 20);
  assert.equal(holdsBook(printed.join('\n')), null);
  // …while the page itself does hold the text: that is what it is for, and why it stays local.
  assert.equal(holdsBook(deskPage(deps)), TREES);
  assert.equal(measureLabel(measure(LIBRARY)), 'Mesure clé');
});

// ---------------------------------------------------------------------------------------------
// The sentences of the session (D16.57, D16.58): its verdicts say who read, and nobody else
// ---------------------------------------------------------------------------------------------

/** What `--take` is given: the invented book, its text on this machine, no verdict yet. */
const takeDeps = (verdicts: readonly VerdictLine[] = []): Parameters<typeof takeSession>[1] => ({
  measures: MEASURES,
  texts: measureTexts(PRIVATE),
  verdicts: lastVerdicts(verdicts),
  minOverlap: 0.5,
  today: '2026-11-14',
});

void test('a file of the session reads as « id | sentence », or « id | LINK » for the link alone', () => {
  const read = parseTaken(`${LIBRARY} | ${said(LIBRARY)}\n\n${BUSES} | LINK\n`);
  assert.deepEqual(read, [
    { id: LIBRARY, text: said(LIBRARY) },
    { id: BUSES, text: null },
  ]);
  // A line that does not read gives its number, and nothing of what it holds.
  assert.deepEqual(parseTaken(`${LIBRARY} | ${said(LIBRARY)}\nune ligne sans barre\n`), {
    line: 2,
  });
  assert.deepEqual(parseTaken(`${LIBRARY} | \n`), { line: 1 });
});

void test('what the session wrote becomes verdicts that name the session twice — writer, and reader', () => {
  const result = takeSession(
    [
      { id: LIBRARY, text: said(LIBRARY) },
      { id: BOOKMOBILES, text: said(BOOKMOBILES) },
      { id: ORCHARDS, text: null },
    ],
    takeDeps(),
  );
  assert.deepEqual(result.refused, []);
  assert.equal(result.lines.length, 3);
  for (const line of result.lines) {
    assert.equal(line.by, SESSION);
    assert.equal(readerOf(line), SESSION);
    assert.equal(line.read_on, '2026-11-14');
    assert.ok(pinned(line, measure(line.id)), `${line.id} is pinned to its measure`);
    // Every line is one the file reads back, with its reader.
    assert.deepEqual(parseVerdictLine(JSON.parse(JSON.stringify(line))), line);
  }
  const [library, bookmobiles, orchards] = result.lines;
  assert.ok(library !== undefined);
  assert.equal(library.writer, SESSION);
  assert.equal(library.text, said(LIBRARY));
  // A sub-measure carries the pin of the measure it details, like a verdict of the desk.
  assert.equal(bookmobiles?.lead_sha256, measure(LENDING).sha256);
  assert.deepEqual(
    { verdict: orchards?.verdict, writer: orchards?.writer, text: orchards?.text },
    { verdict: 'link-only', writer: null, text: null },
  );
});

void test('one line the control refuses, and nothing of the file is kept', () => {
  const result = takeSession(
    [
      { id: LIBRARY, text: said(LIBRARY) },
      { id: BUSES, text: ASTRAY },
      { id: 'p9c9-s99-m99', text: said(TREES) },
      { id: LIBRARY, text: said(LIBRARY) },
      { id: 'des mots à la place', text: said(TREES) },
    ],
    takeDeps(),
  );
  assert.deepEqual(result.lines, []);
  // Names of rules and identifiers of the book — never a sentence, never what stood for an id.
  assert.deepEqual(result.refused, [
    { id: BUSES, rule: 'overlap' },
    { id: 'p9c9-s99-m99', rule: 'id' },
    { id: LIBRARY, rule: 'twice' },
    { id: '(not an identifier)', rule: 'id' },
  ]);
});

void test('a sentence is taken only against the text the manifest publishes the fingerprint of', () => {
  const moved = corpusOf(
    BOOK.map((item) => (item.id === TREES ? { ...item, text: `${item.text} et des haies` } : item)),
  );
  const result = takeSession([{ id: TREES, text: said(TREES) }], {
    ...takeDeps(),
    texts: measureTexts(moved),
  });
  assert.deepEqual(result, { lines: [], same: 0, refused: [{ id: TREES, rule: 'pin' }] });
});

void test('taking the same file twice writes nothing the second time', () => {
  const taken = [
    { id: LIBRARY, text: said(LIBRARY) },
    { id: ORCHARDS, text: null },
  ];
  const first = takeSession(taken, takeDeps());
  const again = takeSession(taken, takeDeps(first.lines));
  assert.deepEqual({ lines: again.lines, same: again.same }, { lines: [], same: 2 });
  // A verdict of the editor on the same measure is not « the same »: the session's replaces it,
  // and the tool can count it before anything is written.
  const over = takeSession(taken, takeDeps([verdict(LIBRARY, { text: said(LIBRARY) })]));
  assert.equal(over.lines.length, 2);
  assert.equal(readerOf(verdict(LIBRARY)), EDITOR);
});

void test('the file of verdicts names one reader besides the editor, and no other', () => {
  const line = { ...verdict(LIBRARY), by: SESSION };
  assert.equal(parseVerdictLine(line)?.by, SESSION);
  assert.equal(parseVerdictLine({ ...line, by: 'editor' }), null);
  assert.equal(parseVerdictLine({ ...line, by: 'gemma-4-26b' }), null);
  assert.equal(parseVerdictLine({ ...line, by: 'un relecteur humain' }), null);
  // A line of the reading desk has no reader written: it is the editor's.
  assert.equal(parseVerdictLine(verdict(LIBRARY))?.by, undefined);
});

void test('what would enter the base says who read it: the editor, the session, or both', () => {
  const mine = takeSession(
    MEASURES.map(({ id }) => ({ id, text: id === ORCHARDS ? null : said(id) })),
    takeDeps(),
  ).lines;
  const recheck = recheckWith(TEXTS, 0.5);
  const all = validated(MEASURES, lastVerdicts(mine), recheck);
  assert.equal(all.rows.length, MEASURES.length - 1);
  assert.equal(all.bySession, MEASURES.length);
  assert.equal(readBy(all), SESSION);
  const his = validated(MEASURES, lastVerdicts(MEASURES.map(({ id }) => verdict(id))), recheck);
  assert.equal(readBy(his), EDITOR);
  // The editor reads one of them again on his desk: the last line wins, and it is his.
  const mixed = validated(MEASURES, lastVerdicts([...mine, verdict(LIBRARY)]), recheck);
  assert.equal(mixed.bySession, MEASURES.length - 1);
  assert.equal(readBy(mixed), 'both');
  assert.equal(readBy(validated(MEASURES, new Map(), recheck)), null);
});

void test('the status counts the verdicts of the session apart, and says what it is', () => {
  const mine = takeSession(
    [
      { id: LIBRARY, text: said(LIBRARY) },
      { id: BUSES, text: said(BUSES) },
    ],
    takeDeps(),
  ).lines;
  const verdicts = lastVerdicts([...mine, verdict(TREES)]);
  const known = knowledge(MEASURES, [], verdicts, recheckWith(TEXTS, 0.5));
  const status = statusOf(MEASURES, [], known);
  assert.equal(status.read, 3);
  assert.equal(status.bySession, 2);
  const lines = statusLines(CORPUS, status, agreement(known));
  assert.ok(
    lines.some((line) =>
      /2 of these verdicts are the session's — an AI — and 1 the editor's/.test(line),
    ),
    lines.join('\n'),
  );
  // No line of the status carries a sentence.
  for (const line of lines) assert.equal(holdsBook(line), null, line);
});
