/**
 * Fills the private base of « Demander » (D16.6) — the one place outside this machine where
 * the text of the 2026 edition is allowed to live: a Cloudflare D1 database only the Worker
 * reads, and never serves. Since the plan of 14 November 2026 (PLAN-CHAT §3) the same base
 * holds the sentences written ahead, one per measure, each read by the editor: those are ours,
 * and they are what a route may hand out.
 *
 *   npx tsx scripts/seed-ask-2026.ts --text [--check]
 *       writes private/ask/seed-<corpus>.sql and prints what it holds (numbers only); with
 *       `--check`, loads it into Node's SQLite and checks every row against the public manifest
 *   npx tsx scripts/seed-ask-2026.ts --text --remote <database> --accord <YYYY-MM-DD>
 *       uploads the text of the book — its own mode, named on the line: no other command, nor a
 *       mistyped one, ever falls back to it (review 14, E1)
 *   npx tsx scripts/seed-ask-2026.ts --gists [--check] [--fewer]
 *       the same for the sentences read and kept (private/gists/verdicts.jsonl — the session's
 *       verdicts, or the editor's at the reading desk): a file of its own,
 *       private/ask/gists-<corpus>.sql, that touches nothing of the text. It replaces every
 *       sentence of the base: fewer than the deposit data/2026/ask.json records is refused
 *       unless `--fewer` says so (E2)
 *   npx tsx scripts/seed-ask-2026.ts --gists --remote <database> --accord <YYYY-MM-DD>
 *       uploads that one
 *   npx tsx scripts/seed-ask-2026.ts --switch open|stopped --what gists|ask --remote <database> [--accord <YYYY-MM-DD>]
 *       opens or stops the sentences written ahead (`gists`) — or the written answers of the
 *       closed `/api/ask` (`ask`) — with no deployment (runbook sheets 6 and 8). `--what` is
 *       required, and the command fails when the base holds no such switch. Stopping needs
 *       nothing more: what closes always may. Opening needs today's accord (E4)
 *   npx tsx scripts/seed-ask-2026.ts --withdraw-text --remote <database> --accord <YYYY-MM-DD>
 *       takes the text of the book OUT of the base, and leaves the sentences as they are:
 *       once they are written nothing reads the text there any more (PLAN-CHAT §7). The text
 *       stays on this machine; depositing it again is `--text`.
 *   npx tsx scripts/seed-ask-2026.ts --withdraw-gists --remote <database> --accord <YYYY-MM-DD>
 *       takes the sentences OUT of the base — the third gesture of the withdrawal of the site
 *       (D21.36, runbook sheet 9 of 14-risques.md §4): they stay on this machine, and
 *       depositing them again is `--gists`.
 *
 * One mode per command, and nothing else on the line: a flag the tool does not know, a flag
 * without its value, `--flag=value`, a word alone, a flag written twice, or two modes at once
 * stop it before anything is read (E3, E6). `--env preview` is accepted and changes nothing:
 * every host reads the same base (E8).
 *
 * Sending anything is the editor's decision, each time (CLAUDE.md): `--accord` must carry
 * today's date, so that the command line itself says when the accord was given. Without it
 * nothing leaves the machine. Both deposits start STOPPED: each opens by a second gesture, and
 * each owns its rows and its keys of `meta` — depositing one never erases the other.
 *
 * Like every tool that reads private/, it prints identifiers and numbers, never a word.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { MAX_GIST_CHARS } from '../src/lib/chat-contract.js';
import { gameWords } from '../src/lib/game-data.js';
import {
  GAME_GISTS_PATH,
  depositOf,
  gameGistsFingerprint,
  readGameGists,
  type GameGistsFile,
} from '../src/lib/game-gists.js';
import { wordsFingerprint } from '../src/lib/word-links.js';
import type { Manifest, PrivateCorpus } from './aec26-types.js';
import { LocalD1 } from './d1-local.js';
import { quietEnv } from './quiet-env.js';
import {
  ASK_CONFIG_PATH,
  DAY,
  controlGist,
  gameGistsFrom,
  lastVerdicts,
  measuresOf,
  pinned,
  readBy,
  readMinOverlap,
  readVerdicts,
  recheckWith,
  VERDICTS_PATH,
  shownText,
  unservable,
  validated,
  type GistRow,
  type Measure,
} from './gists-core.js';
import { PRIVATE_CORPUS_PATH } from './ingest-2026.js';
import { buildLeakIndex, scanForLeaks, type LeakIndex } from './leak-scan.js';
import { everything } from './probe-2026.js';

export const SCHEMA_PATH = 'src/worker/sql/schema.sql';
export const SEED_DIR = 'private/ask';
const MANIFEST_PATH = 'data/2026/manifest.json';
/** Rows per INSERT: D1 bounds the size of one statement, not of a file. */
const ROWS_PER_INSERT = 40;

/**
 * The keys of `meta` each deposit owns (src/worker/sql/schema.sql). A deposit deletes and
 * writes its own and no other: the text may be deposited again without closing the sentences,
 * nor losing their count — and the reverse.
 */
const TEXT_KEYS = ['corpus_version', 'propositions', 'ask'] as const;
const GIST_KEYS = ['gists', 'gists_corpus', 'gists_count', 'gists_sha256'] as const;

export interface SeedRow {
  id: string;
  sectionId: string;
  kind: string;
  ord: number;
  text: string;
  /** For a sub-measure, the measure it details. */
  lead: string;
}

