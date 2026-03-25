import { createMemo } from "gnim"

import type { Accessor } from "gnim"

import type { NetworkSource } from "./ports.ts"
import type { NetworkSnapshot } from "./domain.ts"
import { toNetworkViewModel, type NetworkViewModel } from "./view-model.ts"

export interface NetworkModule {
  snapshot: Accessor<NetworkSnapshot>
  viewModel: Accessor<NetworkViewModel>
}

export function createNetworkModule(source: NetworkSource): NetworkModule {
  const viewModel = createMemo(() => toNetworkViewModel(source.snapshot()))

  return {
    snapshot: source.snapshot,
    viewModel,
  }
}
