// Thin typed wrappers over the JSON API. All calls share the app origin, so
// cookies (the session gate) are sent automatically.

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

export function ping(): Promise<{ pong: boolean; time: string }> {
  return fetch('/api/ping').then(json<{ pong: boolean; time: string }>);
}
