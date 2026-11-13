/**
 * Fills the private base of « Demander » (D16.6) — the one place outside this machine where
 * the text of the 2026 edition is allowed to live: a Cloudflare D1 database only the Worker
 * reads, and never serves.
 *
 *   npx tsx scripts/seed-ask-2026.ts
 *       writes private/ask/seed-<corpus>.sql and prints what it holds (numbers only)
 *   npx tsx scripts/seed-ask-2026.ts --check
 *       loads it into Node's SQLite and checks every row against the public manifest
 *   npx tsx scripts/seed-ask-2026.ts --remote <database> --accord <YYYY-MM-DD> [--env preview]
 *       uploads it with wrangler
 *   npx tsx scripts/seed-ask-2026.ts --remote <database> --switch open|stopped [--env preview]
 *       opens or stops the answers, with no deployment (runbook: « arrêt »)
 *
 * Sending the text is the editor's decision, each time (CLAUDE.md): `--accord` must carry
 * today's date, so that the command line itself says when the accord was given. Without it
 * nothing leaves the machine. The base starts STOPPED: the answers open by a second gesture.
 *
 * Like every tool that reads private/, it prints identifiers and numbers, never a word.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Manifest, PrivateCorpus } from './aec26-types.js';
import { LocalD1 } from './d1-local.js';
import { PRIVATE_CORPUS_PATH } from './ingest-2026.js';

export const SCHEMA_PATH = 'src/worker/sql/schema.sql';
export const SEED_DIR = 'private/ask';
const MANIFEST_PATH = 'data/2026/manifest.json';
/** Rows per INSERT: D1 bounds the size of one statement, not of a file. */
const ROWS_PER_INSERT = 40;

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

const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`;

/**
 * The whole base as SQL. The description of the base (`meta`) is deleted first and written
 * last: while the rows are being replaced the Worker finds no corpus version, and answers
 * "local" rather than read half a book.
 */
export function seedSql(corpus: PrivateCorpus, schema: string, ask: 'open' | 'stopped'): string {
  const rows = seedRows(corpus);
  const out: string[] = [schema.trim(), ''];
  // The index of before D16.22 is dropped wherever a base still holds it: the Worker searches
  // nothing any more, and a derived copy of the text nobody reads has no reason to stay.
  out.push(
    'DROP TABLE IF EXISTS propositions_fts;',
    'DELETE FROM meta;',
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
  // Nothing but the two tables of the schema: no index of the text, no copy of it.
  const tables = db.db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => String(row['name']));
  if (tables.join(',') !== 'meta,propositions') problems.push(`tables: ${tables.join(', ')}`);
  const version = db.db.prepare("SELECT value FROM meta WHERE key = 'corpus_version'").get();
  if (version?.['value'] !== manifest.meta.corpus_version) {
    problems.push('the base is not at the corpus version of the manifest');
  }
  return problems;
}

function wrangler(database: string, env: string | undefined, extra: readonly string[]): number {
  const args = ['--no-install', 'wrangler', 'd1', 'execute', database, '--remote', ...extra];
  if (env !== undefined) args.push('--env', env);
  return spawnSync('npx', args, { stdio: 'inherit' }).status ?? 1;
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
    if (remote === undefined || (flip !== 'open' && flip !== 'stopped')) {
      console.error('usage: --remote <database> --switch open|stopped');
      process.exitCode = 2;
      return;
    }
    process.exitCode = wrangler(remote, env, [
      '--command',
      `UPDATE meta SET value = '${flip}' WHERE key = 'ask'`,
    ]);
    return;
  }

  if (!existsSync(PRIVATE_CORPUS_PATH)) {
    console.error(`seed: ${PRIVATE_CORPUS_PATH} is not on this machine`);
    process.exitCode = 1;
    return;
  }
  const corpus = JSON.parse(readFileSync(PRIVATE_CORPUS_PATH, 'utf8')) as PrivateCorpus;
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

  const today = new Date().toISOString().slice(0, 10);
  if (value('--accord') !== today) {
    console.error(
      `seed: nothing was sent. Sending the text to Cloudflare needs the editor's accord, given ` +
        `today: add --accord ${today}`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`sending to the D1 database "${remote}"${env === undefined ? '' : ` (${env})`}…`);
  process.exitCode = wrangler(remote, env, ['--file', file, '--yes']);
}

if (process.argv[1] !== undefined && /seed-ask-2026\.ts$/.test(process.argv[1])) main();
