// Публичные страницы сайта.
import { config } from '../config.js';
import { legalTexts } from '../content/legal.js';
import { company, faq, partnership, prices, pricesFootnote, process, team, values } from '../content/company.js';
import { articleBySlug, articles, downloadBySlug, downloads, knowledgeSections, topicBySlug, topics, urgent, urgentBySlug } from '../content/knowledge.js';
import { directionBySlug, directions, directionSteps, docsPrice, findTask, taskSteps } from '../content/services.js';
import { html, raw } from '../lib/html.js';
import { requestForm } from './forms.js';
import { alert, crumbs, csrfField, icon, layout, pageHead } from './ui.js';
import {
  articleContent, articleSlugsForDocument, contactContext, detentionCheckedAt, detentionServices, directionContent,
  documentContent, documentSlugsForArticle, hubContent, officialGroups, officialServices, readingTime, taskContent,
  urgentContent, urgentGroups,
} from '../content/library.js';
import { checkList, faqBlock, faqJsonLd, href, keyPoints, numberedSteps, sectionsBody, sourcesList } from './content.js';

const S = ' — Мосдевелопмент Право';
const home = ['Главная', '/'];

function serviceCards(list) {
  return html`<div class="svc-grid">${list.map((d, i) => {
    const hero = i === 0;
    const featured = d.priority;
    return html`<a class="card service-card reveal ${featured ? 'service-card--featured' : ''} ${hero ? 'service-card--hero' : ''}" href="${d.path}" data-tilt="${hero ? 5 : 9}">
      <span class="num">${String(i + 1).padStart(2, '0')}</span>
      <img class="art" src="${d.img}" alt="" width="${hero ? 320 : 112}" height="${hero ? 320 : 112}" loading="${hero ? 'eager' : 'lazy'}" decoding="async">
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
  // Заголовок и подсказка формы — как на старом сайте: по теме страницы, если она известна.
  const c = contactContext(opts.context);
  const values = { ...(opts.values || {}) };
  if (c && !values.message) values.message = c.preset;
  return html`<section class="wrap section" id="contact">
  <div class="panel spot">
    <div class="stack-lg" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));align-items:start">
      <div class="stack">
        <p class="eyebrow">Связаться с нами</p>
        <h2>${c ? c.heading : 'Опишите ситуацию — определим, с чего начать'}</h2>
        <p>${c ? c.intro : 'Для первого обращения достаточно имени, телефона и нескольких предложений.'}</p>
        <div class="stack" style="gap:8px;margin-top:12px">
          ${company.phones.map((p) => html`<a href="tel:${p.tel}" style="font:600 1.25rem/1.3 var(--font-display);text-decoration:none">${p.display}</a>`)}
          <a href="mailto:${company.email}">${company.email}</a>
          <span class="muted">${company.messengers.map((m, i) => html`${i ? ' · ' : ''}<a href="${m.url}" rel="noopener" target="_blank">${m.name}</a>`)}</span>
        </div>
      </div>
      <div>${requestForm(ctx, { ...opts, values, dark: true })}</div>
    </div>
  </div>
</section>`;
}

// Карточки статей на главной — подписи и тексты с главной старого сайта (components/HomePage.tsx).
const HOME_ARTICLES = [
  { href: '/knowledge/vyzvali-dlya-dachi-obyasneniy/', tag: 'Уголовное право', title: 'Что делать, если вас вызывают для дачи объяснений', text: 'Какие вопросы стоит выяснить заранее, что взять с собой и почему документы имеют значение.' },
  { href: '/knowledge/topics/spory-s-gosorganami/', tag: 'Госорганы', title: 'Как обжаловать решение государственного органа', text: 'Сроки, последовательность действий и документы, которые стоит приложить к жалобе.' },
  { href: '/knowledge/topics/vzyskanie-dolgov/', tag: 'Взыскание долгов', title: 'Как подготовиться к взысканию задолженности', text: 'Какие доказательства сохранить, как определить требования и с чего начать досудебную работу.' },
];

