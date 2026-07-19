import * as api from '../api';
import type { ReconcilePlan } from './reconcile';

/**
 * Executes a reconcile plan against the API in a FK-safe order:
 * direction, create areas (explicit ids), rename, delete areas (cascades their
 * edges), delete surviving edges, then create edges (all endpoints now exist).
 * Applied sequentially; the caller has already confirmed any area deletions.
 */
export async function applyPlan(mapId: string, plan: ReconcilePlan): Promise<void> {
  if (plan.direction) {
    await api.updateMap(mapId, { direction: plan.direction });
  }
  for (const a of plan.createAreas) {
    await api.createArea(mapId, { id: a.id, name: a.name });
  }
  for (const a of plan.renameAreas) {
    await api.updateArea(mapId, a.id, { name: a.name });
  }
  for (const id of plan.deleteAreaIds) {
    await api.deleteArea(mapId, id);
  }
  for (const id of plan.deleteEdgeIds) {
    await api.deleteConnection(mapId, id);
  }
  for (const e of plan.createEdges) {
    await api.createConnection(mapId, {
      from_area: e.from,
      to_area: e.to,
      type: e.type,
      label: e.label,
      bidirectional: e.bidirectional,
    });
  }
}
