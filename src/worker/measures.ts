/**
 * What the model is given to read (D16.2, D16.22): the measures the request names, in the
 * order it names them — the order of the page's own search — read from the private base.
 *
 * The Worker no longer searches. Until D16.22 a question came here and was looked up in a
 * full-text index of the book; the question no longer comes, so there is nothing to look up
 * with: the page searched, on the phone, and sends what it found. The base is now a table of
 * measures read by identifier, one round trip, and the index it used to hold is gone — one
 * derived copy of the text less at Cloudflare.
 *
 * The same base holds what may be handed out in place of a model's writing: the sentences
 * written ahead, one per measure, each read by the editor (`loadGists`, at the end of this
 * file). They are read the same way — by identifier, one round trip — under a switch of their
 * own.
 *
 * Typed against the two methods of D1 it uses, so that the same code runs on Node's SQLite in
 * the tests (scripts/d1-local.ts).
 */
import type { Candidate } from '../lib/ask-contract.js';
import { terms } from '../lib/search-core.js';

export interface AskStatement {
  bind(...values: unknown[]): AskStatement;
  all(): Promise<{ results?: unknown[] }>;
}
export interface AskDb {
  prepare(sql: string): AskStatement;
  batch(statements: AskStatement[]): Promise<{ results?: unknown[] }[]>;
}

/** Bounds on what one request may cost: measures, and characters of their text. */
export const MAX_CANDIDATES = 24;
export const MAX_CONTEXT_CHARS = 6000;

const META_SQL = 'SELECT key, value FROM meta';

/** What the base says of itself, read with every request. */
export interface BaseState {
  /** The state of the book it holds — or its sentences were read against — or null. */
  corpusVersion: string | null;
  /** False when the editor has stopped them (meta.ask, or meta.gists, = 'stopped'). */
  open: boolean;
}

export interface Loaded {
  state: BaseState;
  /** In the order the request named them. Empty when the base knows none of them. */
  candidates: Candidate[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * The state of one of the two things the base holds, each under its own keys: the text of the
 * book (`corpus_version`, `ask`) and the sentences written ahead (`gists_corpus`, `gists`).
 */
function readState(rows: readonly unknown[], corpusKey: string, switchKey: string): BaseState {
  const meta = new Map<string, string>();
  for (const row of rows) {
    if (isRecord(row) && typeof row['key'] === 'string' && typeof row['value'] === 'string') {
      meta.set(row['key'], row['value']);
    }
  }
  // Anything but an explicit 'open' is closed: a base that was never switched on stays off.
  return { corpusVersion: meta.get(corpusKey) ?? null, open: meta.get(switchKey) === 'open' };
}

function readTexts(rows: readonly unknown[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const { id, text, lead } = row;
    if (typeof id !== 'string' || typeof text !== 'string' || typeof lead !== 'string') continue;
    // A sub-measure is read under the measure it details: alone it is often half a sentence.
    out.set(id, lead === '' ? text : `${lead} ${text}`);
  }
  return out;
}

/**
 * The measures a request names, as the model will read them — bounded in number and in
 * characters, never below three: a request cannot make one call cost more than another.
 */
export function bounded(ids: readonly string[], texts: ReadonlyMap<string, string>): Candidate[] {
  const out: Candidate[] = [];
  let characters = 0;
  for (const id of ids) {
    const text = texts.get(id);
    if (text === undefined || out.some((candidate) => candidate.id === id)) continue;
    if (out.length >= MAX_CANDIDATES) break;
    if (out.length >= 3 && characters + text.length > MAX_CONTEXT_CHARS) break;
    characters += text.length;
    out.push({ id, text });
  }
  return out;
}

/** Reads the state of the base and the measures named, in one round trip. */
export async function loadMeasures(db: AskDb, ids: readonly string[]): Promise<Loaded> {
  const named = ids.slice(0, MAX_CANDIDATES);
  const marks = named.map(() => '?').join(', ');
  const statements = [db.prepare(META_SQL)];
  if (named.length > 0) {
    statements.push(
      db.prepare(`SELECT id, text, lead FROM propositions WHERE id IN (${marks})`).bind(...named),
    );
  }
  const [meta, rows] = await db.batch(statements);
  return {
    state: readState(meta?.results ?? [], 'corpus_version', 'ask'),
    candidates: bounded(named, readTexts(rows?.results ?? [])),
  };
}

/**
 * The sentences written ahead (PLAN-CHAT §3): one sentence of ours per measure, written by a
 * model before any visitor came, read by the editor one by one, and kept in the base next to
 * the fingerprint of the measure it was read against. Reading them calls no model and costs no
 * neuron — and none of them is a word of the book.
 */
export interface Gist {
  id: string;
  text: string;
}

/**
 * How many sentences one request may ask for: as many measures as a request of the page may
 * name. The page's contract owns that number; a test holds this one to it until a route reads
 * both (scripts/ask-worker.test.ts).
 */
export const MAX_GISTS = 3;

export interface LoadedGists {
  /** What the base says of its sentences: the book they were read against, and their switch. */
  state: BaseState;
  /** In the order the request named them. A measure with no sentence is simply not there. */
  gists: Gist[];
}

/**
 * The sentences of the measures named, by identifier and in one round trip — and none at all
 * unless the editor opened them (`gists`, a switch of its own: stopping the written answers
 * does not stop these, nor the reverse) for the very state of the book the caller serves.
 *
 * Both conditions are held twice: by the query, so that a stopped base hands no row out, and
 * by the state read in the same batch, so that a query edited one day cannot open it alone.
 */
export async function loadGists(
  db: AskDb,
  ids: readonly string[],
  corpusVersion: string,
): Promise<LoadedGists> {
  const named = ids.slice(0, MAX_GISTS);
  const marks = named.map(() => '?').join(', ');
  const statements = [db.prepare(META_SQL)];
  if (named.length > 0) {
    statements.push(
      db
        .prepare(
          `SELECT id, text FROM gists WHERE id IN (${marks})` +
            " AND (SELECT value FROM meta WHERE key = 'gists') = 'open'" +
            " AND (SELECT value FROM meta WHERE key = 'gists_corpus') = ?",
        )
        .bind(...named, corpusVersion),
    );
  }
  const [meta, rows] = await db.batch(statements);
  const state = readState(meta?.results ?? [], 'gists_corpus', 'gists');
  if (!state.open || state.corpusVersion !== corpusVersion) return { state, gists: [] };
  const texts = new Map<string, string>();
  for (const row of rows?.results ?? []) {
    if (isRecord(row) && typeof row['id'] === 'string' && typeof row['text'] === 'string') {
      texts.set(row['id'], row['text']);
    }
  }
  const gists: Gist[] = [];
  for (const id of named) {
    const text = texts.get(id);
    if (text !== undefined && !gists.some((gist) => gist.id === id)) gists.push({ id, text });
  }
  return { state, gists };
}

/**
 * The words that go to the model with the measures: of those the request carries, the ones the
 * measures themselves hold — cut as the index cuts them. A request is written by a browser we
 * do not control; whatever it puts in `terms`, only words of these very measures get through,
 * sorted. Nothing that is not already in front of the model can be added to what it reads.
 */
export function keptTerms(asked: readonly string[], candidates: readonly Candidate[]): string[] {
  const held = new Set(candidates.flatMap((candidate) => terms(candidate.text)));
  return [...new Set(asked)].filter((term) => held.has(term)).sort();
}
