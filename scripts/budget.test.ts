/**
 * The allowance of the model (src/worker/budget-core.ts, budget.ts; D7.4): twenty-four hours
 * that roll, and a breaker for the day the platform says no.
 *
 * What was measured on 13 and 14 November 2026 is what these tests hold. The free allowance
 * did not come back at 00:00 UTC — so 23:30 and 00:30 weigh together here. And once it was
 * used up the platform answered 429 to every call, each of which went on being counted as if
 * it had been billed, and went on being made — so a 429 gives its reservation back, and closes
 * the model for thirty minutes.
 *
 * Three levels, none of which needs a network or a deployment: the arithmetic; the Durable
 * Object exactly as it is written, on Node's SQLite; and the Worker itself, asked the way the
 * bench asks it, in front of a model that is a function of this file. Every measure, every
 * sentence and every number here is INVENTED.
 *
 * Run: npx tsx --test scripts/budget.test.ts
 */
import assert from 'node:assert/strict';
import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import {
  BREAKER_MS,
  DEFAULT_HARD_STOP,
  EMPTY,
  MAX_RESERVATION,
  WINDOW_HOURS,
  close,
  hasRoom,
  hourOf,
  isClosed,
  prune,
  release,
  reserve,
  settle,
  usedAt,
  type BudgetState,
} from '../src/worker/budget-core.js';
import { MODELS, type ModelKey } from '../src/worker/models.js';
import { LocalD1 } from './d1-local.js';

/** An instant of November 2026, UTC. */
const utc = (day: number, hour: number, minute = 0): number =>
  Date.UTC(2026, 10, day, hour, minute);

/** A ledger written by hand: neurons, under the hour of the instant they were counted at. */
const counted = (...entries: [at: number, neurons: number][]): BudgetState => ({
  hours: new Map(entries.map(([at, neurons]) => [hourOf(at), neurons])),
  closedUntil: 0,
});

// ---------------------------------------------------------------------------------------------
// The arithmetic
// ---------------------------------------------------------------------------------------------

void test('the allowance knows no midnight: 23:30 and 00:30 UTC weigh together', () => {
  const before = utc(13, 23, 30);
  const after = utc(14, 0, 30);
  let state = reserve(EMPTY, 60, before).state;
  state = reserve(state, 60, after).state;
  assert.equal(usedAt(state, after), 120);

  // The night that was measured: an evening of bench, then more of it after midnight. The
  // counter that went back to zero at 00:00 UTC let the second half through; this one does not.
  const evening = counted([before, 8_460]);
  assert.equal(usedAt(evening, after), 8_460);
  assert.equal(reserve(evening, 60, after).allowed, false);
  assert.equal(reserve(evening, 40, after).allowed, true);
});

void test('an hour weighs until all of it is twenty-four hours old — never less', () => {
  const spent = utc(13, 12, 30);
  const state = counted([spent, 500]);
  assert.equal(usedAt(state, spent), 500);
  // Twenty-four hours on, to the minute, it still weighs: the hour may have been spent at 12:59.
  assert.equal(usedAt(state, utc(14, 12, 30)), 500);
  assert.equal(usedAt(state, utc(14, 13, 0) - 1), 500);
  // At 13:00 the next day every instant of that hour is a day old: it has left the window.
  assert.equal(usedAt(state, utc(14, 13, 0)), 0);

  // What has left the window is dropped at the next call — that, and nothing else.
  const two = counted([spent, 500], [utc(13, 13, 5), 70]);
  assert.deepEqual(prune(two, utc(14, 13, 0)), counted([utc(13, 13, 5), 70]));
  assert.equal(prune(two, utc(14, 12, 59)), two, 'nothing to drop: the same object');

  // However long the site has run, the ledger holds the current hour and the twenty-four
  // before it: an hour and a number, twenty-five times at most.
  let ledger = EMPTY;
  for (let at = utc(10, 0, 10); at <= utc(14, 9, 10); at += 3_600_000) {
    ledger = reserve(ledger, 10, at).state;
  }
  assert.equal(ledger.hours.size, WINDOW_HOURS + 1);
  assert.equal(usedAt(ledger, utc(14, 9, 10)), 10 * (WINDOW_HOURS + 1));
  // An hour ahead of the clock — a clock that stepped back — weighs too: it is recent.
  assert.equal(usedAt(counted([utc(14, 10, 0), 30]), utc(14, 9, 59)), 30);
});

