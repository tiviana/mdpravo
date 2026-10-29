// Страницы входа, личного кабинета клиента и панели юриста.
import { config } from '../config.js';
import { company } from '../content/company.js';
import { html } from '../lib/html.js';
import { ACCEPT_ATTR, ALLOWED, kindOfMime } from '../lib/files.js';
import { date, fileSize, rub } from '../lib/ru.js';
import { CASE_STATUSES, INVOICE_STATUSES, displayName } from '../repos/index.js';
import { alert, csrfField, icon, layout, statusPill } from './ui.js';

const S = ' — Мосдевелопмент Право';

function caseStatus(code) {
  const s = CASE_STATUSES[code] || CASE_STATUSES.new;
  return statusPill(s.tone, s.label);
}
function invoiceStatus(code) {
  const s = INVOICE_STATUSES[code] || INVOICE_STATUSES.issued;
  return statusPill(s.tone, s.label);
}
const PAY_STATUS = {
  pending: ['info', 'Ожидает подтверждения'], waiting_for_capture: ['info', 'Ожидает подтверждения'], succeeded: ['success', 'Успешно'],
  canceled: ['neutral', 'Отменён'], refunded: ['neutral', 'Возвращён'], partially_refunded: ['neutral', 'Частично возвращён'],
};
const DOC_STATUS = { received: ['neutral', 'Получен'], checked: ['success', 'Проверен'], needs_fix: ['warning', 'Нужна замена'] };

function flash(ctx) {
  const f = ctx.query.get('ok');
  const e = ctx.query.get('err');
  const OK = {
    uploaded: 'Документ загружен.', sent: 'Сообщение отправлено.', saved: 'Изменения сохранены.', note: 'Заметка сохранена.',
    password: 'Пароль обновлён.', paid: 'Оплата получена. Спасибо!', status: 'Статус обновлён.', invoice: 'Счёт выставлен.', created: 'Дело создано.',
  };
  return html`${f && OK[f] ? alert('success', OK[f]) : ''}${e ? alert('error', e.slice(0, 200)) : ''}`;
}

// ── Вход и регистрация ─────────────────────────────────────────────────────
function authShell(ctx, title, body) {
  return layout(ctx, { title: title + S, description: '', noindex: true, body: html`<section class="auth wrap"><div class="auth-card">${body}</div></section>` });
}

function authTabs(active) {
  return html`<nav class="tabs" aria-label="Способ входа">
    <a href="/login/" ${active === 'password' ? html`aria-current="page"` : ''}>По паролю</a>
    <a href="/login/code/" ${active === 'code' ? html`aria-current="page"` : ''}>По коду на e-mail</a>
  </nav>`;
}

export function loginPage(ctx, { error, login = '', next = '' } = {}) {
  return authShell(ctx, 'Вход', html`
    <div class="stack" style="gap:6px"><p class="eyebrow">Личный кабинет</p><h1 style="font-size:1.75rem">Вход</h1></div>
    ${authTabs('password')}
    ${error ? alert('error', error) : ''}
    <form class="form" method="post" action="/login/">
      ${csrfField(ctx)}<input type="hidden" name="next" value="${next}">
      <div class="field"><label for="l-login">E-mail или логин</label><input class="input" id="l-login" name="login" autocomplete="username" required value="${login}"></div>
      <div class="field"><label for="l-pass">Пароль</label><input class="input" id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn btn--primary btn--block" type="submit">Войти</button>
    </form>
    <p class="muted">Забыли пароль? <a href="/login/code/">Войдите по коду</a> и задайте новый в профиле.</p>
    <p class="muted">Нет кабинета? <a href="/register/">Создать</a> — по желанию, чтобы видеть статус дела, документы и счета.</p>`);
}

export function codeRequestPage(ctx, { error, email = '', next = '' } = {}) {
  return authShell(ctx, 'Вход по коду', html`
    <div class="stack" style="gap:6px"><p class="eyebrow">Личный кабинет</p><h1 style="font-size:1.75rem">Вход по коду</h1></div>
    ${authTabs('code')}
    ${error ? alert('error', error) : ''}
    <p class="muted">Пришлём шестизначный код на e-mail. Если кабинета ещё нет, он будет создан — с привязкой к обращениям с этим адресом.</p>
    <form class="form" method="post" action="/login/code/">
      ${csrfField(ctx)}<input type="hidden" name="next" value="${next}">
      <div class="field"><label for="c-email">E-mail</label><input class="input" id="c-email" name="email" type="email" autocomplete="email" inputmode="email" required value="${email}"></div>
      <button class="btn btn--primary btn--block" type="submit">Получить код</button>
    </form>`);
}

