import { createState } from "gnim"

import type { BatterySnapshot } from "./domain.ts"
import type { BatterySource } from "./ports.ts"

export const batteryPreviewStates: BatterySnapshot[] = [
  {
    present: true,
    percent: 84,
    state: "charging",
    energyNowWh: 47.2,
    energyFullWh: 56.0,
    energyFullDesignWh: 57.0,
    powerNowW: 24.8,
    cycleCount: 42,
  },
  {
    present: true,
    percent: 52,
    state: "discharging",
    energyNowWh: 28.1,
    energyFullWh: 56.0,
    energyFullDesignWh: 57.0,
    powerNowW: 11.6,
    cycleCount: 42,
  },
  {
    present: true,
    percent: 11,
    state: "discharging",
    energyNowWh: 6.1,
    energyFullWh: 56.0,
    energyFullDesignWh: 57.0,
    powerNowW: 15.4,
    cycleCount: 42,
  },
]

export function createMockBatterySource(initial = batteryPreviewStates[0]): BatterySource {
  const [snapshot] = createState<BatterySnapshot | null>(initial)

  return { snapshot }
}
