import type { Accessor } from "gnim"

import type { BluetoothSnapshot } from "./domain.ts"

export type BtActionResult = { ok: true } | { ok: false; code: string; message: string }

export interface BluetoothSource {
  snapshot: Accessor<BluetoothSnapshot>
  setPowered(adapterPath: string, on: boolean): Promise<BtActionResult>
  connectDevice(path: string): Promise<BtActionResult>
  disconnectDevice(path: string): Promise<BtActionResult>
  startDiscovery(adapterPath: string): Promise<BtActionResult>
  stopDiscovery(adapterPath: string): Promise<BtActionResult>
}

// Discovery session ownership, StopDiscovery balancing, and NameOwnerChanged
// recovery belong to the runtime D-Bus source, not to this pure module boundary.
