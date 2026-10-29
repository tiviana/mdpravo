// Полные тексты со старого сайта (исходники mdpravo-site-main, перенос 29.10.2026).
// Данные лежат в src/content/data/*.json и пересобираются скриптом tools/import-old-site/extract.mjs.
import { readFileSync } from 'node:fs';

const load = (name) => JSON.parse(readFileSync(new URL(`./data/${name}`, import.meta.url), 'utf8'));

const ARTICLES = load('articles.json');
const HUBS = load('hubs.json');
const DOCS = load('documents.json');
const URGENT = load('urgent.json');
const SERVICES = load('services.json');
const OFFICIAL = load('official.json');
const CONTACT = load('contact-contexts.json');

export const articleTypes = ['Инструкция', 'Разбор', 'Чек-лист', 'Образец'];

export function articleContent(slug) {
  return ARTICLES[slug] || null;
}

export function hubContent(slug) {
  return HUBS[slug] || null;
}

export function documentContent(slug) {
  return DOCS[slug] || null;
}

/** Статьи, связанные с шаблоном (ручные связи со старого сайта). */
export function articleSlugsForDocument(slug) {
  return DOCS[slug]?.articles || [];
}

/** Шаблоны, которые старый сайт связывал со статьёй. */
export function documentSlugsForArticle(slug) {
  return Object.entries(DOCS).filter(([, d]) => d.articles.includes(slug)).map(([s]) => s);
}

export function urgentContent(slug) {
  return URGENT.guides[slug] || null;
}

export const urgentGroups = URGENT.groups;

export function directionContent(slug) {
  return SERVICES.directions[slug] || null;
}

export function taskContent(dir, slug) {
  return SERVICES.tasks[`${dir}/${slug}`] || null;
}

export const officialGroups = OFFICIAL.groups;
export const officialServices = OFFICIAL.services;
export const detentionServices = OFFICIAL.detention;
export const detentionCheckedAt = OFFICIAL.detentionCheckedAt;

/** Заголовок и подсказка формы обращения для темы базы знаний (slug темы). */
export function contactContext(topicSlug) {
  return (topicSlug && CONTACT[topicSlug]) || null;
}

/** Время чтения — как на старом сайте: 200 слов в минуту. */
export function readingTime(a) {
  const text = [
    a.title, a.description, a.intro, ...(a.highlights || []),
    ...a.sections.flatMap((s) => [s.heading, ...(s.paragraphs || []), ...(s.bullets || [])]),
    a.disclaimer || '',
  ].join(' ');
  const words = text.trim().split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const n = Math.max(1, Math.ceil(words / 200));
  const m10 = n % 10;
  const m100 = n % 100;
  const unit = m10 === 1 && m100 !== 11 ? 'минута' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'минуты' : 'минут';
  return `${n} ${unit}`;
}

/** Плоский текст материала — для поиска. */
export function plainText(a) {
  return [
    a.intro, ...(a.highlights || []),
    ...a.sections.flatMap((s) => [s.heading, ...(s.paragraphs || []), ...(s.bullets || [])]),
    ...(a.faq || []).flatMap((f) => [f.question, f.answer]),
  ].join('\n');
}
