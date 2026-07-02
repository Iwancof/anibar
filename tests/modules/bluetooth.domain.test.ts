import assert from "node:assert/strict"
import test from "node:test"

import {
  bluetoothTone,
  connectedDevices,
  defaultAdapter,
  parseManagedObjects,
  type BluezManagedObjects,
} from "../../src/modules/bluetooth/domain.ts"

const managedObjects: BluezManagedObjects = {
  "/org/bluez/hci0": {
    "org.bluez.Adapter1": {
      Address: "00:11:22:33:44:55",
      Alias: "workstation",
      Name: "hci0",
      Powered: true,
      Discovering: false,
    },
  },
  "/org/bluez/hci1": {
    "org.bluez.Adapter1": {
      Address: "66:77:88:99:AA:BB",
      Name: "hci1",
      Powered: false,
      Discovering: true,
    },
  },
  "/org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF": {
    "org.bluez.Device1": {
      Address: "AA:BB:CC:DD:EE:FF",
      Alias: "Keyboard",
      Name: "Ignored Name",
      Icon: "input-keyboard",
      Adapter: "/org/bluez/hci0",
      Paired: true,
      Trusted: true,
      Connected: true,
      RSSI: -48,
    },
    "org.bluez.Battery1": {
      Percentage: 88,
    },
  },
  "/org/bluez/hci0/dev_11_22_33_44_55_66": {
    "org.bluez.Device1": {
      Address: "11:22:33:44:55:66",
      Name: "Headphones",
      Icon: "audio-headphones",
      Adapter: "/org/bluez/hci0",
      Paired: true,
      Trusted: false,
      Connected: true,
    },
    "org.bluez.Battery1": {
      Percentage: 18,
    },
  },
  "/org/bluez/hci0/dev_22_33_44_55_66_77": {
    "org.bluez.Device1": {
      Address: "22:33:44:55:66:77",
      Adapter: "/org/bluez/hci0",
      Paired: false,
      Trusted: false,
      Connected: false,
      RSSI: -72,
    },
  },
}

test("parseManagedObjects builds adapters and merges Battery1 by object path", () => {
  const snapshot = parseManagedObjects(managedObjects)

  assert.equal(snapshot.available, true)
  assert.equal(snapshot.adapters.length, 2)
  assert.deepEqual(snapshot.adapters[0], {
    path: "/org/bluez/hci0",
    name: "workstation",
    address: "00:11:22:33:44:55",
    powered: true,
    discovering: false,
  })
  assert.equal(defaultAdapter(snapshot)?.path, "/org/bluez/hci0")

  assert.equal(snapshot.devices.length, 3)
  assert.deepEqual(
    snapshot.devices.map((device) => device.name),
    ["Headphones", "Keyboard", "22:33:44:55:66:77"],
  )
  assert.equal(snapshot.devices[0].batteryPercent, 18)
  assert.equal(snapshot.devices[1].batteryPercent, 88)
  assert.equal(snapshot.devices[2].batteryPercent, null)
})

test("parseManagedObjects ignores Battery1-only paths and incomplete Device1 entries", () => {
  const snapshot = parseManagedObjects({
    "/org/bluez/hci0": {
      "org.bluez.Adapter1": {
        Address: "00:11:22:33:44:55",
        Powered: true,
        Discovering: false,
      },
    },
    "/org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF": {
      "org.bluez.Battery1": {
        Percentage: 50,
      },
    },
    "/org/bluez/hci0/dev_11_22_33_44_55_66": {
      "org.bluez.Device1": {
        Name: "Incomplete",
        Adapter: "/org/bluez/hci0",
        Connected: true,
      },
    },
  })

  assert.equal(snapshot.available, true)
  assert.equal(snapshot.devices.length, 0)
})

test("parseManagedObjects infers adapter path when Device1.Adapter is absent", () => {
  const snapshot = parseManagedObjects({
    "/org/bluez/hci0": {
      "org.bluez.Adapter1": {
        Address: "00:11:22:33:44:55",
        Powered: true,
        Discovering: false,
      },
    },
    "/org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF": {
      "org.bluez.Device1": {
        Address: "AA:BB:CC:DD:EE:FF",
        Connected: false,
      },
    },
  })

  assert.equal(snapshot.devices[0].adapterPath, "/org/bluez/hci0")
})

test("parseManagedObjects returns unavailable when no Adapter1 exists", () => {
  const snapshot = parseManagedObjects({})

  assert.equal(snapshot.available, false)
  assert.deepEqual(snapshot.adapters, [])
  assert.deepEqual(snapshot.devices, [])
})

test("connectedDevices and bluetoothTone follow adapter power and low battery rules", () => {
  const snapshot = parseManagedObjects(managedObjects)

  assert.equal(connectedDevices(snapshot).length, 2)
  assert.equal(bluetoothTone(snapshot), "warning")

  assert.equal(
    bluetoothTone({
      available: true,
      adapters: [{ path: "/org/bluez/hci0", name: "hci0", address: "", powered: false, discovering: false }],
      devices: [],
    }),
    "muted",
  )
})
