/**
 * The sentences written ahead, from the first call to the last verdict (PLAN-CHAT §3 and §4,
 * lots C2 and C3): ONE sentence in our own words for each of the 1,069 measures of the book,
 * written by a model through the bench route, labelled by other models — a sort, not a proof —
 * and then READ BY THE EDITOR, one by one. Only what he keeps may enter the base.
 *
 *   npm run gists -- --status [--only <prefix>] [--writers a,b] [--judges x,y]
 *       where the work stands: sentences written, judged, read, link only, waiting — and how
 *       the judges' labels compare with the editor's reading
 *   npm run gists -- --write --budget <neurons> [--limit n] [--writers a,b] [--judges x,y]
 *                    [--only <prefix>]
 *       asks the bench route for the next sentences — key measures first, then the book in
 *       its order — until the budget is reached or everything is written
 *   npm run gists -- --serve [--port 4599] [--lot 150] [--unwritten] [--only <prefix>]
 *       the editor's reading desk: one local page, the measures of the next lot with their
 *       text and the sentences written about them, three choices each — « Fidèle », « Aucune :
 *       lien seul », « Corriger ». A measure whose verdict no longer holds comes back on it.
 *       With `--unwritten`, the measures no writer could write: a sentence to write, or the
 *       link alone
 *   npm run gists -- --sql [--check]
 *       the file of the deposit, built by the `--gists` logic of scripts/seed-ask-2026.ts —
 *       which alone sends it, with the editor's accord
 *
 * Exit codes: 0 done (or the budget of the session reached); 1 something is wrong and nothing
 * more was asked; 2 a command line this tool does not read; 3 the free allowance is spent —
 * come back later, and in more than half an hour: after a refusal the Worker keeps the model
 * closed that long, and a call made sooner is answered « spent » without reaching it.
 *
 * READ docs/discovery/neurons-log.md BEFORE ANY `--write`. The free allowance of the account
 * is the budget of this work and of the site alike; `--budget` is mandatory for that reason,
 * and each session adds its line to that file.
 *
 * What it keeps is under private/gists/ (scripts/gists-core.ts): runs.jsonl, one line per call,
 * and verdicts.jsonl, the editor's verdicts. What it prints is identifiers, labels and numbers —
 * never a sentence, never a word of a measure. The one place the text of the book is shown is
 * the reading desk: a page served to this machine alone, behind a token, that nothing keeps.
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { MAX_WORDS_PER_SENTENCE } from '../src/lib/ask-contract.js';
import type { RuleId } from '../src/lib/ask-validate.js';
import { MAX_GIST_CHARS } from '../src/lib/chat-contract.js';
import { MODELS, isModelKey, type ModelKey } from '../src/worker/models.js';
import { JUDGE_VERDICTS, type JudgeVerdict } from '../src/worker/prompt.js';
import { sha256 } from './aec-common.js';
import type { Manifest, PrivateCorpus } from './aec26-types.js';
import { paced } from './bench-ask.js';
import {
  EDITOR,
  RUNS_PATH,
  VERDICTS_PATH,
  appendLine,
  controlGist,
  lastVerdicts,
  measuresOf,
  pinOf,
  pinned,
  readMinOverlap,
  readRuns,
  readVerdicts,
  recheckWith,
  shownText,
  stands,
  unservable,
  writeOrder,
  type JudgeLabel,
  type Measure,
  type Recheck,
  type RunLine,
  type VerdictLine,
} from './gists-core.js';
import { PRIVATE_CORPUS_PATH } from './ingest-2026.js';
import { prepareGists, readPrivateCorpus, seedRows } from './seed-ask-2026.js';

const MANIFEST_PATH = 'data/2026/manifest.json';
const BENCH_URL = 'https://beta.cestecritla.fr/api/bench';
const BENCH_KEY_PATH = 'private/bench/BENCH_KEY.secret';
const NEURONS_LOG = 'docs/discovery/neurons-log.md';

/** Who writes: the second is asked only for the measures the first could not write. */
export const DEFAULT_WRITERS: readonly ModelKey[] = ['gemma-4-26b', 'mistral-small-3.1'];
/** Who reads a sentence after it is written: those of these three that did not write it. */
export const JUDGE_POOL: readonly ModelKey[] = [
  'gemma-4-26b',
  'mistral-small-3.1',
  'llama-3.3-70b',
];
/**
 * The ways of asking (src/worker/prompt.ts, `systemGist`), in the order they are tried: the
 * third — « the essential, in everyday words » — passed most often in the trial (08-ia.md
 * §10.10), so it goes first.
 */
export const VARIANT_ORDER: readonly number[] = [2, 0, 1];
/** The Worker lets three judges read a sentence, and no more (src/worker/index.ts). */
const MAX_JUDGES = 3;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The judges of a sentence: the models listed, less its writer — never its own reader. */
export function judgesFor(writer: string, listed: readonly ModelKey[] = JUDGE_POOL): ModelKey[] {
  return [...new Set(listed)].filter((judge) => judge !== writer).slice(0, MAX_JUDGES);
}

// ---------------------------------------------------------------------------------------------
// What is known of a measure
// ---------------------------------------------------------------------------------------------

/** A sentence the control let through, with what the judges said of it. */
export interface Sentence {
  writer: string;
  variant: number;
  text: string;
  /** By judge, for those that answered: its label, or null when it gave none we know. */
  labels: Map<string, JudgeVerdict | null>;
}

export interface Known {
  /** One sentence per writer: the last one the control let through. */
  sentences: Sentence[];
  /** By writer, the ways it was asked and answered — whatever the control then said. */
  answered: Map<string, Set<number>>;
  /** The editor's verdict, when it still holds (scripts/gists-core.ts, `stands`). */
  verdict: VerdictLine | null;
  /**
   * A verdict that no longer holds — the measure moved since, or the control of today refuses
   * the sentence it kept. It is no verdict any more: the measure is to be read again.
   */
  previous: VerdictLine | null;
}

/**
 * What the two files say of one measure. Only what was written against the measure as the
 * manifest publishes it today counts: a line pinned to another text is a line about another
 * measure. A call the model did not answer is not an answer: it will be made again. `recheck`
 * is the control of today, where the text of the book is: without it a verdict is believed on
 * its pin alone.
 */
export function knownOf(
  measure: Measure,
  runs: readonly RunLine[],
  verdict: VerdictLine | undefined,
  recheck?: Recheck,
): Known {
  const standing = runs.filter((run) => run.id === measure.id && run.ran && pinned(run, measure));
  const answered = new Map<string, Set<number>>();
  const kept = new Map<string, RunLine>();
  for (const run of standing) {
    const ways = answered.get(run.writer) ?? new Set<number>();
    ways.add(run.variant);
    answered.set(run.writer, ways);
    if (run.passed && run.text !== null) kept.set(run.writer, run);
  }
  const sentences: Sentence[] = [];
  for (const [writer, last] of kept) {
    if (last.text === null) continue;
    // A sentence asked again to complete its labels comes back the same: its labels add up.
    const labels = new Map<string, JudgeVerdict | null>();
    for (const run of standing) {
      if (run.writer !== writer || !run.passed || run.text !== last.text) continue;
      for (const judge of run.judges) if (judge.answered) labels.set(judge.model, judge.verdict);
    }
    sentences.push({ writer, variant: last.variant, text: last.text, labels });
  }
  const holds = verdict !== undefined && stands(verdict, measure, recheck);
  return {
    sentences,
    answered,
    verdict: holds ? verdict : null,
    previous: holds ? null : (verdict ?? null),
  };
}

/** What is known of every measure, by identifier. */
export function knowledge(
  measures: readonly Measure[],
  runs: readonly RunLine[],
  verdicts: ReadonlyMap<string, VerdictLine>,
  recheck?: Recheck,
): Map<string, Known> {
  const byId = new Map<string, RunLine[]>();
  for (const run of runs) {
    const list = byId.get(run.id);
    if (list === undefined) byId.set(run.id, [run]);
    else list.push(run);
  }
  return new Map(
    measures.map((measure) => [
      measure.id,
      knownOf(measure, byId.get(measure.id) ?? [], verdicts.get(measure.id), recheck),
    ]),
  );
}

/** The judges whose label a sentence still lacks. */
function missingLabels(sentence: Sentence, judges: readonly ModelKey[] | undefined): ModelKey[] {
  return judgesFor(sentence.writer, judges).filter((judge) => !sentence.labels.has(judge));
}

