import { useEffect, useState } from 'react';
import { listMaps, createMap, deleteMap } from './api';
import { TONES, type Map, type Tone } from './types';

export function MapsScreen({
  gateEnabled,
  onLogout,
}: {
  gateEnabled: boolean;
  onLogout: () => void;
}) {
  const [maps, setMaps] = useState<Map[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [tone, setTone] = useState<Tone>('Hijinks');
  const [creating, setCreating] = useState(false);

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

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : maps.length === 0 ? (
          <p className="muted">No maps yet. Create one above.</p>
        ) : (
          <ul className="map-list">
            {maps.map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.title}</strong>
                  <span className="muted"> · {m.tone} · {m.direction}</span>
                </div>
                <button className="ghost" onClick={() => onDelete(m.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
