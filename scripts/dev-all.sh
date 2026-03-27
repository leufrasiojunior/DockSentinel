#!/usr/bin/env bash -X
set -euo pipefail

cleanup() {
  local code=$?
  trap - INT TERM EXIT
  if [[ -n "${API_PID:-}" ]]; then kill "$API_PID" 2>/dev/null || true; fi
  if [[ -n "${WEB_PID:-}" ]]; then kill "$WEB_PID" 2>/dev/null || true; fi
  wait 2>/dev/null || true
  exit "$code"
}

trap cleanup INT TERM EXIT

npm run start:dev --workspace api &
API_PID=$!

API_PORT="${PORT:-}"
if [[ -z "$API_PORT" && -f "apps/api/.env" ]]; then
  API_PORT="$(grep -E '^PORT=' apps/api/.env | tail -n 1 | cut -d'=' -f2- | tr -d '"'\''[:space:]')"
fi
API_PORT="${API_PORT:-3000}"
API_TARGET="${API_PROXY_TARGET:-http://127.0.0.1:${API_PORT}}"

for _ in $(seq 1 60); do
  if curl -fsS "${API_TARGET}/health" >/dev/null 2>&1; then
    break
  fi

  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API process exited before becoming ready."
    wait "$API_PID"
  fi

  sleep 1
done

if ! curl -fsS "${API_TARGET}/health" >/dev/null 2>&1; then
  echo "API did not become ready at ${API_TARGET}/health"
  exit 1
fi

npm run dev --workspace docksentinel-web &
WEB_PID=$!

wait -n "$API_PID" "$WEB_PID"
