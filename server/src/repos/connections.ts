import type Database from 'better-sqlite3';
import type {
  Connection,
  CreateConnectionInput,
  UpdateConnectionInput,
} from '../types.js';

const COLUMNS =
  'id, map_id, from_area, to_area, type, label, bidirectional, created_at, updated_at';

interface ConnectionRow extends Omit<Connection, 'bidirectional'> {
  bidirectional: number;
}

function toConnection(row: ConnectionRow): Connection {
  return { ...row, bidirectional: row.bidirectional === 1 };
}

export function listConnections(db: Database.Database, mapId: string): Connection[] {
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM connection WHERE map_id = ? ORDER BY id ASC`)
    .all(mapId) as ConnectionRow[];
  return rows.map(toConnection);
}

export function getConnection(
  db: Database.Database,
  mapId: string,
  id: number,
): Connection | null {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM connection WHERE map_id = ? AND id = ?`)
    .get(mapId, id) as ConnectionRow | undefined;
  return row ? toConnection(row) : null;
}

function areaExists(db: Database.Database, mapId: string, areaId: string): boolean {
  return !!db
    .prepare('SELECT 1 FROM area WHERE map_id = ? AND id = ?')
    .get(mapId, areaId);
}

/**
 * Creates a connection. Returns null if the map or either endpoint area does
 * not exist (so the route can 400/404 instead of hitting a raw FK error).
 */
export function createConnection(
  db: Database.Database,
  mapId: string,
  input: CreateConnectionInput,
): Connection | null {
  if (!areaExists(db, mapId, input.from_area)) return null;
  if (!areaExists(db, mapId, input.to_area)) return null;

  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO connection (map_id, from_area, to_area, type, label, bidirectional, created_at, updated_at)
       VALUES (@map_id, @from_area, @to_area, @type, @label, @bidirectional, @created_at, @updated_at)`,
    )
    .run({
      map_id: mapId,
      from_area: input.from_area,
      to_area: input.to_area,
      type: input.type,
      label: input.label ?? '',
      bidirectional: input.bidirectional === false ? 0 : 1,
      created_at: now,
      updated_at: now,
    });
  return getConnection(db, mapId, Number(info.lastInsertRowid));
}

export function updateConnection(
  db: Database.Database,
  mapId: string,
  id: number,
  patch: UpdateConnectionInput,
): Connection | null {
  const existing = getConnection(db, mapId, id);
  if (!existing) return null;
  if (patch.from_area !== undefined && !areaExists(db, mapId, patch.from_area)) {
    return null;
  }
  if (patch.to_area !== undefined && !areaExists(db, mapId, patch.to_area)) {
    return null;
  }

  const updated: Connection = {
    ...existing,
    ...(patch.from_area !== undefined ? { from_area: patch.from_area } : {}),
    ...(patch.to_area !== undefined ? { to_area: patch.to_area } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    ...(patch.label !== undefined ? { label: patch.label } : {}),
    ...(patch.bidirectional !== undefined ? { bidirectional: patch.bidirectional } : {}),
    updated_at: new Date().toISOString(),
  };
  db.prepare(
    `UPDATE connection
     SET from_area = @from_area, to_area = @to_area, type = @type,
         label = @label, bidirectional = @bidirectional, updated_at = @updated_at
     WHERE map_id = @map_id AND id = @id`,
  ).run({ ...updated, bidirectional: updated.bidirectional ? 1 : 0 });
  return updated;
}

export function deleteConnection(
  db: Database.Database,
  mapId: string,
  id: number,
): boolean {
  const info = db
    .prepare('DELETE FROM connection WHERE map_id = ? AND id = ?')
    .run(mapId, id);
  return info.changes > 0;
}
