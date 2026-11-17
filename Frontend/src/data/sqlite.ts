import type { Database } from '@sqlite.org/sqlite-wasm';

let db: Database;

/** Called once by the worker when the database is open. */
export const useDatabase = (d: Database) => {
  db = d;
};
export const database = () => db;

export const rows = <T>(sql: string, bind: unknown[] = []): T[] =>
  db.exec({ sql, bind: bind as never, rowMode: 'object', returnValue: 'resultRows' }) as T[];

export const run = (sql: string, bind: unknown[] = []) => {
  db.exec({ sql, bind: bind as never });
};

/**
 * Which user rows the person using the app may see. Guest work (no account) is visible to
 * everyone. A signed in account sees its own work and guest work. Someone who is signed out sees
 * guest work only: an account's work stays on the device but hidden until that account signs in
 * again, so a shared or borrowed computer never shows it to the next person.
 * `sync_cur` is a one row temporary table set by `setAccount`.
 */
export const VISIBLE = `(account_id IS NULL OR account_id = (SELECT account_id FROM sync_cur))`;
