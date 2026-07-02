import assert from "node:assert/strict"
import test from "node:test"

import { estimateBatteryMinutes, isOnAC } from "../../src/modules/battery/domain.ts"
import { toBatteryViewModel } from "../../src/modules/battery/view-model.ts"

test("estimateBatteryMinutes calculates discharge ETA", () => {
  const minutes = estimateBatteryMinutes({
    present: true,
    percent: 50,
    state: "discharging",
    energyNowWh: 28,
    energyFullWh: 56,
    powerNowW: 14,
  })

  assert.equal(minutes, 120)
})

test("isOnAC follows charging, full, and not-charging states", () => {
  assert.equal(isOnAC(null), false)
  assert.equal(isOnAC({
    present: true,
    percent: 100,
    state: "full",
    energyNowWh: null,
    energyFullWh: null,
    energyFullDesignWh: null,
    powerNowW: null,
    cycleCount: null,
  }), true)
})

test("toBatteryViewModel marks low discharging battery as critical", () => {
  const viewModel = toBatteryViewModel({
    present: true,
    percent: 11,
    state: "discharging",
    energyNowWh: 6.1,
    energyFullWh: 56,
    powerNowW: 15.4,
  })

  assert.equal(viewModel.tone, "critical")
  assert.equal(viewModel.headline, "11%")
  assert.match(viewModel.detail, /remaining/)
})

test("toBatteryViewModel handles systems without batteries", () => {
  const viewModel = toBatteryViewModel(null)

  assert.equal(viewModel.tone, "muted")
  assert.equal(viewModel.headline, "No battery")
})
