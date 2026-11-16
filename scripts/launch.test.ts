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
  WORDS_PATH,
  artefactBlockers,
  canonicalHash,
  STRINGS_PATH,
  isChatPrivacyKey,
  launchBlockers,
  mascotBlockers,
  pendingReviews,
  previewChatBlockers,
  privacyChatStringsHash,
  privacyMascotStringsHash,
  privacyStringsHash,
  type DatedGestures,
  type LaunchFile,
  type LaunchInputs,
} from './launch.js';
import {
  MASCOT2_CSS_PATH,
  MASCOT2_PALETTE_PATH,
  MASCOT2_SVG_PATH,
  MASCOT2_VALIDATION_PATH,
  mascot2Fingerprint,
} from './mascot2-kit.js';

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
  previewBlockers: [],
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
    [{ artefacts: ['the mascot is not drawn or not validated'] }, /mascot is not drawn/],
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
  // Two readings, two fingerprints: what only a page that asks shows is read apart, so that a
  // word changed in the section of the chat does not keep production from being redeployed.
  for (const key of ['privacy.chat.title', 'privacy.chat.rate', 'privacy.no_measure.ask']) {
    assert.equal(isChatPrivacyKey(key), true, key);
  }
  for (const key of ['privacy.lead', 'privacy.transfer', 'privacy.asked', 'chat.consent.who']) {
    assert.equal(isChatPrivacyKey(key), false, key);
  }
  const page = { 'privacy.lead': 'x', 'privacy.chat.title': 'y', 'privacy.no_account.ask': 'z' };
  assert.equal(
    privacyStringsHash(page),
    privacyStringsHash({ ...page, 'privacy.chat.title': 'changed', 'privacy.no_account.ask': '' }),
  );
  assert.notEqual(privacyStringsHash(page), privacyStringsHash({ ...page, 'privacy.lead': 'x.' }));
  assert.equal(
    privacyChatStringsHash(page),
    privacyChatStringsHash({ ...page, 'privacy.lead': 'changed', 'home.title': 'y' }),
  );
  for (const moved of [{ 'privacy.chat.title': 'y.' }, { 'privacy.no_account.ask': 'z.' }]) {
    assert.notEqual(privacyChatStringsHash(page), privacyChatStringsHash({ ...page, ...moved }));
  }
  // The committed kit: every string of the privacy page falls on one side, none on both.
  const committed = JSON.parse(readFileSync(STRINGS_PATH, 'utf8')) as Record<string, unknown>;
  const privacy = Object.keys(committed).filter((key) => key.startsWith('privacy.'));
  assert.ok(privacy.some(isChatPrivacyKey) && !privacy.every(isChatPrivacyKey));
  for (const gone of ['privacy.policy.consent', 'privacy.policy.thread', 'privacy.policy.rate']) {
    assert.equal(gone in committed, false, `${gone}: renamed into privacy.chat.*`);
  }
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
  // Two measures and a paragraph of prose: the book of this test has two verdicts to give.
  const manifest = {
    meta: { corpus_version: corpus },
    sections: [{ items: [{ kind: 'key_measure' }, { kind: 'measure' }, { kind: 'paragraph' }] }],
  };

  const empty = tree({ [MANIFEST_PATH]: manifest });
  const missing = artefactBlockers(empty);
  assert.equal(missing.length, 4);
  assert.match(
    missing.join('\n'),
    /ask\.json is missing[\s\S]*game-words\.json is missing[\s\S]*colour given to the mascot is not re-read[\s\S]*mascot is not drawn/,
  );
  rmSync(empty, { recursive: true });

  const words = [{ slot: 0, id: 'w000', word: 'mot', pin: { id: 'p1c1-s01-m01', sha256: 'x' } }];
  const pool = { sensitive_2025: ['c4-s01'], judged: { 'p6c1-s01': null } };
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" class="mascot"/>';
  // Six colours for her flamingo, in each theme, and the neutral set's six (D17.3, D17.16).
  const palette = {
    note_fr: '',
    chosen: 'only',
    palettes: {
      only: {
        label_fr: '',
        light: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'],
        dark: ['#AAAAAA', '#BBBBBB', '#CCCCCC', '#DDDDDD', '#EEEEEE', '#FFFFFF'],
      },
    },
    neutral: {
      label_fr: '',
      light: ['#111112', '#222223', '#333334', '#444445', '#555556', '#666667'],
      dark: ['#AAAAAB', '#BBBBBC', '#CCCCCD', '#DDDDDE', '#EEEEEF', '#FFFFFE'],
    },
  };
  // The kit of a site: a page of privacy, the section of the chat, and the one line the mascot
  // adds to it (D17.3).
  const kit = {
    'privacy.lead': 'x',
    'privacy.chat.title': 'Quand tu demandes',
    'privacy.game.field.tint': 'sa couleur',
  };
  const reread = {
    reviewed_on: '2026-12-02',
    reviewed_by: 'session',
    sha256: privacyMascotStringsHash(kit),
  };
  const complete = {
    [MANIFEST_PATH]: manifest,
    [STRINGS_PATH]: kit,
    [LAUNCH_PATH]: {
      privacy_chat: {
        reviewed_on: '2026-12-02',
        reviewed_by: 'editor',
        sha256: privacyChatStringsHash(kit),
      },
      privacy_mascot: reread,
    },
    [ASK_PATH]: {
      mode: 'chat',
      model: 'mistral-small-3.1',
      bench: { sha256: 'beef', run_on: '2026-12-01' },
      database: { corpus_version: corpus },
      gists: {
        corpus_version: corpus,
        verdicts: 2,
        sha256: 'cafe',
        deposited_on: '2026-12-01',
        read_by: 'editor',
      },
      threads_read_on: '2026-12-02',
      model_confirmed_on: '2026-12-02',
      deployment_rehearsed_on: '2026-12-01',
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
    [MASCOT2_SVG_PATH]: svg,
    [MASCOT2_CSS_PATH]: '.mascot { display: block; }',
    [MASCOT2_PALETTE_PATH]: palette,
    [TOKEN_SETS[0]]: {
      color: { violet: { $value: '#4C0297' } },
      'color-role': { light: { bg: '#fff', 'turtle-line': '{color.violet}' } },
    },
  };
  const ready = tree(complete);
  // The sheet is dated on the drawing as it stands: the file, its stylesheet, its colours, its
  // choreography.
  const stamp = (): void => {
    writeFileSync(
      join(ready, MASCOT2_VALIDATION_PATH),
      JSON.stringify({
        validated_on: '2026-12-03',
        drawing_sha256: mascot2Fingerprint(ready),
        same_character_asked_on: '2026-12-03',
        same_character_sha256: mascot2Fingerprint(ready),
      }),
    );
  };
  assert.match(artefactBlockers(ready).join('\n'), /mascot is not drawn or not validated/);
  stamp();
  assert.deepEqual(artefactBlockers(ready), []);

  // The line of the privacy page about her colour: re-read as it stands, and signed. A date
  // nobody signs is not a reading; a line changed since is not the line that was read.
  const launchFile = (privacy: Record<string, unknown>): void => {
    writeFileSync(
      join(ready, LAUNCH_PATH),
      JSON.stringify({ ...complete[LAUNCH_PATH], privacy_mascot: privacy }),
    );
  };
  launchFile({ ...reread, reviewed_by: null });
  assert.match(
    artefactBlockers(ready).join('\n'),
    /nothing says who re-read it .* privacy_mascot\.reviewed_by$/,
  );
  launchFile({
    ...reread,
    sha256: privacyMascotStringsHash({ ...kit, 'privacy.game.field.tint': 'x' }),
  });
  assert.match(artefactBlockers(ready).join('\n'), /not re-read as it stands: privacy_mascot/);
  launchFile(reread);
  assert.deepEqual(artefactBlockers(ready), []);
  // That line is read apart: it is not in the fingerprint of the rest of the page.
  assert.equal(privacyStringsHash(kit), privacyStringsHash({ 'privacy.lead': 'x' }));

  // Each of the things the editor looked at un-validates her when it moves — and a colour that
  // is not hers does not.
  const retouches: [string, string][] = [
    [MASCOT2_CSS_PATH, '.mascot { display: inline; }'],
    [
      TOKEN_SETS[0],
      JSON.stringify({
        color: { violet: { $value: '#4C0298' } },
        'color-role': { light: { bg: '#fff', 'turtle-line': '{color.violet}' } },
      }),
    ],
    [MASCOT2_PALETTE_PATH, JSON.stringify({ ...palette, chosen: null })],
  ];
  for (const [path, content] of retouches) {
    const before = readFileSync(join(ready, path), 'utf8');
    writeFileSync(join(ready, path), content);
    assert.match(artefactBlockers(ready).join('\n'), /drawing changed after the sheet/, path);
    writeFileSync(join(ready, path), before);
    assert.deepEqual(artefactBlockers(ready), [], path);
  }
  // A palette that cannot be read is a drawing nobody can have validated — and nothing throws.
  writeFileSync(join(ready, MASCOT2_PALETTE_PATH), 'not json');
  assert.match(artefactBlockers(ready).join('\n'), /mascot is not drawn or not validated/);
  writeFileSync(join(ready, MASCOT2_PALETTE_PATH), JSON.stringify(palette));
  assert.deepEqual(artefactBlockers(ready), []);
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
  writeFileSync(join(ready, MASCOT2_SVG_PATH), `${svg}<!-- retouched -->`);
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

  // The chat rests on what a file can carry of the gates of PLAN-CHAT §5: each one missing
  // blocks, and is named. (The book of this test moved to « decaf » above.)
  const chat = {
    mode: 'chat',
    bench: { sha256: 'beef', run_on: '2026-12-01' },
    database: { corpus_version: 'decaf' },
    model: 'mistral-small-3.1',
    gists: {
      corpus_version: 'decaf',
      verdicts: -1,
      sha256: 'cafe',
      deposited_on: '2026-12-01',
      read_by: 'editor',
    },
    threads_read_on: '2026-12-02',
    model_confirmed_on: '2026-12-02',
    deployment_rehearsed_on: '2026-12-01',
  };
  const asked = (file: unknown): string => {
    writeFileSync(join(ready, ASK_PATH), JSON.stringify(file));
    return artefactBlockers(ready)
      .filter((line) => line.includes('ask.json'))
      .join('\n');
  };
  assert.equal(asked(chat), '');
  for (const [without, said] of [
    [{ bench: null }, /rests on no recorded bench of explanations/],
    [{ database: { corpus_version: 'c0ffee' } }, /private database is not at the corpus version/],
    [{ gists: null }, /read sentences are not deposited for this book/],
    [{ gists: { ...chat.gists, corpus_version: 'c0ffee' } }, /not deposited for this book/],
    [{ gists: { ...chat.gists, deposited_on: null } }, /not deposited for this book/],
    [{ gists: { ...chat.gists, verdicts: 1068 } }, /not every measure has its verdict/],
    [{ gists: { ...chat.gists, read_by: undefined } }, /does not say who read the sentences/],
    [{ gists: { ...chat.gists, read_by: 'a person' } }, /does not say who read the sentences/],
    [{ threads_read_on: null }, /has not read the forty threads/],
    [{ model_confirmed_on: 'soon' }, /has not confirmed the model/],
    [{ deployment_rehearsed_on: null }, /has not been rehearsed on the preview host/],
  ] as const) {
    assert.match(asked({ ...chat, ...without }), said, JSON.stringify(without));
  }
  // « Demander » without a live AI (D16.60): no model is named, so nothing that belongs to one
  // is waited for — no bench, no threads, no confirmation, no text of the book in the base.
  const sheet = {
    mode: 'chat',
    model: null,
    gists: { ...chat.gists, read_by: 'session' },
    deployment_rehearsed_on: '2026-12-01',
  };
  assert.equal(asked(sheet), '');
  assert.equal(asked({ ...sheet, database: { corpus_version: 'c0ffee' }, bench: null }), '');
  // …and everything that does not belong to a model still holds.
  for (const [without, said] of [
    [{ gists: null }, /read sentences are not deposited for this book/],
    [{ gists: { ...sheet.gists, verdicts: 1068 } }, /not every measure has its verdict/],
    [{ gists: { ...sheet.gists, read_by: null } }, /does not say who read the sentences/],
    [{ deployment_rehearsed_on: null }, /has not been rehearsed on the preview host/],
  ] as const) {
    assert.match(asked({ ...sheet, ...without }), said, JSON.stringify(without));
  }
  // With the chat, production's privacy page has a section more: re-read apart, as it stands.
  const section = (): string =>
    artefactBlockers(ready)
      .filter((line) => line.includes('privacy_chat'))
      .join('\n');
  writeFileSync(join(ready, ASK_PATH), JSON.stringify(chat));
  assert.equal(section(), '');
  writeFileSync(join(ready, STRINGS_PATH), JSON.stringify({ ...kit, 'privacy.chat.title': 'x' }));
  assert.match(section(), /section « Quand tu demandes » .* is not re-read as it stands/);
  // …and a site that asks nothing never waits for that reading.
  writeFileSync(join(ready, ASK_PATH), JSON.stringify({ mode: 'off', decided_on: '2026-12-01' }));
  assert.equal(section(), '');
  writeFileSync(join(ready, STRINGS_PATH), JSON.stringify(kit));
  // The modes of the ladder of D16.4 are no modes of the site any more.
  for (const mode of ['answer', 'select', 'on']) {
    assert.match(asked({ ...chat, mode }), /mode must be "chat" or "off"/, mode);
  }
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
  // …and production as committed is deployable: its mascot is validated on the drawing as it
  // stands, and the line of the privacy page about her colour is re-read (lot F: what the test
  // of the switch held, scripts/mascot-mode.test.ts).
  if (launch.apex === 'app') assert.deepEqual(mascotBlockers(), []);
});

