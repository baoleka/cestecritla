/**
 * Boundary tests for the electoral-silence helper (L49, D0.24, D5.8 rule 7, T9).
 *
 * Every expected instant below is written twice on purpose: as the Paris wall-clock rule of
 * 11-conformite.md ("vendredi 00:00 Paris → dimanche 20:00 Paris") and as the UTC value it must resolve
 * to in April/May 2027 (CEST, UTC+2). If a decree moves a date, change `PRESIDENTIAL_2027` and these
 * literals together.
 *
 * Run: npx tsx --test scripts/silence.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  FROZEN_KEY_PREFIXES,
  MAX_CLOCK_DRIFT_MS,
  PRESIDENTIAL_2027,
  addDays,
  effectiveDate,
  formatReopenTimeFr,
  isFrozenKey,
  parisOffsetMs,
  parisToUtc,
  registrationDeadline,
  silenceWindows,
  type ElectionCalendar,
} from './silence.js';

const at = (iso: string): Date => new Date(iso);

/** The four bounds of the two L49 windows, to the second (see the tests above). */
const FOUR_BOUNDS = [
  '2027-04-15T22:00:00Z',
  '2027-04-18T17:59:59Z',
  '2027-04-29T22:00:00Z',
  '2027-05-02T17:59:59Z',
] as const;

void test('Europe/Paris offsets: CEST in April/May 2027, CET in January (DST never hard-coded)', () => {
  assert.equal(parisOffsetMs(at('2027-04-16T00:00:00Z')), 2 * 3600 * 1000);
  assert.equal(parisOffsetMs(at('2027-01-10T00:00:00Z')), 1 * 3600 * 1000);
  // DST switch of 2027: last Sunday of March (28 March) at 02:00 CET → 03:00 CEST.
  assert.equal(parisOffsetMs(at('2027-03-28T00:59:59Z')), 1 * 3600 * 1000);
  assert.equal(parisOffsetMs(at('2027-03-28T01:00:00Z')), 2 * 3600 * 1000);
});

void test('parisToUtc converts wall-clock Paris times', () => {
  assert.equal(parisToUtc('2027-04-16', 0, 0).toISOString(), '2027-04-15T22:00:00.000Z');
  assert.equal(parisToUtc('2027-04-18', 20, 0).toISOString(), '2027-04-18T18:00:00.000Z');
  assert.equal(parisToUtc('2027-01-10', 0, 0).toISOString(), '2027-01-09T23:00:00.000Z');
  assert.throws(() => parisToUtc('16/04/2027'));
});

void test('addDays is pure calendar arithmetic', () => {
  assert.equal(addDays('2027-04-18', -2), '2027-04-16');
  assert.equal(addDays('2027-05-02', -2), '2027-04-30');
  assert.equal(addDays('2027-03-01', -1), '2027-02-28');
});

void test('the two 2027 windows: Friday 00:00 Paris → Sunday 20:00 Paris, in UTC', () => {
  const windows = silenceWindows(PRESIDENTIAL_2027);
  assert.equal(windows.length, 2);
  assert.deepEqual(
    windows.map((w) => [w.id, w.startUtc.toISOString(), w.endUtc.toISOString()]),
    [
      ['round1', '2027-04-15T22:00:00.000Z', '2027-04-18T18:00:00.000Z'],
      ['round2', '2027-04-29T22:00:00.000Z', '2027-05-02T18:00:00.000Z'],
    ],
  );
  // The metropolitan polling days are Sundays and the overseas days the Saturdays before.
  for (const round of PRESIDENTIAL_2027.rounds) {
    assert.equal(
      new Date(`${round.electionDate}T12:00:00Z`).getUTCDay(),
      0,
      `${round.id} is a Sunday`,
    );
    assert.equal(addDays(round.electionDate, -1), round.overseasSaturday);
  }
});

