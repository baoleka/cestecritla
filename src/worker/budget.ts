/**
 * The allowance, kept (D7.4): one Durable Object for the whole site — the thing to coordinate
 * is one account-wide counter, so one object is the point, not an accident.
 *
 * It stores numbers about the site, and nothing about anyone: how many neurons were counted in
 * each of the last hours, one row an hour; and, once the platform has said the allowance is
 * used up, the instant the model may be tried again. No question, no address, no time finer
 * than the hour but that one instant. Nothing is kept for its own sake: a row goes the first
 * time anything is reserved, settled or closed after its hour is twenty-four hours old; the
 * instant, the first time after it has passed.
 *
 * The arithmetic is budget-core.ts; this file is its memory. Every method reads the rows,
 * computes, and writes what changed without waiting in between: the object takes one call at a
 * time, so a reservation is whole or it is not.
 */
import { DurableObject } from 'cloudflare:workers';
import {
  BREAKER_MS,
  DEFAULT_HARD_STOP,
  close,
  prune,
  release,
  reserve,
  settle,
  usedAt,
  type BudgetState,
} from './budget-core.ts';

type HourRow = Record<string, SqlStorageValue> & { hour: number; used: number };
type BreakerRow = Record<string, SqlStorageValue> & { closed_until: number };

export class NeuronBudget extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // The runtime awaits this before delivering any request: the tables exist before they are read.
    void ctx.blockConcurrencyWhile(async () => {
      const { sql } = this.ctx.storage;
      sql.exec(
        `CREATE TABLE IF NOT EXISTS ledger (
          hour INTEGER PRIMARY KEY,
          used REAL NOT NULL
        )`,
      );
      sql.exec(
        `CREATE TABLE IF NOT EXISTS breaker (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          closed_until INTEGER NOT NULL
        )`,
      );
      // Until 14 November 2026 the counter was one row for the UTC day, put back to zero by an
      // alarm at midnight. The allowance knows no midnight: the row goes, and its alarm with it.
      sql.exec('DROP TABLE IF EXISTS budget');
      await this.ctx.storage.deleteAlarm();
    });
  }

  /** True when `amount` neurons could be set aside for a question. */
  reserve(amount: number, hardStop: number = DEFAULT_HARD_STOP): boolean {
    const before = this.load();
    const { state, allowed } = reserve(before, amount, Date.now(), hardStop);
    this.save(before, state);
    return allowed;
  }

  /** What the question really cost, once known. */
  settle(reserved: number, spent: number): void {
    const before = this.load();
    this.save(before, settle(before, reserved, spent, Date.now()));
  }

  /** The platform refused the call: nothing was billed, the reservation is given back whole. */
  release(reserved: number): void {
    const before = this.load();
    this.save(before, release(before, reserved, Date.now()));
  }

  /** The platform says the allowance is used up: no reservation for the next thirty minutes. */
  close(): void {
    const before = this.load();
    const now = Date.now();
    this.save(before, close(prune(before, now), now + BREAKER_MS));
  }

  /** Neurons counted over the last twenty-four hours — what the bench reads. */
  used(): number {
    return usedAt(this.load(), Date.now());
  }

  private load(): BudgetState {
    const { sql } = this.ctx.storage;
    const hours = new Map<number, number>();
    for (const row of sql.exec<HourRow>('SELECT hour, used FROM ledger').toArray()) {
      hours.set(row.hour, row.used);
    }
    const breaker = sql
      .exec<BreakerRow>('SELECT closed_until FROM breaker WHERE id = 1')
      .toArray()[0];
    return { hours, closedUntil: breaker?.closed_until ?? 0 };
  }

  /** Writes what a call changed, and only that: one row for a reservation, as a rule. */
  private save(before: BudgetState, after: BudgetState): void {
    if (after === before) return;
    const { sql } = this.ctx.storage;
    for (const hour of before.hours.keys()) {
      if (!after.hours.has(hour)) sql.exec('DELETE FROM ledger WHERE hour = ?', hour);
    }
    for (const [hour, used] of after.hours) {
      if (before.hours.get(hour) === used) continue;
      sql.exec(
        `INSERT INTO ledger (hour, used) VALUES (?, ?)
         ON CONFLICT(hour) DO UPDATE SET used = excluded.used`,
        hour,
        used,
      );
    }
    if (after.closedUntil === before.closedUntil) return;
    if (after.closedUntil === 0) {
      sql.exec('DELETE FROM breaker');
    } else {
      sql.exec(
        `INSERT INTO breaker (id, closed_until) VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET closed_until = excluded.closed_until`,
        after.closedUntil,
      );
    }
  }
}