// ── Главная ────────────────────────────────────────────────────────────────
export function homePage(ctx, formState = {}) {
  const body = html`
<section class="scene hero-x">
  <span class="scene-glow scene-glow--gold" aria-hidden="true"></span>
  <span class="scene-glow scene-glow--red" aria-hidden="true"></span>
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow fade-up" style="--d:.05s">Мосдевелопмент Право · Москва</p>
      <h1 data-split>Защищаем интересы. <span class="gold-text">Формируем сильную правовую позицию.</span></h1>
      <p class="lead fade-up" style="--d:.7s">Анализируем ситуацию, оцениваем юридические риски и готовим правовую позицию, заявления, жалобы и другие необходимые документы.</p>
      <p class="hero-sub fade-up" style="--d:.78s">Уголовно-правовые вопросы • Государственные органы • Споры • Документы</p>
      <div class="hero-actions fade-up" style="--d:.85s">
        <a class="btn btn--gold btn--shine" href="#contact">Получить консультацию ${icon('arrow')}</a>
        <a class="btn btn--outline-gold" href="/knowledge/">Разобраться самостоятельно</a>
      </div>
      <div class="hero-tags fade-up" style="--d:1s">
        <span class="chip chip--accent"><i></i>Первичная консультация — бесплатно</span>
        <span class="chip">${company.experience}</span>
      </div>
      <a class="scroll-cue fade-up" style="--d:1.2s" href="#services"><span aria-hidden="true"></span>Листайте вниз</a>
    </div>
    <div class="stage fade-up" style="--d:.3s" data-stage aria-hidden="true">
      <div class="stage-inner">
        <span class="orbit"></span><span class="orbit orbit--2"></span>
        <span class="podium"></span>
        <span class="spark"></span><span class="spark"></span><span class="spark"></span><span class="spark"></span>
        <div class="obj obj--main"><img src="/img/icons3d/public-authorities.webp" alt="" width="512" height="512" fetchpriority="high"></div>
        <div class="obj obj--l"><img src="/img/icons3d/criminal-law.webp" alt="" width="512" height="512"></div>
        <div class="obj obj--r"><img src="/img/icons3d/value-documents.webp" alt="" width="512" height="512"></div>
      </div>
    </div>
  </div>
</section>

<div class="ticker ticker--wine" aria-hidden="true"><div class="ticker-track">
  ${[0, 1].map(() => html`<span>${directions.map((d) => html`<span>${d.navTitle || d.title}</span>`)}</span>`)}
</div></div>

<section class="wrap section">
  <div class="grid grid--4">
    ${values.map((v) => html`<div class="value reveal reveal--scale"><div class="medal"><img src="${v.img}" alt="" width="92" height="92" loading="lazy"></div><h3>${v.title}</h3><p class="muted">${v.text}</p></div>`)}
  </div>
</section>

<section class="scene band" id="services">
  <span class="scene-glow scene-glow--red" aria-hidden="true"></span>
  <div class="wrap">
    <div class="section-head section-head--row">
      <div class="stack">
        <p class="eyebrow">Услуги</p>
        <h2 class="reveal">Основные <span class="gold-text">направления</span></h2>
        <p>Сфокусированы на сложных правовых ситуациях, документах и выстраивании позиции.</p>
      </div>
      <a class="link-arrow" href="/directions/">Все направления деятельности ${icon('arrow')}</a>
    </div>
    ${serviceCards(directions)}
  </div>
</section>

<section class="wrap section">
  <div class="section-head section-head--row">
    <div class="stack">
      <p class="eyebrow">Как мы работаем</p>
      <h2 class="reveal">Понятный <span class="accent-title">порядок работы</span></h2>
      <p>На первом этапе достаточно кратко описать ситуацию. Не нужно заранее собирать идеальный комплект документов — разберёмся, что действительно потребуется.</p>
    </div>
    <a class="link-arrow" href="/process/">Все этапы работы ${icon('arrow')}</a>
  </div>
  <div class="steps steps--line">${process.map((s) => html`<div class="step reveal" data-tilt="6"><img src="${s.img}" alt="" width="88" height="88" loading="lazy"><h3>${s.title}</h3><p>${s.text}</p></div>`)}</div>
  <div class="cta-inline reveal"><a class="btn btn--primary" href="#contact">Описать ситуацию ${icon('arrow')}</a><p class="muted">Для первого обращения достаточно контактов и нескольких предложений.</p></div>
</section>

<section class="scene band" id="prices">
  <span class="scene-glow scene-glow--gold" aria-hidden="true"></span>
  <div class="wrap stack-lg">
    <div class="facts">
      <div class="fact reveal"><b class="gold-text"><span data-count="10" data-suffix="+">10+</span></b><span>лет уголовной и гражданско-правовой практики</span></div>
      <div class="fact reveal"><b class="gold-text"><span data-count="${directions.length}">${directions.length}</span></b><span>направлений права</span></div>
      <div class="fact reveal"><b class="gold-text"><span data-count="${downloads.length}">${downloads.length}</span></b><span>образцов документов в базе знаний</span></div>
      <div class="fact reveal"><b class="gold-text">0 ₽</b><span>первичная консультация</span></div>
    </div>
    <div class="section-head" style="margin:0"><p class="eyebrow">Стоимость</p><h2 class="reveal">Стоимость <span class="gold-text">услуг</span></h2><p>Понятные условия и индивидуальный подход к каждому обращению</p></div>
    ${priceGrid()}
    <div class="cta-inline"><p>${pricesFootnote}</p><a class="btn btn--gold btn--shine" href="#contact">Получить бесплатную консультацию ${icon('arrow')}</a></div>
  </div>
</section>

<section class="wrap section">
  <div class="layout-aside">
    <div class="stack-lg">
      <div class="section-head" style="margin:0"><p class="eyebrow">О компании</p><h2 class="reveal">Защищаем права и законные интересы <span class="accent-title">граждан и бизнеса.</span></h2>
      <p>Приоритетное направление — уголовно-правовые вопросы, подготовка правовой позиции и обращений в МВД, Следственный комитет и прокуратуру. Также работаем по гражданским, административным, трудовым и имущественным вопросам.</p></div>
      <div class="section-head" style="margin:0"><p class="eyebrow">Команда</p><h2 class="h3">Руководство компании</h2></div>
      <div class="team">${team.map(personCard)}</div>
    </div>
    <div class="card aside-sticky gold-frame reveal" style="--frame-bg:#FBF6F0">
      <p class="eyebrow">Почему мы</p>
      <h3>${company.experience}</h3>
      <hr class="gold-rule">
      <p>${company.slogan}</p>
      <a class="link-arrow" href="/about/">Подробнее о компании ${icon('arrow')}</a>
    </div>
  </div>
</section>

<section class="wrap section">
  <div class="section-head section-head--row">
    <div class="stack"><p class="eyebrow">Полезное</p><h2 class="reveal">Разбираем сложные ситуации <span class="accent-title">понятным языком</span></h2></div>
    <a class="link-arrow" href="/knowledge/">База знаний ${icon('arrow')}</a>
  </div>
  <form class="search reveal" action="/knowledge/search/" method="get" role="search">
    ${icon('search')}<label class="visually-hidden" for="hs-q">Поиск по базе знаний</label>
    <input id="hs-q" name="q" type="search" placeholder="Например: не возвращают долг по расписке" autocomplete="off">
    <button class="btn btn--primary btn--sm" type="submit">Найти</button>
  </form>
  <div class="grid" style="margin-top:var(--s-6)">
    ${HOME_ARTICLES.map((x) => {
      return html`<a class="card reveal" href="${x.href}" data-tilt="5"><span class="eyebrow">${x.tag}</span><h3>${x.title}</h3><p>${x.text}</p><span class="link-arrow more">Читать ${icon('arrow')}</span></a>`;
    })}
  </div>
</section>

<section class="wrap section narrow">
  <div class="section-head center" style="justify-items:center"><p class="eyebrow">FAQ</p><h2 class="reveal">Частые вопросы</h2></div>
  ${faqList()}
</section>

${contactSection(ctx, formState)}

<section class="wrap section--tight">
  <a class="card gold-frame cta-row" href="/partnership/" data-tilt="4" style="--frame-bg:#FBF6F0">
    <div class="stack" style="gap:6px"><p class="eyebrow">Профессиональное сотрудничество</p><h3>Партнёрство с юристами, адвокатами и нотариусами</h3></div>
    <span class="link-arrow">Подробнее о сотрудничестве ${icon('arrow')}</span>
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
  return html`<div class="prices">${prices.map((p) => html`<div class="price reveal ${p.highlight ? 'price--free' : ''}" data-tilt="5">
    <h3>${p.title}</h3>
    <div class="amount">${p.price}</div>
    <p class="muted">${p.text}</p>
    ${p.sub ? html`<ul>${p.sub.map((s) => html`<li><span>${s.title}${s.text ? html`<small>${s.text}</small>` : ''}</span><b>${s.price}</b></li>`)}</ul>` : ''}
    ${p.note ? html`<p class="note">${p.note}</p>` : ''}
  </div>`)}</div>`;
}

function personCard(m) {
  return html`<a class="person reveal" href="/team/${m.slug}/" data-tilt="5">
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
    body: html`${pageHead({ crumbs: [home, ['Юридические услуги', '/directions/']], eyebrow: 'Юридические услуги', title: 'Все направления', lead: 'Выберите вопрос, который хотите решить. В каждом направлении — ситуации, с которыми мы работаем, и варианты юридической помощи.' })}
<section class="wrap section--tight">${serviceCards(directions)}</section>
${ctaBand('Не знаете, какое направление выбрать? Опишите свою ситуацию', 'Поможем определить подходящий порядок действий.')}
${contactSection(ctx)}`,
  });
}

