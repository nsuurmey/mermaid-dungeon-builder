import mermaid from 'mermaid';

let initialized = false;

/** Initializes mermaid once with the app's flowchart settings. Idempotent. */
export function ensureMermaidInit(): void {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'neutral',
    flowchart: { htmlLabels: true, useMaxWidth: true },
  });
  initialized = true;
}

/** Renders Mermaid text to an SVG string (no interactivity). */
export async function renderMermaidSvg(id: string, text: string): Promise<string> {
  ensureMermaidInit();
  const { svg } = await mermaid.render(id, text);
  return svg;
}
