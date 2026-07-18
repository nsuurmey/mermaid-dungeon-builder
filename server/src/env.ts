import path from 'node:path';

/** Server port. Railway injects PORT in production. */
export const PORT = Number(process.env.PORT ?? 3001);

/** Directory holding the SQLite DB. Defaults to the Railway volume mount. */
export const DATA_DIR = process.env.DATA_DIR ?? '/data';

/** Absolute path to the SQLite database file. */
export const DB_PATH = path.join(DATA_DIR, 'maps.db');

/** Shared password gate. Empty string means the gate is disabled (dev only). */
export const APP_PASSWORD = process.env.APP_PASSWORD ?? '';

/** Dedicated secret for signing session cookies. Falls back to APP_PASSWORD. */
export const AUTH_SECRET = process.env.AUTH_SECRET ?? '';

export const isProd = process.env.NODE_ENV === 'production';
