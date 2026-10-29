// Служебные команды:
//   node src/cli.js migrate
//   node src/cli.js create-user <email> <role: client|lawyer|admin> [имя]   — пароль читается из MDP_PASSWORD
//   node src/cli.js seed-demo        — демо-данные (только вне production)
//   node src/cli.js check-content    — проверка, что все адреса старого sitemap обслуживаются
//   node src/cli.js import-legacy <file.json> — импорт полных текстов старого сайта
import fs from 'node:fs';
import { config } from './config.js';
import * as db from './db/index.js';
import { hashPassword, passwordProblem } from './lib/password.js';
import { sanitizeHtml } from './lib/sanitize.js';
import { rebuildIndex } from './lib/search.js';
import { cases, documents, invoices, requests, users } from './repos/index.js';
import { sitemapPaths } from './routes/seo.js';

const [, , cmd, ...args] = process.argv;
db.open();
db.migrate();

async function main() {
  switch (cmd) {
    case 'migrate':
      console.log('Миграции применены');
      return;
    case 'create-user': {
      const [email, role = 'client', ...name] = args;
      if (!email || !['client', 'lawyer', 'admin'].includes(role)) throw new Error('usage: create-user <email> <client|lawyer|admin> [имя]');
      const pw = process.env.MDP_PASSWORD || '';
      const problem = passwordProblem(pw);
      if (problem) throw new Error(`MDP_PASSWORD: ${problem}`);
      const existing = users.byEmail(email.toLowerCase());
      if (existing) {
        users.setRole(existing.id, role);
        users.setPassword(existing.id, await hashPassword(pw));
        users.verifyEmail(existing.id);
        console.log(`Обновлён пользователь #${existing.id} (${role})`);
      } else {
        const u = users.create({ email: email.toLowerCase(), role, name: name.join(' '), passwordHash: await hashPassword(pw), emailVerified: true });
        console.log(`Создан пользователь #${u.id} (${role})`);
      }
      return;
    }
    case 'seed-demo': {
      if (config.isProd) throw new Error('Демо-данные в production запрещены');
      const pw = await hashPassword('demo-password-123');
      const lawyer = users.byEmail('lawyer@demo.local') || users.create({ email: 'lawyer@demo.local', role: 'lawyer', name: 'Демо-юрист', passwordHash: pw, emailVerified: true });
      const client = users.byEmail('client@demo.local') || users.create({ email: 'client@demo.local', role: 'client', name: 'Демо-клиент', passwordHash: pw, emailVerified: true });
      const other = users.byEmail('other@demo.local') || users.create({ email: 'other@demo.local', role: 'client', name: 'Другой клиент', passwordHash: pw, emailVerified: true });
      if (!cases.forClient(client.id).length) {
        const req = requests.create({ userId: client.id, name: client.name, contact: client.email, email: client.email, topic: 'debt-collection', message: 'ДЕМО. Не возвращают долг по расписке, срок возврата прошёл два месяца назад.', sourcePath: '/' });
        const c = cases.create({ clientId: client.id, title: 'ДЕМО: взыскание долга по расписке', lawyerId: lawyer.id, requestId: req.id, authorId: lawyer.id });
        cases.addEvent(c.id, lawyer.id, 'message', 'Здравствуйте! Пришлите, пожалуйста, фото расписки и переписку с должником.');
        cases.setStatus(cases.byId(c.id), 'need_docs', lawyer.id, 'нужна расписка');
        cases.update(c.id, { title: c.title, nextStep: 'Загрузить фото расписки', deadlineAt: new Date(Date.now() + 5 * 86400_000).toISOString(), lawyerId: lawyer.id });
        invoices.create({ caseRow: cases.byId(c.id), amountKop: 1_000_000, description: 'ДЕМО: подготовка претензии и расчёта долга', createdBy: lawyer.id });
        cases.create({ clientId: other.id, title: 'ДЕМО: чужое дело (для проверки прав)', lawyerId: lawyer.id, authorId: lawyer.id });
      }
      console.log('Демо-данные готовы. Вход: client@demo.local / lawyer@demo.local, пароль demo-password-123');
      void documents;
      return;
    }
    case 'check-content': {
      const legacy = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/legacy-sitemap.json', import.meta.url), 'utf8'));
      const have = new Set(sitemapPaths());
      const missing = legacy.filter((p) => !have.has(p));
      console.log(`Старый sitemap: ${legacy.length}, новый: ${have.size}, отсутствуют: ${missing.length}`);
      for (const m of missing) console.log('  нет:', m);
      if (missing.length) process.exitCode = 1;
      return;
    }
    case 'import-legacy': {
      // формат: [{ "path": "/knowledge/slug/", "title": "...", "html": "..." }]
      const file = args[0];
      if (!file) throw new Error('usage: import-legacy <file.json>');
      const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
      const allowed = new Set(sitemapPaths());
      let n = 0;
      db.tx(() => {
        for (const r of rows) {
          const path = String(r.path || '').replace(/\/?$/, '/');
          if (!allowed.has(path) || typeof r.html !== 'string') continue;
          const html = sanitizeHtml(r.html).slice(0, 400_000);
          db.run(
            `INSERT INTO legacy_content (path, title, html, imported_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(path) DO UPDATE SET title = excluded.title, html = excluded.html, imported_at = excluded.imported_at`,
            path, String(r.title || '').slice(0, 300), html, db.now(),
          );
          n++;
        }
      });
      console.log(`Импортировано страниц: ${n}; индекс поиска: ${rebuildIndex()}`);
      return;
    }
    default:
      console.log('Команды: migrate | create-user | seed-demo | check-content | import-legacy');
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
}).finally(() => db.close());