void test('reserved whole or not at all against the stop — and again once old hours have left', () => {
  const morning = utc(13, 10, 15);
  const evening = utc(13, 20, 45);
  const full = counted([morning, 4_000], [evening, 4_480]);
  const at = utc(13, 21, 0);
  // The stop is not crossed, even by a little, and what does not fit is not reserved in part.
  const over = reserve(full, 60, at);
  assert.equal(over.allowed, false);
  assert.equal(usedAt(over.state, at), 8_480);
  // Up to the stop, to the neuron.
  const exact = reserve(full, 20, at);
  assert.equal(exact.allowed, true);
  assert.equal(usedAt(exact.state, at), DEFAULT_HARD_STOP);

  // Midnight changes nothing, nor the hours after it…
  assert.equal(reserve(full, 60, utc(14, 0, 0)).allowed, false);
  assert.equal(reserve(full, 60, utc(14, 10, 59)).allowed, false);
  // …the hour of the morning leaving the window does: at 11:00 the next day.
  const again = reserve(full, 60, utc(14, 11, 0));
  assert.equal(again.allowed, true);
  assert.equal(usedAt(again.state, utc(14, 11, 0)), 4_540);
  assert.deepEqual(again.state, counted([evening, 4_480], [utc(14, 11, 0), 60]));

  // The Worker passes its own stop (NEURON_HARD_STOP); one that is not a number refuses
  // everything, where a comparison written the other way round would refuse nothing.
  assert.equal(reserve(full, 60, at, 9_000).allowed, true);
  assert.equal(reserve(EMPTY, 60, at, Number.NaN).allowed, false);
  // A reservation that is not a plausible cost is refused: a bound on a bug.
  for (const amount of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, MAX_RESERVATION + 1]) {
    assert.equal(reserve(EMPTY, amount, at).allowed, false, String(amount));
  }
});

void test('settled at what it cost: less, more — or the reservation, when nobody says', () => {
  const noon = utc(13, 12, 0);
  const { state } = reserve(EMPTY, 60, noon);
  // An answer from the cache costs nothing; a cheaper one than estimated gives the rest back.
  assert.equal(usedAt(settle(state, 60, 0, noon), noon), 0);
  assert.equal(usedAt(settle(state, 60, 12.5, noon), noon), 12.5);
  // A dearer one than estimated is counted for what it cost.
  assert.equal(usedAt(settle(state, 60, 75, noon), noon), 75);
  // A cost nobody states is the reservation itself.
  for (const unknown of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
    assert.equal(usedAt(settle(state, 60, unknown, noon), noon), 60, String(unknown));
  }
  // What was never a reservation settles nothing — and cannot turn the count into no number.
  for (const odd of [0, -60, Number.NaN, MAX_RESERVATION + 1]) {
    assert.equal(usedAt(settle(state, odd, 0, noon), noon), 60, String(odd));
  }
  // Never below zero, and an hour that holds nothing is not kept.
  assert.equal(usedAt(settle(EMPTY, 60, 0, noon), noon), 0);
  assert.equal(settle(state, 60, 0, noon).hours.size, 0);
});

