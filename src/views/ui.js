// Общий каркас страниц: <head>, шапка, подвал, иконки и мелкие компоненты.
import { config } from '../config.js';
import { company } from '../content/company.js';
import { html, jsonScript, raw } from '../lib/html.js';
import { csrfToken } from '../lib/security.js';

const ICON_PATHS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.5"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z"/>',
  folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 1.7-2.5 2-2.5 3.5M12 17v.5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  logout: '<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  telegram: '<path d="M21 4L3 11l6 2 2 6 3-4 5 4z"/><path d="M9 13l8-6"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1z"/><path d="M9 9c0 3 2 5 5 6l1.5-1.5L14 12l-1 1c-1-.5-1.5-1-2-2l1-1-1.5-1.5z"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};

export function icon(name, cls = '') {
  const p = ICON_PATHS[name] || '';
  return raw(
    `<svg ${cls ? `class="${cls}" ` : ''}viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`,
  );
}

export function csrfField(ctx) {
  return html`<input type="hidden" name="_csrf" value="${csrfToken(ctx)}">`;
}

export function alert(kind, text) {
  const ic = { success: 'check', error: 'alert', warning: 'alert', info: 'info' }[kind] || 'info';
  return html`<div class="alert alert--${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${icon(ic)}<div>${text}</div></div>`;
}

export function crumbs(items) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: config.baseUrl + path })),
  };
  return html`<nav class="crumbs" aria-label="Хлебные крошки">${items.map(([name, path], i) =>
    i < items.length - 1
      ? html`<a href="${path}">${name}</a><span aria-hidden="true">/</span>`
      : html`<span aria-current="page">${name}</span>`,
  )}</nav><script type="application/ld+json">${jsonScript(ld)}</script>`;
}

export function statusPill(tone, label) {
  return html`<span class="status status--${tone}">${label}</span>`;
}

const NAV = [
  ['/directions/', 'Услуги'],
  ['/urgent/', 'Срочно'],
  ['/knowledge/', 'База знаний'],
  ['/prices/', 'Цены'],
  ['/about/', 'О нас'],
  ['/contacts/', 'Контакты'],
];

const ORG_LD = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LegalService'],
  '@id': `${config.baseUrl}/#organization`,
  name: company.name,
  url: `${config.baseUrl}/`,
  logo: `${config.baseUrl}/brand/logo-horizontal.png`,
  image: `${config.baseUrl}/brand/social-preview.jpg`,
  telephone: company.phones[1].tel,
  email: company.email,
  address: { '@type': 'PostalAddress', streetAddress: 'ул. Большая Садовая, д. 3, стр. 7', addressLocality: 'Москва', addressCountry: 'RU' },
  identifier: [
    { '@type': 'PropertyValue', propertyID: 'ИНН', value: company.inn },
    { '@type': 'PropertyValue', propertyID: 'ОГРН', value: company.ogrn },
  ],
  areaServed: { '@type': 'Country', name: 'Россия' },
  slogan: company.slogan,
};

/**
 * @param {object} o
 * @param {string} o.title       <title>
 * @param {string} o.description meta description
 * @param {string} o.path        канонический путь
 * @param {boolean} [o.noindex]
 * @param {object[]} [o.jsonld]
 * @param {*} o.body
 */
export function layout(ctx, o) {
  const canonical = config.baseUrl + (o.path || ctx.path);
  const robots = o.noindex ? 'noindex, nofollow' : 'index, follow';
  const user = ctx.user;
  const unread = ctx.state.unread || 0;
  const active = (href) => (ctx.path === href || (href !== '/' && ctx.path.startsWith(href)) ? raw('aria-current="page"') : '');
  const metrika = config.metrikaId && !o.noindex ? html`<script src="/js/metrika.js" data-id="${config.metrikaId}" defer></script>` : '';
  return html`<!doctype html>
<html lang="ru" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${o.title}</title>
<meta name="description" content="${o.description || ''}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#2A0E16">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="${company.name}">
<meta property="og:title" content="${o.ogTitle || o.title}">
<meta property="og:description" content="${o.description || ''}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${config.baseUrl}/brand/social-preview.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/fonts/onest.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/fonts/unbounded.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/css/tokens.css?v=${ASSET_V}">
<link rel="stylesheet" href="/css/app.css?v=${ASSET_V}">
<link rel="stylesheet" href="/css/scene.css?v=${ASSET_V}">
<script src="/js/app.js?v=${ASSET_V}" defer></script>
${(o.scripts || []).map((src) => html`<script src="${src}?v=${ASSET_V}" defer></script>`)}
${metrika}
${o.home ? html`<script type="application/ld+json">${jsonScript(ORG_LD)}</script>` : ''}
${(o.jsonld || []).map((j) => html`<script type="application/ld+json">${jsonScript(j)}</script>`)}
</head>
<body>
<a class="skip" href="#main">К содержанию</a>
<header class="site-header site-header--scene" data-header>
  <div class="wrap header-row">
    <a class="logo" href="/" aria-label="${company.name} — на главную"><img class="logo-dark" src="/brand/logo-horizontal.svg" width="240" height="40" alt="${company.name}"><img class="logo-light" src="/brand/logo-horizontal-inverse.svg" width="240" height="40" alt="" aria-hidden="true"></a>
    <nav class="nav" aria-label="Основное меню">
      ${NAV.map(([href, label]) => html`<a href="${href}" ${active(href)}>${label}</a>`)}
    </nav>
    <div class="header-actions">
      <a class="icon-btn header-search" href="/knowledge/search/" aria-label="Поиск">${icon('search')}</a>
      <a class="icon-btn" href="${user ? (isStaffUser(user) ? '/staff/' : '/cabinet/') : '/login/'}" aria-label="${user ? 'Личный кабинет' : 'Войти в личный кабинет'}">${icon('user')}${unread ? html`<span class="dot" aria-hidden="true"></span>` : ''}</a>
      <a class="btn btn--primary btn--sm header-cta" href="/#contact">Получить консультацию</a>
      <details class="menu">
        <summary class="icon-btn" aria-label="Меню">${icon('menu', 'i-menu')}${icon('close', 'i-close')}</summary>
        <div class="menu-panel">
          <nav class="menu-links" aria-label="Мобильное меню">
            ${NAV.map(([href, label]) => html`<a href="${href}">${label}${icon('arrow')}</a>`)}
            <a href="/process/">Как мы работаем${icon('arrow')}</a>
            <a href="/knowledge/search/">Поиск${icon('search')}</a>
            <a href="${user ? '/cabinet/' : '/login/'}">${user ? 'Личный кабинет' : 'Войти'}${icon('arrow')}</a>
          </nav>
          <a class="btn btn--primary" href="/#contact">Получить консультацию</a>
          <div class="menu-contacts">
            ${company.phones.map((p) => html`<a href="tel:${p.tel}">${p.display}</a>`)}
            <a href="mailto:${company.email}">${company.email}</a>
          </div>
        </div>
      </details>
    </div>
  </div>
</header>
<main id="main">
${o.body}
</main>
${footer()}
</body>
</html>`;
}

