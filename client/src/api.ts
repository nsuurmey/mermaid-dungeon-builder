// Thin typed wrappers over the JSON API. All calls share the app origin, so
// cookies (the session gate) are sent automatically.

import type { Map, CreateMapInput } from './types';

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
