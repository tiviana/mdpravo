// Переносит тексты из исходников старого сайта (Next.js, TypeScript) в src/content/data/*.json.
// Запуск: OLD_ROOT=/путь/к/mdpravo-site-main node --experimental-strip-types --import ./register.mjs extract.mjs
// Модули данных старого сайта выполняются как есть (без React-компонентов), берутся только данные.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const R = process.env.OLD_ROOT;
if (!R) throw new Error('Укажите OLD_ROOT — папку старого проекта');
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/content/data');
const load = (f) => import(path.join(R, f));

const { articles } = await load('app/knowledge/allArticles.ts');
const { faqBySlug } = await load('app/knowledge/knowledgeFaq.ts');
const { practiceHubs } = await load('app/knowledge/practiceHubs.ts');
const { hubCtas } = await load('app/knowledge/hubCtas.ts');
const { documents } = await load('app/knowledge/downloads/documents.ts');
const { documentArticleLinks } = await load('app/knowledge/downloads/documentArticleLinks.ts');
const { ONLINE_DOCUMENT_SCHEMAS } = await load('lib/onlineDocumentSchemas.ts');
const { quickGuides, quickGuideGroups } = await load('app/urgent/quickGuides.ts');
const { services } = await load('app/services/serviceData.ts');
const { serviceTopics } = await load('app/services/serviceTopics.ts');
const { officialServices, officialServiceGroups } = await load('app/knowledge/officialServices.ts');
const { detentionServices, detentionServicesCheckedAt } = await load('app/knowledge/detentionServices.ts');

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const write = (name, data) => {
  writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1) + '\n');
  console.log(name, Object.keys(data).length);
};

write('articles.json', Object.fromEntries(articles.map((a) => [a.slug, {
  ...pick(a, ['title', 'description', 'category', 'practice', 'type', 'updatedAt', 'intro', 'highlights', 'sections', 'disclaimer', 'sources']),
  faq: faqBySlug[a.slug] || [],
}])));
write('hubs.json', Object.fromEntries(practiceHubs.map((h) => [h.slug, { ...pick(h, ['title', 'description', 'intro', 'practices', 'tasks', 'taskLinks', 'serviceTopicLinks', 'relatedHubSlugs', 'faqs']), cta: hubCtas[h.slug] || null }])));
write('documents.json', Object.fromEntries(documents.map((d) => [d.slug, { ...pick(d, ['code', 'title', 'description', 'practice']), articles: documentArticleLinks[d.slug] || [], online: ONLINE_DOCUMENT_SCHEMAS[d.slug] ? pick(ONLINE_DOCUMENT_SCHEMAS[d.slug], ['introduction', 'fields', 'caution']) : null }])));
write('urgent.json', {
  groups: quickGuideGroups,
  guides: Object.fromEntries(quickGuides.map((g) => [g.slug, pick(g, ['title', 'shortTitle', 'description', 'topic', 'steps', 'avoid', 'documents', 'relatedService', 'nextLinks'])])),
});
write('services.json', {
  directions: Object.fromEntries(services.map((s) => [s.slug, pick(s, ['title', 'eyebrow', 'description', 'intro', 'situations', 'documents', 'topic'])])),
  tasks: Object.fromEntries(serviceTopics.map((t) => [`${t.serviceSlug}/${t.slug}`, pick(t, ['title', 'description', 'intro', 'situations', 'documents'])])),
});
write('official.json', { groups: officialServiceGroups, services: officialServices, detention: detentionServices, detentionCheckedAt: detentionServicesCheckedAt });

// Тексты формы обращения по темам: объект в клиентском компоненте не экспортируется — читаем его литерал из исходника.
import { readFileSync } from 'node:fs';
const lead = readFileSync(path.join(R, 'components/LeadContactSection.tsx'), 'utf8');
const ctxRe = /"([a-z-]+)":\s*\{\s*heading:\s*"([^"]+)",\s*intro:\s*"([^"]+)",\s*preset:\s*"([^"]+)"/g;
const contactContexts = {};
for (const m of lead.matchAll(ctxRe)) contactContexts[m[1]] = { heading: m[2], intro: m[3], preset: m[4] };
write('contact-contexts.json', contactContexts);
