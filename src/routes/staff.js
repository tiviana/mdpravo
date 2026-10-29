// Панель юриста: обращения, дела, статусы, документы, счета.
import { HttpError } from '../lib/http.js';
import { assertRate, verifyCsrf } from '../lib/security.js';
import { requireStaff } from '../lib/session.js';
import { audit, CASE_STATUSES, cases, canSeeCase, documents, invoices, requests, users } from '../repos/index.js';
import * as V from '../views/cabinet.js';
import { handleUpload, sendDocument } from './cabinet.js';

const notFound = () => new HttpError(404, 'Не найдено');

function staffCase(ctx, u) {
  const c = cases.byNumber(ctx.params.num.toUpperCase());
  if (!canSeeCase(u, c)) throw notFound();
  return c;
}

function back(ctx, path, key, isErr = false) {
  ctx.redirect(`${path}?${isErr ? 'err' : 'ok'}=${encodeURIComponent(key)}`);
}

/** «15 000», «15000,50» → копейки; null, если некорректно. */
export function parseRubles(s) {
  const t = String(s || '').replace(/[\s ₽]/g, '').replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(t)) return null;
  const [r, k = ''] = t.split('.');
  const kop = Number(r) * 100 + Number((k + '00').slice(0, 2));
  return kop > 0 ? kop : null;
}

function findOrCreateClient(email, name) {
  let client = users.byEmail(email);
  if (!client) client = users.create({ email, name, role: 'client' });
  if (client.role !== 'client') throw new HttpError(400, 'Этот e-mail принадлежит сотруднику');
  return client;
}