export function codeVerifyPage(ctx, { error, email, next = '', devCode } = {}) {
  return authShell(ctx, 'Введите код', html`
    <div class="stack" style="gap:6px"><p class="eyebrow">Личный кабинет</p><h1 style="font-size:1.75rem">Введите код</h1></div>
    <p class="muted">Код отправлен на <b>${email}</b>. Он действует 10 минут.</p>
    ${devCode ? alert('warning', `Режим разработки: SMTP не настроен, код ${devCode}`) : ''}
    ${error ? alert('error', error) : ''}
    <form class="form" method="post" action="/login/code/verify/">
      ${csrfField(ctx)}<input type="hidden" name="email" value="${email}"><input type="hidden" name="next" value="${next}">
      <div class="field"><label for="c-code">Код из письма</label><input class="input code-input" id="c-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus></div>
      <button class="btn btn--primary btn--block" type="submit">Войти</button>
    </form>
    <p class="muted"><a href="/login/code/">Отправить код ещё раз</a></p>`);
}

export function registerPage(ctx, { errors = {}, values = {} } = {}) {
  const err = (k) => (errors[k] ? html`<span class="error">${errors[k]}</span>` : '');
  return authShell(ctx, 'Создать кабинет', html`
    <div class="stack" style="gap:6px"><p class="eyebrow">Личный кабинет</p><h1 style="font-size:1.75rem">Создать кабинет</h1></div>
    <p class="muted">Регистрация по желанию: обращение можно отправить и без неё. В кабинете — статус дела, документы, счета и сообщения от специалиста.</p>
    ${errors._form ? alert('error', errors._form) : ''}
    <form class="form" method="post" action="/register/">
      ${csrfField(ctx)}
      <div class="field"><label for="r-name">Имя</label><input class="input" id="r-name" name="name" autocomplete="name" maxlength="120" value="${values.name || ''}"></div>
      <div class="field"><label for="r-email">E-mail</label><input class="input" id="r-email" name="email" type="email" autocomplete="email" required value="${values.email || ''}">${err('email')}<span class="hint">На него придут код подтверждения и уведомления по делу.</span></div>
      <div class="field"><label for="r-pass">Пароль</label><input class="input" id="r-pass" name="password" type="password" autocomplete="new-password" minlength="10" required>${err('password')}<span class="hint">Не короче 10 символов.</span></div>
      <label class="check"><input type="checkbox" name="consent" value="1" required ${values.consent ? html`checked` : ''}><span>Соглашаюсь на <a href="/consent/">обработку персональных данных</a>.</span></label>${err('consent')}
      <button class="btn btn--primary btn--block" type="submit">Создать и подтвердить e-mail</button>
    </form>
    <p class="muted">Уже есть кабинет? <a href="/login/">Войти</a></p>`);
}

// ── Кабинет клиента ────────────────────────────────────────────────────────
const CAB_NAV = [
  ['/cabinet/', 'home', 'Главная'],
  ['/cabinet/cases/', 'briefcase', 'Дела и обращения'],
  ['/cabinet/documents/', 'file', 'Документы'],
  ['/cabinet/invoices/', 'card', 'Счета и оплата'],
  ['/cabinet/payments/', 'clock', 'История платежей'],
  ['/cabinet/library/', 'bookmark', 'Закладки и заметки'],
  ['/cabinet/profile/', 'settings', 'Профиль и безопасность'],
  ['/cabinet/help/', 'help', 'Помощь'],
];

export function cabShell(ctx, { title, active, body, actions = '' }) {
  const unread = ctx.state.unread || 0;
  return layout(ctx, {
    title: title + ' · Кабинет' + S,
    description: '',
    noindex: true,
    body: html`<div class="wrap cab">
  <nav class="cab-nav" aria-label="Разделы кабинета">
    ${CAB_NAV.map(([href, ic, label]) => html`<a href="${href}" ${active === href ? html`aria-current="page"` : ''}>${icon(ic)}${label}${href === '/cabinet/cases/' && unread ? html`<span class="badge" aria-label="непрочитанных: ${unread}">${unread}</span>` : ''}</a>`)}
    <form method="post" action="/logout/" style="display:contents">${csrfField(ctx)}<button class="cab-logout" type="submit">${icon('logout')}Выйти</button></form>
  </nav>
  <div class="cab-main">
    <div class="cab-title"><h1>${title}</h1>${actions}</div>
    ${flash(ctx)}
    ${body}
  </div>
</div>`,
  });
}

function emptyState(img, title, text, cta) {
  return html`<div class="empty"><img src="/img/icons3d/${img}.webp" alt="" width="120" height="120" loading="lazy"><h2 style="font-size:var(--fs-h3)">${title}</h2><p>${text}</p>${cta || ''}</div>`;
}

