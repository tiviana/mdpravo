// Личный кабинет клиента. Каждый обработчик сам проверяет права на сервере.
import fs from 'node:fs';
import { config } from '../config.js';
import { contentDisposition, storeUpload, storedPath } from '../lib/files.js';
import { HttpError } from '../lib/http.js';
import { hashPassword, passwordProblem, verifyPassword } from '../lib/password.js';
import { assertRate, verifyCsrf } from '../lib/security.js';
import { destroyAllSessions, isStaff, requireUser } from '../lib/session.js';
import * as pay from '../payments/service.js';
import { audit, cases, caseForUser, canSeeCase, canSeeInvoice, documents, invoices, library, requests, users } from '../repos/index.js';
import * as V from '../views/cabinet.js';

const notFound = () => new HttpError(404, 'Не найдено');

/** Клиентский раздел: сотрудники работают в /staff/. */
function requireClient(ctx) {
  const u = requireUser(ctx);
  if (isStaff(u)) throw Object.assign(new HttpError(302, ''), { redirect: '/staff/' });
  return u;
}

function back(ctx, path, key, isErr = false) {
  ctx.redirect(`${path}?${isErr ? 'err' : 'ok'}=${encodeURIComponent(key)}`);
}

export function registerCabinet(r) {
  r.get('/cabinet/', (ctx) => {
    const u = requireClient(ctx);
    ctx.html(V.dashboardPage(ctx, {
      cases: cases.forClient(u.id),
      invoices: invoices.forClient(u.id),
      documents: documents.forClient(u.id),
      requests: requests.forUser(u.id),
      events: cases.recentEventsForClient(u.id),
    }));
  });

  r.get('/cabinet/cases/', (ctx) => {
    const u = requireClient(ctx);
    ctx.html(V.casesPage(ctx, { cases: cases.forClient(u.id), requests: requests.forUser(u.id) }));
  });

  r.get('/cabinet/cases/:num/', (ctx) => {
    const u = requireClient(ctx);
    const c = caseForUser(u, ctx.params.num.toUpperCase());
    if (!c) throw notFound();
    cases.markReadByClient(c.id);
    ctx.state.unread = cases.unreadForClient(u.id);
    ctx.html(V.casePage(ctx, { c, events: cases.events(c.id), documents: documents.forCase(c.id), invoices: invoices.forCase(c.id) }));
  });

  r.post('/cabinet/cases/:num/message/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireClient(ctx);
    const c = caseForUser(u, ctx.params.num.toUpperCase());
    if (!c) throw notFound();
    assertRate(`msg:${u.id}`, 30, 10 * 60_000);
    const body = (await ctx.form()).str('body', 5000);
    if (!body) return back(ctx, `/cabinet/cases/${c.number}/`, 'Напишите сообщение', true);
    cases.addEvent(c.id, u.id, 'message', body);
    back(ctx, `/cabinet/cases/${c.number}/`, 'sent');
  });

  r.post('/cabinet/cases/:num/upload/', async (ctx) => {
    const u = requireClient(ctx);
    const c = caseForUser(u, ctx.params.num.toUpperCase());
    if (!c) throw notFound();
    await handleUpload(ctx, u, c, false, `/cabinet/cases/${c.number}/`);
  });

  r.get('/cabinet/documents/', (ctx) => {
    const u = requireClient(ctx);
    ctx.html(V.documentsPage(ctx, documents.forClient(u.id)));
  });
  r.get('/cabinet/documents/:id/download/', (ctx) => sendDocument(ctx, requireClient(ctx), false));
  r.get('/cabinet/documents/:id/view/', (ctx) => sendDocument(ctx, requireClient(ctx), true));

  r.get('/cabinet/invoices/', (ctx) => {
    const u = requireClient(ctx);
    ctx.html(V.invoicesPage(ctx, invoices.forClient(u.id)));
  });

  r.get('/cabinet/invoices/:num/', async (ctx) => {
    const u = requireClient(ctx);
    let inv = invoices.byNumber(ctx.params.num.toUpperCase());
    if (!canSeeInvoice(u, inv)) throw notFound();
    const returned = ctx.query.get('return') === '1';
    // при возврате со страницы оплаты спрашиваем статус у провайдера — не верим самому факту возврата
    if (returned && inv.status === 'pending') inv = await pay.syncInvoice(inv);
    const c = cases.byId(inv.case_id);
    ctx.html(V.invoicePage(ctx, { inv: { ...inv, case_number: c.number, case_title: c.title }, payments: pay.paymentsForInvoice(inv.id), returned }));
  });

  r.post('/cabinet/invoices/:num/pay/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireClient(ctx);
    const inv = invoices.byNumber(ctx.params.num.toUpperCase());
    if (!canSeeInvoice(u, inv)) throw notFound();
    assertRate(`pay:${u.id}`, 10, 10 * 60_000);
    try {
      const url = await pay.startPayment(inv, u);
      ctx.redirect(url);
    } catch (e) {
      if (e instanceof pay.PaymentError || e?.status) return back(ctx, `/cabinet/invoices/${inv.number}/`, e.message, true);
      throw e;
    }
  });

  r.post('/cabinet/invoices/:num/refresh/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireClient(ctx);
    const inv = invoices.byNumber(ctx.params.num.toUpperCase());
    if (!canSeeInvoice(u, inv)) throw notFound();
    assertRate(`payrefresh:${u.id}`, 20, 10 * 60_000);
    const fresh = await pay.syncInvoice(inv);
    ctx.redirect(`/cabinet/invoices/${inv.number}/${fresh.status === 'paid' ? '?ok=paid' : ''}`);
  });

  r.get('/cabinet/payments/', (ctx) => {
    const u = requireClient(ctx);
    ctx.html(V.paymentsPage(ctx, pay.paymentHistory(u.id)));
  });

  r.get('/cabinet/library/', (ctx) => {
    const u = requireClient(ctx);
    ctx.html(V.libraryPage(ctx, { bookmarks: library.bookmarks(u.id), notes: library.notes(u.id) }));
  });

  r.post('/cabinet/bookmarks/toggle/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireUser(ctx);
    const form = await ctx.form();
    const path = form.str('path', 300);
    const title = form.str('title', 300);
    // закладки — только на страницы базы знаний этого сайта
    if (!/^\/(knowledge|urgent|services)\/[a-z0-9/-]*$/.test(path) || !title) throw new HttpError(400, 'Нельзя сохранить эту страницу');
    library.toggle(u.id, path, title);
    const backTo = form.str('back', 300);
    ctx.redirect(backTo === '/cabinet/library/' ? backTo : path);
  });

  r.post('/cabinet/notes/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireUser(ctx);
    const body = (await ctx.form()).str('body', 5000);
    if (body) library.addNote(u.id, body);
    back(ctx, '/cabinet/library/', 'note');
  });

  r.post('/cabinet/notes/:id/delete/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireUser(ctx);
    library.deleteNote(u.id, Number(ctx.params.id));
    ctx.redirect('/cabinet/library/');
  });

  r.get('/cabinet/profile/', (ctx) => {
    requireClient(ctx);
    ctx.html(V.profilePage(ctx));
  });

  r.post('/cabinet/profile/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireUser(ctx);
    const form = await ctx.form();
    users.updateProfile(u.id, { name: form.str('name', 120), phone: form.str('phone', 40) });
    back(ctx, '/cabinet/profile/', 'saved');
  });

  r.post('/cabinet/profile/password/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireUser(ctx);
    assertRate(`pwchange:${u.id}`, 10, 15 * 60_000);
    const form = await ctx.form();
    const full = users.byId(u.id);
    if (full.password_hash && !(await verifyPassword(form.get('current') || '', full.password_hash))) {
      return ctx.html(V.profilePage(ctx, { errors: { password: 'Текущий пароль указан неверно' } }), 422);
    }
    const pw = form.get('password') || '';
    const problem = passwordProblem(pw);
    if (problem) return ctx.html(V.profilePage(ctx, { errors: { password: problem } }), 422);
    users.setPassword(u.id, await hashPassword(pw));
    destroyAllSessions(u.id, ctx);
    audit(u.id, 'password_change');
    back(ctx, '/cabinet/profile/', 'password');
  });

  r.post('/cabinet/profile/sessions/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireUser(ctx);
    destroyAllSessions(u.id, ctx);
    back(ctx, '/cabinet/profile/', 'saved');
  });

  r.get('/cabinet/help/', (ctx) => {
    requireClient(ctx);
    ctx.html(V.helpPage(ctx));
  });
}

