/**
 * The two methods of D1 the Worker uses, on Node's own SQLite — so that the search of
 * src/worker/retrieve.ts runs here, in the bench and in the tests, exactly as it is written.
 *
 * D1 is SQLite with FTS5; so is `node:sqlite`. What differs is the wrapping: D1 is asynchronous
 * and answers `{ results }`. This file is that wrapping and nothing else.
 */
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { AskDb, AskStatement } from '../src/worker/measures.js';

class LocalStatement implements AskStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly values: readonly SQLInputValue[] = [],
  ) {}

  bind(...values: unknown[]): AskStatement {
    return new LocalStatement(this.db, this.sql, values as SQLInputValue[]);
  }

  all(): Promise<{ results: unknown[] }> {
    // Plain objects, as D1 returns them: node:sqlite rows have a null prototype.
    const rows = this.db.prepare(this.sql).all(...this.values);
    return Promise.resolve({ results: rows.map((row) => ({ ...row })) });
  }
}

export class LocalD1 implements AskDb {
  readonly db: DatabaseSync;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): AskStatement {
    return new LocalStatement(this.db, sql);
  }

  async batch(statements: AskStatement[]): Promise<{ results: unknown[] }[]> {
    const out: { results: unknown[] }[] = [];
    for (const statement of statements) {
      const { results } = await statement.all();
      out.push({ results: results ?? [] });
    }
    return out;
  }
}
