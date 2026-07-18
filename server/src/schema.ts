import type Database from 'better-sqlite3';

/**
 * Schema version. Bump this and add a migration step whenever the schema
 * changes. Migrations run in a transaction on boot, gated by PRAGMA
 * user_version, so applying them is idempotent.
 */
export const CURRENT_VERSION = 1;

const V1 = `
CREATE TABLE map (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  tone        TEXT NOT NULL CHECK (tone IN ('Hijinks','Derring-Do','Doom & Gloom')),
  notes       TEXT NOT NULL DEFAULT '',
  direction   TEXT NOT NULL DEFAULT 'TD' CHECK (direction IN ('TD','LR')),
  -- Monotonic high-water mark for minting Area slugs (A1, A2, ...). Never
  -- decremented, so deleted slugs are not reused. Minting logic lands in Phase 2.
  area_seq    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE area (
  id          TEXT NOT NULL,           -- slug, unique within its map; the Mermaid node id
  map_id      TEXT NOT NULL REFERENCES map(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  gm_notes    TEXT NOT NULL DEFAULT '',
  treasure    TEXT NOT NULL DEFAULT '',
  features    TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (map_id, id)
);

CREATE TABLE connection (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  map_id        TEXT NOT NULL REFERENCES map(id) ON DELETE CASCADE,
  from_area     TEXT NOT NULL,
  to_area       TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN
                  ('open','pathway','door','secret door','locked','one-way','custom')),
  label         TEXT NOT NULL DEFAULT '',
  bidirectional INTEGER NOT NULL DEFAULT 1 CHECK (bidirectional IN (0,1)),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  FOREIGN KEY (map_id, from_area) REFERENCES area(map_id, id) ON DELETE CASCADE,
  FOREIGN KEY (map_id, to_area)   REFERENCES area(map_id, id) ON DELETE CASCADE
);

CREATE TABLE monster (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  map_id          TEXT NOT NULL REFERENCES map(id) ON DELETE CASCADE,
  area_id         TEXT NOT NULL,
  name            TEXT NOT NULL DEFAULT '',
  level           INTEGER,
  class_tier      TEXT CHECK (class_tier IN ('Goon','Bruiser','Champion')),
  courage         TEXT NOT NULL DEFAULT '',
  attack          INTEGER,
  defense         INTEGER,
  block           INTEGER,
  dread           TEXT NOT NULL DEFAULT '',
  actions         INTEGER,
  abilities       TEXT NOT NULL DEFAULT '',
  vulnerabilities TEXT NOT NULL DEFAULT '',
  social          TEXT NOT NULL DEFAULT '',
  combat_tactics  TEXT NOT NULL DEFAULT '',
  defeat          TEXT NOT NULL DEFAULT '',
  victory         TEXT NOT NULL DEFAULT '',
  bestiary_ref    TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (map_id, area_id) REFERENCES area(map_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_area_map        ON area(map_id);
CREATE INDEX idx_connection_map  ON connection(map_id);
CREATE INDEX idx_monster_area    ON monster(map_id, area_id);
`;

/** Ordered migration steps. Index i upgrades the DB from version i to i+1. */
const MIGRATIONS: ((db: Database.Database) => void)[] = [
  (db) => db.exec(V1),
];

/** Applies any pending migrations. Safe to call on every boot. */
export function migrate(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  if (current >= CURRENT_VERSION) return;
  const run = db.transaction(() => {
    for (let v = current; v < CURRENT_VERSION; v++) {
      MIGRATIONS[v](db);
    }
    db.pragma(`user_version = ${CURRENT_VERSION}`);
  });
  run();
}