export function dashboardPage(ctx, d) {
  const u = ctx.user;
  const due = d.invoices.filter((i) => i.status === 'issued' || i.status === 'pending');
  const active = d.cases.filter((c) => !['done', 'closed'].includes(c.status));
  const needAction = active.filter((c) => c.status === 'need_docs' || c.status === 'need_payment');
  const deadlines = active.filter((c) => c.deadline_at).sort((a, b) => a.deadline_at.localeCompare(b.deadline_at)).slice(0, 3);
  return cabShell(ctx, {
    title: `Здравствуйте, ${displayName(u)}`,
    active: '/cabinet/',
    body: html`
${!u.email_verified_at && u.email ? alert('warning', html`E-mail не подтверждён. <a href="/login/code/?email=${encodeURIComponent(u.email)}">Подтвердить кодом</a> — так к кабинету привяжутся ваши обращения и счета.`) : ''}
<div class="tiles">
  <a class="tile" href="/cabinet/cases/"><b>${active.length}</b><span>активных дел</span></a>
  <a class="tile ${due.length ? 'tile--alert' : ''}" href="/cabinet/invoices/"><b>${due.length}</b><span>счетов к оплате</span></a>
  <a class="tile" href="/cabinet/documents/"><b>${d.documents.length}</b><span>документов</span></a>
  <a class="tile" href="/cabinet/cases/"><b>${d.requests.filter((r) => r.status === 'new').length}</b><span>обращений на рассмотрении</span></a>
</div>
${needAction.length ? html`<section class="stack"><h2 style="font-size:var(--fs-h3)">Нужно ваше действие</h2><div class="rows">${needAction.map((c) => html`<a class="row" href="/cabinet/cases/${c.number}/"><div><div class="title">${c.title}</div><div class="meta">${CASE_STATUSES[c.status].hint}</div></div>${caseStatus(c.status)}</a>`)}</div></section>` : ''}
${due.length ? html`<section class="stack"><h2 style="font-size:var(--fs-h3)">Счета к оплате</h2><div class="rows">${due.map(invoiceRow)}</div></section>` : ''}
<section class="stack">
  <h2 style="font-size:var(--fs-h3)">Мои дела</h2>
  ${d.cases.length ? html`<div class="rows">${d.cases.slice(0, 5).map(caseRow)}</div>` : emptyState('step-1', 'Дел пока нет', 'Когда специалист примет ваше обращение, здесь появится дело со статусом, документами и сообщениями.', html`<a class="btn btn--primary" href="/#contact">Описать ситуацию</a>`)}
</section>
${deadlines.length ? html`<section class="stack"><h2 style="font-size:var(--fs-h3)">Ближайшие сроки</h2><div class="rows">${deadlines.map((c) => html`<a class="row" href="/cabinet/cases/${c.number}/"><div><div class="title">${c.title}</div><div class="meta">${c.next_step || 'Согласованный срок'}</div></div><span class="amount">${date(c.deadline_at)}</span></a>`)}</div></section>` : ''}
${d.events.length ? html`<section class="stack"><h2 style="font-size:var(--fs-h3)">Последние события</h2><ul class="timeline">${d.events.map((e) => html`<li><span class="dot ${e.author_id ? 'dot--firm' : ''}"></span><div><div class="when">${date(e.created_at, true)} · ${e.case_number}</div><div class="body">${eventText(e)}</div></div></li>`)}</ul></section>` : ''}`,
  });
}

function eventText(e) {
  const k = { created: 'Дело открыто', status: 'Статус', message: 'Сообщение', document: 'Документ', invoice: 'Счёт', payment: 'Оплата', note: 'Заметка' }[e.kind];
  if (e.kind === 'message') return `${k}: ${e.body.slice(0, 140)}${e.body.length > 140 ? '…' : ''}`;
  return e.kind === 'created' ? e.body : `${k}: ${e.body}`;
}

function caseRow(c) {
  return html`<a class="row" href="/cabinet/cases/${c.number}/"><div><div class="title">${c.title}</div><div class="meta">${c.number} · обновлено ${date(c.updated_at)}</div></div>${caseStatus(c.status)}</a>`;
}

function invoiceRow(i) {
  return html`<a class="row" href="/cabinet/invoices/${i.number}/"><div><div class="title">${i.description}</div><div class="meta">Счёт ${i.number}${i.case_number ? ` · дело ${i.case_number}` : ''} · ${date(i.created_at)}</div></div><div style="display:grid;gap:6px;justify-items:end"><span class="amount">${rub(i.amount_kop)}</span>${invoiceStatus(i.status)}</div></a>`;
}

const REQ_STATUS = { new: ['info', 'На рассмотрении'], accepted: ['success', 'Принято в работу'], rejected: ['neutral', 'Закрыто'], spam: ['neutral', 'Закрыто'] };

export function casesPage(ctx, { cases, requests }) {
  return cabShell(ctx, {
    title: 'Дела и обращения',
    active: '/cabinet/cases/',
    actions: html`<a class="btn btn--primary btn--sm" href="/#contact">${icon('plus')}Новое обращение</a>`,
    body: html`
<section class="stack"><h2 style="font-size:var(--fs-h3)">Дела</h2>
${cases.length ? html`<div class="rows">${cases.map(caseRow)}</div>` : emptyState('value-documents', 'Дел пока нет', 'Дело появится, когда специалист примет обращение в работу.')}
</section>
<section class="stack"><h2 style="font-size:var(--fs-h3)">Обращения с сайта</h2>
${requests.length ? html`<div class="rows">${requests.map((r) => html`<div class="row"><div><div class="title">${r.message.slice(0, 120)}${r.message.length > 120 ? '…' : ''}</div><div class="meta">${r.number} · ${date(r.created_at)}</div></div>${statusPill(...(REQ_STATUS[r.status] || REQ_STATUS.new))}</div>`)}</div>` : html`<p class="muted">Обращений с этим e-mail нет.</p>`}
</section>`,
  });
}

