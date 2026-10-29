// Публичные страницы сайта.
import { config } from '../config.js';
import { company, faq, partnership, prices, pricesFootnote, process, team, values } from '../content/company.js';
import { articleBySlug, articles, downloads, knowledgeSections, topicBySlug, topics, urgent } from '../content/knowledge.js';
import { directionBySlug, directions, directionSteps, docsPrice, findTask } from '../content/services.js';
import { html, raw } from '../lib/html.js';
import { requestForm } from './forms.js';
import { alert, crumbs, csrfField, icon, layout, pageHead } from './ui.js';

const S = ' — Мосдевелопмент Право';
const home = ['Главная', '/'];

function serviceCards(list, { featuredFirst = true } = {}) {
  return html`<div class="grid">${list.map((d, i) => {
    const featured = featuredFirst && d.priority;
    return html`<a class="card service-card reveal ${featured ? 'service-card--featured' : ''}" href="${d.path}">
      <span class="num">${String(i + 1).padStart(2, '0')}</span>
      <img class="art" src="${d.img}" alt="" width="112" height="112" loading="lazy" decoding="async">
      <h3>${d.navTitle || d.title}</h3>
      <p>${d.short}</p>
      <span class="link-arrow more">Подробнее ${icon('arrow')}</span>
    </a>`;
  })}</div>`;
}

function articleList(list) {
  return html`<ul class="list-links">${list.map((a) => html`<li><a href="${a.path}"><span>${a.title}<small>${a.description}</small></span>${icon('arrow')}</a></li>`)}</ul>`;
}

function contactSection(ctx, opts = {}) {
  return html`<section class="wrap section" id="contact">
  <div class="panel">
    <div class="stack-lg" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));align-items:start">
      <div class="stack">
        <p class="eyebrow">Консультация</p>
        <h2>Опишите ситуацию</h2>
        <p>Первичная консультация — бесплатно. Расскажите коротко, что произошло: специалист разберётся, что действительно потребуется, и свяжется с вами.</p>
        <div class="stack" style="gap:8px;margin-top:12px">
          ${company.phones.map((p) => html`<a href="tel:${p.tel}" style="font:600 1.25rem/1.3 var(--font-display);text-decoration:none">${p.display}</a>`)}
          <a href="mailto:${company.email}">${company.email}</a>
          <span class="muted">${company.messengers.map((m, i) => html`${i ? ' · ' : ''}<a href="${m.url}" rel="noopener" target="_blank">${m.name}</a>`)}</span>
        </div>
      </div>
      <div>${requestForm(ctx, { ...opts, dark: true })}</div>
    </div>
  </div>
</section>`;
}

// ── Главная ────────────────────────────────────────────────────────────────
export function homePage(ctx, formState = {}) {
  const body = html`
<section class="hero">
  <div class="hero-glow" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow">Мосдевелопмент Право · Москва</p>
      <h1>Защищаем интересы. <span class="grad-text">Формируем сильную правовую&nbsp;позицию.</span></h1>
      <p class="lead">Разбираем ситуацию, оцениваем риски и готовим заявления, жалобы и другие документы. Уголовно-правовые вопросы, споры с госорганами и гражданские дела.</p>
      <div class="hero-actions">
        <a class="btn btn--primary" href="#contact">Получить консультацию ${icon('arrow')}</a>
        <a class="btn btn--ghost" href="/knowledge/">Найти решение самостоятельно</a>
      </div>
      <div class="hero-tags">
        <span class="chip chip--accent"><i></i>Первичная консультация — бесплатно</span>
        <span class="chip">${company.experience}</span>
      </div>
    </div>
    <div class="hero-visual" aria-hidden="true">
      <img src="/img/icons3d/criminal-law.webp" alt="" width="512" height="512" fetchpriority="high">
      <img src="/img/icons3d/public-authorities.webp" alt="" width="512" height="512">
      <img src="/img/icons3d/value-documents.webp" alt="" width="512" height="512">
    </div>
  </div>
</section>

<div class="ticker" aria-hidden="true"><div class="ticker-track">
  ${[0, 1].map(() => html`<span>${directions.map((d) => html`<span>${d.navTitle || d.title}</span>`)}</span>`)}
</div></div>

<section class="wrap section">
  <div class="grid grid--4">
    ${values.map((v) => html`<div class="value reveal"><img src="${v.img}" alt="" width="96" height="96" loading="lazy"><h3>${v.title}</h3><p class="muted">${v.text}</p></div>`)}
  </div>
</section>

<section class="wrap section" id="services">
  <div class="section-head section-head--row">
    <div class="stack">
      <p class="eyebrow">Услуги</p>
      <h2>Основные <span class="accent-title">направления</span></h2>
      <p>Сложные правовые ситуации, документы и выстраивание позиции.</p>
    </div>
    <a class="link-arrow" href="/directions/">Все направления ${icon('arrow')}</a>
  </div>
  ${serviceCards(directions)}
</section>

<section class="wrap section">
  <div class="section-head section-head--row">
    <div class="stack">
      <p class="eyebrow">Как мы работаем</p>
      <h2>Понятный <span class="accent-title">порядок работы</span></h2>
      <p>Не нужно заранее собирать идеальный комплект документов — разберёмся, что действительно потребуется.</p>
    </div>
    <a class="link-arrow" href="/process/">Все этапы ${icon('arrow')}</a>
  </div>
  <div class="steps">${process.map((s) => html`<div class="step reveal"><img src="${s.img}" alt="" width="88" height="88" loading="lazy"><h3>${s.title}</h3><p>${s.text}</p></div>`)}</div>
</section>

<section class="wrap section" id="prices">
  <div class="section-head"><p class="eyebrow">Стоимость</p><h2>Понятные <span class="accent-title">условия</span></h2><p>${pricesFootnote}</p></div>
  ${priceGrid()}
</section>

<section class="wrap section">
  <div class="layout-aside">
    <div class="stack-lg">
      <div class="section-head" style="margin:0"><p class="eyebrow">О компании</p><h2>Защищаем права граждан и бизнеса</h2>
      <p>Приоритет — уголовно-правовые вопросы, правовая позиция и обращения в МВД, Следственный комитет и прокуратуру. Работаем и с гражданскими, административными, трудовыми и имущественными вопросами.</p></div>
      <div class="team">${team.map(personCard)}</div>
    </div>
    <div class="card aside-sticky" style="background:var(--g-brand-soft)">
      <p class="eyebrow">Почему мы</p>
      <h3>${company.experience}</h3>
      <p>${company.slogan}</p>
      <a class="link-arrow" href="/about/">Подробнее о компании ${icon('arrow')}</a>
    </div>
  </div>
</section>

<section class="wrap section">
  <div class="section-head section-head--row">
    <div class="stack"><p class="eyebrow">Полезное</p><h2>Разбираем сложные ситуации <span class="accent-title">понятным языком</span></h2></div>
    <a class="link-arrow" href="/knowledge/">База знаний ${icon('arrow')}</a>
  </div>
  <form class="search reveal" action="/knowledge/search/" method="get" role="search">
    ${icon('search')}<label class="visually-hidden" for="hs-q">Поиск по базе знаний</label>
    <input id="hs-q" name="q" type="search" placeholder="Например: не возвращают долг по расписке" autocomplete="off">
    <button class="btn btn--primary btn--sm" type="submit">Найти</button>
  </form>
  <div class="grid" style="margin-top:var(--s-6)">
    ${['vyzvali-dlya-dachi-obyasneniy', 'obzhalovat-reshenie-gosorgana', 'vzyskat-dolg-po-raspiske'].map((s) => {
      const a = articleBySlug.get(s);
      const t = topicBySlug.get(a.topic);
      return html`<a class="card reveal" href="${a.path}"><span class="eyebrow">${t?.title || 'Статья'}</span><h3>${a.title}</h3><p>${a.description}</p><span class="link-arrow more">Читать ${icon('arrow')}</span></a>`;
    })}
  </div>
</section>

<section class="wrap section narrow">
  <div class="section-head center" style="justify-items:center"><p class="eyebrow">FAQ</p><h2>Частые вопросы</h2></div>
  ${faqList()}
</section>

${contactSection(ctx, formState)}

<section class="wrap section--tight">
  <a class="card" href="/partnership/" style="grid-template-columns:1fr auto;align-items:center">
    <div class="stack" style="gap:6px"><p class="eyebrow">Профессиональное сотрудничество</p><h3>Партнёрство с юристами, адвокатами и нотариусами</h3></div>
    <span class="link-arrow">Подробнее ${icon('arrow')}</span>
  </a>
</section>`;
  return layout(ctx, {
    title: 'Мосдевелопмент Право — уголовное и гражданское право',
    description: 'Уголовно-правовые и гражданско-правовые вопросы. Анализ ситуации, правовая позиция, жалобы, заявления и юридические документы. Мосдевелопмент Право.',
    path: '/',
    home: true,
    jsonld: [faqLd()],
    body,
  });
}

function faqLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

function faqList() {
  return html`<div class="faq">${faq.map((f) => html`<details class="reveal"><summary>${f.q}</summary><div class="answer"><p>${f.a}</p></div></details>`)}</div>`;
}

function priceGrid() {
  return html`<div class="prices">${prices.map((p) => html`<div class="price reveal ${p.highlight ? 'price--free' : ''}">
    <h3>${p.title}</h3>
    <div class="amount">${p.price}</div>
    <p class="muted">${p.text}</p>
    ${p.sub ? html`<ul>${p.sub.map((s) => html`<li><span>${s.title}</span><b>${s.price}</b></li>`)}</ul>` : ''}
    ${p.note ? html`<p class="note">${p.note}</p>` : ''}
  </div>`)}</div>`;
}

function personCard(m) {
  return html`<a class="person reveal" href="/team/${m.slug}/">
    <div class="photo"><img src="${m.photo}" alt="${m.photoAlt}" width="480" height="600" loading="lazy" decoding="async"></div>
    <div><h3>${m.name}</h3><p>${m.role}</p></div>
  </a>`;
}

// ── Направления ────────────────────────────────────────────────────────────
export function directionsPage(ctx) {
  return layout(ctx, {
    title: 'Все направления' + S,
    description: 'Полный список юридических направлений: уголовно-правовые вопросы, споры с госорганами, недвижимость, долги, военное и цифровое право.',
    path: '/directions/',
    body: html`${pageHead({ crumbs: [home, ['Юридические услуги', '/directions/']], eyebrow: 'Юридические услуги', title: 'Все направления', lead: 'Выберите направление — внутри конкретные задачи, порядок работы и материалы для самостоятельного разбора.' })}
<section class="wrap section--tight">${serviceCards(directions)}</section>
${contactSection(ctx)}`,
  });
}

