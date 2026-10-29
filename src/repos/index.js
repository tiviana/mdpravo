// Слой данных. Все SQL-запросы приложения — здесь (кроме платежей: src/payments/service.js).
// Права доступа к делам проверяются функциями caseForUser / canSeeCase.
import crypto from 'node:crypto';
import { config } from '../config.js';
import * as db from '../db/index.js';

const now = db.now;

// ── Пользователи ───────────────────────────────────────────────────────────
export const users = {
  byId: (id) => db.one('SELECT * FROM users WHERE id = ?', id),
  byLogin: (login) => db.one('SELECT * FROM users WHERE login = ?', login),
  byEmail: (email) => db.one('SELECT * FROM users WHERE email = ?', email),
  create({ login = null, email = null, name = '', phone = '', passwordHash = null, role = 'client', emailVerified = false }) {
    const t = now();
    const { id } = db.run(
      `INSERT INTO users (login, email, email_verified_at, name, phone, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      login, email, emailVerified ? t : null, name, phone, passwordHash, role, t, t,
    );
    return users.byId(id);
  },
  setPassword: (id, hash) => db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', hash, now(), id),
  verifyEmail: (id) => db.run('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?', now(), now(), id),
  setEmail: (id, email) => db.run('UPDATE users SET email = ?, email_verified_at = ?, updated_at = ? WHERE id = ?', email, now(), now(), id),
  updateProfile: (id, { name, phone }) => db.run('UPDATE users SET name = ?, phone = ?, updated_at = ? WHERE id = ?', name, phone, now(), id),
  setRole: (id, role) => db.run('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', role, now(), id),
  staff: () => db.all("SELECT id, name, email, role FROM users WHERE role IN ('lawyer', 'admin') AND disabled_at IS NULL ORDER BY name"),
};

export function displayName(u) {
  return u?.name || u?.login || (u?.email ? u.email.split('@')[0] : 'Клиент');
}

// ── Одноразовые коды входа ─────────────────────────────────────────────────
const CODE_TTL_MIN = 10;
const CODE_MAX_ATTEMPTS = 5;

function codeHash(email, code) {
  return crypto.createHmac('sha256', config.secret).update(`${email.toLowerCase()}|${code}`).digest('hex');
}

export const codes = {
  /** Создаёт код и возвращает его (для отправки письмом). Старые коды этого адреса гасятся. */
  issue(email, purpose = 'login') {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const t = now();
    db.tx(() => {
      db.run('UPDATE login_codes SET used_at = ? WHERE email = ? AND used_at IS NULL', t, email);
      db.run(
        'INSERT INTO login_codes (email, code_hash, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
        email, codeHash(email, code), purpose,
        new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(), t,
      );
    });
    return code;
  },
  /** true — код верный (и погашен). Ошибочные попытки считаются. */
  verify(email, code) {
    const row = db.one(
      `SELECT * FROM login_codes WHERE email = ? AND used_at IS NULL AND expires_at > ?
       ORDER BY id DESC LIMIT 1`,
      email, now(),
    );
    if (!row) return false;
    if (row.attempts >= CODE_MAX_ATTEMPTS) return false;
    const ok = /^\d{6}$/.test(code) && crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(codeHash(email, code)));
    if (ok) db.run('UPDATE login_codes SET used_at = ? WHERE id = ?', now(), row.id);
    else db.run('UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?', row.id);
    return ok;
  },
};

// ── Обращения с сайта ──────────────────────────────────────────────────────
export const requests = {
  create({ userId = null, name, contact, email = null, topic = '', message, sourcePath = '' }) {
    const number = db.nextNumber('request', 'MP');
    const t = now();
    const { id } = db.run(
      `INSERT INTO requests (number, user_id, name, contact, email, topic, message, source_path, consent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      number, userId, name, contact, email, topic, message, sourcePath, t, t,
    );
    return db.one('SELECT * FROM requests WHERE id = ?', id);
  },
  byNumber: (n) => db.one('SELECT * FROM requests WHERE number = ?', n),
  forUser: (userId) => db.all('SELECT * FROM requests WHERE user_id = ? ORDER BY id DESC', userId),
  list: (status) =>
    status
      ? db.all('SELECT * FROM requests WHERE status = ? ORDER BY id DESC LIMIT 200', status)
      : db.all('SELECT * FROM requests ORDER BY id DESC LIMIT 200'),
  setStatus: (id, status) => db.run('UPDATE requests SET status = ? WHERE id = ?', status, id),
  linkCase: (id, caseId) => db.run("UPDATE requests SET case_id = ?, status = 'accepted' WHERE id = ?", caseId, id),
  attachToUserByEmail: (email, userId) =>
    db.run('UPDATE requests SET user_id = ? WHERE email = ? AND user_id IS NULL', userId, email),
};

// ── Дела ───────────────────────────────────────────────────────────────────
export const CASE_STATUSES = {
  new: { label: 'Новое обращение', tone: 'neutral', hint: 'Мы получили обращение и скоро свяжемся.' },
  review: { label: 'На рассмотрении', tone: 'info', hint: 'Специалист изучает ситуацию.' },
  need_docs: { label: 'Ожидаем документы', tone: 'warning', hint: 'Загрузите документы, о которых просил специалист.' },
  need_payment: { label: 'Ожидаем оплату', tone: 'warning', hint: 'Оплатите счёт, чтобы мы начали работу.' },
  in_progress: { label: 'В работе', tone: 'accent', hint: 'Специалист готовит документы и позицию.' },
  done: { label: 'Завершено', tone: 'success', hint: 'Работа по делу завершена.' },
  closed: { label: 'Закрыто', tone: 'neutral', hint: 'Дело закрыто без выполнения работ.' },
};

export const cases = {
  create({ clientId, title, lawyerId = null, requestId = null, authorId = null }) {
    return db.tx(() => {
      const number = db.nextNumber('case', 'D');
      const t = now();
      const { id } = db.run(
        `INSERT INTO cases (number, client_id, lawyer_id, title, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'review', ?, ?)`,
        number, clientId, lawyerId, title, t, t,
      );
      db.run("INSERT INTO case_events (case_id, author_id, kind, body, created_at) VALUES (?, ?, 'created', ?, ?)", id, authorId, 'Дело открыто', t);
      if (requestId) requests.linkCase(requestId, id);
      return cases.byId(id);
    });
  },
  byId: (id) => db.one('SELECT * FROM cases WHERE id = ?', id),
  byNumber: (n) => db.one('SELECT * FROM cases WHERE number = ?', n),
  forClient: (clientId) => db.all('SELECT * FROM cases WHERE client_id = ? ORDER BY updated_at DESC', clientId),
  forStaff(user) {
    if (user.role === 'admin') return db.all('SELECT * FROM cases ORDER BY updated_at DESC LIMIT 300');
    return db.all('SELECT * FROM cases WHERE lawyer_id = ? OR lawyer_id IS NULL ORDER BY updated_at DESC LIMIT 300', user.id);
  },
  setStatus(caseRow, status, authorId, comment = '') {
    if (!CASE_STATUSES[status]) throw new Error('unknown status');
    if (caseRow.status === status) return;
    const t = now();
    db.tx(() => {
      db.run('UPDATE cases SET status = ?, updated_at = ? WHERE id = ?', status, t, caseRow.id);
      const body = CASE_STATUSES[status].label + (comment ? ` — ${comment}` : '');
      db.run("INSERT INTO case_events (case_id, author_id, kind, body, created_at) VALUES (?, ?, 'status', ?, ?)", caseRow.id, authorId, body, t);
    });
  },
  update(id, { title, nextStep, deadlineAt, lawyerId }) {
    db.run(
      'UPDATE cases SET title = ?, next_step = ?, deadline_at = ?, lawyer_id = ?, updated_at = ? WHERE id = ?',
      title, nextStep, deadlineAt || null, lawyerId || null, now(), id,
    );
  },
  touch: (id) => db.run('UPDATE cases SET updated_at = ? WHERE id = ?', now(), id),
  addEvent(caseId, authorId, kind, body, internal = false) {
    db.run(
      'INSERT INTO case_events (case_id, author_id, kind, body, internal, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      caseId, authorId, kind, body, internal ? 1 : 0, now(),
    );
    cases.touch(caseId);
  },
  events(caseId, { includeInternal = false } = {}) {
    return db.all(
      `SELECT e.*, u.name AS author_name, u.role AS author_role, u.login AS author_login, u.email AS author_email
         FROM case_events e LEFT JOIN users u ON u.id = e.author_id
        WHERE e.case_id = ? ${includeInternal ? '' : 'AND e.internal = 0'}
        ORDER BY e.id ASC`,
      caseId,
    );
  },
  unreadForClient: (clientId) =>
    db.one(
      `SELECT COUNT(*) AS n FROM case_events e JOIN cases c ON c.id = e.case_id JOIN users u ON u.id = e.author_id
        WHERE c.client_id = ? AND e.internal = 0 AND e.read_by_client_at IS NULL AND u.role != 'client'`,
      clientId,
    ).n,
  markReadByClient: (caseId) =>
    db.run(
      `UPDATE case_events SET read_by_client_at = ? WHERE case_id = ? AND read_by_client_at IS NULL
         AND author_id IN (SELECT id FROM users WHERE role != 'client')`,
      now(), caseId,
    ),
  recentEventsForClient: (clientId, limit = 6) =>
    db.all(
      `SELECT e.*, c.number AS case_number, c.title AS case_title
         FROM case_events e JOIN cases c ON c.id = e.case_id
        WHERE c.client_id = ? AND e.internal = 0 ORDER BY e.id DESC LIMIT ?`,
      clientId, limit,
    ),
};

/** Может ли пользователь видеть дело. Это единственная точка проверки доступа к делу. */
export function canSeeCase(user, caseRow) {
  if (!user || !caseRow) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'lawyer') return caseRow.lawyer_id === user.id || caseRow.lawyer_id === null;
  return caseRow.client_id === user.id;
}

