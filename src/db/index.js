// Доступ к SQLite (node:sqlite) и миграции. Вся работа с SQL — через этот модуль и src/repos.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

const MIGRATIONS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'migrations');

let db = null;

export function now() {
  return new Date().toISOString();
}

export function open(file = config.dbPath) {
  if (db) return db;
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA synchronous = NORMAL');
  return db;
}

export function close() {
  if (db) db.close();
  db = null;
}

function conn() {
  return db || open();
}

export function one(sql, ...params) {
  return conn().prepare(sql).get(...params) ?? null;
}

export function all(sql, ...params) {
  return conn().prepare(sql).all(...params);
}

export function run(sql, ...params) {
  const r = conn().prepare(sql).run(...params);
  return { changes: Number(r.changes), id: Number(r.lastInsertRowid) };
}

export function exec(sql) {
  conn().exec(sql);
}

let txDepth = 0;
/** Транзакция; вложенные вызовы выполняются внутри внешней. */
export function tx(fn) {
  if (txDepth > 0) return fn();
  const c = conn();
  c.exec('BEGIN IMMEDIATE');
  txDepth++;
  try {
    const result = fn();
    c.exec('COMMIT');
    return result;
  } catch (e) {
    c.exec('ROLLBACK');
    throw e;
  } finally {
    txDepth--;
  }
}

export function migrate() {
  const c = conn();
  c.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const applied = new Set(all('SELECT version FROM schema_migrations').map((r) => r.version));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const done = [];
  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    tx(() => {
      c.exec(sql);
      run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', f, now());
    });
    done.push(f);
  }
  return done;
}

/** Номер вида MP-2026-00042 из атомарного счётчика. */
export function nextNumber(name, prefix) {
  const year = new Date().getUTCFullYear();
  const key = `${name}:${year}`;
  return tx(() => {
    run('INSERT INTO counters (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1', key);
    const { value } = one('SELECT value FROM counters WHERE name = ?', key);
    return `${prefix}-${year}-${String(value).padStart(5, '0')}`;
  });
}