export function casePage(ctx, { c, events, documents, invoices, staffView = false, staff = [] }) {
  const base = staffView ? `/staff/cases/${c.number}/` : `/cabinet/cases/${c.number}/`;
  const st = CASE_STATUSES[c.status];
  const body = html`
<div class="card" style="gap:var(--s-4)">
  <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">${caseStatus(c.status)}<span class="muted">${c.number} · открыто ${date(c.created_at)}</span></div>
  <p>${st.hint}</p>
  ${c.next_step ? html`<dl class="dl"><dt>Следующий шаг</dt><dd>${c.next_step}</dd>${c.deadline_at ? html`<dt>Срок</dt><dd>${date(c.deadline_at)}</dd>` : ''}</dl>` : ''}
</div>
${staffView ? staffCaseControls(ctx, c, staff) : ''}
<div class="layout-aside">
  <section class="stack">
    <h2 style="font-size:var(--fs-h3)">Переписка и история</h2>
    <ul class="timeline">${events.map((e) => html`<li><span class="dot ${e.author_role && e.author_role !== 'client' ? 'dot--firm' : ''}"></span><div><div class="when">${date(e.created_at, true)} · ${e.author_id ? (e.author_role === 'client' ? 'Вы' : (e.author_name || 'Специалист')) : 'Система'}${e.internal ? ' · внутренняя заметка' : ''}</div>${e.kind === 'message' || e.kind === 'note' ? html`<div class="bubble body">${e.body}</div>` : html`<div class="body">${eventText(e)}</div>`}</div></li>`)}</ul>
    <form class="form card" method="post" action="${base}message/">
      ${csrfField(ctx)}
      <div class="field"><label for="m-body">${staffView ? 'Сообщение клиенту' : 'Сообщение специалисту'}</label><textarea class="textarea" id="m-body" name="body" maxlength="5000" required style="min-height:110px"></textarea></div>
      ${staffView ? html`<label class="check"><input type="checkbox" name="internal" value="1"><span>Внутренняя заметка — клиент не увидит</span></label>` : ''}
      <div><button class="btn btn--primary btn--sm" type="submit">Отправить</button></div>
    </form>
  </section>
  <aside class="stack">
    <section class="card">
      <h2 style="font-size:var(--fs-h4)">Документы</h2>
      ${documents.length ? html`<ul class="list-links">${documents.map((d) => docItem(d, staffView ? `/staff/documents/${d.id}` : `/cabinet/documents/${d.id}`, staffView, ctx))}</ul>` : html`<p class="muted">Документов пока нет.</p>`}
      ${uploadForm(ctx, `${base}upload/`)}
    </section>
    <section class="card">
      <h2 style="font-size:var(--fs-h4)">Счета</h2>
      ${invoices.length ? html`<div class="rows">${invoices.map((i) => {
        const inner = html`<div><div class="title">${i.description}</div><div class="meta">${i.number}</div></div><div style="display:grid;gap:6px;justify-items:end"><span class="amount">${rub(i.amount_kop)}</span>${invoiceStatus(i.status)}</div>`;
        return staffView ? html`<div class="row">${inner}</div>` : html`<a class="row" href="/cabinet/invoices/${i.number}/">${inner}</a>`;
      })}</div>` : html`<p class="muted">Счетов нет.</p>`}
      ${staffView ? invoiceForm(ctx, c) : ''}
    </section>
  </aside>
</div>`;
  if (staffView) return staffShell(ctx, { title: c.title, active: '/staff/', body });
  return cabShell(ctx, { title: c.title, active: '/cabinet/cases/', body, actions: html`<a class="link-arrow" href="/cabinet/cases/">${icon('arrow-left')}Все дела</a>` });
}

function docItem(d, href, staffView, ctx) {
  const k = kindOfMime(d.mime);
  const canPreview = k && ALLOWED[k].preview;
  const st = DOC_STATUS[d.status] || DOC_STATUS.received;
  return html`<li style="display:grid;gap:6px">
    <a href="${href}/download/"><span>${d.original_name}<small>${ALLOWED[k]?.label || 'Файл'} · ${fileSize(d.size)} · ${date(d.created_at)} · ${d.from_firm ? 'от специалиста' : 'от вас'}</small></span>${icon('download')}</a>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${statusPill(...st)}${canPreview ? html`<a class="chip" href="${href}/view/" target="_blank" rel="noopener">${icon('eye')}Просмотр</a>` : ''}
    ${staffView ? html`<form method="post" action="${href}/status/" style="display:inline-flex;gap:6px">${csrfField(ctx)}<select class="input select" name="status" style="min-height:36px;padding:4px 10px;width:auto">${Object.entries(DOC_STATUS).map(([v, [, l]]) => html`<option value="${v}" ${d.status === v ? html`selected` : ''}>${l}</option>`)}</select><button class="btn btn--ghost btn--sm" type="submit" style="--bh:36px">OK</button></form>` : ''}</div>
  </li>`;
}

