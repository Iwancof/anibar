import assert from "node:assert/strict"
import test from "node:test"

import { parseNmcliDeviceStatus } from "../../src/modules/network/domain.ts"
import { toNetworkViewModel } from "../../src/modules/network/view-model.ts"

test("parseNmcliDeviceStatus prefers a connected link", () => {
  const result = parseNmcliDeviceStatus(
    [
      "lo:loopback:connected (externally):lo",
      "wlan0:wifi:connected:home-wifi",
      "enp3s0:ethernet:disconnected:",
    ].join("\n"),
  )

  assert.deepEqual(result, {
    online: true,
    interfaceName: "wlan0",
    connectionName: "home-wifi",
    linkKind: "wifi",
  })
})

test("parseNmcliDeviceStatus returns null when no uplink is active", () => {
  const result = parseNmcliDeviceStatus("enp3s0:ethernet:disconnected:")
  assert.equal(result, null)
})

test("toNetworkViewModel reports tailnet degradation separately", () => {
  const viewModel = toNetworkViewModel({
    online: true,
    interfaceName: "enp3s0",
    connectionName: "dock-ethernet",
    linkKind: "ethernet",
    downBps: 1_500_000,
    upBps: 800_000,
    tailscaleOnline: false,
  })

  assert.equal(viewModel.tone, "warning")
  assert.match(viewModel.meta, /Tailscale down/)
})
