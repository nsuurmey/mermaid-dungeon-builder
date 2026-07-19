import { useEffect, useMemo, useState } from 'react';
import type { FullMap, Monster } from '../types';
import { getFullMap } from '../api';
import { generateMermaid } from '../mermaid/generate';
import { renderMermaidSvg } from '../mermaid/render';
import { formatMonsterStatLine, byAreaId } from './format';

const LEGEND: { glyph: string; meaning: string }[] = [
  { glyph: '═══', meaning: 'open' },
  { glyph: '───', meaning: 'pathway' },
  { glyph: '─ door ─', meaning: 'door' },
  { glyph: '╌ (S) ╌', meaning: 'secret door' },
  { glyph: '─ (L) 🔒 ─', meaning: 'locked' },
  { glyph: '──▶', meaning: 'one-way' },
  { glyph: '─ label ─', meaning: 'custom' },
];

export function PrintView({ mapId }: { mapId: string }) {
  const [full, setFull] = useState<FullMap | null>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFullMap(mapId)
      .then(setFull)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load map'));
  }, [mapId]);

  const text = useMemo(() => (full ? generateMermaid(full) : ''), [full]);

  useEffect(() => {
    if (!full || full.areas.length === 0) return;
    let cancelled = false;
    renderMermaidSvg('eem-print', text)
      .then((s) => !cancelled && setSvg(s))
      .catch(() => !cancelled && setSvg(''));
    return () => {
      cancelled = true;
    };
  }, [full, text]);

  if (error) return <main className="shell"><p className="error">{error}</p></main>;
  if (!full) return <main className="shell"><p>Loading…</p></main>;

  const areas = [...full.areas].sort(byAreaId);
  const monstersByArea = (id: string): Monster[] =>
    full.monsters.filter((m) => m.area_id === id);

  return (
    <div className="print-root">
      <div className="no-print print-toolbar">
        <button onClick={() => window.print()}>Print / Save as PDF</button>
        <button className="ghost" onClick={() => window.close()}>Close</button>
        <span className="muted tiny">Tip: enable “Background graphics” for clean lines.</span>
      </div>

      {/* Page 1: title + diagram + legend */}
      <section className="print-page-1">
        <h1>{full.map.title}</h1>
        {svg ? (
          <div className="print-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <p className="muted">No diagram — add areas first.</p>
        )}
        <div className="print-legend">
          <strong>Connections</strong>
          <ul>
            {LEGEND.map((l) => (
              <li key={l.meaning}>
                <span className="legend-glyph">{l.glyph}</span> {l.meaning}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Following pages: numbered room key */}
      <section className="print-key">
        {areas.map((a) => {
          const monsters = monstersByArea(a.id);
          return (
            <article className="key-entry" key={a.id}>
              <h2>
                <span className="slug">{a.id}</span> — {a.name || '(unnamed)'}
              </h2>
              {a.description && <p className="key-desc">{a.description}</p>}
              {a.features && <p><strong>Features:</strong> {a.features}</p>}
              {a.treasure && <p><strong>Treasure:</strong> {a.treasure}</p>}
              {a.gm_notes && (
                <p className="key-gm"><strong>GM:</strong> {a.gm_notes}</p>
              )}
              {monsters.length > 0 && (
                <ul className="key-monsters">
                  {monsters.map((m) => (
                    <li key={m.id}>{formatMonsterStatLine(m)}</li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
