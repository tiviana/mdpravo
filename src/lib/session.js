// Сессии: случайный идентификатор в cookie, в БД хранится только его SHA-256.
import { config } from '../config.js';
import * as db from '../db/index.js';
import { HttpError } from './http.js';
import { randomToken, sha256 } from './security.js';

export const SESSION_COOKIE = config.baseUrl.startsWith('https://') ? '__Host-sid' : 'sid';

export function createSession(ctx, userId) {
  // при входе старая сессия уничтожается (защита от фиксации сессии)
  destroySession(ctx);
  const token = randomToken(32);
  const t = db.now();
  const expires = new Date(Date.now() + config.session.days * 86400_000).toISOString();
  db.run(
    'INSERT INTO sessions (id_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)',
    sha256(token), userId, t, expires, t,
  );
  ctx.setCookie(SESSION_COOKIE, token, { maxAge: config.session.days * 86400 });
  db.run('INSERT INTO audit_log (user_id, action, created_at) VALUES (?, ?, ?)', userId, 'login', t);
}

export function destroySession(ctx) {
  const token = ctx.cookies[SESSION_COOKIE];
  if (token) db.run('DELETE FROM sessions WHERE id_hash = ?', sha256(token));
  if (token) ctx.clearCookie(SESSION_COOKIE);
  ctx.user = null;
}

export function loadSession(ctx) {
  const token = ctx.cookies[SESSION_COOKIE];
  if (!token || token.length > 100) return;
  const row = db.one(
    `SELECT s.id_hash, s.expires_at, s.last_seen_at, u.*
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id_hash = ?`,
    sha256(token),
  );
  if (!row) return;
  if (row.expires_at < db.now() || row.disabled_at) {
    db.run('DELETE FROM sessions WHERE id_hash = ?', row.id_hash);
    return;
  }
  // обновляем отметку активности не чаще раза в 10 минут
  if (Date.now() - Date.parse(row.last_seen_at) > 600_000) {
    db.run('UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?', db.now(), row.id_hash);
  }
  const { id_hash, expires_at, last_seen_at, password_hash, ...user } = row;
  ctx.user = { ...user, hasPassword: Boolean(password_hash) };
}

export function destroyAllSessions(userId, exceptCtx) {
  const keep = exceptCtx?.cookies[SESSION_COOKIE];
  if (keep) db.run('DELETE FROM sessions WHERE user_id = ? AND id_hash != ?', userId, sha256(keep));
  else db.run('DELETE FROM sessions WHERE user_id = ?', userId);
}

export function requireUser(ctx) {
  if (!ctx.user) {
    const next = encodeURIComponent(ctx.path + ctx.url.search);
    throw Object.assign(new HttpError(401, 'Нужно войти'), { redirect: `/login/?next=${next}` });
  }
  return ctx.user;
}

export function requireStaff(ctx) {
  const u = requireUser(ctx);
  if (u.role !== 'lawyer' && u.role !== 'admin') throw new HttpError(404, 'Страница не найдена');
  return u;
}

export function isStaff(u) {
  return u && (u.role === 'lawyer' || u.role === 'admin');
}

/** Безопасный адрес возврата после входа: только относительный путь на этом сайте. */
export function safeNext(next, fallback = '/cabinet/') {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next.slice(0, 500);
}
