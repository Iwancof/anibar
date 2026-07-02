#!/usr/bin/env python3
"""theme.yaml → _theme.scss / theme-tokens.ts 変換スクリプト"""

import yaml
from pathlib import Path
import re


def flatten(d: dict, prefix: str = "", skip: set[str] | None = None) -> dict[str, str]:
    """ネストされた辞書を 'section-key' 形式にフラット化"""
    skip = skip or set()
    out: dict[str, str] = {}
    for k, v in d.items():
        if not prefix and str(k) in skip:
            continue
        name = f"{prefix}-{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, name, skip))
        else:
            out[name] = str(v)
    return out


def rgb_literal(rgb: tuple[int, int, int]) -> str:
    """Cairo 用の 0-1 RGB 配列リテラルを返す"""
    def fmt(component: int) -> str:
        value = component / 255
        text = f"{value:.6f}".rstrip("0").rstrip(".")
        return text if text else "0"

    return f"[{fmt(rgb[0])}, {fmt(rgb[1])}, {fmt(rgb[2])}] as const"


def parse_hex_rgb(value: str) -> tuple[int, int, int] | None:
    value = value.strip()
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return None
    return (
        int(value[1:3], 16),
        int(value[3:5], 16),
        int(value[5:7], 16),
    )


def parse_rgb_triplet(value: str) -> tuple[int, int, int] | None:
    parts = [p.strip() for p in value.split(",")]
    if len(parts) != 3:
        return None
    try:
        rgb = tuple(int(p) for p in parts)
    except ValueError:
        return None
    if any(component < 0 or component > 255 for component in rgb):
        return None
    return rgb  # type: ignore[return-value]


def gen_ts_tokens(data: dict, base: Path) -> None:
    """theme.yaml から TS 側の色・寸法トークンを生成"""
    flat = flatten(data, skip={"spectrum"})
    hex_colors: dict[str, str] = {}
    rgb_colors: dict[str, tuple[int, int, int]] = {}

    for key, val in flat.items():
        rgb = parse_hex_rgb(val)
        if rgb is not None:
            hex_colors[key] = val.lower()
            rgb_colors[key] = rgb
            continue

        if key.endswith("-rgb"):
            rgb = parse_rgb_triplet(val)
            if rgb is not None:
                rgb_colors[key] = rgb

    dim: dict[str, int] = {}
    for key, val in flatten(data.get("dim", {})).items():
        dim[key] = int(val)
    popup = data.get("popup", {})
    if "anim-close-ms" in popup:
        dim["anim-close-ms"] = int(popup["anim-close-ms"])

    lines = [
        "// generated — 編集禁止。theme.yaml を編集して npm run theme を実行してください。",
        "",
        "export const COLORS = {",
        "  hex: {",
    ]
    for key in sorted(hex_colors):
        lines.append(f'    "{key}": "{hex_colors[key]}",')
    lines.extend([
        "  },",
        "  rgb: {",
    ])
    for key in sorted(rgb_colors):
        lines.append(f'    "{key}": {rgb_literal(rgb_colors[key])},')
    lines.extend([
        "  },",
        "} as const",
        "",
        "export const DIM = {",
    ])
    for key in sorted(dim):
        lines.append(f'  "{key}": {dim[key]},')
    lines.extend([
        "} as const",
        "",
    ])

    dst = base / "src" / "shared" / "theme-tokens.ts"
    dst.write_text("\n".join(lines))
    print(f"✓ {dst.relative_to(base)}")


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
    for key, val in flatten(data, skip={"spectrum"}).items():
        scss_var = f"${key}"
        # 数値のみの場合はそのまま、それ以外は必要に応じてクォートしない
        # SCSS では数値+単位はクォート不要、文字列も unquote で使える
        lines.append(f"{scss_var}: {val};")

    lines.append("")
    dst.write_text("\n".join(lines))
    print(f"✓ {dst.relative_to(base)}")

    gen_ts_tokens(data, base)
    gen_cava_conf(data, base)


if __name__ == "__main__":
    main()