export type Action =
  | {
      kind: 'ask';
      writer: ModelKey;
      variant: number;
      judges: ModelKey[];
      /** `write`: no sentence yet. `labels`: a sentence, and a judge that has not answered. */
      why: 'write' | 'labels';
    }
  | {
      kind: 'none';
      /**
       * `verdict`: the editor ruled. `written`: a sentence and every label. `unwritten`: every
       * writer was asked every way, and no sentence passed. `later`: the next call was made a
       * moment ago and nothing came back — not twice in one session.
       */
      why: 'verdict' | 'written' | 'unwritten' | 'later';
    };

const callKey = (writer: string, variant: number): string => `${writer}|${String(variant)}`;

/**
 * The next call a measure needs, if any. Nothing the files already answer is asked again: a
 * measure the editor ruled on, a way a writer already answered, a sentence that has all its
 * labels. A sentence whose labels are missing is asked again the same way — the gateway serves
 * it from its cache, and only the judges are paid. `asked` holds the calls this session already
 * made for this measure.
 */
export function nextAction(
  known: Known,
  writers: readonly ModelKey[],
  judges: readonly ModelKey[] | undefined,
  asked: ReadonlySet<string>,
): Action {
  if (known.verdict !== null) return { kind: 'none', why: 'verdict' };
  if (known.sentences.length > 0) {
    let waiting = false;
    for (const sentence of known.sentences) {
      const { writer, variant } = sentence;
      if (!isModelKey(writer) || missingLabels(sentence, judges).length === 0) continue;
      if (asked.has(callKey(writer, variant))) {
        waiting = true;
        continue;
      }
      return { kind: 'ask', writer, variant, judges: judgesFor(writer, judges), why: 'labels' };
    }
    return { kind: 'none', why: waiting ? 'later' : 'written' };
  }
  for (const writer of writers) {
    const answered = known.answered.get(writer);
    const variant = VARIANT_ORDER.find((way) => answered?.has(way) !== true);
    // Every way was tried and none passed: this writer could not write it — the next one.
    if (variant === undefined) continue;
    if (asked.has(callKey(writer, variant))) return { kind: 'none', why: 'later' };
    return { kind: 'ask', writer, variant, judges: judgesFor(writer, judges), why: 'write' };
  }
  return { kind: 'none', why: 'unwritten' };
}

// ---------------------------------------------------------------------------------------------
// One call of the bench route, and what came back
// ---------------------------------------------------------------------------------------------

/**
 * What the bench route is asked (src/worker/index.ts, `handleBench`): one measure, one writer,
 * one way of asking, the judges. The key is added where the request leaves, and nowhere else.
 */
export interface BenchAsk {
  model: ModelKey;
  mode: 'gist';
  ids: [string];
  terms: [];
  variant: number;
  min_overlap: number;
  judges: ModelKey[];
}

export type Reply =
  /** Not a 200: the route refused the request, or is counting too many. */
  | { kind: 'http'; status: number }
  /** A 200 this tool cannot read: the route changed, and nothing may be concluded. */
  | { kind: 'unreadable' }
  /**
   * No call was made, or the platform refused it: the Worker counts its stop over twenty-four
   * hours that roll, and keeps the model closed for half an hour after a refusal
   * (src/worker/budget-core.ts). `used`: what it counts — far under its stop, it was the
   * platform that refused.
   */
  | { kind: 'spent'; corpus: string | null; used: number | null }
  /** The base does not hold the measure. */
  | { kind: 'absent'; corpus: string | null }
  /** The model did not answer. `neurons`: what the Worker had reserved for it. */
  | { kind: 'silent'; corpus: string | null; neurons: number; ms: number | null }
  | {
      kind: 'ran';
      corpus: string | null;
      /** True when the control let exactly one sentence through, about this measure. */
      passed: boolean;
      rule: string | null;
      text: string | null;
      judges: JudgeLabel[];
      /** Neurons billed by this call, writer and judges: what the cache served is not counted. */
      neurons: number;
      cached: boolean;
      ms: number | null;
    };

/** The name of a rule is letters: nothing else that came back is ever printed. */
const ruleName = (value: unknown): string =>
  typeof value === 'string' && /^[a-z]{1,16}$/.test(value) ? value : 'other';

/** A cost or a time as the route reports it: a number that can be added up, or nothing. */
const amount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

/** Reads what the route answered for one measure. */
export function readReply(status: number, body: unknown, id: string): Reply {
  if (status !== 200) return { kind: 'http', status };
  if (!isRecord(body)) return { kind: 'unreadable' };
  const corpus = typeof body['corpus'] === 'string' ? body['corpus'] : null;
  const ms = amount(body['model_ms']);
  const reserved = amount(body['reserved']) ?? 0;
  if (body['ran'] !== true) {
    if (body['budget'] === 'spent') return { kind: 'spent', corpus, used: amount(body['used']) };
    const { ids } = body;
    if (Array.isArray(ids) && ids.length === 0) return { kind: 'absent', corpus };
    // A call that failed may still have been billed: the Worker keeps its reservation, so do we.
    return { kind: 'silent', corpus, neurons: reserved, ms };
  }
  const verdict = body['verdict'];
  if (!isRecord(verdict)) return { kind: 'unreadable' };
  let passed = false;
  let text: string | null = null;
  let rule: string | null = null;
  if (verdict['kind'] === 'answer') {
    const sentences: unknown[] = Array.isArray(verdict['sentences']) ? verdict['sentences'] : [];
    const [only] = sentences;
    const ids: unknown = isRecord(only) ? only['ids'] : null;
    const said: unknown = isRecord(only) ? only['text'] : null;
    if (
      sentences.length !== 1 ||
      typeof said !== 'string' ||
      said.trim() === '' ||
      !Array.isArray(ids) ||
      ids.length !== 1 ||
      ids[0] !== id
    ) {
      rule = 'count';
    } else {
      // A sentence the page would not show is no sentence to read, whatever let it through.
      rule = unservable(id, said);
      passed = rule === null;
      text = passed ? said : null;
    }
  } else if (verdict['kind'] === 'select') {
    const refusal = verdict['refusal'];
    rule = isRecord(refusal) ? ruleName(refusal['rule']) : 'shape';
  } else if (verdict['kind'] === 'none') rule = 'none';
  else return { kind: 'unreadable' };

  const judges: JudgeLabel[] = [];
  let billed = 0;
  const listed: unknown[] = Array.isArray(body['judges']) ? body['judges'] : [];
  for (const entry of listed) {
    // A judge is one of our models, named by its key: anything else is not kept, nor printed.
    if (!isRecord(entry) || !isModelKey(entry['model'])) continue;
    const label = JUDGE_VERDICTS.find((known) => known === entry['verdict']) ?? null;
    const cost = amount(entry['neurons']);
    const fromCache = entry['cached'] === true;
    // A judge that answered something unreadable has answered: asking again changes nothing.
    judges.push({
      model: entry['model'],
      verdict: label,
      answered: label !== null || cost !== null || fromCache,
    });
    if (!fromCache && cost !== null) billed += cost;
  }
  const cached = body['cached'] === true;
  const cost = amount(body['neurons']);
  // An unknown cost is counted in full, as the Worker counts it.
  billed += cached ? 0 : (cost ?? reserved);
  return { kind: 'ran', corpus, passed, rule, text, judges, neurons: billed, cached, ms };
}

// ---------------------------------------------------------------------------------------------
// A session of writing
// ---------------------------------------------------------------------------------------------

export type StopReason =
  | 'done'
  | 'budget'
  | 'limit'
  | 'spent'
  | 'silent'
  | 'judges'
  | 'rate'
  | 'http'
  | 'unreachable'
  | 'unreadable'
  | 'corpus'
  | 'absent';

const STOPS: Readonly<Record<StopReason, { code: 0 | 1 | 3; say: string }>> = {
  done: { code: 0, say: 'nothing is left to ask' },
  budget: { code: 0, say: 'the budget of this session is reached' },
  limit: { code: 0, say: 'the limit of this session is reached' },
  spent: {
    code: 3,
    say: 'the Worker says the allowance is spent: come back later — in more than half an hour',
  },
  silent: {
    code: 3,
    say: 'two calls in a row got no answer — the free allowance is spent: come back later',
  },
  judges: {
    code: 3,
    say: 'twice in a row no judge answered — the free allowance is spent: come back later',
  },
  rate: { code: 3, say: 'the route still answers 429 after its waits: come back later' },
  http: { code: 1, say: 'the bench route refused the request' },
  unreachable: { code: 1, say: 'the bench route could not be reached' },
  unreadable: { code: 1, say: 'the bench route answered a shape this tool does not know' },
  corpus: { code: 1, say: 'the base is not at the corpus version of the manifest' },
  absent: { code: 1, say: 'the base does not hold this measure: is the text deposited?' },
};

