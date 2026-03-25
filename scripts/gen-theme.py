#!/usr/bin/env python3
"""theme.yaml → _theme.scss 変換スクリプト"""

import yaml
from pathlib import Path


def flatten(d: dict, prefix: str = "") -> dict[str, str]:
    """ネストされた辞書を 'section-key' 形式にフラット化"""
    out: dict[str, str] = {}
    for k, v in d.items():
        name = f"{prefix}-{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, name))
        else:
            out[name] = str(v)
    return out


def main() -> None:
    base = Path(__file__).resolve().parent.parent
    src = base / "theme.yaml"
    dst = base / "_theme.scss"

    with open(src) as f:
        data = yaml.safe_load(f)

    lines = ["// ⚠ 自動生成 — theme.yaml を編集してください", ""]
    for key, val in flatten(data).items():
        scss_var = f"${key}"
        # 数値のみの場合はそのまま、それ以外は必要に応じてクォートしない
        # SCSS では数値+単位はクォート不要、文字列も unquote で使える
        lines.append(f"{scss_var}: {val};")

    lines.append("")
    dst.write_text("\n".join(lines))
    print(f"✓ {dst.relative_to(base)}")


if __name__ == "__main__":
    main()