export function seedRows(corpus: PrivateCorpus): SeedRow[] {
  const rows: SeedRow[] = [];
  const push = (id: string, sectionId: string, kind: string, text: string, lead: string): void => {
    // SQLite stops a statement at U+0000 and its error then quotes what came before it — a
    // stretch of the book, printed (review 14, E14). Refused here, by its id alone.
    if (text.includes('\u0000') || lead.includes('\u0000')) {
      throw new Error(`seed: ${id} holds a NUL character — fix the ingestion, nothing is written`);
    }
    rows.push({ id, sectionId, kind, ord: rows.length, text, lead });
  };
  for (const section of corpus.sections) {
    for (const item of section.items) {
      if (item.kind === 'paragraph' || item.kind === 'heading') continue;
      push(item.id, section.id, item.kind, item.text, '');
      for (const sub of item.subMeasures ?? []) {
        push(sub.id, section.id, sub.kind, sub.text, item.text);
      }
    }
  }
  return rows;
}

/**
 * The private corpus — or an error that says only which file: the message of a parser quotes
 * what it could not read, and what it reads here is the book.
 */
export function readPrivateCorpus(path: string = PRIVATE_CORPUS_PATH): PrivateCorpus {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PrivateCorpus;
  } catch {
    throw new Error(`${path} does not read`);
  }
}

/** The measures by identifier, as the Worker shows them to a model (src/worker/measures.ts). */
export function shownTexts(corpus: PrivateCorpus): Map<string, string> {
  return new Map(seedRows(corpus).map((row) => [row.id, shownText(row.text, row.lead)]));
}

