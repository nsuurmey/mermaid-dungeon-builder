import type { ConnectionType } from '../types';

// The single source of truth for the edge type <-> Mermaid style mapping.
// Generation (type -> style) lives in generate.ts and parsing (style -> type)
// arrives in parse.ts (Phase 4); both import from here so the two directions
// can never drift. See PRD §4 and the CLAUDE.md edge table.

/**
 * Label markers that disambiguate otherwise-similar solid/dashed links when
 * parsing style back into a type (flag 2). These exact strings are emitted by
 * the generator and matched by the parser.
 */
export const EDGE_MARKERS = {
  door: 'door',
  secret: '(S)',
  locked: '(L)',
} as const;

/** Emoji appended after the locked marker in the rendered diagram. */
export const LOCKED_ICON = '🔒';

/** The three visually-distinct line treatments Mermaid gives us. */
export type LineKind = 'thick' | 'solid' | 'dotted';

/**
 * Line treatment for each edge type. Must stay B&W-distinct:
 *  - open        -> thick   (===)
 *  - secret door -> dotted  (-.-)
 *  - everything else -> solid (---), disambiguated by its label marker.
 */
export function lineKindForType(type: ConnectionType): LineKind {
  switch (type) {
    case 'open':
      return 'thick';
    case 'secret door':
      return 'dotted';
    case 'pathway':
    case 'door':
    case 'locked':
    case 'one-way':
    case 'custom':
      return 'solid';
  }
}

/**
 * Whether an edge renders directed (single arrowhead). A `one-way` type is
 * always directed; any other type is directed only when bidirectional is off.
 */
export function isDirected(type: ConnectionType, bidirectional: boolean): boolean {
  return type === 'one-way' || !bidirectional;
}
