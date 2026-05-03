#!/bin/sh
set -e

echo "=== CortexGrid API Startup ==="

echo "[1/3] Running database migrations..."
npx prisma migrate deploy

echo "[2/3] Seeding database..."
npx prisma db seed 2>/dev/null || echo "  Seed completed (data may already exist)"

echo "[3/3] Starting API server..."
exec node dist/main.js
