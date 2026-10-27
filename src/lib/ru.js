// Форматирование для русского интерфейса и простая нормализация для поиска.

const MOSCOW = 'Europe/Moscow';

export function rub(kop) {
  const v = kop / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function date(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  const opts = { day: 'numeric', month: 'long', year: 'numeric', timeZone: MOSCOW };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return new Intl.DateTimeFormat('ru-RU', opts).format(d);
}

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

const ENDINGS = [
  'иями', 'ями', 'ами', 'иях', 'ях', 'ах', 'ией', 'ией', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими',
  'ость', 'ости', 'ться', 'тся', 'ешь', 'ует', 'ют', 'ят', 'ет', 'ит', 'ий', 'ый', 'ой', 'ая', 'яя',
  'ое', 'ее', 'ые', 'ие', 'ую', 'юю', 'ов', 'ев', 'ей', 'ам', 'ям', 'ом', 'ем', 'ах', 'ия', 'ие',
  'а', 'я', 'о', 'е', 'ы', 'и', 'у', 'ю', 'ь', 'й',
];

/** Грубая основа слова для префиксного поиска: «жалобу» → «жалоб», «прокуратуры» → «прокуратур». */
export function stem(word) {
  const w = word.toLowerCase().replace(/ё/g, 'е');
  if (w.length <= 4) return w;
  for (const e of ENDINGS) {
    if (w.endsWith(e) && w.length - e.length >= 4) return w.slice(0, -e.length);
  }
  return w;
}

/** Запрос пользователя → выражение FTS5 MATCH (только буквы и цифры, префиксы). */
export function ftsQuery(q) {
  const words = String(q)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^0-9a-zа-я]+/i)
    .filter((w) => w.length >= 2)
    .slice(0, 8);
  if (!words.length) return null;
  return words.map((w) => `"${stem(w)}"*`).join(' AND ');
}