export interface WriteOptions {
  /** The measures to work through, in the order of the work. */
  measures: readonly Measure[];
  /** The state of the book the manifest publishes: the base must hold the same. */
  corpus: string;
  /** What runs.jsonl holds when the session starts. */
  runs: readonly RunLine[];
  verdicts: ReadonlyMap<string, VerdictLine>;
  writers: readonly ModelKey[];
  /** The judges listed on the command line; the pool of three when none is. */
  judges?: readonly ModelKey[];
  /** Neurons this session may bill. */
  budget: number;
  /** Measures this session may ask about. */
  limit?: number;
  minOverlap: number;
  /** One call of the route, already paced: its status and its body. */
  ask: (request: BenchAsk) => Promise<{ status: number; body: unknown }>;
  /** Keeps a line of runs.jsonl. */
  record: (line: RunLine) => void;
  print: (line: string) => void;
  now?: () => Date;
}

export interface WriteResult {
  code: 0 | 1 | 3;
  reason: StopReason;
  /** What the reason is about: an identifier, a status. */
  detail: string;
  calls: number;
  /** Neurons billed during the session, as the route reported them. */
  neurons: number;
  /** Measures asked about, and those that got their sentence in this session. */
  measures: number;
  written: number;
}

const labelsOf = (judges: readonly JudgeLabel[]): string =>
  judges.length === 0
    ? 'no judge'
    : judges
        .map((judge) => `${judge.model}=${judge.verdict ?? (judge.answered ? 'unread' : 'silent')}`)
        .join(' ');

/**
 * Works through the measures, one call at a time, until nothing is left to ask, the budget is
 * reached, or the allowance is plainly spent. Everything it needs is handed in — the route,
 * the files, the clock — so that the whole of it runs in a test.
 */
export async function writeSession(options: WriteOptions): Promise<WriteResult> {
  const { writers, judges, budget, print } = options;
  const now = options.now ?? ((): Date => new Date());
  const byId = new Map<string, RunLine[]>();
  for (const run of options.runs) {
    const list = byId.get(run.id);
    if (list === undefined) byId.set(run.id, [run]);
    else list.push(run);
  }
  let calls = 0;
  let neurons = 0;
  let measures = 0;
  let written = 0;
  /** Calls in a row the model did not answer, and calls in a row no judge answered. */
  let silent = 0;
  let mute = 0;
  const stop = (reason: StopReason, detail = ''): WriteResult => ({
    code: STOPS[reason].code,
    reason,
    detail,
    calls,
    neurons,
    measures,
    written,
  });

  for (const measure of options.measures) {
    const mine = [...(byId.get(measure.id) ?? [])];
    const verdict = options.verdicts.get(measure.id);
    const asked = new Set<string>();
    for (;;) {
      const action = nextAction(knownOf(measure, mine, verdict), writers, judges, asked);
      if (action.kind === 'none') break;
      if (neurons >= budget) return stop('budget');
      if (asked.size === 0) {
        if (options.limit !== undefined && measures >= options.limit) return stop('limit');
        measures += 1;
      }
      asked.add(callKey(action.writer, action.variant));
      let answer: { status: number; body: unknown };
      try {
        answer = await options.ask({
          model: action.writer,
          mode: 'gist',
          ids: [measure.id],
          terms: [],
          variant: action.variant,
          min_overlap: options.minOverlap,
          judges: action.judges,
        });
      } catch {
        // No network, or no answer in a minute: the session ends with what it has kept.
        return stop('unreachable', measure.id);
      }
      calls += 1;
      const reply = readReply(answer.status, answer.body, measure.id);
      if (reply.kind === 'http') {
        return stop(reply.status === 429 ? 'rate' : 'http', `HTTP ${String(reply.status)}`);
      }
      if (reply.kind === 'unreadable') return stop('unreadable', measure.id);
      // The pins below are the manifest's: they hold only if the base holds the same book.
      if (reply.corpus !== options.corpus) return stop('corpus', measure.id);
      if (reply.kind === 'spent') {
        const counted = reply.used === null ? '' : `${reply.used.toFixed(0)} neurons counted`;
        return stop('spent', counted);
      }
      if (reply.kind === 'absent') return stop('absent', measure.id);

      const said = `${measure.id} ${action.writer} v${String(action.variant)}`;
      const line: RunLine = {
        at: now().toISOString(),
        id: measure.id,
        ...pinOf(measure),
        writer: action.writer,
        variant: action.variant,
        ran: reply.kind === 'ran',
        passed: reply.kind === 'ran' && reply.passed,
        rule: reply.kind === 'ran' ? reply.rule : null,
        text: reply.kind === 'ran' ? reply.text : null,
        judges: reply.kind === 'ran' ? reply.judges : [],
        neurons: reply.neurons,
        cached: reply.kind === 'ran' && reply.cached,
        ms: reply.ms,
      };
      options.record(line);
      mine.push(line);
      neurons += reply.neurons;
      if (reply.kind === 'silent') {
        print(`${said} — no answer`);
        silent += 1;
        if (silent >= 2) return stop('silent');
        continue;
      }
      silent = 0;
      const cost = `${reply.neurons.toFixed(2)} n${reply.cached ? ' (cache)' : ''}`;
      const time = reply.ms === null ? '' : ` · ${String(reply.ms)} ms`;
      if (!reply.passed) {
        print(`${said} ✖ ${reply.rule ?? 'other'} · ${cost}${time}`);
        continue;
      }
      print(`${said} ✔ ${labelsOf(reply.judges)} · ${cost}${time}`);
      if (action.why === 'write') written += 1;
      if (action.judges.length === 0) continue;
      // The writer came back, from the cache or not, and no judge did: nothing more is served.
      if (reply.judges.every((judge) => judge.verdict === null)) {
        mute += 1;
        if (mute >= 2) return stop('judges');
      } else mute = 0;
    }
  }
  return stop('done');
}

// ---------------------------------------------------------------------------------------------
// Where the work stands
// ---------------------------------------------------------------------------------------------

export interface Status {
  measures: number;
  keyMeasures: number;
  /** Measures with a sentence the control let through. */
  written: number;
  /** …of which every sentence has every label asked for. */
  judged: number;
  /** Sentences by writer. */
  byWriter: Map<string, number>;
  /** No sentence, and every writer was asked every way. */
  unwritten: number;
  /** No sentence yet, and something left to ask. */
  toWrite: number;
  read: number;
  linkOnly: number;
  /** Measures with no verdict that holds — and, of those, how many have a sentence to read. */
  waiting: number;
  readable: number;
  /** Verdicts that no longer hold: their measure is among those waiting, to be read again. */
  again: number;
  calls: number;
  neurons: number;
}

/** True when there is a sentence to read for a measure: one written, or one kept before. */
const hasSentence = (state: Known): boolean =>
  state.sentences.length > 0 || state.previous?.verdict === 'read';

/**
 * Where the work stands, from what is known of each measure (`knowledge`) — with the control
 * of today among it where the text of the book is, on the pins alone elsewhere.
 */
