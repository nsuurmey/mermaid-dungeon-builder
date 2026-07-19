# CLAUDE.md

Guidance for working in this repository. Read this before touching code.

## What this is

**Eem Map Editor** (working title) — a single-user web app for prepping
*Land of Eem* location maps for an async play-by-post campaign. It lays out
**areas and how they connect** as a node-and-edge diagram (not a battle map),
where each area carries description, treasure, monsters, and GM notes, and the
whole thing prints in black & white as a one-glance table reference.

North star: idea → runnable, printable location layout in under 10 minutes.

Canonical spec: `docs/PRD-eem-map-editor.md`. When code and PRD disagree, the
PRD wins unless a decision here says otherwise. Keep this file in sync with
decisions as they're made.

## Stack

- **TypeScript throughout.** No plain JS files.
- **Frontend:** Vite + React.
- **API:** small Express (or Hono) server. Single service — the API also serves
  the built static frontend.
- **DB:** SQLite via `better-sqlite3` (synchronous, single-file).
- **Diagram:** `mermaid.js` rendered client-side.
- **Mermaid two-way sync:** a **constrained custom parser** for a supported
  subset of `flowchart` syntax. Do **not** attempt the full Mermaid grammar.
- **Deploy:** single Railway service, same pattern as the existing Discord bot
  (Node + TS + better-sqlite3, persistent volume at `/data`).

### Environment / config

- `PORT` — from env (Railway provides it).
- `DATA_DIR` — env, defaults to `/data`. DB lives at `${DATA_DIR}/maps.db`.
- A simple shared password / env-var gate protects the deployed app. This is the
  only auth in the MVP — not a user system.

## The one rule that governs everything: DB is the source of truth

**The database is the source of truth. The Mermaid diagram is a *view*
generated from the data.** Mermaid syntax cannot carry descriptions, treasure,
or stat blocks without becoming unreadable, so those live only in the DB.

Every sync decision follows from this. When in doubt, never let a diagram-side
action destroy DB data that has no diagram representation.

### Two-way sync rules (PRD §4 — canonical)

The editor is split-pane: **left** = structured forms (areas, connections,
monster sub-forms); **right** = Mermaid, with two tabs (rendered diagram + raw
editable text).

1. **Form → text is automatic.** Form edits regenerate the Mermaid text and
   re-render immediately.
2. **Text → data is explicit.** Raw Mermaid text is editable, but changes apply
   only on an explicit **Apply** button — never per-keystroke. On apply, parse
   the supported subset: node IDs, node labels, edges, edge styles/labels, and
   direction (`TD` / `LR`).
3. **Reconcile by node ID**, not by position or label:
   - New ID → create a new Area record with empty properties.
   - Removed ID → **prompt before deleting** the Area record.
   - Renamed label on an existing ID → update `name`.
   - Edge changes → update Connections; edge style maps back to `type` via the
     style table below.
4. **DB-only properties are never lost by a text-side edit.** Descriptions,
   treasure, monsters, GM notes, features have no Mermaid representation and
   must survive any raw-text edit untouched.
5. **Unparseable text is inert.** If pasted/edited text doesn't parse, show the
   error inline and **do not touch the data**. (All-or-nothing: no partial
   application.)
6. **Import seeds a new map.** A user can paste an arbitrary Mermaid flowchart to
   seed a new map — nodes become Areas, edges become `pathway` Connections by
   default.

Diagram nodes render as `A1: Name` so the diagram doubles as the printed key
index. Clicking a rendered node opens that Area's form.

### Edge type → Mermaid style (must be visually distinct in B&W)

| Type        | Mermaid rendering              |
|-------------|--------------------------------|
| open        | thick line `===`               |
| pathway     | solid line `---`               |
| door        | solid line with label `--"door"--` |
| secret door | dashed line `-.-` with label `(S)` |
| locked      | solid line with label `(L)` + key icon text |
| one-way     | arrow `-->`                    |
| custom      | solid line + user label        |

`bidirectional` defaults true; false renders a directional arrow. This mapping
is bidirectional in code: generation (type → style) and parsing (style → type)
must stay in lockstep — keep both sides in one module so they can't drift.

## Data model (PRD §3)

- **Map:** `id`, `title`, `tone` (Hijinks / Derring-Do / Doom & Gloom),
  `notes`, `created_at`, `updated_at`.
- **Area (node):** `id` (stable short slug e.g. `A1` — also the Mermaid node ID
  and printed key number), `name`, `description` (read-aloud), `gm_notes`
  (GM-eyes-only), `treasure`, `features`, `monsters` (0..n).
- **Connection (edge):** `from_area`, `to_area`, `type` (enum above), `label`
  (optional), `bidirectional` (default true).
- **Monster (Land of Eem Adversary, per SRD):** `name`, `level`, `class_tier`
  (Goon / Bruiser / Champion), `courage`, `attack`, `defense`, `block`,
  `dread`, `actions`, `abilities`, `vulnerabilities`, `social`,
  `combat_tactics`, `defeat`, `victory`, `bestiary_ref`.

### Domain rules — do not violate

- **Use Eem terms, not D&D.** There is **no AC and no HP.** Courage and Dread
  are the Eem stats. Do not invent D&D-style stats.