/** Общая загрузка документа к делу (клиент или сотрудник). */
export async function handleUpload(ctx, user, c, fromFirm, backPath) {
  await verifyCsrf(ctx);
  assertRate(`upload:${user.id}`, 30, 60 * 60_000, 'Слишком много загрузок подряд. Попробуйте позже.');
  const wantsJson = String(ctx.req.headers.accept || '').includes('application/json');
  const form = await ctx.form(config.uploads.maxBytes + 1024 * 1024);
  let stored;
  try {
    stored = await storeUpload(form.get('file'));
  } catch (e) {
    if (wantsJson) return ctx.json({ ok: false, error: e.message }, e.status || 400);
    return back(ctx, backPath, e.message, true);
  }
  documents.create({ caseId: c.id, uploaderId: user.id, name: stored.name, stored: stored.stored, mime: stored.mime, size: stored.size, sha256: stored.sha256, fromFirm });
  cases.addEvent(c.id, user.id, 'document', `загружен файл «${stored.name}»`);
  if (!fromFirm && c.status === 'need_docs') cases.touch(c.id);
  audit(user.id, 'upload', `doc:${c.number}`);
  if (wantsJson) return ctx.json({ ok: true, redirect: `${backPath}?ok=uploaded` });
  back(ctx, backPath, 'uploaded');
}

/** Выдача документа после проверки прав. Никаких публичных ссылок на файлы. */
export function sendDocument(ctx, user, inline) {
  const id = Number(ctx.params.id);
  const d = Number.isInteger(id) ? documents.byId(id) : null;
  if (!d || !canSeeCase(user, cases.byId(d.case_id))) throw new HttpError(404, 'Документ не найден');
  const full = storedPath(d.stored_name);
  let buf;
  try {
    buf = fs.readFileSync(full);
  } catch {
    throw new HttpError(404, 'Файл недоступен. Сообщите специалисту.');
  }
  const previewable = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(d.mime);
  audit(user.id, inline ? 'view' : 'download', `doc:${d.id}`);
  ctx.send(200, buf, {
    'Content-Type': d.mime,
    'Content-Disposition': contentDisposition(d.original_name, inline && previewable),
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  });
}