export function directionPage(ctx, d) {
  const t = topics.filter((x) => d.topics.includes(x.slug));
  const rel = t.flatMap((x) => x.articleSlugs).slice(0, 6).map((s) => articleBySlug.get(s)).filter(Boolean);
  const ld = { '@context': 'https://schema.org', '@type': 'Service', name: d.title, description: d.description, provider: { '@id': `${config.baseUrl}/#organization` }, areaServed: 'RU' };
  return layout(ctx, {
    title: d.metaTitle,
    description: d.description,
    path: d.path,
    jsonld: [ld],
    body: html`${pageHead({ crumbs: [home, ['Юридические услуги', '/directions/'], [d.navTitle || d.title, d.path]], eyebrow: 'Направление', title: d.title, lead: d.description, art: d.img })}
<section class="wrap section--tight">
  <div class="steps">${directionSteps.map((s) => html`<div class="step reveal"><h3>${s.title}</h3><p>${s.text}</p></div>`)}</div>
</section>
${d.tasks.length ? html`<section class="wrap section--tight">
  <div class="section-head"><p class="eyebrow">Выберите свою задачу</p><h2>Что можем подготовить</h2></div>
  <ul class="list-links">${d.tasks.map((x) => html`<li><a href="${x.path}"><span>${x.title}<small>${x.description}</small></span>${icon('arrow')}</a></li>`)}</ul>
</section>` : ''}
<section class="wrap section--tight">
  <div class="grid grid--2">
    <div class="price"><p class="eyebrow">Стоимость</p><h3>Подготовка документов</h3><div class="amount">${docsPrice(d)}</div><p class="note">Окончательная стоимость и объём согласовываются до начала работы. Первичная консультация — бесплатно.</p></div>
    ${t.length ? html`<div class="card"><p class="eyebrow">Материалы по направлению</p>${t.map((x) => html`<a class="link-arrow" href="${x.path}">${x.title} ${icon('arrow')}</a>`)}</div>` : ''}
  </div>
</section>
${rel.length ? html`<section class="wrap section--tight"><div class="section-head"><h2>Полезно прочитать</h2></div>${articleList(rel)}</section>` : ''}
${contactSection(ctx, { values: { topic: d.slug } })}`,
  });
}

export function taskPage(ctx, d, t) {
  const sibling = d.tasks.filter((x) => x.slug !== t.slug).slice(0, 5);
  return layout(ctx, {
    title: t.metaTitle,
    description: t.description,
    path: t.path,
    body: html`${pageHead({ crumbs: [home, ['Юридические услуги', '/directions/'], [d.navTitle || d.title, d.path], [t.title, t.path]], eyebrow: d.navTitle || d.title, title: t.title, lead: t.description, art: d.img })}
<section class="wrap section--tight">
  <div class="layout-aside">
    <div class="stack-lg">
      <div class="steps">${directionSteps.map((s) => html`<div class="step"><h3>${s.title}</h3><p>${s.text}</p></div>`)}</div>
      ${sibling.length ? html`<div class="stack"><h2 style="font-size:var(--fs-h3)">Похожие задачи</h2><ul class="list-links">${sibling.map((x) => html`<li><a href="${x.path}"><span>${x.title}</span>${icon('arrow')}</a></li>`)}</ul></div>` : ''}
    </div>
    <div class="price aside-sticky"><p class="eyebrow">Стоимость</p><div class="amount">${docsPrice(d)}</div><p class="muted">Подготовка документов. Точную сумму и сроки согласуем после знакомства с материалами.</p><a class="btn btn--primary btn--block" href="#contact">Описать ситуацию</a></div>
  </div>
</section>
${contactSection(ctx, { values: { topic: d.slug } })}`,
  });
}

// ── Срочные ситуации ───────────────────────────────────────────────────────
export function urgentIndex(ctx) {
  return layout(ctx, {
    title: 'Что делать прямо сейчас' + S,
    description: 'Короткие пошаговые алгоритмы для срочных юридических ситуаций: задержание, вызов в полицию, долг, увольнение, СИЗО и споры с госорганами.',
    path: '/urgent/',
    body: html`${pageHead({ crumbs: [home, ['Срочно', '/urgent/']], eyebrow: 'Срочные ситуации', title: 'Что делать прямо сейчас', lead: 'Короткие пошаговые алгоритмы: что проверить и сохранить в первые часы и дни.' })}
<section class="wrap section--tight"><div class="grid">${urgent.map((u) => {
      const d = directionBySlug.get(u.direction);
      return html`<a class="card reveal" href="${u.path}"><img src="${d.img}" alt="" width="72" height="72" loading="lazy" style="width:72px;height:72px"><h3>${u.title}</h3><p>${u.description}</p><span class="link-arrow more">Открыть ${icon('arrow')}</span></a>`;
    })}</div></section>
${contactSection(ctx)}`,
  });
}

export function legacyBody(legacy, fallback) {
  if (legacy) return html`<div class="prose">${raw(legacy.html)}</div>`;
  return html`<div class="stack">${fallback ? html`<p class="lead" style="font-size:var(--fs-18)">${fallback}</p>` : ''}
    ${alert('info', 'Полный текст этого материала переносится со старой версии сайта. Если нужен разбор вашей ситуации прямо сейчас — опишите её в форме ниже.')}</div>`;
}

export function urgentPage(ctx, u, legacy) {
  const d = directionBySlug.get(u.direction);
  const t = topicBySlug.get(u.topic);
  return layout(ctx, {
    title: u.metaTitle,
    description: u.description,
    path: u.path,
    body: html`${pageHead({ crumbs: [home, ['Срочно', '/urgent/'], [u.title, u.path]], eyebrow: 'Срочная ситуация', title: u.title, lead: u.description, art: d.img })}
<section class="wrap section--tight"><div class="layout-aside">
  <article>${legacyBody(legacy)}</article>
  <aside class="stack aside-sticky">
    <div class="card" style="background:var(--g-brand-soft)"><h3>Нужна помощь прямо сейчас?</h3><p>Позвоните или напишите — разберёмся, что делать.</p>${company.phones.map((p) => html`<a class="btn btn--primary btn--block" href="tel:${p.tel}">${icon('phone')}${p.display}</a>`)}</div>
    ${t ? html`<a class="card" href="${t.path}"><p class="eyebrow">Материалы по теме</p><h3>${t.title}</h3><span class="link-arrow">Открыть ${icon('arrow')}</span></a>` : ''}
  </aside>
</div></section>
${contactSection(ctx, { values: { topic: u.direction } })}`,
  });
}

