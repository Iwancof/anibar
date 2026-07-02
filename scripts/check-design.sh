#!/usr/bin/env bash
# Design debt guard. Lower these maxima as refactors remove existing debt;
# any increase means new hardcoded design debt was introduced.
set -euo pipefail

MAX_SCSS_HEX=10
MAX_TSX_SYMBOLS=2
MAX_ESCAPE_FILES=8

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

count_matches() {
  local pattern="$1"
  shift
  if (( $# == 0 )); then
    echo 0
    return
  fi

  local matches
  matches=$(rg -o --pcre2 "$pattern" "$@" 2>/dev/null || true)
  if [[ -z "$matches" ]]; then
    echo 0
  else
    printf '%s\n' "$matches" | wc -l
  fi
}

count_files() {
  local pattern="$1"
  shift
  if (( $# == 0 )); then
    echo 0
    return
  fi

  local matches
  matches=$(rg -l "$pattern" "$@" 2>/dev/null || true)
  if [[ -z "$matches" ]]; then
    echo 0
  else
    printf '%s\n' "$matches" | wc -l
  fi
}

check_limit() {
  local label="$1"
  local actual="$2"
  local max="$3"

  if (( actual > max )); then
    printf 'design guard failed: %s count %d exceeds max %d\n' "$label" "$actual" "$max" >&2
    return 1
  fi

  printf 'design guard ok: %s count %d <= max %d\n' "$label" "$actual" "$max"
}

scss_files=()
[[ -f "$ROOT/style.scss" ]] && scss_files+=("$ROOT/style.scss")
if [[ -d "$ROOT/styles" ]]; then
  while IFS= read -r -d '' file; do
    scss_files+=("$file")
  done < <(find "$ROOT/styles" -type f -name '*.scss' -print0)
fi

tsx_files=()
if [[ -d "$ROOT/src" ]]; then
  while IFS= read -r -d '' file; do
    tsx_files+=("$file")
  done < <(find "$ROOT/src" -type f -name '*.tsx' -print0)
fi

scss_hex_count=$(count_matches '#[0-9a-fA-F]{3,8}' "${scss_files[@]}")
tsx_symbol_count=$(count_matches '[⏮▶⏸⏭✕✓‹›]|\p{Emoji_Presentation}' "${tsx_files[@]}")
escape_file_count=$(count_files 'Gdk\.KEY_Escape' "${tsx_files[@]}")

check_limit "SCSS hex literals" "$scss_hex_count" "$MAX_SCSS_HEX"
check_limit "TSX unicode icons/emoji" "$tsx_symbol_count" "$MAX_TSX_SYMBOLS"
check_limit "Gdk.KEY_Escape files" "$escape_file_count" "$MAX_ESCAPE_FILES"