export function caseForUser(user, number) {
  const c = cases.byNumber(number);
  return canSeeCase(user, c) ? c : null;
}

// ── Документы ──────────────────────────────────────────────────────────────
export const documents = {
  create({ caseId, uploaderId, name, stored, mime, size, sha256, fromFirm }) {
    const { id } = db.run(
      `INSERT INTO documents (case_id, uploader_id, original_name, stored_name, mime, size, sha256, from_firm, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      caseId, uploaderId, name, stored, mime, size, sha256, fromFirm ? 1 : 0, now(),
    );
    return db.one('SELECT * FROM documents WHERE id = ?', id);
  },
  byId: (id) => db.one('SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL', id),
  forCase: (caseId) => db.all('SELECT * FROM documents WHERE case_id = ? AND deleted_at IS NULL ORDER BY id DESC', caseId),
  forClient: (clientId) =>
    db.all(
      `SELECT d.*, c.number AS case_number, c.title AS case_title FROM documents d JOIN cases c ON c.id = d.case_id
        WHERE c.client_id = ? AND d.deleted_at IS NULL ORDER BY d.id DESC`,
      clientId,
    ),
  setStatus: (id, status) => db.run('UPDATE documents SET status = ? WHERE id = ?', status, id),
  // мягкое удаление: файл остаётся в хранилище до решения о сроках хранения
  softDelete: (id) => db.run('UPDATE documents SET deleted_at = ? WHERE id = ?', now(), id),
};

// ── Счета ──────────────────────────────────────────────────────────────────
export const INVOICE_STATUSES = {
  issued: { label: 'Ожидает оплаты', tone: 'warning' },
  pending: { label: 'Оплата обрабатывается', tone: 'info' },
  paid: { label: 'Оплачен', tone: 'success' },
  canceled: { label: 'Отменён', tone: 'neutral' },
  refunded: { label: 'Возвращён', tone: 'neutral' },
};

export const invoices = {
  create({ caseRow, amountKop, description, createdBy, dueAt = null }) {
    return db.tx(() => {
      const number = db.nextNumber('invoice', 'S');
      const t = now();
      const { id } = db.run(
        `INSERT INTO invoices (number, case_id, client_id, amount_kop, description, created_by, due_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        number, caseRow.id, caseRow.client_id, amountKop, description, createdBy, dueAt, t, t,
      );
      cases.addEvent(caseRow.id, createdBy, 'invoice', `Выставлен счёт ${number}`);
      return db.one('SELECT * FROM invoices WHERE id = ?', id);
    });
  },
  byNumber: (n) => db.one('SELECT * FROM invoices WHERE number = ?', n),
  byId: (id) => db.one('SELECT * FROM invoices WHERE id = ?', id),
  forClient: (clientId) =>
    db.all(
      `SELECT i.*, c.number AS case_number, c.title AS case_title FROM invoices i JOIN cases c ON c.id = i.case_id
        WHERE i.client_id = ? ORDER BY i.id DESC`,
      clientId,
    ),
  forCase: (caseId) => db.all('SELECT * FROM invoices WHERE case_id = ? ORDER BY id DESC', caseId),
  cancel: (id) => db.run("UPDATE invoices SET status = 'canceled', updated_at = ? WHERE id = ? AND status IN ('issued')", now(), id),
};

