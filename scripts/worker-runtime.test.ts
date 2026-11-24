/**
 * The Worker as it runs — its source bundled into one module, started in the local Workers
 * runtime (workerd, through miniflare), with a local base that holds INVENTED sentences.
 * Nothing is deployed, nothing is sent to anyone, no model exists here.
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
 *   - the Worker built from the committed file does, on each host, what that file says;
 *   - by plain HTTP nothing is read; the text of the book, were it still in the base, reaches
 *     no answer; a closed route does not open what it is sent (security review of 15/11/2026).
 *
 * What this file does NOT prove, so that nobody reads more into it:
 *   - the bytes deployed: the bundle here is esbuild's with the options below, wrangler's has
 *     its own — the same source, not the same file;
 *   - the limiter of the platform: miniflare counts exactly, Cloudflare's binding is
 *     « permissive, eventually consistent », one count per location (its documentation). Six a
 *     minute is an order of size there, never a wall — and it protects the allowance, not the
 *     sentences, which can all be asked for in minutes (14-risques.md, R35);
 *   - what the zone does before the Worker (plain HTTP turned into https, the routes).
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
import { CHAT_CONFIG } from './build-mode.js';
import { parseJsonc } from './jsonc.js';
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

/** What the Worker of the chat binds, read from its own file — not copied here. */
interface Bindings {
  d1_databases: { binding: string }[];
  durable_objects: { bindings: { name: string; class_name: string }[] };
  ratelimits: { name: string; simple: { limit: number; period: 10 | 60 } }[];
  vars: Record<string, string>;
}
const declared = parseJsonc(readFileSync(CHAT_CONFIG, 'utf8')) as Bindings & {
  env: { preview: Bindings };
};
/** The one binding of a kind the file declares — the file is wrong, and this test with it, without one. */
function only<T>(list: readonly T[], what: string): T {
  const [first] = list;
  if (first === undefined || list.length !== 1) throw new Error(`${CHAT_CONFIG}: one ${what}`);
  return first;
}
const base = only(declared.d1_databases, 'base');
const object = only(declared.durable_objects.bindings, 'Durable Object');
const limiter = only(declared.ratelimits, 'limiter');

/**
 * The Worker as one module, with the file of the mode replaced by the one a test wants — and the
 * switch of public/flags.json too: the Worker in workerd reads the real clock, and with the
 * committed « auto » every test below would fail for the whole of both freezes of 2027, when the
 * scrutin build or an urgent fix may have to ship (review of 23/11/2026, W4). « off » keeps the
 * calendar out of what these tests prove; the calendar itself is held by scripts/silence.test.ts
 * and the manual stop by its own test below.
 */
