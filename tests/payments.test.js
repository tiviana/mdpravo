// Оплата: сумма из счёта, подтверждение сервером, повторные уведомления, отмена, адаптер ЮKassa.
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { Client, db, makeUser, resetRateLimits, start, stop } from './helpers.js';

before(start);
after(stop);
beforeEach(resetRateLimits);

const repos = await import('../src/repos/index.js');
const pay = await import('../src/payments/service.js');

async function setup(amountKop = 1500000) {
  const client = await makeUser();
  const lawyer = await makeUser('lawyer');
  const c = repos.cases.create({ clientId: client.id, title: 'Дело', lawyerId: lawyer.id });
  repos.cases.setStatus(c, 'need_payment', lawyer.id);
  const inv = repos.invoices.create({ caseRow: repos.cases.byId(c.id), amountKop, description: 'Подготовка жалобы', createdBy: lawyer.id });
  const http = new Client();
  await http.login(client.email, client.password);
  return { client, lawyer, c, inv, http };
}

test('возврат на сайт без подтверждения провайдера не делает счёт оплаченным', async () => {
  const { inv, http } = await setup();
  const r = await http.post(`/cabinet/invoices/${inv.number}/pay/`);
  assert.equal(r.status, 303);
  assert.match(r.location, /\/dev\/test-pay\//);
  const back = await http.get(`/cabinet/invoices/${inv.number}/?return=1`);
  assert.equal(back.status, 200);
  assert.equal(repos.invoices.byId(inv.id).status, 'pending');
  assert.match(back.text, /Ждём подтверждения оплаты/);
});

test('сумма платежа берётся из счёта; подменить её из формы нельзя', async () => {
  const { inv, http } = await setup(1234500);
  await http.post(`/cabinet/invoices/${inv.number}/pay/`, { amount: '1', amount_kop: '100' });
  const p = db.one('SELECT * FROM payments WHERE invoice_id = ?', inv.id);
  assert.equal(p.amount_kop, 1234500);
});

test('подтверждённая оплата: счёт оплачен, дело в работе; повторное уведомление ничего не дублирует', async () => {
  const { inv, c, http } = await setup();
  await http.post(`/cabinet/invoices/${inv.number}/pay/`);
  const p = db.one('SELECT * FROM payments WHERE invoice_id = ?', inv.id);
  pay.getProvider().set(p.provider_payment_id, 'succeeded');
  const n1 = await pay.handleNotification({ event: 'payment.succeeded', object: { id: p.provider_payment_id } }, 'test');
  const n2 = await pay.handleNotification({ event: 'payment.succeeded', object: { id: p.provider_payment_id } }, 'test');
  assert.equal(n1.status, 'succeeded');
  assert.equal(n2.status, 'succeeded');
  assert.equal(repos.invoices.byId(inv.id).status, 'paid');
  assert.equal(repos.cases.byId(c.id).status, 'in_progress');
  const paidEvents = db.one("SELECT COUNT(*) AS n FROM case_events WHERE case_id = ? AND kind = 'payment'", c.id).n;
  assert.equal(paidEvents, 1);
  const notes = db.one("SELECT COUNT(*) AS n FROM payment_notifications WHERE object_id = ?", p.provider_payment_id).n;
  assert.equal(notes, 1);
  // уже оплаченный счёт нельзя оплатить второй раз
  const again = await http.post(`/cabinet/invoices/${inv.number}/pay/`);
  assert.match(decodeURIComponent(again.location), /уже оплачен/);
});

test('поддельное уведомление «успешно» без подтверждения провайдера не меняет статус', async () => {
  const { inv, http } = await setup();
  await http.post(`/cabinet/invoices/${inv.number}/pay/`);
  const p = db.one('SELECT * FROM payments WHERE invoice_id = ?', inv.id);
  // провайдер по-прежнему говорит pending
  await pay.handleNotification({ event: 'payment.succeeded', object: { id: p.provider_payment_id, status: 'succeeded', paid: true } }, 'test');
  assert.equal(repos.invoices.byId(inv.id).status, 'pending');
});

test('отмена возвращает счёт к оплате; отмена после успеха игнорируется', async () => {
  const { inv, http } = await setup();
  await http.post(`/cabinet/invoices/${inv.number}/pay/`);
  const p = db.one('SELECT * FROM payments WHERE invoice_id = ?', inv.id);
  pay.getProvider().set(p.provider_payment_id, 'canceled');
  await pay.syncPayment(p);
  assert.equal(repos.invoices.byId(inv.id).status, 'issued');

  const second = await setup();
  await second.http.post(`/cabinet/invoices/${second.inv.number}/pay/`);
  const p2 = db.one('SELECT * FROM payments WHERE invoice_id = ?', second.inv.id);
  pay.getProvider().set(p2.provider_payment_id, 'succeeded');
  await pay.syncPayment(p2);
  const fresh = db.one('SELECT * FROM payments WHERE id = ?', p2.id);
  assert.equal(pay.applyRemote(fresh, { ...(await pay.getProvider().get(p2.provider_payment_id)), status: 'canceled' }).status, 'succeeded');
  assert.equal(repos.invoices.byId(second.inv.id).status, 'paid');
});

test('несовпадение суммы у провайдера блокирует применение', async () => {
  const { inv, http } = await setup();
  await http.post(`/cabinet/invoices/${inv.number}/pay/`);
  const p = db.one('SELECT * FROM payments WHERE invoice_id = ?', inv.id);
  const remote = { ...(await pay.getProvider().get(p.provider_payment_id)), status: 'succeeded', amountKop: 100 };
  assert.throws(() => pay.applyRemote(p, remote), /не совпадают/);
  assert.equal(repos.invoices.byId(inv.id).status, 'pending');
});

test('адаптер ЮKassa: Basic-авторизация, ключ идемпотентности, копейки без ошибок округления', async () => {
  const { createYookassa, _internal } = await import('../src/payments/yookassa.js');
  assert.equal(_internal.toKop('1500.10'), 150010);
  assert.equal(_internal.toKop('0.07'), 7);
  assert.equal(_internal.toValue(150010), '1500.10');
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({
      id: '2a8f1c3e-000f-5000-8000-1b2c3d4e5f60', status: 'pending', paid: false,
      amount: { value: '1500.10', currency: 'RUB' }, metadata: { invoice_id: '7' },
      confirmation: { type: 'redirect', confirmation_url: 'https://yoomoney.ru/checkout/payments/v2/contract?orderId=x' },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const yk = createYookassa({ shopId: '123', secretKey: 'test_secret', apiBase: 'https://api.yookassa.ru/v3' }, fakeFetch);
  const r = await yk.create({ amountKop: 150010, description: 'Тест', invoiceId: 7, idempotenceKey: 'idem-1', returnUrl: 'https://mdpravo.ru/x' });
  assert.equal(r.amountKop, 150010);
  assert.equal(r.invoiceId, 7);
  const { headers, body } = calls[0].init;
  assert.equal(headers.Authorization, 'Basic ' + Buffer.from('123:test_secret').toString('base64'));
  assert.equal(headers['Idempotence-Key'], 'idem-1');
  assert.equal(JSON.parse(body).amount.value, '1500.10');
  assert.equal(JSON.parse(body).capture, true);
});

test('проверка IP-диапазонов уведомлений', () => {
  const { inCidr } = pay._internal;
  assert.ok(inCidr('185.71.76.10', '185.71.76.0/27'));
  assert.ok(!inCidr('185.71.77.10', '185.71.76.0/27'));
  assert.ok(inCidr('::ffff:77.75.156.11', '77.75.156.11'));
});
