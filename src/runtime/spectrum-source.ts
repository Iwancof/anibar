import GLib from "gi://GLib?version=2.0"

import { subprocess } from "ags/process"
import { createState, type Accessor } from "gnim"

const NUM_BARS = 10
const EMPTY = new Array<number>(NUM_BARS).fill(0)
const CAVA_CONF = GLib.get_user_config_dir() + "/ags/cava-bar.conf"

export interface SpectrumSource {
  /** 0-100 の値が NUM_BARS 個 */
  bars: Accessor<number[]>
}

export function createSpectrumSource(): SpectrumSource {
  const [bars, setBars] = createState<number[]>(EMPTY)

  subprocess(
    ["cava", "-p", CAVA_CONF],
    (line) => {
      const values = line
        .split(";")
        .filter(Boolean)
        .map(Number)
      if (values.length === NUM_BARS) {
        setBars(values)
      }
    },
  )

  return { bars }
}
