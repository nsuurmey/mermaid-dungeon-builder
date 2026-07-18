// Hand-copied subset of server/src/types.ts (shared-types layout "b").
// Keep in sync with the server when these shapes change.

export type Tone = 'Hijinks' | 'Derring-Do' | 'Doom & Gloom';
export const TONES: readonly Tone[] = ['Hijinks', 'Derring-Do', 'Doom & Gloom'];

export type Direction = 'TD' | 'LR';

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
