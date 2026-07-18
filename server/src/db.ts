import fs from 'node:fs';
import Database from 'better-sqlite3';
import { DATA_DIR, DB_PATH } from './env.js';
import { migrate } from './schema.js';

let db: Database.Database | null = null;

/**
 * Returns the shared SQLite connection, opening it (and creating DATA_DIR)
 * on first use, then applying any pending migrations.
 */
export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = openDatabase(DB_PATH);
  return db;
}

/**
 * Opens a database at an explicit path (or ':memory:'), sets pragmas, and
 * migrates it. Used by getDb() and by tests that want an isolated DB.
 */
export function openDatabase(path: string): Database.Database {
  const conn = new Database(path);
  conn.pragma('journal_mode = WAL');
  conn.pragma('foreign_keys = ON');
  migrate(conn);
  return conn;
}