function uploadForm(ctx, action) {
  const max = config.uploads.maxBytes;
  return html`<form class="form" method="post" action="${action}" enctype="multipart/form-data" data-upload data-max="${max}">
    ${csrfField(ctx)}
    <label class="drop">${icon('upload')}<b>Загрузить документ</b><span class="muted" style="font-size:var(--fs-14)">PDF, JPG, PNG, WebP, DOCX, XLSX, DOC, TXT · до ${Math.round(max / 1048576)} МБ</span>
      <input type="file" name="file" accept="${ACCEPT_ATTR}" required><span data-file-name class="muted" style="font-size:var(--fs-14)"></span></label>
    <div class="progress" aria-hidden="true"><span></span></div>
    <p class="error" data-upload-msg hidden role="alert"></p>
    <button class="btn btn--primary btn--sm" type="submit">Отправить файл</button>
  </form>`;
}

export function documentsPage(ctx, docs) {
  return cabShell(ctx, {
    title: 'Документы',
    active: '/cabinet/documents/',
    body: docs.length
      ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Документ</th><th>Дело</th><th>Дата</th><th>Статус</th><th></th></tr></thead><tbody>${docs.map((d) => {
          const st = DOC_STATUS[d.status] || DOC_STATUS.received;
          const k = kindOfMime(d.mime);
          return html`<tr><td><b>${d.original_name}</b><br><span class="muted">${ALLOWED[k]?.label || ''} · ${fileSize(d.size)} · ${d.from_firm ? 'от специалиста' : 'от вас'}</span></td><td><a href="/cabinet/cases/${d.case_number}/">${d.case_number}</a></td><td class="num">${date(d.created_at)}</td><td>${statusPill(...st)}</td><td><a class="chip" href="/cabinet/documents/${d.id}/download/">${icon('download')}Скачать</a></td></tr>`;
        })}</tbody></table></div>`
      : emptyState('value-documents', 'Документов пока нет', 'Загрузить документ можно на странице дела. Готовые документы от специалиста тоже появятся здесь.'),
  });
}

export function invoicesPage(ctx, list) {
  return cabShell(ctx, {
    title: 'Счета и оплата',
    active: '/cabinet/invoices/',
    body: html`<p class="muted">Здесь видны счета, выставленные по вашим делам. Оплата проходит на защищённой странице платёжной системы, статус подтверждает сервер.</p>
${list.length ? html`<div class="rows">${list.map(invoiceRow)}</div>` : emptyState('debt-collection', 'Счетов нет', 'Счёт появится после того, как вы со специалистом согласуете объём работы и стоимость.')}`,
  });
}

export function invoicePage(ctx, { inv, payments, returned }) {
  const payable = inv.status === 'issued' || inv.status === 'pending';
  return cabShell(ctx, {
    title: `Счёт ${inv.number}`,
    active: '/cabinet/invoices/',
    actions: html`<a class="link-arrow" href="/cabinet/invoices/">${icon('arrow-left')}Все счета</a>`,
    body: html`
${returned && inv.status === 'pending' ? alert('info', 'Ждём подтверждения оплаты от платёжной системы. Обычно это занимает до минуты — обновите страницу.') : ''}
${returned && inv.status === 'issued' ? alert('warning', 'Оплата не завершена. Можно попробовать ещё раз.') : ''}
${inv.status === 'paid' ? alert('success', `Счёт оплачен ${date(inv.paid_at, true)}.`) : ''}
<div class="card" style="gap:var(--s-5)">
  <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">${invoiceStatus(inv.status)}<span class="muted">от ${date(inv.created_at)}</span></div>
  <dl class="dl">
    <dt>Услуга</dt><dd>${inv.description}</dd>
    <dt>Дело</dt><dd><a href="/cabinet/cases/${inv.case_number}/">${inv.case_number} · ${inv.case_title}</a></dd>
    <dt>Сумма</dt><dd style="font:700 1.5rem/1.2 var(--font-display);color:var(--c-primary)">${rub(inv.amount_kop)}</dd>
    ${inv.due_at ? html`<dt>Оплатить до</dt><dd>${date(inv.due_at)}</dd>` : ''}
    <dt>Получатель</dt><dd>${company.legalName}, ИНН ${company.inn}</dd>
  </dl>
  ${payable ? html`<form method="post" action="/cabinet/invoices/${inv.number}/pay/">${csrfField(ctx)}<button class="btn btn--gold btn--shine" type="submit">${icon('lock')}Оплатить ${rub(inv.amount_kop)}</button></form>
    <p class="muted" style="font-size:var(--fs-14)">Вы перейдёте на страницу платёжной системы. Данные карты вводятся там — сайт их не получает и не хранит.</p>` : ''}
  ${inv.status === 'pending' ? html`<form method="post" action="/cabinet/invoices/${inv.number}/refresh/">${csrfField(ctx)}<button class="btn btn--ghost btn--sm" type="submit">Проверить статус оплаты</button></form>` : ''}
</div>
${payments.length ? html`<section class="stack"><h2 style="font-size:var(--fs-h3)">Попытки оплаты</h2><div class="table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>${payments.map((p) => html`<tr><td class="num">${date(p.created_at, true)}</td><td class="num">${rub(p.amount_kop)}</td><td>${statusPill(...(PAY_STATUS[p.status] || PAY_STATUS.pending))}</td></tr>`)}</tbody></table></div></section>` : ''}`,
  });
}

export function paymentsPage(ctx, list) {
  return cabShell(ctx, {
    title: 'История платежей',
    active: '/cabinet/payments/',
    body: list.length
      ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Счёт</th><th>Назначение</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>${list.map((p) => html`<tr><td class="num">${date(p.paid_at || p.created_at, true)}</td><td><a href="/cabinet/invoices/${p.invoice_number}/">${p.invoice_number}</a></td><td>${p.description}</td><td class="num">${rub(p.amount_kop)}</td><td>${statusPill(...(PAY_STATUS[p.status] || PAY_STATUS.pending))}</td></tr>`)}</tbody></table></div>`
      : emptyState('debt-collection', 'Платежей пока не было', 'После оплаты счёта здесь появится запись с датой и статусом.'),
  });
}

