// Безопасность: заголовки, CSRF, вход, изоляция клиентов, документы, XSS.
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { Client, makeUser, resetRateLimits, start, stop } from './helpers.js';

before(start);
after(stop);
beforeEach(resetRateLimits);

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

async function caseFor(client, title = 'Тестовое дело') {
  const { cases } = await import('../src/repos/index.js');
  return cases.create({ clientId: client.id, title });
}

test('заголовки безопасности на каждой странице', async () => {
  const r = await new Client().get('/');
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
});

test('POST без CSRF-токена или с чужим Origin отклоняется', async () => {
  const c = new Client();
  await c.get('/');
  const noToken = await c.req('POST', '/request/', { body: new URLSearchParams({ name: 'Иван', contact: 'a@b.ru', message: 'Тестовое сообщение', consent: '1' }), headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  assert.equal(noToken.status, 403);
  const foreign = await c.post('/request/', { name: 'Иван' }, { headers: { origin: 'https://evil.example' }, origin: false });
  assert.equal(foreign.status, 403);
});

test('обращение с сайта: валидация, создание, ловушка для ботов', async () => {
  const c = new Client();
  const bad = await c.post('/request/', { name: '', contact: 'x', message: 'а', source: '/' });
  assert.equal(bad.status, 422);
  assert.match(bad.text, /Укажите имя/);
  const ok = await c.post('/request/', { name: 'Иван', contact: 'ivan@test.local', message: 'Не возвращают долг по расписке', consent: '1', source: '/' });
  assert.equal(ok.status, 303);
  assert.match(ok.location, /^\/request\/sent\/\?n=MP-\d{4}-\d{5}$/);
  const bot = await c.post('/request/', { name: 'Bot', contact: 'bot@x.ru', message: 'spam spam spam', consent: '1', website: 'http://spam' });
  assert.equal(bot.status, 303);
  assert.equal(bot.location, '/request/sent/');
});

test('неверный пароль — 401, верный — сессия HttpOnly; кабинет без входа — на страницу входа', async () => {
  const u = await makeUser();
  const c = new Client();
  const anon = await c.get('/cabinet/');
  assert.equal(anon.status, 303);
  assert.match(anon.location, /^\/login\/\?next=/);
  const bad = await c.post('/login/', { login: u.email, password: 'wrong-password' });
  assert.equal(bad.status, 401);
  const r = await c.post('/login/', { login: u.email, password: u.password });
  assert.equal(r.status, 303);
  const setCookie = r.headers.getSetCookie().find((s) => s.startsWith('sid='));
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.equal((await c.get('/cabinet/')).status, 200);
});

test('перебор пароля ограничивается', async () => {
  const u = await makeUser();
  const c = new Client();
  let last;
  for (let i = 0; i < 10; i++) last = await c.post('/login/', { login: u.email, password: `nope-${i}` });
  assert.equal(last.status, 429);
});

test('открытый редирект после входа невозможен', async () => {
  const u = await makeUser();
  const c = new Client();
  const r = await c.post('/login/', { login: u.email, password: u.password, next: '//evil.example/x' });
  assert.equal(r.location, '/cabinet/');
});

test('клиент не видит чужое дело, документ, счёт (IDOR)', async () => {
  const a = await makeUser();
  const b = await makeUser();
  const lawyer = await makeUser('lawyer');
  const caseB = await caseFor(b, 'Дело клиента Б');
  const { invoices, documents } = await import('../src/repos/index.js');
  const inv = invoices.create({ caseRow: caseB, amountKop: 500000, description: 'Услуга', createdBy: lawyer.id });

  const cb = new Client();
  await cb.login(b.email, b.password);
  const up = await cb.upload(`/cabinet/cases/${caseB.number}/upload/`, 'dogovor.pdf', PDF, 'application/pdf');
  assert.equal(up.status, 200, up.text);
  const doc = documents.forCase(caseB.id)[0];

  const ca = new Client();
  await ca.login(a.email, a.password);
  assert.equal((await ca.get(`/cabinet/cases/${caseB.number}/`)).status, 404);
  assert.equal((await ca.get(`/cabinet/documents/${doc.id}/download/`)).status, 404);
  assert.equal((await ca.get(`/cabinet/invoices/${inv.number}/`)).status, 404);
  assert.equal((await ca.post(`/cabinet/invoices/${inv.number}/pay/`)).status, 404);
  assert.equal((await ca.post(`/cabinet/cases/${caseB.number}/message/`, { body: 'чужое' })).status, 404);
  assert.equal((await ca.upload(`/cabinet/cases/${caseB.number}/upload/`, 'x.pdf', PDF)).status, 404);
  // а владелец — видит
  const own = await cb.get(`/cabinet/documents/${doc.id}/download/`);
  assert.equal(own.status, 200);
  assert.equal(own.headers.get('cache-control'), 'private, no-store');
  assert.match(own.headers.get('content-disposition'), /^attachment/);
});

test('клиент не попадает в панель юриста', async () => {
  const a = await makeUser();
  const c = new Client();
  await c.login(a.email, a.password);
  assert.equal((await c.get('/staff/')).status, 404);
  assert.equal((await c.get('/staff/requests/')).status, 404);
});

test('загрузка: тип проверяется по содержимому, а не по расширению', async () => {
  const u = await makeUser();
  const k = await caseFor(u);
  const c = new Client();
  await c.login(u.email, u.password);
  const fake = await c.upload(`/cabinet/cases/${k.number}/upload/`, 'evil.pdf', Buffer.from('<script>alert(1)</script>'), 'application/pdf');
  assert.equal(fake.status, 415);
  const exe = await c.upload(`/cabinet/cases/${k.number}/upload/`, 'a.exe', Buffer.from('MZ\x90\x00binary'));
  assert.equal(exe.status, 415);
  const ok = await c.upload(`/cabinet/cases/${k.number}/upload/`, '../../etc/passwd.pdf', PDF);
  assert.equal(ok.status, 200);
  const { documents } = await import('../src/repos/index.js');
  const d = documents.forCase(k.id)[0];
  assert.equal(d.original_name, 'passwd.pdf');
  assert.match(d.stored_name, /^\d{4}-\d{2}\/[a-f0-9]{32}$/);
});

test('пользовательский текст экранируется (XSS)', async () => {
  const u = await makeUser();
  const k = await caseFor(u);
  const c = new Client();
  await c.login(u.email, u.password);
  await c.post(`/cabinet/cases/${k.number}/message/`, { body: '<img src=x onerror=alert(1)>' });
  const page = await c.get(`/cabinet/cases/${k.number}/`);
  assert.ok(!page.text.includes('<img src=x onerror'));
  assert.ok(page.text.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('пароль, заданный при регистрации чужого e-mail, сбрасывается после подтверждения владельцем', async () => {
  const { users, codes } = await import('../src/repos/index.js');
  const email = `victim-${Date.now()}@test.local`;
  const attacker = new Client();
  const reg = await attacker.post('/register/', { email, password: 'attacker-password-1', consent: '1' });
  assert.equal(reg.status, 200);
  // владелец адреса входит по коду из своего браузера
  const victim = new Client();
  const code = codes.issue(email);
  const v = await victim.post('/login/code/verify/', { email, code });
  assert.equal(v.status, 303);
  assert.equal(users.byEmail(email).password_hash, null);
  // пароль злоумышленника больше не подходит
  const tryLogin = await attacker.post('/login/', { login: email, password: 'attacker-password-1' });
  assert.equal(tryLogin.status, 401);
});

test('код входа: неверный код не пускает, после 5 ошибок код блокируется', async () => {
  const { codes } = await import('../src/repos/index.js');
  const email = `code-${Date.now()}@test.local`;
  const real = codes.issue(email);
  for (let i = 0; i < 5; i++) assert.equal(codes.verify(email, real === '000000' ? '111111' : '000000'), false);
  assert.equal(codes.verify(email, real), false, 'после 5 ошибок верный код тоже не принимается');
});

test('санитайзер импорта удаляет скрипты, обработчики и опасные ссылки', async () => {
  const { sanitizeHtml } = await import('../src/lib/sanitize.js');
  const out = sanitizeHtml('<p onclick="x()">Текст <script>alert(1)</script><a href="javascript:alert(1)">ссылка</a> <a href="/knowledge/">ок</a></p><iframe src="//x"></iframe><style>*{}</style>');
  assert.equal(out, '<p>Текст <a>ссылка</a> <a href="/knowledge/">ок</a></p>');
});
