/**
 * The Worker as it runs — bundled as wrangler bundles it, started in the local Workers runtime
 * (workerd, through miniflare), with a local base that holds INVENTED sentences. Nothing is
 * deployed, nothing is sent to anyone, no model exists here.
 *
 * Why this file exists (15/11/2026). Every path of the two routes is a pure function with its
 * test (scripts/chat-worker.test.ts) — and the few lines that wire them to the platform had
 * none: src/worker/index.ts said the site asks « only if a model reads », so that a sheet
 * without a model (D16.60) would never have been served a sentence. It was found by reading
 * the file on the eve of the first opening. This test runs the wiring itself:
 *
 *   - no model named, the preview host asks: the sentences are served once the switch of the
 *     base is open, in the order named, `ai` false — and `/api/chat` answers « quiet »;
 *   - the same Worker on the production host, where the file says "off": nothing is served;
 *   - the guards as the platform sees them: another origin, another method, a field too many,
 *     another book, a base that is stopped, a Worker without its secret, a visitor who asks
 *     faster than anyone reads;
 *   - the Worker built from the committed file does, on each host, what that file says.
 *
 * esbuild and miniflare are not asked for by name in package.json: they come with astro and
 * with wrangler, at the versions the lockfile pins — the runtime here is the one `wrangler`
 * itself would start. A wrangler that changes its runtime's options breaks this file loudly,
 * which is the point.
 *
 * Run: npx tsx --test scripts/worker-runtime.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { siteFor } from '../src/worker/chat.js';
import type { Manifest } from './aec26-types.js';
import { gistsSql, switchSql } from './seed-ask-2026.js';

const ORIGIN = 'https://beta.cestecritla.fr';
const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as Manifest;
const CORPUS = manifest.meta.corpus_version;
/** Real identifiers, invented sentences: five measures of the first section. */
const ROWS = manifest.sections
  .flatMap((section) => section.items)
  .filter((item) => item.kind !== 'paragraph')
  .slice(0, 5)
  .map((item) => ({
    id: item.id,
    text: `Le programme prévoit une phrase d'essai, pour ${item.id}.`,
    measure_sha256: item.sha256,
    read_on: '2026-11-15',
  }));
const IDS = ROWS.map((row) => row.id);
const committed = JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as Record<string, unknown>;

/** The Worker as one module, with the file of the mode replaced by the one a test wants. */
async function bundle(ask: Record<string, unknown>): Promise<string> {
  const out = await build({
    entryPoints: ['src/worker/index.ts'],
    bundle: true,
    format: 'esm',
    write: false,
    target: 'es2022',
    external: ['cloudflare:workers'],
    logLevel: 'silent',
    plugins: [
      {
        name: 'the-mode-of-the-test',
        setup(plugin) {
          plugin.onLoad({ filter: /data[\\/]2026[\\/]ask\.json$/ }, () => ({
            contents: JSON.stringify(ask),
            loader: 'json',
          }));
        },
      },
    ],
  });
  const code = out.outputFiles[0]?.text;
  assert.ok(code !== undefined && code.length > 10_000, 'the Worker did not bundle');
  return code;
}

const running: Miniflare[] = [];
after(async () => {
  await Promise.all(running.map((instance) => instance.dispose()));
});

interface Started {
  post: (
    path: string,
    body: unknown,
    init?: { origin?: string; method?: string },
  ) => Promise<{ status: number; body: unknown; headers: Headers }>;
  sql: (statement: string) => Promise<void>;
}

