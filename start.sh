#!/bin/bash
# ─────────────────────────────────────────────
#  Jinnah Legal — Production startup
# ─────────────────────────────────────────────
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🏛️  Jinnah Legal Platform"
echo ""

# Backend .env
if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo "✅  Created backend/.env"
fi

# Frontend .env
if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "✅  Created .env"
fi

# Install deps
echo "📦  Installing dependencies..."
cd "$ROOT/backend" && npm install --silent 2>/dev/null || npm install
cd "$ROOT" && npm install --silent 2>/dev/null || npm install

echo ""
echo "🚀  Starting servers..."

# Kill anything on 3001/5173
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

# Backend
cd "$ROOT/backend"
NODE_ENV=${NODE_ENV:-development} node src/index.js &
BACKEND_PID=$!

sleep 3

# Frontend
cd "$ROOT"
npm run dev &
FRONT_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Backend  → http://localhost:3001"
echo " Frontend → http://localhost:5173"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONT_PID 2>/dev/null; exit 0" INT
wait $BACKEND_PID $FRONT_PID