export function libraryPage(ctx, { bookmarks, notes }) {
  return cabShell(ctx, {
    title: 'Закладки и заметки',
    active: '/cabinet/library/',
    body: html`
<section class="stack"><h2 style="font-size:var(--fs-h3)">Закладки</h2>
${bookmarks.length ? html`<ul class="list-links">${bookmarks.map((b) => html`<li style="display:flex;gap:8px;align-items:center"><a href="${b.path}" style="flex:1"><span>${b.title}</span>${icon('arrow')}</a><form method="post" action="/cabinet/bookmarks/toggle/">${csrfField(ctx)}<input type="hidden" name="path" value="${b.path}"><input type="hidden" name="title" value="${b.title}"><input type="hidden" name="back" value="/cabinet/library/"><button class="icon-btn" type="submit" aria-label="Удалить закладку">${icon('trash')}</button></form></li>`)}</ul>` : emptyState('step-2', 'Закладок пока нет', 'Откройте статью или образец документа и нажмите «Сохранить в закладки».', html`<a class="btn btn--ghost" href="/knowledge/">Открыть базу знаний</a>`)}
</section>
<section class="stack"><h2 style="font-size:var(--fs-h3)">Мои заметки</h2>
<p class="muted">Заметки видите только вы. Специалист их не получает.</p>
<form class="form card" method="post" action="/cabinet/notes/">${csrfField(ctx)}<div class="field"><label for="n-body">Новая заметка</label><textarea class="textarea" id="n-body" name="body" maxlength="5000" required style="min-height:100px"></textarea></div><div><button class="btn btn--primary btn--sm" type="submit">Сохранить</button></div></form>
${notes.map((n) => html`<div class="card"><p class="body" style="white-space:pre-wrap;color:var(--c-text)">${n.body}</p><div style="display:flex;justify-content:space-between;align-items:center"><span class="muted" style="font-size:var(--fs-14)">${date(n.updated_at, true)}</span><form method="post" action="/cabinet/notes/${n.id}/delete/">${csrfField(ctx)}<button class="btn btn--ghost btn--sm" type="submit">Удалить</button></form></div></div>`)}
</section>`,
  });
}

export function profilePage(ctx, { errors = {} } = {}) {
  const u = ctx.user;
  return cabShell(ctx, {
    title: 'Профиль и безопасность',
    active: '/cabinet/profile/',
    body: html`
<form class="form card" method="post" action="/cabinet/profile/">
  ${csrfField(ctx)}
  <h2 style="font-size:var(--fs-h4)">Данные</h2>
  <div class="form-row">
    <div class="field"><label for="p-name">Имя</label><input class="input" id="p-name" name="name" maxlength="120" value="${u.name}" autocomplete="name"></div>
    <div class="field"><label for="p-phone">Телефон</label><input class="input" id="p-phone" name="phone" maxlength="40" value="${u.phone}" autocomplete="tel" inputmode="tel"></div>
  </div>
  <dl class="dl"><dt>E-mail</dt><dd>${u.email || '—'} ${u.email_verified_at ? statusPill('success', 'подтверждён') : u.email ? statusPill('warning', 'не подтверждён') : ''}</dd>${u.login ? html`<dt>Логин</dt><dd>${u.login}</dd>` : ''}</dl>
  <div><button class="btn btn--primary btn--sm" type="submit">Сохранить</button></div>
</form>
<form class="form card" method="post" action="/cabinet/profile/password/">
  ${csrfField(ctx)}
  <h2 style="font-size:var(--fs-h4)">${u.hasPassword ? 'Сменить пароль' : 'Задать пароль'}</h2>
  ${errors.password ? alert('error', errors.password) : ''}
  ${u.hasPassword ? html`<div class="field"><label for="p-old">Текущий пароль</label><input class="input" id="p-old" name="current" type="password" autocomplete="current-password" required></div>` : html`<p class="muted">Сейчас вы входите по коду. Пароль можно задать для быстрого входа.</p>`}
  <div class="field"><label for="p-new">Новый пароль</label><input class="input" id="p-new" name="password" type="password" autocomplete="new-password" minlength="10" required><span class="hint">Не короче 10 символов.</span></div>
  <div><button class="btn btn--primary btn--sm" type="submit">Сохранить пароль</button></div>
</form>
<form class="card" method="post" action="/cabinet/profile/sessions/">${csrfField(ctx)}<h2 style="font-size:var(--fs-h4)">Сеансы</h2><p class="muted">Выйти на всех других устройствах — полезно, если вы входили с чужого компьютера.</p><div><button class="btn btn--ghost btn--sm" type="submit">Завершить другие сеансы</button></div></form>`,
  });
}