export function statusOf(
  measures: readonly Measure[],
  runs: readonly RunLine[],
  known: ReadonlyMap<string, Known>,
  writers: readonly ModelKey[] = DEFAULT_WRITERS,
  judges?: readonly ModelKey[],
): Status {
  const ids = new Set(measures.map((measure) => measure.id));
  const mine = runs.filter((run) => ids.has(run.id));
  const out: Status = {
    measures: measures.length,
    keyMeasures: measures.filter((measure) => measure.kind === 'key_measure').length,
    written: 0,
    judged: 0,
    byWriter: new Map(),
    unwritten: 0,
    toWrite: 0,
    read: 0,
    linkOnly: 0,
    waiting: 0,
    readable: 0,
    again: 0,
    calls: mine.length,
    neurons: mine.reduce((sum, run) => sum + run.neurons, 0),
  };
  for (const state of known.values()) {
    if (state.previous !== null) out.again += 1;
    if (state.sentences.length > 0) {
      out.written += 1;
      if (state.sentences.every((sentence) => missingLabels(sentence, judges).length === 0)) {
        out.judged += 1;
      }
      for (const { writer } of state.sentences) {
        out.byWriter.set(writer, (out.byWriter.get(writer) ?? 0) + 1);
      }
    }
    if (state.verdict !== null) {
      if (state.verdict.verdict === 'read') out.read += 1;
      else out.linkOnly += 1;
      continue;
    }
    out.waiting += 1;
    if (hasSentence(state)) out.readable += 1;
    if (state.sentences.length > 0) continue;
    // Nothing written about the measure as it is: something is left to ask, or nothing is.
    const next = nextAction(state, writers, judges, new Set());
    if (next.kind === 'ask') out.toWrite += 1;
    else if (!hasSentence(state)) out.unwritten += 1;
  }
  return out;
}

/** What the editor made of the sentences a judge labelled: kept as written, or not. */
export interface Tally {
  kept: number;
  refused: number;
}

/**
 * The judges against the editor's reading — by judge, then by label (`none`: an answer that is
 * none of the three). Only sentences he ruled on are counted: the one he kept as written; all
 * of them when he chose the link alone; the one he had to correct. A sentence he passed over
 * for another says nothing.
 */
export function agreement(known: ReadonlyMap<string, Known>): Map<string, Map<string, Tally>> {
  const out = new Map<string, Map<string, Tally>>();
  const count = (sentence: Sentence, kept: boolean): void => {
    for (const [judge, label] of sentence.labels) {
      const byLabel = out.get(judge) ?? new Map<string, Tally>();
      const tally = byLabel.get(label ?? 'none') ?? { kept: 0, refused: 0 };
      if (kept) tally.kept += 1;
      else tally.refused += 1;
      byLabel.set(label ?? 'none', tally);
      out.set(judge, byLabel);
    }
  };
  for (const { verdict, sentences } of known.values()) {
    if (verdict === null) continue;
    for (const sentence of sentences) {
      if (verdict.verdict === 'link-only') count(sentence, false);
      else if (verdict.writer === EDITOR) {
        if (verdict.from === sentence.writer) count(sentence, false);
      } else if (verdict.writer === sentence.writer && verdict.text === sentence.text) {
        count(sentence, true);
      }
    }
  }
  return out;
}

