// Domain + API types. Per the "shared types layout (b)" decision, these are
// the source of truth on the server; the client hand-copies the few it needs
// into client/src/types.ts.

export type Tone = 'Hijinks' | 'Derring-Do' | 'Doom & Gloom';
export const TONES: readonly Tone[] = ['Hijinks', 'Derring-Do', 'Doom & Gloom'];

export type Direction = 'TD' | 'LR';
export const DIRECTIONS: readonly Direction[] = ['TD', 'LR'];

export type ConnectionType =
  | 'open'
  | 'pathway'
  | 'door'
  | 'secret door'
  | 'locked'
  | 'one-way'
  | 'custom';
export const CONNECTION_TYPES: readonly ConnectionType[] = [
  'open',
  'pathway',
  'door',
  'secret door',
  'locked',
  'one-way',
  'custom',
];

export type ClassTier = 'Goon' | 'Bruiser' | 'Champion';
export const CLASS_TIERS: readonly ClassTier[] = ['Goon', 'Bruiser', 'Champion'];

// --- Map ------------------------------------------------------------------

export interface Map {
  id: string;
  title: string;
  tone: Tone;
  notes: string;
  direction: Direction;
  created_at: string;
  updated_at: string;
}

export interface CreateMapInput {
  title: string;
  tone: Tone;
  notes?: string;
  direction?: Direction;
}

export interface UpdateMapInput {
  title?: string;
  tone?: Tone;
  notes?: string;
  direction?: Direction;
}

// --- Area (schema present now; CRUD/forms arrive in Phase 2) ---------------

export interface Area {
  id: string; // stable slug e.g. "A1"; unique within a map; the Mermaid node id
  map_id: string;
  name: string;
  description: string;
  gm_notes: string;
  treasure: string;
  features: string;
  created_at: string;
  updated_at: string;
}

// --- Connection ------------------------------------------------------------

export interface Connection {
  id: number;
  map_id: string;
  from_area: string;
  to_area: string;
  type: ConnectionType;
  label: string;
  bidirectional: boolean;
  created_at: string;
  updated_at: string;
}

// --- Monster (Land of Eem Adversary; Eem terms only — no AC/HP) ------------

export interface Monster {
  id: number;
  map_id: string;
  area_id: string;
  name: string;
  level: number | null;
  class_tier: ClassTier | null;
  courage: string; // text: number for Goons, die expr (e.g. "2d6") for others
  attack: number | null;
  defense: number | null;
  block: number | null;
  dread: string; // die expression, e.g. "1d6"
  actions: number | null;
  abilities: string;
  vulnerabilities: string;
  social: string;
  combat_tactics: string;
  defeat: string;
  victory: string;
  bestiary_ref: string;
}