async function bundle(
  ask: Record<string, unknown>,
  flags: { silence_override: 'on' | 'off' | 'auto' } = { silence_override: 'off' },
): Promise<string> {
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
          plugin.onLoad({ filter: /public[\\/]flags\.json$/ }, () => ({
            contents: JSON.stringify(flags),
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
    /** `base`: the scheme and host asked; `raw`: a body sent as it is, not as JSON of `body`. */
    init?: { origin?: string; method?: string; base?: string; raw?: string },
  ) => Promise<{ status: number; body: unknown; text: string; headers: Headers }>;
  sql: (statement: string) => Promise<void>;
}

/** One Worker in the local runtime: the bindings wrangler.chat.jsonc declares, without the AI. */
async function start(
  code: string,
  environment: string,
  options: { salt?: string; deposit?: boolean } = {},
): Promise<Started> {
  const instance = new Miniflare(
    convertV4MiniflareOptions({
      modules: [{ type: 'ESModule', path: 'index.mjs', contents: code }],
      compatibilityDate: '2026-09-09',
      d1Databases: { [base.binding]: `base-${String(running.length)}` },
      durableObjects: { [object.name]: { className: object.class_name, useSQLite: true } },
      // A namespace of this test: counts are per instance here, and exact — not on the platform.
      ratelimits: { [limiter.name]: { namespace_id: '2026', simple: limiter.simple } },
      bindings: {
        ...declared.vars,
        CORPUS_VERSION: CORPUS,
        ENVIRONMENT: environment,
        ...(options.salt === undefined ? {} : { RATE_SALT: options.salt }),
      },
    }),
  );
  running.push(instance);
  const db = await instance.getD1Database(base.binding);
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
    const response = await instance.dispatchFetch(`${init.base ?? ORIGIN}${path}`, {
      method: init.method ?? 'POST',
      headers: { origin: init.origin ?? ORIGIN, 'content-type': 'application/json' },
      ...(init.method === 'GET' ? {} : { body: init.raw ?? JSON.stringify(body) }),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text === '' ? null : (JSON.parse(text) as unknown),
      text,
      headers: response.headers as unknown as Headers,
    };
  };
  return { post, sql };
}

const SALT = 'a-salt-for-a-test-of-thirty-two-chars';
const OPEN = switchSql('open', 'gists') ?? '';
const STOPPED = switchSql('stopped', 'gists') ?? '';
const LOCAL = { kind: 'local' };
/**
 * The file of a test: the preview host asks, no model is named. The decision about the campaign
 * months is INVENTED here, so that what this file proves does not change on 1 January 2027 —
 * the Worker in workerd reads the real clock. The rule of that day is held, with its hours, in
 * scripts/chat-worker.test.ts.
 */
const sheet = {
  ...committed,
  mode: 'off',
  preview_mode: 'chat',
  model: null,
  campaign: { serve: true, decided_on: '2026-11-15', decided_by: 'editor' },
};
const QUIET = { kind: 'quiet', why: 'none' };

void test('the two environments of the chat Worker bind the same things under the same names', () => {
  // This file starts the Worker with the names of the top level: the preview must not differ.
  const names = (b: Bindings): unknown => ({
    base: b.d1_databases.map((d) => d.binding),
    object: b.durable_objects.bindings,
    limiter: b.ratelimits.map((r) => ({ name: r.name, simple: r.simple })),
    stop: b.vars.NEURON_HARD_STOP,
  });
  assert.deepEqual(names(declared.env.preview), names(declared));
  assert.deepEqual(limiter.simple, { limit: 6, period: 60 });
});

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
  assert.deepEqual(
    (await worker.post('/api/chat', { corpus: CORPUS, ids: [IDS[0]], words: ['phrase'] })).body,
    QUIET,
  );
  assert.deepEqual((await worker.post('/api/chat', { question: 'pour qui voter ?' })).body, QUIET);
  // Stopped again by one statement, with no deployment: the page keeps its links.
  await worker.sql(STOPPED);
  assert.deepEqual((await worker.post('/api/gists', asked)).body, LOCAL);
});

void test('the manual stop this Worker was built with closes its sentences, whatever the base says', async () => {
  // « silence_override: on » built into THIS Worker: the base open, nothing is served — and no
  // hour is announced for a stop made by hand. Only a deployment of this Worker carries it: the
  // pages' deployment does not (runbook sheet 6, review of 23/11/2026, W1).
  const worker = await start(await bundle(sheet, { silence_override: 'on' }), 'preview', {
    salt: SALT,
  });
  await worker.sql(OPEN);
  const asked = { corpus: CORPUS, ids: [IDS[0]] };
  assert.deepEqual((await worker.post('/api/gists', asked)).body, LOCAL);
  assert.deepEqual(
    (await worker.post('/api/chat', { corpus: CORPUS, ids: [IDS[0]], words: ['phrase'] })).body,
    QUIET,
  );
});