void test('released whole — where it was reserved, even when the hour has turned since', () => {
  const noon = utc(13, 12, 0);
  const others = counted([utc(13, 9, 0), 1_000]);
  const held = reserve(others, 55, noon).state;
  assert.equal(usedAt(held, noon), 1_055);
  assert.deepEqual(release(held, 55, noon + 100), others);

  // Reserved at 12:59:58, refused by the platform at 13:00:01: the reservation sits in the
  // hour before, and it is from there that it goes back.
  const late = utc(13, 12, 59) + 58_000;
  assert.deepEqual(release(reserve(others, 55, late).state, 55, late + 3_000), others);
  // The same while someone else reserved in the new hour: the total is exact.
  let state = reserve(others, 55, late).state;
  state = reserve(state, 40, late + 2_500).state;
  state = release(state, 55, late + 3_000);
  assert.equal(usedAt(state, late + 3_000), 1_040);
  // Never more than there is.
  assert.equal(usedAt(release(EMPTY, 55, noon), noon), 0);
  assert.equal(usedAt(release(others, 400, noon), noon), 600);
});

void test('the breaker: closed, nothing is reserved; reopened, the next reservation is the probe', () => {
  const refused = utc(14, 0, 36);
  const until = refused + BREAKER_MS;
  assert.equal(BREAKER_MS, 30 * 60_000);
  const closed = close(counted([utc(13, 23, 0), 1_200]), until);
  assert.equal(isClosed(closed, refused), true);
  // Closed: no reservation, however much room the ledger believes it has…
  const during = reserve(closed, 60, until - 1);
  assert.equal(during.allowed, false);
  assert.equal(usedAt(during.state, until - 1), 1_200);
  assert.equal(during.state.closedUntil, until);
  // …while what was reserved before it closed is still settled, or given back.
  assert.equal(usedAt(settle(closed, 60, 0, refused + 1_000), refused + 1_000), 1_140);

  // Thirty minutes on it reopens by itself, and the next reservation goes through: the probe.
  assert.equal(isClosed(closed, until), false);
  const probe = reserve(closed, 60, until);
  assert.equal(probe.allowed, true);
  assert.equal(probe.state.closedUntil, 0, 'an instant that has passed is not kept');
  // Refused again by the platform, it closes again — from then, for as long.
  const again = close(probe.state, until + 200 + BREAKER_MS);
  assert.equal(reserve(again, 60, until + BREAKER_MS).allowed, false);
  assert.equal(reserve(again, 60, until + 200 + BREAKER_MS).allowed, true);

  // A breaker closed for longer is not shortened; what is not an instant closes nothing.
  assert.equal(close(closed, until - 60_000), closed);
  assert.equal(close(closed, Number.NaN), closed);
  assert.equal(close(closed, until + 60_000).closedUntil, until + 60_000);
});

void test('asking whether there is room reserves nothing — and says no at the stop, or when closed', () => {
  const noon = utc(14, 12);
  const state = counted([utc(14, 9), DEFAULT_HARD_STOP - 150]);
  assert.equal(hasRoom(state, 100, noon), true);
  // Asked a hundred times, the ledger has not moved: nothing was set aside.
  for (let i = 0; i < 100; i += 1) hasRoom(state, 100, noon);
  assert.equal(usedAt(state, noon), DEFAULT_HARD_STOP - 150);
  assert.equal(reserve(state, 100, noon).allowed, true);
  // At the stop — not across it by a neuron — and never for an amount that is not one.
  assert.equal(hasRoom(state, 150, noon), true);
  assert.equal(hasRoom(state, 151, noon), false);
  for (const amount of [0, -1, Number.NaN, MAX_RESERVATION + 1]) {
    assert.equal(hasRoom(state, amount, noon), false, String(amount));
  }
  // Closed by the platform's refusal: no room, whatever the ledger says — until it reopens.
  const closed = close(EMPTY, noon + BREAKER_MS);
  assert.equal(hasRoom(closed, 100, noon), false);
  assert.equal(hasRoom(closed, 100, noon + BREAKER_MS), true);
  // What is twenty-four hours old no longer counts.
  const old = counted([utc(13, 9), DEFAULT_HARD_STOP]);
  assert.equal(hasRoom(old, 100, utc(14, 9, 59)), false);
  assert.equal(hasRoom(old, 100, utc(14, 10)), true);
});