const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`;
const keyList = (keys: readonly string[]): string => keys.map(quote).join(', ');

/**
 * The text of the book as SQL. Its description (its keys of `meta`) is deleted first and
 * written last: while the rows are being replaced the Worker finds no corpus version, and
 * answers "local" rather than read half a book. The keys of the sentences are left alone.
 */
export function seedSql(corpus: PrivateCorpus, schema: string, ask: 'open' | 'stopped'): string {
  const rows = seedRows(corpus);
  const out: string[] = [schema.trim(), ''];
  // The index of before D16.22 is dropped wherever a base still holds it: the Worker searches
  // nothing any more, and a derived copy of the text nobody reads has no reason to stay.
  out.push(
    'DROP TABLE IF EXISTS propositions_fts;',
    `DELETE FROM meta WHERE key IN (${keyList(TEXT_KEYS)});`,
    'DELETE FROM propositions;',
  );
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const chunk = rows.slice(i, i + ROWS_PER_INSERT);
    out.push(
      'INSERT INTO propositions (id, section_id, kind, ord, text, lead) VALUES\n' +
        chunk
          .map(
            (r) =>
              `(${quote(r.id)}, ${quote(r.sectionId)}, ${quote(r.kind)}, ${String(r.ord)}, ${quote(r.text)}, ${quote(r.lead)})`,
          )
          .join(',\n') +
        ';',
    );
  }
  out.push(
    'INSERT INTO meta (key, value) VALUES\n' +
      `('corpus_version', ${quote(corpus.meta.corpus_version)}),\n` +
      `('propositions', ${quote(String(rows.length))}),\n` +
      `('ask', ${quote(ask)});`,
    '',
  );
  return out.join('\n');
}

/** The base as the Worker would find it, on Node's SQLite. */
export function localBase(corpus: PrivateCorpus, ask: 'open' | 'stopped' = 'open'): LocalD1 {
  const db = new LocalD1();
  db.exec(seedSql(corpus, readFileSync(SCHEMA_PATH, 'utf8'), ask));
  return db;
}

/** The tables of the schema and nothing else: no index of the text, no copy of it. */
const TABLES = 'gists,meta,propositions';

function tablesProblem(db: LocalD1): string[] {
  const tables = db.db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => String(row['name']));
  return tables.join(',') === TABLES ? [] : [`tables: ${tables.join(', ')}`];
}

/** Everything wrong between a loaded base and the public manifest. Identifiers only. */
export function baseProblems(db: LocalD1, manifest: Manifest): string[] {
  const problems: string[] = [];
  const published = new Map(
    manifest.sections.flatMap((section) =>
      section.items.filter((i) => i.kind !== 'paragraph').map((i) => [i.id, i.sha256] as const),
    ),
  );
  const rows = db.db.prepare('SELECT id, text FROM propositions').all();
  if (rows.length !== published.size) {
    problems.push(`${String(rows.length)} rows, ${String(published.size)} propositions published`);
  }
  for (const row of rows) {
    const id = String(row['id']);
    const hash = createHash('sha256').update(String(row['text'])).digest('hex');
    if (published.get(id) !== hash) problems.push(`${id}: not the published text`);
  }
  problems.push(...tablesProblem(db));
  const version = db.db.prepare("SELECT value FROM meta WHERE key = 'corpus_version'").get();
  if (version?.['value'] !== manifest.meta.corpus_version) {
    problems.push('the base is not at the corpus version of the manifest');
  }
  return problems;
}

/**
 * Takes the text of the book out of a base — its description first, so that a Worker that
 * still asked for a measure finds no corpus version and answers "local"; then its rows, and
 * the index of before D16.22 wherever one is left. The table stays, empty: the schema is the
 * Worker's, and a deposit fills it again. Not a row, not a key of the sentences is touched.
 */
export function textWithdrawalSql(): string {
  return [
    `DELETE FROM meta WHERE key IN (${keyList(TEXT_KEYS)});`,
    'DROP TABLE IF EXISTS propositions_fts;',
    'DELETE FROM propositions;',
  ].join('\n');
}

// ---------------------------------------------------------------------------------------------
// The sentences written ahead (PLAN-CHAT §3)
// ---------------------------------------------------------------------------------------------

/**
 * Takes the sentences OUT of a base, at the withdrawal of the site — the base was promised
 * « vidée au retrait du site » (D16.6), and the editor chose to keep that promise (D21.36): their
 * description first, the switch with it, so that a route finds none and answers "local"; then
 * their rows. The table stays, empty, as the text's does. The sentences stay on this machine
 * (private/gists/), and a deposit puts them back. Not a row, not a key of the text is touched.
 */
export function gistsWithdrawalSql(): string {
  return [`DELETE FROM meta WHERE key IN (${keyList(GIST_KEYS)});`, 'DELETE FROM gists;'].join(
    '\n',
  );
}

/**
 * The fingerprint of a set of sentences: its rows in the order of their identifiers, each as
 * the base holds it. Written in `meta`, so that what a base holds can be told from what the
 * editor read without reading either.
 */
export function gistsFingerprint(
  rows: readonly Pick<GistRow, 'id' | 'text' | 'measure_sha256' | 'read_on'>[],
): string {
  const lines = rows
    .map((row) => JSON.stringify([row.id, row.measure_sha256, row.read_on, row.text]))
    .sort();
  return createHash('sha256').update(lines.join('\n')).digest('hex');
}

/**
 * The sentences as SQL — a file of its own: it replaces the rows of `gists` and its own keys of
 * `meta`, and touches nothing of the text. Like the text, the description is deleted first and
 * written last; and the switch is written STOPPED, each time: sentences deposited are not
 * sentences served.
 */
export function gistsSql(rows: readonly GistRow[], corpusVersion: string, schema: string): string {
  const out: string[] = [schema.trim(), ''];
  out.push(`DELETE FROM meta WHERE key IN (${keyList(GIST_KEYS)});`, 'DELETE FROM gists;');
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const chunk = rows.slice(i, i + ROWS_PER_INSERT);
    out.push(
      'INSERT INTO gists (id, text, measure_sha256, read_on) VALUES\n' +
        chunk
          .map(
            (r) =>
              `(${quote(r.id)}, ${quote(r.text)}, ${quote(r.measure_sha256)}, ${quote(r.read_on)})`,
          )
          .join(',\n') +
        ';',
    );
  }
  out.push(
    'INSERT INTO meta (key, value) VALUES\n' +
      `('gists_corpus', ${quote(corpusVersion)}),\n` +
      `('gists_count', ${quote(String(rows.length))}),\n` +
      `('gists_sha256', ${quote(gistsFingerprint(rows))}),\n` +
      `('gists', 'stopped');`,
    '',
  );
  return out.join('\n');
}

export interface GistChecks {
  /** The threshold of the control the site runs with (data/2026/ask.json). */
  minOverlap: number;
  /**
   * The measures as a model reads them, by identifier — where the text of the book is. Without
   * them the control is not run, and nothing says it passed: a set is fit for the base only on
   * the machine that can check it.
   */
  texts?: ReadonlyMap<string, string>;
  /** The whole book in windows of nine words, where it is: a sentence of ours holds none. */
  leaks?: LeakIndex;
}

/** An identifier is printed only if it reads as one: this field could hold anything. */
const named = (id: string): string => (/^[a-z0-9.-]{1,24}$/.test(id) ? id : 'a row');

/**
 * Everything that keeps a set of sentences out of the base. A sentence enters only if it is
 * about a measure of the manifest, was read against that measure as it is published today,
 * passes the control as it stands today, and is one sentence of a screen — once.
 * Identifiers, rules and numbers only: never the sentence, never a word of the measure.
 */
export function gistProblems(
  rows: readonly GistRow[],
  manifest: Manifest,
  checks: GistChecks,
): string[] {
  const problems: string[] = [];
  const measures = new Map(measuresOf(manifest).map((measure) => [measure.id, measure]));
  const seen = new Set<string>();
  const sentences = new Map<string, Measure>();
  for (const row of rows) {
    const measure = measures.get(row.id);
    if (measure === undefined) {
      problems.push(`${named(row.id)}: not a measure of the manifest`);
      continue;
    }
    if (seen.has(row.id)) {
      problems.push(`${row.id}: twice in the set`);
      continue;
    }
    seen.add(row.id);
    if (!pinned(row, measure))
      problems.push(`${row.id}: read against another state of its measure`);
    if (!DAY.test(row.read_on)) problems.push(`${row.id}: read on no day`);
    if (row.text.trim() === '') {
      problems.push(`${row.id}: no sentence`);
      continue;
    }
    // What the page would refuse must not enter the base: it would drop, without a word, every
    // sentence that came with this one (src/lib/chat-contract.ts, `parseGistsResponse`).
    const shape = unservable(row.id, row.text);
    if (shape === 'chars') {
      problems.push(
        `${row.id}: ${String(row.text.length)} characters, ${String(MAX_GIST_CHARS)} at most`,
      );
    } else if (shape === 'line') {
      problems.push(`${row.id}: not one line the page would show`);
    }
    // Two measures that are not the same text cannot be said by the same sentence.
    const twin = sentences.get(row.text);
    if (twin === undefined) sentences.set(row.text, measure);
    else if (twin.sha256 !== measure.sha256) {
      problems.push(`${row.id}: the sentence of ${twin.id}, word for word`);
    }
    if (checks.texts !== undefined && shape === null) {
      const shown = checks.texts.get(row.id);
      if (shown === undefined) problems.push(`${row.id}: its measure is not on this machine`);
      else {
        const control = controlGist(row.id, row.text, shown, checks.minOverlap);
        if (!control.ok) problems.push(`${row.id}: refused by the control today (${control.rule})`);
      }
    }
    if (checks.leaks !== undefined) {
      for (const hit of scanForLeaks(row.text, checks.leaks)) {
        problems.push(`${row.id}: words of the book in a row (${hit.id})`);
      }
    }
  }
  return problems;
}

/**
 * Everything wrong between a base the file of the sentences was loaded in and the set it was
 * built from: the rows are those the editor kept, the description says what the table holds,
 * and the sentences start stopped.
 */
export function gistsBaseProblems(
  db: LocalD1,
  rows: readonly GistRow[],
  manifest: Manifest,
): string[] {
  const problems: string[] = [];
  const kept = new Map(rows.map((row) => [row.id, row]));
  const held = db.db
    .prepare('SELECT id, text, measure_sha256, read_on FROM gists')
    .all()
    .map((row) => ({
      id: String(row['id']),
      text: String(row['text']),
      measure_sha256: String(row['measure_sha256']),
      read_on: String(row['read_on']),
    }));
  if (held.length !== rows.length) {
    problems.push(`${String(held.length)} rows, ${String(rows.length)} sentences kept`);
  }
  for (const row of held) {
    const want = kept.get(row.id);
    if (
      want?.text !== row.text ||
      want.measure_sha256 !== row.measure_sha256 ||
      want.read_on !== row.read_on
    ) {
      problems.push(`${named(row.id)}: not the sentence that was kept`);
    }
  }
  const meta = new Map(
    db.db
      .prepare('SELECT key, value FROM meta')
      .all()
      .map((row) => [String(row['key']), String(row['value'])] as const),
  );
  if (meta.get('gists') !== 'stopped') problems.push('the sentences do not start stopped');
  if (meta.get('gists_corpus') !== manifest.meta.corpus_version) {
    problems.push('the sentences are not at the corpus version of the manifest');
  }
  if (meta.get('gists_count') !== String(held.length)) {
    problems.push('gists_count is not the number of rows');
  }
  if (meta.get('gists_sha256') !== gistsFingerprint(held)) {
    problems.push('gists_sha256 is not the fingerprint of the rows');
  }
  problems.push(...tablesProblem(db));
  return problems;
}

/** The whole book, cut as the leak gate cuts it; official titles are shown on purpose. */
function leakIndexOf(corpus: PrivateCorpus): LeakIndex {
  const all = everything(corpus);
  return buildLeakIndex(
    all.filter((item) => item.kind !== 'title').map(({ id, text }) => ({ id, text })),
    all.filter((item) => item.kind === 'title').map((item) => item.text),
  );
}

/**
 * `--gists`, up to the file: reads the editor's verdicts, refuses what must not enter the base,
 * loads the SQL into SQLite and checks it there. With `check`, nothing is written. Returns the
 * file to send — or null, with the exit code that says why. Nothing is ever sent from here.
 */
interface Standing {
  corpus: PrivateCorpus;
  manifest: Manifest;
  version: string;
  measures: Measure[];
  minOverlap: number;
  texts: Map<string, string>;
  set: ReturnType<typeof validated>;
}

/**
 * What `--gists` and `--game` both start from: the verdicts of this machine, as they stand on
 * the book as published today — or null, with the reason said, where the book is not.
 */
function standing(): Standing | null {
  if (!existsSync(PRIVATE_CORPUS_PATH)) {
    console.error(`seed: ${PRIVATE_CORPUS_PATH} is not on this machine`);
    return null;
  }
  const corpus = readPrivateCorpus();
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  const version = manifest.meta.corpus_version;
  if (corpus.meta.corpus_version !== version) {
    console.error('seed: the text on this machine is not at the corpus version of the manifest');
    return null;
  }
  const measures = measuresOf(manifest);
  const minOverlap = readMinOverlap();
  const texts = shownTexts(corpus);
  // A verdict that no longer holds leaves its measure out, and only it: what still stands is
  // deposited while the rest waits to be read again (`npm run gists -- --serve` shows it).
  const set = validated(measures, lastVerdicts(readVerdicts()), recheckWith(texts, minOverlap));
  return { corpus, manifest, version, measures, minOverlap, texts, set };
}

/** How many verdicts the deposit in the base holds, as data/2026/ask.json records it. */
function depositCount(): number | null {
  try {
    const ask = JSON.parse(readFileSync(ASK_CONFIG_PATH, 'utf8')) as {
      gists?: { verdicts?: unknown };
    };
    const count = ask.gists?.verdicts;
    return typeof count === 'number' && Number.isInteger(count) && count > 0 ? count : null;
  } catch {
    return null;
  }
}

export function prepareGists(
  check: boolean,
  options: { allowFewer?: boolean } = {},
): { code: number; file: string | null } {
  const found = standing();
  if (found === null) return { code: 1, file: null };
  const { corpus, manifest, version, measures, minOverlap, texts, set } = found;
  // A deposit replaces every sentence of the base (`DELETE FROM gists`). Made from a copy that
  // lacks the verdicts, or that holds fewer than the deposit data/2026/ask.json records, it
  // would erase what « Demander » serves while every check passed on nothing (review 14, E2).
  const recorded = depositCount();
  const here = set.rows.length + set.linkOnly;
  if (!existsSync(VERDICTS_PATH) || set.rows.length === 0) {
    console.error(
      `sentences: no verdict to deposit (${VERDICTS_PATH} is missing or holds no kept sentence) — ` +
        'a deposit would empty the base: nothing is written',
    );
    return { code: 1, file: null };
  }
  if (recorded !== null && here < recorded && options.allowFewer !== true) {
    console.error(
      `sentences: ${String(here)} verdict(s) here, ${String(recorded)} in the deposit ` +
        `${ASK_CONFIG_PATH} records — the base would lose sentences: say so with --fewer`,
    );
    return { code: 1, file: null };
  }
  console.log(
    `sentences of corpus ${version}: ${String(set.rows.length)} read and kept, ` +
      `${String(set.linkOnly)} link only, ${String(set.waiting)} without a verdict, of ` +
      `${String(measures.length)} measures`,
  );
  if (set.stale.length > 0) {
    console.log(`  left out, to be read again (their measure moved): ${set.stale.join(', ')}`);
  }
  if (set.refused.length > 0) {
    console.log(
      `  left out, to be read again (the control refuses them today): ${set.refused.join(', ')}`,
    );
  }
  if (set.orphans.length > 0) {
    console.log(`  left out, ${String(set.orphans.length)} verdict(s) on no measure of the book`);
  }
  // Who read what is about to be deposited — data/2026/ask.json records it (`gists.read_by`),
  // and the label of the sentences on the site is held to it (D16.59).
  const reader = readBy(set);
  if (reader !== null) {
    console.log(
      `  read by: ${reader} — ${String(set.bySession)} verdict(s) of the session (an AI), ` +
        `${String(set.rows.length + set.linkOnly - set.bySession)} of the editor`,
    );
  }
  const problems = gistProblems(set.rows, manifest, {
    minOverlap,
    texts,
    leaks: leakIndexOf(corpus),
  });
  const sql = gistsSql(set.rows, version, readFileSync(SCHEMA_PATH, 'utf8'));
  if (problems.length === 0) {
    const db = new LocalD1();
    db.exec(sql);
    problems.push(...gistsBaseProblems(db, set.rows, manifest));
  }
  for (const problem of problems) console.error(`  ✖ ${problem}`);
  if (problems.length > 0) return { code: 1, file: null };
  console.log(
    'checked on SQLite: every sentence is pinned to its measure as published, passes the ' +
      `control of today and holds no run of the book — ${String(Buffer.byteLength(sql))} bytes ` +
      'of SQL, sentences stopped',
  );
  if (check) return { code: 0, file: null };
  mkdirSync(SEED_DIR, { recursive: true });
  const file = `${SEED_DIR}/gists-${version}.sql`;
  writeFileSync(file, sql);
  console.log(`written: ${file} (private, never committed)`);
  return { code: 0, file };
}

// ---------------------------------------------------------------------------------------------
// The sentences of the game (D19.2; docs/discovery/PLAN-JEU-DABORD.md, lot 4)
// ---------------------------------------------------------------------------------------------

/** A word as a sentence may hold it: lower case, no accent — and its stem, short of an ending. */
const folded = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** True when the sentence writes the word, in the singular or the plural. A count, not a gate. */
function writesWord(sentence: string, word: string): boolean {
  const stem = folded(word).replace(/(?:s|x)$/, '');
  return new RegExp(`(?<![a-z])${stem.replace(/[^a-z]/g, '.')}(?:s|x|aux)?(?![a-z])`).test(
    folded(sentence),
  );
}

/**
 * `--game`: the file of the game's sentences, data/2026/game-gists.json — the sentences of the
 * DEPOSIT, for the measures the words of the game are pinned to, and nothing else.
 *
 * It refuses unless what this machine would deposit today is, fingerprint for fingerprint, what
 * data/2026/ask.json says was deposited: the game shows the sentences « Demander » serves, not
 * a later state of them. Every sentence passes here the checks of a deposit — its pin, the
 * control of today, no run of the book — before the file is written.
 *
 * The file is written and NOT added to the repository: its first push is the editor's accord,
 * given at that moment on the numbers this prints (CLAUDE.md). An accord already written in the
 * file is kept only if the sentences are, to the byte, the ones it was given on.
 *
 * Identifiers and numbers only: never a sentence, never a word of a measure.
 */
export function prepareGameGists(check: boolean, named: readonly string[] | null = null): number {
  const found = standing();
  if (found === null) return 1;
  const before = readGameGists();
  // The words whose card keeps its link alone are the editor's decisions, word by word (D19.20,
  // D19.21). Not named on the line, they are those the file already names — never none: an
  // export without `--link-only` undid five of his choices and dropped his validation (review
  // 14, E9). Named twice, one of them changed the seal for nothing (E10).
  const linkOnly = named ?? before?.meta.link_only ?? [];
  if (new Set(linkOnly).size !== linkOnly.length) {
    console.error('game: --link-only names a word twice');
    return 1;
  }
  const { corpus, manifest, version, minOverlap, texts, set } = found;
  const ask = JSON.parse(readFileSync(ASK_CONFIG_PATH, 'utf8')) as Record<string, unknown>;
  const deposit = depositOf(ask);
  const here = gistsFingerprint(set.rows);
  if (deposit === null || here !== deposit) {
    console.error(
      'game: the sentences this machine holds are not those of the deposit ' +
        `(${here.slice(0, 12)}… here, ${String(deposit).slice(0, 12)}… in ${ASK_CONFIG_PATH}): ` +
        'the game shows the sentences the site serves — deposit first, or read again',
    );
    return 1;
  }
  const words = gameWords().words;
  // Words whose card keeps its link alone, on purpose (`--link-only`): a sentence that is
  // faithful and still should not stand under a game word — the editor's call, word by word.
  const unknown = linkOnly.filter((id) => !words.some((word) => word.id === id));
  if (unknown.length > 0) {
    console.error(`game: --link-only names no word of the list: ${unknown.join(', ')}`);
    return 1;
  }
  const draft = gameGistsFrom(
    set.rows,
    words.filter((word) => !linkOnly.includes(word.id)),
  );
  const problems = gistProblems(
    set.rows.filter((row) => draft.gists.some((gist) => gist.id === row.id)),
    manifest,
    { minOverlap, texts, leaks: leakIndexOf(corpus) },
  );
  for (const id of draft.moved)
    problems.push(`${id}: its measure moved since its sentence was read`);
  for (const problem of problems) console.error(`  ✖ ${problem}`);
  if (problems.length > 0) return 1;

  // What the file says of its sentences is sealed with them: the validation is given on both.
  const claims = {
    corpus_version: version,
    words_sha256: wordsFingerprint(words),
    deposit_sha256: deposit,
    written_by: 'session',
    read_by_a_person: false,
    ...(linkOnly.length === 0 ? {} : { link_only: [...linkOnly].sort() }),
  };
  const sha256 = gameGistsFingerprint(claims, draft.gists);
  const kept =
    before !== null && before.meta.sha256 === sha256 && before.meta.validated.sha256 === sha256
      ? before.meta.validated
      : { on: null, by: null, sha256: null };
  const title = 'Les phrases du jeu « Où est-ce écrit ? » — édition 2026';
  const file: GameGistsFile = {
    meta: {
      title,
      corpus_version: claims.corpus_version,
      words_sha256: claims.words_sha256,
      deposit_sha256: claims.deposit_sha256,
      written_by: claims.written_by,
      read_by_a_person: claims.read_by_a_person,
      sha256,
      validated: kept,
      ...(claims.link_only === undefined ? {} : { link_only: claims.link_only }),
      note_fr:
        'Une phrase par mot du jeu : celle de la mesure où le mot est épinglé, telle que déposée ' +
        'dans la base privée (D16.49) et servie par « Demander ». Ce sont nos mots — écrits et ' +
        'vérifiés par une IA (« written_by » : « session », la session de travail d’une IA), ' +
        'lus par aucune personne une à une — jamais des extraits du livre. Le livre est ' +
        '« L’Avenir en commun », édition 2026, de La France insoumise, tous droits réservés : ' +
        'ce site n’est pas le sien, et chaque phrase peut être incomplète ou imprécise — la page ' +
        'officielle de la mesure fait foi. ' +
        'Seules ces phrases-là sont publiées en fichier (D19.2) ; les autres restent dans la base. ' +
        'Fichier écrit par « npm run gists -- --game », jamais à la main : une phrase changée ' +
        'ici ne serait plus celle du dépôt, et la build ne la montrerait pas. « validated » est ' +
        "l'accord de l'éditeur pour publier ce fichier tel qu'il est : une session ne l'écrit " +
        'jamais sans un mot daté de lui (decisions.md). « link_only », quand il existe, nomme ' +
        'les mots dont la carte garde son lien seul, par choix : leur phrase reste dans la base.',
    },
    gists: draft.gists,
  };
  // His validation was given on the file as it reads, its title and its note with it: kept only
  // while they are the ones he saw (D19.22; review 14, E13).
  if (
    kept.sha256 !== null &&
    before !== null &&
    (before.meta.title !== file.meta.title || before.meta.note_fr !== file.meta.note_fr)
  ) {
    console.error(
      'game: the title or the note of the file changed since the editor validated it — his ' +
        'accord is asked again (D19.22): nothing is written',
    );
    return 1;
  }
  const text = `${JSON.stringify(file, null, 2)}\n`;
  const holding = draft.gists.filter((gist) => {
    const word = words.find((entry) => entry.pin.id === gist.id);
    return word !== undefined && writesWord(gist.text, word.word);
  }).length;
  const lengths = draft.gists.map((gist) => gist.text.length);
  console.log(
    `sentences of the game, corpus ${version}: ${String(draft.gists.length)} for ` +
      `${String(words.length)} words (${String(draft.without.length)} word(s) whose measure has ` +
      `none, ${String(linkOnly.length)} left to their link on purpose) — ` +
      `${String(set.rows.length)} in the deposit`,
  );
  if (linkOnly.length > 0)
    console.log(`  link alone, on purpose: ${[...linkOnly].sort().join(', ')}`);
  if (draft.without.length > 0)
    console.log(`  no sentence, link alone: ${draft.without.join(', ')}`);
  console.log(
    `  ${String(lengths.reduce((a, b) => a + b, 0))} characters in all, ` +
      `${String(Math.max(0, ...lengths))} for the longest (${String(MAX_GIST_CHARS)} allowed), ` +
      `${String(gzipSync(Buffer.from(draft.gists.map((g) => g.text).join('\n')), { level: 9 }).length)} ` +
      'bytes gzip',
  );
  console.log(
    `  ${String(holding)} of ${String(draft.gists.length)} write the word of their card ` +
      '(the others say the measure without it: the link shows the word in the book)',
  );
  console.log(`  fingerprint ${sha256}`);
  console.log(
    kept.on === null
      ? '  not agreed for publication yet: meta.validated is empty'
      : `  agreed for publication on ${kept.on}, on this very content`,
  );
  if (check) return 0;
  writeFileSync(GAME_GISTS_PATH, text);
  console.log(
    `written: ${GAME_GISTS_PATH} — NOT added to the repository: its push is the editor's`,
  );
  return 0;
}