export function legacyBody(legacy, fallback) {
  if (legacy) return html`<div class="prose">${raw(legacy.html)}</div>`;
  return html`<div class="stack">${fallback ? html`<p class="lead" style="font-size:var(--fs-18)">${fallback}</p>` : ''}
    ${alert('info', 'Полный текст этого материала переносится со старой версии сайта. Если нужен разбор вашей ситуации прямо сейчас — опишите её в форме ниже.')}</div>`;
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
    <a class="card" href="/urgent/"><h3>Что делать прямо сейчас</h3><p>Короткие пошаговые алгоритмы для срочных ситуаций.</p></a>
    <a class="card" href="/knowledge/downloads/"><h3>Найти образец документа</h3><p>Жалобы, заявления, претензии и ходатайства.</p></a>
    <a class="card" href="${knowledgeSections.calculators.path}"><h3>Рассчитать неустойку</h3><p>Предварительный расчёт договорной неустойки.</p></a>
    <a class="card" href="${knowledgeSections.services.path}"><h3>Проверить сведения на госсайтах</h3><p>Найти судебное дело, проверить компанию, имущество или долг.</p></a>
  </div>
</section>
<section class="wrap section--tight" id="materials">
  <div class="section-head section-head--row"><div class="stack"><p class="eyebrow">Направления</p><h2>Начните с нужного направления</h2><p>Материалы по основным правовым направлениям.</p></div><a class="link-arrow" href="/knowledge/topics/">Посмотреть все направления ${icon('arrow')}</a></div>
  <div class="grid">${topics.map((t) => html`<a class="card reveal" href="${t.path}"><h3>${t.title}</h3><p>${t.description}</p><span class="muted">${t.articleSlugs.length} материалов</span></a>`)}</div>
</section>
<section class="wrap section--tight"><div class="section-head"><p class="eyebrow">Материалы</p><h2>Статьи и пошаговые разборы</h2><p>Популярные статьи и практические разборы.</p></div>${articleList(articles.slice(0, 8))}</section>
${ctaBand('Не нашли точного ответа?', 'Опишите вопрос в форме обращения — поможем с первичным анализом и дальнейшими действиями.')}
${contactSection(ctx)}`,
  });
}

export function topicsIndex(ctx) {
  return layout(ctx, {
    title: 'Направления' + S,
    description: 'Все направления базы знаний: статьи, инструкции, образцы документов и практические материалы по основным правовым вопросам.',
    path: '/knowledge/topics/',
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ['Темы', '/knowledge/topics/']], eyebrow: 'База знаний / Направления', title: 'Направления', lead: 'Выберите правовую тему, чтобы посмотреть инструкции, статьи и документы по вашей ситуации.' })}
<section class="wrap section--tight"><div class="grid">${topics.map((t) => html`<a class="card reveal" href="${t.path}" aria-label="Открыть направление «${t.title}»"><h3>${t.title}</h3><p>${t.description}</p><span class="link-arrow more">Открыть направление ${icon('arrow')}</span></a>`)}</div></section>`,
  });
}

export function bookmarkButton(ctx, path, title, bookmarked) {
  if (!ctx.user) return html`<a class="btn btn--ghost btn--block" href="/login/?next=${encodeURIComponent(path)}">${icon('bookmark')}Сохранить в кабинет</a>`;
  return html`<form method="post" action="/cabinet/bookmarks/toggle/">${csrfField(ctx)}
    <input type="hidden" name="path" value="${path}"><input type="hidden" name="title" value="${title}">
    <button class="btn ${bookmarked ? 'btn--primary' : 'btn--ghost'} btn--block" type="submit">${icon('bookmark')}${bookmarked ? 'Сохранено в закладках' : 'Сохранить в закладки'}</button></form>`;
}

// Правовая основа расчётов — со страницы /knowledge/calculators/ старого сайта.
const CALC_BASIS = [
  ['Статья 395 ГК РФ', 'Проценты определяются с учётом ключевой ставки, действовавшей в соответствующие периоды.'],
  ['Статья 236 ТК РФ', 'Минимальная компенсация за задержку выплат привязана к 1/150 действующей ключевой ставки.'],
  ['Статья 333.19 НК РФ', 'Шкала государственной пошлины по имущественным требованиям в судах общей юрисдикции и у мировых судей.'],
  ['Статья 333.21 НК РФ', 'Шкала государственной пошлины по имущественным требованиям в арбитражных судах.'],
  ['Статьи 330 и 333 ГК РФ', 'Общие правила о неустойке и возможности её уменьшения судом при явной несоразмерности.'],
  ['Ключевая ставка Банка России', 'Перед расчётом процентов и трудовой компенсации проверьте даты изменения ставки.'],
];

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
</div></section>
<section class="wrap section--tight"><details class="card basis"><summary><h2 class="h3">Правовая основа расчётов</h2></summary>
  <ol class="num-steps">${CALC_BASIS.map(([t, d], i) => html`<li><span class="num-steps__n">${String(i + 1).padStart(2, '0')}</span><div><h3>${t}</h3><p>${d}</p></div></li>`)}</ol>
</details></section>
${ctaBand('Нужна проверка расчёта для иска?', 'Поможем проверить сумму и основание требования по документам.')}
${contactSection(ctx, { context: 'vzyskanie-dolgov' })}`,
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
export function directionPage(ctx, d) {
  const c = directionContent(d.slug) || {};
  const t = topics.filter((x) => d.topics.includes(x.slug));
  const rel = t.flatMap((x) => x.articleSlugs).slice(0, 6).map((s) => articleBySlug.get(s)).filter(Boolean);
  const ld = { '@context': 'https://schema.org', '@type': 'Service', name: d.title, description: d.description, provider: { '@id': `${config.baseUrl}/#organization` }, areaServed: 'RU' };
  return layout(ctx, {
    title: d.metaTitle,
    description: d.description,
    path: d.path,
    jsonld: [ld],
    body: html`${pageHead({ crumbs: [home, ['Юридические услуги', '/directions/'], [d.navTitle || d.title, d.path]], eyebrow: c.eyebrow || 'Направление', title: d.title, lead: d.description, art: d.img })}
${c.intro ? html`<section class="wrap section--tight"><p class="lead-text reveal">${c.intro}</p></section>` : ''}
<section class="wrap section--tight">
  <div class="section-head"><p class="eyebrow">Как мы работаем</p><h2>Разбираем факты, документы и порядок действий</h2></div>
  <div class="steps">${directionSteps.map((s) => html`<div class="step reveal"><h3>${s.title}</h3><p>${s.text}</p></div>`)}</div>
</section>
${c.situations ? html`<section class="wrap section--tight"><div class="grid grid--2">
  <div class="card reveal"><p class="eyebrow">Ситуации</p><h2 class="h3">С какими вопросами работаем</h2>${checkList(c.situations)}</div>
  <div class="card reveal"><p class="eyebrow">Документы</p><h2 class="h3">Что можем подготовить</h2>${checkList(c.documents)}</div>
</div></section>` : ''}
${d.tasks.length ? html`<section class="wrap section--tight">
  <div class="section-head"><p class="eyebrow">Частые задачи</p><h2>Выберите свою задачу</h2></div>
  <ul class="list-links">${d.tasks.map((x) => html`<li><a href="${x.path}"><span>${x.title}<small>${x.description}</small></span>${icon('arrow')}</a></li>`)}</ul>
</section>` : ''}
<section class="wrap section--tight">
  <div class="grid grid--2">
    <div class="price"><p class="eyebrow">Стоимость</p><h3>Подготовка документов</h3><div class="amount">${docsPrice(d)}</div><p class="note">${pricesFootnote} Первичная консультация — бесплатно.</p></div>
    ${t.length ? html`<div class="card"><p class="eyebrow">Материалы по направлению</p>${t.map((x) => html`<a class="link-arrow" href="${x.path}">${x.title} ${icon('arrow')}</a>`)}</div>` : ''}
  </div>
</section>
${rel.length ? html`<section class="wrap section--tight"><div class="section-head section-head--row"><div class="stack"><p class="eyebrow">Полезное</p><h2>Материалы по этому направлению</h2></div><a class="link-arrow" href="/knowledge/">Вся база знаний ${icon('arrow')}</a></div>${articleList(rel)}</section>` : ''}
${ctaBand('Нужна правовая позиция по вашей ситуации?', 'Опишите обстоятельства и имеющиеся документы. Начнём с первичного анализа и определим возможный порядок действий.')}
${contactSection(ctx, { values: { topic: d.slug }, context: c.topic })}`,
  });
}