/** The status, as lines of identifiers and numbers. */
export function statusLines(
  corpus: string,
  status: Status,
  judged: ReadonlyMap<string, Map<string, Tally>>,
): string[] {
  const n = (value: number): string => String(value);
  const writers = [...status.byWriter].map(([writer, count]) => `${writer} ${n(count)}`);
  const lines = [
    `corpus ${corpus}: ${n(status.measures)} measures, ${n(status.keyMeasures)} of them key measures`,
    `  written    ${n(status.written)} have a sentence the control let through` +
      (writers.length === 0 ? '' : ` (${writers.join(', ')})`),
    `  judged     ${n(status.judged)} of them have every label asked for`,
    `  unwritten  ${n(status.unwritten)} where every writer was asked every way`,
    `  to write   ${n(status.toWrite)}`,
    `  verdicts   ${n(status.read)} read, ${n(status.linkOnly)} link only, ` +
      `${n(status.waiting)} waiting — ${n(status.readable)} of them with a sentence to read`,
  ];
  if (status.again > 0) {
    lines.push(
      `  again      ${n(status.again)} of those waiting were ruled on, and the verdict no longer ` +
        'holds: their measure moved, or the control refuses their sentence today',
    );
  }
  lines.push(`  spent      ${status.neurons.toFixed(2)} neurons in ${n(status.calls)} calls`);
  if (judged.size > 0) {
    lines.push('judges against the reading (kept as written / refused or corrected):');
    for (const [judge, byLabel] of judged) {
      const cells = [...JUDGE_VERDICTS, 'none'].flatMap((label) => {
        const tally = byLabel.get(label);
        return tally === undefined ? [] : [`${label} ${n(tally.kept)}/${n(tally.refused)}`];
      });
      lines.push(`  ${judge}: ${cells.join(' · ')}`);
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------------------------
// The reading desk
// ---------------------------------------------------------------------------------------------

/** A measure as the private corpus holds it: its text, and for a sub-measure the one above. */
export interface MeasureText {
  text: string;
  lead: string;
}

export interface DeskDeps {
  /** What a request must carry in its path to be answered at all. */
  token: string;
  manifest: Manifest;
  minOverlap: number;
  /** How many measures a page shows. */
  lot: number;
  /** Show the measures no writer could write — to write one, or to choose the link alone. */
  unwritten: boolean;
  /** The beginning of the identifiers in scope; empty for the whole book. */
  only: string;
  writers: readonly ModelKey[];
  judges?: readonly ModelKey[];
  /** The measures of the private corpus, read at each request and kept nowhere. */
  texts: () => ReadonlyMap<string, MeasureText>;
  runs: () => RunLine[];
  verdicts: () => VerdictLine[];
  /** Keeps a verdict, at once. */
  record: (line: VerdictLine) => void;
  /** The day, YYYY-MM-DD. */
  today: () => string;
  nonce: () => string;
  print: (line: string) => void;
}

export interface DeskRequest {
  method: string;
  /** The path and nothing after it. */
  path: string;
  host: string | undefined;
  origin: string | undefined;
  body: string;
}

export interface DeskResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** Why a choice was not kept, said to the editor: the name of the rule, and what it means. */
const RULES_FR: Readonly<Record<string, string>> = {
  // The rules of the control, every one of them: a rule it gains must be glossed here to compile.
  ...({
    shape: 'la phrase est vide ou illisible',
    count: 'une seule phrase est attendue',
    several: 'il y a plus d’une phrase',
    length: `plus de ${String(MAX_WORDS_PER_SENTENCE)} mots`,
    anchor: 'la mesure n’est pas reconnue',
    number: 'un nombre que la mesure n’écrit pas ainsi',
    negation: 'une négation ou une restriction (ne, pas, seulement, sauf…)',
    verdict: 'un verdict (oui, non, en réalité…)',
    copy: 'trop de mots de suite repris de la mesure',
    quote: 'des guillemets',
    opinion: 'un avis ou une précaution',
    person: 'une première ou une deuxième personne (je, nous, on, tu, vous)',
    vote: 'le vote, hors d’une mesure qui en parle',
    party: 'un parti ou une personnalité que la mesure ne nomme pas',
    self: 'la phrase parle d’elle-même ou d’une IA',
    address: 'une adresse',
    markup: 'un caractère de mise en forme, ou qui ne se voit pas',
    overlap: 'trop loin des mots de la mesure',
    // Those of an explanation: no sentence about a measure meets them, and they are named all
    // the same.
    attribution: 'la phrase attribue quelque chose à quelqu’un',
    opener: 'un premier mot qui renvoie hors de la phrase',
    tense: 'un futur ou un conditionnel',
    contrast: 'une opposition ou une concession',
    name: 'un nom propre que rien ne montre',
    topic: 'aucun mot des phrases affichées',
  } satisfies Record<RuleId, string>),
  // What the desk refuses by itself.
  chars: `plus de ${String(MAX_GIST_CHARS)} caractères`,
  line: 'un retour à la ligne, ou un caractère qui ne se voit pas',
  text: 'le texte de cette mesure n’est pas sur cette machine',
  changed: 'la phrase a changé depuis l’affichage : recharge la page',
  pin: 'le texte de cette machine n’est pas celui du manifeste',
  request: 'demande illisible',
};

const LABELS_FR: Readonly<Record<JudgeVerdict, string>> = {
  fidele: 'fidèle',
  ajout: 'ajout',
  ecart: 'écart',
};

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** « Mesure clé », « Mesure 7 », « Mesure 7.2 »: the name the site gives a measure. */
export function measureLabel(measure: Measure): string {
  const found = /-m(\d{2})(?:\.s(\d+))?$/.exec(measure.id);
  if (found === null) return 'Mesure clé';
  const number = String(Number(found[1]));
  return `Mesure ${found[2] === undefined ? number : `${number}.${found[2]}`}`;
}

/** The measures as a model reads them, by identifier: what the control is run against. */
const shownTexts = (texts: ReadonlyMap<string, MeasureText>): Map<string, string> =>
  new Map([...texts].map(([id, held]) => [id, shownText(held.text, held.lead)]));

/** Who wrote a sentence, as the page names them: a model by its name, the editor by his role. */
const writerName = (key: string): string =>
  isModelKey(key) ? MODELS[key].name : key === EDITOR ? 'l’éditeur' : key;

/** True when the text on this machine is the one the manifest publishes the fingerprint of. */
function isPublished(measure: Measure, shown: MeasureText | undefined): shown is MeasureText {
  if (shown === undefined || sha256(shown.text) !== measure.sha256) return false;
  return measure.leadSha256 === null || sha256(shown.lead) === measure.leadSha256;
}

interface DeskState {
  /** The measures in scope, in the order of the work. */
  measures: Measure[];
  /** The measures of the private corpus, as this request read them. */
  texts: ReadonlyMap<string, MeasureText>;
  known: Map<string, Known>;
}

/**
 * Everything a request of the desk needs, read afresh: the files, and the text of the book.
 * Here the control of today can run, so a verdict is believed only if its sentence still
 * passes it — otherwise its measure comes back to be read.
 */
function deskState(deps: DeskDeps): DeskState {
  const measures = writeOrder(measuresOf(deps.manifest)).filter((measure) =>
    measure.id.startsWith(deps.only),
  );
  const texts = deps.texts();
  const recheck = recheckWith(shownTexts(texts), deps.minOverlap);
  const verdicts = lastVerdicts(deps.verdicts());
  return { measures, texts, known: knowledge(measures, deps.runs(), verdicts, recheck) };
}

/** A sentence a block offers to the editor. */
interface Offer {
  writer: string;
  text: string;
  /** What is known of it, shown under it — already safe to put in a page. */
  about: string;
}

/**
 * What a block offers: the sentences written about the measure as it is — and the one the
 * editor kept before, when that verdict no longer holds and nobody has written it again. He
 * read it once: it is the first thing to read again.
 */
function offersOf(state: Known, deps: DeskDeps): Offer[] {
  const offers = state.sentences.map((sentence) => {
    const labels = judgesFor(sentence.writer, deps.judges).map((judge) => {
      const label = sentence.labels.get(judge);
      const said =
        label === undefined ? 'pas de réponse' : label === null ? 'illisible' : LABELS_FR[label];
      return `${esc(writerName(judge))} : ${said}`;
    });
    return {
      writer: sentence.writer,
      text: sentence.text,
      about:
        `${esc(writerName(sentence.writer))} · consigne ${String(sentence.variant)}` +
        (labels.length === 0 ? '' : ` · juges — ${labels.join(' ; ')}`),
    };
  });
  const { previous } = state;
  if (previous?.verdict !== 'read' || previous.writer === null || previous.text === null) {
    return offers;
  }
  if (offers.some((offer) => offer.text === previous.text)) return offers;
  return [
    ...offers,
    {
      writer: previous.writer,
      text: previous.text,
      about: `${esc(writerName(previous.writer))} · phrase gardée le ${esc(previous.read_on)}`,
    },
  ];
}

/** True when a measure belongs on the page: no verdict that holds, and something to do. */
function awaits(state: Known, deps: DeskDeps): boolean {
  if (state.verdict !== null) return false;
  if (!deps.unwritten) return hasSentence(state);
  if (hasSentence(state)) return false;
  const next = nextAction(state, deps.writers, deps.judges, new Set());
  return next.kind === 'none' && next.why === 'unwritten';
}

export interface DeskCounts {
  /** Measures in scope, and those the editor has ruled on. */
  measures: number;
  ruled: number;
  /** Measures that belong on a page of this desk and have no verdict yet. */
  waiting: number;
}

function deskCounts(state: DeskState, deps: DeskDeps): DeskCounts {
  let ruled = 0;
  let waiting = 0;
  for (const known of state.known.values()) {
    if (known.verdict !== null) ruled += 1;
    else if (awaits(known, deps)) waiting += 1;
  }
  return { measures: state.measures.length, ruled, waiting };
}

const DESK_STYLE = `
*{box-sizing:border-box}
body{margin:0;font:1.125rem/1.55 system-ui,sans-serif;color:#1c1c1a;background:#faf8f2}
.banner{position:sticky;top:0;z-index:2;margin:0;padding:.5rem 1rem;background:#9c1c14;color:#fff;font-weight:700;text-align:center}
.top,main,#end{max-width:46rem;margin:0 auto;padding:0 1rem}
h1{font-size:1.4rem;margin:1.25rem 0 .25rem}
.progress{font-weight:700}
.keys,.note,.where,.about,.lead{color:#4a4a45}
.keys,.note,.where,.about{font-size:.95rem}
kbd{font:inherit;font-size:.85em;border:1px solid #8a8a82;border-radius:.25rem;padding:0 .3rem;background:#fff;color:#1c1c1a}
article{margin:1.5rem 0;padding:1rem 1.25rem;border:2px solid #d9d5c8;border-radius:.5rem;background:#fff;scroll-margin-top:3.5rem}
article.current{border-color:#3d2a8c}
article.done{padding:.5rem 1.25rem;background:#f1efe6}
article.done>:not(header):not(.recorded){display:none}
.where{margin:0}
h2{font-size:1.1rem;margin:0 0 .5rem}
.id{font:.85rem ui-monospace,monospace;color:#4a4a45;font-weight:400}
.book{margin:0 0 1rem;padding:.75rem 1rem;border-left:.3rem solid #9c1c14;background:#fdf6f5}
.tag{margin:0 0 .25rem;font-size:.8rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#9c1c14}
.lead{margin:0}
.text,.sentence{margin:0;font-size:1.25rem;line-height:1.5}
ol{margin:0;padding:0;list-style:none}
.candidate{margin:0 0 1rem;padding:.75rem 1rem;border-left:.3rem solid #3d2a8c;background:#f6f4fb}
.about{margin:.25rem 0 0}
.actions{margin:.6rem 0 0;display:flex;flex-wrap:wrap;gap:.5rem}
button{font:inherit;padding:.45rem .9rem;border:2px solid #3d2a8c;border-radius:.4rem;background:#fff;color:#2a1c66;cursor:pointer}
button.yes{background:#3d2a8c;color:#fff}
button:disabled{opacity:.5;cursor:default}
button:focus-visible,textarea:focus-visible,a:focus-visible,article:focus-visible{outline:3px solid #c2410c;outline-offset:2px}
label{display:block;margin:.5rem 0 .25rem;font-weight:700}
textarea{display:block;width:100%;font:inherit;padding:.5rem;border:2px solid #8a8a82;border-radius:.4rem}
.refusal,.refused{color:#9c1c14;font-weight:700}
.recorded{margin:.25rem 0;display:flex;flex-wrap:wrap;align-items:center;gap:.75rem}
#end{font-weight:700;padding-bottom:3rem}
[hidden]{display:none!important}
`;

/**
 * What the page does, in the browser: each choice is posted at once, its block folds, the
 * next one takes the focus. Plain script, no library, nothing fetched but our own endpoint.
 */
const DESK_SCRIPT = `
(function () {
  'use strict';
  var RULES = __RULES__;
  var main = document.querySelector('main');
  var leftLot = document.getElementById('left-lot');
  var leftAll = document.getElementById('left-all');
  var ruled = document.getElementById('ruled');
  var end = document.getElementById('end');
  var current = null;
  var last = null;
  function blocks() { return Array.prototype.slice.call(main.querySelectorAll('article')); }
  function open() { return blocks().filter(function (b) { return !b.classList.contains('done'); }); }
  function select(block, move) {
    if (current) current.classList.remove('current');
    current = block;
    if (!block) return;
    block.classList.add('current');
    if (move) { block.focus({ preventScroll: true }); block.scrollIntoView({ block: 'start' }); }
  }
  function count() {
    var n = open().length;
    leftLot.textContent = String(n);
    end.hidden = n !== 0 || blocks().length === 0;
  }
  function say(block, message) {
    var line = block.querySelector('.refusal');
    line.textContent = message;
    line.hidden = message === '';
  }
  function lock(block, on) {
    block.dataset.busy = on ? '1' : '';
    Array.prototype.forEach.call(block.querySelectorAll('button, textarea'), function (el) { el.disabled = on; });
  }
  function finish(block, label, left) {
    block.classList.add('done');
    block.querySelector('.recorded span').textContent = label + ' — enregistré';
    block.querySelector('.recorded').hidden = false;
    last = block;
    if (left) { leftAll.textContent = String(left.waiting); ruled.textContent = String(left.ruled); }
    count();
    var rest = open();
    var after = rest.filter(function (b) {
      return (block.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    });
    select(after[0] || rest[0] || null, true);
    if (rest.length === 0) end.querySelector('a').focus();
  }
  function send(block, payload, label) {
    if (block.dataset.busy === '1') return;
    var focused = document.activeElement;
    function unlock(message) {
      lock(block, false);
      say(block, message);
      if (focused && block.contains(focused)) focused.focus();
    }
    lock(block, true);
    say(block, '');
    payload.id = block.dataset.id;
    fetch('verdict', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json();
    }).then(function (body) {
      if (body && body.ok === true) { lock(block, false); finish(block, label, body.left); return; }
      var rule = body && typeof body.rule === 'string' ? body.rule : '';
      unlock('Non enregistré — ' + (RULES[rule] || 'ce choix a été refusé') + (rule ? ' (règle « ' + rule + ' »).' : '.'));
    }).catch(function () {
      unlock('Non enregistré : la page locale ne répond plus. Relance la commande, puis recharge cette page.');
    });
  }
  function edit(block, candidate) {
    var form = block.querySelector('form');
    var area = form.querySelector('textarea');
    if (candidate) {
      area.value = candidate.querySelector('.sentence').textContent;
      form.dataset.from = candidate.dataset.writer;
    }
    form.hidden = false;
    area.focus();
  }
  function cancel(block) {
    var form = block.querySelector('form');
    if (form.dataset.fixed !== '1') form.hidden = true;
    say(block, '');
    block.focus({ preventScroll: true });
  }
  function read(block, candidate) {
    if (!candidate || !candidate.querySelector('[data-action="read"]')) return;
    send(block, {
      action: 'read',
      writer: candidate.dataset.writer,
      text: candidate.querySelector('.sentence').textContent
    }, 'Fidèle — ' + candidate.dataset.name);
  }
  function reopen(block) {
    block.classList.remove('done');
    block.querySelector('.recorded').hidden = true;
    count();
    select(block, true);
  }
  main.addEventListener('click', function (event) {
    var block = event.target.closest('article');
    if (!block) return;
    if (!block.classList.contains('done')) select(block, false);
    var button = event.target.closest('button');
    if (!button) return;
    var action = button.dataset.action;
    var candidate = button.closest('.candidate');
    if (action === 'read') read(block, candidate);
    else if (action === 'edit') edit(block, candidate);
    else if (action === 'cancel') cancel(block);
    else if (action === 'link-only') send(block, { action: 'link-only' }, 'Lien seul');
    else if (action === 'reopen') reopen(block);
  });
  main.addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.target;
    var payload = { action: 'correct', text: form.querySelector('textarea').value };
    if (form.dataset.from) payload.from = form.dataset.from;
    send(form.closest('article'), payload, 'Phrase de l’éditeur');
  });
  document.addEventListener('keydown', function (event) {
    var target = event.target;
    if (target && target.tagName === 'TEXTAREA') {
      if (event.key === 'Escape') { event.preventDefault(); cancel(target.closest('article')); }
      else if (event.key === 'Enter') { event.preventDefault(); target.form.requestSubmit(); }
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    var key = event.key;
    if (key === 'u') { if (last && last.classList.contains('done')) reopen(last); return; }
    if (key === 'j' || key === 'k') {
      var rest = open();
      if (rest.length === 0) return;
      var at = rest.indexOf(current);
      var to = key === 'j' ? Math.min(rest.length - 1, at + 1) : Math.max(0, at - 1);
      event.preventDefault();
      select(rest[to], true);
      return;
    }
    if (!current || current.classList.contains('done')) return;
    if (key === '0') { event.preventDefault(); send(current, { action: 'link-only' }, 'Lien seul'); return; }
    if (key === 'c') { event.preventDefault(); edit(current, current.querySelector('.candidate')); return; }
    if (key >= '1' && key <= '9') { event.preventDefault(); read(current, current.querySelectorAll('.candidate')[Number(key) - 1]); }
  });
  select(open()[0] || null, false);
  count();
})();
`;

/** One sentence offered for a measure: who wrote it, what is known of it, what can be done. */
function offerHtml(
  offer: Offer,
  position: number,
  measure: Measure,
  shown: MeasureText,
  deps: DeskDeps,
): string {
  const control = controlGist(
    measure.id,
    offer.text,
    shownText(shown.text, shown.lead),
    deps.minOverlap,
  );
  const faithful = control.ok
    ? `<button type="button" class="yes" data-action="read"><kbd>${String(position)}</kbd> Fidèle</button>`
    : '';
  const refused = control.ok
    ? ''
    : `<p class="refused">Le contrôle d’aujourd’hui refuse cette phrase — ${esc(
        RULES_FR[control.rule] ?? 'règle inconnue',
      )} (règle « ${esc(control.rule)} »). Elle peut être corrigée.</p>`;
  return (
    `<li class="candidate" data-writer="${esc(offer.writer)}" data-name="${esc(writerName(offer.writer))}">` +
    `<p class="sentence">${esc(offer.text)}</p>` +
    `<p class="about">${offer.about}</p>` +
    refused +
    `<p class="actions">${faithful}<button type="button" data-action="edit">Corriger</button></p>` +
    '</li>'
  );
}

function measureHtml(
  measure: Measure,
  state: Known,
  shown: MeasureText,
  title: string,
  deps: DeskDeps,
): string {
  const id = esc(measure.id);
  const offers = offersOf(state, deps);
  const candidates = offers
    .map((offer, index) => offerHtml(offer, index + 1, measure, shown, deps))
    .join('');
  const none = offers.length === 0;
  const again =
    state.previous === null
      ? ''
      : `<p class="refused">Déjà lue le ${esc(state.previous.read_on)} : ce verdict ne tient ` +
        'plus — la mesure a changé depuis, ou le contrôle d’aujourd’hui refuse la phrase ' +
        'gardée. Elle est à relire.</p>';
  return (
    `<article data-id="${id}" tabindex="-1" aria-labelledby="t-${id}">` +
    `<header><p class="where">${esc(title)}</p>` +
    `<h2 id="t-${id}">${esc(measureLabel(measure))} <span class="id">${id}</span></h2></header>` +
    '<div class="book"><p class="tag">Texte du livre</p>' +
    (shown.lead === '' ? '' : `<p class="lead">${esc(shown.lead)}</p>`) +
    `<p class="text">${esc(shown.text)}</p></div>` +
    again +
    (none
      ? '<p class="about">Aucune phrase n’a passé le contrôle pour cette mesure.</p>'
      : `<ol>${candidates}</ol>`) +
    `<form${none ? ' data-fixed="1"' : ' hidden'}>` +
    `<label for="c-${id}">${none ? 'Écrire une phrase' : 'Corriger la phrase'} — une seule, ` +
    `${String(MAX_GIST_CHARS)} caractères au plus</label>` +
    `<textarea id="c-${id}" rows="3" maxlength="${String(MAX_GIST_CHARS)}"></textarea>` +
    '<p class="actions"><button type="submit" class="yes">Enregistrer cette phrase</button>' +
    (none ? '' : '<button type="button" data-action="cancel">Annuler</button>') +
    '</p></form>' +
    '<p class="refusal" role="alert" hidden></p>' +
    '<p class="actions"><button type="button" data-action="link-only"><kbd>0</kbd> Aucune : lien seul</button></p>' +
    '<p class="recorded" hidden><span></span>' +
    '<button type="button" data-action="reopen">Revenir</button></p>' +
    '</article>'
  );
}

/** The one page of the desk: the next measures to rule on, with their text. */
export function deskPage(deps: DeskDeps): string {
  const state = deskState(deps);
  const counts = deskCounts(state, deps);
  const titles = new Map(deps.manifest.sections.map((section) => [section.id, section.title]));
  const blocks: string[] = [];
  /** Measures whose text here is not the published one: nothing can be read against it. */
  let astray = 0;
  for (const measure of state.measures) {
    if (blocks.length >= deps.lot) break;
    const known = state.known.get(measure.id);
    if (known === undefined || !awaits(known, deps)) continue;
    const shown = state.texts.get(measure.id);
    if (!isPublished(measure, shown)) {
      astray += 1;
      continue;
    }
    blocks.push(measureHtml(measure, known, shown, titles.get(measure.sectionId) ?? '', deps));
  }
  const nonce = deps.nonce();
  const what = deps.unwritten ? 'sans phrase' : 'à lire';
  const rules = JSON.stringify(RULES_FR).replace(/</g, '\\u003c');
  const script = DESK_SCRIPT.replace('__RULES__', () => rules);
  return (
    '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="robots" content="noindex, nofollow">\n' +
    '<title>Relecture des phrases — page locale</title>\n' +
    `<style nonce="${nonce}">${DESK_STYLE}</style>\n</head>\n<body>\n` +
    '<p class="banner">Page locale : elle contient le texte du livre, ne pas partager</p>\n' +
    '<div class="top">\n<h1>Relecture des phrases écrites d’avance</h1>\n' +
    '<p class="progress" aria-live="polite">Reste <span id="left-lot">' +
    `${String(blocks.length)}</span> dans ce lot · <span id="left-all">${String(counts.waiting)}</span> ` +
    `${what} en tout · <span id="ruled">${String(counts.ruled)}</span> verdicts sur ` +
    `${String(counts.measures)} mesures</p>\n` +
    (blocks.length === 0
      ? `<p class="note">Rien ${what} pour l’instant dans ce périmètre.</p>\n`
      : '<p class="keys">Clavier : <kbd>1</kbd>, <kbd>2</kbd>… « Fidèle » sur la phrase de ce rang · ' +
        '<kbd>0</kbd> « Aucune : lien seul » · <kbd>c</kbd> « Corriger » · <kbd>j</kbd> et ' +
        '<kbd>k</kbd> mesure suivante, précédente · <kbd>u</kbd> « Revenir » sur le dernier ' +
        'verdict. Dans la zone de texte : <kbd>Entrée</kbd> enregistre, <kbd>Échap</kbd> ' +
        'annule.</p>\n' +
        '<p class="note">Chaque choix est enregistré aussitôt. « Revenir » rouvre une mesure : ' +
        'un nouveau choix remplace l’ancien, et sans nouveau choix le verdict reste. Les ' +
        'étiquettes des juges sont un tri, pas une preuve : seule ta lecture compte.</p>\n') +
    (astray === 0
      ? ''
      : `<p class="refused">${String(astray)} mesure(s) laissée(s) de côté : leur texte sur cette ` +
        'machine n’est pas celui dont le manifeste publie l’empreinte.</p>\n') +
    `</div>\n<main>\n${blocks.join('\n')}\n</main>\n` +
    '<p id="end" hidden>Lot terminé. <a href="./">Lot suivant</a></p>\n' +
    `<script nonce="${nonce}">${script}</script>\n</body>\n</html>\n`
  );
}

const SHARED_HEADERS: Readonly<Record<string, string>> = {
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};

/**
 * An answer that says nothing but its status — two words of it, so that a browser shows a page
 * and not a tab that waits: whatever was asked, the desk does not say what it holds.
 */
const nothing = (status: number, body: string): DeskResponse => ({
  status,
  headers: { ...SHARED_HEADERS, 'content-type': 'text/plain; charset=utf-8' },
  body,
});
const NOT_FOUND = nothing(404, 'Not found\n');

const answerJson = (body: unknown, status = 200): DeskResponse => ({
  status,
  headers: { ...SHARED_HEADERS, 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

function sameToken(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** This machine, under either of its two names — whatever the port. */
const isLocalHost = (host: string | undefined): boolean =>
  host !== undefined && /^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(host);

/** A verdict posted by the page: kept at once, or refused with the name of a rule. */
function deskVerdict(body: string, deps: DeskDeps): DeskResponse {
  let asked: unknown;
  try {
    asked = JSON.parse(body);
  } catch {
    asked = null;
  }
  const refuse = (rule: string, status = 200): DeskResponse =>
    answerJson({ ok: false, rule }, status);
  if (!isRecord(asked)) return refuse('request', 400);
  const { id, action, writer, text, from } = asked;
  if (typeof id !== 'string') return refuse('request', 400);
  const state = deskState(deps);
  const measure = state.measures.find((candidate) => candidate.id === id);
  const known = state.known.get(id);
  if (measure === undefined || known === undefined) return refuse('request', 400);
  // The pin is what the editor read: the text of this machine, checked against the manifest.
  const shown = state.texts.get(id);
  if (!isPublished(measure, shown)) return refuse('pin');
  const base = { id, read_on: deps.today(), ...pinOf(measure) };
  const control = (sentence: string): ReturnType<typeof controlGist> =>
    controlGist(id, sentence, shownText(shown.text, shown.lead), deps.minOverlap);

  let line: VerdictLine;
  if (action === 'link-only') {
    line = { ...base, verdict: 'link-only', writer: null, text: null };
  } else if (action === 'read') {
    const offers = offersOf(known, deps).filter((offer) => offer.writer === writer);
    if (offers.length === 0) return refuse('request', 400);
    // What is kept is what was on the screen: a sentence rewritten since is not that one.
    const offer = offers.find((candidate) => candidate.text === text);
    if (offer === undefined) return refuse('changed');
    const checked = control(offer.text);
    if (!checked.ok) return refuse(checked.rule);
    line = { ...base, verdict: 'read', writer: offer.writer, text: checked.text };
    // A sentence of the editor's kept again keeps the trace of what it corrected.
    const origin = known.previous?.from;
    if (offer.writer === EDITOR && origin !== undefined) line.from = origin;
  } else if (action === 'correct') {
    if (typeof text !== 'string') return refuse('request', 400);
    // What was typed, on one line: a return left at the end of a box is not a second sentence.
    const checked = control(text.replace(/\s+/gu, ' ').trim());
    if (!checked.ok) return refuse(checked.rule);
    line = { ...base, verdict: 'read', writer: EDITOR, text: checked.text };
    if (typeof from === 'string' && isModelKey(from)) line.from = from;
  } else return refuse('request', 400);

  deps.record(line);
  deps.print(`${id} ${line.verdict}${line.writer === null ? '' : ` (${line.writer})`}`);
  // The verdict just given holds by construction: this measure, this control, a moment ago.
  const after = new Map(state.known).set(id, { ...known, verdict: line, previous: null });
  return answerJson({
    ok: true,
    verdict: line.verdict,
    left: deskCounts({ ...state, known: after }, deps),
  });
}

/**
 * Answers one request of the desk. Whatever does not carry the token — or does not come from
 * this machine, to this machine — gets a 404 with nothing in it: the page does not say it
 * exists.
 */
export function deskHandle(request: DeskRequest, deps: DeskDeps): DeskResponse {
  const [empty, token, rest, ...more] = request.path.split('/');
  if (empty !== '' || token === undefined || rest === undefined || more.length > 0) {
    return NOT_FOUND;
  }
  if (!sameToken(token, deps.token) || !isLocalHost(request.host)) return NOT_FOUND;
  if (request.method === 'GET' && rest === '') {
    const nonce = deps.nonce();
    return {
      status: 200,
      headers: {
        ...SHARED_HEADERS,
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy':
          `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; ` +
          "connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      },
      body: deskPage({ ...deps, nonce: () => nonce }),
    };
  }
  if (request.method === 'POST' && rest === 'verdict') {
    // Only the page itself posts here: another origin has no business with a verdict.
    if (request.origin !== undefined && request.origin !== `http://${request.host ?? ''}`) {
      return NOT_FOUND;
    }
    return deskVerdict(request.body, deps);
  }
  return NOT_FOUND;
}

/** A request of the page is a few hundred bytes: more is not one. */
const MAX_DESK_BODY = 8_192;

function readBody(request: IncomingMessage): Promise<string | null> {
  return new Promise((done) => {
    let body = '';
    let over = false;
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      if (over) return;
      body += chunk;
      if (body.length > MAX_DESK_BODY) over = true;
    });
    request.on('end', () => {
      done(over ? null : body);
    });
    request.on('error', () => {
      done(null);
    });
  });
}

async function answer(
  request: IncomingMessage,
  response: ServerResponse,
  deps: DeskDeps,
): Promise<void> {
  const body = await readBody(request);
  let reply = NOT_FOUND;
  if (body !== null) {
    try {
      reply = deskHandle(
        {
          method: request.method ?? 'GET',
          path: (request.url ?? '/').split(/[?#]/)[0] ?? '/',
          host: request.headers.host,
          origin: request.headers.origin,
          body,
        },
        deps,
      );
    } catch {
      // Never the message of the error: it could quote a line of a file under private/.
      deps.print('desk: a request could not be answered (a file under private/ did not read)');
      reply = nothing(500, 'Error\n');
    }
  }
  response.writeHead(reply.status, reply.headers).end(reply.body);
}

/**
 * Starts the desk on this machine and for this machine only: 127.0.0.1, never another
 * interface. Port 0 asks the system for a free one.
 */
export function startDesk(deps: DeskDeps, port: number): Promise<Server> {
  const server = createServer((request, response) => {
    void answer(request, response, deps);
  });
  return new Promise((done, failed) => {
    server.once('error', failed);
    server.listen(port, '127.0.0.1', () => {
      done(server);
    });
  });
}

/** The measures as the private corpus holds them — read when asked, kept nowhere. */
export function measureTexts(corpus: PrivateCorpus): Map<string, MeasureText> {
  return new Map(seedRows(corpus).map((row) => [row.id, { text: row.text, lead: row.lead }]));
}

// ---------------------------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------------------------

class UsageError extends Error {}

function modelList(value: string | undefined, flag: string): ModelKey[] | undefined {
  if (value === undefined) return undefined;
  const keys = value.split(',').filter((key) => key !== '');
  const known = keys.filter(isModelKey);
  if (known.length !== keys.length || known.length === 0) {
    throw new UsageError(`${flag} takes keys of src/worker/models.ts, separated by commas`);
  }
  return known;
}

function wholeNumber(value: string | undefined, flag: string, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new UsageError(`${flag} takes a whole number from ${String(min)} to ${String(max)}`);
  }
  return number;
}

/** One call of the bench route, no faster than its limiter allows; the key goes nowhere else. */
function benchCaller(
  url: string,
  key: string,
): (request: BenchAsk) => Promise<{ status: number; body: unknown }> {
  const clock = { last: 0 };
  return async (request) => {
    const response = await paced(
      () =>
        fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key, ...request }),
          signal: AbortSignal.timeout(60_000),
        }),
      clock,
    );
    let body: unknown = null;
    if (response.status === 200) {
      try {
        body = (await response.json()) as unknown;
      } catch {
        body = null;
      }
    }
    return { status: response.status, body };
  };
}

async function main(args: readonly string[]): Promise<number> {
  const value = (flag: string): string | undefined => {
    const at = args.indexOf(flag);
    return at === -1 ? undefined : args[at + 1];
  };
  const has = (flag: string): boolean => args.includes(flag);
  const print = (line: string): void => {
    console.log(line);
  };

  if (has('--sql')) return prepareGists(has('--check')).code;

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  const corpus = manifest.meta.corpus_version;
  const only = value('--only') ?? '';
  if (!/^[a-z0-9.-]{0,24}$/.test(only)) throw new UsageError('--only takes the start of an id');
  const measures = writeOrder(measuresOf(manifest)).filter((measure) =>
    measure.id.startsWith(only),
  );
  if (measures.length === 0) throw new UsageError(`no measure of the book begins with ${only}`);
  const writers = modelList(value('--writers'), '--writers') ?? DEFAULT_WRITERS;
  const judges = modelList(value('--judges'), '--judges');
  const listed = judges === undefined ? {} : { judges };

  if (has('--status')) {
    const runs = readRuns();
    // Where the book is, a verdict is believed only if its sentence still passes the control.
    const recheck = existsSync(PRIVATE_CORPUS_PATH)
      ? recheckWith(shownTexts(measureTexts(readPrivateCorpus())), readMinOverlap())
      : undefined;
    const known = knowledge(measures, runs, lastVerdicts(readVerdicts()), recheck);
    const status = statusOf(measures, runs, known, writers, judges);
    for (const line of statusLines(corpus, status, agreement(known))) print(line);
    return 0;
  }

  if (has('--write')) {
    const budget = Number(value('--budget'));
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new UsageError('--write needs --budget <neurons>: there is no second allowance');
    }
    const limit = has('--limit')
      ? { limit: wholeNumber(value('--limit'), '--limit', 1, 2000) }
      : {};
    if (!existsSync(BENCH_KEY_PATH)) {
      console.error(`gists: ${BENCH_KEY_PATH} is not on this machine`);
      return 1;
    }
    const key = readFileSync(BENCH_KEY_PATH, 'utf8').trim();
    const url = new URL(process.env['BENCH_URL'] ?? BENCH_URL);
    // The key travels with every call: never in the clear, except to this very machine.
    if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      throw new UsageError('BENCH_URL must be an https address');
    }
    print(
      `writing through ${url.host}: ${String(measures.length)} measures in scope, ` +
        `writers ${writers.join(' then ')}, budget ${String(budget)} neurons`,
    );
    const result = await writeSession({
      measures,
      corpus,
      runs: readRuns(),
      verdicts: lastVerdicts(readVerdicts()),
      writers,
      ...listed,
      budget,
      ...limit,
      minOverlap: readMinOverlap(),
      ask: benchCaller(url.href, key),
      record: (line) => {
        appendLine(RUNS_PATH, line);
      },
      print,
    });
    const about = result.detail === '' ? '' : ` (${result.detail})`;
    print(
      `\n${String(result.calls)} calls about ${String(result.measures)} measures, ` +
        `${String(result.written)} newly written, ${result.neurons.toFixed(2)} neurons — ` +
        `${STOPS[result.reason].say}${about}`,
    );
    // Every neuron spent goes in the register of the allowance, this tool's like the bench's.
    // A session that was only told « spent », or only served from the cache, spent none: it
    // adds no line — a loop that waits for the allowance would otherwise fill the register
    // with zeros, one every half hour.
    if (result.neurons > 0 && existsSync(NEURONS_LOG)) {
      const day = new Date().toISOString().slice(0, 10);
      appendFileSync(
        NEURONS_LOG,
        `| ${day} | phrases écrites d'avance — ${writers.map((w) => MODELS[w].name).join(', ')}, ` +
          `juges compris | ${String(result.calls)} appels, ${String(result.measures)} mesures | ` +
          `${result.neurons.toFixed(2)} neurons |\n`,
      );
      print(`line added to ${NEURONS_LOG}`);
    }
    return result.code;
  }

  if (has('--serve')) {
    if (!existsSync(PRIVATE_CORPUS_PATH)) {
      console.error(`gists: ${PRIVATE_CORPUS_PATH} is not on this machine`);
      return 1;
    }
    const port = has('--port') ? wholeNumber(value('--port'), '--port', 1024, 65_535) : 4599;
    const lot = has('--lot') ? wholeNumber(value('--lot'), '--lot', 1, 500) : 150;
    // What is read against the text of this machine is pinned to the manifest's fingerprints.
    if (readPrivateCorpus().meta.corpus_version !== corpus) {
      console.error('gists: the text on this machine is not at the corpus version of the manifest');
      return 1;
    }
    const token = randomBytes(16).toString('hex');
    const deps: DeskDeps = {
      token,
      manifest,
      minOverlap: readMinOverlap(),
      lot,
      unwritten: has('--unwritten'),
      only,
      writers,
      ...listed,
      texts: () => measureTexts(readPrivateCorpus()),
      runs: () => readRuns(),
      verdicts: () => readVerdicts(),
      record: (line) => {
        appendLine(VERDICTS_PATH, line);
      },
      today: () => new Date().toISOString().slice(0, 10),
      nonce: () => randomBytes(16).toString('base64'),
      print,
    };
    const counts = deskCounts(deskState(deps), deps);
    await startDesk(deps, port);
    print(`reading desk: http://127.0.0.1:${String(port)}/${token}/`);
    print(
      `  ${String(counts.waiting)} measures ${deps.unwritten ? 'without a sentence' : 'to read'}, ` +
        `${String(lot)} a page; ${String(counts.ruled)} verdicts on ${String(counts.measures)} measures`,
    );
    print('  a local page: it shows the text of the book. Do not share it. Ctrl+C stops it.');
    return 0;
  }

  throw new UsageError('one of --status, --write, --serve, --sql');
}

if (process.argv[1] !== undefined && /gists-2026\.ts$/.test(process.argv[1])) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    // Messages of this tool and of Node's file errors: paths and numbers, never a line read.
    console.error(`gists: ${error instanceof Error ? error.message : 'stopped'}`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  }
}