// ── База знаний ────────────────────────────────────────────────────────────
export function knowledgeIndex(ctx) {
  return layout(ctx, {
    title: 'База знаний' + S,
    description: 'Практические юридические инструкции, образцы документов, разборы ситуаций, официальные правовые сервисы и калькуляторы.',
    path: '/knowledge/',
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/']], eyebrow: 'База знаний', title: 'Разберитесь сами — или с нами', lead: 'Инструкции, образцы документов, разборы ситуаций, официальные сервисы и калькуляторы.' })}
<section class="wrap section--tight" id="search">
  <form class="search" action="/knowledge/search/" method="get" role="search">
    ${icon('search')}<label class="visually-hidden" for="ks-q">Умный поиск</label>
    <input id="ks-q" name="q" type="search" placeholder="Опишите проблему своими словами" autocomplete="off">
    <button class="btn btn--primary btn--sm" type="submit">Найти</button>
  </form>
  <div class="hero-tags">${['долг по расписке', 'незаконное увольнение', 'жалоба в прокуратуру', 'близкий в СИЗО', 'штраф'].map((q) => html`<a class="chip" href="/knowledge/search/?q=${encodeURIComponent(q)}">${q}</a>`)}</div>
</section>
<section class="wrap section--tight">
  <div class="grid grid--4">
    <a class="card" href="/urgent/"><h3>Срочно</h3><p>Что делать прямо сейчас</p></a>
    <a class="card" href="/knowledge/downloads/"><h3>Документы</h3><p>${downloads.length} образцов DOCX и PDF</p></a>
    <a class="card" href="${knowledgeSections.calculators.path}"><h3>Калькуляторы</h3><p>Предварительные расчёты</p></a>
    <a class="card" href="${knowledgeSections.services.path}"><h3>Госсервисы</h3><p>Официальные сервисы</p></a>
  </div>
</section>
<section class="wrap section--tight" id="materials">
  <div class="section-head section-head--row"><div class="stack"><p class="eyebrow">Направления</p><h2>Темы</h2></div><a class="link-arrow" href="/knowledge/topics/">Все темы ${icon('arrow')}</a></div>
  <div class="grid">${topics.map((t) => html`<a class="card reveal" href="${t.path}"><h3>${t.title}</h3><p>${t.description}</p><span class="muted">${t.articleSlugs.length} материалов</span></a>`)}</div>
</section>
<section class="wrap section--tight"><div class="section-head"><h2>Новое и полезное</h2></div>${articleList(articles.slice(-8).reverse())}</section>`,
  });
}

export function topicsIndex(ctx) {
  return layout(ctx, {
    title: 'Направления' + S,
    description: 'Все направления базы знаний: статьи, инструкции, образцы документов и практические материалы по основным правовым вопросам.',
    path: '/knowledge/topics/',
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ['Темы', '/knowledge/topics/']], title: 'Темы базы знаний' })}
<section class="wrap section--tight"><div class="grid">${topics.map((t) => html`<a class="card" href="${t.path}"><h3>${t.title}</h3><p>${t.description}</p></a>`)}</div></section>`,
  });
}

export function topicPage(ctx, t) {
  const list = t.articleSlugs.map((s) => articleBySlug.get(s)).filter(Boolean);
  const svc = t.serviceRefs.map((r) => {
    const [dir, slug] = r.split('/');
    return findTask(dir, slug);
  }).filter(Boolean);
  const dl = downloads.filter((d) => d.topic === t.slug);
  return layout(ctx, {
    title: t.metaTitle,
    description: t.description,
    path: t.path,
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ['Темы', '/knowledge/topics/'], [t.title, t.path]], eyebrow: 'Тема', title: t.title, lead: t.description })}
<section class="wrap section--tight"><div class="layout-aside">
  <div class="stack-lg">
    <div class="stack"><h2 style="font-size:var(--fs-h3)">Статьи и инструкции</h2>${articleList(list)}</div>
    ${dl.length ? html`<div class="stack"><h2 style="font-size:var(--fs-h3)">Образцы документов</h2>${articleList(dl)}</div>` : ''}
  </div>
  <aside class="stack aside-sticky">
    ${svc.length ? html`<div class="card"><p class="eyebrow">Поможем подготовить</p>${svc.map((s) => html`<a class="link-arrow" href="${s.path}">${s.title} ${icon('arrow')}</a>`)}</div>` : ''}
    <div class="card" style="background:var(--g-brand-soft)"><h3>Не нашли ответ?</h3><p>Опишите ситуацию — первичная консультация бесплатно.</p><a class="btn btn--primary" href="#contact">Описать ситуацию</a></div>
  </aside>
</div></section>
${contactSection(ctx)}`,
  });
}

export function articlePage(ctx, a, legacy, bookmarked) {
  const t = a.topic ? topicBySlug.get(a.topic) : null;
  const more = t ? t.articleSlugs.filter((s) => s !== a.slug).slice(0, 5).map((s) => articleBySlug.get(s)) : [];
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    inLanguage: 'ru-RU',
    mainEntityOfPage: config.baseUrl + a.path,
    publisher: { '@id': `${config.baseUrl}/#organization` },
  };
  return layout(ctx, {
    title: a.metaTitle,
    description: a.description,
    path: a.path,
    jsonld: [ld],
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ...(t ? [[t.title, t.path]] : []), [a.title, a.path]], eyebrow: t?.title || 'База знаний', title: a.title, lead: a.description })}
<section class="wrap section--tight"><div class="layout-aside">
  <article class="stack">${legacy ? legacyBody(legacy) : legacyBody(null)}
    <p class="muted" style="font-size:var(--fs-14)">Материалы базы знаний носят информационный характер и не заменяют анализ конкретной ситуации.</p>
  </article>
  <aside class="stack aside-sticky">
    ${bookmarkButton(ctx, a.path, a.title, bookmarked)}
    <div class="card" style="background:var(--g-brand-soft)"><h3>Разберём вашу ситуацию</h3><p>Первичная консультация — бесплатно.</p><a class="btn btn--primary" href="#contact">Описать ситуацию</a></div>
    ${more.length ? html`<div class="card"><p class="eyebrow">Ещё по теме</p>${more.map((m) => html`<a href="${m.path}">${m.title}</a>`)}</div>` : ''}
  </aside>
