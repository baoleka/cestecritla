/**
 * The launch gate (D15.15, D16.18): the app replaces the holding page when every condition is
 * met, and the gate names the ones that are not. No date is involved (D16.19).
 * Run: npx tsx --test scripts/launch.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { HOLDING_PAGES, deployRefusal, type DeployContext } from './build-mode.js';
import {
  ASK_PATH,
  LAUNCH_PATH,
  MANIFEST_PATH,
  TURTLE_SVG_PATH,
  TURTLE_VALIDATION_PATH,
  WORDS_PATH,
  artefactBlockers,
  canonicalHash,
  launchBlockers,
  pendingReviews,
  privacyStringsHash,
  type DatedGestures,
  type LaunchFile,
  type LaunchInputs,
} from './launch.js';

const DATES: DatedGestures = {
  lcen_declared_on: '2026-12-01',
  contact_mailbox_ready_on: '2026-12-02',
  charter_texts_read_on: '2026-12-03',
  legal_readings_done_on: '2026-12-03',
  controller_decided_on: '2026-12-03',
  dashboard_checked_on: '2026-12-04',
  phones_tried_on: '2026-12-05',
  personas_session_on: '2026-12-06',
  hostile_review_on: '2026-12-06',
  easter_confirmed_on: '2026-12-06',
};

const READY: LaunchInputs = {
  launch: {
    apex: 'app',
    ...DATES,
    privacy_page: { reviewed_on: '2026-12-06', sha256: 'abc' },
    note_fr: '',
  },
  policyValidated: true,
  pendingReviews: [],
  privacyHash: 'abc',
  artefacts: [],
};

const OPEN: DeployContext = {
  policyValidated: true,
  dryRun: false,
  launchBlockers: [],
  insideSilenceWindow: false,
  scrutinBuild: false,
};

void test('when everything is in place, nothing blocks the launch', () => {
  assert.deepEqual(launchBlockers(READY), []);
  const pages = ['index.html', 's/p1c1-s01/index.html'];
  assert.equal(deployRefusal('apex', 'app', pages, OPEN), null);
});

void test('each missing condition blocks, and is named', () => {
  const cases: [Partial<LaunchInputs> | { launch: Partial<LaunchFile> }, RegExp][] = [
    [{ launch: { apex: 'holding' } }, /launch has not been decided/],
    [{ policyValidated: false }, /citation policy has not been validated/],
    [{ launch: { lcen_declared_on: null } }, /LCEN declaration .* \(P0\.5\)/],
    [{ launch: { contact_mailbox_ready_on: null } }, /contact address .* \(P0\.8\)/],
    [{ launch: { lcen_declared_on: 'bientôt' } }, /LCEN declaration/],
    [{ launch: { charter_texts_read_on: null } }, /\(P0\.2\): charter_texts_read_on/],
    [{ launch: { legal_readings_done_on: null } }, /\(P0\.3\): legal_readings_done_on/],
    [{ launch: { controller_decided_on: null } }, /\(P0\.4\): controller_decided_on/],
    [{ launch: { dashboard_checked_on: null } }, /dashboard .* dashboard_checked_on/],
    [{ launch: { phones_tried_on: null } }, /real phones: phones_tried_on/],
    [{ launch: { personas_session_on: null } }, /persona session .* personas_session_on/],
    [{ launch: { hostile_review_on: null } }, /hostile review .* hostile_review_on/],
    [{ launch: { easter_confirmed_on: null } }, /lait-fraise .* easter_confirmed_on/],
    [
      { launch: { privacy_page: { reviewed_on: null, sha256: null } } },
      /privacy page has not been re-read/,
    ],
    [
      { launch: { privacy_page: { reviewed_on: '2026-12-06', sha256: 'old' } } },
      /privacy page changed after it was re-read/,
    ],
    [
      { pendingReviews: ['riposte:rip-01', 'mot:ecocide'] },
      /2 of our own texts .* riposte:rip-01, mot:ecocide/,
    ],
    [{ artefacts: ['the turtle is not drawn or not validated'] }, /turtle is not drawn/],
  ];
  for (const [change, pattern] of cases) {
    const inputs: LaunchInputs = {
      ...READY,
      ...change,
      launch: { ...READY.launch, ...('launch' in change ? change.launch : {}) },
    };
    const blockers = launchBlockers(inputs);
    assert.equal(blockers.length, 1, JSON.stringify(change));
    assert.match(blockers[0] ?? '', pattern);
  }
});

void test('every dated gesture of the launch file has its own blocker', () => {
  const none = Object.fromEntries(
    Object.keys(DATES).map((key) => [key, null]),
  ) as unknown as DatedGestures;
  const blockers = launchBlockers({ ...READY, launch: { ...READY.launch, ...none } });
  assert.equal(blockers.length, Object.keys(DATES).length);
  for (const key of Object.keys(DATES)) {
    assert.ok(
      blockers.some((line) => line.endsWith(`: ${key}`)),
      `${key} is not named by the gate`,
    );
  }
});

void test('a blocked launch is refused at the apex, with its reasons, dry run or not', () => {
  const blockers = launchBlockers({
    ...READY,
    launch: { ...READY.launch, lcen_declared_on: null },
  });
  const pages = ['index.html', 's/p1c1-s01/index.html'];
  for (const dryRun of [false, true]) {
    const refusal = deployRefusal('apex', 'app', pages, {
      ...OPEN,
      dryRun,
      launchBlockers: blockers,
    });
    assert.match(String(refusal), /holding page until the launch is decided/);
    assert.match(String(refusal), /P0\.5/);
  }
  // The holding page is never blocked by any of this: it is also the withdrawal gesture.
  assert.equal(
    deployRefusal('apex', 'holding', [...HOLDING_PAGES], {
      ...OPEN,
      policyValidated: false,
      launchBlockers: blockers,
      insideSilenceWindow: true,
    }),
    null,
  );
});

void test('a fingerprint does not depend on the order of the keys, and follows the content', () => {
  assert.equal(
    canonicalHash({ a: 1, b: [2, { c: 3, d: 4 }] }),
    canonicalHash({ b: [2, { d: 4, c: 3 }], a: 1 }),
  );
  assert.notEqual(canonicalHash({ a: 1 }), canonicalHash({ a: 2 }));
  assert.equal(
    privacyStringsHash({ 'privacy.a': 'x', 'home.title': 'y' }),
    privacyStringsHash({ 'home.title': 'z', 'privacy.a': 'x' }),
  );
  assert.notEqual(
    privacyStringsHash({ 'privacy.a': 'x' }),
    privacyStringsHash({ 'privacy.a': 'x.' }),
  );
});

/** A throwaway tree holding the files that validate themselves, so the rule runs without the repo. */
function tree(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), 'cel-launch-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(
      join(root, path),
      typeof content === 'string' ? content : JSON.stringify(content),
    );
  }
  return root;
}

