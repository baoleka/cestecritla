/**
 * The daily allowance, as arithmetic (D7.4) — no Workers API here, so it is tested with
 * node:test. The Durable Object of budget.ts stores one row and calls these.
 *
 * Workers AI gives 10 000 neurons a day on the free plan, and answers 429 beyond: never a bill.
 * The site stops at 85 % of it — a margin for what the estimate of a request gets wrong, and
 * for the tests of the day. Past the stop a question is answered "local": the page shows what
 * it found by itself and says nothing of why (PLAN-JEU §2.6).
 *
 * The UTC day is the single source of truth for the reset: a counter stamped with yesterday's
 * day is worth zero today, whatever the alarm did.
 */

export const DAILY_ALLOWANCE = 10_000;
export const DEFAULT_HARD_STOP = 8_500;
/** No single request may reserve more than this: a bound on a bug, not on a question. */
export const MAX_RESERVATION = 400;

export interface BudgetState {
  /** UTC day, `YYYY-MM-DD`. */
  readonly day: string;
  /** Neurons reserved so far that day. */
  readonly used: number;
}

export const utcDay = (nowMs: number): string => new Date(nowMs).toISOString().slice(0, 10);

/** Epoch milliseconds of the next 00:00 UTC strictly after `nowMs`. */
export function nextUtcMidnight(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export const isValidAmount = (amount: unknown): amount is number =>
  typeof amount === 'number' && Number.isFinite(amount) && amount > 0 && amount <= MAX_RESERVATION;

/** Today's state: the stored one if it is today's, a fresh one otherwise. */
export function rollover(state: BudgetState | undefined, nowMs: number): BudgetState {
  const day = utcDay(nowMs);
  return state?.day === day ? state : { day, used: 0 };
}

export interface Reservation {
  readonly state: BudgetState;
  readonly allowed: boolean;
}

/** Reserves `amount` neurons unless that would cross the stop. Never reserves a part. */
export function reserve(
  state: BudgetState | undefined,
  amount: number,
  nowMs: number,
  hardStop: number = DEFAULT_HARD_STOP,
): Reservation {
  const today = rollover(state, nowMs);
  if (!isValidAmount(amount) || today.used + amount > hardStop) {
    return { state: today, allowed: false };
  }
  return { state: { day: today.day, used: today.used + amount }, allowed: true };
}

/**
 * Replaces what was reserved by what was really spent — less when the answer came from the
 * cache, more when the estimate was short. Never below zero, never across days.
 */
export function settle(
  state: BudgetState | undefined,
  reserved: number,
  spent: number,
  nowMs: number,
): BudgetState {
  const today = rollover(state, nowMs);
  const delta = (Number.isFinite(spent) && spent >= 0 ? spent : reserved) - reserved;
  return { day: today.day, used: Math.max(0, today.used + delta) };
}
