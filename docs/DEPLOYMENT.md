# Развёртывание

Новый сайт ставится **рядом** со старым и не трогает его. DNS переключается только после проверки по чек-листу в конце документа.

## Требования

- Linux-сервер (Ubuntu 22.04+/Debian 12), 1 vCPU, 1 ГБ RAM, 10 ГБ диска.
- **Node.js ≥ 22.13** (нужен встроенный `node:sqlite`). Внешних npm-пакетов нет, `npm install` не требуется.
- nginx и certbot (TLS).
- Сервер в РФ, если этого требует политика компании по локализации персональных данных (см. раздел «Персональные данные»).

## 1. Пользователь, папки, код

```bash
sudo useradd --system --home /var/lib/mdpravo --shell /usr/sbin/nologin mdpravo
sudo mkdir -p /opt/mdpravo/releases /var/lib/mdpravo/storage /etc/mdpravo /var/backups/mdpravo
sudo chown -R mdpravo:mdpravo /var/lib/mdpravo /var/backups/mdpravo
sudo chmod 700 /var/lib/mdpravo /var/lib/mdpravo/storage

REL=/opt/mdpravo/releases/$(date +%Y%m%d-%H%M)
sudo git clone --depth 1 https://github.com/tiviana/mdpravo "$REL"
sudo ln -sfn "$REL" /opt/mdpravo/current
```

## 2. Переменные окружения

```bash
sudo cp /opt/mdpravo/current/.env.example /etc/mdpravo/env
sudo chmod 600 /etc/mdpravo/env && sudo chown mdpravo:mdpravo /etc/mdpravo/env
sudo nano /etc/mdpravo/env
```

| Переменная | Обязательна | Что указать |
|---|---|---|
| `NODE_ENV` | да | `production` |
| `BASE_URL` | да | `https://mdpravo.ru` — по нему проверяется источник форм (CSRF) |
| `SECRET_KEY` | да | `openssl rand -base64 48` |
| `TRUST_PROXY` | да за nginx | `1` |
| `DB_PATH`, `STORAGE_DIR` | да | `/var/lib/mdpravo/app.sqlite`, `/var/lib/mdpravo/storage` |
| `SMTP_*` | да | ящик для кодов входа; без него клиенты не смогут войти по коду |
| `REQUESTS_NOTIFY_EMAIL` | желательно | кому уведомлять о новых обращениях |
| `PAYMENT_PROVIDER` | да | `yookassa` |
| `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` | да | из личного кабинета ЮKassa |
| `YOOKASSA_WEBHOOK_IPS` | желательно | актуальные диапазоны IP уведомлений из документации ЮKassa |
| `YOOKASSA_RECEIPTS`, `YOOKASSA_VAT_CODE` | если нужны чеки | по настройкам онлайн-кассы |
| `YANDEX_METRIKA_ID` | нет | номер счётчика (на старом сайте был `113573051` — подтвердить) |

Сервер **не запустится** в production, если не задан `SECRET_KEY`, `BASE_URL` не https, выбрана тестовая оплата или нет ключей ЮKassa.

## 3. База, сотрудники, контент

```bash
sudo /opt/mdpravo/current/deploy/cli.sh migrate
# сотрудник (пароль вводится скрыто и не попадает в историю команд)
read -s -p "Пароль: " MDP_PASSWORD && export MDP_PASSWORD
sudo --preserve-env=MDP_PASSWORD /opt/mdpravo/current/deploy/cli.sh create-user anna@mdpravo.ru lawyer "Скобелева Анна Александровна"
unset MDP_PASSWORD
# проверка, что все адреса старого сайта на месте
sudo /opt/mdpravo/current/deploy/cli.sh check-content
```

Значения в `/etc/mdpravo/env` с пробелами берите в двойные кавычки (как `SMTP_FROM` в примере) — так файл читают и systemd, и `deploy/cli.sh`.

### Тексты и файлы старого сайта

Уже в репозитории (перенесены 29.10.2026 из исходников старого сайта): полные тексты в `src/content/data/*.json`, файлы шаблонов в `public/downloads/`, PDF правовых документов в `public/documents/`. Повторить перенос из новой версии исходников:

```bash
cd tools/import-old-site
OLD_ROOT=/путь/к/mdpravo-site-main node --experimental-strip-types --import ./register.mjs extract.mjs
```

Команда `import-legacy` остаётся для точечной замены текста страницы HTML-версией (имеет приоритет над JSON).

## 4. Сервис, nginx, TLS

```bash
sudo cp /opt/mdpravo/current/deploy/mdpravo.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now mdpravo
sudo journalctl -u mdpravo -n 20
sudo cp /opt/mdpravo/current/deploy/nginx.conf /etc/nginx/sites-available/mdpravo.ru
sudo ln -s /etc/nginx/sites-available/mdpravo.ru /etc/nginx/sites-enabled/
sudo certbot certonly --nginx -d mdpravo.ru -d www.mdpravo.ru
sudo nginx -t && sudo systemctl reload nginx
```

## 5. ЮKassa

1. В личном кабинете ЮKassa → Интеграция → HTTP-уведомления: адрес `https://mdpravo.ru/payments/yookassa/webhook/`, события `payment.succeeded`, `payment.canceled`, `payment.waiting_for_capture`, `refund.succeeded`.
2. Сначала подключить **тестовый магазин** ЮKassa (ключи `test_...`), пройти чек-лист оплаты, затем заменить ключи на боевые.
3. Статус оплаты подтверждается запросом `GET /v3/payments/{id}` с ключами магазина; тело уведомления не считается доказательством оплаты.

## 6. Резервное копирование

```bash
sudo crontab -u mdpravo -e
# 15 3 * * * DATA=/var/lib/mdpravo OUT=/var/backups/mdpravo /opt/mdpravo/current/deploy/backup.sh
```

Копии нужно регулярно выносить за пределы сервера (например, в объектное хранилище) — это решение компании. Проверка восстановления — в `docs/ROLLBACK.md`.

## Персональные данные — подтвердить ответственным лицам компании

Команда разработки не даёт юридических гарантий. Перед запуском специалисты компании должны подтвердить:

- место хранения БД и файлов клиентов (требование о локализации баз данных граждан РФ, ст. 18 ч. 5 152-ФЗ);
- уведомление Роскомнадзора об обработке персональных данных;
- актуальность текстов `/privacy/` и `/consent/`: перенесены дословно со старого сайта и упоминают возможности, которых в новой версии нет (вход через Яндекс ID и по SMS, гостевые закладки и черновики в браузере, аналитика внутреннего поиска) — текст нужно привести в соответствие с новой версией;
- сроки хранения документов клиентов (удаление в системе — «мягкое», файлы остаются до решения о сроках);
- кто из сотрудников получает доступ к панели юриста; роли выдаются командой `create-user`;
- договор с ЮKassa и необходимость чеков 54-ФЗ.

## Чек-лист перед переключением DNS

- [ ] `npm test` — все тесты зелёные на сервере.
- [ ] `node src/cli.js check-content` — отсутствующих адресов 0.
- [ ] Вход сотрудника, создание дела из обращения, выставление счёта.
- [ ] Тестовая оплата в тестовом магазине ЮKassa: успех, отмена, повторное уведомление.
- [ ] Письмо с кодом входа приходит (проверить «Спам»).
- [ ] Резервная копия создаётся и восстанавливается.
- [ ] Компания проверила перенесённые тексты (особенно `/privacy/` — см. ниже).
- [ ] Яндекс Вебмастер: sitemap, проверка 301 для адресов без слеша.
