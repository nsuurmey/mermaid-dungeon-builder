import { useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { FullMap } from '../types';
import { generateMermaid } from './generate';
import { ensureMermaidInit } from './render';

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
    ensureMermaidInit();
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

export type ApplyOutcome = { ok: true } | { ok: false; error: string };

/** The right pane: rendered diagram + editable raw text with explicit Apply. */
export function MermaidPanel({
  full,
  onSelectArea,
  onApply,
}: {
  full: FullMap;
  onSelectArea: (id: string) => void;
  onApply: (text: string) => Promise<ApplyOutcome>;
}) {
  const [tab, setTab] = useState<'diagram' | 'text'>('diagram');
  const text = useMemo(() => generateMermaid(full), [full]);
  const areaIds = useMemo(() => full.areas.map((a) => a.id), [full.areas]);

  const [draft, setDraft] = useState(text);
  const [applyErr, setApplyErr] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  function openText() {
    setDraft(text);
    setApplyErr(null);
    setTab('text');
  }

  async function apply() {
    setApplying(true);
    setApplyErr(null);
    const outcome = await onApply(draft);
    setApplying(false);
    if (outcome.ok) setApplyErr(null);
    else setApplyErr(outcome.error);
  }

  return (
    <div className="mermaid-panel">
      <div className="tabs">
        <button className={tab === 'diagram' ? 'active' : ''} onClick={() => setTab('diagram')}>
          Diagram
        </button>
        <button className={tab === 'text' ? 'active' : ''} onClick={openText}>
          Text
        </button>
      </div>
      {tab === 'diagram' ? (
        full.areas.length === 0 ? (
          <p className="muted tiny">Add an area to see the diagram.</p>
        ) : (
          <MermaidDiagram text={text} areaIds={areaIds} onSelectArea={onSelectArea} />
        )
      ) : (
        <>
          <textarea
            className="mmd-text"
            value={draft}
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="row">
            <button onClick={apply} disabled={applying}>
              {applying ? 'Applying…' : 'Apply'}
            </button>
            <button className="ghost" onClick={() => { setDraft(text); setApplyErr(null); }}>
              Revert
            </button>
          </div>
          {applyErr && <p className="error tiny">{applyErr}</p>}
          <p className="muted tiny">
            Edits apply only on Apply. Removing a node prompts before deleting its
            area; descriptions, treasure, and monsters are never touched by text edits.
          </p>
        </>
      )}
    </div>
  );
}
