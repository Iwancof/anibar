import assert from "node:assert/strict"
import test from "node:test"

import { toBluetoothViewModel } from "../../src/modules/bluetooth/view-model.ts"

test("toBluetoothViewModel exposes panel summary and device row labels", () => {
  const viewModel = toBluetoothViewModel({
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
        name: "Keyboard",
        icon: "input-keyboard",
        paired: true,
        trusted: true,
        connected: true,
        rssi: -48,
        batteryPercent: 18,
      },
      {
        path: "/org/bluez/hci0/dev_11_22_33_44_55_66",
        adapterPath: "/org/bluez/hci0",
        address: "11:22:33:44:55:66",
        name: "Speaker",
        icon: "audio-speakers",
        paired: false,
        trusted: false,
        connected: false,
        rssi: null,
        batteryPercent: null,
      },
    ],
  })

  assert.equal(viewModel.title, "BT::DEVICES")
  assert.equal(viewModel.summary, "LINK::UP 1")
  assert.equal(viewModel.connectedCount, 1)
  assert.equal(viewModel.tone, "warning")
  assert.equal(viewModel.devices[0].label, "Keyboard")
  assert.equal(viewModel.devices[0].batteryLabel, "18%")
  assert.equal(viewModel.devices[0].rssiLabel, "-48 dBm")
  assert.equal(viewModel.devices[0].tone, "warning")
  assert.equal(viewModel.devices[1].batteryLabel, "—")
  assert.equal(viewModel.devices[1].rssiLabel, "—")
  assert.equal(viewModel.devices[1].tone, "muted")
})

test("toBluetoothViewModel reports unavailable and off adapters as muted states", () => {
  const unavailable = toBluetoothViewModel({
    available: false,
    adapters: [],
    devices: [],
  })

  assert.equal(unavailable.adapterLabel, "NO ADAPTER")
  assert.equal(unavailable.summary, "DBUS::DOWN")
  assert.equal(unavailable.tone, "muted")

  const off = toBluetoothViewModel({
    available: true,
    adapters: [{ path: "/org/bluez/hci0", name: "hci0", address: "", powered: false, discovering: false }],
    devices: [],
  })

  assert.equal(off.summary, "POWER::OFF")
  assert.equal(off.tone, "muted")
})

test("toBluetoothViewModel reports active scanning", () => {
  const viewModel = toBluetoothViewModel({
    available: true,
    adapters: [{ path: "/org/bluez/hci0", name: "hci0", address: "", powered: true, discovering: true }],
    devices: [],
  })

  assert.equal(viewModel.summary, "SCAN::ACTIVE")
  assert.equal(viewModel.scanLabel, "SCAN::ACTIVE")
  assert.equal(viewModel.tone, "healthy")
})
