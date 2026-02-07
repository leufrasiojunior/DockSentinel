#!/usr/bin/env sh
set -eu

mkdir -p /data

# Apply timezone if provided (default is set in Dockerfile)
if [ -n "${TZ:-}" ] && [ -f "/usr/share/zoneinfo/${TZ}" ]; then
  ln -snf "/usr/share/zoneinfo/${TZ}" /etc/localtime
  echo "${TZ}" > /etc/timezone
fi

cd /app/apps/api
node dist/src/main.js &
api_pid=$!

term_handler() {
  kill -TERM "$api_pid" 2>/dev/null || true
}

trap term_handler TERM INT

exec nginx -g "daemon off;"
