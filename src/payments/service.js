// Логика оплаты счетов. Правила:
// 1. Сумма берётся только из счёта в БД, никогда из запроса клиента.
// 2. Статус подтверждается запросом к провайдеру (sync), а не возвратом на сайт и не телом уведомления.
// 3. Повторная обработка безопасна: переходы статусов только вперёд, уведомления журналируются.
import crypto from 'node:crypto';
import { config } from '../config.js';
import * as db from '../db/index.js';
import { log } from '../lib/log.js';
import { cases, invoices, users } from '../repos/index.js';
import { createTestProvider } from './testprovider.js';
import { createYookassa } from './yookassa.js';

let provider = null;

export function getProvider() {
  if (provider) return provider;
  const name = config.payments.provider;
  if (name === 'yookassa') provider = createYookassa();
  else if (name === 'test') provider = createTestProvider();
  else throw new Error(`Неизвестный платёжный провайдер: ${name}`);
  return provider;
}

/** Для тестов: подменить провайдера. */
export function setProvider(p) {
  provider = p;
}

const RANK = { pending: 0, waiting_for_capture: 1, succeeded: 2, canceled: 2, partially_refunded: 3, refunded: 4 };

export class PaymentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Начать оплату счёта. Возвращает URL страницы оплаты провайдера. */
export async function startPayment(invoice, user) {
  if (invoice.client_id !== user.id) throw new PaymentError('Счёт не найден', 404);
  if (invoice.status === 'paid') throw new PaymentError('Счёт уже оплачен');
  if (!['issued', 'pending'].includes(invoice.status)) throw new PaymentError('Этот счёт нельзя оплатить');

  // не создаём второй платёж, пока первый ещё может завершиться
  const open = db.one(
    `SELECT * FROM payments WHERE invoice_id = ? AND status IN ('pending', 'waiting_for_capture')
     ORDER BY id DESC LIMIT 1`,
    invoice.id,
  );
  if (open && open.confirmation_url && Date.now() - Date.parse(open.created_at) < 50 * 60_000) {
    return open.confirmation_url;
  }

  const p = getProvider();
  const idempotenceKey = crypto.randomUUID();
  const remote = await p.create({
    amountKop: invoice.amount_kop,
    description: `Счёт ${invoice.number}: ${invoice.description}`,
    invoiceId: invoice.id,
    idempotenceKey,
    returnUrl: `${config.baseUrl}/cabinet/invoices/${invoice.number}/?return=1`,
    customerEmail: users.byId(invoice.client_id)?.email || null,
  });
  if (remote.amountKop !== invoice.amount_kop) {
    throw new PaymentError('Провайдер вернул другую сумму — оплата остановлена', 502);
  }
  const t = db.now();
  db.tx(() => {
    db.run(
      `INSERT INTO payments (invoice_id, provider, provider_payment_id, idempotence_key, amount_kop, status,
         confirmation_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      invoice.id, p.name, remote.id, idempotenceKey, invoice.amount_kop, remote.status, remote.confirmationUrl, t, t,
    );
    db.run("UPDATE invoices SET status = 'pending', updated_at = ? WHERE id = ? AND status = 'issued'", t, invoice.id);
  });
  if (!remote.confirmationUrl) throw new PaymentError('Провайдер не вернул страницу оплаты', 502);
  return remote.confirmationUrl;
}

/** Применить подтверждённое провайдером состояние платежа. Идемпотентно. */
export function applyRemote(payment, remote) {
  if (remote.id !== payment.provider_payment_id) throw new PaymentError('Несовпадение идентификатора платежа', 409);
  if (remote.amountKop !== payment.amount_kop || (remote.invoiceId && remote.invoiceId !== payment.invoice_id)) {
    log.error('Платёж не совпадает со счётом — изменения не применены', { payment: payment.id });
    throw new PaymentError('Данные платежа не совпадают со счётом', 409);
  }
  let status = remote.status;
  if (status === 'succeeded' && remote.refundedKop > 0) {
    status = remote.refundedKop >= payment.amount_kop ? 'refunded' : 'partially_refunded';
  }
  if (!(status in RANK)) return payment;
  if (RANK[status] < RANK[payment.status] || status === payment.status) return payment;
  // отмена после успешной оплаты невозможна — игнорируем такой «переход»
  if (payment.status === 'succeeded' && status === 'canceled') return payment;

  const t = db.now();
  db.tx(() => {
    db.run(
      'UPDATE payments SET status = ?, cancel_reason = ?, paid_at = COALESCE(paid_at, ?), updated_at = ? WHERE id = ?',
      status, remote.cancelReason, status === 'succeeded' ? t : null, t, payment.id,
    );
    const inv = invoices.byId(payment.invoice_id);
    const caseRow = cases.byId(inv.case_id);
    if (status === 'succeeded' && inv.status !== 'paid') {
      db.run("UPDATE invoices SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ?", t, t, inv.id);
      cases.addEvent(caseRow.id, null, 'payment', `Счёт ${inv.number} оплачен`);
      if (caseRow.status === 'need_payment') cases.setStatus(caseRow, 'in_progress', null, 'оплата получена');
    } else if (status === 'canceled' && inv.status === 'pending') {
      const other = db.one(
        "SELECT 1 AS x FROM payments WHERE invoice_id = ? AND id != ? AND status IN ('pending', 'waiting_for_capture', 'succeeded')",
        inv.id, payment.id,
      );
      if (!other) db.run("UPDATE invoices SET status = 'issued', updated_at = ? WHERE id = ?", t, inv.id);
    } else if (status === 'refunded') {
      db.run("UPDATE invoices SET status = 'refunded', updated_at = ? WHERE id = ?", t, inv.id);
      cases.addEvent(caseRow.id, null, 'payment', `Оплата по счёту ${inv.number} возвращена`);
    }
  });
  return db.one('SELECT * FROM payments WHERE id = ?', payment.id);
}

/** Запросить статус у провайдера и применить. */
export async function syncPayment(payment) {
  const remote = await getProvider().get(payment.provider_payment_id);
  return applyRemote(payment, remote);
}

export async function syncInvoice(invoice) {
  const open = db.all(
    "SELECT * FROM payments WHERE invoice_id = ? AND status IN ('pending', 'waiting_for_capture', 'succeeded') ORDER BY id DESC LIMIT 3",
    invoice.id,
  );
  for (const p of open) {
    try {
      await syncPayment(p);
    } catch (e) {
      log.warn('Не удалось обновить статус платежа', { payment: p.id, error: e.message });
    }
  }
  return invoices.byId(invoice.id);
}

/** Входящее уведомление провайдера. Тело используется только чтобы узнать id платежа. */
export async function handleNotification(body, providerName = getProvider().name) {
  const event = typeof body?.event === 'string' ? body.event.slice(0, 64) : '';
  const obj = body?.object || {};
  const paymentId = event.startsWith('refund.') ? obj.payment_id : obj.id;
  if (!event || typeof paymentId !== 'string') throw new PaymentError('Некорректное уведомление', 400);
  const payment = db.one('SELECT * FROM payments WHERE provider = ? AND provider_payment_id = ?', providerName, paymentId);
  if (!payment) {
    log.warn('Уведомление о неизвестном платеже', { event });
    return { ok: true, ignored: true };
  }
  const updated = await syncPayment(payment);
  db.run(
    `INSERT INTO payment_notifications (provider, event, object_id, verified_status, received_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(provider, event, object_id) DO NOTHING`,
    providerName, event, String(obj.id || paymentId), updated.status, db.now(),
  );
  return { ok: true, status: updated.status };
}

export function paymentsForInvoice(invoiceId) {
  return db.all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY id DESC', invoiceId);
}

export function paymentHistory(clientId) {
  return db.all(
    `SELECT p.*, i.number AS invoice_number, i.description FROM payments p JOIN invoices i ON i.id = p.invoice_id
      WHERE i.client_id = ? ORDER BY p.id DESC`,
    clientId,
  );
}

export function ipAllowed(ip) {
  const list = config.payments.yookassa.webhookIps;
  if (!list.length) return true;
  return list.some((cidr) => inCidr(ip, cidr));
}

function inCidr(ip, cidr) {
  const v4 = ip.replace(/^::ffff:/, '');
  const [base, bitsStr] = cidr.split('/');
  if (!base.includes('.') || !v4.includes('.')) return ip === cidr;
  const bits = Number(bitsStr ?? 32);
  const toInt = (s) => s.split('.').reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (toInt(v4) & mask) === (toInt(base) & mask);
}

export const _internal = { inCidr };
