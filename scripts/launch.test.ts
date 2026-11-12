/**
 * The launch gate (D15.5, lot F2): the app replaces the holding page when every condition is
 * met, and the gate names the ones that are not.
 * Run: npx tsx --test scripts/launch.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { HOLDING_PAGES, deployRefusal } from './build-mode.js';
import {
  LAUNCH_PATH,
  launchBlockers,
  pendingReviews,
  type LaunchFile,
  type LaunchInputs,
} from './launch.js';

const READY: LaunchInputs = {
  launch: {
    apex: 'app',
    planned_on: '2026-12-15',
    lcen_declared_on: '2026-12-01',
    contact_mailbox_ready_on: '2026-12-02',
    note_fr: '',
  },
  policyValidated: true,
  pendingReviews: [],
};

void test('when everything is in place, nothing blocks the launch', () => {
  assert.deepEqual(launchBlockers(READY), []);
  const pages = ['index.html', 's/p1c1-s01/index.html'];
  assert.equal(
    deployRefusal('apex', 'app', pages, {
      policyValidated: true,
      dryRun: false,
      launchBlockers: [],
    }),
    null,
  );
});

void test('each missing condition blocks, and is named', () => {
  const cases: [Partial<LaunchInputs> | { launch: Partial<LaunchFile> }, RegExp][] = [
    [{ launch: { apex: 'holding' } }, /launch has not been decided/],
    [{ policyValidated: false }, /citation policy has not been validated/],
    [{ launch: { lcen_declared_on: null } }, /LCEN declaration .* \(P0\.5\)/],
    [{ launch: { contact_mailbox_ready_on: null } }, /contact address .* \(P0\.8\)/],
    [{ launch: { lcen_declared_on: 'bientôt' } }, /LCEN declaration/],
    [
      { pendingReviews: ['riposte:rip-01', 'mot:ecocide'] },
      /2 of our own texts .* riposte:rip-01, mot:ecocide/,
    ],
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

void test('a blocked launch is refused at the apex, with its reasons, dry run or not', () => {
  const blockers = launchBlockers({
    ...READY,
    launch: { ...READY.launch, lcen_declared_on: null },
  });
  const pages = ['index.html', 's/p1c1-s01/index.html'];
  for (const dryRun of [false, true]) {
    const refusal = deployRefusal('apex', 'app', pages, {
      policyValidated: true,
      dryRun,
      launchBlockers: blockers,
    });
    assert.match(String(refusal), /holding page until launch day/);
    assert.match(String(refusal), /P0\.5/);
  }
  // The holding page is never blocked by any of this: it is also the withdrawal gesture.
  assert.equal(
    deployRefusal('apex', 'holding', [...HOLDING_PAGES], {
      policyValidated: false,
      dryRun: false,
      launchBlockers: blockers,
    }),
    null,
  );
});

void test('the committed launch file is well formed', () => {
  const launch = JSON.parse(readFileSync(LAUNCH_PATH, 'utf8')) as LaunchFile;
  assert.ok(['holding', 'app'].includes(launch.apex));
  assert.match(launch.planned_on, /^\d{4}-\d{2}-\d{2}$/);
  for (const date of [launch.lcen_declared_on, launch.contact_mailbox_ready_on]) {
    assert.ok(date === null || /^\d{4}-\d{2}-\d{2}$/.test(date), String(date));
  }
  // An app at the apex with a text nobody re-read is exactly what D0.27 forbids.
  if (launch.apex === 'app') assert.deepEqual(pendingReviews(), []);
});
