// Приём и хранение файлов клиентов. Файлы лежат вне публичной папки под случайными именами,
// тип определяется по содержимому (сигнатуре), а не по расширению.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { HttpError } from './http.js';

export const ALLOWED = {
  pdf: { mime: 'application/pdf', label: 'PDF', preview: true },
  jpg: { mime: 'image/jpeg', label: 'JPEG', preview: true },
  png: { mime: 'image/png', label: 'PNG', preview: true },
  webp: { mime: 'image/webp', label: 'WebP', preview: true },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word', preview: false },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel', preview: false },
  doc: { mime: 'application/msword', label: 'Word 97–2003', preview: false },
  txt: { mime: 'text/plain; charset=utf-8', label: 'Текст', preview: false },
};

export const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.doc,.txt';

/** Определяет тип по сигнатуре. Возвращает ключ ALLOWED или null. */
export function sniff(buf, name = '') {
  const ext = path.extname(name).toLowerCase().slice(1);
  if (buf.length < 4) return null;
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
    return ext === 'doc' ? 'doc' : null;
  }
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    // OOXML: внутри ZIP есть [Content_Types].xml и папка word/ или xl/
    const s = buf.toString('latin1');
    if (!s.includes('[Content_Types].xml')) return null;
    if (s.includes('word/')) return 'docx';
    if (s.includes('xl/')) return 'xlsx';
    return null;
  }
  if (ext === 'txt' && isProbablyText(buf)) return 'txt';
  return null;
}

function isProbablyText(buf) {
  const sample = buf.subarray(0, 4096);
  if (sample.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample);
    return true;
  } catch {
    return false;
  }
}

/** Имя для отображения: без путей, управляющих символов и с ограничением длины. */
export function cleanName(name) {
  const base = String(name || 'файл').split(/[\\/]/).pop();
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').replace(/\s+/g, ' ').trim();
  return (cleaned || 'файл').slice(0, 150);
}

export async function storeUpload(file) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new HttpError(400, 'Файл не выбран');
  if (file.size === 0) throw new HttpError(400, 'Файл пустой');
  if (file.size > config.uploads.maxBytes) {
    throw new HttpError(413, `Файл больше ${Math.round(config.uploads.maxBytes / 1048576)} МБ`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf, file.name);
  if (!kind) {
    throw new HttpError(415, 'Этот формат не принимаем. Подойдут PDF, JPG, PNG, WebP, DOCX, XLSX, DOC и TXT.');
  }
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const sub = new Date().toISOString().slice(0, 7);
  const stored = `${sub}/${crypto.randomBytes(16).toString('hex')}`;
  const full = path.join(config.storageDir, stored);
  fs.mkdirSync(path.dirname(full), { recursive: true, mode: 0o700 });
  fs.writeFileSync(full, buf, { mode: 0o600, flag: 'wx' });
  return { stored, kind, mime: ALLOWED[kind].mime, size: buf.length, sha256: sha, name: cleanName(file.name) };
}

export function storedPath(stored) {
  // stored формируется только сервером, но проверяем на всякий случай
  if (!/^\d{4}-\d{2}\/[a-f0-9]{32}$/.test(stored)) throw new HttpError(404, 'Файл не найден');
  return path.join(config.storageDir, stored);
}

export function contentDisposition(name, inline) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export function kindOfMime(mime) {
  return Object.keys(ALLOWED).find((k) => ALLOWED[k].mime === mime) || null;
}
