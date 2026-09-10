import { DurableObject } from "cloudflare:workers";
import {
  type BudgetDecision,
  type BudgetState,
  describe,
  nextUtcMidnight,
  release,
  reserve,
  rollover,
} from "./budget-core.ts";

type BudgetRow = Record<string, SqlStorageValue> & {
  day: string;
  used: number;
};

/**
 * Global daily neuron budget. One instance for the whole app (`getByName("global")`):
 * the coordination atom is the account-wide Workers AI allowance, so a single
 * object is the point, not an accident (soft limit 1 000 req/s per object, the
 * app needs a few hundred reservations per day).
 *
 * Storage: one SQLite row `{ day, used }`. The UTC day key decides the reset;
 * the alarm at 00:00 UTC is only there to roll the row over proactively so that
 * `status()` reads zero right after midnight even without traffic.
 */
export class NeuronBudget extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // The runtime itself awaits this before delivering any request; `void` only states that the
    // constructor cannot (the promise is not floating in the Workers sense).
    void ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(
        `CREATE TABLE IF NOT EXISTS budget (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          day TEXT NOT NULL,
          used REAL NOT NULL
        )`,
      );
      await this.ensureAlarm(Date.now());
    });
  }

  reserve(cost: number): BudgetDecision {
    const { state, decision } = reserve(this.load(), cost, Date.now());
    this.save(state);
    return decision;
  }

  release(cost: number): BudgetDecision {
    const { state, decision } = release(this.load(), cost, Date.now());
    this.save(state);
    return decision;
  }

  status(): BudgetDecision {
    return describe(rollover(this.load(), Date.now()), Date.now());
  }

  /** Lab only: puts the counter back to zero for a re-run. Not part of the app. */
  reset(): BudgetDecision {
    const now = Date.now();
    const state = rollover(undefined, now);
    this.save(state);
    return describe(state, now);
  }

  /** Reads the alarm the object holds, for the README (epoch ms or null). */
  async alarmAt(): Promise<number | null> {
    return this.ctx.storage.getAlarm();
  }

  override async alarm(): Promise<void> {
    const now = Date.now();
    this.save(rollover(this.load(), now));
    await this.ctx.storage.setAlarm(nextUtcMidnight(now));
  }

  private async ensureAlarm(nowMs: number): Promise<void> {
    const existing = await this.ctx.storage.getAlarm();
    if (existing === null) {
      await this.ctx.storage.setAlarm(nextUtcMidnight(nowMs));
    }
  }

  private load(): BudgetState | undefined {
    const row = this.ctx.storage.sql
      .exec<BudgetRow>("SELECT day, used FROM budget WHERE id = 1")
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
