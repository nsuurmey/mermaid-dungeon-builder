import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMermaid, renderEdge } from './generate';
import type { Connection, FullMap } from '../types';

function conn(partial: Partial<Connection>): Connection {
  return {
    id: 1,
    map_id: 'm',
    from_area: 'A1',
    to_area: 'A2',
    type: 'pathway',
    label: '',
    bidirectional: true,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

test('edge rendering per type (bidirectional)', () => {
  assert.equal(renderEdge(conn({ type: 'open' })), 'A1 === A2');
  assert.equal(renderEdge(conn({ type: 'pathway' })), 'A1 --- A2');
  assert.equal(renderEdge(conn({ type: 'door' })), 'A1 -- "door" --- A2');
  assert.equal(renderEdge(conn({ type: 'secret door' })), 'A1 -. "(S)" .- A2');
  assert.equal(renderEdge(conn({ type: 'locked' })), 'A1 -- "(L) 🔒" --- A2');
  assert.equal(renderEdge(conn({ type: 'custom', label: 'rope bridge' })), 'A1 -- "rope bridge" --- A2');
  assert.equal(renderEdge(conn({ type: 'custom', label: '' })), 'A1 -- "custom" --- A2');
});

test('one-way type is always directed', () => {
  assert.equal(renderEdge(conn({ type: 'one-way' })), 'A1 --> A2');
});

test('bidirectional:false makes any type directed', () => {
  assert.equal(renderEdge(conn({ type: 'pathway', bidirectional: false })), 'A1 --> A2');
  assert.equal(renderEdge(conn({ type: 'open', bidirectional: false })), 'A1 ==> A2');
  assert.equal(
    renderEdge(conn({ type: 'secret door', bidirectional: false })),
    'A1 -. "(S)" .-> A2',
  );
  assert.equal(
    renderEdge(conn({ type: 'door', bidirectional: false })),
    'A1 -- "door" --> A2',
  );
});

test('user label is appended to a marker', () => {
  assert.equal(
    renderEdge(conn({ type: 'door', label: 'oak, banded' })),
    'A1 -- "door oak, banded" --- A2',
  );
});

test('labels are sanitised (quotes, newlines collapsed)', () => {
  assert.equal(
    renderEdge(conn({ type: 'custom', label: 'a "quoted"\nlabel' })),
    "A1 -- \"a 'quoted' label\" --- A2",
  );
});

test('generateMermaid emits direction, node labels, and edges', () => {
  const full: FullMap = {
    map: {
      id: 'm',
      title: 'T',
      tone: 'Hijinks',
      notes: '',
      direction: 'LR',
      created_at: '',
      updated_at: '',
    },
    areas: [
      { id: 'A1', map_id: 'm', name: 'The Entrance', description: '', gm_notes: '', treasure: '', features: '', created_at: '', updated_at: '' },
      { id: 'A2', map_id: 'm', name: '', description: '', gm_notes: '', treasure: '', features: '', created_at: '', updated_at: '' },
    ],
    connections: [conn({ type: 'door' })],
    monsters: [],
  };
  const text = generateMermaid(full);
  assert.equal(
    text,
    ['flowchart LR', '  A1["A1: The Entrance"]', '  A2["A2"]', '  A1 -- "door" --- A2'].join('\n'),
  );
});
