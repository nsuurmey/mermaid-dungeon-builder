import { useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { FullMap } from '../types';
import { generateMermaid } from './generate';

let initialized = false;
function ensureInit() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'neutral',
    flowchart: { htmlLabels: true, useMaxWidth: true },
  });
  initialized = true;
}

/** Renders Mermaid text to SVG and wires node clicks back to the area forms. */
function MermaidDiagram({
  text,
  areaIds,
  onSelectArea,
}: {
  text: string;
  areaIds: string[];
  onSelectArea: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  // Keep click wiring current without re-rendering the diagram every keystroke.
  const areaIdsRef = useRef(areaIds);
  areaIdsRef.current = areaIds;
  const onSelectRef = useRef(onSelectArea);
  onSelectRef.current = onSelectArea;

  useEffect(() => {
    ensureInit();
    let cancelled = false;
    const renderId = `eem-mmd-${++seq.current}`;
    mermaid
      .render(renderId, text)
      .then(({ svg, bindFunctions }) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        bindFunctions?.(ref.current);
        ref.current.querySelectorAll<SVGGElement>('.node').forEach((node) => {
          const id = node.id.replace(/^flowchart-/, '').replace(/-\d+$/, '');
          if (areaIdsRef.current.includes(id)) {
            node.style.cursor = 'pointer';
            node.addEventListener('click', () => onSelectRef.current(id));
          }
        });
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Render failed');
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <div className="mermaid-wrap">
      {error && <p className="error tiny">Diagram error: {error}</p>}
      <div className="mermaid-svg" ref={ref} />
    </div>
  );
}

/** The right pane: rendered diagram + raw text tabs. Text is read-only until
 *  Phase 4 adds explicit Apply. */
export function MermaidPanel({
  full,
  onSelectArea,
}: {
  full: FullMap;
  onSelectArea: (id: string) => void;
}) {
  const [tab, setTab] = useState<'diagram' | 'text'>('diagram');
  const text = useMemo(() => generateMermaid(full), [full]);
  const areaIds = useMemo(() => full.areas.map((a) => a.id), [full.areas]);

  return (
    <div className="mermaid-panel">
      <div className="tabs">
        <button className={tab === 'diagram' ? 'active' : ''} onClick={() => setTab('diagram')}>
          Diagram
        </button>
        <button className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}>
          Text
        </button>
      </div>
      {full.areas.length === 0 ? (
        <p className="muted tiny">Add an area to see the diagram.</p>
      ) : tab === 'diagram' ? (
        <MermaidDiagram text={text} areaIds={areaIds} onSelectArea={onSelectArea} />
      ) : (
        <>
          <textarea className="mmd-text" readOnly value={text} spellCheck={false} />
          <p className="muted tiny">Editing raw text with an Apply button arrives in Phase 4.</p>
        </>
      )}
    </div>
  );
}
