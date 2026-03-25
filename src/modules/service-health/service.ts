import { createMemo } from "gnim"

import type { Accessor } from "gnim"

import type { ServiceHealthSource } from "./ports.ts"
import type { ServiceHealthSnapshot } from "./domain.ts"
import { toServiceHealthViewModel, type ServiceHealthViewModel } from "./view-model.ts"

export interface ServiceHealthModule {
  snapshot: Accessor<ServiceHealthSnapshot>
  viewModel: Accessor<ServiceHealthViewModel>
}

export function createServiceHealthModule(source: ServiceHealthSource): ServiceHealthModule {
  const viewModel = createMemo(() => toServiceHealthViewModel(source.snapshot()))

  return {
    snapshot: source.snapshot,
    viewModel,
  }
}
