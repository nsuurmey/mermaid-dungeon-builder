import type { ConnectionType, Direction } from '../types';
import { EDGE_MARKERS, LOCKED_ICON, type LineKind } from './style';

// Constrained-subset parser for the Mermaid flowchart forms this app emits
// (plus common hand-typed variants). Anything outside the subset is a parse
// error, so the caller can leave the data untouched (PRD §4.5, all-or-nothing).
//
// Supported:
//   - header:  `flowchart TD|LR` (also graph/TB/RL/BT; only TD/LR are stored)
//   - nodes:   ID, ID[label], ID["label"], ID(label), ID{label}, ID(["label"])
//   - edges:   solid/thick/dotted links, directed or not, with optional label
//              either inline (-- "x" ---) or piped (---|x|)
// The type<->style mapping is shared with generate.ts via ./style.

export interface ParsedNode {
  id: string;
  name: string;
}

export interface ParsedEdge {
  from: string;
  to: string;
  type: ConnectionType;
  label: string;
  bidirectional: boolean;
}

export interface ParsedGraph {
  direction: Direction;
  nodes: ParsedNode[];
  edges: ParsedEdge[];
}

export type ParseResult =
  | { ok: true; graph: ParsedGraph }
  | { ok: false; error: string };

const NODE_ID = '[A-Za-z][\\w]*';

// A node token: id immediately followed by a bracketed shape. Global so we can
// find every declaration on a line and strip it back to a bare id.
const NODE_DECL = new RegExp(
  `(${NODE_ID})(\\(\\[.*?\\]\\)|\\[\\[.*?\\]\\]|\\[.*?\\]|\\(.*?\\)|\\{.*?\\})`,
  'g',
);

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/** Inner label from a bracketed shape like `["x"]`, `(x)`, `{x}`, `(["x"])`. */
function shapeLabel(shape: string): string {
  const inner = shape.replace(/^\(\[|\]\)$|^\[\[|\]\]$|^[[({]|[\])}]$/g, '');
  return stripQuotes(inner);
}

/** If a node label carries the generated "A1: Name" prefix, recover just Name. */
function nameFromLabel(id: string, label: string): string {
  const prefix = `${id}: `;
  return label.startsWith(prefix) ? label.slice(prefix.length) : label;
}

function stripComment(line: string): string {
  const i = line.indexOf('%%');
  return i >= 0 ? line.slice(0, i) : line;
}

/** Pulls node declarations out of a line, returning the id-only remainder. */
function extractNodes(line: string, into: Map<string, string>): string {
  return line.replace(NODE_DECL, (_m, id: string, shape: string) => {
    const name = nameFromLabel(id, shapeLabel(shape));
    if (!into.has(id) || into.get(id) === '') into.set(id, name);
    return id;
  });
}

// --- edge operators -------------------------------------------------------

function opInfo(op: string): { kind: LineKind; directed: boolean } | null {
  switch (op) {
    case '===': return { kind: 'thick', directed: false };
    case '==>': return { kind: 'thick', directed: true };
    case '---': return { kind: 'solid', directed: false };
    case '-->': return { kind: 'solid', directed: true };
    case '-.-': return { kind: 'dotted', directed: false };
    case '-.->': return { kind: 'dotted', directed: true };
    default: return null;
  }
}

const UNLABELED = new RegExp(`^(${NODE_ID})\\s*(===|==>|-\\.->|-\\.-|-->|---)\\s*(${NODE_ID})$`);
const PIPE = new RegExp(`^(${NODE_ID})\\s*(===|==>|-\\.->|-\\.-|-->|---)\\s*\\|(.*?)\\|\\s*(${NODE_ID})$`);
const INLINE_THICK = new RegExp(`^(${NODE_ID})\\s*==\\s*(.*?)\\s*(==>|===)\\s*(${NODE_ID})$`);
const INLINE_SOLID = new RegExp(`^(${NODE_ID})\\s*--\\s*(.*?)\\s*(-->|---)\\s*(${NODE_ID})$`);
const INLINE_DOTTED = new RegExp(`^(${NODE_ID})\\s*-\\.\\s*(.*?)\\s*(\\.->|\\.-)\\s*(${NODE_ID})$`);

interface RawEdge {
  from: string;
  to: string;
  kind: LineKind;
  directed: boolean;
  label: string;
}

