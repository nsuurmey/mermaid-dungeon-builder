import { useState } from 'react';
import {
  CONNECTION_TYPES,
  type Area,
  type Connection,
  type ConnectionType,
} from '../types';

export function ConnectionsPanel({
  areas,
  connections,
  onCreate,
  onPatch,
  onDelete,
}: {
  areas: Area[];
  connections: Connection[];
  onCreate: (input: { from_area: string; to_area: string; type: ConnectionType }) => void;
  onPatch: (id: number, patch: Partial<Connection>) => void;
  onDelete: (id: number) => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState<ConnectionType>('pathway');

  const label = (id: string) => {
    const a = areas.find((x) => x.id === id);
    return a ? `${a.id}: ${a.name || '(unnamed)'}` : id;
  };

  const canAdd = from !== '' && to !== '' && from !== to;

  return (
    <div className="connections">
      <div className="section-head">
        <h3>Connections</h3>
      </div>

      {areas.length < 2 ? (
        <p className="muted tiny">Add at least two areas to connect them.</p>
      ) : (
        <div className="new-conn">
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">from…</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{label(a.id)}</option>)}
          </select>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">to…</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{label(a.id)}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value as ConnectionType)}>
            {CONNECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            disabled={!canAdd}
            onClick={() => {
              onCreate({ from_area: from, to_area: to, type });
              setFrom('');
              setTo('');
            }}
          >
            + Add
          </button>
        </div>
      )}

      {connections.length === 0 ? (
        <p className="muted tiny">No connections yet.</p>
      ) : (
        <ul className="conn-list">
          {connections.map((c) => (
            <li key={c.id}>
              <span className="conn-endpoints">
                {c.from_area} {c.bidirectional ? '↔' : '→'} {c.to_area}
              </span>
              <select
                value={c.type}
                onChange={(e) => onPatch(c.id, { type: e.target.value as ConnectionType })}
              >
                {CONNECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                className="conn-label"
                defaultValue={c.label}
                placeholder="label"
                onBlur={(e) => {
                  if (e.target.value !== c.label) onPatch(c.id, { label: e.target.value });
                }}
              />
              <label className="inline">
                <input
                  type="checkbox"
                  checked={c.bidirectional}
                  onChange={(e) => onPatch(c.id, { bidirectional: e.target.checked })}
                />
                bi
              </label>
              <button className="ghost danger" onClick={() => onDelete(c.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