export function helpPage(ctx) {
  return cabShell(ctx, {
    title: 'Помощь',
    active: '/cabinet/help/',
    body: html`<div class="grid grid--2">
  <div class="card"><h2 style="font-size:var(--fs-h4)">Связаться со специалистом</h2><p>По конкретному делу удобнее писать на странице дела — сообщение сохранится в истории.</p>${company.phones.map((p) => html`<a href="tel:${p.tel}" style="font-weight:600">${p.display}</a>`)}<a href="mailto:${company.email}">${company.email}</a></div>
  <div class="card"><h2 style="font-size:var(--fs-h4)">Как устроен кабинет</h2><ul style="margin:0;padding-left:1.2em;display:grid;gap:6px;color:var(--c-text-2)"><li>Статус дела меняет специалист — вы видите его сразу.</li><li>Документы доступны только вам и специалисту по делу.</li><li>Счёт считается оплаченным, только когда платёжная система подтвердила оплату.</li></ul></div>
</div>`,
  });
}

// ── Панель юриста ──────────────────────────────────────────────────────────
const STAFF_NAV = [['/staff/', 'briefcase', 'Дела'], ['/staff/requests/', 'chat', 'Обращения'], ['/staff/cases/new/', 'plus', 'Новое дело']];

export function staffShell(ctx, { title, active, body }) {
  return layout(ctx, {
    title: title + ' · Панель юриста' + S,
    description: '',
    noindex: true,
    body: html`<div class="wrap cab">
  <nav class="cab-nav" aria-label="Панель юриста">${STAFF_NAV.map(([href, ic, label]) => html`<a href="${href}" ${active === href ? html`aria-current="page"` : ''}>${icon(ic)}${label}</a>`)}
  <form method="post" action="/logout/" style="display:contents">${csrfField(ctx)}<button class="cab-logout" type="submit">${icon('logout')}Выйти</button></form></nav>
  <div class="cab-main"><div class="cab-title"><h1>${title}</h1></div>${flash(ctx)}${body}</div>
</div>`,
  });
}

export function staffCasesPage(ctx, list) {
  return staffShell(ctx, {
    title: 'Дела',
    active: '/staff/',
    body: list.length ? html`<div class="rows">${list.map((c) => html`<a class="row" href="/staff/cases/${c.number}/"><div><div class="title">${c.title}</div><div class="meta">${c.number} · клиент #${c.client_id} · ${c.lawyer_id ? 'назначено' : 'не назначено'} · ${date(c.updated_at)}</div></div>${caseStatus(c.status)}</a>`)}</div>` : emptyState('value-documents', 'Дел нет', 'Создайте дело из обращения или вручную.'),
  });
}

export function staffRequestsPage(ctx, list) {
  return staffShell(ctx, {
    title: 'Обращения',
    active: '/staff/requests/',
    body: list.length ? html`<div class="rows">${list.map((r) => html`<div class="card" style="gap:8px">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><b>${r.number} · ${r.name}</b>${statusPill(...(REQ_STATUS[r.status] || REQ_STATUS.new))}</div>
      <div class="muted">${r.contact} · ${date(r.created_at, true)} · ${r.topic || 'тема не указана'} · со страницы ${r.source_path}</div>
      <p style="white-space:pre-wrap;color:var(--c-text)">${r.message}</p>
      ${r.status === 'new' ? html`<div style="display:flex;gap:8px;flex-wrap:wrap">
        ${r.email ? html`<form method="post" action="/staff/requests/${r.number}/accept/">${csrfField(ctx)}<button class="btn btn--primary btn--sm" type="submit">Открыть дело</button></form>` : html`<span class="muted" style="font-size:var(--fs-14)">Для дела нужен e-mail клиента — свяжитесь по телефону и создайте дело вручную.</span>`}
        <form method="post" action="/staff/requests/${r.number}/close/">${csrfField(ctx)}<button class="btn btn--ghost btn--sm" type="submit">Закрыть</button></form>
      </div>` : r.case_id ? html`<span class="muted">Дело создано</span>` : ''}
    </div>`)}</div>` : emptyState('step-1', 'Обращений нет', 'Новые обращения с сайта появятся здесь.'),
  });
}