function ctaBand(title, text) {
  return html`<section class="wrap section--tight"><a class="card gold-frame cta-row" href="#contact" data-tilt="4" style="--frame-bg:#FBF6F0">
    <div class="stack" style="gap:6px"><p class="eyebrow">Мосдевелопмент Право</p><h3>${title}</h3><p class="muted">${text}</p></div>
    <span class="link-arrow">Описать ситуацию ${icon('arrow')}</span>
  </a></section>`;
}

export function taskPage(ctx, d, t) {
  const c = taskContent(d.slug, t.slug) || {};
  const dc = directionContent(d.slug) || {};
  const sibling = d.tasks.filter((x) => x.slug !== t.slug).slice(0, 5);
  const mats = topics.filter((x) => d.topics.includes(x.slug)).flatMap((x) => x.articleSlugs).slice(0, 4).map((s) => articleBySlug.get(s)).filter(Boolean);
  return layout(ctx, {
    title: t.metaTitle,
    description: t.description,
    path: t.path,
    body: html`${pageHead({ crumbs: [home, ['Юридические услуги', '/directions/'], [d.navTitle || d.title, d.path], [t.title, t.path]], eyebrow: `${d.navTitle || d.title} · конкретная задача`, title: t.title, lead: t.description, art: d.img })}
<section class="wrap section--tight">
  <div class="layout-aside">
    <div class="stack-lg">
      ${c.intro ? html`<div class="stack"><p class="eyebrow">Задача</p><h2 class="h3">Сначала разбираем факты и документы</h2><p class="lead-text">${c.intro}</p></div>` : ''}
      <div class="steps">${taskSteps.map((s) => html`<div class="step"><h3>${s.title}</h3><p>${s.text}</p></div>`)}</div>
      ${c.situations ? html`<div class="grid grid--2">
        <div class="card"><p class="eyebrow">Когда актуально</p><h2 class="h3">С какими обстоятельствами работаем</h2>${checkList(c.situations)}</div>
        <div class="card"><p class="eyebrow">Результат работы</p><h2 class="h3">Какие документы можно подготовить</h2>${checkList(c.documents)}</div>
      </div>` : ''}
      ${mats.length ? html`<div class="stack"><p class="eyebrow">База знаний</p><h2 class="h3">Материалы по этой теме</h2>${articleList(mats)}</div>` : ''}
      ${sibling.length ? html`<div class="stack"><h2 class="h3">Похожие задачи</h2><ul class="list-links">${sibling.map((x) => html`<li><a href="${x.path}"><span>${x.title}</span>${icon('arrow')}</a></li>`)}</ul></div>` : ''}
    </div>
    <div class="price aside-sticky"><p class="eyebrow">Стоимость</p><div class="amount">${docsPrice(d)}</div><p class="muted">Подготовка документов. ${pricesFootnote}</p><a class="btn btn--primary btn--block" href="#contact">Описать ситуацию</a><a class="link-arrow" href="${d.path}">Вернуться к направлению ${icon('arrow')}</a></div>
  </div>
</section>
${ctaBand('Нужно подготовить позицию или документ?', 'Опишите обстоятельства и приложите имеющиеся материалы. Определим, какие документы и последовательность действий подходят вашей ситуации.')}
${contactSection(ctx, { values: { topic: d.slug }, context: dc.topic })}`,
  });
}

// ── Срочные ситуации ───────────────────────────────────────────────────────
export function urgentIndex(ctx) {
  return layout(ctx, {
    title: 'Что делать прямо сейчас' + S,
    description: 'Короткие пошаговые алгоритмы для срочных юридических ситуаций: задержание, вызов в полицию, долг, увольнение, СИЗО и споры с госорганами.',
    path: '/urgent/',
    body: html`${pageHead({ crumbs: [home, ['Срочно', '/urgent/']], eyebrow: 'Практический навигатор', title: 'Что делать прямо сейчас', lead: 'Короткие алгоритмы для ситуаций, когда важно сначала не потерять документы, сроки и доказательства, а уже потом выбирать дальнейший способ защиты.' })}
${urgentGroups.map((g) => {
      const list = g.slugs.map((s) => urgentBySlug.get(s)).filter(Boolean);
      return html`<section class="wrap section--tight">
  <div class="section-head"><p class="eyebrow">Ситуация</p><h2>${g.title}</h2><p>${g.description}</p></div>
  <div class="grid">${list.map((u) => {
        const d = directionBySlug.get(u.direction);
        const n = urgent.indexOf(u) + 1;
        return html`<a class="card reveal" href="${u.path}"><img src="${d.img}" alt="" width="72" height="72" loading="lazy" style="width:72px;height:72px"><span class="muted" style="font-size:var(--fs-14)">${String(n).padStart(2, '0')} · быстрый алгоритм</span><h3>${u.title}</h3><p>${u.description}</p><span class="link-arrow more">Открыть инструкцию ${icon('arrow')}</span></a>`;
      })}</div>
</section>`;
    })}
${contactSection(ctx)}`,
  });
}

