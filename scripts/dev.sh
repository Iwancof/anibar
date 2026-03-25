#!/usr/bin/env bash
# AGS hot reload — theme.yaml / style.scss / src/ の変更を検知して自動再起動
set -uo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"

reload() {
  echo "[dev] テーマ生成中..."
  python3 "$DIR/scripts/gen-theme.py"
  echo "[dev] AGS 再起動中..."
  ags quit 2>/dev/null || true
  ags run --gtk 4 &
  echo "[dev] 起動完了 ($(date +%H:%M:%S))"
}

cleanup() {
  echo "[dev] 終了中..."
  ags quit 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# 初回起動
reload

echo "[dev] 監視開始: theme.yaml, style.scss, src/, widget/"
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