function isStaffUser(u) {
  return u.role === 'lawyer' || u.role === 'admin';
}

// версия статики для сброса кэша; меняется при каждом запуске процесса
export const ASSET_V = process.env.ASSET_VERSION || Date.now().toString(36);

function footer() {
  return html`<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="stack">
        <img src="/brand/logo-horizontal-inverse.svg" width="240" height="40" alt="${company.name}" style="height:40px;width:auto">
        <p class="muted" style="max-width:36ch">${company.slogan}</p>
        <div class="req">
          <span>${company.legalName}</span>
          <span>ИНН ${company.inn} · ОГРН ${company.ogrn}</span>
        </div>
      </div>
      <div>
        <h4>Услуги</h4>
        <ul>
          <li><a href="/services/criminal-law/">Уголовно-правовые вопросы</a></li>
          <li><a href="/services/public-authorities/">Споры с госорганами</a></li>
          <li><a href="/services/debt-collection/">Взыскание долгов</a></li>
          <li><a href="/services/labor-law/">Трудовое право</a></li>
          <li><a href="/directions/">Все направления</a></li>
        </ul>
      </div>
      <div>
        <h4>Компания</h4>
        <ul>
          <li><a href="/about/">О компании</a></li>
          <li><a href="/process/">Как мы работаем</a></li>
          <li><a href="/prices/">Стоимость</a></li>
          <li><a href="/faq/">Вопросы и ответы</a></li>
          <li><a href="/partnership/">Сотрудничество</a></li>
          <li><a href="/knowledge/">База знаний</a></li>
        </ul>
      </div>
      <div>
        <h4>Контакты</h4>
        <ul>
          ${company.phones.map((p) => html`<li><a href="tel:${p.tel}">${p.display}</a></li>`)}
          <li><a href="mailto:${company.email}">${company.email}</a></li>
          <li><a href="${company.mapUrl}" rel="noopener" target="_blank">${company.address}</a></li>
          <li>${company.messengers.map((m, i) => html`${i ? ' · ' : ''}<a href="${m.url}" rel="noopener" target="_blank">${m.name}</a>`)}</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} ${company.name}</span>
      <span>${company.legalDocs.map((d, i) => html`${i ? ' · ' : ''}<a href="${d.path}">${d.title}</a>`)}</span>
    </div>
  </div>
</footer>`;
}

export function pageHead({ crumbs: c, eyebrow, title, lead, art, scene = true }) {
  const inner = html`<div class="wrap ${art ? 'page-head--art' : ''}">
  <div>
    ${c ? crumbs(c) : ''}
    ${eyebrow ? html`<p class="eyebrow fade-up" style="--d:.05s">${eyebrow}</p>` : ''}
    <h1 data-split ${eyebrow ? raw('style="margin-top:14px"') : ''}>${title}</h1>
    ${lead ? html`<p class="lead fade-up" style="--d:.45s">${lead}</p>` : ''}
  </div>
  ${art ? html`<img src="${art}" alt="" width="220" height="220" loading="eager" data-parallax="0.06">` : ''}
</div>`;
  if (!scene) return html`<section class="page-head">${inner}</section>`;
  return html`<section class="scene page-head page-head--scene"><span class="scene-glow scene-glow--gold" aria-hidden="true"></span>${inner}</section>`;
}