/** One Worker in the local runtime: its bindings as wrangler.chat.jsonc names them, no AI. */
async function start(
  code: string,
  environment: string,
  options: { salt?: string; deposit?: boolean } = {},
): Promise<Started> {
  const instance = new Miniflare(
    convertV4MiniflareOptions({
      modules: [{ type: 'ESModule', path: 'index.mjs', contents: code }],
      compatibilityDate: '2026-09-09',
      d1Databases: { DB: `base-${String(running.length)}` },
      durableObjects: { BUDGET: { className: 'NeuronBudget', useSQLite: true } },
      ratelimits: { RATE: { namespace_id: '2026', simple: { limit: 6, period: 60 } } },
      bindings: {
        CORPUS_VERSION: CORPUS,
        ENVIRONMENT: environment,
        NEURON_HARD_STOP: '8500',
        ...(options.salt === undefined ? {} : { RATE_SALT: options.salt }),
      },
    }),
  );
  running.push(instance);
  const db = await instance.getD1Database('DB');
  const sql = async (statement: string): Promise<void> => {
    await db.prepare(statement).run();
  };
  if (options.deposit !== false) {
    // The deposit as the tool writes it (scripts/seed-ask-2026.ts): the switch starts stopped.
    const deposit = gistsSql(ROWS, CORPUS, readFileSync('src/worker/sql/schema.sql', 'utf8'));
    for (const statement of deposit.split(/;\s*\n/)) {
      const lines = statement.split('\n').filter((line) => !line.trim().startsWith('--'));
      if (lines.join('').trim() !== '') await sql(lines.join('\n'));
    }
  }
  const post: Started['post'] = async (path, body, init = {}) => {
    const response = await instance.dispatchFetch(`${ORIGIN}${path}`, {
      method: init.method ?? 'POST',
      headers: { origin: init.origin ?? ORIGIN, 'content-type': 'application/json' },
      ...(init.method === 'GET' ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text === '' ? null : (JSON.parse(text) as unknown),
      headers: response.headers as unknown as Headers,
    };
  };
  return { post, sql };
}

const SALT = 'a-salt-for-a-test-of-thirty-two-chars';
const OPEN = switchSql('open', 'gists') ?? '';
const STOPPED = switchSql('stopped', 'gists') ?? '';
const LOCAL = { kind: 'local' };
const sheet = { ...committed, mode: 'off', preview_mode: 'chat', model: null };

void test('a sheet without a model: the Worker serves the sentences, and calls nobody (D16.60)', async () => {
  const worker = await start(await bundle(sheet), 'preview', { salt: SALT });
  const asked = { corpus: CORPUS, ids: [IDS[2], IDS[0], 'p9c9-s09-m09'] };
  // Deposited is not served: the switch of the base starts stopped.
  assert.deepEqual((await worker.post('/api/gists', asked)).body, LOCAL);
  await worker.sql(OPEN);
  const answer = await worker.post('/api/gists', asked);
  assert.equal(answer.status, 200);
  assert.deepEqual(answer.body, {
    kind: 'gists',
    corpus: CORPUS,
    // In the order named; a measure the base has no sentence for is simply not there.
    gists: [IDS[2], IDS[0]].map((id) => ({
      id,
      text: `Le programme prévoit une phrase d'essai, pour ${String(id)}.`,
    })),
    // No model is named: none may be asked, and the page offers none.
    ai: false,
  });
  assert.equal(answer.headers.get('cache-control'), 'no-store');
  assert.equal(answer.headers.get('x-robots-tag'), 'noindex');
  assert.equal(answer.headers.get('access-control-allow-origin'), null, 'no CORS is sent');
  // The other route is closed whatever it is sent: a well-formed request gets « quiet ».
  const quiet = { kind: 'quiet', why: 'none' };
  assert.deepEqual(
    (await worker.post('/api/chat', { corpus: CORPUS, ids: [IDS[0]], words: ['phrase'] })).body,
    quiet,
  );
  assert.deepEqual((await worker.post('/api/chat', { question: 'pour qui voter ?' })).body, quiet);
  // Stopped again by one statement, with no deployment: the page keeps its links.
  await worker.sql(STOPPED);
  assert.deepEqual((await worker.post('/api/gists', asked)).body, LOCAL);
});

void test('the guards, as the platform sees them: origin, method, shape, book, secret, rate', async () => {
  const code = await bundle(sheet);
  const worker = await start(code, 'preview', { salt: SALT });
  await worker.sql(OPEN);
  const asked = { corpus: CORPUS, ids: [IDS[0]] };
  // Before anything is counted or read: the page of another site, another method.
  assert.equal(
    (await worker.post('/api/gists', asked, { origin: 'https://example.org' })).status,
    403,
  );
  assert.equal(
    (await worker.post('/api/chat', asked, { origin: 'https://example.org' })).status,
    403,
  );
  assert.equal((await worker.post('/api/gists', null, { method: 'GET' })).status, 405);
  // What only this Worker and its pages agree on: a field too many, a sentence, another book.
  assert.equal((await worker.post('/api/gists', { ...asked, question: 'x' })).status, 400);
  assert.equal(
    (await worker.post('/api/gists', { corpus: CORPUS, ids: 'p1c1-s01-k01' })).status,
    400,
  );
  assert.deepEqual(
    (await worker.post('/api/gists', { ...asked, corpus: 'f'.repeat(16) })).body,
    LOCAL,
  );
  // Six sendings a minute for one visitor on this route: three are spent above; three more
  // are answered, and the next one is not — « local », like every other closed door.
  for (let sent = 0; sent < 3; sent += 1) {
    assert.equal(
      ((await worker.post('/api/gists', asked)) as { body: { kind: string } }).body.kind,
      'gists',
    );
  }
  assert.deepEqual((await worker.post('/api/gists', asked)).body, LOCAL);
  // Without its secret the limiter cannot count: the route fails closed.
  const bare = await start(code, 'preview');
  await bare.sql(OPEN);
  assert.deepEqual((await bare.post('/api/gists', asked)).body, LOCAL);
  // A base that was never deposited: no table to read, and still a page, never an error.
  const empty = await start(code, 'preview', { salt: SALT, deposit: false });
  const nothing = await empty.post('/api/gists', asked);
  assert.equal(nothing.status, 200);
  assert.deepEqual(nothing.body, LOCAL);
});

void test('the preview host may ask before production does: the same Worker, the other host, serves nothing', async () => {
  const production = await start(await bundle(sheet), 'production', { salt: SALT });
  await production.sql(OPEN);
  const asked = { corpus: CORPUS, ids: [IDS[0]] };
  assert.deepEqual((await production.post('/api/gists', asked)).body, LOCAL);
  assert.deepEqual((await production.post('/api/chat', asked)).body, {
    kind: 'quiet',
    why: 'none',
  });
});

void test('the Worker built from the committed file does, on each host, what that file says', async () => {
  const code = await bundle(committed);
  const asked = { corpus: CORPUS, ids: [IDS[0]] };
  for (const environment of ['preview', 'production']) {
    const worker = await start(code, environment, { salt: SALT });
    await worker.sql(OPEN);
    const answer = (await worker.post('/api/gists', asked)).body as { kind: string; ai?: boolean };
    const says = siteFor(committed, environment);
    assert.equal(answer.kind, says.mode === 'chat' ? 'gists' : 'local', environment);
    // No model is named in the committed file (D16.60): where sentences are served, no AI is.
    if (answer.kind === 'gists') assert.equal(answer.ai, false, environment);
    assert.deepEqual(
      (await worker.post('/api/chat', { ...asked, words: ['phrase'] })).body,
      { kind: 'quiet', why: 'none' },
      environment,
    );
  }
});
