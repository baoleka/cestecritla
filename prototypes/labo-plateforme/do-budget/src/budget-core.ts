// Pure budget logic: no Workers API here so it can be unit-tested with node:test.
// The UTC day key is the single source of truth for the daily reset: a counter
// stamped with yesterday's key is worth zero today, whatever the alarm did.

export const DAILY_BUDGET = 10_000; // Workers AI free allowance, neurons per day
export const HARD_STOP_RATIO = 0.85;
export const HARD_STOP = DAILY_BUDGET * HARD_STOP_RATIO; // 8 500 neurons
export const DEFAULT_COST = 32; // ≈ one Mistral Small 3.1 question with a ~850-token preselection
export const MAX_COST = 1_000; // sanity bound on a single reservation

export interface BudgetState {
  /** UTC day key, `YYYY-MM-DD`. */
  readonly day: string;
  /** Neurons reserved so far for `day`. */
  readonly used: number;
}

export interface BudgetDecision {
  readonly allowed: boolean;
  readonly used: number;
  readonly day: string;
  readonly remaining: number;
  readonly budget: number;
  readonly hardStop: number;
  /** ISO timestamp of the next reset (00:00 UTC). */
  readonly resetAt: string;
}

export function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Epoch milliseconds of the next 00:00 UTC strictly after `nowMs`. */
export function nextUtcMidnight(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export function isValidCost(cost: unknown): cost is number {
  return typeof cost === "number" && Number.isFinite(cost) && cost > 0 && cost <= MAX_COST;
}

/** Returns the state for today: the stored one if its day key matches, a fresh one otherwise. */
export function rollover(state: BudgetState | undefined, nowMs: number): BudgetState {
  const day = utcDayKey(nowMs);
  return state !== undefined && state.day === day ? state : { day, used: 0 };
}

export function describe(state: BudgetState, nowMs: number, cost = DEFAULT_COST): BudgetDecision {
  const today = rollover(state, nowMs);
  const remaining = Math.max(0, HARD_STOP - today.used);
  return {
    allowed: today.used + cost <= HARD_STOP,
    used: today.used,
    day: today.day,
    remaining,
    budget: DAILY_BUDGET,
    hardStop: HARD_STOP,
    resetAt: new Date(nextUtcMidnight(nowMs)).toISOString(),
  };
}

export interface Transition {
  readonly state: BudgetState;
  readonly decision: BudgetDecision;
}

/** Reserves `cost` neurons if the hard stop is not crossed. Never partially reserves. */
export function reserve(state: BudgetState | undefined, cost: number, nowMs: number): Transition {
  if (!isValidCost(cost)) {
    throw new RangeError(`invalid cost: ${String(cost)}`);
  }
  const today = rollover(state, nowMs);
  if (today.used + cost > HARD_STOP) {
    return { state: today, decision: describe(today, nowMs, cost) };
  }
  const next: BudgetState = { day: today.day, used: today.used + cost };
  return { state: next, decision: { ...describe(next, nowMs, cost), allowed: true } };
}

/** Gives `cost` neurons back (an AI call that failed before billing). Never below zero, never across days. */
export function release(state: BudgetState | undefined, cost: number, nowMs: number): Transition {
  if (!isValidCost(cost)) {
    throw new RangeError(`invalid cost: ${String(cost)}`);
  }
  const today = rollover(state, nowMs);
  const next: BudgetState = { day: today.day, used: Math.max(0, today.used - cost) };
  return { state: next, decision: describe(next, nowMs) };
}
