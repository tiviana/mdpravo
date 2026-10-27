// Шаблоны с автоматическим экранированием: любое значение в ${} экранируется,
// кроме результатов html`` и raw(). Это защита от XSS по умолчанию.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escape(value) {
  return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

export class SafeHtml {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}

/** Вставить строку как готовый HTML. Только для доверенного содержимого. */
export function raw(s) {
  return new SafeHtml(String(s ?? ''));
}

function render(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof SafeHtml) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return escape(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** Безопасное значение для JSON внутри <script type="application/ld+json">. */
export function jsonScript(obj) {
  return raw(JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026'));
}
