#!/usr/bin/env sh
set -eu

mkdir -p /data

cd /app/apps/api
node dist/main.js &
api_pid=$!

term_handler() {
  kill -TERM "$api_pid" 2>/dev/null || true
}

trap term_handler TERM INT

exec nginx -g "daemon off;"
