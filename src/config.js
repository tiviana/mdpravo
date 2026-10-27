// Конфигурация из переменных окружения. Секреты — только здесь, никогда в коде и не во frontend.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;

const nodeEnv = env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

function int(v, d) {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : d;
}

export const config = {
  root: ROOT,
  env: nodeEnv,
  isProd,
  isTest,
  host: env.HOST || '127.0.0.1',
  port: int(env.PORT, 3000),
  baseUrl: (env.BASE_URL || `http://localhost:${int(env.PORT, 3000)}`).replace(/\/$/, ''),
  trustProxy: env.TRUST_PROXY === '1',
  dbPath: env.DB_PATH || path.join(ROOT, 'data', isTest ? 'test.sqlite' : 'app.sqlite'),
  storageDir: env.STORAGE_DIR || path.join(ROOT, 'storage'),
  publicDir: path.join(ROOT, 'public'),
  legacyContentPath: env.LEGACY_CONTENT || path.join(ROOT, 'data', 'legacy-content.json'),
  uploads: {
    maxBytes: int(env.UPLOAD_MAX_MB, 20) * 1024 * 1024,
  },
  session: {
    days: int(env.SESSION_DAYS, 14),
  },
  smtp: {
    host: env.SMTP_HOST || '',
    port: int(env.SMTP_PORT, 465),
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.SMTP_FROM || 'Мосдевелопмент Право <mail@mdpravo.ru>',
  },
  notifyEmail: env.REQUESTS_NOTIFY_EMAIL || '',
  payments: {
    provider: env.PAYMENT_PROVIDER || (isProd ? 'yookassa' : 'test'),
    yookassa: {
      shopId: env.YOOKASSA_SHOP_ID || '',
      secretKey: env.YOOKASSA_SECRET_KEY || '',
      apiBase: env.YOOKASSA_API_BASE || 'https://api.yookassa.ru/v3',
      receipts: env.YOOKASSA_RECEIPTS === '1',
      vatCode: int(env.YOOKASSA_VAT_CODE, 1),
      // Проверка IP отправителя уведомлений. Список диапазонов публикует ЮKassa;
      // задаётся через переменную, чтобы его можно было обновить без релиза.
      webhookIps: (env.YOOKASSA_WEBHOOK_IPS || '').split(',').map((s) => s.trim()).filter(Boolean),
    },
  },
  metrikaId: env.YANDEX_METRIKA_ID || '',
};

/** Проверки, без которых production запускать нельзя. Возвращает список проблем. */
export function configProblems(c = config) {
  const p = [];
  if (!c.isProd) return p;
  if (!c.baseUrl.startsWith('https://')) p.push('BASE_URL должен начинаться с https://');
  if (c.payments.provider === 'test') p.push('PAYMENT_PROVIDER=test запрещён в production');
  if (c.payments.provider === 'yookassa' && (!c.payments.yookassa.shopId || !c.payments.yookassa.secretKey)) {
    p.push('Не заданы YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY');
  }
  if (!c.smtp.host) p.push('Не задан SMTP_HOST: коды входа не будут отправляться');
  return p;
}
