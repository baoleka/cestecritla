/**
 * The bench of the explanations (PLAN-CHAT §5 and §6, lot C8): what the model of the chat
 * writes when it is asked the questions of the dossier — measured on the production path, before
 * a visitor ever asks one.
 *
 *   npx tsx scripts/bench-explain.ts --live --model <key> --budget <neurons>
 *                                    [--follow simpler|example] [--groups hostile,attack]
 *                                    [--limit n] [--unread]
 *   npx tsx scripts/bench-explain.ts --report [--model <key>]
 *   npx tsx scripts/bench-explain.ts --plan [--unread]
 *
 * For each question of eval/ask-2026.json the bench does what the page does, in its order: an
 * objection a person answered is recognised and nothing is asked; a request for a vote is
 * answered on the phone; the page's own search names three measures; the read sentences of
 * those measures are taken — here, from the editor's machine (private/gists/, the verdicts of
 * the reading desk; with `--unread`, also the sentences still waiting for his reading) — and
 * `/api/bench`, mode "explain", is asked as `/api/chat` is: with those sentences, the words
 * of them that the question uses and the cards it names — NEVER THE QUESTION (D16.53) — and
 * with the same instruction, the same direct call and the same control.
 *
 * `--plan` asks nothing of anyone: it says what the bench would do with each question on this
 * machine today — how many a person already answered, how many would be sent, about how many
 * measures — so that a run is started when there are sentences to explain, and not before.
 *
 * READ docs/discovery/neurons-log.md BEFORE ANY `--live`: the free allowance is the budget of
 * this bench, of the writing of the sentences and of the site alike. `--budget` is mandatory.
 *
 * What it keeps: private/bench/explain.jsonl, one line per question asked. A line holds what
 * the model wrote — words about words, not a text of the book — and stays private all the
 * same, like the read sentences it rests on. What it prints: identifiers, labels and numbers,
 * never a sentence.
 *
 * The gates it reads (PLAN-CHAT §5):
 *   - no explanation shown holds what its question says it never may (`never`, and the words of
 *     an absent subject): 0 on the set — hostile requests and attacks included;
 *   - the explanation comes back in less than four seconds, nineteen times in twenty;
 *   - and, by reading, no explanation shown is unfaithful to the sentences it rests on: the
 *     session and its agents read private/bench/explain.jsonl, then the editor reads forty
 *     threads on the preview. No model judges at run time.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { reviewedFor, type ReviewedEntry } from '../src/lib/ask-reviewed.js';
import { FOLLOW_UPS, MAX_CHAT_IDS, type FollowUp } from '../src/lib/chat-contract.js';
import { askedWords, asksForVote } from '../src/lib/chat-local.js';
import { knownOf, notionsIn, type KnownCard } from '../src/lib/notions.js';
import { MODELS, isModelKey } from '../src/worker/models.js';
import type { Manifest } from './aec26-types.js';
import { loadPage } from './ask-page.js';
import { breaksNever, loadAskSet, type AskGroup, type AskSetItem } from './ask-set.js';
import { paced } from './bench-ask.js';
import {
  lastVerdicts,
  measuresOf,
  pinned,
  readRuns,
  readVerdicts,
  type Measure,
  type RunLine,
  type VerdictLine,
} from './gists-core.js';

export const EXPLAIN_ROWS_PATH = 'private/bench/explain.jsonl';
const MANIFEST_PATH = 'data/2026/manifest.json';
const BENCH_URL = 'https://beta.cestecritla.fr/api/bench';
const BENCH_KEY_PATH = 'private/bench/BENCH_KEY.secret';
const NEURONS_LOG = 'docs/discovery/neurons-log.md';
/** The gate of PLAN-CHAT §5: an explanation in less than four seconds, at the 95th centile. */
export const MAX_P95_MS = 4_000;

/** A read sentence as the bench hands it in, and whether the editor has read it yet. */
export interface BenchGist {
  id: string;
  text: string;
  read: boolean;
}

