import { createBatteryModule, type BatteryModule } from "./battery/service.ts"
import { createNetworkModule, type NetworkModule } from "./network/service.ts"
import {
  createServiceHealthModule,
  type ServiceHealthModule,
} from "./service-health/service.ts"
import { createVolumeModule, type VolumeModule } from "./volume/service.ts"

import { createBatterySource } from "../runtime/battery-source.ts"
import { createNetworkSource } from "../runtime/network-source.ts"
import { createServiceHealthSource } from "../runtime/service-health-source.ts"
import { createVolumeSource } from "../runtime/volume-source.ts"

import type { Accessor } from "gnim"
import type { BarIndicatorViewModel } from "../shared/bar-indicator.ts"

export interface AppModules {
  battery: BatteryModule
  network: NetworkModule
  serviceHealth: ServiceHealthModule
  volume: VolumeModule
}

export function createRuntimeAppModules(): AppModules {
  return {
    battery: createBatteryModule(createBatterySource()),
    network: createNetworkModule(createNetworkSource()),
    serviceHealth: createServiceHealthModule(createServiceHealthSource()),
    volume: createVolumeModule(createVolumeSource()),
  }
}

export function barIndicators(modules: AppModules): Accessor<BarIndicatorViewModel>[] {
  return [
    modules.volume.barIndicator,
    // battery は専用ビジュアルウィジェットで表示するため除外
  ]
}