function parseRawEdge(line: string): RawEdge | null {
  let m = PIPE.exec(line);
  if (m) {
    const info = opInfo(m[2])!;
    return { from: m[1], to: m[4], kind: info.kind, directed: info.directed, label: stripQuotes(m[3]) };
  }
  m = INLINE_THICK.exec(line);
  if (m) {
    return { from: m[1], to: m[4], kind: 'thick', directed: m[3] === '==>', label: stripQuotes(m[2]) };
  }
  m = INLINE_SOLID.exec(line);
  if (m) {
    return { from: m[1], to: m[4], kind: 'solid', directed: m[3] === '-->', label: stripQuotes(m[2]) };
  }
  m = INLINE_DOTTED.exec(line);
  if (m) {
    return { from: m[1], to: m[4], kind: 'dotted', directed: m[3] === '.->', label: stripQuotes(m[2]) };
  }
  m = UNLABELED.exec(line);
  if (m) {
    const info = opInfo(m[2]);
    if (info) return { from: m[1], to: m[3], kind: info.kind, directed: info.directed, label: '' };
  }
  return null;
}

function stripLeading(label: string, marker: string): string {
  if (label === marker) return '';
  if (label.startsWith(marker + ' ')) return label.slice(marker.length + 1).trim();
  return label;
}

/** Maps a raw edge's line style + label back to a domain type (flag 2). */
export function classifyEdge(raw: RawEdge): ParsedEdge {
  const base = { from: raw.from, to: raw.to, bidirectional: !raw.directed };
  const label = raw.label.trim();

  if (raw.kind === 'thick') {
    return { ...base, type: 'open', label };
  }
  if (raw.kind === 'dotted') {
    return { ...base, type: 'secret door', label: stripLeading(label, EDGE_MARKERS.secret) };
  }
  // solid
  if (label === '') {
    return raw.directed
      ? { ...base, type: 'one-way', label: '', bidirectional: false }
      : { ...base, type: 'pathway', label: '' };
  }
  if (label === EDGE_MARKERS.door || label.startsWith(EDGE_MARKERS.door + ' ')) {
    return { ...base, type: 'door', label: stripLeading(label, EDGE_MARKERS.door) };
  }
  if (label === EDGE_MARKERS.locked || label.startsWith(EDGE_MARKERS.locked)) {
    const withoutMark = stripLeading(label, EDGE_MARKERS.locked);
    return { ...base, type: 'locked', label: stripLeading(withoutMark, LOCKED_ICON) };
  }
  if (label === 'custom') {
    return { ...base, type: 'custom', label: '' };
  }
  return { ...base, type: 'custom', label };
}

/** Parses a single edge line (id-only endpoints) or returns null. */
export function parseEdgeLine(line: string): ParsedEdge | null {
  const raw = parseRawEdge(line);
  return raw ? classifyEdge(raw) : null;
}

export function parseMermaid(text: string): ParseResult {
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = stripComment(raw).trim();
    if (line) lines.push(line);
  }
  if (lines.length === 0) return { ok: false, error: 'Diagram is empty.' };

  const header = /^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/i.exec(lines[0]);
  if (!header) {
    return { ok: false, error: 'First line must be "flowchart TD" or "flowchart LR".' };
  }
  const direction: Direction = header[1].toUpperCase() === 'LR' ? 'LR' : 'TD';

  const nodes = new Map<string, string>();
  const edges: ParsedEdge[] = [];

  for (let i = 1; i < lines.length; i++) {
    const stripped = extractNodes(lines[i], nodes).trim();
    if (stripped === '') continue;
    if (new RegExp(`^${NODE_ID}$`).test(stripped)) {
      if (!nodes.has(stripped)) nodes.set(stripped, '');
      continue;
    }
    const edge = parseEdgeLine(stripped);
    if (!edge) {
      return { ok: false, error: `Line ${i + 1}: could not parse "${lines[i].trim()}".` };
    }
    if (!nodes.has(edge.from)) nodes.set(edge.from, '');
    if (!nodes.has(edge.to)) nodes.set(edge.to, '');
    edges.push(edge);
  }

  return {
    ok: true,
    graph: {
      direction,
      nodes: [...nodes].map(([id, name]) => ({ id, name })),
      edges,
    },
  };
}
