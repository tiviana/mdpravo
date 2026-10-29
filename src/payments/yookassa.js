// Адаптер ЮKassa (API v3). Статус платежа всегда берётся запросом GET /payments/{id}
// с ключами магазина — тело уведомления не считается доказательством оплаты.
import { config } from '../config.js';

export class PaymentProviderError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function auth(c) {
  return 'Basic ' + Buffer.from(`${c.shopId}:${c.secretKey}`).toString('base64');
}

function toValue(kop) {
  return (kop / 100).toFixed(2);
}

function toKop(value) {
  // "1500.00" → 150000 без ошибок двоичной арифметики
  const [r, k = ''] = String(value).split('.');
  return Number(r) * 100 + Number((k + '00').slice(0, 2));
}

export function createYookassa(c = config.payments.yookassa, fetchImpl = globalThis.fetch) {
  async function api(method, path, body, idempotenceKey) {
    const headers = { Authorization: auth(c), 'Content-Type': 'application/json' };
    if (idempotenceKey) headers['Idempotence-Key'] = idempotenceKey;
    let res;
    try {
      res = await fetchImpl(`${c.apiBase}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      throw new PaymentProviderError(`ЮKassa недоступна: ${e.message}`, 502);
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new PaymentProviderError(`ЮKassa ответила ${res.status}: ${data?.description || data?.code || 'ошибка'}`, res.status);
    }
    return data;
  }

  function normalize(p) {
    return {
      id: p.id,
      status: p.status, // pending | waiting_for_capture | succeeded | canceled
      amountKop: toKop(p.amount?.value),
      currency: p.amount?.currency,
      invoiceId: Number(p.metadata?.invoice_id) || null,
      paid: Boolean(p.paid),
      refundedKop: p.refunded_amount ? toKop(p.refunded_amount.value) : 0,
      confirmationUrl: p.confirmation?.confirmation_url || null,
      cancelReason: p.cancellation_details?.reason || null,
      test: Boolean(p.test),
    };
  }

  return {
    name: 'yookassa',
    async create({ amountKop, description, invoiceId, idempotenceKey, returnUrl, customerEmail }) {
      const body = {
        amount: { value: toValue(amountKop), currency: 'RUB' },
        capture: true,
        confirmation: { type: 'redirect', return_url: returnUrl },
        description: description.slice(0, 128),
        metadata: { invoice_id: String(invoiceId) },
      };
      if (c.receipts && customerEmail) {
        // чек 54-ФЗ, если включён в магазине ЮKassa
        body.receipt = {
          customer: { email: customerEmail },
          items: [{
            description: description.slice(0, 128),
            quantity: '1.00',
            amount: { value: toValue(amountKop), currency: 'RUB' },
            vat_code: c.vatCode,
            payment_mode: 'full_payment',
            payment_subject: 'service',
          }],
        };
      }
      return normalize(await api('POST', '/payments', body, idempotenceKey));
    },
    async get(id) {
      if (!/^[A-Za-z0-9-]{10,60}$/.test(id)) throw new PaymentProviderError('Некорректный идентификатор платежа', 400);
      return normalize(await api('GET', `/payments/${encodeURIComponent(id)}`));
    },
  };
}

export const _internal = { toKop, toValue };
