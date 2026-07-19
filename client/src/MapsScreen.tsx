import { useEffect, useState } from 'react';
import { listMaps, createMap, deleteMap } from './api';
import { TONES, type Map, type Tone } from './types';
import { parseMermaid } from './mermaid/parse';
import { applyPlan } from './mermaid/apply';
import type { ReconcilePlan } from './mermaid/reconcile';

export function MapsScreen({
  gateEnabled,
  onOpen,
  onLogout,
}: {
  gateEnabled: boolean;
  onOpen: (id: string) => void;
  onLogout: () => void;
}) {
  const [maps, setMaps] = useState<Map[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [tone, setTone] = useState<Tone>('Hijinks');
  const [creating, setCreating] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importText, setImportText] = useState('');
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setMaps(await listMaps());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maps');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim() === '') return;
    setCreating(true);
    try {
      await createMap({ title: title.trim(), tone });
      setTitle('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create map');
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this map? This cannot be undone.')) return;
    try {
      await deleteMap(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete map');
    }
  }

  // Seed a new map from pasted Mermaid text (PRD §4.6): nodes become areas,
  // edges become pathway connections by default; the user refines types after.
  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    setImportErr(null);
    const parsed = parseMermaid(importText);
    if (!parsed.ok) {
      setImportErr(parsed.error);
      return;
    }
    setImportBusy(true);
    try {
      const map = await createMap({
        title: importTitle.trim() || 'Imported map',
        tone: 'Hijinks',
        direction: parsed.graph.direction,
      });
      const plan: ReconcilePlan = {
        direction: null, // set at creation time
        createAreas: parsed.graph.nodes.map((n) => ({ id: n.id, name: n.name })),
        renameAreas: [],
        deleteAreaIds: [],
        deleteEdgeIds: [],
        createEdges: parsed.graph.edges.map((edge) => ({
          from: edge.from,
          to: edge.to,
          type: 'pathway',
          label: '',
          bidirectional: true,
        })),
      };
      await applyPlan(map.id, plan);
      onOpen(map.id);
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <main className="shell wide">
      <div className="card">
        <div className="header-row">
          <h1>Maps</h1>
          {gateEnabled && (
            <button className="ghost" onClick={onLogout}>Log out</button>
          )}
        </div>

        <form className="new-map" onSubmit={onCreate}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New map title"
          />
          <select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
            {TONES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button type="submit" disabled={creating || title.trim() === ''}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>

        <div className="import-block">
          <button className="ghost" onClick={() => setImportOpen((o) => !o)}>
            {importOpen ? 'Cancel import' : 'Import from Mermaid…'}
          </button>
          {importOpen && (
            <form className="import-form" onSubmit={onImport}>
              <input
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder="New map title (optional)"
              />
              <textarea
                className="mmd-text"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'flowchart TD\n  A1["Entrance"]\n  A1 --> A2'}
                spellCheck={false}
                rows={8}
              />
              {importErr && <p className="error tiny">{importErr}</p>}
              <button type="submit" disabled={importBusy || importText.trim() === ''}>
                {importBusy ? 'Importing…' : 'Import & open'}
              </button>
            </form>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : maps.length === 0 ? (
          <p className="muted">No maps yet. Create one above.</p>
        ) : (
          <ul className="map-list">
            {maps.map((m) => (
              <li key={m.id}>
                <button className="link" onClick={() => onOpen(m.id)}>
                  <strong>{m.title}</strong>
                  <span className="muted"> · {m.tone} · {m.direction}</span>
                </button>
                <button className="ghost" onClick={() => onDelete(m.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