void test('the guards, as the platform sees them: origin, method, shape, book, secret, rate', async () => {
  const code = await bundle(sheet);
  const worker = await start(code, 'preview', { salt: SALT });
  await worker.sql(OPEN);
  const asked = { corpus: CORPUS, ids: [IDS[0]] };
  // The local limiter counts in windows aligned on the minute of the clock: a burst that crosses
  // :00 starts a new count, and the seventh sending is let through — about one run in a hundred
  // failed so (review of 23/11/2026, W7). The burst starts with a whole minute's room.
  const left = 60_000 - (Date.now() % 60_000);
  if (left < 20_000) await new Promise((done) => setTimeout(done, left + 250));
  // Before anything is counted or read: the page of another site, another method.
  assert.equal(
    (await worker.post('/api/gists', asked, { origin: 'https://example.org' })).status,
    403,
  );
  assert.equal(
    (await worker.post('/api/chat', asked, { origin: 'https://example.org' })).status,
    403,
  );
  const wrongMethod = await worker.post('/api/gists', null, { method: 'GET' });
  assert.equal(wrongMethod.status, 405);
  // …and it names the one method the route reads, as a 405 should (D16.80).
  assert.equal(wrongMethod.headers.get('allow'), 'POST');
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
    const says = siteFor(committed, environment, new Date());
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

void test('in the clear, nothing is read: a request by plain HTTP is refused before anything else', async () => {
  const worker = await start(await bundle(sheet), 'preview', { salt: SALT });
  await worker.sql(OPEN);
  const asked = { corpus: CORPUS, ids: [IDS[0]] };
  // A page loaded in the clear would send its own origin — the very one of the address asked:
  // the check of the origin alone lets it through (seen live on 15/11/2026, a 400 by HTTP).
  const plain = ORIGIN.replace('https://', 'http://');
  for (const path of ['/api/gists', '/api/chat', '/api/bench', '/api/nothing']) {
    const answer = await worker.post(path, asked, { base: plain, origin: plain });
    assert.equal(answer.status, 403, path);
    assert.equal(answer.text, '', path);
  }
  // The same request, by https, is answered: the refusal above was of the scheme alone.
  const answer = (await worker.post('/api/gists', asked)).body as { kind: string };
  assert.equal(answer.kind, 'gists');
});

void test('the text of the book reaches no answer — even left in the base, with the old switch open', async () => {
  const worker = await start(await bundle(sheet), 'preview', { salt: SALT });
  // The base as it stood while it still held the book (the text is withdrawn before production
  // opens, `seed-ask-2026.ts --withdraw-text`; this holds if it were not): the table of the
  // text filled — here with a marker, never a word of the book — and the switch of the written
  // answers, a route that no longer exists, left open.
  const SENTINEL = 'SENTINEL-zorglub-de-montcuq';
  await worker.sql(
    'INSERT INTO propositions (id, section_id, kind, ord, text, lead) ' +
      `VALUES ('${String(IDS[0])}', 'p1c1-s01', 'measure', 1, '${SENTINEL}', '${SENTINEL}')`,
  );
  await worker.sql(
    "INSERT INTO meta (key, value) VALUES ('ask', 'open') " +
      "ON CONFLICT(key) DO UPDATE SET value = 'open'",
  );
  await worker.sql(OPEN);
  const one = { corpus: CORPUS, ids: [IDS[0]] };
  const tries: [string, unknown, { method?: string }?][] = [
    ['/api/gists', one],
    ['/api/gists', { corpus: CORPUS, ids: IDS.slice(0, 3) }],
    ['/api/chat', { ...one, words: ['phrase'] }],
    ['/api/bench', one],
    ['/api/bench', { ...one, key: 'k'.repeat(40), mode: 'explain' }],
    ['/api/ask', one],
    ['/api/gists', null, { method: 'GET' }],
  ];
  const seen: string[] = [];
  for (const [path, body, init] of tries) {
    const answer = await worker.post(path, body, init);
    seen.push(answer.text);
    answer.headers.forEach((value, name) => seen.push(`${name}: ${value}`));
  }
  assert.ok(seen.join('\n').length > 200, 'the answers were read');
  assert.ok(!seen.join('\n').includes('SENTINEL'), 'a word of the table of the text was served');
  // What the first request got is the sentence of ours, and nothing else.
  assert.match(seen[0] ?? '', /phrase d'essai/);
  // The key of the bench was never set on this Worker: its route does not exist for anyone.
  assert.equal((await worker.post('/api/bench', one)).status, 404);
});

void test('a closed route opens nothing it is sent; an open one refuses what a page never sends', async () => {
  const worker = await start(await bundle(sheet), 'preview', { salt: SALT });
  await worker.sql(OPEN);
  // /api/chat is closed — no model is named. Were its body opened, these would be refused as
  // malformed (400): « quiet » says nothing was read, not even a question.
  for (const raw of ['{"corpus": not json', 'x'.repeat(50_000), '']) {
    const answer = await worker.post('/api/chat', null, { raw });
    assert.equal(answer.status, 200);
    assert.deepEqual(answer.body, QUIET);
  }
  // /api/gists is open: it reads — and refuses what is malformed, what is longer than a request
  // can be, and more measures than a page ever names (three: src/lib/chat-contract.ts).
  const one = { corpus: CORPUS, ids: [IDS[0]] };
  assert.equal((await worker.post('/api/gists', null, { raw: '{"corpus": not json' })).status, 400);
  const long = JSON.stringify({ ...one, pad: 'x'.repeat(7_000) });
  assert.equal((await worker.post('/api/gists', null, { raw: long })).status, 400);
  assert.equal(
    (await worker.post('/api/gists', { corpus: CORPUS, ids: IDS.slice(0, 4) })).status,
    400,
  );
  assert.equal(
    (
      (await worker.post('/api/gists', { corpus: CORPUS, ids: IDS.slice(0, 3) })).body as {
        gists: unknown[];
      }
    ).gists.length,
    3,
  );
});
