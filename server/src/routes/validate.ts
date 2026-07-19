import {
  CONNECTION_TYPES,
  CLASS_TIERS,
  type ConnectionType,
  type ClassTier,
  type CreateMonsterInput,
} from '../types.js';

export function isConnectionType(v: unknown): v is ConnectionType {
  return typeof v === 'string' && (CONNECTION_TYPES as readonly string[]).includes(v);
}

export function isClassTier(v: unknown): v is ClassTier {
  return typeof v === 'string' && (CLASS_TIERS as readonly string[]).includes(v);
}

/** Result of a validated parse: either a value or a client-facing message. */
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const INT_FIELDS = ['level', 'attack', 'defense', 'block', 'actions'] as const;
const STR_FIELDS = [
  'name',
  'courage',
  'dread',
  'abilities',
  'vulnerabilities',
  'social',
  'combat_tactics',
  'defeat',
  'victory',
  'bestiary_ref',
] as const;

/**
 * Builds a CreateMonsterInput from a request body. Every field is optional;
 * a provided field must be the right type (int fields accept a number or
 * null, strings must be strings, class_tier must be a valid tier or null).
 */
export function parseMonsterInput(body: unknown): Parsed<CreateMonsterInput> {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'body must be an object' };
  }
  const b = body as Record<string, unknown>;
  const out: CreateMonsterInput = {};

  for (const field of INT_FIELDS) {
    if (b[field] === undefined) continue;
    const v = b[field];
    if (v === null) {
      out[field] = null;
    } else if (typeof v === 'number' && Number.isInteger(v)) {
      out[field] = v;
    } else {
      return { ok: false, error: `${field} must be an integer or null` };
    }
  }

  for (const field of STR_FIELDS) {
    if (b[field] === undefined) continue;
    if (typeof b[field] !== 'string') {
      return { ok: false, error: `${field} must be a string` };
    }
    out[field] = b[field] as string;
  }

  if (b.class_tier !== undefined) {
    if (b.class_tier === null) {
      out.class_tier = null;
    } else if (isClassTier(b.class_tier)) {
      out.class_tier = b.class_tier;
    } else {
      return { ok: false, error: `class_tier must be one of: ${CLASS_TIERS.join(', ')} or null` };
    }
  }

  return { ok: true, value: out };
}
