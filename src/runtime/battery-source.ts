import { subprocess } from "ags/process"
import { createState } from "gnim"

import { normalizeBatteryState, type BatterySnapshot } from "../modules/battery/domain.ts"
import type { BatterySource } from "../modules/battery/ports.ts"
import { fileExists, readNumberFile, readTextFile } from "./fs.ts"

const BATTERY_CANDIDATES = ["BAT0", "BAT1", "BAT2"]

function findBatteryRoot(): string | null {
  for (const candidate of BATTERY_CANDIDATES) {
    const root = `/sys/class/power_supply/${candidate}`
    if (fileExists(`${root}/capacity`)) {
      return root
    }
  }
  return null
}

function readMicroScaled(root: string, primary: string, fallback?: string): number | null {
  const raw =
    readNumberFile(`${root}/${primary}`) ??
    (fallback ? readNumberFile(`${root}/${fallback}`) : null)
  return raw == null ? null : raw / 1_000_000
}

function readBatterySnapshot(root: string): BatterySnapshot | null {
  const present = readTextFile(`${root}/present`)
  if (present === "0") return null

  const percent = readNumberFile(`${root}/capacity`)
  if (percent == null) return null

  return {
    present: true,
    percent,
    state: normalizeBatteryState(readTextFile(`${root}/status`)),
    energyNowWh: readMicroScaled(root, "energy_now", "charge_now"),
    energyFullWh: readMicroScaled(root, "energy_full", "charge_full"),
    energyFullDesignWh: readMicroScaled(root, "energy_full_design", "charge_full_design"),
    powerNowW: readMicroScaled(root, "power_now", "current_now"),
    cycleCount: readNumberFile(`${root}/cycle_count`),
  }
}

function readCurrentSnapshot(): BatterySnapshot | null {
  const root = findBatteryRoot()
  return root ? readBatterySnapshot(root) : null
}

export function createBatterySource(): BatterySource {
  const [snapshot, setSnapshot] = createState<BatterySnapshot | null>(null)

  // 初回読み込み
  setSnapshot(readCurrentSnapshot())

  // upower --monitor でバッテリー変化を検知し即時更新
  subprocess(
    ["upower", "--monitor"],
    (line) => {
      if (line.includes("battery") || line.includes("line_power") || line.includes("BAT")) {
        setSnapshot(readCurrentSnapshot())
      }
    },
  )

  return { snapshot }
}