</div></section>
${contactSection(ctx)}`,
  });
}

export function bookmarkButton(ctx, path, title, bookmarked) {
  if (!ctx.user) return html`<a class="btn btn--ghost btn--block" href="/login/?next=${encodeURIComponent(path)}">${icon('bookmark')}Сохранить в кабинет</a>`;
  return html`<form method="post" action="/cabinet/bookmarks/toggle/">${csrfField(ctx)}
    <input type="hidden" name="path" value="${path}"><input type="hidden" name="title" value="${title}">
    <button class="btn ${bookmarked ? 'btn--primary' : 'btn--ghost'} btn--block" type="submit">${icon('bookmark')}${bookmarked ? 'Сохранено в закладках' : 'Сохранить в закладки'}</button></form>`;
}

export function downloadsIndex(ctx) {
  return layout(ctx, {
    title: 'Шаблоны юридических документов' + S,
    description: 'Юридические документы: заявления, жалобы, претензии, ходатайства и другие шаблоны с удобным поиском и заполнением.',
    path: '/knowledge/downloads/',
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ['Документы', '/knowledge/downloads/']], eyebrow: 'Документы', title: 'Юридические документы', lead: 'Образцы заявлений, жалоб, претензий и ходатайств в DOCX и PDF. Перед подачей адаптируйте под свою ситуацию.' })}
<section class="wrap section--tight">${topics.filter((t) => downloads.some((d) => d.topic === t.slug)).map((t) => html`<div class="stack" style="margin-bottom:var(--s-10)"><h2 style="font-size:var(--fs-h3)">${t.title}</h2>${articleList(downloads.filter((d) => d.topic === t.slug))}</div>`)}</section>`,
  });
}

export function downloadPage(ctx, d, legacy, bookmarked, files) {
  const t = topicBySlug.get(d.topic);
  return layout(ctx, {
    title: d.metaTitle,
    description: d.metaDescription,
    path: d.path,
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ['Документы', '/knowledge/downloads/'], [d.title, d.path]], eyebrow: 'Образец документа', title: d.title, lead: d.description, art: '/img/icons3d/value-documents.webp' })}
<section class="wrap section--tight"><div class="layout-aside">
  <article class="stack">
    <div class="hero-actions" style="margin:0">
      ${files.docx ? html`<a class="btn btn--primary" href="${d.docx}" download>${icon('download')}Скачать DOCX</a>` : ''}
      ${files.pdf ? html`<a class="btn btn--ghost" href="${d.pdf}" download>${icon('download')}Скачать PDF</a>` : ''}
    </div>
    ${!files.docx && !files.pdf ? alert('info', 'Файлы образца переносятся со старой версии сайта.') : ''}
    ${legacy ? legacyBody(legacy) : ''}
  </article>
  <aside class="stack aside-sticky">
    ${bookmarkButton(ctx, d.path, d.title, bookmarked)}
    ${t ? html`<a class="card" href="${t.path}"><p class="eyebrow">Тема</p><h3>${t.title}</h3></a>` : ''}
    <div class="card" style="background:var(--g-brand-soft)"><h3>Подготовим документ за вас</h3><p>С учётом обстоятельств дела — от 10 000 ₽.</p><a class="btn btn--primary" href="#contact">Заказать</a></div>
  </aside>
</div></section>
${contactSection(ctx)}`,
  });
}

// Калькулятор договорной неустойки — не зависит от внешних ставок
export function calculatorsPage(ctx, calc) {
  const s = knowledgeSections.calculators;
  return layout(ctx, {
    title: s.metaTitle,
    description: s.description,
    path: s.path,
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], [s.title, s.path]], eyebrow: 'Калькуляторы', title: s.title, lead: 'Предварительные расчёты. Итог зависит от условий договора и позиции суда — для точного расчёта обратитесь к специалисту.' })}
<section class="wrap section--tight"><div class="layout-aside">
  <div class="card stack" id="penalty">
    <h2 style="font-size:var(--fs-h3)">Договорная неустойка</h2>
    <form class="form" method="get" action="${s.path}#penalty">
      <div class="form-row">
        <div class="field"><label for="c-sum">Сумма долга, ₽</label><input class="input" id="c-sum" name="sum" inputmode="decimal" value="${calc.sum ?? ''}" required></div>
        <div class="field"><label for="c-rate">Неустойка, % в день</label><input class="input" id="c-rate" name="rate" inputmode="decimal" value="${calc.rate ?? '0.1'}" required></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="c-days">Дней просрочки</label><input class="input" id="c-days" name="days" inputmode="numeric" value="${calc.days ?? ''}" required></div>
        <div class="field"><label for="c-cap">Ограничение, % от долга <span class="muted">(если есть в договоре)</span></label><input class="input" id="c-cap" name="cap" inputmode="decimal" value="${calc.cap ?? ''}"></div>
      </div>
      <div><button class="btn btn--primary" type="submit">Рассчитать</button></div>
    </form>
    ${calc.error ? alert('error', calc.error) : ''}
    ${calc.result ? html`<div class="panel" style="padding:24px" role="status"><p class="eyebrow">Результат</p><p style="font:700 2rem/1.2 var(--font-display);color:var(--c-on-primary)">${calc.result.total}</p><p>${calc.result.formula}</p></div>` : ''}
  </div>
  <aside class="card aside-sticky"><h3>Проценты по ст. 395 ГК РФ и компенсация по ст. 236 ТК РФ</h3><p>Эти расчёты зависят от ключевой ставки Банка России на каждый период просрочки. Мы добавим их, когда в системе будет проверенная таблица ставок. Пока рекомендуем статьи:</p>
    <a class="link-arrow" href="/knowledge/kak-rasschitat-protsenty-395-gk/">Проценты по ст. 395 ГК ${icon('arrow')}</a>
    <a class="link-arrow" href="/knowledge/kompensatsiya-za-zaderzhku-zarplaty-236-tk/">Компенсация по ст. 236 ТК ${icon('arrow')}</a>
  </aside>
</div></section>`,
  });
}

