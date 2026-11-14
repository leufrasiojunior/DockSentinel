#!/usr/bin/env bash
set -euo pipefail

mkdir -p /data

# Apply timezone if provided
if [ -n "${TZ:-}" ] && [ -f "/usr/share/zoneinfo/${TZ}" ]; then
  ln -snf "/usr/share/zoneinfo/${TZ}" /etc/localtime
  echo "${TZ}" > /etc/timezone
fi

# Ensure Prisma client is updated for the container runtime
echo "[DockSentinel-Dev] Generating Prisma Client..."
cd /app/apps/api
npx prisma generate --config=prisma.config.ts
cd /app

echo "[DockSentinel-Dev] Starting development services (API + Web HMR)..."
exec bash scripts/dev-all.sh