void test('the preview host asks only once what comes before any question holds (lot C11)', () => {
  const ready = {
    mode: 'off',
    preview_mode: 'chat',
    model: 'mistral-small-3.1',
    bench: { sha256: 'beef', run_on: '2026-12-01' },
    gists: { corpus_version: 'decaf', sha256: 'cafe', deposited_on: '2026-12-01' },
    deployment_rehearsed_on: '2026-12-01',
    preview_legal_on: '2026-12-02',
    preview_legal_by: 'session',
  };
  const kit = { 'privacy.lead': 'x', 'privacy.chat.title': 'Quand tu demandes' };
  const launch = {
    privacy_page: { reviewed_on: '2026-12-01', sha256: 'page-as-read' },
    privacy_chat: {
      reviewed_on: '2026-12-01',
      reviewed_by: 'editor',
      sha256: privacyChatStringsHash(kit),
    },
  };
  const root = tree({
    [MANIFEST_PATH]: { meta: { corpus_version: 'decaf' } },
    [STRINGS_PATH]: kit,
    [LAUNCH_PATH]: launch,
    [ASK_PATH]: ready,
  });
  const blockers = (ask: unknown, hash = 'page-as-read'): string => {
    writeFileSync(join(root, ASK_PATH), JSON.stringify(ask));
    return previewChatBlockers(root, hash).join('\n');
  };
  assert.equal(blockers(ready), '');
  // A preview host that does not ask waits for nothing.
  assert.equal(blockers({ ...ready, preview_mode: 'off', bench: null }), '');
  assert.equal(blockers({ mode: 'off' }), '');
  // Each gate missing is named — the model first: only one whose host keeps nothing reads.
  for (const [without, said] of [
    [{ model: 'gpt-oss-120b' }, /keeps nothing of a call/],
    [{ model: 'no-such-model' }, /no model is named whose host writes that it keeps nothing/],
    [{ bench: null }, /no bench of the explanations is recorded/],
    [{ gists: null }, /no read sentence is deposited for this book/],
    [{ gists: { ...ready.gists, corpus_version: 'c0ffee' } }, /deposited for this book/],
    [{ gists: { ...ready.gists, deposited_on: null } }, /deposited for this book/],
    [{ deployment_rehearsed_on: null }, /deployment of the chat has not been rehearsed/],
    [{ preview_legal_on: 'bientôt' }, /legal file of the chat is not done for real/],
  ] as const) {
    assert.match(blockers({ ...ready, ...without }), said, JSON.stringify(without));
  }
  // The sheet without a live AI (D16.60) names no model: neither a model nor a bench is
  // waited for — and every other gate of the preview host still is.
  const sheet = { ...ready, model: null, bench: null };
  assert.equal(blockers(sheet), '');
  for (const [without, said] of [
    [{ gists: null }, /no read sentence is deposited for this book/],
    [{ deployment_rehearsed_on: null }, /deployment of the chat has not been rehearsed/],
    [{ preview_legal_on: null }, /legal file of the chat is not done for real/],
  ] as const) {
    assert.match(blockers({ ...sheet, ...without }), said, JSON.stringify(without));
  }
  // The page the agreement sends its reader to is the one that was re-read, as it stands —
  // and so is the section the chat adds to it, read apart.
  assert.match(blockers(ready, 'page-of-today'), /privacy page .* is not re-read as it stands/);
  assert.doesNotMatch(blockers(ready), /Quand tu demandes/);
  writeFileSync(
    join(root, STRINGS_PATH),
    JSON.stringify({ ...kit, 'privacy.chat.title': 'Quand tu poses une question' }),
  );
  assert.match(blockers(ready), /section « Quand tu demandes » .* is not re-read as it stands/);
  writeFileSync(join(root, STRINGS_PATH), JSON.stringify(kit));
  writeFileSync(join(root, LAUNCH_PATH), JSON.stringify({ ...launch, privacy_chat: undefined }));
  assert.match(blockers(ready), /privacy_chat/);
  // A date says a reading took place; the file says whose — the editor's, or the session's on
  // his mandate (D16.63). Neither date stands without a name, and no other name is one.
  for (const by of [undefined, 'someone', 'both']) {
    const unnamed = { ...launch, privacy_chat: { ...launch.privacy_chat, reviewed_by: by } };
    writeFileSync(join(root, LAUNCH_PATH), JSON.stringify(unnamed));
    assert.match(blockers(ready), /nothing says who re-read it .* privacy_chat\.reviewed_by/);
  }
  writeFileSync(
    join(root, LAUNCH_PATH),
    JSON.stringify({ ...launch, privacy_chat: { ...launch.privacy_chat, reviewed_by: 'session' } }),
  );
  assert.equal(blockers(ready), '');
  writeFileSync(join(root, LAUNCH_PATH), JSON.stringify(launch));
  for (const by of [undefined, 'someone']) {
    assert.match(
      blockers({ ...ready, preview_legal_by: by }),
      /legal file of the chat is dated, and nothing says by whom/,
    );
  }
  assert.equal(blockers({ ...ready, preview_legal_by: 'editor' }), '');
  // Production asking opens the preview host too — under the same gates, not around them.
  assert.match(
    blockers({ ...ready, mode: 'chat', preview_mode: 'off', preview_legal_on: null }),
    /legal file of the chat/,
  );
  // What production alone waits for is not asked of the preview: it is measured there.
  assert.doesNotMatch(blockers(ready), /forty threads|confirmed the model|every measure/);
  // The file says one of two words for the preview host, or nothing.
  writeFileSync(join(root, ASK_PATH), JSON.stringify({ ...ready, preview_mode: 'on' }));
  assert.match(artefactBlockers(root).join('\n'), /preview_mode must be "chat" or "off"/);
  rmSync(root, { recursive: true });
  // The committed file opens nothing: nothing is waited for.
  assert.deepEqual(previewChatBlockers(), []);
});
