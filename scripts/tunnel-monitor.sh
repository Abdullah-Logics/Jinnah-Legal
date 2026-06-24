#!/usr/bin/env bash
set -e
PROJECT_DIR="$HOME/Downloads/jinnah-legal-fullstack/ai-lawyer"
LOG_DIR="/tmp/jinnah-legal"
PREV_URL_FILE="$LOG_DIR/tunnel-url.txt"
TUNNEL_LOG="$LOG_DIR/tunnel.log"
VERCEL_TOKEN_FILE="$PROJECT_DIR/.vercel-token"

mkdir -p "$LOG_DIR"

if [ ! -f "$VERCEL_TOKEN_FILE" ]; then
  echo "NO_TOKEN" > "$VERCEL_TOKEN_FILE"
fi

VERCEL_TOKEN=$(cat "$VERCEL_TOKEN_FILE")

extract_url() {
  grep -o 'https://[a-z0-9]*\.lhr\.life' "$TUNNEL_LOG" 2>/dev/null | head -1
}

NEW_URL=$(extract_url)

if [ -z "$NEW_URL" ]; then
  echo "[monitor] No tunnel URL found in log" >> "$LOG_DIR/monitor.log"
  exit 1
fi

OLD_URL=""
[ -f "$PREV_URL_FILE" ] && OLD_URL=$(cat "$PREV_URL_FILE")

if [ "$NEW_URL" != "$OLD_URL" ] && [ "$VERCEL_TOKEN" != "NO_TOKEN" ]; then
  echo "[monitor] URL changed: $OLD_URL -> $NEW_URL" >> "$LOG_DIR/monitor.log"
  cd "$PROJECT_DIR"
  VERCEL_TOKEN="$VERCEL_TOKEN" vercel env rm VITE_SOCKET_URL production --yes 2>/dev/null
  echo "$NEW_URL" | VERCEL_TOKEN="$VERCEL_TOKEN" vercel env add VITE_SOCKET_URL production
  echo "$NEW_URL" | VERCEL_TOKEN="$VERCEL_TOKEN" vercel deploy --prod
  echo "$NEW_URL" > "$PREV_URL_FILE"
  echo "[monitor] Vercel updated to $NEW_URL" >> "$LOG_DIR/monitor.log"
fi

echo "$NEW_URL" > "$PREV_URL_FILE"
