// Все адреса старого sitemap (снято с mdpravo.ru 27.10.2026) отвечают 200 и индексируются.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, test } from 'node:test';
import { Client, start, stop } from './helpers.js';

const legacy = JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-sitemap.json', import.meta.url), 'utf8'));

before(start);
after(stop);

test('в фикстуре 239 адресов старого сайта', () => {
  assert.equal(legacy.length, 239);
});

test('каждый адрес старого сайта отвечает 200, с canonical и без noindex', async () => {
  const c = new Client();
  const bad = [];
  for (const p of legacy) {
    const r = await c.get(p);
    if (r.status !== 200) { bad.push(`${p} → ${r.status}`); continue; }
    if (!r.text.includes(`rel="canonical" href="`) || !r.text.includes(`${p}"`)) bad.push(`${p}: нет canonical`);
    if (r.text.includes('noindex')) bad.push(`${p}: noindex`);
    if (!/<h1[\s>]/.test(r.text)) bad.push(`${p}: нет h1`);
  }
  assert.deepEqual(bad, []);
});

test('адрес без слеша → 301 на канонический', async () => {
  const r = await new Client().get('/about');
  assert.equal(r.status, 301);
  assert.equal(r.location, '/about/');
});

test('старый адрес кабинета ведёт в новый', async () => {
  const r = await new Client().get('/knowledge/cabinet/');
  assert.equal(r.status, 301);
  assert.equal(r.location, '/cabinet/');
});

test('sitemap содержит все старые адреса, robots закрывает приватные разделы', async () => {
  const c = new Client();
  const sm = await c.get('/sitemap.xml');
  assert.equal(sm.status, 200);
  for (const p of legacy) assert.ok(sm.text.includes(`${p}</loc>`), `sitemap без ${p}`);
  const robots = await c.get('/robots.txt');
  for (const d of ['/cabinet/', '/staff/', '/login/']) assert.ok(robots.text.includes(`Disallow: ${d}`));
  assert.ok(robots.text.includes('Sitemap: '));
});

test('несуществующая страница — 404 с noindex', async () => {
  const r = await new Client().get('/services/no-such-thing/');
  assert.equal(r.status, 404);
  assert.ok(r.text.includes('noindex'));
});

test('страницы входа и кабинета не индексируются', async () => {
  const r = await new Client().get('/login/');
  assert.ok(r.text.includes('noindex'));
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
});
