# Eem Map Editor

Single-user web app for prepping *Land of Eem* location maps — areas and how
they connect as a printable node-and-edge diagram. See
[`docs/PRD-eem-map-editor.md`](docs/PRD-eem-map-editor.md) for the full spec and
[`CLAUDE.md`](CLAUDE.md) for the working conventions (notably: **the DB is the
source of truth; the Mermaid diagram is a generated view**).

## Stack

- TypeScript throughout
- **client/** — Vite + React
- **server/** — Express API + SQLite (`better-sqlite3`), also serves the built
  client in production
- Single Railway service; SQLite on a persistent volume at `/data`

## Local development

```bash
npm install
cp .env.example .env   # then edit — set DATA_DIR=./.data for local dev
npm run dev            # server on :3001, client on :5173 (proxies /api)
```

Open http://localhost:5173. With `APP_PASSWORD` empty the auth gate is
disabled; set it to require a password.

## Production build

```bash
npm run build   # builds client, then compiles server
npm start       # serves API + built client on $PORT
```

## Configuration

| Env | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3001` | Server port (Railway sets this) |
| `DATA_DIR` | `/data` | Directory holding `maps.db` |
| `APP_PASSWORD` | *(empty)* | Shared password gate. **Required in production** |
| `AUTH_SECRET` | *(derived)* | Secret for signing session cookies |

## Deploy (Railway)

`railway.json` sets the build (`npm install && npm run build`) and start
(`npm start`) commands. Provide a persistent volume mounted at `/data`, set
`APP_PASSWORD`, and (recommended) `NODE_ENV=production` and `AUTH_SECRET`.

## Status

Phase 0 (project skeleton, password gate, DB connection, Railway config) is in
place. Remaining phases — data layer, structured editor, Mermaid two-way sync,
print view, export/import — are tracked against the PRD sections.