void test('nothing is changed in place: every call returns another state', () => {
  const noon = utc(13, 12, 0);
  const state = close(counted([noon, 100], [utc(12, 9, 0), 40]), noon + BREAKER_MS);
  const copy = (): BudgetState => ({ hours: new Map(state.hours), closedUntil: state.closedUntil });
  const kept = copy();
  reserve(state, 60, noon + BREAKER_MS);
  settle(state, 60, 0, noon);
  settle(state, 60, 90, noon);
  release(state, 100, noon);
  close(state, noon + 2 * BREAKER_MS);
  prune(state, utc(20, 0, 0));
  assert.deepEqual(state, kept);
  assert.deepEqual(EMPTY, { hours: new Map(), closedUntil: 0 });
});

// ---------------------------------------------------------------------------------------------
// The Durable Object, as it is written, on Node's SQLite
// ---------------------------------------------------------------------------------------------

// budget.ts extends the base class of a Durable Object, which only the Workers runtime has.
// Node is shown a stand-in for that one module — before the Worker is imported, just below.
registerHooks({
  resolve: (specifier, context, nextResolve) =>
    specifier === 'cloudflare:workers'
      ? {
          url: new URL('./fixtures/cloudflare-workers.ts', import.meta.url).href,
          shortCircuit: true,
        }
      : nextResolve(specifier, context),
});

// The Worker compares the key of the bench in constant time with a method Workers add to
// WebCrypto; Node keeps the same comparison under node:crypto.
Object.defineProperty(crypto.subtle, 'timingSafeEqual', {
  configurable: true,
  value: (a: ArrayBuffer, b: ArrayBuffer): boolean =>
    timingSafeEqual(new Uint8Array(a), new Uint8Array(b)),
});

/** The methods of the object, as the Worker calls them over RPC. */
interface Budget {
  reserve(amount: number, hardStop?: number): boolean;
  settle(reserved: number, spent: number): void;
  release(reserved: number): void;
  close(): void;
  available(amount: number, hardStop?: number): boolean;
  used(): number;
}

type Binding = number | string | null;

/**
 * What budget.ts asks of the state of a Durable Object: SQL that runs at once, an alarm that
 * can be deleted, and a constructor the runtime waits for.
 */
class LocalObjectState {
  readonly db = new DatabaseSync(':memory:');
  /** The alarm the object holds, as the runtime keeps it: an instant, or none. */
  alarm: number | null = null;
  /** Rows written since the object exists: the free plan counts them. */
  written = 0;
  /** Settled once the constructor has finished: the runtime delivers nothing before. */
  ready: Promise<unknown> = Promise.resolve();

  readonly storage = {
    sql: {
      exec: (query: string, ...bindings: Binding[]): { toArray: () => unknown[] } => {
        const statement = this.db.prepare(query);
        if (/^\s*SELECT\b/.test(query)) {
          const rows = statement.all(...bindings).map((row) => ({ ...row }));
          return { toArray: () => rows };
        }
        const { changes } = statement.run(...bindings);
        // Creating or dropping a table leaves SQLite's count where the last write put it.
        if (/^\s*(?:INSERT|UPDATE|DELETE)\b/.test(query)) this.written += Number(changes);
        return { toArray: () => [] };
      },
    },
    deleteAlarm: (): Promise<void> => {
      this.alarm = null;
      return Promise.resolve();
    },
  };

  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T> {
    const done = callback();
    this.ready = done;
    return done;
  }

  tables(): string[] {
    return this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => String(row['name']));
  }

  columns(table: 'ledger' | 'breaker'): string[] {
    return this.db
      .prepare(`SELECT name FROM pragma_table_info('${table}') ORDER BY cid`)
      .all()
      .map((row) => String(row['name']));
  }

  rows(table: 'ledger' | 'breaker'): Record<string, unknown>[] {
    return this.db
      .prepare(`SELECT * FROM ${table} ORDER BY 1`)
      .all()
      .map((row) => ({ ...row }));
  }
}

