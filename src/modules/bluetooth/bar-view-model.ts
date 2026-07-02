import type { BarIndicatorViewModel } from "../../shared/bar-indicator.ts"

import { bluetoothTone, connectedDevices, type BluetoothSnapshot } from "./domain.ts"

const ICON_BT_CONNECTED = "󰂱"
const ICON_BT_POWERED = "󰂯"
const ICON_BT_OFF = "󰂲"

function bluetoothIcon(snapshot: BluetoothSnapshot): string {
  if (!snapshot.available || !snapshot.adapters.some((adapter) => adapter.powered)) {
    return ICON_BT_OFF
  }

  if (connectedDevices(snapshot).length > 0) {
    return ICON_BT_CONNECTED
  }

  return ICON_BT_POWERED
}

export function toBluetoothBarIndicator(snapshot: BluetoothSnapshot): BarIndicatorViewModel {
  const connectedCount = connectedDevices(snapshot).length

  return {
    id: "bluetooth",
    icon: bluetoothIcon(snapshot),
    label: connectedCount > 0 ? String(connectedCount) : "",
    tone: bluetoothTone(snapshot),
  }
}