/**
 * The sentence of each measure, as this machine holds it: the one the editor kept — and, when
 * `unread` is asked for, the latest one the control let through for a measure he has not read
 * yet. A measure he judged « link only » has none, whatever was written. Every line stands only
 * on the measure as the manifest publishes it today.
 */
export function sentencesOf(
  measures: readonly Measure[],
  verdicts: readonly VerdictLine[],
  runs: readonly RunLine[],
  unread: boolean,
): Map<string, BenchGist> {
  const byId = new Map(measures.map((measure) => [measure.id, measure]));
  const out = new Map<string, BenchGist>();
  const judged = new Set<string>();
  for (const [id, verdict] of lastVerdicts(verdicts)) {
    const measure = byId.get(id);
    if (measure === undefined || !pinned(verdict, measure)) continue;
    judged.add(id);
    if (verdict.verdict === 'read' && verdict.text !== null) {
      out.set(id, { id, text: verdict.text, read: true });
    }
  }
  if (!unread) return out;
  for (const run of runs) {
    const measure = byId.get(run.id);
    if (measure === undefined || judged.has(run.id) || !pinned(run, measure)) continue;
    if (run.passed && run.text !== null)
      out.set(run.id, { id: run.id, text: run.text, read: false });
  }
  return out;
}

/** What the page does with a question before anything could be sent to a model. */
export type Plan =
  /** An objection a person answered: shown « en clair », never sent. */
  | { route: 'reviewed'; slug: string }
  /** Whom to vote for: answered on the phone. */
  | { route: 'vote' }
  /** The search found nothing: « rien trouvé avec ces mots ». */
  | { route: 'nothing_found' }
  /** Measures found, and none of them has a sentence on this machine: nothing to explain. */
  | { route: 'no_sentence'; rows: string[] }
  /**
   * An explanation would be asked: with the sentences on the screen, the words of them that
   * the question uses and the cards it names — as the page computes them, never the question.
   */
  | { route: 'ask'; rows: string[]; gists: BenchGist[]; words: string[]; cards: string[] };

export function planOf(
  item: Pick<AskSetItem, 'question'>,
  rows: readonly string[],
  objections: readonly ReviewedEntry[],
  sentences: ReadonlyMap<string, BenchGist>,
  cards: readonly KnownCard[] = [],
): Plan {
  const slug = reviewedFor(item.question, objections);
  if (slug !== null) return { route: 'reviewed', slug };
  if (asksForVote(item.question)) return { route: 'vote' };
  if (rows.length === 0) return { route: 'nothing_found' };
  const gists = rows.flatMap((id) => sentences.get(id) ?? []).slice(0, MAX_CHAT_IDS);
  if (gists.length === 0) return { route: 'no_sentence', rows: [...rows] };
  return {
    route: 'ask',
    rows: [...rows],
    gists,
    words: askedWords(
      item.question,
      gists.map((gist) => gist.text),
    ),
    cards: notionsIn(item.question, cards),
  };
}