export function canSeeInvoice(user, inv) {
  if (!user || !inv) return false;
  if (user.role === 'client') return inv.client_id === user.id;
  return canSeeCase(user, cases.byId(inv.case_id));
}

// ── Закладки и заметки ─────────────────────────────────────────────────────
export const library = {
  bookmarks: (userId) => db.all('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC', userId),
  isBookmarked: (userId, path) => Boolean(db.one('SELECT 1 AS x FROM bookmarks WHERE user_id = ? AND path = ?', userId, path)),
  toggle(userId, path, title) {
    if (library.isBookmarked(userId, path)) {
      db.run('DELETE FROM bookmarks WHERE user_id = ? AND path = ?', userId, path);
      return false;
    }
    db.run('INSERT INTO bookmarks (user_id, path, title, created_at) VALUES (?, ?, ?, ?)', userId, path, title, now());
    return true;
  },
  notes: (userId) => db.all('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC', userId),
  addNote: (userId, body) => db.run('INSERT INTO notes (user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?)', userId, body, now(), now()),
  deleteNote: (userId, id) => db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', id, userId),
};

export function audit(userId, action, target = '') {
  db.run('INSERT INTO audit_log (user_id, action, target, created_at) VALUES (?, ?, ?, ?)', userId, action, target, now());
}
