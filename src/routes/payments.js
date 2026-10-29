// Уведомления платёжной системы и тестовая страница оплаты (только вне production).
import { config } from '../config.js';
import * as db from '../db/index.js';
import { HttpError, readRaw } from '../lib/http.js';
import { log } from '../lib/log.js';
import { assertRate, verifyCsrf } from '../lib/security.js';
import * as pay from '../payments/service.js';
import { invoices } from '../repos/index.js';
import { testPayPage } from '../views/cabinet.js';

export function registerPayments(r) {
  // Адрес для настроек ЮKassa: https://<домен>/payments/yookassa/webhook/
  r.post('/payments/yookassa/webhook/', async (ctx) => {
    if (config.payments.provider !== 'yookassa') throw new HttpError(404, 'Не найдено');
    if (!pay.ipAllowed(ctx.ip)) {
      log.warn('Уведомление с неразрешённого адреса отклонено');
      throw new HttpError(403, 'Запрещено');
    }
    assertRate(`webhook:${ctx.ip}`, 300, 60_000);
    let body;
    try {
      body = JSON.parse((await readRaw(ctx.req, 64 * 1024)).toString('utf8'));
    } catch {
      throw new HttpError(400, 'Некорректный JSON');
    }
    try {
      const result = await pay.handleNotification(body, 'yookassa');
      ctx.json(result);
    } catch (e) {
      // 5xx → ЮKassa повторит уведомление позже; это нужно, если её API временно недоступен
      if (e instanceof pay.PaymentError && e.status < 500) return ctx.json({ ok: false, error: e.message }, e.status);
      throw e;
    }
  }, { private: false });

  if (config.isProd) return;

  // Тестовая «страница оплаты» имитирует провайдера. Подтверждение всё равно идёт через syncPayment.
  r.get('/dev/test-pay/:id/', (ctx) => {
    const p = getTestPayment(ctx.params.id);
    ctx.html(testPayPage(ctx, p, invoices.byId(p.invoiceId)));
  });
  r.post('/dev/test-pay/:id/', async (ctx) => {
    await verifyCsrf(ctx);
    const p = getTestPayment(ctx.params.id);
    const result = (await ctx.form()).str('result', 20);
    if (!['succeeded', 'canceled', 'pending'].includes(result)) throw new HttpError(400, 'Неизвестный результат');
    const prov = pay.getProvider();
    prov.set(p.id, result, result === 'canceled' ? { cancelReason: 'canceled_by_merchant' } : {});
    // имитируем уведомление провайдера
    if (result !== 'pending') await pay.handleNotification({ event: `payment.${result}`, object: { id: p.id } }, 'test');
    const inv = invoices.byId(p.invoiceId);
    ctx.redirect(`/cabinet/invoices/${inv.number}/?return=1`);
  });
}

function getTestPayment(id) {
  const prov = pay.getProvider();
  if (prov.name !== 'test') throw new HttpError(404, 'Не найдено');
  const row = db.one("SELECT * FROM payments WHERE provider = 'test' AND provider_payment_id = ?", id);
  const p = prov.store.get(id);
  if (!row || !p) throw new HttpError(404, 'Платёж не найден');
  return p;
}
