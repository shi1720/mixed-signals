import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
/** Executes the real application SQL on SQLite, preserving transactional batch
 * semantics. This is a deterministic test adapter, not a production database. */
export class SqliteD1 {
  readonly sqlite = new DatabaseSync(':memory:');
  now = Math.floor(Date.now() / 1000);
  rounds = 0;
  queries = 0;
  constructor() {
    this.sqlite.function('unixepoch', () => this.now);
    this.sqlite.function('round', (value) => {
      this.rounds++;
      return value === null ? null : Math.round(Number(value));
    });
    for (const file of readdirSync(resolve('drizzle'))
      .filter((f) => f.endsWith('.sql'))
      .sort())
      this.sqlite.exec(readFileSync(resolve('drizzle', file), 'utf8'));
  }
  prepare(sql: string) {
    return new Statement(this, sql);
  }
  async batch(statements: Statement[]) {
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const out = statements.map((s) => s.execute());
      this.sqlite.exec('COMMIT');
      return out;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
  binding() {
    return this as unknown as D1Database;
  }
  close() {
    this.sqlite.close();
  }
}
class Statement {
  values: unknown[] = [];
  constructor(
    readonly db: SqliteD1,
    readonly sql: string,
  ) {}
  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }
  execute() {
    this.db.queries++;
    const stmt = this.db.sqlite.prepare(this.sql);
    const results = stmt.all(...(this.values as (string | number | null)[]));
    return {
      success: true,
      results,
      meta: {
        changes: Number(
          this.db.sqlite.prepare('SELECT changes() as n').get()?.n ?? 0,
        ),
      },
    };
  }
  async first<T>(column?: string): Promise<T | null> {
    const rows = this.execute().results;
    return (
      rows.length ? (column ? rows[0][column] : rows[0]) : null
    ) as T | null;
  }
  async all<T>() {
    return this.execute() as unknown as D1Result<T>;
  }
  async run() {
    return this.execute();
  }
}
