// Очистка HTML из импорта старого сайта: остаются только безопасные теги и атрибуты.
// Работает на белом списке: всё неизвестное выбрасывается, текст экранируется.
import { escape } from './html.js';

const ALLOWED = new Set([
  'p', 'br', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'a', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span', 'small', 'sup', 'sub',
]);
const VOID = new Set(['br', 'hr']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'form', 'button', 'select', 'textarea', 'nav', 'header', 'footer']);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…' };

function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function safeHref(v) {
  const href = decode(v).trim();
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (href.startsWith('#')) return href;
  if (/^(mailto|tel):/i.test(href)) return href;
  return null;
}

export function sanitizeHtml(input) {
  const out = [];
  const stack = [];
  let dropDepth = 0;
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)|</g;
  let m;
  while ((m = re.exec(input))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[4] !== undefined || m[0] === '<') {
      if (!dropDepth) out.push(escape(decode(m[4] ?? '<')));
      continue;
    }
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) {
      if (closing) dropDepth = Math.max(0, dropDepth - 1);
      else if (!/\/\s*$/.test(m[3])) dropDepth++;
      continue;
    }
    if (dropDepth || !ALLOWED.has(tag)) continue;
    const t = tag === 'b' ? 'strong' : tag === 'i' ? 'em' : tag;
    if (closing) {
      const idx = stack.lastIndexOf(t);
      if (idx >= 0) {
        while (stack.length > idx) out.push(`</${stack.pop()}>`);
      }
      continue;
    }
    let attrs = '';
    if (t === 'a') {
      const hm = /\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[3]);
      const href = hm ? safeHref(hm[2] ?? hm[3] ?? hm[4] ?? '') : null;
      if (href) {
        attrs = ` href="${escape(href)}"`;
        if (/^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?mdpravo\.ru/i.test(href)) attrs += ' rel="noopener nofollow" target="_blank"';
      }
    }
    if ((t === 'td' || t === 'th') && /colspan\s*=\s*"?(\d{1,2})/i.test(m[3])) attrs += ` colspan="${/colspan\s*=\s*"?(\d{1,2})/i.exec(m[3])[1]}"`;
    out.push(`<${t}${attrs}>`);
    if (!VOID.has(t)) stack.push(t);
  }
  while (stack.length) out.push(`</${stack.pop()}>`);
  return out.join('').replace(/<p>\s*<\/p>/g, '').trim();
}

export function htmlToText(input) {
  return decode(
    String(input)
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}