// ---------------------------------------------------------------------------------------------

/**
 * The one statement that opens or stops what the base hands out: the written answers of
 * `/api/ask` (`ask`) or the sentences written ahead (`gists`) — always named, never assumed.
 * Each switch moves alone, and the statement returns the key it moved: a switch the base does
 * not hold moves nothing, and that must be said, not passed over. Since the text left the base
 * (15/11/2026) its row `ask` is gone with it, and the command of runbook sheet 8 without
 * `--what` changed 0 rows and exited 0 (review of 23/11/2026, W2).
 * Null for anything that is not one of the two switches, or not one of the two positions.
 */
export function switchSql(flip: string, what: string | undefined): string | null {
  if ((flip !== 'open' && flip !== 'stopped') || (what !== 'ask' && what !== 'gists')) return null;
  return `UPDATE meta SET value = '${flip}' WHERE key = '${what}' RETURNING key`;
}

/**
 * How many switches an answer of `wrangler d1 execute --json` says were moved: the rows the
 * statement returned. -1 when the answer cannot be read.
 */
export function switchedRows(stdout: string): number {
  try {
    const parsed: unknown = JSON.parse(stdout);
    const answers: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    return answers.reduce<number>((count, answer) => {
      const rows =
        typeof answer === 'object' && answer !== null
          ? (answer as Record<string, unknown>)['results']
          : undefined;
      return count + (Array.isArray(rows) ? rows.length : 0);
    }, 0);
  } catch {
    return -1;
  }
}