interface WorkerModule {
  default: { fetch(request: Request, env: unknown): Promise<Response> };
  NeuronBudget: new (state: LocalObjectState, env: unknown) => Budget;
}

// By a name TypeScript does not follow: the Worker is typed by its own configuration
// (src/worker/tsconfig.json), with the types of the platform, and checked there.
const WORKER = '../src/worker/index.ts';
let loaded: Promise<WorkerModule> | undefined;
const worker = (): Promise<WorkerModule> => (loaded ??= import(WORKER) as Promise<WorkerModule>);

/** The object as the runtime wakes it: constructed over its storage, then waited for. */
async function wake(state: LocalObjectState): Promise<Budget> {
  const { NeuronBudget } = await worker();
  const budget = new NeuronBudget(state, {});
  await state.ready;
  return budget;
}

void test('the object: two tables of numbers — the row of the UTC day and its alarm are gone', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: utc(14, 15, 20) });
  const state = new LocalObjectState();
  // As the object deployed on 13 November left it: one row for the UTC day, an alarm at midnight.
  state.db.exec(
    `CREATE TABLE budget (id INTEGER PRIMARY KEY CHECK (id = 1), day TEXT NOT NULL, used REAL NOT NULL)`,
  );
  state.db.prepare('INSERT INTO budget (id, day, used) VALUES (1, ?, ?)').run('2026-11-14', 5_190);
  state.alarm = utc(15, 0);

  const budget = await wake(state);
  assert.deepEqual(state.tables(), ['breaker', 'ledger']);
  assert.equal(state.alarm, null, 'no alarm: nothing happens at midnight any more');
  assert.equal(budget.used(), 0);

  // An hour and a number; an instant. Nothing else has a column to be written in.
  assert.deepEqual(state.columns('ledger'), ['hour', 'used']);
  assert.deepEqual(state.columns('breaker'), ['id', 'closed_until']);
  assert.equal(budget.reserve(60), true);
  assert.deepEqual(state.rows('ledger'), [{ hour: hourOf(utc(14, 15, 20)), used: 60 }]);
  budget.settle(60, 12.5);
  assert.deepEqual(state.rows('ledger'), [{ hour: hourOf(utc(14, 15, 20)), used: 12.5 }]);
  assert.deepEqual(state.rows('breaker'), []);

  // Woken a second time, it finds its tables and leaves them as they are.
  assert.equal((await wake(state)).used(), 12.5);
  assert.deepEqual(state.tables(), ['breaker', 'ledger']);
});

void test('the object remembers across midnight, and writes one row for what one call changed', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: utc(13, 23, 30) });
  const state = new LocalObjectState();
  let budget = await wake(state);
  for (let i = 0; i < 21; i += 1) assert.equal(budget.reserve(400), true);
  assert.equal(budget.used(), 8_400);
  assert.equal(state.written, 21, 'one row a reservation');

  // Half past midnight, and the object was put to sleep in between: nothing went back to zero.
  t.mock.timers.setTime(utc(14, 0, 30));
  budget = await wake(state);
  assert.equal(budget.used(), 8_400);
  assert.equal(budget.reserve(60), true);
  assert.equal(budget.reserve(60), false, '8 520 would cross the stop');
  assert.equal(budget.used(), 8_460);
  assert.equal(state.written, 22, 'a refusal writes nothing');
  budget.settle(60, 47.5);
  assert.equal(state.written, 23, 'one row a settlement');
  assert.equal(budget.reserve(60, 9_000), true, 'the stop is the one the Worker passes');
  assert.equal(budget.used(), 8_507.5);

  // The evening of the 13th weighs until its hour is a day old: 00:00 on the 15th.
  t.mock.timers.setTime(utc(14, 23, 59));
  assert.equal(budget.used(), 8_507.5);
  t.mock.timers.setTime(utc(15, 0, 0));
  assert.equal(budget.used(), 107.5);
  // Its row goes with the next call that writes, and the ledger is two hours long again.
  assert.equal(budget.reserve(60), true);
  assert.deepEqual(state.rows('ledger'), [
    { hour: hourOf(utc(14, 0, 30)), used: 107.5 },
    { hour: hourOf(utc(15, 0, 0)), used: 60 },
  ]);
});

