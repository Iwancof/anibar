#!/usr/bin/env bash
# AGS hot reload — 詳細ログ版。ログは $AGS_LOG_FILE に出力される。
# 用途: lid close/open, monitor hotplug のクラッシュ原因切り分け。
set -uo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/ags"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/ags-debug.log"

# GDK/GTK/GLib の診断を最大化
export G_MESSAGES_DEBUG=all
export GDK_DEBUG=misc,events
export GJS_DEBUG_TOPICS="JS ERROR;JS LOG"
export GJS_DEBUG_OUTPUT=stderr
# 注意: fatal-criticals は assertion で abort させるが、これによりスタックトレースが残る
# 現象の再現には一時的に有効にするが、無効化すれば warning のまま続行する
if [ "${AGS_FATAL_CRITICALS:-0}" = "1" ]; then
  export G_DEBUG=fatal-criticals,fatal-warnings
fi

reload() {
  echo "[dev] テーマ生成中..."
  python3 "$DIR/scripts/gen-theme.py"
  echo "[dev] AGS 再起動中..."
  ags quit 2>/dev/null || true
  echo "[dev] ログ: $LOG_FILE"
  {
    echo ""
    echo "==================== $(date -Iseconds) ===================="
    ags run --gtk 4 2>&1
    echo "[dev] ags 終了 rc=$?  $(date -Iseconds)"
  } >> "$LOG_FILE" &
  AGS_PID=$!
  echo "[dev] 起動完了 pid=$AGS_PID ($(date +%H:%M:%S))"
}

cleanup() {
  echo "[dev] 終了中..."
  ags quit 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

reload

echo "[dev] 監視開始: theme.yaml, style.scss, src/, widget/"
echo "[dev] ログ tail したい場合: tail -F $LOG_FILE"
while true; do
  echo "[dev] inotifywait 待機中..."
  RESULT=$(inotifywait -r -e modify,create,delete \
    "$DIR/theme.yaml" \
    "$DIR/style.scss" \
    "$DIR/src" \
    "$DIR/widget" \
    2>&1)
  RC=$?
  echo "[dev] inotifywait 終了 (rc=$RC): $RESULT"
  if [ $RC -ne 0 ] && [ $RC -ne 1 ]; then
    echo "[dev] inotifywait エラー、1秒後にリトライ"
    sleep 1
    continue
  fi
  sleep 0.3
  reload
done
