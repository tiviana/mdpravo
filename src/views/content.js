// Отображение перенесённых со старого сайта текстов в оформлении нового сайта.
import { html } from '../lib/html.js';
import { icon } from './ui.js';

/** Внутренние ссылки старого сайта были без завершающего слеша — приводим к каноническому виду. */
export function href(path) {
  if (!path || /^https?:/.test(path)) return path;
  const [p, hash = ''] = path.split('#');
  const withSlash = p.endsWith('/') ? p : `${p}/`;
  return hash ? `${withSlash}#${hash}` : withSlash;
}

/** Короткие выводы («Коротко»). */
export function keyPoints(items, title = 'Коротко') {
  if (!items?.length) return '';
  return html`<aside class="keypoints gold-frame" aria-label="${title}">
    <p class="eyebrow">${title}</p>
    <ul>${items.map((t) => html`<li>${icon('check')}<span>${t}</span></li>`)}</ul>
  </aside>`;
}

/** Разделы статьи: заголовок, абзацы, списки. */
export function sectionsBody(sections) {
  return html`${sections.map((s) => html`<section class="article-section">
    <h2>${s.heading}</h2>
    ${(s.paragraphs || []).map((p) => html`<p>${p}</p>`)}
    ${s.bullets?.length ? html`<ul>${s.bullets.map((b) => html`<li>${b}</li>`)}</ul>` : ''}
  </section>`)}`;
}

/** Список с галочками (ситуации, документы). */
export function checkList(items, cls = '') {
  return html`<ul class="checklist ${cls}">${items.map((t) => html`<li>${icon('check')}<span>${upperFirst(t)}</span></li>`)}</ul>`;
}

export function upperFirst(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Вопросы и ответы. */
export function faqBlock(items) {
  return html`<div class="faq">${items.map((f) => html`<details><summary>${f.question}</summary><div class="answer"><p>${f.answer}</p></div></details>`)}</div>`;
}

export function faqJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  };
}

/** Нумерованные шаги «шаг — пояснение». */
export function numberedSteps(steps) {
  return html`<ol class="num-steps">${steps.map((s, i) => html`<li class="reveal"><span class="num-steps__n">${String(i + 1).padStart(2, '0')}</span><div><h3>${s.title}</h3><p>${s.text}</p></div></li>`)}</ol>`;
}

/** Источники (внешние ссылки на нормы). */
export function sourcesList(sources) {
  if (!sources?.length) return '';
  return html`<section class="article-sources" aria-labelledby="sources-title">
    <h2 id="sources-title">Правовая основа и источники</h2>
    <ul>${sources.map((s) => html`<li><a href="${s.url}" rel="noopener nofollow" target="_blank">${s.title}</a></li>`)}</ul>
  </section>`;
}
