-- Базовая схема. Деньги храним в копейках (INTEGER), время — ISO 8601 UTC (TEXT).

CREATE TABLE users (
  id               INTEGER PRIMARY KEY,
  login            TEXT UNIQUE COLLATE NOCASE,
  email            TEXT UNIQUE COLLATE NOCASE,
  email_verified_at TEXT,
  name             TEXT NOT NULL DEFAULT '',
  phone            TEXT NOT NULL DEFAULT '',
  password_hash    TEXT,
  role             TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'lawyer', 'admin')),
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  disabled_at      TEXT,
  CHECK (login IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE sessions (
  id_hash      TEXT PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE login_codes (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL COLLATE NOCASE,
  code_hash  TEXT NOT NULL,
  purpose    TEXT NOT NULL DEFAULT 'login',
  attempts   INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX login_codes_email ON login_codes(email, created_at);

-- Обращения с сайта (до того, как стали делом)
CREATE TABLE requests (
  id          INTEGER PRIMARY KEY,
  number      TEXT NOT NULL UNIQUE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  contact     TEXT NOT NULL,
  email       TEXT,
  topic       TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL,
  source_path TEXT NOT NULL DEFAULT '',
  consent_at  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'rejected', 'spam')),
  case_id     INTEGER REFERENCES cases(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX requests_status ON requests(status, created_at);
CREATE INDEX requests_user ON requests(user_id);

CREATE TABLE cases (
  id          INTEGER PRIMARY KEY,
  number      TEXT NOT NULL UNIQUE,
  client_id   INTEGER NOT NULL REFERENCES users(id),
  lawyer_id   INTEGER REFERENCES users(id),
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'review', 'need_docs', 'need_payment', 'in_progress', 'done', 'closed')),
  next_step   TEXT NOT NULL DEFAULT '',
  deadline_at TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX cases_client ON cases(client_id, updated_at);
CREATE INDEX cases_lawyer ON cases(lawyer_id, updated_at);

-- Лента дела: смена статуса, сообщения, документы, счета, оплаты
CREATE TABLE case_events (
  id         INTEGER PRIMARY KEY,
  case_id    INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  author_id  INTEGER REFERENCES users(id),
  kind       TEXT NOT NULL CHECK (kind IN ('created', 'status', 'message', 'document', 'invoice', 'payment', 'note')),
  body       TEXT NOT NULL DEFAULT '',
  internal   INTEGER NOT NULL DEFAULT 0,
  read_by_client_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX case_events_case ON case_events(case_id, created_at);

CREATE TABLE documents (
  id            INTEGER PRIMARY KEY,
  case_id       INTEGER NOT NULL REFERENCES cases(id),
  uploader_id   INTEGER NOT NULL REFERENCES users(id),
  original_name TEXT NOT NULL,
  stored_name   TEXT NOT NULL UNIQUE,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  sha256        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'checked', 'needs_fix')),
  from_firm     INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  deleted_at    TEXT
);
CREATE INDEX documents_case ON documents(case_id, created_at);

CREATE TABLE invoices (
  id          INTEGER PRIMARY KEY,
  number      TEXT NOT NULL UNIQUE,
  case_id     INTEGER NOT NULL REFERENCES cases(id),
  client_id   INTEGER NOT NULL REFERENCES users(id),
  amount_kop  INTEGER NOT NULL CHECK (amount_kop > 0),
  currency    TEXT NOT NULL DEFAULT 'RUB',
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'issued'
              CHECK (status IN ('issued', 'pending', 'paid', 'canceled', 'refunded')),
  created_by  INTEGER NOT NULL REFERENCES users(id),
  due_at      TEXT,
  paid_at     TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX invoices_client ON invoices(client_id, status);

CREATE TABLE payments (
  id                  INTEGER PRIMARY KEY,
  invoice_id          INTEGER NOT NULL REFERENCES invoices(id),
  provider            TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  idempotence_key     TEXT NOT NULL UNIQUE,
  amount_kop          INTEGER NOT NULL,
  status              TEXT NOT NULL
                      CHECK (status IN ('pending', 'waiting_for_capture', 'succeeded', 'canceled', 'refunded', 'partially_refunded')),
  confirmation_url    TEXT,
  cancel_reason       TEXT,
  paid_at             TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  UNIQUE (provider, provider_payment_id)
);
CREATE INDEX payments_invoice ON payments(invoice_id);

-- Журнал входящих уведомлений: защита от повторной обработки
CREATE TABLE payment_notifications (
  id                  INTEGER PRIMARY KEY,
  provider            TEXT NOT NULL,
  event               TEXT NOT NULL,
  object_id           TEXT NOT NULL,
  verified_status     TEXT,
  received_at         TEXT NOT NULL,
  UNIQUE (provider, event, object_id)
);

CREATE TABLE bookmarks (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  title      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, path)
);

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX notes_user ON notes(user_id, updated_at);

CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER,
  action     TEXT NOT NULL,
  target     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

-- Полные тексты страниц старого сайта (импорт), очищенные от опасной разметки
CREATE TABLE legacy_content (
  path        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  html        TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE search_index USING fts5(
  path UNINDEXED, kind UNINDEXED, title, body,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
