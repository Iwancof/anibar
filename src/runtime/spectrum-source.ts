import GLib from "gi://GLib?version=2.0"

import { subprocess } from "ags/process"
import { createState, type Accessor } from "gnim"

const CAVA_CONF = GLib.get_user_config_dir() + "/ags/cava-bar.conf"

export interface SpectrumSource {
  bars: Accessor<number[]>
}

export function createSpectrumSource(): SpectrumSource {
  const [bars, setBars] = createState<number[]>([])

  subprocess(
    ["cava", "-p", CAVA_CONF],
    (line) => {
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
