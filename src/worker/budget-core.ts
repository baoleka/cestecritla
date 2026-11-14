/**
 * The allowance, as arithmetic (D7.4) — no Workers API here, so it is tested with node:test.
 * The Durable Object of budget.ts stores what these functions return, and calls them.
 *
 * Workers AI gives 10 000 neurons on the free plan, and answers 429 beyond: never a bill. The
 * site stops at 85 % of it — a margin for what the estimate of a request gets wrong, and for
 * the tests of the day. Past the stop a question is answered "local": the page shows what it
 * found by itself and says nothing of why (PLAN-JEU §2.6).
 *
 * Two things were measured on 13 and 14 November 2026 (docs/discovery/neurons-log.md), and
 * this file answers both.
 *
 * The allowance does not come back at 00:00 UTC: what was spent before and after midnight
 * counted together, and the account stayed exhausted for more than ten hours. So nothing here
 * knows a calendar day. Neurons are counted under the hour they were reserved in, and an hour
 * weighs until all of it is twenty-four hours old — for twenty-four to twenty-five hours,
 * never less: the ledger may hold a neuron too long, it never lets one go too early.
 *
 * And the ledger is not the platform: neurons are spent on the same account outside this
 * Worker, and an estimate is not a bill. When the platform itself says the allowance is used
 * up, a breaker closes — no reservation until it reopens, and the first one after that is the
 * probe: refused again, it closes the breaker again.
 */

export const DAILY_ALLOWANCE = 10_000;
export const DEFAULT_HARD_STOP = 8_500;
/** No single request may reserve more than this: a bound on a bug, not on a question. */
export const MAX_RESERVATION = 400;

export const HOUR_MS = 3_600_000;
/** How long a neuron weighs on the allowance, in hours — whatever the calendar says. */
export const WINDOW_HOURS = 24;
/** How long the model stays closed once the platform has said the allowance is used up. */
export const BREAKER_MS = 30 * 60_000;

export interface BudgetState {
  /** Neurons counted, by hour of the epoch (`hourOf`). An hour that holds nothing is absent. */
  readonly hours: ReadonlyMap<number, number>;
  /** Epoch milliseconds until which the breaker is closed; 0 when it is open. */
  readonly closedUntil: number;
}

/** Nothing counted, nothing closed: what the counter is before its first question. */
export const EMPTY: BudgetState = { hours: new Map<number, number>(), closedUntil: 0 };

/** The hour of the epoch an instant falls in: the bucket its neurons are counted under. */
export const hourOf = (nowMs: number): number => Math.floor(nowMs / HOUR_MS);

/**
 * True while neurons counted under `hour` may be less than twenty-four hours old at `nowMs`:
 * the current hour and the twenty-four before it. An hour ahead of the clock — a clock that
 * stepped back — weighs too.
 */
const weighs = (hour: number, nowMs: number): boolean => hour >= hourOf(nowMs) - WINDOW_HOURS;

export const isValidAmount = (amount: unknown): amount is number =>
  typeof amount === 'number' && Number.isFinite(amount) && amount > 0 && amount <= MAX_RESERVATION;

/** True while the breaker is closed: the platform said the allowance was used up. */
export const isClosed = (state: BudgetState, nowMs: number): boolean => nowMs < state.closedUntil;

/** Neurons that weigh on the allowance at `nowMs`: what was counted over the last 24 hours. */
export function usedAt(state: BudgetState, nowMs: number): number {
  let used = 0;
  for (const [hour, neurons] of state.hours) {
    if (weighs(hour, nowMs)) used += neurons;
  }
  return used;
}

/**
 * The state as it stands at `nowMs`, less what no longer counts: the hours that left the
 * window, and a breaker whose time has passed. The same object when there was nothing to drop.
 */
export function prune(state: BudgetState, nowMs: number): BudgetState {
  const hours = new Map([...state.hours].filter(([hour]) => weighs(hour, nowMs)));
  const closedUntil = isClosed(state, nowMs) ? state.closedUntil : 0;
  return hours.size === state.hours.size && closedUntil === state.closedUntil
    ? state
    : { hours, closedUntil };
}

function add(state: BudgetState, hour: number, neurons: number): BudgetState {
  const hours = new Map(state.hours);
  hours.set(hour, (hours.get(hour) ?? 0) + neurons);
  return { ...state, hours };
}

/**
 * Gives `neurons` back, the most recent hour first: a reservation is a few seconds old when it
 * is settled, so it sits in the current hour — or in the one before, when the hour turned in
 * between. Never below zero.
 */
function takeBack(state: BudgetState, neurons: number): BudgetState {
  const hours = new Map(state.hours);
  let left = neurons;
  for (const hour of [...hours.keys()].sort((a, b) => b - a)) {
    if (left <= 0) break;
    const held = hours.get(hour) ?? 0;
    const taken = Math.min(held, left);
    left -= taken;
    if (held > taken) hours.set(hour, held - taken);
    else hours.delete(hour);
  }
  return { ...state, hours };
}

export interface Reservation {
  readonly state: BudgetState;
  readonly allowed: boolean;
}

/**
 * Reserves `amount` neurons, unless the breaker is closed or that would cross the stop. Never
 * reserves a part.
 */
export function reserve(
  state: BudgetState,
  amount: number,
  nowMs: number,
  hardStop: number = DEFAULT_HARD_STOP,
): Reservation {
  const live = prune(state, nowMs);
  // Written so that a stop that is not a number refuses, instead of letting everything through.
  const fits = isValidAmount(amount) && usedAt(live, nowMs) + amount <= hardStop;
  if (!fits || isClosed(live, nowMs)) return { state: live, allowed: false };
  return { state: add(live, hourOf(nowMs), amount), allowed: true };
}

/**
 * Replaces what was reserved by what was really spent — less when the answer came from the
 * cache, more when the estimate was short. A cost nobody states is the reservation itself.
 */
export function settle(
  state: BudgetState,
  reserved: number,
  spent: number,
  nowMs: number,
): BudgetState {
  const live = prune(state, nowMs);
  if (!isValidAmount(reserved)) return live;
  const cost = Number.isFinite(spent) && spent >= 0 ? spent : reserved;
  if (cost > reserved) return add(live, hourOf(nowMs), cost - reserved);
  return cost < reserved ? takeBack(live, reserved - cost) : live;
}

/**
 * Gives a reservation back whole: the platform refused the call it was made for, and a call
 * that was refused is not billed.
 */
export const release = (state: BudgetState, reserved: number, nowMs: number): BudgetState =>
  settle(state, reserved, 0, nowMs);

/**
 * Closes the breaker until `until`: the platform has just said the allowance is used up. A
 * breaker already closed for longer stays as it is.
 */
export function close(state: BudgetState, until: number): BudgetState {
  if (!Number.isFinite(until) || until <= state.closedUntil) return state;
  return { ...state, closedUntil: until };
}
