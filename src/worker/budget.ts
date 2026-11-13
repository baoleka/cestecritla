/**
 * The daily allowance, kept (D7.4): one Durable Object for the whole site — the thing to
 * coordinate is one account-wide counter, so one object is the point, not an accident.
 *
 * It stores one row, `{ day, used }`: two numbers about the site, nothing about anyone. No
 * question, no address, no time finer than the day.
 */
import { DurableObject } from 'cloudflare:workers';
import {
  DEFAULT_HARD_STOP,
  nextUtcMidnight,
  reserve,
  rollover,
  settle,
  type BudgetState,
} from './budget-core.ts';

type BudgetRow = Record<string, SqlStorageValue> & { day: string; used: number };

export class NeuronBudget extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // The runtime awaits this before delivering any request: the table exists before it is read.
    void ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(
        `CREATE TABLE IF NOT EXISTS budget (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          day TEXT NOT NULL,
          used REAL NOT NULL
        )`,
      );
      if ((await this.ctx.storage.getAlarm()) === null) {
        await this.ctx.storage.setAlarm(nextUtcMidnight(Date.now()));
      }
    });
  }

  /** True when `amount` neurons could be set aside for a question. */
  reserve(amount: number, hardStop: number = DEFAULT_HARD_STOP): boolean {
    const result = reserve(this.load(), amount, Date.now(), hardStop);
    this.save(result.state);
    return result.allowed;
  }

  /** What the question really cost, once known. */
  settle(reserved: number, spent: number): void {
    this.save(settle(this.load(), reserved, spent, Date.now()));
  }

  /** Neurons counted today — what /exactitude and the runbook read. */
  used(): number {
    return rollover(this.load(), Date.now()).used;
  }

  /** At 00:00 UTC the row rolls over by itself, so that the day starts at zero even unasked. */
  override async alarm(): Promise<void> {
    const now = Date.now();
    this.save(rollover(this.load(), now));
    await this.ctx.storage.setAlarm(nextUtcMidnight(now));
  }

  private load(): BudgetState | undefined {
    const row = this.ctx.storage.sql
      .exec<BudgetRow>('SELECT day, used FROM budget WHERE id = 1')
      .toArray()[0];
    return row === undefined ? undefined : { day: row.day, used: row.used };
  }

  private save(state: BudgetState): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO budget (id, day, used) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET day = excluded.day, used = excluded.used`,
      state.day,
      state.used,
    );
  }
}