function wrangler(database: string, env: string | undefined, extra: readonly string[]): number {
  const args = ['--no-install', 'wrangler', 'd1', 'execute', database, '--remote', ...extra];
  if (env !== undefined) args.push('--env', env);
  return spawnSync('npx', args, { stdio: 'inherit', env: quietEnv() }).status ?? 1;
}

/** The same, answered as JSON on stdout: null when wrangler failed. */
function wranglerJson(
  database: string,
  env: string | undefined,
  extra: readonly string[],
): string | null {
  const args = ['--no-install', 'wrangler', 'd1', 'execute', database, '--remote', '--json'];
  args.push(...extra);
  if (env !== undefined) args.push('--env', env);
  const run = spawnSync('npx', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    env: quietEnv(),
  });
  if (run.status === 0) return run.stdout;
  // With `--json`, wrangler writes its errors to stdout: said here, or the operator of an
  // emergency stop learns nothing of why it failed (review 14, E5). An answer of the base,
  // not a word of the book: the switch's command reads and writes `meta` only.
  const said = run.stdout.trim();
  if (said !== '') console.error(said);
  return null;
}

/** Sends a file to the base — with the editor's accord, given today on the command line. */
function send(
  file: string,
  what: string,
  remote: string,
  env: string | undefined,
  accord: string | undefined,
): number {
  const today = new Date().toISOString().slice(0, 10);
  if (accord !== today) {
    console.error(
      `seed: nothing was sent. Sending ${what} to Cloudflare needs the editor's accord, given ` +
        `today: add --accord ${today}`,
    );
    return 1;
  }
  console.log(`sending to the D1 database "${remote}" — the one base every host reads…`);
  return wrangler(remote, env, ['--file', file, '--yes']);
}

