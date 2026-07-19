import { Router } from 'express';
import { getDb } from '../db.js';
import {
  listConnections,
  createConnection,
  updateConnection,
  deleteConnection,
} from '../repos/connections.js';
import type { CreateConnectionInput, UpdateConnectionInput } from '../types.js';
import { isConnectionType } from './validate.js';

// Mounted at /api/maps/:mapId/connections
export const connectionsRouter = Router({ mergeParams: true });

connectionsRouter.get('/', (req, res) => {
  const { mapId } = req.params as unknown as { mapId: string };
  res.json(listConnections(getDb(), mapId));
});

connectionsRouter.post('/', (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  if (typeof b.from_area !== 'string' || typeof b.to_area !== 'string') {
    res.status(400).json({ error: 'from_area and to_area are required' });
    return;
  }
  if (!isConnectionType(b.type)) {
    res.status(400).json({ error: 'type is invalid' });
    return;
  }
  if (b.label !== undefined && typeof b.label !== 'string') {
    res.status(400).json({ error: 'label must be a string' });
    return;
  }
  if (b.bidirectional !== undefined && typeof b.bidirectional !== 'boolean') {
    res.status(400).json({ error: 'bidirectional must be a boolean' });
    return;
  }
  const input: CreateConnectionInput = {
    from_area: b.from_area,
    to_area: b.to_area,
    type: b.type,
    label: b.label as string | undefined,
    bidirectional: b.bidirectional as boolean | undefined,
  };
  const { mapId } = req.params as unknown as { mapId: string };
  const conn = createConnection(getDb(), mapId, input);
  if (!conn) {
    res.status(400).json({ error: 'from_area or to_area does not exist in this map' });
    return;
  }
  res.status(201).json(conn);
});

connectionsRouter.patch('/:connId', (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const patch: UpdateConnectionInput = {};
  if (b.from_area !== undefined) {
    if (typeof b.from_area !== 'string') {
      res.status(400).json({ error: 'from_area must be a string' });
      return;
    }
    patch.from_area = b.from_area;
  }
  if (b.to_area !== undefined) {
    if (typeof b.to_area !== 'string') {
      res.status(400).json({ error: 'to_area must be a string' });
      return;
    }
    patch.to_area = b.to_area;
  }
  if (b.type !== undefined) {
    if (!isConnectionType(b.type)) {
      res.status(400).json({ error: 'type is invalid' });
      return;
    }
    patch.type = b.type;
  }
  if (b.label !== undefined) {
    if (typeof b.label !== 'string') {
      res.status(400).json({ error: 'label must be a string' });
      return;
    }
    patch.label = b.label;
  }
  if (b.bidirectional !== undefined) {
    if (typeof b.bidirectional !== 'boolean') {
      res.status(400).json({ error: 'bidirectional must be a boolean' });
      return;
    }
    patch.bidirectional = b.bidirectional;
  }

  const { mapId } = req.params as unknown as { mapId: string };
  const id = Number(req.params.connId);
  const conn = updateConnection(getDb(), mapId, id, patch);
  if (!conn) {
    res.status(404).json({ error: 'connection not found (or endpoint area missing)' });
    return;
  }
  res.json(conn);
});

connectionsRouter.delete('/:connId', (req, res) => {
  const { mapId } = req.params as unknown as { mapId: string };
  const id = Number(req.params.connId);
  if (!deleteConnection(getDb(), mapId, id)) {
    res.status(404).json({ error: 'connection not found' });
    return;
  }
  res.status(204).end();
});