/** One question of the set, as the bench left it. */
export interface ExplainRow {
  item: string;
  model: string;
  follow: FollowUp | null;
  /** The day of the run, YYYY-MM-DD. */
  run: string;
  route: Plan['route'];
  /** The measures whose sentence was sent, and how many of those the editor had not read. */
  ids: string[];
  unread: number;
  /** False when nothing came back from the model: not asked, cut, or the allowance spent. */
  ran: boolean;
  /** What the control made of it: shown whole, or not at all — with the rule that refused. */
  kind: 'explain' | 'quiet' | null;
  rule: string | null;
  /** What the model wrote, when it wrote sentences: kept private, never printed. */
  sentences: string[] | null;
  neurons: number;
  ms: number | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** What `/api/bench` answered for an explanation, read strictly. */
export type Reply =
  | { kind: 'spent' }
  | { kind: 'silent'; ms: number | null }
  | {
      kind: 'ran';
      verdict: 'explain' | 'quiet';
      rule: string | null;
      sentences: string[] | null;
      neurons: number;
      ms: number | null;
    }
  | { kind: 'unreadable' };

export function readReply(body: unknown): Reply {
  if (!isRecord(body)) return { kind: 'unreadable' };
  const ms = typeof body['model_ms'] === 'number' ? body['model_ms'] : null;
  if (body['ran'] !== true) {
    return body['budget'] === 'spent' ? { kind: 'spent' } : { kind: 'silent', ms };
  }
  const verdict = body['verdict'];
  if (!isRecord(verdict) || (verdict['kind'] !== 'explain' && verdict['kind'] !== 'quiet')) {
    return { kind: 'unreadable' };
  }
  const refusal = verdict['refusal'];
  const rule = isRecord(refusal) && typeof refusal['rule'] === 'string' ? refusal['rule'] : null;
  const output = body['output'];
  const phrases = isRecord(output) ? output['phrases'] : null;
  const sentences =
    Array.isArray(phrases) && phrases.every((p): p is string => typeof p === 'string')
      ? [...phrases]
      : null;
  const neurons = typeof body['neurons'] === 'number' ? body['neurons'] : null;
  const reserved = typeof body['reserved'] === 'number' ? body['reserved'] : 0;
  return {
    kind: 'ran',
    verdict: verdict['kind'],
    rule,
    sentences,
    neurons: neurons ?? reserved,
    ms,
  };
}

export function parseRow(value: unknown): ExplainRow | null {
  if (!isRecord(value)) return null;
  const { item, model, follow, run, route, ids, unread, ran, kind, rule, sentences, neurons, ms } =
    value;
  const routes = ['reviewed', 'vote', 'nothing_found', 'no_sentence', 'ask'];
  if (typeof item !== 'string' || typeof model !== 'string' || typeof run !== 'string') return null;
  if (typeof route !== 'string' || !routes.includes(route)) return null;
  if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === 'string')) return null;
  if (typeof unread !== 'number' || typeof ran !== 'boolean' || typeof neurons !== 'number') {
    return null;
  }
  if (kind !== 'explain' && kind !== 'quiet' && kind !== null) return null;
  const again = follow === null ? null : FOLLOW_UPS.find((known) => known === follow);
  if (again === undefined) return null;
  const written =
    Array.isArray(sentences) && sentences.every((s): s is string => typeof s === 'string')
      ? [...sentences]
      : null;
  return {
    item,
    model,
    follow: again,
    run,
    route: route as Plan['route'],
    ids: [...ids],
    unread,
    ran,
    kind,
    rule: typeof rule === 'string' ? rule : null,
    sentences: written,
    neurons,
    ms: typeof ms === 'number' ? ms : null,
  };
}

export function readRows(path: string = EXPLAIN_ROWS_PATH): ExplainRow[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .flatMap((line) => {
      try {
        return parseRow(JSON.parse(line)) ?? [];
      } catch {
        return [];
      }
    });
}

/** The last line for each question, model and follow-up: a question asked again replaces itself. */
export function latest(rows: readonly ExplainRow[]): ExplainRow[] {
  const out = new Map<string, ExplainRow>();
  for (const row of rows) out.set(`${row.item}|${row.model}|${row.follow ?? ''}`, row);
  return [...out.values()];
}

const centile = (values: readonly number[], share: number): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1)] ?? null;
};

export interface Summary {
  /** How many questions of the set have a line. */
  rows: number;
  /** By route: what the page did before any model. */
  routes: Record<Plan['route'], number>;
  /** Of the questions sent: shown whole, refused by the control (by rule), nothing came back. */
  shown: number;
  quiet: Record<string, number>;
  silent: number;
  /** Shown explanations that hold what their question says they never may: the gate, at 0. */
  breaches: { item: string; group: AskGroup; pattern: string }[];
  /** Explanations shown that rest on a sentence the editor has not read yet. */
  onUnread: number;
  p50: number | null;
  p95: number | null;
  neurons: number;
}

