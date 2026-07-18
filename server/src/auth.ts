import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { APP_PASSWORD, AUTH_SECRET, isProd } from './env.js';

const COOKIE = 'eem_session';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * The password gate is only active when APP_PASSWORD is set. With no password
 * configured (local dev) the app is wide open — production MUST set one.
 */
export const gateEnabled = (): boolean => APP_PASSWORD.length > 0;

function signingSecret(): string {
  return AUTH_SECRET || APP_PASSWORD || 'insecure-dev-secret';
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function issueToken(): string {
  const payload = `auth.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf('.');
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  return safeEqual(sig, sign(payload));
}

export function checkPassword(input: string): boolean {
  if (!gateEnabled()) return true;
  return safeEqual(input, APP_PASSWORD);
}

export function isAuthed(req: Request): boolean {
  if (!gateEnabled()) return true;
  return verifyToken(req.cookies?.[COOKIE]);
}

export function setSessionCookie(res: Response): void {
  res.cookie(COOKIE, issueToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: MAX_AGE_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE);
}

/** Express middleware: 401s unauthenticated requests when the gate is on. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isAuthed(req)) {
    next();
    return;
  }
  res.status(401).json({ error: 'unauthorized' });
}
