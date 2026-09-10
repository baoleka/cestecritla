/**
 * aec-lab-fts — T7 lab Worker: lexical retrieval over D1 + FTS5, and the hashed Q/R cache.
 *
 *   GET /search?q=<question>[&mode=and-or|or][&x=<expansion phrases>][&p=<prefix min length>]
 *       -> { ids, hits: [{ id, score, stage }], queries: [{ stage, match, rows_read, duration_ms… }] }
 *   GET /cache?q=<question>          -> same as /search through the q_cache table (hit / miss)
 *   GET /stats                       -> row counts and database size (meta.size_after)
 *
 * Pipeline (mirrors variant A of eval/retrieval-core.ts): normalize + stopwords + light stemming on
 * the question, then FTS5 MATCH on the `unicode61 remove_diacritics 2` index:
 *   stage "and"  every term required (prefix wildcard on terms >= p characters),
 *   stage "or"   fallback when fewer than k documents match all terms,
 *   stage "x"    optional expansion phrases (glossary / FAQ aliases), weighted 0.25 like A-synonymes-0.25.
 * bm25(propositions_fts, 1.0, 0.6) reproduces the text 1 / prefix 0.6 field boosts.
 */
import {
  cacheKeyMaterial,
  matchAll,
  matchAny,
  queryTerms,
  sha256Hex,
  type MatchOptions,
} from './query.ts';

const TOP_K = 10;
const EXPANSION_WEIGHT = 0.25;
const EXPANSION_LIMIT = 30;
const CACHE_TTL_SECONDS = 7 * 24 * 3600;
const DEFAULT_PREFIX_MIN_LENGTH = 3;
const MAX_QUERY_LENGTH = 500;
// Upper bound on the number of terms sent to FTS5 (the evaluation set peaks at 7 terms). A 500-character
// question of 120 distinct 3-letter prefixes read 1 736 rows (= every row of both FTS columns) against
// 118 p50 / 474 p95 for real questions (review, 9/9/2026): rows_read is bounded by the corpus, this cap
// bounds the MATCH expression and the JSON echoed back.
const MAX_TERMS = 12;
const DAY_SECONDS = 86_400;

type Stage = 'and' | 'or' | 'x';
type Mode = 'and-or' | 'or';

interface FtsRow {
  readonly id: string;
  readonly section_id: string | null;
  readonly chapter_id: string | null;
  readonly rank: number;
}

interface Hit {
  readonly id: string;
  readonly section_id: string | null;
  readonly chapter_id: string | null;
  /** -bm25 (higher is better), expansion contribution folded in. */
  score: number;
  readonly stage: Stage;
}

interface QueryTrace {
  readonly stage: Stage;
  readonly match: string;
  readonly matched: number;
  readonly rows_read: number;
  readonly rows_written: number;
  /** D1 `meta.duration` (ms, includes D1's own network hop from the Worker). */
  readonly duration_ms: number;
  /** D1 `meta.timings.sql_duration_ms` (SQLite execution only). */
  readonly sql_ms: number | null;
  readonly served_by_colo: string | null;
  readonly served_by_primary: boolean | null;
}

interface SearchResult {
  readonly q: string;
  readonly mode: Mode;
  readonly terms: readonly string[];
  readonly expansion_terms: readonly string[];
  readonly prefix_min_length: number;
  readonly ids: readonly string[];
  readonly hits: readonly Hit[];
  readonly queries: readonly QueryTrace[];
  readonly rows_read_total: number;
  readonly d1_duration_ms_total: number;
  readonly corpus_version: string;
}

const CORPUS_VERSION = 'd29c7422004ab27c';

const SQL_SEARCH =
  'SELECT id, section_id, chapter_id, bm25(propositions_fts, 1.0, 0.6) AS rank ' +
  'FROM propositions_fts WHERE propositions_fts MATCH ?1 ORDER BY rank LIMIT ?2';

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      ...extraHeaders,
    },
  });
}

