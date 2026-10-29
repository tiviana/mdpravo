// Тексты, перенесённые из исходников старого сайта, действительно выводятся на страницах.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, test } from 'node:test';
import { escape } from '../src/lib/html.js';
import { Client, start, stop } from './helpers.js';

const data = (n) => JSON.parse(fs.readFileSync(new URL(`../src/content/data/${n}`, import.meta.url), 'utf8'));
const ARTICLES = data('articles.json');
const SERVICES = data('services.json');
const URGENT = data('urgent.json');
const HUBS = data('hubs.json');
const DOCS = data('documents.json');

before(start);
after(stop);

const has = (text, s) => text.includes(escape(s));

test('все 106 статей: вступление, каждый раздел, выводы, FAQ и оговорка на странице', async () => {
  const c = new Client();
  const bad = [];
  for (const [slug, a] of Object.entries(ARTICLES)) {
    const { text, status } = await c.get(`/knowledge/${slug}/`);
    if (status !== 200) { bad.push(`${slug}: ${status}`); continue; }
    const parts = [a.intro, a.disclaimer, ...(a.highlights || []), ...a.sections.flatMap((s) => [s.heading, ...(s.paragraphs || []), ...(s.bullets || [])]), ...a.faq.flatMap((f) => [f.question, f.answer])];
    for (const p of parts) if (!has(text, p)) { bad.push(`${slug}: нет «${p.slice(0, 50)}…»`); break; }
    if (text.includes('переносится со старой версии')) bad.push(`${slug}: заглушка`);
  }
  assert.equal(Object.keys(ARTICLES).length, 106);
  assert.deepEqual(bad, []);
});

test('направления и 53 задачи: вступление, ситуации и документы', async () => {
  const c = new Client();
  const bad = [];
  for (const [slug, d] of Object.entries(SERVICES.directions)) {
    const { text } = await c.get(`/services/${slug}/`);
    for (const p of [d.intro, ...d.situations, ...d.documents]) if (!has(text, p[0].toUpperCase() + p.slice(1))) bad.push(`${slug}: «${p.slice(0, 40)}»`);
  }
  for (const [key, t] of Object.entries(SERVICES.tasks)) {
    const { text } = await c.get(`/services/${key}/`);
    for (const p of [t.intro, ...t.situations, ...t.documents]) if (!has(text, p[0].toUpperCase() + p.slice(1))) bad.push(`${key}: «${p.slice(0, 40)}»`);
  }
  assert.equal(Object.keys(SERVICES.tasks).length, 53);
  assert.deepEqual(bad, []);
});

test('срочные алгоритмы: шаги, «чего не делать», «что сохранить»', async () => {
  const c = new Client();
  const bad = [];
  for (const [slug, g] of Object.entries(URGENT.guides)) {
    const { text } = await c.get(`/urgent/${slug}/`);
    for (const p of [...g.steps.flatMap((s) => [s.title, s.text])]) if (!has(text, p)) bad.push(`${slug}: «${p.slice(0, 40)}»`);
    for (const p of [...g.avoid, ...g.documents]) if (!has(text, p[0].toUpperCase() + p.slice(1))) bad.push(`${slug}: «${p.slice(0, 40)}»`);
    for (const l of g.nextLinks || []) if (!text.includes(`href="${l.href.replace(/\/?$/, '/')}"`)) bad.push(`${slug}: ссылка ${l.href}`);
  }
  assert.deepEqual(bad, []);
});

test('темы базы знаний: вступление, задачи и вопросы', async () => {
  const c = new Client();
  const bad = [];
  for (const [slug, h] of Object.entries(HUBS)) {
    const { text } = await c.get(`/knowledge/topics/${slug}/`);
    for (const p of [h.intro, ...h.tasks, ...(h.faqs || []).flatMap((f) => [f.question, f.answer])]) if (!has(text, p)) bad.push(`${slug}: «${p.slice(0, 40)}»`);
  }
  assert.deepEqual(bad, []);
});

test('шаблоны: код, файлы скачиваются там, где они есть, у всех — заполнение на сайте', async () => {
  const c = new Client();
  const bad = [];
  let withFiles = 0;
  for (const [slug, d] of Object.entries(DOCS)) {
    const { text } = await c.get(`/knowledge/downloads/${slug}/`);
    if (!text.includes(`Шаблон документа · ${d.code}`)) bad.push(`${slug}: нет кода`);
    if (!text.includes('data-docfill') || !text.includes('/js/docfill.js')) bad.push(`${slug}: нет заполнения`);
    for (const f of d.online.fields) if (!text.includes(`name="${f.id}"`)) bad.push(`${slug}: нет поля ${f.id}`);
    if (text.includes(`/downloads/${slug}.docx`)) {
      withFiles++;
      const r = await c.get(`/downloads/${slug}.docx`);
      if (r.status !== 200) bad.push(`${slug}.docx → ${r.status}`);
    }
  }
  assert.equal(withFiles, 15);
  assert.deepEqual(bad, []);
});

test('правовые страницы содержат полный текст, PDF доступны', async () => {
  const c = new Client();
  const p = await c.get('/privacy/');
  assert.ok(has(p.text, 'Данные не продаются третьим лицам.'));
  assert.ok(has(p.text, '8. Изменения политики'));
  const s = await c.get('/consent/');
  assert.ok(has(s.text, '7. Связь с политикой конфиденциальности'));
  for (const f of ['/documents/privacy-policy.pdf', '/documents/personal-data-consent.pdf']) assert.equal((await c.get(f)).status, 200, f);
});

test('поиск находит статью по словам из полного текста, а не только из заголовка', async () => {
  // фраза есть только в теле статьи «Что делать, если вас вызывают для дачи объяснений»
  const { text } = await new Client().get('/knowledge/search/?q=' + encodeURIComponent('доследственной проверке'));
  assert.ok(text.includes('/knowledge/vyzvali-dlya-dachi-obyasneniy/'));
});

test('форма обращения на странице темы получает заголовок по теме', async () => {
  const { text } = await new Client().get('/knowledge/topics/prokuratura/');
  assert.ok(has(text, 'Разберём обращение или жалобу в прокуратуру'));
});
