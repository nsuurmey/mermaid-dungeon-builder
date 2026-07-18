import type Database from 'better-sqlite3';
import type { Monster, CreateMonsterInput, UpdateMonsterInput } from '../types.js';

const COLUMNS = `id, map_id, area_id, name, level, class_tier, courage, attack,
  defense, block, dread, actions, abilities, vulnerabilities, social,
  combat_tactics, defeat, victory, bestiary_ref`;

function fromInput(input: CreateMonsterInput): Omit<Monster, 'id' | 'map_id' | 'area_id'> {
  return {
    name: input.name ?? '',
    level: input.level ?? null,
    class_tier: input.class_tier ?? null,
    courage: input.courage ?? '',
    attack: input.attack ?? null,
    defense: input.defense ?? null,
    block: input.block ?? null,
    dread: input.dread ?? '',
    actions: input.actions ?? null,
    abilities: input.abilities ?? '',
    vulnerabilities: input.vulnerabilities ?? '',
    social: input.social ?? '',
    combat_tactics: input.combat_tactics ?? '',
    defeat: input.defeat ?? '',
    victory: input.victory ?? '',
    bestiary_ref: input.bestiary_ref ?? '',
  };
}

export function listMonstersForMap(db: Database.Database, mapId: string): Monster[] {
  return db
    .prepare(`SELECT ${COLUMNS} FROM monster WHERE map_id = ? ORDER BY id ASC`)
    .all(mapId) as Monster[];
}

export function getMonster(
  db: Database.Database,
  mapId: string,
  id: number,
): Monster | null {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM monster WHERE map_id = ? AND id = ?`)
    .get(mapId, id) as Monster | undefined;
  return row ?? null;
}

function areaExists(db: Database.Database, mapId: string, areaId: string): boolean {
  return !!db
    .prepare('SELECT 1 FROM area WHERE map_id = ? AND id = ?')
    .get(mapId, areaId);
}

/** Returns null if the area doesn't exist in this map. */
export function createMonster(
  db: Database.Database,
  mapId: string,
  areaId: string,
  input: CreateMonsterInput = {},
): Monster | null {
  if (!areaExists(db, mapId, areaId)) return null;
  const row = { map_id: mapId, area_id: areaId, ...fromInput(input) };
  const info = db
    .prepare(
      `INSERT INTO monster (map_id, area_id, name, level, class_tier, courage,
         attack, defense, block, dread, actions, abilities, vulnerabilities,
         social, combat_tactics, defeat, victory, bestiary_ref)
       VALUES (@map_id, @area_id, @name, @level, @class_tier, @courage, @attack,
         @defense, @block, @dread, @actions, @abilities, @vulnerabilities,
         @social, @combat_tactics, @defeat, @victory, @bestiary_ref)`,
    )
    .run(row);
  return getMonster(db, mapId, Number(info.lastInsertRowid));
}

export function updateMonster(
  db: Database.Database,
  mapId: string,
  id: number,
  patch: UpdateMonsterInput,
): Monster | null {
  const existing = getMonster(db, mapId, id);
  if (!existing) return null;

  // Merge only the provided keys; undefined leaves the field untouched.
  const merged: Monster = { ...existing };
  for (const key of Object.keys(patch) as (keyof UpdateMonsterInput)[]) {
    const value = patch[key];
    if (value !== undefined) {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }
  db.prepare(
    `UPDATE monster SET
       name = @name, level = @level, class_tier = @class_tier, courage = @courage,
       attack = @attack, defense = @defense, block = @block, dread = @dread,
       actions = @actions, abilities = @abilities, vulnerabilities = @vulnerabilities,
       social = @social, combat_tactics = @combat_tactics, defeat = @defeat,
       victory = @victory, bestiary_ref = @bestiary_ref
     WHERE map_id = @map_id AND id = @id`,
  ).run(merged);
  return merged;
}

export function deleteMonster(
  db: Database.Database,
  mapId: string,
  id: number,
): boolean {
  const info = db
    .prepare('DELETE FROM monster WHERE map_id = ? AND id = ?')
    .run(mapId, id);
  return info.changes > 0;
}
