import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../db.js';
import { createMap } from './maps.js';
import { listAreas, createArea, createAreaWithId, updateArea, deleteArea, getArea } from './areas.js';
import { createConnection, listConnections } from './connections.js';
import { createMonster, listMonstersForMap } from './monsters.js';

function setup() {
  const db = openDatabase(':memory:');
  const map = createMap(db, { title: 'Test', tone: 'Hijinks' });
  return { db, mapId: map.id };
}

test('slug minting increments A1, A2, A3', () => {
  const { db, mapId } = setup();
  const a = createArea(db, mapId);
  const b = createArea(db, mapId);
  const c = createArea(db, mapId);
  assert.deepEqual([a?.id, b?.id, c?.id], ['A1', 'A2', 'A3']);
});

test('slugs are NEVER reused after deletion (the flag-3 behavior)', () => {
  const { db, mapId } = setup();
  createArea(db, mapId); // A1
  createArea(db, mapId); // A2
  const c = createArea(db, mapId); // A3
  // Delete the highest slug...
  assert.equal(deleteArea(db, mapId, c!.id), true);
  // ...the next area is A4, not a recycled A3.
  const next = createArea(db, mapId);
  assert.equal(next?.id, 'A4');
  assert.deepEqual(listAreas(db, mapId).map((x) => x.id), ['A1', 'A2', 'A4']);
});

test('createArea returns null for an unknown map', () => {
  const { db } = setup();
  assert.equal(createArea(db, 'no-such-map'), null);
});

test('updateArea patches only provided fields', () => {
  const { db, mapId } = setup();
  const a = createArea(db, mapId, { name: 'Hall', description: 'echoing' })!;
  const updated = updateArea(db, mapId, a.id, { name: 'Great Hall' });
  assert.equal(updated?.name, 'Great Hall');
  assert.equal(updated?.description, 'echoing');
});

test('deleting an area cascades its connections and monsters', () => {
  const { db, mapId } = setup();
  const a = createArea(db, mapId)!;
  const b = createArea(db, mapId)!;
  createConnection(db, mapId, { from_area: a.id, to_area: b.id, type: 'pathway' });
  createMonster(db, mapId, a.id, { name: 'Mire Squix' });
  assert.equal(listConnections(db, mapId).length, 1);
  assert.equal(listMonstersForMap(db, mapId).length, 1);

  deleteArea(db, mapId, a.id);
  assert.equal(listConnections(db, mapId).length, 0, 'connection should cascade');
  assert.equal(listMonstersForMap(db, mapId).length, 0, 'monster should cascade');
  assert.equal(getArea(db, mapId, b.id)?.id, b.id, 'other area survives');
});

test('createAreaWithId honors an explicit slug and reports conflicts', () => {
  const { db, mapId } = setup();
  const a = createAreaWithId(db, mapId, 'A5', { name: 'Vault' });
  assert.notEqual(a, 'no-map');
  assert.notEqual(a, 'conflict');
  assert.equal(typeof a === 'object' ? a.id : null, 'A5');
  // Re-using the same slug conflicts.
  assert.equal(createAreaWithId(db, mapId, 'A5'), 'conflict');
  assert.equal(createAreaWithId(db, 'no-map', 'A1'), 'no-map');
});

test('createAreaWithId advances area_seq so minted slugs never collide', () => {
  const { db, mapId } = setup();
  createAreaWithId(db, mapId, 'A5'); // jump the high-water mark to 5
  const next = createArea(db, mapId); // minted slug must clear it
  assert.equal(next?.id, 'A6');
});

test('createConnection rejects endpoints outside the map', () => {
  const { db, mapId } = setup();
  const a = createArea(db, mapId)!;
  assert.equal(
    createConnection(db, mapId, { from_area: a.id, to_area: 'A99', type: 'door' }),
    null,
  );
});

test('connection bidirectional round-trips as a boolean', () => {
  const { db, mapId } = setup();
  const a = createArea(db, mapId)!;
  const b = createArea(db, mapId)!;
  const conn = createConnection(db, mapId, {
    from_area: a.id,
    to_area: b.id,
    type: 'one-way',
    bidirectional: false,
  });
  assert.equal(conn?.bidirectional, false);
  assert.equal(listConnections(db, mapId)[0].bidirectional, false);
});
