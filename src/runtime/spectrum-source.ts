import GLib from "gi://GLib?version=2.0"

import { subprocess } from "ags/process"
import { createState, type Accessor } from "gnim"

const CAVA_CONF = GLib.get_user_config_dir() + "/ags/cava-bar.conf"

export interface SpectrumSource {
  bars: Accessor<number[]>
}

export function createSpectrumSource(): SpectrumSource {
  const [bars, setBars] = createState<number[]>([])

  // 無音時 cava は同一行 (全ゼロ等) を出し続ける。変化のない行を無視しないと
  // 毎フレーム新配列で通知され、無音でもバーが再描画され続ける。
  let lastLine = ""

  subprocess(
    ["cava", "-p", CAVA_CONF],
    (line) => {
      if (line === lastLine) return
      lastLine = line
      const values = line
        .split(";")
        .filter(Boolean)
        .map(Number)
      if (values.length > 0) {
        setBars(values)
      }
    },
  )

  return { bars }
}