- Courage helper text: Goon = Level · Bruiser = Level d6 · Champion = Level d12.
- Area `id` slugs are **stable** — they are the node ID *and* the printed key
  number. Don't regenerate or renumber them casually.

## Print view (PRD §5)

Dedicated print route with print CSS, optimized for B&W on Letter/A4:

- **Page 1:** map title + rendered diagram scaled to one page, plus a small
  **connections legend** (edge style → meaning) in a corner.
- **Following pages:** numbered room key in ID order — `A1 — Name`, description,
  features, treasure, GM notes (visually set off), and compact monster stat
  lines, e.g.:
  `Mire Squix (Goon, Lv 2) — Courage 2 · Atk +1 · Def -1 · Block 0 · Dread 1d6 · Actions 1 — Vulnerable: bright light`

Browser print → PDF is sufficient. **No server-side PDF generation** in MVP.

## Persistence & portability (PRD §6)

- SQLite file at `${DATA_DIR}/maps.db` on the Railway persistent volume.
- **Export:** per-map JSON (full fidelity) and per-map `.mmd` Mermaid text
  (layout only). One-click.
- **Import:** JSON (full restore) and Mermaid text (seed layout, per §4.6).
- **Autosave on form changes** — no explicit save button for forms. (Contrast:
  the raw-text side *does* have an explicit Apply.)

## MVP scope — stay inside the line (PRD §8)

**In:** map CRUD; area/connection/monster CRUD; split-pane editor with two-way
sync (§4); print view (§5); JSON + Mermaid export/import; SQLite persistence;
password gate.

**Out (Phase 2 — do not build unless asked):** multi-user/sharing; player-safe
print variant; PNG/image export; Bestiary lookup/autofill; drag-to-position
layout; Discord bot integration.

## Build, install & migrations

- **Schema migrations** are versioned via `PRAGMA user_version` and run in a
  transaction on boot (`server/src/schema.ts`). Bump `CURRENT_VERSION` and
  append a step to `MIGRATIONS` for any schema change — never edit an applied
  step.
- **Shared types layout (b):** `server/src/types.ts` is the source of truth for
  domain/API shapes; `client/src/types.ts` hand-copies the subset it needs.
  Keep them in sync when shapes change.
- **Tests:** `npm test` (server) runs `node:test` via `tsx` — no test-runner
  dependency. Repos take an explicit `Database` so tests use an in-memory DB
  (`openDatabase(':memory:')`).
- **Native install (`better-sqlite3`):** `.npmrc` sets `build_from_source=true`
  so installs don't depend on the GitHub prebuild download (portable, incl.
  Railway). In sandboxes that also block `nodejs.org` header downloads, point
  node-gyp at the local Node: `npm_config_nodedir=/opt/node22 npm install`.

## Decisions log

- **Slug minting (flag 3):** Area slugs auto-increment (`A1`, `A2`, …) and are
  never reused. The `map.area_seq` monotonic counter backs this; the actual
  minting behavior is being validated in Phase 2 (areas aren't creatable yet).
- **Direction:** per-map `TD`/`LR` toggle, default `TD` (PRD §10).
- **Maps are flat (flag 4):** no sub-areas / nested zones / subgraphs in MVP.
- **Raw-text edits may change edge `type` (flag 2):** label markers (`(S)`,
  `(L)`, `"door"`) are the disambiguator when parsing style → type.
- IDs: Map = UUID; Connection/Monster = autoincrement int; Area = slug
  (composite PK `map_id,id`). Timestamps are ISO strings. Deletes cascade
  map → area → {connection, monster}.
- **Mermaid gen+parse live client-side** (`client/src/mermaid/`), colocated so
  the type↔style mapping can't drift. The live view regenerates on every form
  edit and Phase 4's Apply parses there; the server stays structured-data only
  and `.mmd` export is a client download of the current text.
- **Edge Mermaid forms** (verified rendering): open `A===B`, pathway `A---B`,
  door `A -- "door" --- B`, secret `A -. "(S)" .- B`, locked `A -- "(L) 🔒" --- B`,
  one-way `A-->B`, custom `A -- "label" --- B`. Directed (arrow) when the type is
  one-way or `bidirectional` is false.

## Conventions

- TypeScript everywhere; prefer explicit types at module boundaries (API
  request/response shapes, DB row shapes, the parser's AST).
- Keep Mermaid generation + parsing colocated so the type↔style mapping can't
  drift between the two directions.
- Match the surrounding code's style; keep comment density and naming idiomatic.
- Commit in coherent, reviewable steps with descriptive messages.

## Acceptance criteria to build toward (PRD §9)

1. Build a 6-area dungeon with mixed edge types in <10 min, forms only.
2. Paste a plain Mermaid flowchart → seeds a new map; add descriptions via
   forms; edit raw text to add one node + one secret-door edge → reconciles with
   **no property loss** on untouched areas.
3. Secret doors are B&W-distinguishable from open/pathway/door edges when printed.
4. Print view: legible one-page diagram + numbered key with correctly formatted
   Eem stat lines.
5. Railway redeploy does not lose maps (volume-backed DB).
6. Export JSON → wipe DB → import JSON → identical map.
