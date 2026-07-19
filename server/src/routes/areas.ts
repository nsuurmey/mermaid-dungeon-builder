import { Router } from 'express';
import { getDb } from '../db.js';
import {
  listAreas,
  getArea,
  createArea,
  createAreaWithId,
  updateArea,
  deleteArea,
} from '../repos/areas.js';
import type { UpdateAreaInput } from '../types.js';
import { monstersRouter } from './monsters.js';

// Mounted at /api/maps/:mapId/areas
export const areasRouter = Router({ mergeParams: true });

const TEXT_FIELDS = ['name', 'description', 'gm_notes', 'treasure', 'features'] as const;

function parseAreaPatch(body: unknown): { ok: true; value: UpdateAreaInput } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'body must be an object' };
  }
  const b = body as Record<string, unknown>;
  const out: UpdateAreaInput = {};
  for (const field of TEXT_FIELDS) {
    if (b[field] === undefined) continue;
    if (typeof b[field] !== 'string') {
      return { ok: false, error: `${field} must be a string` };
    }
    out[field] = b[field] as string;
  }
  return { ok: true, value: out };
}

areasRouter.get('/', (req, res) => {
  const { mapId } = req.params as unknown as { mapId: string };
  res.json(listAreas(getDb(), mapId));
});

areasRouter.post('/', (req, res) => {
  const parsed = parseAreaPatch(req.body ?? {});
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { mapId } = req.params as unknown as { mapId: string };
  const rawId = (req.body as Record<string, unknown> | undefined)?.id;

  // Explicit id (from Mermaid text / import) vs auto-minted slug (form add).
  if (rawId !== undefined) {
    if (typeof rawId !== 'string' || !/^[A-Za-z][\w]*$/.test(rawId)) {
      res.status(400).json({ error: 'id must match [A-Za-z][A-Za-z0-9_]*' });
      return;
    }
    const result = createAreaWithId(getDb(), mapId, rawId, parsed.value);
    if (result === 'no-map') {
      res.status(404).json({ error: 'map not found' });
      return;
    }
    if (result === 'conflict') {
      res.status(409).json({ error: `area id "${rawId}" already exists` });
      return;
    }
    res.status(201).json(result);
    return;
  }

  const area = createArea(getDb(), mapId, parsed.value);
  if (!area) {
    res.status(404).json({ error: 'map not found' });
    return;
  }
  res.status(201).json(area);
});

areasRouter.get('/:areaId', (req, res) => {
  const { mapId, areaId } = req.params as unknown as { mapId: string; areaId: string };
  const area = getArea(getDb(), mapId, areaId);
  if (!area) {
    res.status(404).json({ error: 'area not found' });
    return;
  }
  res.json(area);
});

areasRouter.patch('/:areaId', (req, res) => {
  const parsed = parseAreaPatch(req.body ?? {});
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { mapId, areaId } = req.params as unknown as { mapId: string; areaId: string };
  const area = updateArea(getDb(), mapId, areaId, parsed.value);
  if (!area) {
    res.status(404).json({ error: 'area not found' });
    return;
  }
  res.json(area);
});

areasRouter.delete('/:areaId', (req, res) => {
  const { mapId, areaId } = req.params as unknown as { mapId: string; areaId: string };
  if (!deleteArea(getDb(), mapId, areaId)) {
    res.status(404).json({ error: 'area not found' });
    return;
  }
  res.status(204).end();
});

// Monsters live under an area.
areasRouter.use('/:areaId/monsters', monstersRouter);
