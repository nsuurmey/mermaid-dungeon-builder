import type Database from 'better-sqlite3';
import type { Area, CreateAreaInput, UpdateAreaInput } from '../types.js';

const COLUMNS =
  'id, map_id, name, description, gm_notes, treasure, features, created_at, updated_at';

export function listAreas(db: Database.Database, mapId: string): Area[] {
  return db
    .prepare(`SELECT ${COLUMNS} FROM area WHERE map_id = ? ORDER BY created_at ASC`)
    .all(mapId) as Area[];
}

export function getArea(
  db: Database.Database,
  mapId: string,
  id: string,
): Area | null {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM area WHERE map_id = ? AND id = ?`)
    .get(mapId, id) as Area | undefined;
  return row ?? null;
}

/**
 * Creates a new area, minting the next stable slug (A1, A2, …) from the map's
 * monotonic `area_seq` counter. Slugs are never reused: deleting the highest
 * area does not roll the counter back. Returns null if the map doesn't exist.
 */
export function createArea(
  db: Database.Database,
  mapId: string,
  input: CreateAreaInput = {},
): Area | null {
  const tx = db.transaction((): Area | null => {
    const map = db
      .prepare('SELECT area_seq FROM map WHERE id = ?')
      .get(mapId) as { area_seq: number } | undefined;
    if (!map) return null;

    const seq = map.area_seq + 1;
    const now = new Date().toISOString();
    const area: Area = {
      id: `A${seq}`,
      map_id: mapId,
      name: input.name ?? '',
      description: input.description ?? '',
      gm_notes: input.gm_notes ?? '',
      treasure: input.treasure ?? '',
      features: input.features ?? '',
      created_at: now,
      updated_at: now,
    };
    db.prepare('UPDATE map SET area_seq = ?, updated_at = ? WHERE id = ?').run(
      seq,
      now,
      mapId,
    );
    db.prepare(
      `INSERT INTO area (${COLUMNS})
       VALUES (@id, @map_id, @name, @description, @gm_notes, @treasure, @features, @created_at, @updated_at)`,
    ).run(area);
    return area;
  });
  return tx();
}

export function updateArea(
  db: Database.Database,
  mapId: string,
  id: string,
  patch: UpdateAreaInput,
): Area | null {
  const existing = getArea(db, mapId, id);
  if (!existing) return null;

  const updated: Area = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.gm_notes !== undefined ? { gm_notes: patch.gm_notes } : {}),
    ...(patch.treasure !== undefined ? { treasure: patch.treasure } : {}),
    ...(patch.features !== undefined ? { features: patch.features } : {}),
    updated_at: new Date().toISOString(),
  };
  db.prepare(
    `UPDATE area
     SET name = @name, description = @description, gm_notes = @gm_notes,
         treasure = @treasure, features = @features, updated_at = @updated_at
     WHERE map_id = @map_id AND id = @id`,
  ).run(updated);
  return updated;
}

export function deleteArea(
  db: Database.Database,
  mapId: string,
  id: string,
): boolean {
  // Connections and monsters referencing this area cascade via FK.
  const info = db
    .prepare('DELETE FROM area WHERE map_id = ? AND id = ?')
    .run(mapId, id);
  return info.changes > 0;
}
