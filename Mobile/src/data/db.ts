import { MIGRATIONS } from '@selah/domain';
import * as SQLite from 'expo-sqlite';

let opened: Promise<SQLite.SQLiteDatabase> | null = null;

/** The one database on this device. Every screen reads and writes through it, never around it. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  opened ??= open();
  return opened;
}

async function open() {
  const db = await SQLite.openDatabaseAsync('selah.db');
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

/**
 * Runs the shared migrations (packages/domain/src/schema.ts), the same list the web app runs, so both
 * apps have one schema. PRAGMA user_version counts how many have been applied. Append only.
 */
async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let i = current; i < MIGRATIONS.length; i++) {
    const sql = MIGRATIONS[i]!;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}