async function runMatch(
  db: D1Database,
  stage: Stage,
  match: string,
  limit: number,
): Promise<{ rows: FtsRow[]; trace: QueryTrace }> {
  const result = await db.prepare(SQL_SEARCH).bind(match, limit).all<FtsRow>();
  const meta = result.meta;
  return {
    rows: result.results,
    trace: {
      stage,
      match,
      matched: result.results.length,
      rows_read: meta.rows_read,
      rows_written: meta.rows_written,
      duration_ms: meta.duration,
      sql_ms: meta.timings?.sql_duration_ms ?? null,
      served_by_colo: meta.served_by_colo ?? null,
      served_by_primary: meta.served_by_primary ?? null,
    },
  };
}

async function search(
  db: D1Database,
  q: string,
  mode: Mode,
  expansionText: string,
  prefixMinLength: number,
): Promise<SearchResult> {
  const terms = queryTerms(q).slice(0, MAX_TERMS);
  const present = new Set(terms);
  const expansionTerms = queryTerms(expansionText)
    .filter((t) => !present.has(t))
    .slice(0, MAX_TERMS);
  const options: MatchOptions = { prefixMinLength };
  const queries: QueryTrace[] = [];
  const byId = new Map<string, Hit>();
  const andHits: Hit[] = [];
  const orHits: Hit[] = [];

  if (terms.length > 0) {
    if (mode === 'and-or') {
      const and = await runMatch(db, 'and', matchAll(terms, options), TOP_K);
      queries.push(and.trace);
      for (const r of and.rows) {
        const hit: Hit = { ...r, score: -r.rank, stage: 'and' };
        byId.set(r.id, hit);
        andHits.push(hit);
      }
    }
    if (mode === 'or' || andHits.length < TOP_K) {
      // Single-term questions: the AND and OR expressions are identical, skip the second query.
      const skip = mode === 'and-or' && terms.length === 1;
      if (!skip) {
        const or = await runMatch(db, 'or', matchAny(terms, options), TOP_K);
        queries.push(or.trace);
        for (const r of or.rows) {
          if (byId.has(r.id)) continue;
          const hit: Hit = { ...r, score: -r.rank, stage: 'or' };
          byId.set(r.id, hit);
          orHits.push(hit);
        }
      }
    }
  }

  if (expansionTerms.length > 0) {
    const x = await runMatch(db, 'x', matchAny(expansionTerms, options), EXPANSION_LIMIT);
    queries.push(x.trace);
    for (const r of x.rows) {
      const existing = byId.get(r.id);
      if (existing !== undefined) {
        existing.score += EXPANSION_WEIGHT * -r.rank;
        continue;
      }
      const hit: Hit = { ...r, score: EXPANSION_WEIGHT * -r.rank, stage: 'x' };
      byId.set(r.id, hit);
      orHits.push(hit);
    }
  }

  // Documents matching every term stay on top; the OR / expansion pool is re-ranked by score.
  orHits.sort((a, b) => b.score - a.score);
  andHits.sort((a, b) => b.score - a.score);
  const hits = [...andHits, ...orHits].slice(0, TOP_K);

  return {
    q,
    mode,
    terms,
    expansion_terms: expansionTerms,
    prefix_min_length: prefixMinLength,
    ids: hits.map((h) => h.id),
    hits,
    queries,
    rows_read_total: queries.reduce((s, t) => s + t.rows_read, 0),
    d1_duration_ms_total: queries.reduce((s, t) => s + t.duration_ms, 0),
    corpus_version: CORPUS_VERSION,
  };
}

interface CacheRow {
  readonly ids: string;
  readonly expires_at: number;
  readonly corpus_version: string;
}

interface CacheResult {
  readonly cache: 'hit' | 'miss' | 'bypass';
  readonly qhash: string;
  readonly ids: readonly string[];
  readonly cache_queries: readonly {
    readonly op: 'select' | 'insert';
    readonly rows_read: number;
    readonly rows_written: number;
    readonly duration_ms: number;
  }[];
  readonly search: SearchResult | null;
}