export function calcPenalty(q) {
  const num = (v) => Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  const out = { sum: q.get('sum'), rate: q.get('rate'), days: q.get('days'), cap: q.get('cap') };
  if (!out.sum && !out.days) return out;
  const sum = num(out.sum), rate = num(out.rate), days = num(out.days), cap = out.cap ? num(out.cap) : null;
  if (!(sum > 0 && sum < 1e12) || !(rate > 0 && rate <= 100) || !(Number.isInteger(days) && days > 0 && days < 100000) || (cap !== null && !(cap > 0))) {
    out.error = 'Проверьте значения: сумма и ставка — положительные числа, дни — целое число.';
    return out;
  }
  let total = Math.round(sum * (rate / 100) * days * 100) / 100;
  let capped = false;
  if (cap !== null && total > sum * cap / 100) {
    total = Math.round(sum * cap) / 100;
    capped = true;
  }
  const fmt = (v) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(v);
  out.result = {
    total: fmt(total),
    formula: `${fmt(sum)} × ${rate}% × ${days} дн.${capped ? ` — ограничено ${cap}% от суммы долга` : ''}`,
  };
  return out;
}

export function sectionPage(ctx, key, legacy) {
  const s = knowledgeSections[key];
  return layout(ctx, {
    title: s.metaTitle,
    description: s.description,
    path: s.path,
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], [s.title, s.path]], eyebrow: 'База знаний', title: s.title, lead: s.description })}
<section class="wrap section--tight">${legacyBody(legacy)}</section>`,
  });
}

export function searchPage(ctx, q, results) {
  return layout(ctx, {
    title: (q ? `Поиск: ${q}` : 'Умный поиск') + S,
    description: 'Поиск по статьям, образцам документов и услугам Мосдевелопмент Право.',
    path: '/knowledge/search/',
    noindex: Boolean(q),
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ['Поиск', '/knowledge/search/']], title: 'Умный поиск' })}
<section class="wrap section--tight stack-lg">
  <form class="search" action="/knowledge/search/" method="get" role="search">
    ${icon('search')}<label class="visually-hidden" for="sq">Что ищем</label>
    <input id="sq" name="q" type="search" value="${q}" placeholder="Опишите проблему своими словами" autocomplete="off" autofocus>
    <button class="btn btn--primary btn--sm" type="submit">Найти</button>
  </form>
  ${q ? (results.length
      ? html`<div class="stack"><p class="muted" role="status">Нашли ${results.length} ${results.length % 10 === 1 && results.length % 100 !== 11 ? 'материал' : 'материалов'}</p>
        <ul class="list-links">${results.map((r) => html`<li><a href="${r.path}"><span><span class="eyebrow" style="font-size:11px">${r.kindLabel}</span><br>${r.title}<small>${raw(r.snippet)}</small></span>${icon('arrow')}</a></li>`)}</ul></div>`
      : html`<div class="empty"><img src="/img/icons3d/value-analysis.webp" alt="" width="120" height="120"><h2 style="font-size:var(--fs-h3)">Ничего не нашли</h2><p>Попробуйте другие слова или опишите ситуацию специалисту — первичная консультация бесплатно.</p><a class="btn btn--primary" href="/#contact">Описать ситуацию</a></div>`)
    : ''}
</section>`,
  });
}

// ── О компании, команда, процесс, цены, FAQ, контакты, партнёрство ───────────
export function aboutPage(ctx) {
  return layout(ctx, {
    title: 'О компании | Мосдевелопмент Право',
    description: 'Мосдевелопмент Право — юридическая компания. Уголовно-правовые вопросы, подготовка правовой позиции, документов и обращений в государственные органы.',
    path: '/about/',
    body: html`${pageHead({ crumbs: [home, ['О компании', '/about/']], eyebrow: 'О компании', title: 'Сильная правовая позиция начинается с точного понимания ситуации', lead: 'Работаем с гражданами и бизнесом: изучаем обстоятельства и документы, объясняем риски и готовим последовательный план действий.' })}
<section class="wrap section--tight"><div class="grid">
  <div class="card reveal"><img src="/img/icons3d/criminal-law.webp" alt="" width="96" height="96" style="width:96px"><h3>Уголовно-правовые вопросы</h3><p>Правовая позиция, заявления, жалобы, ходатайства и обращения в МВД, Следственный комитет, прокуратуру и другие органы.</p></div>
  <div class="card reveal"><img src="/img/icons3d/public-authorities.webp" alt="" width="96" height="96" style="width:96px"><h3>Споры и защита интересов</h3><p>Гражданские, административные, трудовые и имущественные споры, недвижимость, строительство и взыскание задолженности.</p></div>
  <div class="card reveal"><img src="/img/icons3d/value-position.webp" alt="" width="96" height="96" style="width:96px"><h3>Правовая стратегия</h3><p>Анализируем ситуацию, оцениваем риски и выстраиваем стратегию с опорой на закон и фактические обстоятельства.</p></div>
</div></section>
<section class="wrap section"><div class="section-head"><p class="eyebrow">Команда</p><h2>Руководство компании</h2></div><div class="team">${team.map(personCard)}</div></section>
<section class="wrap section--tight"><div class="card"><h2 style="font-size:var(--fs-h3)">Реквизиты компании</h2>
  <dl class="dl">
    <dt>Наименование</dt><dd>${company.legalName}</dd>
    <dt>ИНН</dt><dd>${company.inn}</dd><dt>КПП</dt><dd>${company.kpp}</dd><dt>ОГРН</dt><dd>${company.ogrn}</dd>
    <dt>Банк</dt><dd>${company.bank.name}</dd><dt>БИК</dt><dd>${company.bank.bik}</dd>
    <dt>Р/с</dt><dd>${company.bank.account}</dd><dt>К/с</dt><dd>${company.bank.corr}</dd>
    <dt>Адрес</dt><dd>${company.address}</dd>
  </dl></div></section>
${contactSection(ctx)}`,
  });
}