void test('today (session date) and the launch window are open', () => {
  const now = effectiveDate(at('2026-09-09T18:00:00Z'));
  assert.equal(now.silence, false);
  assert.equal(now.phase, 'before');
  assert.equal(now.day, '2026-09-09');
  assert.equal(now.reopenUtc, null);
  assert.equal(now.nextFreezeUtc?.toISOString(), '2027-04-15T22:00:00.000Z');
  assert.equal(now.tomorrowFrozen, false);
  assert.equal(now.override, 'auto');
});

void test('round 1: bounds to the second', () => {
  const justBefore = effectiveDate(at('2027-04-15T21:59:59Z'));
  assert.equal(justBefore.silence, false);
  assert.equal(justBefore.phase, 'before');
  assert.equal(justBefore.day, '2027-04-15');

  const start = effectiveDate(at('2027-04-15T22:00:00Z'));
  assert.equal(start.silence, true);
  assert.equal(start.phase, 'round1');
  assert.equal(start.day, '2027-04-15', 'draw frozen on the last day before the freeze');
  assert.equal(start.reopenUtc?.toISOString(), '2027-04-18T18:00:00.000Z');

  const saturdayParis = effectiveDate(at('2027-04-16T22:00:00Z')); // Saturday 00:00 Paris = L49 strict start
  assert.equal(saturdayParis.silence, true);
  assert.equal(saturdayParis.day, '2027-04-15');

  const sundayNoon = effectiveDate(at('2027-04-18T10:00:00Z'));
  assert.equal(sundayNoon.silence, true);
  assert.equal(sundayNoon.day, '2027-04-15');

  const lastSecond = effectiveDate(at('2027-04-18T17:59:59Z'));
  assert.equal(lastSecond.silence, true);
  assert.equal(lastSecond.phase, 'round1');

  const reopen = effectiveDate(at('2027-04-18T18:00:00Z'));
  assert.equal(reopen.silence, false);
  assert.equal(reopen.phase, 'between');
  assert.equal(reopen.day, '2027-04-18');
  assert.equal(reopen.reopenUtc, null);
  assert.equal(reopen.nextFreezeUtc?.toISOString(), '2027-04-29T22:00:00.000Z');
});

void test('round 2: bounds to the second', () => {
  assert.equal(effectiveDate(at('2027-04-29T21:59:59Z')).silence, false);
  assert.equal(effectiveDate(at('2027-04-29T21:59:59Z')).phase, 'between');

  const start = effectiveDate(at('2027-04-29T22:00:00Z'));
  assert.equal(start.silence, true);
  assert.equal(start.phase, 'round2');
  assert.equal(start.day, '2027-04-29');
  assert.equal(start.reopenUtc?.toISOString(), '2027-05-02T18:00:00.000Z');

  assert.equal(effectiveDate(at('2027-05-02T17:59:59Z')).silence, true);

  const after = effectiveDate(at('2027-05-02T18:00:00Z'));
  assert.equal(after.silence, false);
  assert.equal(after.phase, 'after');
  assert.equal(after.day, '2027-05-02');
  assert.equal(after.nextFreezeUtc, null);
});

void test('Saturday voters overseas are covered by the conservative window', () => {
  // Friday 00:00 in Guadeloupe (UTC−4) = Friday 04:00 UTC; Friday 00:00 in Tahiti (UTC−10) = Friday 10:00 UTC:
  // both are after the Friday 00:00 Paris start (Thursday 22:00 UTC), so the freeze is already on.
  assert.equal(effectiveDate(at('2027-04-16T04:00:00Z')).silence, true);
  assert.equal(effectiveDate(at('2027-04-16T10:00:00Z')).silence, true);
  // Saturday 17 April 2027, 08:00 in Cayenne (UTC−3) = 11:00 UTC: polling day overseas, frozen.
  assert.equal(effectiveDate(at('2027-04-17T11:00:00Z')).silence, true);
  // Same check for the second round.
  assert.equal(effectiveDate(at('2027-04-30T10:00:00Z')).silence, true);
  assert.equal(effectiveDate(at('2027-05-01T11:00:00Z')).silence, true);
});

