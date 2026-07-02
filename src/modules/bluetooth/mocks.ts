import { createState } from "gnim"

import type { BluetoothSnapshot } from "./domain.ts"
import type { BluetoothSource, BtActionResult } from "./ports.ts"

const okResult: BtActionResult = { ok: true }

export const bluetoothPreviewStates: Record<
  "unavailable" | "off" | "onNoDevices" | "connected" | "scanning",
  BluetoothSnapshot
> = {
  unavailable: {
    available: false,
    adapters: [],
    devices: [],
  },
  off: {
    available: true,
    adapters: [
      {
        path: "/org/bluez/hci0",
        name: "hci0",
        address: "00:11:22:33:44:55",
        powered: false,
        discovering: false,
      },
    ],
    devices: [],
  },
  onNoDevices: {
    available: true,
    adapters: [
      {
        path: "/org/bluez/hci0",
        name: "hci0",
        address: "00:11:22:33:44:55",
        powered: true,
        discovering: false,
      },
    ],
    devices: [],
  },
  connected: {
    available: true,
    adapters: [
      {
        path: "/org/bluez/hci0",
        name: "hci0",
        address: "00:11:22:33:44:55",
        powered: true,
        discovering: false,
      },
    ],
    devices: [
      {
        path: "/org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF",
        adapterPath: "/org/bluez/hci0",
        address: "AA:BB:CC:DD:EE:FF",
        name: "MX Master 3S",
        icon: "input-mouse",
        paired: true,
        trusted: true,
        connected: true,
        rssi: null,
        batteryPercent: 18,
      },
      {
        path: "/org/bluez/hci0/dev_11_22_33_44_55_66",
        adapterPath: "/org/bluez/hci0",
        address: "11:22:33:44:55:66",
        name: "WH-1000XM5",
        icon: "audio-headphones",
        paired: true,
        trusted: true,
        connected: true,
        rssi: -51,
        batteryPercent: 72,
      },
    ],
  },
  scanning: {
    available: true,
    adapters: [
      {
        path: "/org/bluez/hci0",
        name: "hci0",
        address: "00:11:22:33:44:55",
        powered: true,
        discovering: true,
      },
    ],
    devices: [
      {
        path: "/org/bluez/hci0/dev_22_33_44_55_66_77",
        adapterPath: "/org/bluez/hci0",
        address: "22:33:44:55:66:77",
        name: "Keyboard K3",
        icon: "input-keyboard",
        paired: false,
        trusted: false,
        connected: false,
        rssi: -68,
        batteryPercent: null,
      },
    ],
  },
}

export function createMockBluetoothSource(
  initial: BluetoothSnapshot = bluetoothPreviewStates.connected,
): BluetoothSource {
  const [snapshot] = createState(initial)

  return {
    snapshot,
    setPowered: async () => okResult,
    connectDevice: async () => okResult,
    disconnectDevice: async () => okResult,
    startDiscovery: async () => okResult,
    stopDiscovery: async () => okResult,
  }
}