export function urgentPage(ctx, u, legacy) {
  const d = directionBySlug.get(u.direction);
  const t = topicBySlug.get(u.topic);
  const g = urgentContent(u.slug);
  return layout(ctx, {
    title: u.metaTitle,
    description: u.description,
    path: u.path,
    body: html`${pageHead({ crumbs: [home, ['Срочно', '/urgent/'], [u.title, u.path]], eyebrow: 'Что делать прямо сейчас', title: u.title, lead: u.description, art: d.img })}
<section class="wrap section--tight"><div class="layout-aside">
  <article class="stack-lg">
    ${g ? numberedSteps(g.steps) : legacyBody(legacy)}
    ${g ? html`<div class="grid grid--2">
      <div class="card card--warn"><h3>Чего лучше не делать</h3>${checkList(g.avoid, 'checklist--no')}</div>
      <div class="card"><h3>Что сохранить</h3>${checkList(g.documents)}</div>
    </div>` : ''}
    <p class="muted" style="font-size:var(--fs-14)">Алгоритм носит общий информационный характер. Процессуальные права, сроки и порядок действий зависят от статуса, документов и фактических обстоятельств конкретной ситуации.</p>
  </article>
  <aside class="stack aside-sticky">
    <div class="card" style="background:var(--g-brand-soft)"><h3>Нужна помощь прямо сейчас?</h3><p>Позвоните или напишите — разберёмся, что делать.</p>${company.phones.map((p) => html`<a class="btn btn--primary btn--block" href="tel:${p.tel}">${icon('phone')}${p.display}</a>`)}</div>
    <a class="card" href="${d.path}"><p class="eyebrow">Связанное направление</p><h3>${d.navTitle || d.title}</h3><span class="link-arrow">Открыть страницу услуги ${icon('arrow')}</span></a>
    ${t ? html`<a class="card" href="${t.path}"><p class="eyebrow">Материалы по теме</p><h3>${t.title}</h3><span class="link-arrow">Открыть ${icon('arrow')}</span></a>` : ''}
    <a class="link-arrow" href="/urgent/">Все быстрые алгоритмы ${icon('arrow')}</a>
  </aside>
</div></section>
${g?.nextLinks?.length ? html`<section class="wrap section--tight">
  <div class="section-head"><p class="eyebrow">Что дальше по этой же ситуации</p><h2>Продолжайте только по фактической стадии</h2></div>
  <div class="grid">${g.nextLinks.map((l) => html`<a class="card reveal" href="${href(l.href)}"><span class="muted" style="font-size:var(--fs-14)">Профильное продолжение</span><h3>${l.title}</h3><p>${l.description}</p><span class="link-arrow more">Открыть ${icon('arrow')}</span></a>`)}</div>
</section>` : ''}
${contactSection(ctx, { values: { topic: u.direction }, context: u.topic })}`,
  });
}

export function topicPage(ctx, t) {
  const h = hubContent(t.slug) || {};
  const list = t.articleSlugs.map((s) => articleBySlug.get(s)).filter(Boolean);
  const svc = t.serviceRefs.map((r) => {
    const [dir, slug] = r.split('/');
    return findTask(dir, slug);
  }).filter(Boolean);
  const dl = downloads.filter((d) => d.topic === t.slug);
  const related = (h.relatedHubSlugs || []).map((s) => topicBySlug.get(s)).filter(Boolean);
  const faqs = h.faqs || [];
  return layout(ctx, {
    title: t.metaTitle,
    description: t.description,
    path: t.path,
    jsonld: faqs.length ? [faqJsonLd(faqs)] : [],
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ['Темы', '/knowledge/topics/'], [t.title, t.path]], eyebrow: 'Тема', title: t.title, lead: t.description })}
<section class="wrap section--tight"><div class="layout-aside">
  <div class="stack-lg">
    ${h.intro ? html`<p class="lead-text">${h.intro}</p>` : ''}
    ${h.tasks?.length ? html`<div class="stack"><p class="eyebrow">С чего начать</p>
      <div class="grid grid--2">${h.tasks.map((task, i) => {
        const link = h.taskLinks?.[i];
        const inner = html`<span class="num">${String(i + 1).padStart(2, '0')}</span><h3>${task}</h3>`;
        return link ? html`<a class="card task-card reveal" href="${href(link)}">${inner}<span class="link-arrow more">Подробнее ${icon('arrow')}</span></a>` : html`<div class="card task-card">${inner}</div>`;
      })}</div></div>` : ''}
    <div class="stack"><h2 class="h3">Статьи и инструкции</h2>${articleList(list)}</div>
    ${dl.length ? html`<div class="stack"><h2 class="h3">Образцы документов</h2>${articleList(dl)}</div>` : ''}
    ${t.slug === 'sizo-i-fsin' ? html`<a class="card gold-frame" href="/knowledge/sizo-fsin-services/" style="--frame-bg:#FBF6F0"><p class="eyebrow">Практический навигатор</p><h3>Письма, связь, деньги, передачи и помощь</h3><p>Отдельно собрали действующие сервисы и официальные каналы: Ф-Письмо, ФСИНЭТ, денежные переводы, справочник учреждений, запись в бюро передач, лекарства, интернет-магазины и правозащитные обращения.</p><span class="link-arrow">Открыть каталог сервисов ${icon('arrow')}</span></a>` : ''}
    ${faqs.length ? html`<div class="stack"><p class="eyebrow">Коротко по теме</p><h2 class="h3">Частые вопросы</h2>${faqBlock(faqs)}</div>` : ''}
    ${related.length ? html`<div class="stack"><h2 class="h3">Смотрите также</h2><div class="grid">${related.map((r) => html`<a class="card" href="${r.path}"><span class="muted" style="font-size:var(--fs-14)">Связанное направление</span><h3>${r.title}</h3><span class="link-arrow more">Перейти к разделу ${icon('arrow')}</span></a>`)}</div></div>` : ''}
  </div>
  <aside class="stack aside-sticky">
    ${svc.length ? html`<div class="card"><p class="eyebrow">Страницы под вашу ситуацию</p>${svc.map((s) => html`<a class="link-arrow" href="${s.path}">${s.title} ${icon('arrow')}</a>`)}</div>` : ''}
    <div class="card" style="background:var(--g-brand-soft)"><p class="eyebrow">Индивидуальный разбор</p><h3>${h.cta?.title || 'Не нашли ответ?'}</h3><p>${h.cta?.text || 'Опишите ситуацию — первичная консультация бесплатно.'}</p><a class="btn btn--primary" href="#contact">${h.cta?.label || 'Описать ситуацию'}</a></div>
  </aside>
</div></section>
${contactSection(ctx, { context: t.slug })}`,
  });
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
function isoDate(ru) {
  const m = /^(\d{1,2}) (\S+) (\d{4})/.exec(ru || '');
  const mi = m ? MONTHS.indexOf(m[2]) : -1;
  return mi >= 0 ? `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined;
}