/** What the lines say, against the set: numbers and identifiers, never a sentence. */
export function summarise(rows: readonly ExplainRow[], items: readonly AskSetItem[]): Summary {
  const byId = new Map(items.map((item) => [item.id, item]));
  const summary: Summary = {
    rows: rows.length,
    routes: { reviewed: 0, vote: 0, nothing_found: 0, no_sentence: 0, ask: 0 },
    shown: 0,
    quiet: {},
    silent: 0,
    breaches: [],
    onUnread: 0,
    p50: null,
    p95: null,
    neurons: 0,
  };
  const times: number[] = [];
  for (const row of rows) {
    summary.routes[row.route] += 1;
    summary.neurons += row.neurons;
    if (row.route !== 'ask') continue;
    if (!row.ran) {
      summary.silent += 1;
      continue;
    }
    if (row.ms !== null) times.push(row.ms);
    if (row.kind !== 'explain') {
      const rule = row.rule ?? 'nothing to explain';
      summary.quiet[rule] = (summary.quiet[rule] ?? 0) + 1;
      continue;
    }
    summary.shown += 1;
    if (row.unread > 0) summary.onUnread += 1;
    const item = byId.get(row.item);
    const pattern = item === undefined ? null : breaksNever(item, row.sentences ?? []);
    if (item !== undefined && pattern !== null) {
      summary.breaches.push({ item: item.id, group: item.group, pattern });
    }
  }
  summary.p50 = centile(times, 0.5);
  summary.p95 = centile(times, 0.95);
  summary.neurons = Math.round(summary.neurons * 100) / 100;
  return summary;
}

/** The gates a file can hold: what breaks them, in words — empty when both hold. */
export function gateProblems(summary: Summary): string[] {
  const out: string[] = [];
  if (summary.breaches.length > 0) {
    out.push(
      `${String(summary.breaches.length)} explanation(s) shown hold what their question forbids: ` +
        summary.breaches.map((b) => `${b.item} (${b.group})`).join(', '),
    );
  }
  if (summary.p95 !== null && summary.p95 >= MAX_P95_MS) {
    out.push(`p95 of ${String(summary.p95)} ms: the gate is under ${String(MAX_P95_MS)} ms`);
  }
  return out;
}

/** What a run needs from this machine: the sentences, the objections, the set and the search. */
function inputs(unread: boolean): {
  sentences: Map<string, BenchGist>;
  objections: ReviewedEntry[];
  cards: KnownCard[];
  items: AskSetItem[];
  page: ReturnType<typeof loadPage>;
} {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  return {
    sentences: sentencesOf(measuresOf(manifest), readVerdicts(), readRuns(), unread),
    objections: (
      JSON.parse(readFileSync('data/2026/riposte.json', 'utf8')) as { entries: ReviewedEntry[] }
    ).entries,
    // The cards a person wrote and re-read: those the page recognises, and the Worker knows.
    cards: knownOf(
      (
        JSON.parse(readFileSync('data/2026/glossary.json', 'utf8')) as {
          entries: Parameters<typeof knownOf>[0];
        }
      ).entries,
      [],
    ).cards,
    items: loadAskSet().items,
    page: loadPage(),
  };
}

/** What would happen to each question, by route and by group — counted, nothing asked. */
export function countPlans(plans: readonly { group: AskGroup; plan: Plan }[]): {
  routes: Record<Plan['route'], number>;
  sent: Record<string, number>;
  measures: number;
} {
  const routes: Record<Plan['route'], number> = {
    reviewed: 0,
    vote: 0,
    nothing_found: 0,
    no_sentence: 0,
    ask: 0,
  };
  const sent: Record<string, number> = {};
  const measures = new Set<string>();
  for (const { group, plan } of plans) {
    routes[plan.route] += 1;
    if (plan.route !== 'ask') continue;
    sent[group] = (sent[group] ?? 0) + 1;
    for (const gist of plan.gists) measures.add(gist.id);
  }
  return { routes, sent, measures: measures.size };
}

function plan(unread: boolean): number {
  const { sentences, objections, cards, items, page } = inputs(unread);
  const counted = countPlans(
    items.map((item) => ({
      group: item.group,
      plan: planOf(item, page(item.question).rows, objections, sentences, cards),
    })),
  );
  const { routes } = counted;
  console.log(
    `${String(items.length)} questions, ${String(sentences.size)} sentences on this machine` +
      (unread ? ' (those not read yet included)' : ' (read by the editor)'),
  );
  console.log(
    `  before any model: ${String(routes.reviewed)} answered by a person, ` +
      `${String(routes.vote)} vote, ${String(routes.nothing_found)} nothing found, ` +
      `${String(routes.no_sentence)} without a sentence`,
  );
  console.log(
    `  would be sent: ${String(routes.ask)}, about ${String(counted.measures)} measures — ` +
      (Object.entries(counted.sent)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, n]) => `${group} ${String(n)}`)
        .join(', ') || 'none'),
  );
  return 0;
}

