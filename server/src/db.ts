import fs from 'node:fs';
import Database from 'better-sqlite3';
import { DATA_DIR, DB_PATH } from './env.js';

let db: Database.Database | null = null;

/**
 * Returns the shared SQLite connection, opening it (and creating DATA_DIR)
 * on first use. Proves the persistent volume is writable at boot.
 *
 * Schema/migrations arrive in Phase 1 — this only establishes the connection.
 */
export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const conn = new Database(DB_PATH);
  conn.pragma('journal_mode = WAL');
  conn.pragma('foreign_keys = ON');
  db = conn;
  return db;
}
