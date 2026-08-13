#!/usr/bin/env bash
# AGS hot reload — theme.yaml / style.scss / src/ の変更を検知して自動再起動
set -uo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_LOG="${TMPDIR:-/tmp}/ags-runtime.log"
AGS_BUNDLE="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/ags.js"

reload() {
  echo "[dev] テーマ生成中..."
  python3 "$DIR/scripts/gen-theme.py"
  echo "[dev] AGS 再起動中..."
  ags quit 2>/dev/null || true
  # ags quit が届かなかった旧インスタンスの gjs を掃除する。
  # 連続 reload 時にインスタンス名を取れなかった gjs が孤児として残り、
  # ポーリングを続けて CPU を食い潰す事故 (2026-07-02, 91 プロセス) の再発防止。
  if pkill -f "gjs -m $AGS_BUNDLE" 2>/dev/null; then
    sleep 0.5
  fi
  : > "$RUNTIME_LOG"
  # GSK_DEBUG=full-redraw: 2026-08-11 のライブラリ更新 (pango 1.58.2 / mesa 26.1.6) 以降、
  # GTK の部分再描画がラベルの旧グリフを残す (バーの帯域値が「重なって壊れる」)。
  # 全再描画の強制で解消。描画頻度は変わらないためアイドルコストは増えない。
  # GTK/mesa 側で直ったら外してよい (再現確認: 帯域値を高トラフィックで観察)
  GSK_DEBUG=full-redraw ags run --gtk 4 >>"$RUNTIME_LOG" 2>&1 &
  echo "[dev] 起動完了 ($(date +%H:%M:%S))"
  echo "[dev] AGS child log: $RUNTIME_LOG"
}

cleanup() {
  echo "[dev] 終了中..."
  ags quit 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# 初回起動
reload

echo "[dev] 監視開始: theme.yaml, style.scss, src/"
while true; do
  echo "[dev] inotifywait 待機中..."
  RESULT=$(inotifywait -r -e modify,create,delete \
    "$DIR/theme.yaml" \
    "$DIR/style.scss" \
    "$DIR/src" \
    2>&1)
  RC=$?
  echo "[dev] inotifywait 終了 (rc=$RC): $RESULT"
  if [ $RC -ne 0 ] && [ $RC -ne 1 ]; then
    echo "[dev] inotifywait エラー、1秒後にリトライ"
    sleep 1
    continue
  fi
  # 一括変更 (git checkout 等) のイベントバーストを 1 回の reload にまとめる
  sleep 1
  reload
done
