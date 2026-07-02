import assert from "node:assert/strict"
import test from "node:test"

import { toBluetoothBarIndicator } from "../../src/modules/bluetooth/bar-view-model.ts"

test("toBluetoothBarIndicator shows off icon for unavailable Bluetooth", () => {
  const indicator = toBluetoothBarIndicator({
    available: false,
    adapters: [],
    devices: [],
  })

  assert.equal(indicator.id, "bluetooth")
  assert.equal(indicator.icon, "󰂲")
  assert.equal(indicator.label, "")
  assert.equal(indicator.tone, "muted")
})

test("toBluetoothBarIndicator shows powered icon without connected devices", () => {
  const indicator = toBluetoothBarIndicator({
    available: true,
    adapters: [{ path: "/org/bluez/hci0", name: "hci0", address: "", powered: true, discovering: false }],
    devices: [],
  })

  assert.equal(indicator.icon, "󰂯")
  assert.equal(indicator.label, "")
  assert.equal(indicator.tone, "healthy")
})

test("toBluetoothBarIndicator shows connected icon and count", () => {
  const indicator = toBluetoothBarIndicator({
    available: true,
    adapters: [{ path: "/org/bluez/hci0", name: "hci0", address: "", powered: true, discovering: false }],
    devices: [
      {
        path: "/org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF",
        adapterPath: "/org/bluez/hci0",
        address: "AA:BB:CC:DD:EE:FF",
        name: "Keyboard",
        icon: "input-keyboard",
        paired: true,
        trusted: true,
        connected: true,
        rssi: null,
        batteryPercent: 80,
      },
      {
        path: "/org/bluez/hci0/dev_11_22_33_44_55_66",
        adapterPath: "/org/bluez/hci0",
        address: "11:22:33:44:55:66",
        name: "Speaker",
        icon: "audio-speakers",
        paired: true,
        trusted: true,
        connected: true,
        rssi: null,
        batteryPercent: 18,
      },
    ],
  })

  assert.equal(indicator.icon, "󰂱")
  assert.equal(indicator.label, "2")
  assert.equal(indicator.tone, "warning")
})
