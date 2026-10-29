// Раздача статики из public/ с защитой от выхода за пределы папки, ETag и кэшированием.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const TYPES = {
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

const cache = new Map();

export function publicFileExists(urlPath) {
  return Boolean(resolve(urlPath));
}

function resolve(urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (rel.includes('\0')) return null;
  const full = path.normalize(path.join(config.publicDir, rel));
  if (!full.startsWith(config.publicDir + path.sep)) return null;
  // скрытые файлы и исходники не раздаём
  if (full.split(path.sep).some((seg) => seg.startsWith('.'))) return null;
  let st;
  try {
    st = fs.statSync(full);
  } catch {
    return null;
  }
  if (!st.isFile()) return null;
  return { full, st };
}

/** true — ответ отправлен. */
export function serveStatic(ctx) {
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') return false;
  const r = resolve(ctx.path);
  if (!r) return false;
  const ext = path.extname(r.full).toLowerCase();
  const type = TYPES[ext];
  if (!type) return false;
  const key = `${r.full}:${r.st.mtimeMs}:${r.st.size}`;
  let entry = cache.get(r.full);
  if (!entry || entry.key !== key) {
    const buf = fs.readFileSync(r.full);
    entry = { key, buf, etag: `"${crypto.createHash('sha1').update(buf).digest('base64url').slice(0, 20)}"` };
    if (buf.length < 2 * 1024 * 1024) cache.set(r.full, entry);
  }
  const versioned = ctx.url.searchParams.has('v') || /\/(fonts|img|brand)\//.test(ctx.path);
  const headers = {
    'Content-Type': type,
    ETag: entry.etag,
    'Cache-Control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  };
  if (ext === '.docx' || ext === '.pdf') headers['X-Content-Type-Options'] = 'nosniff';
  if (ctx.req.headers['if-none-match'] === entry.etag) {
    ctx.send(304, '', headers);
    return true;
  }
  ctx.send(200, entry.buf, headers);
  return true;
}