export function teamPage(ctx, m) {
  const ld = { '@context': 'https://schema.org', '@type': 'Person', name: m.name, jobTitle: m.role, worksFor: { '@id': `${config.baseUrl}/#organization` }, image: config.baseUrl + m.photo };
  return layout(ctx, {
    title: m.metaTitle,
    description: m.metaDescription,
    path: `/team/${m.slug}/`,
    jsonld: [ld],
    body: html`<section class="wrap section--tight">${crumbs([home, ['О компании', '/about/'], [m.name, `/team/${m.slug}/`]])}
<div class="grid grid--2" style="align-items:center;gap:var(--s-10)">
  <div class="person" style="max-width:440px"><div class="photo"><img src="${m.photo}" alt="${m.photoAlt}" width="480" height="600"></div></div>
  <div class="stack">
    <p class="eyebrow">${company.name}</p>
    <h1 style="font-size:clamp(1.75rem,1.2rem + 2.4vw,3rem)">${m.name}</h1>
    <p class="accent-title" style="font:600 1.125rem/1.3 var(--font-display)">${m.role}</p>
    <p class="lead" style="font-size:var(--fs-18)">${m.lead}</p>
    ${m.about.map((p) => html`<p>${p}</p>`)}
    <div class="hero-tags">${m.focus.map((f) => html`<span class="chip chip--accent"><i></i>${f}</span>`)}</div>
    <div class="hero-actions">
      <a class="btn btn--primary" href="tel:${company.phones[0].tel}">${icon('phone')}Позвонить</a>
      <a class="btn btn--ghost" href="mailto:${company.email}">${icon('mail')}Написать</a>
    </div>
  </div>
</div></section>
${contactSection(ctx)}`,
  });
}

export function processPage(ctx) {
  return layout(ctx, {
    title: 'Как мы работаем — Мосдевелопмент Право',
    description: 'Все этапы работы с юридическим обращением в одном списке.',
    path: '/process/',
    body: html`${pageHead({ crumbs: [home, ['Как мы работаем', '/process/']], eyebrow: 'Порядок работы', title: 'Как мы работаем', lead: 'От первого обращения до готовых документов — четыре последовательных шага.' })}
<section class="wrap section--tight"><div class="steps">${process.map((s) => html`<div class="step reveal"><img src="${s.img}" alt="" width="88" height="88" loading="lazy"><h3>${s.title}</h3><p>${s.text}</p></div>`)}</div></section>
<section class="wrap section--tight"><div class="card" style="background:var(--g-brand-soft)"><h2 style="font-size:var(--fs-h3)">После согласования — в личном кабинете</h2><p>Статус дела, документы, счета и сообщения от специалиста собраны в одном месте. Оплата проходит через платёжную систему, статус подтверждает сервер.</p><a class="link-arrow" href="/login/">Войти в кабинет ${icon('arrow')}</a></div></section>
${contactSection(ctx)}`,
  });
}

export function pricesPage(ctx) {
  return layout(ctx, {
    title: 'Стоимость услуг' + S,
    description: 'Стоимость юридических услуг: первичная консультация бесплатно, консультация по делу от 5 000 ₽, подготовка документов от 10 000 ₽.',
    path: '/prices/',
    body: html`${pageHead({ crumbs: [home, ['Стоимость', '/prices/']], eyebrow: 'Стоимость', title: 'Понятные условия', lead: pricesFootnote })}
<section class="wrap section--tight">${priceGrid()}</section>
<section class="wrap section narrow"><div class="section-head"><h2>Вопросы о стоимости</h2></div>${faqList()}</section>
${contactSection(ctx)}`,
  });
}

export function faqPage(ctx) {
  return layout(ctx, {
    title: 'Частые вопросы' + S,
    description: 'Ответы на частые вопросы: с чего начинается работа, какие документы нужны, как рассчитывается стоимость.',
    path: '/faq/',
    jsonld: [faqLd()],
    body: html`${pageHead({ crumbs: [home, ['FAQ', '/faq/']], eyebrow: 'FAQ', title: 'Частые вопросы' })}
<section class="wrap section--tight narrow">${faqList()}</section>
${contactSection(ctx)}`,
  });
}

export function contactsPage(ctx, formState) {
  return layout(ctx, {
    title: 'Контакты' + S,
    description: `Телефоны ${company.phones.map((p) => p.display).join(', ')}, e-mail ${company.email}. ${company.address}.`,
    path: '/contacts/',
    body: html`${pageHead({ crumbs: [home, ['Контакты', '/contacts/']], eyebrow: 'Контакты', title: 'Свяжитесь с нами' })}
<section class="wrap section--tight"><div class="grid">
  <div class="card"><span class="icon-btn" style="background:var(--c-accent-soft)">${icon('phone')}</span><h3>Телефон</h3>${company.phones.map((p) => html`<a href="tel:${p.tel}" style="font-weight:600">${p.display}</a>`)}</div>
  <div class="card"><span class="icon-btn" style="background:var(--c-accent-soft)">${icon('mail')}</span><h3>E-mail</h3><a href="mailto:${company.email}" style="font-weight:600">${company.email}</a><p>${company.messengers.map((m, i) => html`${i ? ' · ' : ''}<a href="${m.url}" rel="noopener" target="_blank">${m.name}</a>`)}</p></div>
  <div class="card"><span class="icon-btn" style="background:var(--c-accent-soft)">${icon('pin')}</span><h3>Адрес</h3><p>${company.address}</p><a class="link-arrow" href="${company.mapUrl}" rel="noopener" target="_blank">Открыть на карте ${icon('arrow')}</a></div>
</div></section>
${contactSection(ctx, formState)}`,
  });
}

