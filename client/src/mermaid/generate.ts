import type { Connection, FullMap } from '../types';
import {
  EDGE_MARKERS,
  LOCKED_ICON,
  lineKindForType,
  isDirected,
  type LineKind,
} from './style';

/** Mermaid labels can't contain raw quotes/newlines; normalise whitespace too. */
function sanitize(s: string): string {
  return s.replace(/"/g, "'").replace(/\s+/g, ' ').trim();
}

/** Node label doubles as the printed key index: "A1: Name" (or just "A1"). */
function nodeLabel(id: string, name: string): string {
  const clean = sanitize(name);
  return clean ? `${id}: ${clean}` : id;
}

/**
 * The text shown on an edge: the type's marker (door / (S) / (L) 🔒) plus any
 * user label. `custom` with no label falls back to the word "custom" so the
 * edge still round-trips to a custom type.
 */
export function edgeLabel(c: Connection): string {
  const parts: string[] = [];
  if (c.type === 'door') parts.push(EDGE_MARKERS.door);
  else if (c.type === 'secret door') parts.push(EDGE_MARKERS.secret);
  else if (c.type === 'locked') parts.push(`${EDGE_MARKERS.locked} ${LOCKED_ICON}`);

  const userLabel = sanitize(c.label);
  if (userLabel) parts.push(userLabel);
  else if (c.type === 'custom') parts.push('custom');

  return parts.join(' ');
}

function link(kind: LineKind, directed: boolean, hasLabel: boolean): [string, string] {
  // Returns the [open, close] tokens surrounding an optional "label".
  if (kind === 'thick') {
    return hasLabel ? ['==', directed ? '==>' : '==='] : ['', directed ? '==>' : '==='];
  }
  if (kind === 'dotted') {
    return hasLabel ? ['-.', directed ? '.->' : '.-'] : ['', directed ? '-.->' : '-.-'];
  }
  return hasLabel ? ['--', directed ? '-->' : '---'] : ['', directed ? '-->' : '---'];
}

/** Renders one connection as a Mermaid edge line (no indentation). */
export function renderEdge(c: Connection): string {
  const kind = lineKindForType(c.type);
  const directed = isDirected(c.type, c.bidirectional);
  const label = edgeLabel(c);
  const [open, close] = link(kind, directed, label !== '');
  if (label === '') {
    return `${c.from_area} ${close} ${c.to_area}`;
  }
  return `${c.from_area} ${open} "${label}" ${close} ${c.to_area}`;
}

/**
 * Generates the full Mermaid flowchart text for a map. Every area is declared
 * as a node (so isolated areas still appear), followed by the edges. The DB is
 * the source of truth; this is a pure view of it.
 */
export function generateMermaid(full: FullMap): string {
  const lines: string[] = [`flowchart ${full.map.direction}`];
  for (const a of full.areas) {
    lines.push(`  ${a.id}["${nodeLabel(a.id, a.name)}"]`);
  }
  for (const c of full.connections) {
    lines.push(`  ${renderEdge(c)}`);
  }
  return lines.join('\n');
}