/** The flags of the tool: those that take a value, and those that stand alone. */
const VALUED = ['--remote', '--env', '--accord', '--switch', '--what'] as const;
const ALONE = [
  '--text',
  '--gists',
  '--withdraw-text',
  '--withdraw-gists',
  '--check',
  '--fewer',
] as const;
const MODES = ['--text', '--gists', '--withdraw-text', '--withdraw-gists', '--switch'] as const;

/**
 * The command line, read strictly (review 14, E1, E3, E6): what it cannot read is said, and
 * nothing is read or sent. Returns the flags it holds, or the reason it was refused.
 */
export function readCommand(
  args: readonly string[],
): { flags: Map<string, string | true>; mode: (typeof MODES)[number] | null } | string {
  const flags = new Map<string, string | true>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? '';
    if (flags.has(arg)) return `${arg} is written twice`;
    if ((VALUED as readonly string[]).includes(arg)) {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('-')) return `${arg} takes a value`;
      flags.set(arg, value);
      i += 1;
    } else if ((ALONE as readonly string[]).includes(arg)) {
      flags.set(arg, true);
    } else {
      return arg.startsWith('-')
        ? `${arg} is not a flag of this tool (write « --flag value », never « --flag=value »)`
        : `« ${arg} » stands alone on the line`;
    }
  }
  const modes = MODES.filter((mode) => flags.has(mode));
  if (modes.length > 1) return `one mode per command, not ${modes.join(' and ')}`;
  const mode = modes[0] ?? null;
  const check = flags.has('--check');
  if (check && mode !== '--text' && mode !== '--gists')
    return '--check goes with --text or --gists';
  if (flags.has('--fewer') && mode !== '--gists') return '--fewer goes with --gists';
  if (flags.has('--what') && mode !== '--switch') return '--what goes with --switch';
  if (flags.has('--remote') && check) return '--check sends nothing: drop --remote';
  if (flags.has('--remote') && mode === null) {
    return 'name what to send: --text, --gists, --withdraw-text, --withdraw-gists or --switch';
  }
  if (
    (mode === '--switch' || mode === '--withdraw-text' || mode === '--withdraw-gists') &&
    !flags.has('--remote')
  ) {
    return `${mode} acts on the base: --remote <database>`;
  }
  return { flags, mode };
}