export function partnershipPage(ctx) {
  return layout(ctx, {
    title: 'Партнёрство с юристами, адвокатами и нотариусами | Мосдевелопмент Право',
    description: 'Профессиональное сотрудничество Мосдевелопмент Право с юристами, адвокатами и нотариусами. Форматы партнёрства и взаимодействия по клиентским обращениям.',
    path: '/partnership/',
    body: html`${pageHead({ crumbs: [home, ['Сотрудничество', '/partnership/']], eyebrow: 'Профессиональное сотрудничество', title: 'Партнёрство с юристами, адвокатами и нотариусами', lead: 'Открыты к сотрудничеству со специалистами, чьи компетенции усиливают работу со сложными правовыми задачами. Москва, Московская область и другие регионы.' })}
<section class="wrap section--tight"><div class="grid">${partnership.map((p, i) => html`<div class="card reveal"><span class="eyebrow">${String(i + 1).padStart(2, '0')}</span><h3>${p.title}</h3><p>${p.text}</p></div>`)}</div></section>
<section class="wrap section--tight"><a class="btn btn--primary" href="/partnership/contact/">Направить предложение ${icon('arrow')}</a></section>`,
  });
}

export function partnershipContactPage(ctx, formState = {}) {
  return layout(ctx, {
    title: 'Предложить партнёрство | Мосдевелопмент Право',
    description: 'Форма профессионального сотрудничества для юристов, адвокатов, нотариусов и профессиональных объединений.',
    path: '/partnership/contact/',
    body: html`${pageHead({ crumbs: [home, ['Сотрудничество', '/partnership/'], ['Предложить партнёрство', '/partnership/contact/']], title: 'Предложить профессиональное сотрудничество', lead: 'Расскажите о себе и формате, который предлагаете.' })}
<section class="wrap section--tight narrow"><div class="card">${requestForm(ctx, { ...formState, source: '/partnership/contact/', title: false })}</div></section>`,
  });
}

export function legalPage(ctx, key, legacy) {
  const doc = key === 'privacy' ? company.legalDocs[0] : company.legalDocs[1];
  const meta = key === 'privacy'
    ? ['Политика конфиденциальности — Мосдевелопмент Право', 'Политика обработки персональных данных и конфиденциальности сайта mdpravo.ru.']
    : ['Согласие на обработку персональных данных — Мосдевелопмент Право', 'Условия согласия на обработку персональных данных при отправке обращения через mdpravo.ru.'];
  return layout(ctx, {
    title: meta[0],
    description: meta[1],
    path: doc.path,
    body: html`${pageHead({ crumbs: [home, [doc.title, doc.path]], title: doc.title })}
<section class="wrap section--tight"><div class="stack">
  <a class="link-arrow" href="${doc.pdf}">${icon('download')} PDF-версия документа</a>
  ${legacyBody(legacy)}
</div></section>`,
  });
}

export function requestSentPage(ctx, number) {
  return layout(ctx, {
    title: 'Обращение отправлено' + S,
    description: 'Обращение принято.',
    path: '/request/sent/',
    noindex: true,
    body: html`<section class="wrap section narrow"><div class="auth-card" style="max-width:640px;margin-inline:auto;text-align:center;justify-items:center">
  <img src="/img/icons3d/step-4.webp" alt="" width="160" height="160" style="width:160px">
  <h1 style="font-size:clamp(1.5rem,1.2rem + 1.4vw,2.25rem)">Обращение принято</h1>
  ${number ? html`<p>Номер обращения: <b>${number}</b></p>` : ''}
  <p class="muted">Специалист изучит ситуацию и свяжется с вами. Чтобы видеть статус и загружать документы, войдите в личный кабинет с тем же e-mail.</p>
  <div class="hero-actions" style="justify-content:center">
    ${ctx.user ? html`<a class="btn btn--primary" href="/cabinet/">В кабинет</a>` : html`<a class="btn btn--primary" href="/login/code/">Войти по коду из письма</a>`}
    <a class="btn btn--ghost" href="/knowledge/">Почитать базу знаний</a>
  </div>
</div></section>`,
  });
}

export function errorPage(ctx, status, message) {
  const titles = { 400: 'Некорректный запрос', 401: 'Нужно войти', 403: 'Доступ запрещён', 404: 'Страница не найдена', 405: 'Метод не поддерживается', 413: 'Слишком большой файл', 415: 'Формат не поддерживается', 429: 'Слишком много запросов', 500: 'Что-то пошло не так', 502: 'Сервис временно недоступен' };
  return layout(ctx, {
    title: (titles[status] || 'Ошибка') + S,
    description: '',
    noindex: true,
    body: html`<section class="wrap section narrow"><div class="empty" style="text-align:center">
  <img src="/img/icons3d/value-risk.webp" alt="" width="120" height="120">
  <p class="eyebrow">Ошибка ${status}</p>
  <h1 style="font-size:clamp(1.5rem,1.2rem + 1.4vw,2.25rem)">${titles[status] || 'Ошибка'}</h1>
  <p>${message || (status === 404 ? 'Возможно, страница переехала. Начните с главной или поиска.' : 'Попробуйте ещё раз чуть позже.')}</p>
  <div class="hero-actions" style="justify-content:center"><a class="btn btn--primary" href="/">На главную</a><a class="btn btn--ghost" href="/knowledge/search/">Поиск</a></div>
</div></section>`,
  });
}
