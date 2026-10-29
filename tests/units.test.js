// Модульные проверки: контраст палитры, поиск, суммы, калькулятор, файлы.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import './helpers.js';

function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

test('контраст текста по WCAG 2.2 AA (≥4.5:1) для пар, используемых в интерфейсе', () => {
  const css = fs.readFileSync(new URL('../public/css/tokens.css', import.meta.url), 'utf8');
  const v = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))[1];
  const pairs = [
    ['c-text', 'c-bg'], ['c-text-2', 'c-bg'], ['c-text-2', 'c-surface'], ['c-accent-ink', 'c-bg'], ['c-red', 'c-bg'],
    ['c-on-primary', 'c-primary'], ['c-on-primary-2', 'c-primary'], ['c-accent', 'c-primary'],
    ['c-on-primary', 'c-wine-900'], ['c-gold-light', 'c-wine-900'], ['c-gold-light', 'c-wine-800'], ['c-accent', 'c-wine-800'],
    ['c-success', 'c-success-bg'], ['c-danger', 'c-danger-bg'], ['c-warning', 'c-warning-bg'], ['c-info', 'c-info-bg'],
  ];
  const fails = pairs.map(([f, b]) => [f, b, ratio(v(f), v(b))]).filter(([, , r]) => r < 4.5).map(([f, b, r]) => `${f}/${b}: ${r.toFixed(2)}`);
  assert.deepEqual(fails, []);
  assert.ok(ratio(v('c-line-strong'), v('c-bg')) >= 3, 'границы полей ≥ 3:1');
});

test('поиск находит по словоформам', async () => {
  const { search } = await import('../src/lib/search.js');
  const r = search('жалобу в прокуратуру');
  assert.ok(r.length > 0);
  assert.ok(r.some((x) => x.path.includes('prokuratur')));
  assert.equal(search('').length, 0);
  assert.deepEqual(search('"; DROP TABLE users; --'), []);
});

test('разбор суммы в рублях', async () => {
  const { parseRubles } = await import('../src/routes/staff.js');
  assert.equal(parseRubles('15 000'), 1500000);
  assert.equal(parseRubles('15000,5'), 1500050);
  assert.equal(parseRubles('0'), null);
  assert.equal(parseRubles('-5'), null);
  assert.equal(parseRubles('1e5'), null);
});

test('калькулятор неустойки и ограничение', async () => {
  const { calcPenalty } = await import('../src/views/public.js');
  const q = (o) => new URLSearchParams(o);
  assert.match(calcPenalty(q({ sum: '100000', rate: '0,1', days: '30' })).result.total, /3\s000/);
  assert.match(calcPenalty(q({ sum: '100000', rate: '1', days: '30', cap: '10' })).result.total, /10\s000/);
  assert.ok(calcPenalty(q({ sum: '-1', rate: '1', days: '3' })).error);
});

test('определение типа файла по сигнатуре', async () => {
  const { sniff, cleanName } = await import('../src/lib/files.js');
  assert.equal(sniff(Buffer.from('%PDF-1.7 ...'), 'a.pdf'), 'pdf');
  assert.equal(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]), 'a.jpg'), 'jpg');
  assert.equal(sniff(Buffer.from('MZ....'), 'a.pdf'), null);
  assert.equal(sniff(Buffer.from('plain text'), 'note.txt'), 'txt');
  assert.equal(cleanName('..\\..\\C:<x>.pdf'), 'Cx.pdf');
});

test('production не запускается с тестовой оплатой и без секрета', async () => {
  const { configProblems } = await import('../src/config.js');
  const p = configProblems({ isProd: true, baseUrl: 'http://x', secret: '', payments: { provider: 'test', yookassa: {} }, smtp: {} });
  assert.ok(p.some((x) => x.includes('BASE_URL')));
  assert.ok(p.some((x) => x.includes('SECRET_KEY')));
  assert.ok(p.some((x) => x.includes('PAYMENT_PROVIDER=test')));
});
