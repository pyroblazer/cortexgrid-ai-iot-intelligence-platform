#!/bin/sh
set -e

echo "=== CortexGrid ==="
echo "Cleaning up previous containers..."
docker compose down --remove-orphans 2>/dev/null || true

echo "Building and starting all services..."
exec docker compose up --build "$@"