void test('the object, refused by the platform: given back, closed thirty minutes, tried again', async (t) => {
  const refused = utc(14, 0, 36);
  t.mock.timers.enable({ apis: ['Date'], now: refused });
  const state = new LocalObjectState();
  const budget = await wake(state);
  assert.equal(budget.reserve(55), true);
  budget.close();
  budget.release(55);
  assert.equal(budget.used(), 0);
  assert.deepEqual(state.rows('ledger'), []);
  assert.deepEqual(state.rows('breaker'), [{ id: 1, closed_until: refused + BREAKER_MS }]);
  assert.equal(budget.reserve(55), false);
  // Asked whether a model may be asked, the object says no — and writes nothing to say it.
  assert.equal(budget.available(55), false);
  assert.deepEqual(state.rows('ledger'), []);

  // Twenty-nine minutes on, and woken again in between: still closed.
  t.mock.timers.setTime(refused + BREAKER_MS - 60_000);
  assert.equal((await wake(state)).reserve(55), false);
  assert.equal(state.rows('ledger').length, 0);
  // Thirty minutes on: there is room again — said without setting anything aside — the next
  // reservation is let through, and the instant is erased.
  t.mock.timers.setTime(refused + BREAKER_MS);
  assert.equal(budget.available(55), true);
  assert.deepEqual(state.rows('ledger'), []);
  assert.equal(budget.available(55, 54), false);
  assert.equal(budget.reserve(55), true);
  assert.deepEqual(state.rows('breaker'), []);
  // The platform refuses the probe too: closed again, from now.
  budget.close();
  budget.release(55);
  assert.deepEqual(state.rows('breaker'), [{ id: 1, closed_until: refused + 2 * BREAKER_MS }]);
  assert.equal(budget.used(), 0);

  // Nothing is kept for its own sake. An hour that has left the window weighs nothing, and
  // its row goes with the first call that writes — a closing like any other.
  t.mock.timers.setTime(utc(14, 3, 0));
  assert.equal(budget.reserve(55), true);
  t.mock.timers.setTime(utc(15, 5, 0));
  assert.equal(budget.used(), 0);
  assert.equal(state.rows('ledger').length, 1, 'reading writes nothing');
  budget.close();
  assert.deepEqual(state.rows('ledger'), []);
  assert.deepEqual(state.rows('breaker'), [{ id: 1, closed_until: utc(15, 5, 30) }]);
});

// ---------------------------------------------------------------------------------------------
// The Worker, asked as the bench asks it
// ---------------------------------------------------------------------------------------------

const CORPUS = '0123456789abcdef';
const KEY = 'k'.repeat(40);
const MEASURES: readonly (readonly [id: string, text: string])[] = [
  ['p1c1-s01-k01', 'Ouvrir une bibliothèque de quartier sept jours sur sept dans chaque commune'],
  ['p1c1-s01-m01', 'Rendre gratuits les transports scolaires jusqu’à 16 ans dès la rentrée 2028'],
];
const SENTENCE = {
  phrases: [
    {
      texte:
        'Le programme prévoit une bibliothèque de quartier ouverte chaque jour dans toute commune.',
      ids: ['p1c1-s01-k01'],
    },
  ],
};

function base(): LocalD1 {
  const db = new LocalD1();
  db.exec(readFileSync('src/worker/sql/schema.sql', 'utf8'));
  const insert = db.db.prepare(
    'INSERT INTO propositions (id, section_id, kind, ord, text, lead) VALUES (?, ?, ?, ?, ?, ?)',
  );
  MEASURES.forEach(([id, text], ord) => insert.run(id, id.slice(0, 8), 'measure', ord, text, ''));
  const meta = db.db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
  meta.run('corpus_version', CORPUS);
  meta.run('ask', 'open');
  return db;
}