function main(): void {
  const read = readCommand(process.argv.slice(2));
  if (typeof read === 'string') {
    console.error(`seed: ${read} — nothing was read or sent (see the head of this file)`);
    process.exitCode = 2;
    return;
  }
  const value = (flag: string): string | undefined => {
    const given = read.flags.get(flag);
    return typeof given === 'string' ? given : undefined;
  };
  const args = [...read.flags.keys()];
  const remote = value('--remote');
  const env = value('--env');

  if (read.mode === null) {
    console.error(
      'seed: name the mode — --text [--check], --gists [--check], --withdraw-text, ' +
        '--withdraw-gists or --switch ' +
        '(see the head of this file)',
    );
    process.exitCode = 2;
    return;
  }

  const flip = value('--switch');
  if (flip !== undefined) {
    const what = value('--what');
    const command = switchSql(flip, what);
    if (remote === undefined || command === null) {
      console.error('usage: --switch open|stopped --what gists|ask --remote <database>');
      process.exitCode = 2;
      return;
    }
    // What closes always may; what opens is the editor's, given today (review 14, E4).
    const today = new Date().toISOString().slice(0, 10);
    if (flip === 'open' && value('--accord') !== today) {
      console.error(
        `seed: nothing was sent. Opening the switch "${what ?? ''}" needs the editor's accord, ` +
          `given today: --accord ${today}`,
      );
      process.exitCode = 1;
      return;
    }
    const answer = wranglerJson(remote, env, ['--command', command]);
    const moved = answer === null ? -1 : switchedRows(answer);
    if (moved === 1) {
      console.log(`the switch "${what ?? ''}" of the base is now ${flip}`);
      return;
    }
    console.error(
      moved === 0
        ? `the base holds no switch "${what ?? ''}": nothing changed`
        : 'the switch did not move, or its answer could not be read (what wrangler said is ' +
            'above): check it by hand — wrangler d1 execute <database> --remote --command ' +
            '"SELECT key, value FROM meta"',
    );
    process.exitCode = 1;
    return;
  }

  if (args.includes('--withdraw-text')) {
    if (remote === undefined) {
      console.error('usage: --remote <database> --withdraw-text --accord <YYYY-MM-DD>');
      process.exitCode = 2;
      return;
    }
    mkdirSync(SEED_DIR, { recursive: true });
    const file = `${SEED_DIR}/withdraw-text.sql`;
    writeFileSync(file, `${textWithdrawalSql()}\n`);
    console.log('withdrawal of the text: its rows and its keys — the sentences are left alone');
    process.exitCode = send(file, 'the withdrawal of the text', remote, env, value('--accord'));
    return;
  }

  if (args.includes('--withdraw-gists')) {
    if (remote === undefined) {
      console.error('usage: --withdraw-gists --remote <database> --accord <YYYY-MM-DD>');
      process.exitCode = 2;
      return;
    }
    mkdirSync(SEED_DIR, { recursive: true });
    const file = `${SEED_DIR}/withdraw-gists.sql`;
    writeFileSync(file, `${gistsWithdrawalSql()}\n`);
    console.log(
      'withdrawal of the sentences: their rows and their keys — the text is left alone, and the ' +
        'sentences stay on this machine (private/gists/)',
    );
    process.exitCode = send(
      file,
      'the withdrawal of the sentences',
      remote,
      env,
      value('--accord'),
    );
    return;
  }

  if (args.includes('--gists')) {
    const prepared = prepareGists(args.includes('--check'), {
      allowFewer: args.includes('--fewer'),
    });
    process.exitCode =
      prepared.file === null || remote === undefined
        ? prepared.code
        : send(prepared.file, 'the sentences', remote, env, value('--accord'));
    return;
  }

  if (!existsSync(PRIVATE_CORPUS_PATH)) {
    console.error(`seed: ${PRIVATE_CORPUS_PATH} is not on this machine`);
    process.exitCode = 1;
    return;
  }
  const corpus = readPrivateCorpus();
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  const sql = seedSql(corpus, readFileSync(SCHEMA_PATH, 'utf8'), 'stopped');
  const rows = seedRows(corpus);
  const words = rows.reduce((n, r) => n + r.text.split(' ').length, 0);
  console.log(
    `base of corpus ${corpus.meta.corpus_version}: ${String(rows.length)} propositions, ` +
      `${String(words)} words, ${String(Buffer.byteLength(sql))} bytes of SQL — answers stopped`,
  );

  const problems = baseProblems(localBase(corpus), manifest);
  for (const problem of problems) console.error(`  ✖ ${problem}`);
  if (problems.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log('checked on SQLite: every row is the text the manifest publishes the hash of');
  if (args.includes('--check')) return;

  mkdirSync(SEED_DIR, { recursive: true });
  const file = `${SEED_DIR}/seed-${corpus.meta.corpus_version}.sql`;
  writeFileSync(file, sql);
  console.log(`written: ${file} (private, never committed)`);
  if (remote === undefined) return;
  process.exitCode = send(file, 'the text', remote, env, value('--accord'));
}

// Typed with or without its extension: `npx tsx scripts/seed-ask-2026` runs it too, where it
// used to run nothing and exit 0 — the emergency stop included (review 14, E7).
if (process.argv[1] !== undefined && /seed-ask-2026(?:\.ts|\.js)?$/.test(process.argv[1])) main();
