#!/bin/bash
# Запуск служебных команд с переменными из /etc/mdpravo/env от имени пользователя mdpravo:
#   sudo /opt/mdpravo/current/deploy/cli.sh migrate
#   sudo MDP_PASSWORD=... /opt/mdpravo/current/deploy/cli.sh create-user anna@mdpravo.ru lawyer "Имя"
set -euo pipefail
ENV_FILE=${ENV_FILE:-/etc/mdpravo/env}
cd "$(dirname "$0")/.."
exec sudo -u mdpravo --preserve-env=MDP_PASSWORD bash -c 'set -a; . "$0"; set +a; exec node --disable-warning=ExperimentalWarning src/cli.js "$@"' "$ENV_FILE" "$@"
