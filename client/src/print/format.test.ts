import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMonsterStatLine, signed, byAreaId } from './format';
import type { Area, Monster } from '../types';

function monster(p: Partial<Monster>): Monster {
  return {
    id: 1, map_id: 'm', area_id: 'A1', name: '', level: null, class_tier: null,
    courage: '', attack: null, defense: null, block: null, dread: '', actions: null,
    abilities: '', vulnerabilities: '', social: '', combat_tactics: '', defeat: '',
    victory: '', bestiary_ref: '', ...p,
  };
}

test('signed formats modifiers', () => {
  assert.equal(signed(1), '+1');
  assert.equal(signed(-1), '-1');
  assert.equal(signed(0), '0');
});

test('full stat line matches the PRD example exactly', () => {
  const m = monster({
    name: 'Mire Squix', level: 2, class_tier: 'Goon', courage: '2',
    attack: 1, defense: -1, block: 0, dread: '1d6', actions: 1,
    vulnerabilities: 'bright light',
  });
  assert.equal(
    formatMonsterStatLine(m),
    'Mire Squix (Goon, Lv 2) — Courage 2 · Atk +1 · Def -1 · Block 0 · Dread 1d6 · Actions 1 — Vulnerable: bright light',
  );
});

test('missing fields are omitted, not blank', () => {
  assert.equal(formatMonsterStatLine(monster({ name: 'Blob' })), 'Blob');
  assert.equal(
    formatMonsterStatLine(monster({ name: 'Rat', class_tier: 'Goon', dread: '1d6' })),
    'Rat (Goon) — Dread 1d6',
  );
  assert.equal(formatMonsterStatLine(monster({})), '(unnamed)');
});

test('areas sort numerically by slug', () => {
  const a = (id: string): Area => ({
    id, map_id: 'm', name: '', description: '', gm_notes: '', treasure: '',
    features: '', created_at: '', updated_at: '',
  });
  const sorted = [a('A10'), a('A2'), a('A1')].sort(byAreaId).map((x) => x.id);
  assert.deepEqual(sorted, ['A1', 'A2', 'A10']);
});
