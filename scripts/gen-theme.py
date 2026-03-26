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


def gen_cava_conf(data: dict, base: Path) -> None:
    """spectrum セクションから cava-bar.conf を生成"""
    spec = data.get("spectrum", {})
    bars = spec.get("bars", 10)
    framerate = spec.get("framerate", 60)
    sensitivity = spec.get("sensitivity", 150)
    noise_reduction = spec.get("noise-reduction", 0)

    dst = base / "cava-bar.conf"
    dst.write_text(
        f"[general]\n"
        f"bars = {bars}\n"
        f"framerate = {framerate}\n"
        f"sensitivity = {sensitivity}\n"
        f"\n"
        f"[smoothing]\n"
        f"noise_reduction = {noise_reduction}\n"
        f"\n"
        f"[input]\n"
        f"method = pipewire\n"
        f"source = auto\n"
        f"\n"
        f"[output]\n"
        f"method = raw\n"
        f"raw_target = /dev/stdout\n"
        f"data_format = ascii\n"
        f"ascii_max_range = 100\n"
        f"bar_delimiter = 59\n"
        f"frame_delimiter = 10\n"
        f"channels = mono\n"
        f"mono_option = average\n"
    )
    print(f"✓ {dst.relative_to(base)}")


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

    gen_cava_conf(data, base)


if __name__ == "__main__":
    main()