/** What the platform answers when a call is served: the output, and what it cost. */
const served = (output: unknown, neurons: number): Response =>
  new Response(JSON.stringify({ result: { response: output, usage: { neurons } } }));

/** What it answered on 14 November 2026, once the free allowance was used up. */
const exhausted = (): Response =>
  new Response(
    JSON.stringify({
      success: false,
      errors: [
        { code: 4006, message: 'you have used up your daily free allocation of 10,000 neurons' },
      ],
    }),
    { status: 429 },
  );

/** The bindings of the preview Worker, with a model that is `answer` — and a list of its calls. */
async function platform(answer: (model: string) => Response | Promise<Response>) {
  const state = new LocalObjectState();
  const budget = await wake(state);
  const asked: string[] = [];
  const env = {
    ENVIRONMENT: 'preview',
    BENCH_KEY: KEY,
    RATE_SALT: 'un-secret-de-test-assez-long',
    CORPUS_VERSION: CORPUS,
    NEURON_HARD_STOP: '8500',
    DB: base(),
    RATE: { limit: () => Promise.resolve({ success: true }) },
    BUDGET: { getByName: () => budget },
    AI: {
      run: async (model: string): Promise<Response> => {
        asked.push(model);
        return answer(model);
      },
    },
  };
  return { env, state, budget, asked };
}

interface BenchReply {
  ran?: boolean;
  budget?: string;
  used?: number;
  reserved?: number;
  model_ms?: number;
  neurons?: number | null;
  verdict?: { kind: string };
  judges?: { model: string; verdict: string | null; neurons: number | null; ms: number }[];
}

async function bench(env: unknown, fields: Record<string, unknown> = {}): Promise<BenchReply> {
  const { default: handler } = await worker();
  const response = await handler.fetch(
    new Request('https://beta.cestecritla.fr/api/bench', {
      method: 'POST',
      body: JSON.stringify({
        key: KEY,
        model: 'mistral-small-3.1',
        mode: 'answer',
        ids: MEASURES.map(([id]) => id),
        terms: ['bibliotheque'],
        min_overlap: 0,
        ...fields,
      }),
    }),
    env,
  );
  assert.equal(response.status, 200);
  return (await response.json()) as BenchReply;
}

void test('the Worker, told 429: the reservation goes back, the model closes, the bench hears « spent »', async (t) => {
  const refused = utc(14, 0, 36);
  t.mock.timers.enable({ apis: ['Date'], now: refused });
  const { env, state, budget, asked } = await platform(exhausted);

  const first = await bench(env);
  // What the route answers when the allowance is spent, to the letter: the bench stops on it.
  assert.deepEqual(first, {
    corpus: CORPUS,
    ids: MEASURES.map(([id]) => id),
    load_ms: 0,
    ran: false,
    budget: 'spent',
    used: 0,
  });
  assert.equal(asked.length, 1);
  // Nothing was billed, so nothing stays counted; and the model is closed for thirty minutes.
  assert.deepEqual(state.rows('ledger'), []);
  assert.deepEqual(state.rows('breaker'), [{ id: 1, closed_until: refused + BREAKER_MS }]);

  // What comes next is answered the same, without a call made for nothing.
  t.mock.timers.setTime(refused + BREAKER_MS - 1);
  assert.deepEqual(await bench(env), first);
  assert.equal(asked.length, 1);
  // Thirty minutes on, one call is let through — the probe. Refused: closed again.
  t.mock.timers.setTime(refused + BREAKER_MS);
  assert.deepEqual(await bench(env), first);
  assert.equal(asked.length, 2);
  assert.deepEqual(await bench(env), first);
  assert.equal(asked.length, 2);
  assert.equal(budget.used(), 0);
});

