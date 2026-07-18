import { Router } from 'express';
import { getDb } from '../db.js';
import {
  createMonster,
  updateMonster,
  deleteMonster,
} from '../repos/monsters.js';
import { parseMonsterInput } from './validate.js';

// Mounted at /api/maps/:mapId/areas/:areaId/monsters
export const monstersRouter = Router({ mergeParams: true });

monstersRouter.post('/', (req, res) => {
  const parsed = parseMonsterInput(req.body ?? {});
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { mapId, areaId } = req.params as unknown as { mapId: string; areaId: string };
  const monster = createMonster(getDb(), mapId, areaId, parsed.value);
  if (!monster) {
    res.status(404).json({ error: 'area not found' });
    return;
  }
  res.status(201).json(monster);
});

monstersRouter.patch('/:monsterId', (req, res) => {
  const parsed = parseMonsterInput(req.body ?? {});
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { mapId } = req.params as unknown as { mapId: string };
  const id = Number(req.params.monsterId);
  const monster = updateMonster(getDb(), mapId, id, parsed.value);
  if (!monster) {
    res.status(404).json({ error: 'monster not found' });
    return;
  }
  res.json(monster);
});

monstersRouter.delete('/:monsterId', (req, res) => {
  const { mapId } = req.params as unknown as { mapId: string };
  const id = Number(req.params.monsterId);
  if (!deleteMonster(getDb(), mapId, id)) {
    res.status(404).json({ error: 'monster not found' });
    return;
  }
  res.status(204).end();
});
