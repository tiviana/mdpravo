// Заголовки безопасности, CSRF и ограничение частоты запросов.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from './http.js';

export function securityHeaders() {
  const metrika = config.metrikaId ? ' https://mc.yandex.ru https://mc.yandex.com' : '';
  const csp = [
    "default-src 'self'",
    `script-src 'self'${metrika}`,
    "style-src 'self'",
    `img-src 'self' data:${metrika}`,
    "font-src 'self'",
    `connect-src 'self'${metrika}`,
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    // переход к оплате — редирект после POST, поэтому платёжные домены разрешены в form-action
    "form-action 'self' https://yoomoney.ru https://*.yoomoney.ru https://*.yookassa.ru",
    ...(config.isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const h = {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
  };
  if (config.isProd) h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return h;
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

const CSRF_COOKIE = 'csrf';

/** Выдаёт CSRF-токен (double submit cookie). Вызывается при рендере форм. */
export function csrfToken(ctx) {
  if (ctx.state.csrf) return ctx.state.csrf;
  let t = ctx.cookies[CSRF_COOKIE];
  if (!t || !/^[A-Za-z0-9_-]{40,60}$/.test(t)) {
    t = randomToken(32);
    ctx.setCookie(CSRF_COOKIE, t, { maxAge: 60 * 60 * 24 * 7 });
    ctx.cookies[CSRF_COOKIE] = t;
  }
  ctx.state.csrf = t;
  return t;
}

/** Проверка источника и CSRF-токена для изменяющих запросов. */
export async function verifyCsrf(ctx) {
  const expectedHost = new URL(config.baseUrl).host;
  const origin = ctx.req.headers.origin;
  const referer = ctx.req.headers.referer;
  const src = origin && origin !== 'null' ? origin : referer;
  if (!src) throw new HttpError(403, 'Запрос отклонён: не удалось проверить источник');
  let host;
  try {
    host = new URL(src).host;
  } catch {
    throw new HttpError(403, 'Запрос отклонён: неизвестный источник');
  }
  if (host !== expectedHost) throw new HttpError(403, 'Запрос отклонён: чужой источник');
  const form = await ctx.form(config.uploads.maxBytes + 1024 * 1024);
  const sent = form.get('_csrf') || ctx.req.headers['x-csrf-token'];
  const cookie = ctx.cookies[CSRF_COOKIE];
  if (!sent || !cookie || !safeEqual(sent, cookie)) {
    throw new HttpError(403, 'Сессия формы устарела. Обновите страницу и отправьте ещё раз.');
  }
}

// ── Ограничение частоты (fixed window, в памяти процесса) ─────────────────
const buckets = new Map();

export function rateLimit(key, max, windowMs, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

export function assertRate(key, max, windowMs, message = 'Слишком много попыток. Попробуйте через несколько минут.') {
  if (!rateLimit(key, max, windowMs)) throw new HttpError(429, message);
}

export function resetRateLimits() {
  buckets.clear();
}

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
}, 60_000).unref();
