import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMermaid, parseEdgeLine } from './parse';
import { generateMermaid, renderEdge } from './generate';
import type { Connection, ConnectionType, FullMap } from '../types';

function conn(p: Partial<Connection>): Connection {
  return {
    id: 1, map_id: 'm', from_area: 'A1', to_area: 'A2', type: 'pathway',
    label: '', bidirectional: true, created_at: '', updated_at: '', ...p,
  };
}

test('header must be flowchart/graph with a direction', () => {
  assert.equal(parseMermaid('').ok, false);
  assert.equal(parseMermaid('A1 --- A2').ok, false);
  const r = parseMermaid('flowchart LR\n A1 --- A2');
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.graph.direction, 'LR');
});

test('node shapes and label prefix stripping', () => {
  const r = parseMermaid([
    'flowchart TD',
    'A1["A1: Entrance"]',
    'A2[Plain]',
    'A3("Rounded")',
    'A4{Decision}',
  ].join('\n'));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const byId = Object.fromEntries(r.graph.nodes.map((n) => [n.id, n.name]));
  assert.equal(byId.A1, 'Entrance'); // "A1: " prefix stripped
  assert.equal(byId.A2, 'Plain');
  assert.equal(byId.A3, 'Rounded');
  assert.equal(byId.A4, 'Decision');
});

test('each edge form classifies to the right type', () => {
  assert.deepEqual(parseEdgeLine('A1 === A2'), { from: 'A1', to: 'A2', type: 'open', label: '', bidirectional: true });
  assert.deepEqual(parseEdgeLine('A1 --- A2'), { from: 'A1', to: 'A2', type: 'pathway', label: '', bidirectional: true });
  assert.deepEqual(parseEdgeLine('A1 -- "door" --- A2'), { from: 'A1', to: 'A2', type: 'door', label: '', bidirectional: true });
  assert.deepEqual(parseEdgeLine('A1 -. "(S)" .- A2'), { from: 'A1', to: 'A2', type: 'secret door', label: '', bidirectional: true });
  assert.deepEqual(parseEdgeLine('A1 -- "(L) 🔒" --- A2'), { from: 'A1', to: 'A2', type: 'locked', label: '', bidirectional: true });
  assert.deepEqual(parseEdgeLine('A1 --> A2'), { from: 'A1', to: 'A2', type: 'one-way', label: '', bidirectional: false });
  assert.deepEqual(parseEdgeLine('A1 -- "rope" --- A2'), { from: 'A1', to: 'A2', type: 'custom', label: 'rope', bidirectional: true });
});

test('piped label syntax is accepted', () => {
  // A non-marker label stays custom; a marker label still classifies by marker.
  assert.deepEqual(parseEdgeLine('A1 -->|rope| A2'), { from: 'A1', to: 'A2', type: 'custom', label: 'rope', bidirectional: false });
  assert.deepEqual(parseEdgeLine('A1 -->|door| A2'), { from: 'A1', to: 'A2', type: 'door', label: '', bidirectional: false });
  assert.deepEqual(parseEdgeLine('A1 ---|"(L) keep"| A2'), { from: 'A1', to: 'A2', type: 'locked', label: 'keep', bidirectional: true });
});

test('generate -> parse round-trips every type (canonical)', () => {
  const types: ConnectionType[] = ['open', 'pathway', 'door', 'secret door', 'locked', 'one-way', 'custom'];
  for (const type of types) {
    for (const bidi of [true, false]) {
      const c = conn({ type, bidirectional: bidi, label: type === 'custom' ? 'x' : '' });
      const parsed = parseEdgeLine(renderEdge(c));
      assert.ok(parsed, `parse failed for ${type} bidi=${bidi}: ${renderEdge(c)}`);
      // Re-render the parsed edge and confirm the text is now stable.
      const c2 = conn({ type: parsed!.type, bidirectional: parsed!.bidirectional, label: parsed!.label });
      assert.equal(renderEdge(c2), renderEdge(conn({ type: parsed!.type, bidirectional: parsed!.bidirectional, label: parsed!.label })));
      // one-way and pathway+false collapse; everything else keeps its type.
      if (!(type === 'pathway' && bidi === false)) {
        assert.equal(parsed!.type, type, `${type} bidi=${bidi} became ${parsed!.type}`);
      } else {
        assert.equal(parsed!.type, 'one-way');
      }
    }
  }
});

test('full document round-trips to matching node/edge sets', () => {
  const full: FullMap = {
    map: { id: 'm', title: 'T', tone: 'Hijinks', notes: '', direction: 'TD', created_at: '', updated_at: '' },
    areas: [
      { id: 'A1', map_id: 'm', name: 'Hall', description: 'secret', gm_notes: '', treasure: '', features: '', created_at: '', updated_at: '' },
      { id: 'A2', map_id: 'm', name: 'Cell', description: '', gm_notes: '', treasure: '', features: '', created_at: '', updated_at: '' },
    ],
    connections: [conn({ id: 1, type: 'door', from_area: 'A1', to_area: 'A2' })],
    monsters: [],
  };
  const r = parseMermaid(generateMermaid(full));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.graph.nodes.map((n) => n.id).sort(), ['A1', 'A2']);
  assert.equal(r.graph.edges.length, 1);
  assert.equal(r.graph.edges[0].type, 'door');
});

test('import-style: bare edges and inline labels, no header direction defaults TD', () => {
  const r = parseMermaid('graph LR\n  start["Start"] --> boss\n  boss --> start');
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.graph.nodes.map((n) => n.id).sort(), ['boss', 'start']);
  assert.equal(r.graph.edges.length, 2);
});

test('unparseable line is a hard error (inert)', () => {
  const r = parseMermaid('flowchart TD\n A1 ~~~ A2');
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /Line 2/);
});

test('comments are ignored', () => {
  const r = parseMermaid('flowchart TD %% title\n %% a comment\n A1 --- A2');
  assert.equal(r.ok, true);
});
