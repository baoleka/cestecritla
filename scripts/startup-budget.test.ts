/**
 * The startup budget reads what the profile spent outside `(idle)` (scripts/startup-budget.ts;
 * review 13, G7).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STARTUP_BUDGET_MS, activeMs } from './startup-budget.js';

void test('the active time of a startup profile leaves the idle samples out', () => {
  const profile = {
    nodes: [
      { id: 1, callFrame: { functionName: '(idle)' } },
      { id: 2, callFrame: { functionName: 'main' } },
      { id: 3, callFrame: { functionName: '(program)' } },
    ],
    samples: [1, 2, 3, 2, 1],
    timeDeltas: [5000, 12000, 3000, 8000, 900000],
  };
  assert.equal(activeMs(profile), 23);
  assert.ok(STARTUP_BUDGET_MS < 1000, 'under the limit of Cloudflare, on purpose');
});
