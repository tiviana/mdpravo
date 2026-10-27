// Контекст запроса: разбор cookie и тела, ответы, редиректы.
import { config } from '../config.js';

export class HttpError extends Error {
  constructor(status, message, opts = {}) {
    super(message);
    this.status = status;
    this.expose = opts.expose ?? status < 500;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (!k || k in out) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export async function readRaw(req, limit) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > limit) throw new HttpError(413, 'Слишком большой запрос');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'Слишком большой запрос');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Обёртка над URLSearchParams/FormData с удобным get(). */
export class Form {
  constructor(entries = []) {
    this.map = new Map();
    for (const [k, v] of entries) {
      if (!this.map.has(k)) this.map.set(k, []);
      this.map.get(k).push(v);
    }
  }
  get(k) {
    const v = this.map.get(k)?.[0];
    return typeof v === 'string' ? v : v ?? null;
  }
  str(k, max = 10000) {
    const v = this.get(k);
    return typeof v === 'string' ? v.slice(0, max).trim() : '';
  }
  all(k) {
    return this.map.get(k) || [];
  }
  has(k) {
    return this.map.has(k);
  }
}

export class Ctx {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.method = req.method;
    this.url = new URL(req.url, 'http://local');
    this.path = this.url.pathname;
    this.query = this.url.searchParams;
    this.params = {};
    this.state = {};
    this.cookies = parseCookies(req.headers.cookie);
    this.outCookies = [];
    this.headers = {};
    this.user = null;
    this.session = null;
    this._form = null;
  }

  get ip() {
    if (config.trustProxy) {
      const xf = this.req.headers['x-forwarded-for'];
      if (xf) return String(xf).split(',')[0].trim();
    }
    return this.req.socket?.remoteAddress || '0.0.0.0';
  }

  get isSecure() {
    return config.baseUrl.startsWith('https://');
  }

  setHeader(k, v) {
    this.headers[k] = v;
  }

  setCookie(name, value, opts = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path || '/'}`];
    if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
    if (opts.httpOnly !== false) parts.push('HttpOnly');
    parts.push(`SameSite=${opts.sameSite || 'Lax'}`);
    if (this.isSecure) parts.push('Secure');
    this.outCookies.push(parts.join('; '));
  }

  clearCookie(name) {
    this.setCookie(name, '', { maxAge: 0 });
  }

  _writeHead(status, headers) {
    const h = { ...this.state.securityHeaders, ...this.headers, ...headers };
    if (this.outCookies.length) h['Set-Cookie'] = this.outCookies;
    this.res.writeHead(status, h);
  }

  send(status, body, headers = {}) {
    if (this.res.headersSent) return;
    const buf = typeof body === 'string' ? Buffer.from(body) : body;
    this._writeHead(status, { 'Content-Length': buf ? buf.length : 0, ...headers });
    this.res.end(this.method === 'HEAD' ? undefined : buf);
  }

  html(body, status = 200, extra = {}) {
    this.send(status, String(body), {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': this.state.private ? 'no-store' : 'private, no-cache',
      ...extra,
    });
  }

  json(obj, status = 200) {
    this.send(status, JSON.stringify(obj), {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
  }

  text(s, status = 200, type = 'text/plain; charset=utf-8', extra = {}) {
    this.send(status, s, { 'Content-Type': type, ...extra });
  }

  redirect(location, status = 303) {
    this.send(status, '', { Location: location, 'Cache-Control': 'no-store' });
  }

  /** Разбор тела формы (urlencoded или multipart). */
  async form(limit = 64 * 1024) {
    if (this._form) return this._form;
    const ct = String(this.req.headers['content-type'] || '');
    if (ct.startsWith('application/x-www-form-urlencoded')) {
      const buf = await readRaw(this.req, limit);
      this._form = new Form(new URLSearchParams(buf.toString('utf8')));
    } else if (ct.startsWith('multipart/form-data')) {
      const buf = await readRaw(this.req, limit);
      const fd = await new Request('http://local/', {
        method: 'POST',
        headers: { 'content-type': ct },
        body: buf,
      }).formData();
      this._form = new Form(fd.entries());
    } else if (ct.startsWith('application/json')) {
      const buf = await readRaw(this.req, limit);
      let obj;
      try {
        obj = JSON.parse(buf.toString('utf8') || '{}');
      } catch {
        throw new HttpError(400, 'Некорректный JSON');
      }
      this.jsonBody = obj;
      this._form = new Form(Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
    } else {
      this._form = new Form();
    }
    return this._form;
  }
}
