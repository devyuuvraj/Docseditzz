#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[deploy] Running Prisma migrations…"
  npx prisma migrate deploy
else
  echo "[deploy] DATABASE_URL is not set — skipping migrations (app will fail to connect)."
fi

echo "[deploy] Starting API…"
exec node src/server.js