export function articlePage(ctx, a, legacy, bookmarked) {
  const t = a.topic ? topicBySlug.get(a.topic) : null;
  const c = articleContent(a.slug);
  const more = t ? t.articleSlugs.filter((s) => s !== a.slug).slice(0, 5).map((s) => articleBySlug.get(s)) : [];
  const docs = documentSlugsForArticle(a.slug).map((s) => downloadBySlug.get(s)).filter(Boolean);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    inLanguage: 'ru-RU',
    dateModified: isoDate(c?.updatedAt),
    mainEntityOfPage: config.baseUrl + a.path,
    author: { '@id': `${config.baseUrl}/#organization` },
    publisher: { '@id': `${config.baseUrl}/#organization` },
  };
  const jsonld = [ld];
  if (c?.faq.length) jsonld.push(faqJsonLd(c.faq));
  return layout(ctx, {
    title: a.metaTitle,
    description: a.description,
    path: a.path,
    jsonld,
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ...(t ? [[t.title, t.path]] : []), [a.title, a.path]], eyebrow: c ? `${c.type} · ${c.practice}` : t?.title || 'База знаний', title: a.title, lead: a.description })}
<section class="wrap section--tight"><div class="layout-aside">
  <article class="stack-lg">
    ${c ? html`<div class="article-meta"><span class="chip">${icon('clock')}${readingTime(c)}</span><span class="chip">Обновлено: ${c.updatedAt}</span><span class="chip">Редакция: Мосдевелопмент Право</span></div>
    <p class="lead-text">${c.intro}</p>
    ${keyPoints(c.highlights)}
    ${docs.length ? html`<div class="card"><p class="eyebrow">Полезные шаблоны</p><h2 class="h3">Документы по этой ситуации</h2><p class="muted">Откройте подходящий образец, изучите структуру и скачайте PDF или DOCX для адаптации.</p>${articleList(docs)}</div>` : ''}
    <div class="prose">${sectionsBody(c.sections)}</div>
    ${sourcesList(c.sources)}
    ${c.faq.length ? html`<div class="stack"><p class="eyebrow">Частые вопросы</p><h2 class="h3">Короткие ответы по ситуации</h2>${faqBlock(c.faq)}</div>` : ''}
    <p class="muted disclaimer">${c.disclaimer}</p>` : html`${legacyBody(legacy)}<p class="muted" style="font-size:var(--fs-14)">Материалы базы знаний носят информационный характер и не заменяют анализ конкретной ситуации.</p>`}
  </article>
  <aside class="stack aside-sticky">
    ${bookmarkButton(ctx, a.path, a.title, bookmarked)}
    <div class="card" style="background:var(--g-brand-soft)"><h3>Разберём вашу ситуацию</h3><p>Первичная консультация — бесплатно.</p><a class="btn btn--primary" href="#contact">Обсудить свою ситуацию</a></div>
    ${more.length ? html`<div class="card"><p class="eyebrow">Ещё по теме</p>${more.map((m) => html`<a href="${m.path}">${m.title}</a>`)}${t ? html`<a class="link-arrow" href="${t.path}">Все материалы по теме ${icon('arrow')}</a>` : ''}</div>` : ''}
  </aside>
</div></section>
${contactSection(ctx, { context: a.topic })}`,
  });
}

export function downloadsIndex(ctx) {
  return layout(ctx, {
    title: 'Шаблоны юридических документов' + S,
    description: 'Юридические документы: заявления, жалобы, претензии, ходатайства и другие шаблоны с удобным поиском и заполнением.',
    path: '/knowledge/downloads/',
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ['Шаблоны документов', '/knowledge/downloads/']], eyebrow: 'Документы', title: 'Юридические документы', lead: 'Найдите юридический документ, откройте шаблон и заполните его.' })}
<section class="wrap section--tight">${alert('info', 'Важно: перед использованием проверьте адресата, сроки и применимость шаблона к вашей ситуации.')}</section>
<section class="wrap section--tight">${topics.filter((t) => downloads.some((d) => d.topic === t.slug)).map((t) => html`<div class="stack" style="margin-bottom:var(--s-10)"><h2 class="h3">${t.title}</h2>${articleList(downloads.filter((d) => d.topic === t.slug))}</div>`)}</section>
${ctaBand('Нужен документ под вашу ситуацию?', 'Подготовим его с учётом ваших обстоятельств.')}
${contactSection(ctx)}`,
  });
}

export function downloadPage(ctx, d, legacy, bookmarked, files) {
  const t = topicBySlug.get(d.topic);
  const c = documentContent(d.slug) || {};
  const guides = articleSlugsForDocument(d.slug).map((s) => articleBySlug.get(s)).filter(Boolean);
  const similar = downloads.filter((x) => x.slug !== d.slug && documentContent(x.slug)?.practice === c.practice).slice(0, 3);
  const hasFiles = files.docx || files.pdf;
  return layout(ctx, {
    title: d.metaTitle,
    description: d.metaDescription,
    path: d.path,
    scripts: c.online ? ['/js/docfill.js'] : [],
    body: html`${pageHead({ crumbs: [home, ['База знаний', '/knowledge/'], ['Шаблоны документов', '/knowledge/downloads/'], [d.title, d.path]], eyebrow: `Шаблон документа${c.code ? ` · ${c.code}` : ''}`, title: d.title, lead: d.description, art: '/img/icons3d/value-documents.webp' })}
<section class="wrap section--tight"><div class="layout-aside">
  <article class="stack-lg">
    ${c.practice ? html`<div class="article-meta"><span class="chip">${c.practice}</span></div>` : ''}
    ${hasFiles ? html`<div class="stack"><p class="eyebrow">Образец документа</p><div class="hero-actions" style="margin:0">
      ${files.docx ? html`<a class="btn btn--primary" href="${d.docx}" download>${icon('download')}Скачать Word (DOCX)</a>` : ''}
      ${files.pdf ? html`<a class="btn btn--ghost" href="${d.pdf}" target="_blank" rel="noopener">${icon('eye')}Открыть PDF</a>` : ''}
    </div></div>` : ''}
    ${c.online ? docFiller(d, c.online) : ''}
    <div class="card card--note"><h3>Важно перед использованием</h3><p>Это информационный шаблон, а не готовая правовая позиция. Проверьте адресата, необходимые документы, сроки, порядок подачи и действующие нормы права. Замените все поля и подсказки своими данными.</p></div>
    ${legacy ? legacyBody(legacy) : ''}
    ${guides.length ? html`<div class="stack"><h2 class="h3">По теме документа</h2>${articleList(guides)}</div>` : ''}
    ${similar.length ? html`<div class="stack"><h2 class="h3">Похожие шаблоны</h2>${articleList(similar)}<a class="link-arrow" href="/knowledge/downloads/">Все документы ${icon('arrow')}</a></div>` : ''}
  </article>
  <aside class="stack aside-sticky">
    ${bookmarkButton(ctx, d.path, d.title, bookmarked)}
    ${t ? html`<a class="card" href="${t.path}"><p class="eyebrow">Тема</p><h3>${t.title}</h3></a>` : ''}
    <div class="card" style="background:var(--g-brand-soft)"><p class="eyebrow">Помощь юриста</p><h3>Нужен документ под вашу ситуацию?</h3><p>Подготовим с учётом обстоятельств дела — от 10 000 ₽.</p><a class="btn btn--primary" href="#contact">Обсудить ситуацию</a></div>
  </aside>
</div></section>
${contactSection(ctx, { context: d.topic })}`,
  });
}

