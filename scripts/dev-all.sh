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

sleep 10

npm run dev --workspace docksentinel-web &
WEB_PID=$!

wait -n "$API_PID" "$WEB_PID"