/** Q/R cache (D0.22): key = SHA-256 of the sorted stemmed terms; value = ids only. */
async function cachedSearch(
  db: D1Database,
  q: string,
  prefixMinLength: number,
): Promise<CacheResult> {
  const material = cacheKeyMaterial(q);
  if (material.length === 0) {
    return { cache: 'bypass', qhash: '', ids: [], cache_queries: [], search: null };
  }
  const qhash = await sha256Hex(`${CORPUS_VERSION}\n${material}`);
  const now = Math.floor(Date.now() / 1000);
  // D0.22: day precision only. A row must never carry a timestamp that could be matched with a visit.
  const today = Math.floor(now / DAY_SECONDS) * DAY_SECONDS;
  const lookup = await db
    .prepare('SELECT ids, expires_at, corpus_version FROM q_cache WHERE qhash = ?1')
    .bind(qhash)
    .all<CacheRow>();
  const cacheQueries: CacheResult['cache_queries'][number][] = [
    {
      op: 'select',
      rows_read: lookup.meta.rows_read,
      rows_written: lookup.meta.rows_written,
      duration_ms: lookup.meta.duration,
    },
  ];
  const row = lookup.results[0];
  if (row !== undefined && row.expires_at > now && row.corpus_version === CORPUS_VERSION) {
    const ids = JSON.parse(row.ids) as string[];
    return { cache: 'hit', qhash, ids, cache_queries: cacheQueries, search: null };
  }
  const result = await search(db, q, 'and-or', '', prefixMinLength);
  const insert = await db
    .prepare(
      'INSERT OR REPLACE INTO q_cache (qhash, ids, corpus_version, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5)',
    )
    .bind(qhash, JSON.stringify(result.ids), CORPUS_VERSION, today, today + CACHE_TTL_SECONDS)
    .run();
  cacheQueries.push({
    op: 'insert',
    rows_read: insert.meta.rows_read,
    rows_written: insert.meta.rows_written,
    duration_ms: insert.meta.duration,
  });
  return { cache: 'miss', qhash, ids: result.ids, cache_queries: cacheQueries, search: result };
}

function parseMode(value: string | null): Mode {
  return value === 'or' ? 'or' : 'and-or';
}

function parsePrefixMinLength(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : DEFAULT_PREFIX_MIN_LENGTH;
}

function readQuestion(url: URL): string | null {
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length === 0 || q.length > MAX_QUERY_LENGTH) return null;
  return q;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405);
    try {
      switch (url.pathname) {
        case '/': {
          return json({
            lab: 'aec-lab-fts',
            routes: ['/search?q=&mode=and-or|or&x=&p=', '/cache?q=', '/stats'],
            corpus_version: CORPUS_VERSION,
          });
        }
        case '/search': {
          const q = readQuestion(url);
          if (q === null)
            return json(
              { error: `q is required (1..${String(MAX_QUERY_LENGTH)} characters)` },
              400,
            );
          const result = await search(
            env.DB,
            q,
            parseMode(url.searchParams.get('mode')),
            url.searchParams.get('x') ?? '',
            parsePrefixMinLength(url.searchParams.get('p')),
          );
          return json(result, 200, {
            'x-d1-rows-read': String(result.rows_read_total),
            'x-d1-queries': String(result.queries.length),
          });
        }
        case '/cache': {
          const q = readQuestion(url);
          if (q === null) return json({ error: 'q is required' }, 400);
          const result = await cachedSearch(
            env.DB,
            q,
            parsePrefixMinLength(url.searchParams.get('p')),
          );
          return json(result, 200, { 'x-q-cache': result.cache });
        }
        case '/stats': {
          const [units, fts, cache, vocab] = await env.DB.batch<{ n: number }>([
            env.DB.prepare('SELECT count(*) AS n FROM propositions'),
            env.DB.prepare('SELECT count(*) AS n FROM propositions_fts'),
            env.DB.prepare('SELECT count(*) AS n FROM q_cache'),
            env.DB.prepare('SELECT count(*) AS n FROM propositions_fts_v'),
          ]);
          return json({
            propositions: units?.results[0]?.n ?? null,
            propositions_fts: fts?.results[0]?.n ?? null,
            q_cache_rows: cache?.results[0]?.n ?? null,
            fts_distinct_terms: vocab?.results[0]?.n ?? null,
            size_after_bytes: vocab?.meta.size_after ?? null,
            rows_read: [units, fts, cache, vocab].reduce((s, r) => s + (r?.meta.rows_read ?? 0), 0),
          });
        }
        default:
          return json({ error: 'not found' }, 404);
      }
    } catch (error) {
      // FTS5 syntax errors and D1 errors end here; the message goes back to the requester only (no log).
      const message = error instanceof Error ? error.message : 'unknown error';
      return json({ error: 'search failed', detail: message }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
