import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcile, planIsEmpty } from './reconcile';
import { generateMermaid } from './generate';
import { parseMermaid, type ParsedGraph } from './parse';
import type { Connection, FullMap } from '../types';

function conn(p: Partial<Connection>): Connection {
  return {
    id: 1, map_id: 'm', from_area: 'A1', to_area: 'A2', type: 'pathway',
    label: '', bidirectional: true, created_at: '', updated_at: '', ...p,
  };
}

function fullMap(over: Partial<FullMap> = {}): FullMap {
  return {
    map: { id: 'm', title: 'T', tone: 'Hijinks', notes: '', direction: 'TD', created_at: '', updated_at: '' },
    areas: [
      { id: 'A1', map_id: 'm', name: 'Hall', description: 'read-aloud', gm_notes: 'secret', treasure: 'gold', features: 'trap', created_at: '', updated_at: '' },
      { id: 'A2', map_id: 'm', name: 'Cell', description: '', gm_notes: '', treasure: '', features: '', created_at: '', updated_at: '' },
    ],
    connections: [conn({ id: 7, type: 'door', from_area: 'A1', to_area: 'A2' })],
    monsters: [],
    ...over,
  };
}

function graph(text: string): ParsedGraph {
  const r = parseMermaid(text);
  if (!r.ok) throw new Error(r.error);
  return r.graph;
}

test('regenerated text reconciles to an empty plan (no-op Apply)', () => {
  const full = fullMap();
  const plan = reconcile(full, graph(generateMermaid(full)));
  assert.equal(planIsEmpty(plan), true);
});

test('adding a node + secret-door edge creates them, no property loss (acceptance #2)', () => {
  const full = fullMap();
  const text = [
    'flowchart TD',
    'A1["A1: Hall"]',
    'A2["A2: Cell"]',
    'A3["A3: Vault"]',
    'A1 -- "door" --- A2',
    'A2 -. "(S)" .- A3',
  ].join('\n');
  const plan = reconcile(full, graph(text));
  assert.deepEqual(plan.createAreas, [{ id: 'A3', name: 'Vault' }]);
  assert.deepEqual(plan.createEdges.map((e) => [e.from, e.to, e.type]), [['A2', 'A3', 'secret door']]);
  assert.equal(plan.deleteAreaIds.length, 0);
  assert.equal(plan.deleteEdgeIds.length, 0);
  assert.equal(plan.renameAreas.length, 0); // existing names unchanged -> DB props safe
});

test('removing a node marks it for deletion (prompt handled by caller)', () => {
  const full = fullMap();
  const plan = reconcile(full, graph('flowchart TD\nA1["A1: Hall"]'));
  assert.deepEqual(plan.deleteAreaIds, ['A2']);
  // The A1<->A2 edge cascades with A2, so it is not separately deleted.
  assert.equal(plan.deleteEdgeIds.length, 0);
});

test('renaming a label updates only the name', () => {
  const full = fullMap();
  const text = generateMermaid(full).replace('A1: Hall', 'A1: Great Hall');
  const plan = reconcile(full, graph(text));
  assert.deepEqual(plan.renameAreas, [{ id: 'A1', name: 'Great Hall' }]);
  assert.equal(plan.createAreas.length, 0);
});

test('changing an edge type deletes the old edge and creates the new one', () => {
  const full = fullMap();
  const text = generateMermaid(full).replace('A1 -- "door" --- A2', 'A1 === A2');
  const plan = reconcile(full, graph(text));
  assert.deepEqual(plan.deleteEdgeIds, [7]);
  assert.deepEqual(plan.createEdges.map((e) => e.type), ['open']);
});

test('direction change is captured', () => {
  const full = fullMap();
  const text = generateMermaid(full).replace('flowchart TD', 'flowchart LR');
  assert.equal(reconcile(full, graph(text)).direction, 'LR');
});

test('seeding a new map from an empty state creates everything', () => {
  const empty = fullMap({ areas: [], connections: [] });
  const text = 'flowchart TD\nA1["Start"]\nA2["End"]\nA1 --> A2';
  const plan = reconcile(empty, graph(text));
  assert.deepEqual(plan.createAreas, [{ id: 'A1', name: 'Start' }, { id: 'A2', name: 'End' }]);
  assert.equal(plan.createEdges.length, 1);
  assert.equal(plan.createEdges[0].type, 'one-way');
});
