/**
 * Query-side pipeline shared by the Worker and the Node scripts (no dependency, no I/O).
 *
 * Mirrors `eval/retrieval-core.ts` (variant A, MiniSearch): same normalization, stopwords and
 * light stemmer, so that FTS5 and MiniSearch see the same query terms. `scripts/build-sql.ts`
 * asserts that both pipelines agree on every corpus token (drift check).
 *
 * Index side, FTS5 does its own tokenization (`unicode61 remove_diacritics 2`): lowercase,
 * diacritics folded, split on non-alphanumerics. The indexed copy of the text only merges digit
 * groups ("10 000" -> "10000") so that numbers match the same way on both sides.
 */
import { STOPWORDS } from './stopwords.generated.ts';

/** Lowercase, NFD accent stripping, unified apostrophes, elisions, digit groups merged. */
export function normalize(text: string): string {
  let s = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2019'`\u00b4]/g, "'")
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/aujourd'hui/g, 'aujourdhui');
  s = s.replace(/\b(l|d|qu|j|n|s|c|m|t|jusqu|lorsqu|puisqu)'(?=[a-z0-9])/g, '');
  return mergeDigitGroups(s);
}

/** "10 000" -> "10000" (thousands separators written with a space, in the corpus and in questions). */
export function mergeDigitGroups(s: string): string {
  let previous = '';
  let out = s;
  while (previous !== out) {
    previous = out;
    out = out.replace(/(\d)\s(\d{3})(?!\d)/g, '$1$2');
  }
  return out;
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/** Light French stemming: plural 's', feminine 'ée' -> 'é', 'eaux' -> 'eau', 'aux' -> 'al', 'ement' / 'ent'. */
export function stem(term: string): string {
  let t = term;
  if (t.length >= 4 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
  if (t.length >= 4 && t.endsWith('ee')) t = t.slice(0, -1);
  if (t.length >= 5 && t.endsWith('eaux')) t = t.slice(0, -1);
  else if (t.length >= 5 && t.endsWith('aux')) t = `${t.slice(0, -3)}al`;
  if (t.endsWith('ement') && t.length - 5 >= 4) t = t.slice(0, -5);
  else if (t.endsWith('ent') && !t.endsWith('ement') && t.length - 3 >= 5) t = t.slice(0, -3);
  return t;
}

/** Stopword removal then stemming; `null` drops the term. */
export function processTerm(term: string): string | null {
  if (STOPWORDS.has(term)) return null;
  if (term.length < 2 && !/\d/.test(term)) return null;
  return stem(term);
}

/** Query terms as MiniSearch would see them (deduplicated, order kept). */
export function queryTerms(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tokenize(text)) {
    const t = processTerm(raw);
    if (t === null || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export interface MatchOptions {
  /** Terms at least this long (after stemming) get a prefix wildcard; shorter ones match exactly. */
  readonly prefixMinLength: number;
}

/**
 * One FTS5 token: always double-quoted (a bareword such as `or` / `not` would be read as an
 * operator otherwise); `"retrait"*` matches retraite, retraites, retraité·es…
 */
function ftsToken(term: string, options: MatchOptions): string {
  const quoted = `"${term.replace(/"/g, '')}"`;
  return term.length >= options.prefixMinLength ? `${quoted}*` : quoted;
}

/** MATCH expression requiring every term (FTS5 implicit AND). */
export function matchAll(terms: readonly string[], options: MatchOptions): string {
  return terms.map((t) => ftsToken(t, options)).join(' ');
}

/** MATCH expression accepting any term (bm25 then favours documents matching several). */
export function matchAny(terms: readonly string[], options: MatchOptions): string {
  return terms.map((t) => ftsToken(t, options)).join(' OR ');
}

/**
 * Cache key material (D0.22): the sorted, deduplicated query terms — never the raw question.
 * Two phrasings of the same question ("c'est quoi la règle verte ?" / "règle verte") share a key.
 */
export function cacheKeyMaterial(text: string): string {
  return [...queryTerms(text)].sort().join(' ');
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