// Заполнение шаблона на сайте: поля обрабатываются только в браузере (public/js/docfill.js), на сервер не отправляются.
function docFiller(d, o) {
  return html`<section class="card filler" id="fill-online" aria-labelledby="fill-title" data-docfill data-title="${d.title}" data-slug="${d.slug}">
  <p class="eyebrow">Удобно с телефона</p>
  <h2 class="h3" id="fill-title">Заполните документ прямо на сайте</h2>
  <p>Без Word и регистрации: ответьте на вопросы, проверьте готовый текст и сохраните его. Поля обрабатываются на вашем устройстве и не отправляются компании.</p>
  <p class="muted">${o.introduction}</p>
  ${o.caution ? alert('warning', `Особая процедура. ${o.caution}`) : ''}
  <noscript>${alert('info', 'Для заполнения на сайте включите JavaScript — или скачайте образец выше.')}</noscript>
  <form class="form" data-docfill-form novalidate hidden>
    ${o.fields.map((f) => html`<div class="field">
      <label for="df-${f.id}">${f.label}${f.required ? html` <b aria-hidden="true">*</b>` : ''}</label>
      ${f.multiline
        ? html`<textarea class="textarea" id="df-${f.id}" name="${f.id}" ${f.required ? html`required` : ''} placeholder="${f.placeholder || ''}" maxlength="8000"></textarea>`
        : html`<input class="input" id="df-${f.id}" name="${f.id}" type="${f.type === 'date' ? 'date' : 'text'}" ${f.required ? html`required` : ''} placeholder="${f.placeholder || ''}" maxlength="500" data-label="${f.label}">`}
      ${f.hint ? html`<span class="hint">${f.hint}</span>` : ''}
      <span class="error" data-error-for="${f.id}" hidden></span>
    </div>`)}
    <p class="muted" style="font-size:var(--fs-14)">Поля со звёздочкой обязательны. Не знаете сведения — не угадывайте: проверьте их в документах.</p>
    <div><button class="btn btn--primary" type="submit">Посмотреть заполненный документ</button></div>
  </form>
  <div class="stack" data-docfill-result hidden>
    <h3>Проверьте готовый текст</h3>
    <p class="muted">Документ формируется из введённых сведений. При необходимости отредактируйте его прямо здесь. Подпись ставится отдельно. Перед подачей проверьте адресата, требования и порядок обращения.</p>
    <label class="visually-hidden" for="df-preview">Текст документа</label>
    <textarea class="textarea doc-preview" id="df-preview" rows="18"></textarea>
    <div class="hero-actions" style="margin:0">
      <button class="btn btn--primary" type="button" data-docfill-download>${icon('download')}Скачать текст (.txt)</button>
      <button class="btn btn--ghost" type="button" data-docfill-copy>Скопировать</button>
      <button class="btn btn--ghost" type="button" data-docfill-edit>Изменить ответы</button>
    </div>
    <p class="muted" role="status" data-docfill-status></p>
  </div>
</section>`;
}

const OFFICIAL_TASKS = {
  pravo: 'Найти официальный текст закона',
  kad: 'Найти арбитражное дело',
  'my-arbitr': 'Подать документы в арбитражный суд',
  sudrf: 'Найти дело в суде общей юрисдикции',
  'ej-sudrf': 'Подать документы в суд онлайн',
  fns: 'Проверить компанию или ИП',
  fssp: 'Проверить исполнительное производство',
  genproc: 'Подать обращение в прокуратуру',
  onlineinspection: 'Обратиться в трудовую инспекцию',
  rosreestr: 'Проверить сведения о недвижимости',
  fedresurs: 'Проверить сведения о банкротстве',
  mvd: 'Направить обращение в МВД',
};
const OFFICIAL_GROUP_TITLES = { 'Нормативные акты': 'Законы и постановления', Суды: 'Судебные дела', Проверка: 'Компании и имущество', Обращения: 'Обращения в госорганы', Исполнение: 'Долги у приставов' };

export function sectionPage(ctx, key, legacy) {
  const s = knowledgeSections[key];
  const crumbsList = key === 'sizo'
    ? [home, ['База знаний', '/knowledge/'], ['СИЗО и ФСИН', '/knowledge/topics/sizo-i-fsin/'], ['Сервисы', s.path]]
    : [home, ['База знаний', '/knowledge/'], [s.title, s.path]];
  const body = key === 'services'
    ? html`${pageHead({ crumbs: crumbsList, eyebrow: 'Государственные и судебные сайты', title: s.title, lead: 'Найдите судебное дело, проверьте компанию, недвижимость или долги, подайте обращение. Каждая ссылка откроет сайт соответствующего ведомства или суда.' })}
${officialGroups.map((g) => html`<section class="wrap section--tight"><h2 class="h3">${OFFICIAL_GROUP_TITLES[g] || g}</h2>
  <div class="grid">${officialServices.filter((x) => x.group === g).map((x) => html`<a class="card reveal ext-card" href="${x.href}" rel="noopener" target="_blank" aria-label="${OFFICIAL_TASKS[x.id] || x.title} — ${x.title}, откроется в новой вкладке">
    <span class="muted" style="font-size:var(--fs-14)">${x.domain}</span><h3>${OFFICIAL_TASKS[x.id] || x.title}</h3><p><b>${x.title}.</b> ${x.description}</p><span class="link-arrow more">Открыть сайт ${icon('arrow')}</span></a>`)}</div></section>`)}
<section class="wrap section--tight"><p class="muted">Ссылки ведут на внешние государственные и судебные сайты. Перед подачей документов проверяйте сроки и требования ведомства.</p></section>
${ctaBand('Нужна помощь с найденными сведениями?', 'Разберём документы и поможем определить дальнейшие действия.')}`
    : key === 'sizo'
      ? html`${pageHead({ crumbs: crumbsList, eyebrow: 'Практический навигатор · СИЗО и ФСИН', title: s.title, lead: `Письма, связь, денежные переводы, передачи, лекарства и официальные каналы обращений. Адреса проверены на ${detentionCheckedAt}.` })}
<section class="wrap section--tight"><div class="card card--note"><p class="eyebrow">Перед использованием</p><h2 class="h3">Сначала выберите конкретное учреждение</h2><p>Наличие сервиса в этом каталоге не означает, что он работает во всех СИЗО и колониях. Перед оплатой проверяйте поддержку учреждения, данные получателя, ограничения и условия возврата.</p></div></section>
${[...new Set(detentionServices.map((x) => x.category))].map((cat) => html`<section class="wrap section--tight"><h2 class="h3">${cat}</h2>
  <div class="grid">${detentionServices.filter((x) => x.category === cat).map((x) => html`<a class="card reveal ext-card" href="${x.href}" rel="noopener" target="_blank" aria-label="${x.title}, откроется в новой вкладке">
    <span class="muted" style="font-size:var(--fs-14)">${new URL(x.href).hostname}</span><h3>${x.title}</h3><p>${x.description}</p>${x.note ? html`<p class="muted" style="font-size:var(--fs-14)">${x.note}</p>` : ''}<span class="link-arrow more">Открыть сайт ${icon('arrow')}</span></a>`)}</div></section>`)}
<section class="wrap section--tight"><div class="card card--warn"><p class="eyebrow">Важно</p><h2 class="h3">Не переводите деньги неизвестным посредникам</h2><p>Проверяйте домен, название сервиса, реквизиты получателя и поддержку конкретного учреждения. Старые домены могут перестать принадлежать прежним владельцам, а коммерческие сервисы могут менять географию работы.</p></div></section>`
      : html`${pageHead({ crumbs: crumbsList, eyebrow: 'База знаний', title: s.title, lead: s.description })}<section class="wrap section--tight">${legacyBody(legacy)}</section>`;
  return layout(ctx, { title: s.metaTitle, description: s.description, path: s.path, body: html`${body}${contactSection(ctx, key === 'sizo' ? { context: 'sizo-i-fsin' } : {})}` });
}

