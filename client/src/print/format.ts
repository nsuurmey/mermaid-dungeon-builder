import type { Area, Monster } from '../types';

/** Signs a modifier: +1, -1, or 0 (zero shown without a sign, per the PRD). */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/**
 * Compact Eem stat line for the printed key (PRD §5), e.g.:
 * `Mire Squix (Goon, Lv 2) — Courage 2 · Atk +1 · Def -1 · Block 0 · Dread 1d6 · Actions 1 — Vulnerable: bright light`
 * Missing fields are omitted rather than shown blank. Eem terms only — no AC/HP.
 */
export function formatMonsterStatLine(m: Monster): string {
  const name = m.name.trim() || '(unnamed)';
  const paren = [m.class_tier, m.level != null ? `Lv ${m.level}` : null]
    .filter(Boolean)
    .join(', ');
  const head = paren ? `${name} (${paren})` : name;

  const stats: string[] = [];
  if (m.courage.trim()) stats.push(`Courage ${m.courage.trim()}`);
  if (m.attack != null) stats.push(`Atk ${signed(m.attack)}`);
  if (m.defense != null) stats.push(`Def ${signed(m.defense)}`);
  if (m.block != null) stats.push(`Block ${signed(m.block)}`);
  if (m.dread.trim()) stats.push(`Dread ${m.dread.trim()}`);
  if (m.actions != null) stats.push(`Actions ${m.actions}`);

  let line = head;
  if (stats.length) line += ` — ${stats.join(' · ')}`;
  if (m.vulnerabilities.trim()) line += ` — Vulnerable: ${m.vulnerabilities.trim()}`;
  return line;
}

/** Numeric slug order (A1, A2, …, A10), falling back to locale compare. */
export function byAreaId(a: Area, b: Area): number {
  const na = /^A(\d+)$/.exec(a.id);
  const nb = /^A(\d+)$/.exec(b.id);
  if (na && nb) return Number(na[1]) - Number(nb[1]);
  return a.id.localeCompare(b.id);
}
