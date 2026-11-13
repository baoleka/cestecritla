/**
 * The launch gate (D15.15, D16.18): the app replaces the holding page when every condition is
 * met, and the gate names the ones that are not. No date is involved (D16.19).
 * Run: npx tsx --test scripts/launch.test.ts
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { listFingerprint } from '../src/lib/fingerprint.js';
import { LOCAL_CHECKS } from '../src/lib/game.js';
import { WORD_LINKS_PATH, WORD_LINK_ENGINES, wordsFingerprint } from '../src/lib/word-links.js';
import { HOLDING_PAGES, deployRefusal, type DeployContext } from './build-mode.js';
import {
  ASK_PATH,
  LAUNCH_PATH,
  MANIFEST_PATH,
  TOKEN_SETS,
  TURTLE_CSS_PATH,
  TURTLE_SVG_PATH,
  TURTLE_VALIDATION_PATH,
  WORDS_PATH,
  artefactBlockers,
  canonicalHash,
  launchBlockers,
  pendingReviews,
  privacyStringsHash,
  turtleColours,
  turtleFingerprint,
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
  ask: 'off',
  workerProblems: [],
  distProblems: [],
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
  const pool = { sensitive_2025: ['c4-s01'], judged: { 'p6c1-s01': null } };
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
        pool,
        pool_reviewed_on: '2026-12-01',
        validated: { on: '2026-12-02', list_sha256: listFingerprint(words, pool) },
        attested: {
          list_sha256: listFingerprint(words, pool),
          corpus_version: corpus,
          checks: [...LOCAL_CHECKS],
        },
      },
      words,
    },
    [WORD_LINKS_PATH]: {
      corpus_version: corpus,
      words_sha256: wordsFingerprint(words),
      engines: WORD_LINK_ENGINES.map((name) => ({ name, version: '1' })),
      highlighted: ['w000'],
      measure_only: [],
    },
    [TURTLE_SVG_PATH]: svg,
    [TURTLE_CSS_PATH]: '.turtle { display: block; }',
    [TOKEN_SETS[0]]: {
      color: { violet: { $value: '#4C0297' } },
      'color-role': { light: { bg: '#fff', 'turtle-line': '{color.violet}' } },
    },
  };
  const ready = tree(complete);
  // The sheet is dated on the drawing as it stands: the file, its stylesheet, its colours.
  const stamp = (): void => {
    writeFileSync(
      join(ready, TURTLE_VALIDATION_PATH),
      JSON.stringify({
        validated_on: '2026-12-03',
        drawing_sha256: turtleFingerprint(ready),
        same_character_asked_on: '2026-12-03',
        same_character_sha256: turtleFingerprint(ready),
      }),
    );
  };
  assert.match(artefactBlockers(ready).join('\n'), /turtle is not drawn or not validated/);
  stamp();
  assert.deepEqual(artefactBlockers(ready), []);
  assert.deepEqual(turtleColours(ready), [`${TOKEN_SETS[0]} light turtle-line #4C0297`]);

  // Each of the three things the editor looked at un-validates her when it moves — and a colour
  // that is not hers does not.
  const retouches: [string, string][] = [
    [TURTLE_CSS_PATH, '.turtle { display: inline; }'],
    [
      TOKEN_SETS[0],
      JSON.stringify({
        color: { violet: { $value: '#4C0298' } },
        'color-role': { light: { bg: '#fff', 'turtle-line': '{color.violet}' } },
      }),
    ],
  ];
  for (const [path, content] of retouches) {
    const before = readFileSync(join(ready, path), 'utf8');
    writeFileSync(join(ready, path), content);
    assert.match(artefactBlockers(ready).join('\n'), /drawing changed after the sheet/, path);
    writeFileSync(join(ready, path), before);
    assert.deepEqual(artefactBlockers(ready), [], path);
  }
  writeFileSync(
    join(ready, TOKEN_SETS[0]),
    JSON.stringify({
      color: { violet: { $value: '#4C0297' } },
      'color-role': { light: { bg: '#000', 'turtle-line': '{color.violet}' } },
    }),
  );
  assert.deepEqual(artefactBlockers(ready), []);

  // A section judged after the editor validated the list: the tiles are no longer those he
  // read the words among. Validation and attestation both fall, with not a word changed.
  const judged = { ...pool, judged: { 'p6c1-s01': 'play' } };
  writeFileSync(
    join(ready, WORDS_PATH),
    JSON.stringify({
      ...complete[WORDS_PATH],
      meta: { ...complete[WORDS_PATH].meta, pool: judged },
    }),
  );
  assert.match(
    artefactBlockers(ready).join('\n'),
    /pool of sections changed after it was validated[\s\S]*has not attested this list/,
  );
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
  assert.match(stale, /list or its pool of sections changed after it was validated/);
  // …and the browsers were asked about another list: the words' links are to be followed again.
  assert.match(stale, /word-links\.json: followed on another (?:corpus|list of words)/);
  assert.match(stale, /has not attested this list on this corpus/);
  assert.match(stale, /drawing changed after the sheet was validated/);
  assert.match(stale, /drawing changed after "same character\?" was asked/);
  assert.match(stale, /private database is not at the corpus version/);

  // "Search only" needs neither a bench nor a database — but it is a decision, with its date:
  // a file that says "off" because no bench has run yet decides nothing.
  writeFileSync(join(ready, ASK_PATH), JSON.stringify({ mode: 'off', decided_on: null }));
  assert.match(artefactBlockers(ready).join('\n'), /"search only" is the editor's decision/);
  writeFileSync(join(ready, ASK_PATH), JSON.stringify({ mode: 'off', decided_on: '2026-12-01' }));
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
