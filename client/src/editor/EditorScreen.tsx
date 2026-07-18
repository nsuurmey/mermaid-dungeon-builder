import { useEffect, useState } from 'react';
import type {
  Area,
  Connection,
  ConnectionType,
  Direction,
  FullMap,
  Monster,
} from '../types';
import * as api from '../api';
import { AreaForm } from './AreaForm';
import { ConnectionsPanel } from './ConnectionsPanel';
import { MermaidPanel } from '../mermaid/MermaidView';

export function EditorScreen({ mapId, onBack }: { mapId: string; onBack: () => void }) {
  const [full, setFull] = useState<FullMap | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getFullMap(mapId)
      .then((f) => {
        setFull(f);
        setSelectedAreaId(f.areas[0]?.id ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load map'))
      .finally(() => setLoading(false));
  }, [mapId]);

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : 'Something went wrong');
  }

  // --- local-state helpers ---
  function patch(mut: (f: FullMap) => FullMap) {
    setFull((prev) => (prev ? mut(prev) : prev));
  }

  // --- map fields ---
  function saveMapField(p: Partial<FullMap['map']>) {
    patch((f) => ({ ...f, map: { ...f.map, ...p } }));
    api.updateMap(mapId, p).catch(fail);
  }

  // --- areas ---
  async function addArea() {
    try {
      const area = await api.createArea(mapId);
      patch((f) => ({ ...f, areas: [...f.areas, area] }));
      setSelectedAreaId(area.id);
    } catch (e) {
      fail(e);
    }
  }

  function patchArea(id: string, p: Partial<Area>) {
    patch((f) => ({
      ...f,
      areas: f.areas.map((a) => (a.id === id ? { ...a, ...p } : a)),
    }));
    api.updateArea(mapId, id, p).catch(fail);
  }

  async function deleteArea(id: string) {
    if (!confirm(`Delete area ${id}? Its monsters and connections go too.`)) return;
    try {
      await api.deleteArea(mapId, id);
      patch((f) => ({
        ...f,
        areas: f.areas.filter((a) => a.id !== id),
        monsters: f.monsters.filter((m) => m.area_id !== id),
        connections: f.connections.filter((c) => c.from_area !== id && c.to_area !== id),
      }));
      setSelectedAreaId((cur) => (cur === id ? null : cur));
    } catch (e) {
      fail(e);
    }
  }

  // --- monsters ---
  async function addMonster(areaId: string) {
    try {
      const m = await api.createMonster(mapId, areaId);
      patch((f) => ({ ...f, monsters: [...f.monsters, m] }));
    } catch (e) {
      fail(e);
    }
  }

  function patchMonster(id: number, p: Partial<Monster>) {
    patch((f) => ({
      ...f,
      monsters: f.monsters.map((m) => (m.id === id ? { ...m, ...p } : m)),
    }));
    api.updateMonster(mapId, id, p).catch(fail);
  }

  async function deleteMonster(id: number) {
    try {
      await api.deleteMonster(mapId, id);
      patch((f) => ({ ...f, monsters: f.monsters.filter((m) => m.id !== id) }));
    } catch (e) {
      fail(e);
    }
  }

  // --- connections ---
  async function addConnection(input: {
    from_area: string;
    to_area: string;
    type: ConnectionType;
  }) {
    try {
      const c = await api.createConnection(mapId, input);
      patch((f) => ({ ...f, connections: [...f.connections, c] }));
    } catch (e) {
      fail(e);
    }
  }

  function patchConnection(id: number, p: Partial<Connection>) {
    patch((f) => ({
      ...f,
      connections: f.connections.map((c) => (c.id === id ? { ...c, ...p } : c)),
    }));
    api.updateConnection(mapId, id, p).catch(fail);
  }

  async function deleteConnection(id: number) {
    try {
      await api.deleteConnection(mapId, id);
      patch((f) => ({ ...f, connections: f.connections.filter((c) => c.id !== id) }));
    } catch (e) {
      fail(e);
    }
  }

  if (loading) return <main className="shell"><p>Loading…</p></main>;
  if (!full) {
    return (
      <main className="shell">
        <div className="card">
          <p className="error">{error ?? 'Map not found'}</p>
          <button onClick={onBack}>Back to maps</button>
        </div>
      </main>
    );
  }

  const selectedArea = full.areas.find((a) => a.id === selectedAreaId) ?? null;
  const selectedMonsters = selectedArea
    ? full.monsters.filter((m) => m.area_id === selectedArea.id)
    : [];

  return (
    <div className="editor">
      <header className="editor-bar">
        <button className="ghost" onClick={onBack}>← Maps</button>
        <input
          className="map-title"
          defaultValue={full.map.title}
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value !== full.map.title) {
              saveMapField({ title: e.target.value.trim() });
            }
          }}
        />
        <label className="inline">
          Direction
          <select
            value={full.map.direction}
            onChange={(e) => saveMapField({ direction: e.target.value as Direction })}
          >
            <option value="TD">TD</option>
            <option value="LR">LR</option>
          </select>
        </label>
        {error && <span className="error tiny">{error}</span>}
      </header>

      <div className="split">
        {/* LEFT: structured forms */}
        <section className="pane left">
          <div className="area-list">
            <div className="section-head">
              <h3>Areas</h3>
              <button className="ghost" onClick={addArea}>+ Add area</button>
            </div>
            {full.areas.length === 0 ? (
              <p className="muted tiny">No areas yet. Add one to begin.</p>
            ) : (
              <ul className="area-tabs">
                {full.areas.map((a) => (
                  <li key={a.id}>
                    <button
                      className={a.id === selectedAreaId ? 'active' : ''}
                      onClick={() => setSelectedAreaId(a.id)}
                    >
                      <span className="slug">{a.id}</span> {a.name || '(unnamed)'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedArea && (
            <AreaForm
              area={selectedArea}
              monsters={selectedMonsters}
              onPatch={(p) => patchArea(selectedArea.id, p)}
              onDelete={() => deleteArea(selectedArea.id)}
              onAddMonster={() => addMonster(selectedArea.id)}
              onPatchMonster={patchMonster}
              onDeleteMonster={deleteMonster}
            />
          )}

          <ConnectionsPanel
            areas={full.areas}
            connections={full.connections}
            onCreate={addConnection}
            onPatch={patchConnection}
            onDelete={deleteConnection}
          />
        </section>

        {/* RIGHT: rendered Mermaid + raw text (read-only until Phase 4) */}
        <section className="pane right">
          <MermaidPanel full={full} onSelectArea={setSelectedAreaId} />
        </section>
      </div>
    </div>
  );
}
