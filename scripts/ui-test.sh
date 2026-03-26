#!/usr/bin/env bash
# AGS UIスクリーンショットテスト
# ヘッドレスモニタ上でプレビューを起動し、grim でスクリーンショットを撮影する。
#
# 使い方:
#   bash scripts/ui-test.sh [preview名]
#   bash scripts/ui-test.sh dashboard
#   bash scripts/ui-test.sh                # 全プレビューをテスト
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
SETTLE_TIME="${SETTLE_TIME:-3}"
OUTPUT_DIR="/tmp/ags-screenshots"

red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }

# 必須コマンドのチェック
check_deps() {
  local missing=()
  command -v grim    >/dev/null || missing+=(grim)
  command -v hyprctl >/dev/null || missing+=(hyprctl)
  command -v ags     >/dev/null || missing+=(ags)
  if (( ${#missing[@]} )); then
    red "必須コマンドが見つかりません: ${missing[*]}"
    echo "インストール: pacman -S ${missing[*]}"
    exit 1
  fi
}

# 利用可能なプレビュー一覧
list_previews() {
  ls "$DIR/src/preview/"*.tsx 2>/dev/null \
    | xargs -I{} basename {} .tsx \
    | grep -v -E '^(PreviewWindow|startPreview)$'
}

# ヘッドレスモニタを作成し、名前を返す
create_headless() {
  local before after
  before=$(hyprctl monitors all -j | grep -o '"name":"HEADLESS-[0-9]*"' | sort)
  hyprctl output create headless >/dev/null
  sleep 0.3
  after=$(hyprctl monitors all -j | grep -o '"name":"HEADLESS-[0-9]*"' | sort)
  comm -13 <(echo "$before") <(echo "$after") | grep -o 'HEADLESS-[0-9]*' | head -1
}

# ヘッドレスモニタを削除
remove_headless() {
  hyprctl output remove "$1" >/dev/null 2>&1 || true
}

# 単一プレビューのスクリーンショットを撮影
capture_preview() {
  local preview_name="$1"
  local monitor="$2"
  local output_file="$OUTPUT_DIR/${preview_name}.png"
  local instance="ui-test-${preview_name}"

  dim "  プレビュー起動: $preview_name"

  # テーマ生成
  python3 "$DIR/scripts/gen-theme.py" >/dev/null 2>&1 || true

  # AGS プレビューをバックグラウンドで起動
  ags run "src/preview/${preview_name}.tsx" --gtk 4 -i "$instance" &
  local ags_pid=$!

  # 描画完了を待つ
  sleep "$SETTLE_TIME"

  if ! kill -0 "$ags_pid" 2>/dev/null; then
    red "  AGS プレビューが起動に失敗: $preview_name"
    return 1
  fi

  # スクリーンショット取得
  grim -o "$monitor" "$output_file"

  # AGS を終了
  ags quit -i "$instance" 2>/dev/null || kill "$ags_pid" 2>/dev/null || true
  wait "$ags_pid" 2>/dev/null || true

  if [[ -f "$output_file" ]]; then
    green "  保存: $output_file"
    return 0
  else
    red "  スクリーンショット取得失敗"
    return 1
  fi
}

main() {
  local targets=()

  while (( $# )); do
    case "$1" in
      --list)   list_previews; exit 0 ;;
      --help|-h)
        echo "使い方: $0 [--list] [preview名...]"
        echo ""
        echo "環境変数:"
        echo "  SETTLE_TIME=3   描画待ち秒数 (デフォルト: 3)"
        echo "  OUTPUT_DIR      出力先 (デフォルト: /tmp/ags-screenshots)"
        exit 0
        ;;
      *) targets+=("$1"); shift ;;
    esac
  done

  if (( ${#targets[@]} == 0 )); then
    mapfile -t targets < <(list_previews)
  fi

  check_deps

  echo "=== AGS UI スクリーンショットテスト ==="
  echo "対象: ${targets[*]}"
  echo ""

  mkdir -p "$OUTPUT_DIR"

  # ヘッドレスモニタ作成
  local monitor
  monitor=$(create_headless)
  if [[ -z "$monitor" ]]; then
    red "ヘッドレスモニタの作成に失敗"
    exit 1
  fi
  dim "ヘッドレスモニタ: $monitor"

  hyprctl keyword monitor "$monitor,1920x1080@60,auto,1" >/dev/null
  trap "remove_headless '$monitor'" EXIT

  local passed=0 failed=0

  for preview in "${targets[@]}"; do
    echo "--- $preview ---"
    if capture_preview "$preview" "$monitor"; then
      ((passed++))
    else
      ((failed++))
    fi
    echo ""
  done

  echo "=== 結果 ==="
  green "合格: $passed"
  [[ $failed -gt 0 ]] && red "失敗: $failed"
  echo "スクリーンショット: $OUTPUT_DIR/"

  (( failed > 0 )) && exit 1
  exit 0
}

main "$@"
