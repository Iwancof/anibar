import { createMemo } from "gnim"

import type { Accessor } from "gnim"

import type { BarIndicatorViewModel } from "../../shared/bar-indicator.ts"
import { toBluetoothBarIndicator } from "./bar-view-model.ts"
import type { BluetoothSnapshot } from "./domain.ts"
import type { BluetoothSource, BtActionResult } from "./ports.ts"
import { toBluetoothViewModel, type BluetoothViewModel } from "./view-model.ts"

export interface BluetoothModule {
  snapshot: Accessor<BluetoothSnapshot>
  viewModel: Accessor<BluetoothViewModel>
  barIndicator: Accessor<BarIndicatorViewModel>
  setPowered(adapterPath: string, on: boolean): Promise<BtActionResult>
  connectDevice(path: string): Promise<BtActionResult>
  disconnectDevice(path: string): Promise<BtActionResult>
  startDiscovery(adapterPath: string): Promise<BtActionResult>
  stopDiscovery(adapterPath: string): Promise<BtActionResult>
}

export function createBluetoothModule(source: BluetoothSource): BluetoothModule {
  const viewModel = createMemo(() => toBluetoothViewModel(source.snapshot()))
  const barIndicator = createMemo(() => toBluetoothBarIndicator(source.snapshot()))

  return {
    snapshot: source.snapshot,
    viewModel,
    barIndicator,
    setPowered: source.setPowered,
    connectDevice: source.connectDevice,
    disconnectDevice: source.disconnectDevice,
    startDiscovery: source.startDiscovery,
    stopDiscovery: source.stopDiscovery,
  }
}
