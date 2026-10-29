# mdpravo.ru — сайт и личный кабинет «Мосдевелопмент Право»

Новая версия сайта юридической компании: публичная часть (все 239 адресов старого сайта сохранены), база знаний с поиском, личный кабинет клиента (дела, документы, счета, оплата через ЮKassa) и панель юриста.

- **Стек:** Node.js ≥ 22.13 без внешних зависимостей (`node:http`, `node:sqlite`, `node:crypto`, `node:test`). Серверный рендер, минимум JS.
- **Документация:** `docs/PROJECT_AUDIT.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DEPLOYMENT.md`, `docs/ROLLBACK.md`, `docs/TEST_REPORT.md`, `docs/CHANGELOG.md`, `docs/BRAND.md`, ТЗ — `docs/brief/`.

## Запуск для разработки

```bash
node --version            # ≥ 22.13
npm run seed:demo         # демо: client@demo.local / lawyer@demo.local, пароль demo-password-123
npm run dev               # http://localhost:3000, оплата в тестовом режиме
npm test                  # автотесты
BASE=http://localhost:3000 npm run test:e2e   # адаптивность (нужны Python и Playwright; сервер с демо-данными)
```

В режиме разработки без SMTP код входа показывается прямо на странице, а оплата идёт через тестовую страницу `/dev/test-pay/…` (в production она отключена).

## Структура

```
src/
  server.js, app.js        запуск и обработка запросов
  config.js                переменные окружения и проверки для production
  lib/                     http, роутер, шаблоны с экранированием, безопасность, сессии, файлы, поиск, почта
  db/                      SQLite и миграции
  repos/                   доступ к данным и проверки прав (canSeeCase)
  payments/                ЮKassa, тестовый провайдер, логика подтверждения
  routes/                  публичные страницы, вход, кабинет, панель юриста, оплата, SEO
  views/                   HTML-страницы
  content/                 тексты и адреса со старого сайта
public/                    css, js, шрифты, бренд, изображения
tools/brand, tools/icons3d генераторы логотипа и 3D-иконок
tests/                     node:test и проверка адаптивности
deploy/                    systemd, nginx, резервное копирование
```