function report(model: string | undefined): number {
  const set = loadAskSet();
  const rows = latest(readRows()).filter((row) => model === undefined || row.model === model);
  if (rows.length === 0) {
    console.log('no line yet: run --live first');
    return 0;
  }
  const keys = [...new Set(rows.map((row) => `${row.model}|${row.follow ?? ''}`))].sort();
  let failed = 0;
  for (const key of keys) {
    const [name, follow] = key.split('|');
    const mine = rows.filter((row) => `${row.model}|${row.follow ?? ''}` === key);
    const s = summarise(mine, set.items);
    console.log(
      `${String(name)}${follow === '' ? '' : ` (${String(follow)})`}: ${String(s.rows)} of ` +
        `${String(set.items.length)} questions`,
    );
    console.log(
      `  before any model: ${String(s.routes.reviewed)} answered by a person, ` +
        `${String(s.routes.vote)} vote, ${String(s.routes.nothing_found)} nothing found, ` +
        `${String(s.routes.no_sentence)} without a sentence`,
    );
    console.log(
      `  sent: ${String(s.routes.ask)} — shown ${String(s.shown)}, ` +
        `no answer ${String(s.silent)}, refused ` +
        (Object.entries(s.quiet)
          .sort(([, a], [, b]) => b - a)
          .map(([rule, n]) => `${rule} ${String(n)}`)
          .join(', ') || '0'),
    );
    console.log(
      `  p50 ${String(s.p50 ?? '—')} ms, p95 ${String(s.p95 ?? '—')} ms · ` +
        `${s.neurons.toFixed(2)} neurons · ${String(s.onUnread)} shown rest on a sentence not read yet`,
    );
    const problems = gateProblems(s);
    for (const problem of problems) console.log(`  ✖ ${problem}`);
    if (problems.length === 0) console.log('  ✔ the gates a file can hold');
    failed += problems.length;
  }
  return failed === 0 ? 0 : 1;
}

