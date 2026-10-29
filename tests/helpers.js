// Тестовый сервер на временной БД и простой HTTP-клиент с cookie и CSRF.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdpravo-test-'));
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(tmp, 'test.sqlite');
process.env.STORAGE_DIR = path.join(tmp, 'storage');
process.env.PAYMENT_PROVIDER = 'test';
process.env.SMTP_HOST = '';

const { config } = await import('../src/config.js');
const db = await import('../src/db/index.js');
const { createApp } = await import('../src/app.js');
const { rebuildIndex } = await import('../src/lib/search.js');
const { resetRateLimits } = await import('../src/lib/security.js');

db.open();
db.migrate();
rebuildIndex();

let server;
let base;

export async function start() {
  if (server) return base;
  const { handle } = createApp();
  server = http.createServer(handle);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  // CSRF проверяет Origin по BASE_URL
  config.baseUrl = base;
  return base;
}

export function stop() {
  server?.close();
}

export { config, db, resetRateLimits };

export class Client {
  constructor() {
    this.jar = new Map();
  }
  cookieHeader() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  store(res) {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair, ...attrs] = c.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      if (attrs.some((a) => /max-age=0/i.test(a.trim())) || v === '') this.jar.delete(k);
      else this.jar.set(k, v);
    }
  }
  async req(method, url, { body, headers = {}, origin = true } = {}) {
    const h = { ...headers };
    if (this.jar.size) h.cookie = this.cookieHeader();
    if (origin && method !== 'GET') h.origin = base;
    const res = await fetch(base + url, { method, body, headers: h, redirect: 'manual' });
    this.store(res);
    const text = await res.text();
    return { status: res.status, headers: res.headers, text, location: res.headers.get('location') };
  }
  get(url) {
    return this.req('GET', url);
  }
  async csrf() {
    if (!this.jar.get('csrf')) await this.get('/login/');
    return this.jar.get('csrf');
  }
  async post(url, fields = {}, opts = {}) {
    const p = new URLSearchParams({ _csrf: await this.csrf(), ...fields });
    return this.req('POST', url, { ...opts, body: p, headers: { 'content-type': 'application/x-www-form-urlencoded', ...(opts.headers || {}) } });
  }
  async upload(url, name, buf, type = 'application/octet-stream') {
    const fd = new FormData();
    fd.set('_csrf', await this.csrf());
    fd.set('file', new Blob([buf], { type }), name);
    return this.req('POST', url, { body: fd, headers: { accept: 'application/json' } });
  }
  async login(login, password) {
    const r = await this.post('/login/', { login, password });
    if (r.status !== 303) throw new Error(`login failed: ${r.status}`);
    return r;
  }
}

let seq = 0;
export async function makeUser(role = 'client', email) {
  const { users } = await import('../src/repos/index.js');
  const { hashPassword } = await import('../src/lib/password.js');
  const e = email || `u${++seq}-${Date.now()}@test.local`;
  const pw = 'correct-horse-battery';
  const u = users.create({ email: e, role, name: `${role} ${seq}`, passwordHash: await hashPassword(pw), emailVerified: true });
  return { ...u, password: pw };
}