export function aboutPage(ctx) {
  return layout(ctx, {
    title: 'О компании | Мосдевелопмент Право',
    description: 'Мосдевелопмент Право — юридическая компания. Уголовно-правовые вопросы, подготовка правовой позиции, документов и обращений в государственные органы.',
    path: '/about/',
    body: html`${pageHead({ crumbs: [home, ['О компании', '/about/']], eyebrow: 'О компании', title: 'Сильная правовая позиция начинается с точного понимания ситуации.', lead: 'Работаем с гражданами и бизнесом: изучаем обстоятельства и документы, объясняем правовые риски и готовим последовательный план действий. Основные направления представлены ниже.' })}
<section class="wrap section--tight"><div class="grid">
  <div class="card reveal"><img src="/img/icons3d/criminal-law.webp" alt="" width="96" height="96" style="width:96px"><span class="eyebrow">01</span><h3>Уголовно-правовые вопросы</h3><p>Подготовка правовой позиции, заявлений, жалоб, ходатайств и обращений в МВД, Следственный комитет, прокуратуру и другие государственные органы.</p></div>
  <div class="card reveal"><img src="/img/icons3d/public-authorities.webp" alt="" width="96" height="96" style="width:96px"><span class="eyebrow">02</span><h3>Споры и защита интересов</h3><p>Юридическая помощь по гражданским, административным, трудовым и имущественным спорам, вопросам недвижимости, строительства и взыскания задолженности.</p></div>
  <div class="card reveal"><img src="/img/icons3d/value-position.webp" alt="" width="96" height="96" style="width:96px"><span class="eyebrow">03</span><h3>Правовая стратегия</h3><p>Анализируем ситуацию, оцениваем риски и формируем последовательную правовую стратегию с опорой на законодательство и фактические обстоятельства дела.</p></div>
</div></section>
<section class="wrap section"><div class="section-head"><p class="eyebrow">Команда</p><h2>Руководство компании</h2></div><div class="team">${team.map(personCard)}</div></section>
<section class="wrap section--tight" id="requisites"><div class="card"><h2 style="font-size:var(--fs-h3)">Реквизиты компании</h2>
  <dl class="dl">
    <dt>Наименование</dt><dd>${company.legalName}</dd>
    <dt>ИНН</dt><dd>${company.inn}</dd><dt>КПП</dt><dd>${company.kpp}</dd><dt>ОГРН</dt><dd>${company.ogrn}</dd>
    <dt>Банк</dt><dd>${company.bank.name}</dd><dt>БИК</dt><dd>${company.bank.bik}</dd>
    <dt>Р/с</dt><dd>${company.bank.account}</dd><dt>К/с</dt><dd>${company.bank.corr}</dd>
    <dt>Адрес</dt><dd>${company.address}</dd>
  </dl></div></section>
<section class="wrap section--tight"><div class="hero-actions" style="margin:0"><a class="btn btn--primary" href="#contact">Обсудить ситуацию</a><a class="btn btn--ghost" href="/directions/">Посмотреть услуги</a></div></section>
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
    body: html`<section class="wrap section--tight team-hero">${crumbs([home, ['О компании', '/about/'], [m.name, `/team/${m.slug}/`]])}
<div class="grid grid--2" style="align-items:center;gap:var(--s-10)">
  <div class="person" style="max-width:440px"><div class="photo"><img src="${m.photo}" alt="${m.photoAlt}" width="480" height="600"></div></div>
  <div class="stack">
    <p class="eyebrow">${company.name}</p>
    <h1 style="font-size:clamp(1.75rem,1.2rem + 2.4vw,3rem)">${m.name}</h1>
    <p class="accent-title" style="font:600 1.125rem/1.3 var(--font-display)">${m.role}</p>
    <p class="lead" style="font-size:var(--fs-18)">${m.lead}</p>
    ${m.about.map((p) => html`<p>${p}</p>`)}
    <p class="eyebrow" style="margin-top:var(--s-4)">Связаться</p>
    <div class="hero-actions" style="margin:0">
      <a class="btn btn--primary" href="tel:${m.contacts.phone.tel}">${icon('phone')}Позвонить</a>
      <a class="btn btn--ghost" href="${m.contacts.whatsapp}" rel="noopener" target="_blank">${icon('whatsapp')}WhatsApp</a>
      <a class="btn btn--ghost" href="${m.contacts.telegram}" rel="noopener" target="_blank">${icon('telegram')}Telegram</a>
      ${m.contacts.max ? html`<a class="btn btn--ghost" href="${m.contacts.max}" rel="noopener" target="_blank">${icon('chat')}MAX</a>` : ''}
      <a class="btn btn--ghost" href="mailto:${m.contacts.email}">${icon('mail')}Написать на email</a>
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
    body: html`${pageHead({ crumbs: [home, ['Как мы работаем', '/process/']], eyebrow: 'Порядок работы', title: 'Как мы работаем', lead: 'От первого обращения до передачи готовых документов — четыре последовательных шага.' })}
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
    body: html`${pageHead({ crumbs: [home, ['Сотрудничество', '/partnership/']], eyebrow: 'Профессиональное сотрудничество', title: 'Партнёрство с юристами, адвокатами и нотариусами', lead: 'Мосдевелопмент Право открыто к профессиональному сотрудничеству со специалистами, чьи компетенции могут усиливать работу с клиентскими обращениями и сложными правовыми задачами.' })}
<section class="wrap section--tight"><div class="section-head"><p class="eyebrow">Форматы взаимодействия</p><h2>Работаем с профильными специалистами под конкретную задачу.</h2>
  <p>Рассматриваем индивидуальные форматы сотрудничества в Москве, Московской области и других регионах.</p>
  <p>Взаимодействие может строиться вокруг отдельных клиентских обращений, профильной экспертизы, процессуального представительства, нотариального сопровождения и других профессиональных задач.</p></div>
<div class="grid">${partnership.map((p, i) => html`<div class="card reveal"><span class="eyebrow">${String(i + 1).padStart(2, '0')}</span><h3>${p.title}</h3><p>${p.text}</p></div>`)}</div></section>
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
  const text = legalTexts[key];
  return layout(ctx, {
    title: text.metaTitle,
    description: text.description,
    path: doc.path,
    body: html`${pageHead({ crumbs: [home, [doc.title, doc.path]], eyebrow: `Правовая информация · обновлено ${text.updated}`, title: doc.title, lead: text.lead })}
<section class="wrap section--tight"><div class="layout-aside">
  <article class="prose">${legacy ? legacyBody(legacy) : text.sections.map((sec) => html`<h2>${sec.heading}</h2>${(sec.paragraphs || []).map((p) => html`<p>${p}</p>`)}${sec.bullets ? html`<ul>${sec.bullets.map((b) => html`<li>${b}</li>`)}</ul>` : ''}`)}</article>
  <aside class="stack aside-sticky">
    <a class="card" href="${doc.pdf}" target="_blank" rel="noopener"><p class="eyebrow">Документ</p><h3>PDF-версия</h3><span class="link-arrow">Открыть ${icon('arrow')}</span></a>
    <a class="link-arrow" href="${key === 'privacy' ? '/consent/' : '/privacy/'}">${key === 'privacy' ? 'Согласие на обработку данных' : 'Политика конфиденциальности'} ${icon('arrow')}</a>
    <a class="link-arrow" href="/#contact">${key === 'privacy' ? 'Связаться с нами' : 'Вернуться к форме'} ${icon('arrow')}</a>
  </aside>
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
