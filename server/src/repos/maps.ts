import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Map, CreateMapInput, UpdateMapInput } from '../types.js';

// Internal row shape (adds area_seq, which the API type omits).
interface MapRow extends Map {
  area_seq: number;
}

function toMap(row: MapRow): Map {
  const { area_seq: _area_seq, ...rest } = row;
  return rest;
}

const COLUMNS = 'id, title, tone, notes, direction, area_seq, created_at, updated_at';

export function listMaps(db: Database.Database): Map[] {
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM map ORDER BY updated_at DESC`)
    .all() as MapRow[];
  return rows.map(toMap);
}

export function getMap(db: Database.Database, id: string): Map | null {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM map WHERE id = ?`)
    .get(id) as MapRow | undefined;
  return row ? toMap(row) : null;
}

export function createMap(db: Database.Database, input: CreateMapInput): Map {
  const now = new Date().toISOString();
  const row: MapRow = {
    id: randomUUID(),
    title: input.title,
    tone: input.tone,
    notes: input.notes ?? '',
    direction: input.direction ?? 'TD',
    area_seq: 0,
    created_at: now,
    updated_at: now,
  };
  db.prepare(
    `INSERT INTO map (id, title, tone, notes, direction, area_seq, created_at, updated_at)
     VALUES (@id, @title, @tone, @notes, @direction, @area_seq, @created_at, @updated_at)`,
  ).run(row);
  return toMap(row);
}

export function updateMap(
  db: Database.Database,
  id: string,
  patch: UpdateMapInput,
): Map | null {
  const existing = db
    .prepare(`SELECT ${COLUMNS} FROM map WHERE id = ?`)
    .get(id) as MapRow | undefined;
  if (!existing) return null;

  const updated: MapRow = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.tone !== undefined ? { tone: patch.tone } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    ...(patch.direction !== undefined ? { direction: patch.direction } : {}),
    updated_at: new Date().toISOString(),
  };
  db.prepare(
    `UPDATE map
     SET title = @title, tone = @tone, notes = @notes,
         direction = @direction, updated_at = @updated_at
     WHERE id = @id`,
  ).run(updated);
  return toMap(updated);
}

export function deleteMap(db: Database.Database, id: string): boolean {
  const info = db.prepare('DELETE FROM map WHERE id = ?').run(id);
  return info.changes > 0;
}
