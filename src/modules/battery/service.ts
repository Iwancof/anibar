import { createMemo } from "gnim"

import type { Accessor } from "gnim"

import type { BarIndicatorViewModel } from "../../shared/bar-indicator.ts"
import type { BatterySource } from "./ports.ts"
import { toBatteryBarIndicator } from "./bar-view-model.ts"
import { toBatteryViewModel, type BatteryViewModel } from "./view-model.ts"
import type { BatterySnapshot } from "./domain.ts"

export interface BatteryModule {
  snapshot: Accessor<BatterySnapshot | null>
  viewModel: Accessor<BatteryViewModel>
  barIndicator: Accessor<BarIndicatorViewModel>
}

export function createBatteryModule(source: BatterySource): BatteryModule {
  const viewModel = createMemo(() => toBatteryViewModel(source.snapshot()))
  const barIndicator = createMemo(() => toBatteryBarIndicator(source.snapshot()))

  return {
    snapshot: source.snapshot,
    viewModel,
    barIndicator,
  }
}