void test('the Worker, cut or broken: the reservation stays, and nothing closes', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: utc(14, 9, 0) });
  const failures: [string, () => Response | Promise<Response>][] = [
    ['the deadline', () => Promise.reject(new DOMException('timed out', 'TimeoutError'))],
    [
      'a timeout of the platform',
      () => new Response('{"errors":[{"code":3007}]}', { status: 408 }),
    ],
    ['an error of the platform', () => new Response('oops', { status: 500 })],
    ['an answer that is not one', () => new Response('<html>')],
    // The one 429 that is not the allowance: the model was busy, and says so.
    [
      'a model out of capacity',
      () =>
        new Response(
          '{"errors":[{"code":3040,"message":"Capacity temporarily exceeded, please try again."}]}',
          { status: 429 },
        ),
    ],
  ];
  for (const [name, failure] of failures) {
    const { env, state, budget, asked } = await platform(failure);
    const answer = await bench(env);
    // A call that was cut has probably been billed: what it reserved goes on being counted.
    assert.equal(answer.ran, false, name);
    assert.equal(answer.budget, undefined, name);
    const reserved = answer.reserved ?? 0;
    assert.ok(reserved > 0, name);
    assert.equal(budget.used(), reserved, name);
    // …and the model is tried again at the next request: nothing told us to stop.
    assert.deepEqual(state.rows('breaker'), [], name);
    await bench(env);
    assert.equal(asked.length, 2, name);
    assert.equal(budget.used(), 2 * reserved, name);
  }
});

void test('the Worker, a judge refused: silent, given back — and the judges after it are not asked', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: utc(14, 11, 45) });
  const writer: ModelKey = 'mistral-small-3.1';
  const judges: ModelKey[] = ['gemma-4-26b', 'llama-3.3-70b'];
  const gist = { model: writer, mode: 'gist', variant: 0, ids: ['p1c1-s01-k01'], judges };
  const silent = (model: ModelKey) => ({
    model,
    verdict: null,
    neurons: null,
    cached: false,
    ms: 0,
  });

  // The morning of 14 November: the sentence comes back from the cache of the gateway, and
  // every judge is refused by a platform whose allowance is used up.
  const cached = (): Response =>
    new Response(JSON.stringify({ result: { response: SENTENCE, usage: { neurons: 4.5 } } }), {
      headers: { 'cf-aig-cache-status': 'HIT' },
    });
  const { env, state, budget, asked } = await platform((model) =>
    model === MODELS[writer].id ? cached() : exhausted(),
  );
  const out = await bench(env, gist);
  assert.equal(out.ran, true);
  assert.equal(out.verdict?.kind, 'answer');
  // The first judge is as if it had not been asked; the second is not asked at all.
  assert.deepEqual(out.judges, judges.map(silent));
  assert.deepEqual(asked, [MODELS[writer].id, MODELS['gemma-4-26b'].id]);
  // A sentence from the cache and a refusal: nothing was billed, nothing is counted.
  assert.equal(out.used, 0);
  assert.deepEqual(state.rows('ledger'), []);
  assert.equal(state.rows('breaker').length, 1);
  // The same request again finds the model closed: not even the cache is asked.
  const next = await bench(env, gist);
  assert.deepEqual([next.ran, next.budget, next.used], [false, 'spent', 0]);
  assert.equal(asked.length, 2);
  assert.equal(budget.used(), 0);

  // Judges that are cut instead, after a sentence that was paid for: each is asked, each keeps
  // its reservation, and the sentence is counted for what it cost.
  const slow = await platform((model) =>
    model === MODELS[writer].id ? served(SENTENCE, 4.5) : Promise.reject(new Error('cut')),
  );
  const late = await bench(slow.env, gist);
  assert.deepEqual(
    late.judges?.map((judge) => judge.verdict),
    [null, null],
  );
  assert.deepEqual(
    slow.asked,
    [writer, ...judges].map((key) => MODELS[key].id),
  );
  assert.ok((late.used ?? 0) > 4.5, String(late.used));
  assert.deepEqual(slow.state.rows('breaker'), []);
});