async function live(args: readonly string[]): Promise<number> {
  const value = (flag: string): string | undefined => {
    const at = args.indexOf(flag);
    return at === -1 ? undefined : args[at + 1];
  };
  const model = value('--model');
  const budget = Number(value('--budget'));
  if (!isModelKey(model) || !Number.isFinite(budget) || budget <= 0) {
    console.error('--live needs --model <key of src/worker/models.ts> and --budget <neurons>');
    return 2;
  }
  const asked = value('--follow');
  const follow = asked === undefined ? null : FOLLOW_UPS.find((known) => known === asked);
  if (follow === undefined) {
    console.error(`--follow takes one of: ${FOLLOW_UPS.join(', ')}`);
    return 2;
  }
  if (!existsSync(BENCH_KEY_PATH)) {
    console.error(`${BENCH_KEY_PATH} is not on this machine`);
    return 1;
  }
  const key = readFileSync(BENCH_KEY_PATH, 'utf8').trim();
  const url = new URL(process.env['BENCH_URL'] ?? BENCH_URL);
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    console.error('BENCH_URL must be an https address');
    return 2;
  }
  const { sentences, objections, cards, items, page } = inputs(args.includes('--unread'));
  const groups = new Set((value('--groups') ?? '').split(',').filter((g) => g !== ''));
  const limit = Number(value('--limit') ?? '0');
  const done = new Set(
    latest(readRows())
      .filter((row) => row.model === model && row.follow === follow && row.route !== 'no_sentence')
      .map((row) => row.item),
  );
  let todo = items.filter(
    (item) => !done.has(item.id) && (groups.size === 0 || groups.has(item.group)),
  );
  if (limit > 0) todo = todo.slice(0, limit);

  const run = new Date().toISOString().slice(0, 10);
  const clock = { last: 0 };
  mkdirSync(dirname(EXPLAIN_ROWS_PATH), { recursive: true });
  let spent = 0;
  let calls = 0;
  let code = 0;
  console.log(
    `explaining through ${url.hostname}: ${String(todo.length)} questions, ${MODELS[model].name}` +
      `${follow === null ? '' : ` (${follow})`}, budget ${String(budget)} neurons, ` +
      `${String(sentences.size)} sentences on this machine`,
  );
  for (const item of todo) {
    if (spent >= budget) {
      console.log(`budget of ${String(budget)} neurons reached: stopping`);
      break;
    }
    const plan = planOf(item, page(item.question).rows, objections, sentences, cards);
    const base = { item: item.id, model, follow, run, route: plan.route };
    const quiet = { ran: false, kind: null, rule: null, sentences: null, neurons: 0, ms: null };
    let row: ExplainRow;
    if (plan.route !== 'ask') {
      row = { ...base, ...quiet, ids: [], unread: 0 };
    } else {
      const ids = plan.gists.map((gist) => gist.id);
      const unread = plan.gists.filter((gist) => !gist.read).length;
      const response = await paced(
        () =>
          fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              key,
              model,
              mode: 'explain',
              // What `/api/chat` is sent, and nothing a visitor would have typed.
              gists: plan.gists.map(({ id, text }) => ({ id, text })),
              words: plan.words,
              cards: plan.cards,
              ...(follow === null ? {} : { follow }),
            }),
            signal: AbortSignal.timeout(60_000),
          }),
        clock,
      );
      calls += 1;
      if (!response.ok) {
        console.error(`/api/bench answered ${String(response.status)} for ${item.id}: stopping`);
        code = 1;
        break;
      }
      const reply = readReply(await response.json());
      if (reply.kind === 'spent') {
        console.log('the Worker says the allowance is spent: stopping — come back in half an hour');
        code = 3;
        break;
      }
      if (reply.kind === 'unreadable') {
        console.error(`unreadable answer for ${item.id}: stopping`);
        code = 1;
        break;
      }
      row =
        reply.kind === 'silent'
          ? { ...base, ...quiet, ids, unread, ms: reply.ms }
          : {
              ...base,
              ids,
              unread,
              ran: true,
              kind: reply.verdict,
              rule: reply.rule,
              sentences: reply.sentences,
              neurons: reply.neurons,
              ms: reply.ms,
            };
      spent += row.neurons;
    }
    appendFileSync(EXPLAIN_ROWS_PATH, `${JSON.stringify(row)}\n`);
    const said =
      row.route !== 'ask'
        ? row.route
        : !row.ran
          ? 'no answer'
          : row.kind === 'explain'
            ? `shown (${String(row.sentences?.length ?? 0)})`
            : `refused: ${row.rule ?? 'nothing to explain'}`;
    console.log(`${item.id} ${said}${row.ms === null ? '' : ` · ${String(row.ms)} ms`}`);
  }
  console.log(`\n${String(calls)} calls, ${spent.toFixed(2)} neurons`);
  if (spent > 0 && existsSync(NEURONS_LOG)) {
    appendFileSync(
      NEURONS_LOG,
      `| ${run} | banc des explications — ${MODELS[model].name}` +
        `${follow === null ? '' : `, relance « ${follow} »`} | ${String(calls)} appels | ` +
        `${spent.toFixed(2)} neurons |\n`,
    );
    console.log(`line added to ${NEURONS_LOG}`);
  }
  return code;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.includes('--live')) return live(args);
  if (args.includes('--plan')) return plan(args.includes('--unread'));
  if (args.includes('--report')) {
    const at = args.indexOf('--model');
    return report(at === -1 ? undefined : args[at + 1]);
  }
  console.error(
    'usage: bench-explain.ts --live --model <key> --budget <neurons> | --report | --plan [--unread]',
  );
  return 2;
}

// Run as a script, not when a test imports it.
if (process.argv[1]?.endsWith('bench-explain.ts') === true) {
  process.exitCode = await main();
}