void test('the files that validate themselves: missing, in place, then edited after validation', () => {
  const corpus = 'c0ffee';
  const manifest = { meta: { corpus_version: corpus } };

  const empty = tree({ [MANIFEST_PATH]: manifest });
  const missing = artefactBlockers(empty);
  assert.equal(missing.length, 3);
  assert.match(
    missing.join('\n'),
    /ask\.json is missing[\s\S]*game-words\.json is missing[\s\S]*turtle is not drawn/,
  );
  rmSync(empty, { recursive: true });

  const words = [{ slot: 0, id: 'w000', word: 'mot', pin: { id: 'p1c1-s01-m01', sha256: 'x' } }];
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>';
  const complete = {
    [MANIFEST_PATH]: manifest,
    [ASK_PATH]: {
      mode: 'answer',
      bench: { sha256: 'beef', run_on: '2026-12-01' },
      database: { corpus_version: corpus },
      answers_read_on: '2026-12-02',
      model_confirmed_on: '2026-12-02',
    },
    [WORDS_PATH]: {
      meta: {
        pool_reviewed_on: '2026-12-01',
        validated: { on: '2026-12-02', list_sha256: canonicalHash(words) },
        attested: { list_sha256: canonicalHash(words), corpus_version: corpus },
      },
      words,
    },
    [TURTLE_SVG_PATH]: svg,
    [TURTLE_VALIDATION_PATH]: {
      validated_on: '2026-12-03',
      svg_sha256: createHash('sha256').update(svg).digest('hex'),
      same_character_asked_on: '2026-12-03',
    },
  };
  const ready = tree(complete);
  assert.deepEqual(artefactBlockers(ready), []);

  // One more word after the editor validated the list: validation and attestation both fall.
  writeFileSync(
    join(ready, WORDS_PATH),
    JSON.stringify({
      ...complete[WORDS_PATH],
      words: [...words, { ...words[0], slot: 1, id: 'w001' }],
    }),
  );
  // A retouched drawing after the sheet was dated.
  writeFileSync(join(ready, TURTLE_SVG_PATH), `${svg}<!-- retouched -->`);
  // A re-crawl changed the corpus under the private database.
  writeFileSync(join(ready, MANIFEST_PATH), JSON.stringify({ meta: { corpus_version: 'decaf' } }));
  const stale = artefactBlockers(ready).join('\n');
  assert.match(stale, /list changed after it was validated/);
  assert.match(stale, /has not attested this list on this corpus/);
  assert.match(stale, /drawing changed after the sheet was validated/);
  assert.match(stale, /private database is not at the corpus version/);

  // "Search only" needs neither a bench nor a database.
  writeFileSync(join(ready, ASK_PATH), JSON.stringify({ mode: 'off' }));
  assert.doesNotMatch(artefactBlockers(ready).join('\n'), /ask\.json/);
  writeFileSync(join(ready, ASK_PATH), '{ not json');
  assert.match(artefactBlockers(ready).join('\n'), /ask\.json is missing/);
  rmSync(ready, { recursive: true });
});

void test('the committed launch file is well formed', () => {
  const launch = JSON.parse(readFileSync(LAUNCH_PATH, 'utf8')) as LaunchFile &
    Record<string, unknown>;
  assert.ok(['holding', 'app'].includes(launch.apex));
  assert.equal('planned_on' in launch, false, 'there is no launch date any more (D16.19)');
  for (const key of Object.keys(DATES) as (keyof DatedGestures)[]) {
    const date = launch[key];
    assert.ok(date === null || /^\d{4}-\d{2}-\d{2}$/.test(date), `${key}: ${String(date)}`);
  }
  const { reviewed_on: reviewedOn, sha256 } = launch.privacy_page;
  assert.ok(reviewedOn === null || /^\d{4}-\d{2}-\d{2}$/.test(reviewedOn));
  assert.ok(sha256 === null || /^[0-9a-f]{64}$/.test(sha256));
  // An app at the apex with a text nobody re-read is exactly what D0.27 forbids.
  if (launch.apex === 'app') assert.deepEqual(pendingReviews(), []);
});
