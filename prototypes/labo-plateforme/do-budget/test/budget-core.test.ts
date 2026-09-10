import assert from "node:assert/strict";
import { describe as suite, it } from "node:test";

import {
  DEFAULT_COST,
  HARD_STOP,
  describe,
  isValidCost,
  nextUtcMidnight,
  release,
  reserve,
  rollover,
  utcDayKey,
} from "../src/budget-core.ts";

const T = (iso: string): number => Date.parse(iso);

suite("utcDayKey", () => {
  it("is the UTC date, whatever the local timezone", () => {
    assert.equal(utcDayKey(T("2026-09-09T23:59:59.999Z")), "2026-09-09");
    assert.equal(utcDayKey(T("2026-09-10T00:00:00.000Z")), "2026-09-10");
    // 01:30 in Paris (UTC+2) on the 10th is still the 9th in UTC.
    assert.equal(utcDayKey(T("2026-09-10T01:30:00+02:00")), "2026-09-09");
  });
});

suite("nextUtcMidnight", () => {
  it("is the next 00:00 UTC, strictly after now", () => {
    assert.equal(nextUtcMidnight(T("2026-09-09T12:00:00Z")), T("2026-09-10T00:00:00Z"));
    assert.equal(nextUtcMidnight(T("2026-09-09T23:59:59.999Z")), T("2026-09-10T00:00:00Z"));
    // exactly at midnight, the next reset is the following midnight
    assert.equal(nextUtcMidnight(T("2026-09-10T00:00:00Z")), T("2026-09-11T00:00:00Z"));
  });

  it("crosses month, year and leap-day boundaries", () => {
    assert.equal(nextUtcMidnight(T("2026-09-30T18:00:00Z")), T("2026-10-01T00:00:00Z"));
    assert.equal(nextUtcMidnight(T("2026-12-31T23:00:00Z")), T("2027-01-01T00:00:00Z"));
    assert.equal(nextUtcMidnight(T("2028-02-28T10:00:00Z")), T("2028-02-29T00:00:00Z"));
    assert.equal(nextUtcMidnight(T("2028-02-29T10:00:00Z")), T("2028-03-01T00:00:00Z"));
  });
});

suite("rollover", () => {
  it("keeps today's counter and zeroes yesterday's", () => {
    const state = { day: "2026-09-09", used: 8_480 };
    assert.deepEqual(rollover(state, T("2026-09-09T23:59:59.999Z")), state);
    assert.deepEqual(rollover(state, T("2026-09-10T00:00:00.000Z")), { day: "2026-09-10", used: 0 });
    assert.deepEqual(rollover(undefined, T("2026-09-10T00:00:00.000Z")), { day: "2026-09-10", used: 0 });
  });
});

suite("reserve", () => {
  const noon = T("2026-09-09T12:00:00Z");

  it("allows exactly up to the hard stop (8 500), never beyond", () => {
    const atStop = reserve({ day: "2026-09-09", used: HARD_STOP - DEFAULT_COST }, DEFAULT_COST, noon);
    assert.equal(atStop.decision.allowed, true);
    assert.equal(atStop.state.used, HARD_STOP);
    assert.equal(atStop.decision.remaining, 0);

    const over = reserve(atStop.state, 1, noon);
    assert.equal(over.decision.allowed, false);
    assert.equal(over.state.used, HARD_STOP, "a refused reservation does not consume anything");
  });

  it("allows 265 questions at 32 neurons, refuses the 266th", () => {
    let state = rollover(undefined, noon);
    let allowed = 0;
    for (let i = 0; i < 300; i += 1) {
      const t = reserve(state, DEFAULT_COST, noon);
      state = t.state;
      if (t.decision.allowed) {
        allowed += 1;
      }
    }
    assert.equal(allowed, 265);
    assert.equal(state.used, 265 * DEFAULT_COST); // 8 480
  });

  it("resets when the day key changes, without any alarm", () => {
    const exhausted = { day: "2026-09-09", used: HARD_STOP };
    assert.equal(reserve(exhausted, DEFAULT_COST, T("2026-09-09T23:59:59.999Z")).decision.allowed, false);
    const afterMidnight = reserve(exhausted, DEFAULT_COST, T("2026-09-10T00:00:00.000Z"));
    assert.equal(afterMidnight.decision.allowed, true);
    assert.deepEqual(afterMidnight.state, { day: "2026-09-10", used: DEFAULT_COST });
    assert.equal(afterMidnight.decision.resetAt, "2026-09-11T00:00:00.000Z");
  });

  it("rejects invalid costs", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1_001]) {
      assert.equal(isValidCost(bad), false);
      assert.throws(() => reserve(undefined, bad, noon), RangeError);
    }
    assert.equal(isValidCost(0.6163), true);
  });
});

suite("release", () => {
  const noon = T("2026-09-09T12:00:00Z");

  it("gives neurons back, floored at zero", () => {
    assert.equal(release({ day: "2026-09-09", used: 64 }, DEFAULT_COST, noon).state.used, 32);
    assert.equal(release({ day: "2026-09-09", used: 10 }, DEFAULT_COST, noon).state.used, 0);
  });

  it("never credits a previous day", () => {
    const t = release({ day: "2026-09-08", used: 500 }, DEFAULT_COST, noon);
    assert.deepEqual(t.state, { day: "2026-09-09", used: 0 });
  });
});

suite("describe", () => {
  it("reports the hard stop and the next reset", () => {
    const d = describe({ day: "2026-09-09", used: 100 }, T("2026-09-09T12:00:00Z"));
    assert.equal(d.budget, 10_000);
    assert.equal(d.hardStop, 8_500);
    assert.equal(d.remaining, 8_400);
    assert.equal(d.allowed, true);
    assert.equal(d.resetAt, "2026-09-10T00:00:00.000Z");
  });
});
