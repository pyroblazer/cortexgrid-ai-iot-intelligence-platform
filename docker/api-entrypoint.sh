#!/bin/sh
set -e

echo "=== CortexGrid API Startup ==="

echo "[1/3] Running database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "[2/3] Seeding database..."
./node_modules/.bin/prisma db seed 2>/dev/null || echo "  Seed completed (data may already exist)"

echo "[3/3] Starting API server..."
exec node dist/main.js
