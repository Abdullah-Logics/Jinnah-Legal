#!/usr/bin/env bash
set -e

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
LOG_DIR="/tmp/jinnah-legal"
mkdir -p "$LOG_DIR"

echo "========================================"
echo " Jinnah Legal Backend + Tunnel Starter"
echo "========================================"

# Kill existing processes
pkill -f "node.*backend/src/index.js" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 2

# Start backend
echo "1/3 Starting backend on :3001..."
cd "$BACKEND_DIR"
nohup node src/index.js > "$LOG_DIR/backend.log" 2>&1 &
sleep 3
if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
  echo "   ✓ Backend running"
else
  echo "   ✗ Backend failed to start - check $LOG_DIR/backend.log"
  exit 1
fi

# Start tunnel
echo "2/3 Creating Cloudflare tunnel..."
nohup cloudflared tunnel --url http://127.0.0.1:3001 > "$LOG_DIR/tunnel.log" 2>&1 &
sleep 10
TUNNEL_URL=$(grep -oP 'https://[a-z-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" | head -1)

if [ -n "$TUNNEL_URL" ]; then
  echo "   ✓ Tunnel URL: $TUNNEL_URL"
else
  echo "   ✗ Tunnel failed - check $LOG_DIR/tunnel.log"
  exit 1
fi

echo "3/3 Updating tunnel URL..."
echo "   Run: echo \"\$TUNNEL_URL\" | vercel env rm VITE_API_URL production"
echo "   Run: echo \"\$TUNNEL_URL\" | vercel env add VITE_API_URL production"
echo "   Then: git add -A && git commit -m \"update tunnel url\" && git push"

echo ""
echo "========================================"
echo "    ✅  All running!"
echo "    🖥️   Backend   : http://localhost:3001"
echo "    🌐  Tunnel    : $TUNNEL_URL"
echo "    🗄️   Database  : $BACKEND_DIR/data/jinnah_legal.db"
echo "========================================"
echo ""
echo "Logs:"
echo "  Backend : tail -f $LOG_DIR/backend.log"
echo "  Tunnel  : tail -f $LOG_DIR/tunnel.log"
echo ""
echo "To stop: pkill -f \"node.*backend/src/index.js\" && pkill -f \"cloudflared tunnel\""
