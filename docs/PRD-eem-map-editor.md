# PRD — Eem Map Editor (working title)

**Owner:** Nate · **Builder:** Claude Code · **Version:** 0.1 (draft)

## 1. Problem & Purpose

Nate GMs an async play-by-post *Land of Eem* campaign. When prepping a dungeon, forest, village, or any multi-area location, he needs a fast way to lay out **areas and how they connect** — not a battle map, just a node-and-edge diagram — with each area carrying its own description, treasure, monsters, and GM notes. The output must be printable in black and white as a one-glance reference to guide play.

**North star:** idea → runnable, printable location layout in under 10 minutes.

## 2. Users & Context

- Single user (the GM). No auth in MVP beyond a simple shared password/env-var gate to keep the deployed app private.
- Deployed as a small web app on Railway (same pattern as the existing Discord bot: Node + TypeScript + better-sqlite3, persistent volume at `/data`).

## 3. Core Concepts & Data Model

The **database is the source of truth**. The Mermaid diagram is a *view* generated from the data. (Rationale: Mermaid syntax can't carry descriptions, treasure, or stat blocks without becoming unreadable.)

### Map
- `id`, `title`, `tone` (Hijinks / Derring-Do / Doom & Gloom), `notes`, `created_at`, `updated_at`

### Area (node)
- `id` (stable short slug, e.g. `A1`, used as the Mermaid node ID and the printed key number)
- `name` (e.g. "The Mushroom Cellar")
- `description` (read-aloud / summary text)
- `gm_notes` (secrets, triggers — GM-eyes-only)
- `treasure` (free text list)
- `features` (free text: hazards, interactables, fun bits)
- `monsters` (0..n Monster records, see below)

### Connection (edge)
- `from_area`, `to_area`
- `type` — enum: `open` | `pathway` | `door` | `secret door` | `locked` | `one-way` | `custom`
- `label` (optional free text, e.g. "rope bridge, rickety")
- `bidirectional` (default true; false renders an arrow)

**Edge → Mermaid style mapping (must be visually distinct in B&W):**

| Type | Mermaid rendering |
|---|---|
| open | thick line `===` |
| pathway | solid line `---` |
| door | solid line with label `--"door"--` |
| secret door | dashed line `-.-` with label `(S)` |
| locked | solid line with label `(L)` + key icon text |
| one-way | arrow `-->` |
| custom | solid line + user label |

### Monster (Land of Eem Adversary — fields per the SRD)
- `name`, `level`, `class_tier` (Goon / Bruiser / Champion)
- `courage` (with helper text: Goon = Level, Bruiser = Level d6, Champion = Level d12)
- `attack`, `defense`, `block`, `dread`, `actions`
- `abilities` (free text), `vulnerabilities` (free text)
- `social`, `combat_tactics`, `defeat`, `victory` (short free text — optional)
- `bestiary_ref` (optional: page/entry name if it's a book creature rather than custom)

No other stat fields — do not invent D&D-style stats (no AC, no HP; Courage/Dread are the Eem terms).

## 4. Editing Experience — Two-Way Sync

Split-pane editor:

- **Left pane — structured forms.** Add/edit areas and connections via UI. Area detail drawer with all fields including monster sub-forms.
- **Right pane — Mermaid.** Two tabs: rendered diagram (mermaid.js, client-side) and raw Mermaid text.

**Sync rules (canonical, to avoid ambiguity):**

1. Form edits regenerate the Mermaid text and re-render immediately.
2. Raw Mermaid text is editable. On apply (explicit "Apply" button, not per-keystroke), the app parses a **supported subset** of `flowchart` syntax: node IDs, node labels, edges, edge styles/labels, and direction (`TD`/`LR`).
3. Parsed changes reconcile by **node ID**: new IDs create new Area records (empty properties), removed IDs prompt before deleting the Area record, renamed labels update `name`, edge changes update Connections (edge style maps back to `type` via the table above).
4. Properties with no Mermaid representation (descriptions, treasure, monsters, GM notes) live only in the DB and are **never lost** by a text-side edit.
5. If the pasted text isn't parseable, show the error inline and do not touch the data.
6. Import flow: user can paste an arbitrary Mermaid flowchart to **seed a new map** — nodes become Areas, edges become `pathway` Connections by default.

Diagram nodes render as `A1: Name` so the diagram doubles as the index into the printed key. Clicking a node in the rendered diagram opens that Area's form.

## 5. Print View (the actual table artifact)

A dedicated print route with print CSS, optimized for B&W on Letter/A4:

1. **Page 1:** Map title + the rendered diagram, scaled to fit one page.
2. **Following pages — numbered room key.** For each Area in ID order: `A1 — Name`, description, features, treasure, GM notes (visually set off), and compact monster stat lines, e.g.:
   `Mire Squix (Goon, Lv 2) — Courage 2 · Atk +1 · Def -1 · Block 0 · Dread 1d6 · Actions 1 — Vulnerable: bright light`
3. A short **connections legend** (edge style → meaning) in a corner of page 1.

Browser print → PDF is sufficient; no server-side PDF generation in MVP.

## 6. Persistence & Portability

- **SQLite** via better-sqlite3, DB file on Railway persistent volume at `/data/maps.db`.
- **Export:** per-map JSON (full fidelity) and per-map `.mmd` Mermaid text (layout only). One-click from the map screen.
- **Import:** JSON (full restore) and Mermaid text (seed layout, per §4.6).
- Autosave on form changes; no explicit save button for forms.

## 7. Tech Stack (suggested, builder may adjust with rationale)

- TypeScript throughout. Vite + React frontend; small Express (or Hono) API; better-sqlite3.
- mermaid.js rendered client-side. Mermaid parsing for two-way sync: use a constrained custom parser for the supported subset (don't attempt full Mermaid grammar).
- Single Railway service serving API + static frontend. `PORT` from env; `DATA_DIR` env defaulting to `/data`.

## 8. MVP Scope

**In:** map CRUD; area/connection/monster CRUD; split-pane editor with two-way sync per §4; print view per §5; JSON + Mermaid export/import; SQLite persistence; simple password gate.

**Out (Phase 2 candidates):** multi-user/sharing; player-safe print variant (secrets stripped); image/PNG export; Bestiary lookup/autofill; drag-to-position layout control; Discord bot integration (e.g. `/map post A3` posting an area description to a channel).

## 9. Acceptance Criteria

1. Create a 6-area dungeon with mixed edge types in under 10 minutes using forms only.
2. Paste a plain Mermaid flowchart → app seeds a new map; add descriptions via forms; edit the raw text to add one node and one secret-door edge → data reconciles, no property loss on untouched areas.
3. Secret doors are visually distinguishable from open/pathway/door edges when printed in B&W.
4. Print view produces a legible one-page diagram + numbered key with correctly formatted Eem stat lines.
5. Redeploying the Railway service does not lose maps (volume-backed DB).
6. Export JSON → wipe DB → import JSON → identical map.

## 10. Open Questions

- Exact app name?
- Should the diagram default to `TD` (top-down) or `LR`? (Proposal: per-map toggle, default `TD`.)
- Any need for sub-areas / nested zones (e.g. a floor grouping) in MVP, or flat is fine?
