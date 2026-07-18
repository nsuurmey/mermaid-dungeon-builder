import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { PORT, DB_PATH, isProd } from './env.js';
import { getDb } from './db.js';
import { mapsRouter } from './routes/maps.js';
import {
  requireAuth,
  isAuthed,
  gateEnabled,
  checkPassword,
  setSessionCookie,
  clearSessionCookie,
} from './auth.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

// --- Health check (unprotected; used by Railway) ---
app.get('/api/health', (_req, res) => {
  let dbOk = false;
  try {
    getDb().prepare('SELECT 1').get();
    dbOk = true;
  } catch {
    dbOk = false;
  }
  res.json({ ok: true, dbOk, dbPath: DB_PATH });
});

// --- Auth (unprotected) ---
app.get('/api/auth/status', (req, res) => {
  res.json({ authed: isAuthed(req), gateEnabled: gateEnabled() });
});

app.post('/api/auth/login', (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!checkPassword(password)) {
    res.status(401).json({ error: 'invalid password' });
    return;
  }
  setSessionCookie(res);
  res.json({ authed: true });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ authed: false });
});

// --- Protected API ---
app.use('/api/maps', requireAuth, mapsRouter);

// --- Static frontend (served when a client build exists) ---
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(serverDir, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback — everything that isn't an API route serves index.html.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Open the DB at boot so a bad volume fails fast and loudly.
getDb();

app.listen(PORT, () => {
  console.log(`[eem] listening on :${PORT} (prod=${isProd}) db=${DB_PATH}`);
  if (!gateEnabled()) {
    console.warn('[eem] WARNING: APP_PASSWORD not set — auth gate is DISABLED.');
  }
});
