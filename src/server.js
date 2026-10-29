// Точка входа: миграции, индекс поиска, HTTP-сервер, корректная остановка.
import http from 'node:http';
import { createApp } from './app.js';
import { config, configProblems } from './config.js';
import * as db from './db/index.js';
import { log } from './lib/log.js';
import { rebuildIndex } from './lib/search.js';

const problems = configProblems();
if (problems.length) {
  for (const p of problems) log.error(`Конфигурация: ${p}`);
  process.exit(1);
}

db.open();
const applied = db.migrate();
if (applied.length) log.info('Применены миграции', { applied: applied.join(',') });
log.info('Поисковый индекс обновлён', { docs: rebuildIndex() });

const { handle } = createApp();
const server = http.createServer({ requestTimeout: 120_000, headersTimeout: 30_000 }, handle);
server.keepAliveTimeout = 10_000;
server.listen(config.port, config.host, () => {
  log.info(`Сервер запущен: ${config.baseUrl} (слушает ${config.host}:${config.port}, режим ${config.env}, оплата: ${config.payments.provider})`);
});

function shutdown(sig) {
  log.info(`Остановка по ${sig}`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
