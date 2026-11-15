/**
 * Fills the private base of « Demander » (D16.6) — the one place outside this machine where
 * the text of the 2026 edition is allowed to live: a Cloudflare D1 database only the Worker
 * reads, and never serves. Since the plan of 14 November 2026 (PLAN-CHAT §3) the same base
 * holds the sentences written ahead, one per measure, each read by the editor: those are ours,
 * and they are what a route may hand out.
 *
 *   npx tsx scripts/seed-ask-2026.ts
 *       writes private/ask/seed-<corpus>.sql and prints what it holds (numbers only)
 *   npx tsx scripts/seed-ask-2026.ts --check
 *       loads it into Node's SQLite and checks every row against the public manifest
 *   npx tsx scripts/seed-ask-2026.ts --remote <database> --accord <YYYY-MM-DD> [--env preview]
 *       uploads it with wrangler
 *   npx tsx scripts/seed-ask-2026.ts --gists [--check]
 *       the same for the sentences the editor read and kept (private/gists/verdicts.jsonl):
 *       a file of its own, private/ask/gists-<corpus>.sql, that touches nothing of the text
 *   npx tsx scripts/seed-ask-2026.ts --remote <database> --gists --accord <YYYY-MM-DD> [--env preview]
 *       uploads that one
 *   npx tsx scripts/seed-ask-2026.ts --remote <database> --switch open|stopped [--what ask|gists] [--env preview]
 *       opens or stops the answers — or, with `--what gists`, the sentences written ahead —
 *       with no deployment (runbook: « arrêt »)
 *   npx tsx scripts/seed-ask-2026.ts --remote <database> --withdraw-text --accord <YYYY-MM-DD> [--env preview]
 *       takes the text of the book OUT of the base, and leaves the sentences as they are:
 *       once they are written nothing reads the text there any more (PLAN-CHAT §7). The text
 *       stays on this machine; depositing it again is the first command above.
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
import { MAX_GIST_CHARS } from '../src/lib/chat-contract.js';
import type { Manifest, PrivateCorpus } from './aec26-types.js';
import { LocalD1 } from './d1-local.js';
import {
  DAY,
  controlGist,
  lastVerdicts,
  measuresOf,
  pinned,
  readBy,
  readMinOverlap,
  readVerdicts,
  recheckWith,
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
export function prepareGists(check: boolean): { code: number; file: string | null } {
  if (!existsSync(PRIVATE_CORPUS_PATH)) {
    console.error(`seed: ${PRIVATE_CORPUS_PATH} is not on this machine`);
    return { code: 1, file: null };
  }
  const corpus = readPrivateCorpus();
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  const version = manifest.meta.corpus_version;
  if (corpus.meta.corpus_version !== version) {
    console.error('seed: the text on this machine is not at the corpus version of the manifest');
    return { code: 1, file: null };
  }
  const measures = measuresOf(manifest);
  const minOverlap = readMinOverlap();
  const texts = shownTexts(corpus);
  // A verdict that no longer holds leaves its measure out, and only it: what still stands is
  // deposited while the rest waits to be read again (`npm run gists -- --serve` shows it).
  const set = validated(measures, lastVerdicts(readVerdicts()), recheckWith(texts, minOverlap));
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

/**
 * The one statement that opens or stops what the base hands out: the written answers, as
 * always — or, when they are named, the sentences written ahead. Each switch moves alone.
 * Null for anything that is not one of the two switches, or not one of the two positions.
 */
export function switchSql(flip: string, what = 'ask'): string | null {
  if ((flip !== 'open' && flip !== 'stopped') || (what !== 'ask' && what !== 'gists')) return null;
  return `UPDATE meta SET value = '${flip}' WHERE key = '${what}'`;
}

function wrangler(database: string, env: string | undefined, extra: readonly string[]): number {
  const args = ['--no-install', 'wrangler', 'd1', 'execute', database, '--remote', ...extra];
  if (env !== undefined) args.push('--env', env);
  return spawnSync('npx', args, { stdio: 'inherit' }).status ?? 1;
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
  console.log(`sending to the D1 database "${remote}"${env === undefined ? '' : ` (${env})`}…`);
  return wrangler(remote, env, ['--file', file, '--yes']);
}

function main(): void {
  const args = process.argv.slice(2);
  const value = (flag: string): string | undefined => {
    const at = args.indexOf(flag);
    return at === -1 ? undefined : args[at + 1];
  };
  const remote = value('--remote');
  const env = value('--env');

  const flip = value('--switch');
  if (flip !== undefined) {
    const command = switchSql(flip, value('--what'));
    if (remote === undefined || command === null) {
      console.error('usage: --remote <database> --switch open|stopped [--what ask|gists]');
      process.exitCode = 2;
      return;
    }
    process.exitCode = wrangler(remote, env, ['--command', command]);
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

  if (args.includes('--gists')) {
    const prepared = prepareGists(args.includes('--check'));
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

if (process.argv[1] !== undefined && /seed-ask-2026\.ts$/.test(process.argv[1])) main();
