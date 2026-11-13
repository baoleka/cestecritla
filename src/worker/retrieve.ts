/**
 * What the model is given to read (D16.2, PLAN-JEU §2.1): the ten propositions the question
 * finds best, plus the rest of the two sections it finds best — the context the September bench
 * measured at 0.94 recall (08-ia.md §3). Deterministic: the same question always gets the same
 * measures, in the same order.
 *
 * The search runs in the private base, not here: the Worker orchestrates, it does not compute
 * (10 ms of CPU). Two round trips — the index, then the text of what was chosen.
 *
 * Learning note — why stems on both sides. SQLite's full-text search has no French stemmer.
 * The index therefore stores the words already cut by src/lib/search-core.ts (`terms`), and a
 * question is cut by the same function before it is asked: « retraites » meets « retraite »
 * because both became the same stem before SQLite ever saw them — exactly as on the page.
 *
 * Typed against the two methods of D1 it uses, so that the same code runs on Node's SQLite in
 * the bench and in the tests (scripts/d1-local.ts).
 */
import type { Candidate } from '../lib/ask-contract.js';
import {
  SEARCH,
  expand,
  groupBySection,
  terms,
  type Hit,
  type SynonymGroup,
} from '../lib/search-core.js';

export interface AskStatement {
  bind(...values: unknown[]): AskStatement;
  all(): Promise<{ results?: unknown[] }>;
}
export interface AskDb {
  prepare(sql: string): AskStatement;
  batch(statements: AskStatement[]): Promise<{ results?: unknown[] }[]>;
}

export const TOP_PROPOSITIONS = 10;
export const BEST_SECTIONS = 2;
/** Bounds on what one question may cost: measures, and characters of their text. */
export const MAX_CANDIDATES = 24;
export const MAX_CONTEXT_CHARS = 6000;
/** A question is a few words: more than this is a paste, and an expensive MATCH. */
const MAX_QUERY_TERMS = 24;
/** Rows of the index read per query: enough to rank sections, few enough to stay cheap. */
const INDEX_ROWS = 40;

const META_SQL = 'SELECT key, value FROM meta';
const INDEX_SQL =
  'SELECT id, section_id, bm25(propositions_fts, 1.0, 0.6) AS score FROM propositions_fts ' +
  `WHERE propositions_fts MATCH ? ORDER BY score LIMIT ${String(INDEX_ROWS)}`;

/** What the base says of itself, read with every question. */
export interface BaseState {
  /** The state of the book it holds, or null when it holds none. */
  corpusVersion: string | null;
  /** False when the editor has stopped the answers (meta.ask = 'stopped'). */
  open: boolean;
}

export interface Retrieved {
  state: BaseState;
  /** Best first. Empty when the question finds nothing. */
  candidates: Candidate[];
}

/**
 * The MATCH expression of a text: its stems, any of them, each quoted — a bare `or` or `not`
 * would be read as an operator — and open-ended from four letters, like the search of the page.
 * Null when the text has no word of its own.
 */
export function ftsMatch(text: string): string | null {
  const own = [...new Set(terms(text))].slice(0, MAX_QUERY_TERMS);
  if (own.length === 0) return null;
  return own
    .map((term) => (term.length >= SEARCH.prefixMinLength ? `"${term}"*` : `"${term}"`))
    .join(' OR ');
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function readState(rows: readonly unknown[]): BaseState {
  const meta = new Map<string, string>();
  for (const row of rows) {
    if (isRecord(row) && typeof row['key'] === 'string' && typeof row['value'] === 'string') {
      meta.set(row['key'], row['value']);
    }
  }
  // Anything but an explicit 'open' is closed: a base that was never switched on stays off.
  return { corpusVersion: meta.get('corpus_version') ?? null, open: meta.get('ask') === 'open' };
}

/** FTS5 ranks with negative numbers, best first: turned into a score that grows with relevance. */
function readHits(rows: readonly unknown[], weight: number, into: Map<string, number>): void {
  for (const row of rows) {
    if (!isRecord(row) || typeof row['id'] !== 'string' || typeof row['score'] !== 'number')
      continue;
    into.set(row['id'], (into.get(row['id']) ?? 0) + -row['score'] * weight);
  }
}

interface Row {
  id: string;
  sectionId: string;
  ord: number;
  text: string;
}

function readRows(rows: readonly unknown[]): Row[] {
  const out: Row[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const { id, section_id: sectionId, ord, text, lead } = row;
    if (typeof id !== 'string' || typeof sectionId !== 'string' || typeof ord !== 'number')
      continue;
    if (typeof text !== 'string' || typeof lead !== 'string') continue;
    // A sub-measure is read under the measure it details: alone it is often half a sentence.
    out.push({ id, sectionId, ord, text: lead === '' ? text : `${lead} ${text}` });
  }
  return out;
}

/**
 * The ten best propositions in the order of the search, then what is left of the two best
 * sections in the order of the book — bounded in number and in characters, never below three.
 */
export function assemble(hits: readonly Hit[], rows: readonly Row[]): Candidate[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered: Row[] = [];
  const seen = new Set<string>();
  const take = (row: Row | undefined): void => {
    if (row === undefined || seen.has(row.id)) return;
    seen.add(row.id);
    ordered.push(row);
  };
  for (const hit of hits.slice(0, TOP_PROPOSITIONS)) take(byId.get(hit.id));
  for (const section of groupBySection(hits).slice(0, BEST_SECTIONS)) {
    for (const row of rows
      .filter((r) => r.sectionId === section.sectionId)
      .sort((a, b) => a.ord - b.ord)) {
      take(row);
    }
  }
  const out: Candidate[] = [];
  let characters = 0;
  for (const row of ordered) {
    if (out.length >= MAX_CANDIDATES) break;
    if (out.length >= 3 && characters + row.text.length > MAX_CONTEXT_CHARS) break;
    characters += row.text.length;
    out.push({ id: row.id, text: row.text });
  }
  return out;
}

/**
 * Reads the state of the base and the measures a question finds. The synonyms are ours, the
 * same file the page uses: the words people say, next to the words the book uses.
 */
export async function retrieve(
  db: AskDb,
  question: string,
  synonyms: readonly SynonymGroup[],
): Promise<Retrieved> {
  const own = ftsMatch(question);
  const wider = ftsMatch(expand(question, synonyms));
  const statements = [db.prepare(META_SQL)];
  if (own !== null) statements.push(db.prepare(INDEX_SQL).bind(own));
  if (own !== null && wider !== null) statements.push(db.prepare(INDEX_SQL).bind(wider));
  const [meta, first, second] = await db.batch(statements);
  const state = readState(meta?.results ?? []);

  const scores = new Map<string, number>();
  readHits(first?.results ?? [], 1, scores);
  readHits(second?.results ?? [], SEARCH.expansionBoost, scores);
  // Ties are broken by identifier: the order must not depend on how SQLite happened to scan.
  const hits: Hit[] = [...scores]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  if (hits.length === 0) return { state, candidates: [] };

  const top = hits.slice(0, TOP_PROPOSITIONS).map((hit) => hit.id);
  const sections = groupBySection(hits)
    .slice(0, BEST_SECTIONS)
    .map((section) => section.sectionId);
  const marks = (n: number): string => Array.from({ length: n }, () => '?').join(', ');
  const texts = await db
    .prepare(
      'SELECT id, section_id, ord, text, lead FROM propositions ' +
        `WHERE id IN (${marks(top.length)}) OR section_id IN (${marks(sections.length)})`,
    )
    .bind(...top, ...sections)
    .all();
  return { state, candidates: assemble(hits, readRows(texts.results ?? [])) };
}