void test('"Celle de demain" is hidden from the Thursday before each freeze', () => {
  assert.equal(effectiveDate(at('2027-04-14T10:00:00Z')).tomorrowFrozen, false);
  assert.equal(effectiveDate(at('2027-04-15T10:00:00Z')).tomorrowFrozen, true);
  assert.equal(effectiveDate(at('2027-04-17T10:00:00Z')).tomorrowFrozen, true);
  // Sunday afternoon of round 1: tomorrow (Monday) is a normal day again.
  assert.equal(effectiveDate(at('2027-04-18T17:00:00Z')).tomorrowFrozen, false);
  assert.equal(effectiveDate(at('2027-04-19T10:00:00Z')).tomorrowFrozen, false);
});

void test('the frozen draw day is stable across a whole window (no new message during the freeze)', () => {
  const samples = [
    '2027-04-15T22:00:00Z',
    '2027-04-16T12:00:00Z',
    '2027-04-17T23:59:59Z',
    '2027-04-18T17:59:59Z',
  ];
  const days = new Set(samples.map((s) => effectiveDate(at(s)).day));
  assert.deepEqual([...days], ['2027-04-15']);
});

void test('flags.json override (ex-KV, D12.8): on freezes now, off never freezes, auto follows the calendar', () => {
  const inWindow = at('2027-04-17T12:00:00Z');
  const outside = at('2027-03-01T12:00:00Z');

  const forcedOn = effectiveDate(outside, { override: 'on' });
  assert.equal(forcedOn.silence, true);
  assert.equal(forcedOn.phase, 'before', 'phase still describes the calendar');
  assert.equal(forcedOn.override, 'on');
  assert.equal(forcedOn.tomorrowFrozen, true);

  const forcedOff = effectiveDate(inWindow, { override: 'off' });
  assert.equal(forcedOff.silence, false);
  assert.equal(forcedOff.day, '2027-04-17');
  assert.equal(forcedOff.reopenUtc, null);

  assert.equal(effectiveDate(inWindow, { override: 'auto' }).silence, true);
});

void test('a moved date only needs a calendar change (decree of convocation)', () => {
  const moved: ElectionCalendar = {
    ...PRESIDENTIAL_2027,
    status: 'VÉRIFIÉ',
    rounds: [
      { id: 'round1', electionDate: '2027-04-11', overseasSaturday: '2027-04-10' },
      { id: 'round2', electionDate: '2027-04-25', overseasSaturday: '2027-04-24' },
    ],
  };
  const windows = silenceWindows(moved);
  assert.equal(windows[0]?.startUtc.toISOString(), '2027-04-08T22:00:00.000Z');
  assert.equal(windows[1]?.endUtc.toISOString(), '2027-04-25T18:00:00.000Z');
  assert.equal(effectiveDate(at('2027-04-16T12:00:00Z'), { calendar: moved }).silence, false);
});

void test('reopen time renders in Paris wall-clock French', () => {
  assert.equal(formatReopenTimeFr(at('2027-04-18T18:00:00Z')), 'dimanche 18 avril, 20 h');
  assert.equal(formatReopenTimeFr(at('2027-05-02T18:00:00Z')), 'dimanche 2 mai, 20 h');
});

void test('invalid input is rejected', () => {
  assert.throws(() => effectiveDate(new Date('not a date')));
  assert.throws(() => effectiveDate(at('2027-03-01T12:00:00Z'), { serverDate: new Date('nope') }));
});

// --- Added 2026-09-10 (red panel T12) ---------------------------------------------------------------
// In v1/v2 there is no server answer left to arbitrate the hour: the only source of time for the L49
// freeze is the visitor's phone clock, and a plain calendar check defaults to OPEN, not FROZEN.

