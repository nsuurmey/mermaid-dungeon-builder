// Hand-copied subset of server/src/types.ts (shared-types layout "b").
// Keep in sync with the server when these shapes change.

export type Tone = 'Hijinks' | 'Derring-Do' | 'Doom & Gloom';
export const TONES: readonly Tone[] = ['Hijinks', 'Derring-Do', 'Doom & Gloom'];

export type Direction = 'TD' | 'LR';

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

export interface Area {
  id: string;
  map_id: string;
  name: string;
  description: string;
  gm_notes: string;
  treasure: string;
  features: string;
  created_at: string;
  updated_at: string;
}

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

export interface Monster {
  id: number;
  map_id: string;
  area_id: string;
  name: string;
  level: number | null;
  class_tier: ClassTier | null;
  courage: string;
  attack: number | null;
  defense: number | null;
  block: number | null;
  dread: string;
  actions: number | null;
  abilities: string;
  vulnerabilities: string;
  social: string;
  combat_tactics: string;
  defeat: string;
  victory: string;
  bestiary_ref: string;
}

export interface FullMap {
  map: Map;
  areas: Area[];
  connections: Connection[];
  monsters: Monster[];
}
