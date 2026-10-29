# Откат

## До переключения DNS

Старый сайт продолжает работать — откатывать нечего. Новую версию можно остановить: `sudo systemctl stop mdpravo`.

## После переключения DNS: вернуть старый сайт

1. В DNS вернуть A/AAAA-записи `mdpravo.ru` на старый хостинг (TTL заранее снизить до 300 с за сутки до запуска).
2. Новые обращения, дела и платежи, созданные после переключения, остаются в новой БД. Выгрузить их для ручного переноса:
   ```bash
   sqlite3 /var/lib/mdpravo/app.sqlite -header -csv "SELECT number, name, contact, topic, created_at FROM requests WHERE created_at > '2026-11-01'" > requests.csv
   sqlite3 /var/lib/mdpravo/app.sqlite -header -csv "SELECT i.number, i.amount_kop/100.0 AS rub, i.status, p.provider_payment_id FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id" > payments.csv
   ```
   (Если `sqlite3` не установлен: `sudo apt install sqlite3`.)
3. Webhook ЮKassa перенастроить на старый адрес, если старый сайт принимал оплату.

## Откат релиза на предыдущую версию нового сайта

Каждый релиз лежит в `/opt/mdpravo/releases/<дата>`, а `current` — ссылка.

```bash
ls /opt/mdpravo/releases
sudo ln -sfn /opt/mdpravo/releases/<предыдущий> /opt/mdpravo/current
sudo systemctl restart mdpravo
```

Миграции БД только добавляют таблицы и столбцы; предыдущая версия работает с более новой схемой. Если миграция всё же несовместима, восстановите БД из копии (ниже), сделанной перед релизом.

## Восстановление из резервной копии

```bash
sudo systemctl stop mdpravo
B=/var/backups/mdpravo/<метка>
cd "$B" && sha256sum -c SHA256SUMS
sudo -u mdpravo cp /var/lib/mdpravo/app.sqlite /var/lib/mdpravo/app.sqlite.broken-$(date +%s)
sudo -u mdpravo cp "$B/app.sqlite" /var/lib/mdpravo/app.sqlite
sudo -u mdpravo rm -f /var/lib/mdpravo/app.sqlite-wal /var/lib/mdpravo/app.sqlite-shm
sudo -u mdpravo tar -C /var/lib/mdpravo -xzf "$B/storage.tar.gz"
sudo systemctl start mdpravo
```

Проверено 29.10.2026 в среде разработки: `deploy/backup.sh` создаёт копию, копия БД открывается и содержит данные. На боевом сервере проверку нужно повторить.

## Перед каждым релизом

```bash
DATA=/var/lib/mdpravo OUT=/var/backups/mdpravo /opt/mdpravo/current/deploy/backup.sh
```