void test('clock drift beyond 5 min fails CLOSED (+3 days and -3 days), and is reported', () => {
  const reference = at('2026-11-10T12:00:00Z'); // far outside any window: the app is open
  assert.equal(effectiveDate(reference, { serverDate: reference }).silence, false);

  for (const days of [3, -3]) {
    const device = new Date(reference.getTime() + days * 24 * 3600 * 1000);
    const drifted = effectiveDate(device, { serverDate: reference });
    assert.equal(drifted.clockTrusted, false, `drift ${String(days)} d must not be trusted`);
    assert.equal(drifted.driftMs, days * 24 * 3600 * 1000);
    assert.equal(drifted.silence, true, `drift ${String(days)} d must freeze`);
    assert.equal(drifted.tomorrowFrozen, true);
    // The draw day is pinned to the trusted reference, never to the device clock.
    assert.equal(drifted.day, '2026-11-10');
  }

  // Just inside the tolerance: nothing changes.
  const nearly = new Date(reference.getTime() + MAX_CLOCK_DRIFT_MS);
  const ok = effectiveDate(nearly, { serverDate: reference });
  assert.equal(ok.clockTrusted, true);
  assert.equal(ok.silence, false);

  // No trusted time source at all: the drift is unknown and said so, the calendar still applies.
  const blind = effectiveDate(reference);
  assert.equal(blind.clockTrusted, false);
  assert.equal(blind.driftMs, null);
  assert.equal(blind.silence, false);
});

void test('at the four bounds, no cta.* key is rendered (L49 2°, D9.19 extended)', () => {
  const kit = JSON.parse(readFileSync(new URL('../design/strings.json', import.meta.url), 'utf8')) as Record<
    string,
    unknown
  >;
  const ctaKeys = Object.keys(kit).filter((key) => key.startsWith('cta.'));
  assert.ok(ctaKeys.length >= 4, 'the kit must still carry the militant calls to action');

  for (const bound of FOUR_BOUNDS) {
    const state = effectiveDate(at(bound));
    assert.equal(state.silence, true, `${bound} must be inside a freeze`);
    for (const key of ctaKeys) {
      assert.equal(isFrozenKey(key, state), true, `${key} must be frozen at ${bound}`);
    }
    // Reading is never frozen: that is the whole point of the partial freeze (D0.24).
    assert.equal(isFrozenKey('section.next_in_book', state), false, 'reading stays open');
    assert.equal(isFrozenKey('share.button', state), true, 'sharing is frozen');
  }

  // Outside a freeze nothing is withheld.
  const open = effectiveDate(at('2026-11-10T12:00:00Z'));
  assert.equal(open.silence, false);
  for (const key of ctaKeys) assert.equal(isFrozenKey(key, open), false);
  assert.ok(FROZEN_KEY_PREFIXES.includes('cta.'));
});

void test('the registration deadline is computed, never written by hand (D9.9)', () => {
  // Sixth Friday before Sunday 18 April 2027 = Friday 12 March 2027 (11-conformite §11).
  assert.equal(registrationDeadline(), '2027-03-12');
  assert.equal(registrationDeadline(PRESIDENTIAL_2027), '2027-03-12');
  assert.equal(new Date(`${registrationDeadline()}T00:00:00Z`).getUTCDay(), 5, 'must be a Friday');

  // A decree that moves the election moves the deadline, with no string to edit.
  const moved: ElectionCalendar = {
    ...PRESIDENTIAL_2027,
    status: 'VÉRIFIÉ',
    rounds: [
      { id: 'round1', electionDate: '2027-04-11', overseasSaturday: '2027-04-10' },
      { id: 'round2', electionDate: '2027-04-25', overseasSaturday: '2027-04-24' },
    ],
  };
  assert.equal(registrationDeadline(moved), '2027-03-05');
  assert.equal(addDays(registrationDeadline(moved), 35 + 2), '2027-04-11');
});
