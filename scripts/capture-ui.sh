#!/usr/bin/env bash
# 特定のUI状態をキャプチャするスクリプト
# 使い方:
#   bash scripts/capture-ui.sh bar              # バーのみ
#   bash scripts/capture-ui.sh battery-popup    # バッテリーポップアップを開いて撮影
#   bash scripts/capture-ui.sh notif-center     # 通知センターを開いて撮影
#   bash scripts/capture-ui.sh network-popup    # ネットワークポップアップを開いて撮影
#   bash scripts/capture-ui.sh all              # 全部撮影
set -euo pipefail

OUT="/tmp/ags-ui-captures"
mkdir -p "$OUT"

capture_bar() {
  grim -g "0,0 1920x40" "$OUT/bar.png"
  echo "✓ bar → $OUT/bar.png"
}

capture_popup() {
  local name="$1" request="$2" delay="${3:-1}"
  ags request "$request open" 2>/dev/null || true
  sleep "$delay"
  grim "$OUT/${name}.png"
  ags request "$request close" 2>/dev/null || true
  echo "✓ ${name} → $OUT/${name}.png"
}

case "${1:-all}" in
  bar)
    capture_bar ;;
  battery-popup)
    capture_popup "battery-popup" "battery" ;;
  notif-center)
    capture_popup "notif-center" "notif-center" ;;
  network-popup)
    capture_popup "network-popup" "network" ;;
  all)
    capture_bar
    capture_popup "battery-popup" "battery"
    sleep 0.5
    capture_popup "notif-center" "notif-center"
    sleep 0.5
    capture_popup "network-popup" "network"
    echo "=== 全キャプチャ完了: $OUT/ ==="
    ;;
  *)
    echo "使い方: $0 {bar|battery-popup|notif-center|network-popup|all}"
    exit 1 ;;
esac
