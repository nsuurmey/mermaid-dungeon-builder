import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../db.js';
import {
  listMaps,
  getMap,
  createMap,
  updateMap,
  deleteMap,
} from './maps.js';

function freshDb() {
  return openDatabase(':memory:');
}

test('createMap sets defaults and returns the map', () => {
  const db = freshDb();
  const map = createMap(db, { title: 'Mushroom Cellar', tone: 'Hijinks' });
  assert.equal(map.title, 'Mushroom Cellar');
  assert.equal(map.tone, 'Hijinks');
  assert.equal(map.notes, '');
  assert.equal(map.direction, 'TD');
  assert.ok(map.id);
  assert.equal(map.created_at, map.updated_at);
  // area_seq is internal and must not leak into the API shape.
  assert.equal((map as unknown as Record<string, unknown>).area_seq, undefined);
});

test('getMap returns null for a missing id', () => {
  const db = freshDb();
  assert.equal(getMap(db, 'nope'), null);
});

test('listMaps orders by most recently updated first', () => {
  const db = freshDb();
  const a = createMap(db, { title: 'A', tone: 'Hijinks' });
  const b = createMap(db, { title: 'B', tone: 'Doom & Gloom' });
  // Touch A so its updated_at moves ahead of B.
  const bumped = updateMap(db, a.id, { notes: 'edited' });
  assert.ok(bumped);
  const ids = listMaps(db).map((m) => m.id);
  assert.deepEqual(ids, [a.id, b.id]);
});

test('updateMap applies a partial patch and leaves other fields intact', () => {
  const db = freshDb();
  const map = createMap(db, { title: 'Old', tone: 'Hijinks', notes: 'keep' });
  const updated = updateMap(db, map.id, { title: 'New', direction: 'LR' });
  assert.ok(updated);
  assert.equal(updated.title, 'New');
  assert.equal(updated.direction, 'LR');
  assert.equal(updated.notes, 'keep');
  assert.equal(updated.tone, 'Hijinks');
});

test('updateMap returns null for a missing id', () => {
  const db = freshDb();
  assert.equal(updateMap(db, 'nope', { title: 'x' }), null);
});

test('deleteMap removes the map and reports success', () => {
  const db = freshDb();
  const map = createMap(db, { title: 'Doomed', tone: 'Doom & Gloom' });
  assert.equal(deleteMap(db, map.id), true);
  assert.equal(getMap(db, map.id), null);
  assert.equal(deleteMap(db, map.id), false);
});