export function staffNewCasePage(ctx, { error, values = {} } = {}) {
  return staffShell(ctx, {
    title: 'Новое дело',
    active: '/staff/cases/new/',
    body: html`<form class="form card" method="post" action="/staff/cases/new/">${csrfField(ctx)}
      ${error ? alert('error', error) : ''}
      <div class="field"><label for="nc-email">E-mail клиента</label><input class="input" id="nc-email" name="email" type="email" required value="${values.email || ''}"><span class="hint">Если кабинета нет, он будет создан; клиент войдёт по коду на этот адрес.</span></div>
      <div class="field"><label for="nc-name">Имя клиента</label><input class="input" id="nc-name" name="name" maxlength="120" value="${values.name || ''}"></div>
      <div class="field"><label for="nc-title">Название дела</label><input class="input" id="nc-title" name="title" maxlength="200" required value="${values.title || ''}"></div>
      <div><button class="btn btn--primary" type="submit">Создать дело</button></div>
    </form>`,
  });
}

function staffCaseControls(ctx, c, staff) {
  return html`<form class="form card" method="post" action="/staff/cases/${c.number}/update/">${csrfField(ctx)}
    <h2 style="font-size:var(--fs-h4)">Управление делом</h2>
    <div class="form-row">
      <div class="field"><label for="sc-status">Статус</label><select class="input select" id="sc-status" name="status">${Object.entries(CASE_STATUSES).map(([v, s]) => html`<option value="${v}" ${c.status === v ? html`selected` : ''}>${s.label}</option>`)}</select></div>
      <div class="field"><label for="sc-lawyer">Ответственный</label><select class="input select" id="sc-lawyer" name="lawyer_id"><option value="">Не назначен</option>${staff.map((s) => html`<option value="${s.id}" ${c.lawyer_id === s.id ? html`selected` : ''}>${s.name || s.email}</option>`)}</select></div>
    </div>
    <div class="field"><label for="sc-title">Название</label><input class="input" id="sc-title" name="title" maxlength="200" value="${c.title}" required></div>
    <div class="form-row">
      <div class="field"><label for="sc-next">Следующий шаг для клиента</label><input class="input" id="sc-next" name="next_step" maxlength="300" value="${c.next_step}"></div>
      <div class="field"><label for="sc-deadline">Согласованный срок</label><input class="input" id="sc-deadline" name="deadline_at" type="date" value="${c.deadline_at ? c.deadline_at.slice(0, 10) : ''}"></div>
    </div>
    <div class="field"><label for="sc-comment">Комментарий к смене статуса (увидит клиент)</label><input class="input" id="sc-comment" name="comment" maxlength="300"></div>
    <div><button class="btn btn--primary btn--sm" type="submit">Сохранить</button></div>
  </form>`;
}

function invoiceForm(ctx, c) {
  return html`<form class="form" method="post" action="/staff/cases/${c.number}/invoice/" style="border-top:1px dashed var(--c-line);padding-top:var(--s-4)">${csrfField(ctx)}
    <div class="field"><label for="iv-desc">Услуга</label><input class="input" id="iv-desc" name="description" maxlength="200" required placeholder="Подготовка жалобы в прокуратуру"></div>
    <div class="form-row"><div class="field"><label for="iv-amount">Сумма, ₽</label><input class="input" id="iv-amount" name="amount" inputmode="decimal" required placeholder="15000"></div>
    <div class="field"><label for="iv-due">Оплатить до</label><input class="input" id="iv-due" name="due_at" type="date"></div></div>
    <label class="check"><input type="checkbox" name="need_payment" value="1" checked><span>Перевести дело в статус «Ожидаем оплату»</span></label>
    <div><button class="btn btn--primary btn--sm" type="submit">Выставить счёт</button></div>
  </form>`;
}

export function testPayPage(ctx, p, inv) {
  return layout(ctx, {
    title: 'Тестовая оплата' + S,
    description: '',
    noindex: true,
    body: html`<section class="auth wrap"><div class="auth-card">
      ${alert('warning', 'Тестовый режим оплаты. Деньги не списываются. В production этот экран недоступен.')}
      <h1 style="font-size:1.5rem">Счёт ${inv.number}</h1>
      <p>${inv.description}</p><p style="font:700 1.75rem/1 var(--font-display)">${rub(p.amountKop)}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <form method="post" action="/dev/test-pay/${p.id}/">${csrfField(ctx)}<input type="hidden" name="result" value="succeeded"><button class="btn btn--primary" type="submit">Оплатить успешно</button></form>
        <form method="post" action="/dev/test-pay/${p.id}/">${csrfField(ctx)}<input type="hidden" name="result" value="canceled"><button class="btn btn--ghost" type="submit">Отменить</button></form>
        <form method="post" action="/dev/test-pay/${p.id}/">${csrfField(ctx)}<input type="hidden" name="result" value="pending"><button class="btn btn--ghost" type="submit">Оставить в ожидании</button></form>
      </div>
    </div></section>`,
  });
}
