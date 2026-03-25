import assert from "node:assert/strict"
import test from "node:test"

import { toBatteryBarIndicator } from "../../src/modules/battery/bar-view-model.ts"

test("toBatteryBarIndicator shows percentage for discharging battery", () => {
  const bi = toBatteryBarIndicator({
    present: true,
    percent: 84,
    state: "discharging",
    energyNowWh: 47,
    energyFullWh: 56,
    powerNowW: 14,
  })

  assert.equal(bi.id, "battery")
  assert.equal(bi.label, "84%")
  assert.equal(bi.tone, "healthy")
})

test("toBatteryBarIndicator shows critical for low battery", () => {
  const bi = toBatteryBarIndicator({
    present: true,
    percent: 10,
    state: "discharging",
    energyNowWh: 5.6,
    energyFullWh: 56,
    powerNowW: 14,
  })

  assert.equal(bi.tone, "critical")
  assert.equal(bi.icon, "BAT!")
})

test("toBatteryBarIndicator handles null snapshot", () => {
  const bi = toBatteryBarIndicator(null)
  assert.equal(bi.label, "--")
  assert.equal(bi.tone, "muted")
})

test("toBatteryBarIndicator shows charging icon", () => {
  const bi = toBatteryBarIndicator({
    present: true,
    percent: 60,
    state: "charging",
    energyNowWh: 33.6,
    energyFullWh: 56,
    powerNowW: 45,
  })

  assert.equal(bi.icon, "BAT+")
  assert.equal(bi.tone, "healthy")
})
