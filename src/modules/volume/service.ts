import { createMemo } from "gnim"

import type { Accessor } from "gnim"

import type { BarIndicatorViewModel } from "../../shared/bar-indicator.ts"
import type { VolumeSource } from "./ports.ts"
import { toVolumeBarIndicator } from "./bar-view-model.ts"
import { toVolumeViewModel, type VolumeViewModel } from "./view-model.ts"
import type { VolumeSnapshot } from "./domain.ts"

export interface VolumeModule {
  snapshot: Accessor<VolumeSnapshot | null>
  viewModel: Accessor<VolumeViewModel>
  barIndicator: Accessor<BarIndicatorViewModel>
}

export function createVolumeModule(source: VolumeSource): VolumeModule {
  const viewModel = createMemo(() => toVolumeViewModel(source.snapshot()))
  const barIndicator = createMemo(() => toVolumeBarIndicator(source.snapshot()))

  return {
    snapshot: source.snapshot,
    viewModel,
    barIndicator,
  }
}