export function registerStaff(r) {
  r.get('/staff/', (ctx) => {
    const u = requireStaff(ctx);
    ctx.html(V.staffCasesPage(ctx, cases.forStaff(u)));
  });

  r.get('/staff/requests/', (ctx) => {
    requireStaff(ctx);
    ctx.html(V.staffRequestsPage(ctx, requests.list()));
  });

  r.post('/staff/requests/:num/accept/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireStaff(ctx);
    const req = requests.byNumber(ctx.params.num.toUpperCase());
    if (!req || req.status !== 'new') throw notFound();
    if (!req.email) return back(ctx, '/staff/requests/', 'У обращения нет e-mail', true);
    const client = req.user_id ? users.byId(req.user_id) : findOrCreateClient(req.email, req.name);
    const title = req.message.split(/[.!?\n]/)[0].slice(0, 120) || `Обращение ${req.number}`;
    const c = cases.create({ clientId: client.id, title, lawyerId: u.role === 'lawyer' ? u.id : null, requestId: req.id, authorId: u.id });
    cases.addEvent(c.id, null, 'message', `Обращение ${req.number}:\n${req.message}`, true);
    requests.attachToUserByEmail(req.email, client.id);
    audit(u.id, 'case_from_request', c.number);
    back(ctx, `/staff/cases/${c.number}/`, 'created');
  });

  r.post('/staff/requests/:num/close/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireStaff(ctx);
    const req = requests.byNumber(ctx.params.num.toUpperCase());
    if (!req) throw notFound();
    requests.setStatus(req.id, 'rejected');
    audit(u.id, 'request_close', req.number);
    ctx.redirect('/staff/requests/');
  });

  r.get('/staff/cases/new/', (ctx) => {
    requireStaff(ctx);
    ctx.html(V.staffNewCasePage(ctx));
  });

  r.post('/staff/cases/new/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireStaff(ctx);
    const form = await ctx.form();
    const values = { email: form.str('email', 254).toLowerCase(), name: form.str('name', 120), title: form.str('title', 200) };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email) || !values.title) {
      return ctx.html(V.staffNewCasePage(ctx, { error: 'Укажите e-mail клиента и название дела', values }), 422);
    }
    let client;
    try {
      client = findOrCreateClient(values.email, values.name);
    } catch (e) {
      return ctx.html(V.staffNewCasePage(ctx, { error: e.message, values }), 422);
    }
    const c = cases.create({ clientId: client.id, title: values.title, lawyerId: u.role === 'lawyer' ? u.id : null, authorId: u.id });
    audit(u.id, 'case_create', c.number);
    back(ctx, `/staff/cases/${c.number}/`, 'created');
  });

  r.get('/staff/cases/:num/', (ctx) => {
    const u = requireStaff(ctx);
    const c = staffCase(ctx, u);
    ctx.html(V.casePage(ctx, {
      c, events: cases.events(c.id, { includeInternal: true }), documents: documents.forCase(c.id), invoices: invoices.forCase(c.id),
      staffView: true, staff: users.staff(),
    }));
  });

  r.post('/staff/cases/:num/update/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireStaff(ctx);
    const c = staffCase(ctx, u);
    const form = await ctx.form();
    const status = form.str('status', 30);
    if (!CASE_STATUSES[status]) throw new HttpError(400, 'Неизвестный статус');
    const lawyerId = Number(form.get('lawyer_id')) || null;
    if (lawyerId && !users.staff().some((s) => s.id === lawyerId)) throw new HttpError(400, 'Неизвестный сотрудник');
    const deadline = form.str('deadline_at', 10);
    cases.update(c.id, {
      title: form.str('title', 200) || c.title,
      nextStep: form.str('next_step', 300),
      deadlineAt: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? `${deadline}T12:00:00.000Z` : null,
      lawyerId,
    });
    cases.setStatus(c, status, u.id, form.str('comment', 300));
    audit(u.id, 'case_update', c.number);
    back(ctx, `/staff/cases/${c.number}/`, 'status');
  });

  r.post('/staff/cases/:num/message/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireStaff(ctx);
    const c = staffCase(ctx, u);
    const form = await ctx.form();
    const body = form.str('body', 5000);
    if (!body) return back(ctx, `/staff/cases/${c.number}/`, 'Пустое сообщение', true);
    const internal = form.get('internal') === '1';
    cases.addEvent(c.id, u.id, internal ? 'note' : 'message', body, internal);
    back(ctx, `/staff/cases/${c.number}/`, 'sent');
  });

  r.post('/staff/cases/:num/upload/', async (ctx) => {
    const u = requireStaff(ctx);
    const c = staffCase(ctx, u);
    await handleUpload(ctx, u, c, true, `/staff/cases/${c.number}/`);
  });

  r.post('/staff/cases/:num/invoice/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireStaff(ctx);
    const c = staffCase(ctx, u);
    assertRate(`invoice:${u.id}`, 30, 60 * 60_000);
    const form = await ctx.form();
    const amountKop = parseRubles(form.get('amount'));
    const description = form.str('description', 200);
    if (!amountKop || !description) return back(ctx, `/staff/cases/${c.number}/`, 'Укажите услугу и сумму', true);
    const due = form.str('due_at', 10);
    invoices.create({ caseRow: c, amountKop, description, createdBy: u.id, dueAt: /^\d{4}-\d{2}-\d{2}$/.test(due) ? `${due}T20:59:59.000Z` : null });
    if (form.get('need_payment') === '1') cases.setStatus(cases.byId(c.id), 'need_payment', u.id);
    audit(u.id, 'invoice_create', c.number);
    back(ctx, `/staff/cases/${c.number}/`, 'invoice');
  });

  r.get('/staff/documents/:id/download/', (ctx) => sendDocument(ctx, requireStaff(ctx), false));
  r.get('/staff/documents/:id/view/', (ctx) => sendDocument(ctx, requireStaff(ctx), true));
  r.post('/staff/documents/:id/status/', async (ctx) => {
    await verifyCsrf(ctx);
    const u = requireStaff(ctx);
    const d = documents.byId(Number(ctx.params.id));
    const c = d && cases.byId(d.case_id);
    if (!d || !canSeeCase(u, c)) throw notFound();
    const status = (await ctx.form()).str('status', 20);
    if (!['received', 'checked', 'needs_fix'].includes(status)) throw new HttpError(400, 'Неизвестный статус');
    documents.setStatus(d.id, status);
    back(ctx, `/staff/cases/${c.number}/`, 'saved');
  });
}
