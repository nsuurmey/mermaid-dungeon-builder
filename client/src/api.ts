// Thin typed wrappers over the JSON API. All calls share the app origin, so
// cookies (the session gate) are sent automatically.

import type {
  Map,
  CreateMapInput,
  FullMap,
  Area,
  Connection,
  Monster,
} from './types';

export interface AuthStatus {
  authed: boolean;
  gateEnabled: boolean;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function ok(res: Response): Promise<void> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
}

// --- Auth ---

export function getAuthStatus(): Promise<AuthStatus> {
  return fetch('/api/auth/status').then(json<AuthStatus>);
}

export function login(password: string): Promise<{ authed: boolean }> {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  }).then(json<{ authed: boolean }>);
}

export function logout(): Promise<{ authed: boolean }> {
  return fetch('/api/auth/logout', { method: 'POST' }).then(json<{ authed: boolean }>);
}

// --- Maps ---

export function listMaps(): Promise<Map[]> {
  return fetch('/api/maps').then(json<Map[]>);
}

export function createMap(input: CreateMapInput): Promise<Map> {
  return fetch('/api/maps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).then(json<Map>);
}

export function deleteMap(id: string): Promise<void> {
  return fetch(`/api/maps/${id}`, { method: 'DELETE' }).then(ok);
}

function patchJson<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json<T>);
}

function postJson<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json<T>);
}

export function getFullMap(id: string): Promise<FullMap> {
  return fetch(`/api/maps/${id}/full`).then(json<FullMap>);
}

export function updateMap(id: string, patch: Partial<Map>): Promise<Map> {
  return patchJson<Map>(`/api/maps/${id}`, patch);
}

// --- Areas ---

export function createArea(mapId: string, input: Partial<Area> = {}): Promise<Area> {
  return postJson<Area>(`/api/maps/${mapId}/areas`, input);
}

export function updateArea(mapId: string, id: string, patch: Partial<Area>): Promise<Area> {
  return patchJson<Area>(`/api/maps/${mapId}/areas/${id}`, patch);
}

export function deleteArea(mapId: string, id: string): Promise<void> {
  return fetch(`/api/maps/${mapId}/areas/${id}`, { method: 'DELETE' }).then(ok);
}

// --- Connections ---

export function createConnection(
  mapId: string,
  input: Pick<Connection, 'from_area' | 'to_area' | 'type'> & Partial<Connection>,
): Promise<Connection> {
  return postJson<Connection>(`/api/maps/${mapId}/connections`, input);
}

export function updateConnection(
  mapId: string,
  id: number,
  patch: Partial<Connection>,
): Promise<Connection> {
  return patchJson<Connection>(`/api/maps/${mapId}/connections/${id}`, patch);
}

export function deleteConnection(mapId: string, id: number): Promise<void> {
  return fetch(`/api/maps/${mapId}/connections/${id}`, { method: 'DELETE' }).then(ok);
}

// --- Monsters ---

export function createMonster(
  mapId: string,
  areaId: string,
  input: Partial<Monster> = {},
): Promise<Monster> {
  return postJson<Monster>(`/api/maps/${mapId}/areas/${areaId}/monsters`, input);
}

export function updateMonster(
  mapId: string,
  id: number,
  patch: Partial<Monster>,
): Promise<Monster> {
  return patchJson<Monster>(`/api/maps/${mapId}/areas/_/monsters/${id}`, patch);
}

export function deleteMonster(mapId: string, id: number): Promise<void> {
  return fetch(`/api/maps/${mapId}/areas/_/monsters/${id}`, { method: 'DELETE' }).then(ok);
}
