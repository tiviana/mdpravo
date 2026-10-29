// sitemap.xml, robots.txt, манифест PWA.
import { config } from '../config.js';
import { team } from '../content/company.js';
import { articles, downloads, knowledgeSections, topics, urgent } from '../content/knowledge.js';
import { directions } from '../content/services.js';
import { escape } from '../lib/html.js';

export function sitemapPaths() {
  const p = [
    '/', '/about/', '/process/', '/directions/', '/prices/', '/faq/', '/contacts/', '/partnership/', '/partnership/contact/',
    '/knowledge/', '/knowledge/topics/', '/urgent/', '/privacy/', '/consent/', '/knowledge/downloads/',
    ...Object.values(knowledgeSections).map((s) => s.path),
    ...team.map((m) => `/team/${m.slug}/`),
    ...directions.flatMap((d) => [d.path, ...d.tasks.map((t) => t.path)]),
    ...urgent.map((u) => u.path),
    ...topics.map((t) => t.path),
    ...articles.map((a) => a.path),
    ...downloads.map((d) => d.path),
  ];
  return [...new Set(p)];
}

const LASTMOD = '2026-10-29';

export function registerSeo(r) {
  r.get('/sitemap.xml', (ctx) => {
    const urls = sitemapPaths()
      .map((p) => `<url><loc>${escape(config.baseUrl + p)}</loc><lastmod>${LASTMOD}</lastmod></url>`)
      .join('');
    ctx.text(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`, 200, 'application/xml; charset=utf-8', { 'Cache-Control': 'public, max-age=3600' });
  });
  r.get('/robots.txt', (ctx) => {
    const body = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /cabinet/',
      'Disallow: /staff/',
      'Disallow: /login/',
      'Disallow: /register/',
      'Disallow: /request/',
      'Disallow: /payments/',
      'Disallow: /knowledge/search/?',
      '',
      `Sitemap: ${config.baseUrl}/sitemap.xml`,
      '',
    ].join('\n');
    ctx.text(body, 200, 'text/plain; charset=utf-8', { 'Cache-Control': 'public, max-age=3600' });
  });
  r.get('/manifest.webmanifest', (ctx) => {
    ctx.text(JSON.stringify({
      name: 'Мосдевелопмент Право',
      short_name: 'МД Право',
      lang: 'ru',
      start_url: '/',
      display: 'standalone',
      background_color: '#F8F3EE',
      theme_color: '#2A0E16',
      icons: [
        { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }), 200, 'application/manifest+json', { 'Cache-Control': 'public, max-age=86400' });
  });
  r.get('/favicon.ico', (ctx) => ctx.redirect('/brand/favicon.ico', 301));
}
