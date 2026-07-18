import { Router } from 'express';
import { getDb } from '../db.js';
import {
  listMaps,
  getMap,
  createMap,
  updateMap,
  deleteMap,
} from '../repos/maps.js';
import { listAreas } from '../repos/areas.js';
import { listConnections } from '../repos/connections.js';
import { listMonstersForMap } from '../repos/monsters.js';
import { areasRouter } from './areas.js';
import { connectionsRouter } from './connections.js';
import {
  TONES,
  DIRECTIONS,
  type CreateMapInput,
  type UpdateMapInput,
  type Tone,
  type Direction,
  type FullMap,
} from '../types.js';

export const mapsRouter = Router();

function isTone(v: unknown): v is Tone {
  return typeof v === 'string' && (TONES as readonly string[]).includes(v);
}
function isDirection(v: unknown): v is Direction {
  return typeof v === 'string' && (DIRECTIONS as readonly string[]).includes(v);
}

mapsRouter.get('/', (_req, res) => {
  res.json(listMaps(getDb()));
});

mapsRouter.post('/', (req, res) => {
  const body = req.body ?? {};
  if (typeof body.title !== 'string' || body.title.trim() === '') {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  if (!isTone(body.tone)) {
    res.status(400).json({ error: `tone must be one of: ${TONES.join(', ')}` });
    return;
  }
  if (body.direction !== undefined && !isDirection(body.direction)) {
    res.status(400).json({ error: `direction must be one of: ${DIRECTIONS.join(', ')}` });
    return;
  }
  if (body.notes !== undefined && typeof body.notes !== 'string') {
    res.status(400).json({ error: 'notes must be a string' });
    return;
  }
  const input: CreateMapInput = {
    title: body.title.trim(),
    tone: body.tone,
    notes: body.notes,
    direction: body.direction,
  };
  res.status(201).json(createMap(getDb(), input));
});

mapsRouter.get('/:id', (req, res) => {
  const map = getMap(getDb(), req.params.id);
  if (!map) {
    res.status(404).json({ error: 'map not found' });
    return;
  }
  res.json(map);
});

// Everything the editor needs to load one map in a single round trip.
mapsRouter.get('/:id/full', (req, res) => {
  const db = getDb();
  const map = getMap(db, req.params.id);
  if (!map) {
    res.status(404).json({ error: 'map not found' });
    return;
  }
  const full: FullMap = {
    map,
    areas: listAreas(db, map.id),
    connections: listConnections(db, map.id),
    monsters: listMonstersForMap(db, map.id),
  };
  res.json(full);
});

mapsRouter.patch('/:id', (req, res) => {
  const body = req.body ?? {};
  const patch: UpdateMapInput = {};
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      res.status(400).json({ error: 'title must be a non-empty string' });
      return;
    }
    patch.title = body.title.trim();
  }
  if (body.tone !== undefined) {
    if (!isTone(body.tone)) {
      res.status(400).json({ error: `tone must be one of: ${TONES.join(', ')}` });
      return;
    }
    patch.tone = body.tone;
  }
  if (body.direction !== undefined) {
    if (!isDirection(body.direction)) {
      res.status(400).json({ error: `direction must be one of: ${DIRECTIONS.join(', ')}` });
      return;
    }
    patch.direction = body.direction;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') {
      res.status(400).json({ error: 'notes must be a string' });
      return;
    }
    patch.notes = body.notes;
  }

  const map = updateMap(getDb(), req.params.id, patch);
  if (!map) {
    res.status(404).json({ error: 'map not found' });
    return;
  }
  res.json(map);
});

mapsRouter.delete('/:id', (req, res) => {
  if (!deleteMap(getDb(), req.params.id)) {
    res.status(404).json({ error: 'map not found' });
    return;
  }
  res.status(204).end();
});

// Nested resources.
mapsRouter.use('/:mapId/areas', areasRouter);
mapsRouter.use('/:mapId/connections', connectionsRouter);
