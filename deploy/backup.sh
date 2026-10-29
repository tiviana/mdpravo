#!/bin/bash
# Резервная копия БД (консистентный снимок через VACUUM INTO) и файлов клиентов.
# cron: 15 3 * * * /opt/mdpravo/current/deploy/backup.sh
set -euo pipefail
DATA=${DATA:-/var/lib/mdpravo}
OUT=${OUT:-/var/backups/mdpravo}
KEEP_DAYS=${KEEP_DAYS:-30}
STAMP=$(date +%Y%m%d-%H%M%S)
umask 077
mkdir -p "$OUT/$STAMP"
node --disable-warning=ExperimentalWarning -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(process.argv[1]);
db.exec(\"VACUUM INTO '\" + process.argv[2].replace(/'/g, \"''\") + \"'\");
db.close();
" "$DATA/app.sqlite" "$OUT/$STAMP/app.sqlite"
tar -C "$DATA" -czf "$OUT/$STAMP/storage.tar.gz" storage
sha256sum "$OUT/$STAMP"/* > "$OUT/$STAMP/SHA256SUMS"
find "$OUT" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +
echo "backup ok: $OUT/$STAMP"
