// Умный поиск: SQLite FTS5 по статьям, шаблонам, услугам, срочным ситуациям и темам.
import { articles, downloads, topics, urgent } from '../content/knowledge.js';
import { directions } from '../content/services.js';
import * as db from '../db/index.js';
import { escape } from './html.js';
import { ftsQuery, stem } from './ru.js';
import { htmlToText } from './sanitize.js';

const KIND = { article: 'Статья', download: 'Образец документа', service: 'Услуга', direction: 'Направление', urgent: 'Срочно', topic: 'Тема' };

/** Пересобирает индекс из контента и импортированных полных текстов. */
export function rebuildIndex() {
  const legacy = new Map(db.all('SELECT path, html FROM legacy_content').map((r) => [r.path, htmlToText(r.html)]));
  const rows = [];
  for (const a of articles) rows.push([a.path, 'article', a.title, `${a.description} ${legacy.get(a.path) || ''}`]);
  for (const d of downloads) rows.push([d.path, 'download', d.title, `${d.description} образец шаблон ${legacy.get(d.path) || ''}`]);
  for (const u of urgent) rows.push([u.path, 'urgent', u.title, `${u.description} ${legacy.get(u.path) || ''}`]);
  for (const t of topics) rows.push([t.path, 'topic', t.title, t.description]);
  for (const d of directions) {
    rows.push([d.path, 'direction', d.title, `${d.description} ${d.short}`]);
    for (const t of d.tasks) rows.push([t.path, 'service', t.title, `${t.description} ${d.title}`]);
  }
  db.tx(() => {
    db.run('DELETE FROM search_index');
    for (const r of rows) db.run('INSERT INTO search_index (path, kind, title, body) VALUES (?, ?, ?, ?)', ...r);
  });
  return rows.length;
}

function snippet(text, words, len = 180) {
  const lower = text.toLowerCase().replace(/ё/g, 'е');
  let pos = -1;
  for (const w of words) {
    pos = lower.indexOf(w);
    if (pos >= 0) break;
  }
  const start = Math.max(0, pos - 50);
  let s = text.slice(start, start + len);
  if (start > 0) s = '…' + s;
  if (start + len < text.length) s += '…';
  let out = escape(s);
  for (const w of words) {
    if (w.length < 3) continue;
    out = out.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[а-яёa-z]*)`, 'gi'), '<mark class="hl">$1</mark>');
  }
  return out;
}

export function search(q, limit = 30) {
  const match = ftsQuery(q);
  if (!match) return [];
  let rows;
  try {
    rows = db.all(
      `SELECT path, kind, title, body, bm25(search_index, 0, 0, 6.0, 1.0) AS score
         FROM search_index WHERE search_index MATCH ? ORDER BY score LIMIT ?`,
      match, limit,
    );
    // если все слова вместе не нашлись — ищем любое из них
    if (!rows.length) {
      rows = db.all(
        `SELECT path, kind, title, body, bm25(search_index, 0, 0, 6.0, 1.0) AS score
           FROM search_index WHERE search_index MATCH ? ORDER BY score LIMIT ?`,
        match.replace(/ AND /g, ' OR '), limit,
      );
    }
  } catch {
    return [];
  }
  const words = String(q).toLowerCase().replace(/ё/g, 'е').split(/[^0-9a-zа-я]+/i).filter((w) => w.length >= 2).map(stem);
  return rows.map((r) => ({ path: r.path, kind: r.kind, kindLabel: KIND[r.kind] || '', title: r.title, snippet: snippet(r.body, words) }));
}
