import assert from "node:assert/strict"
import test from "node:test"

import {
  applyHorizontalPreset,
  applySingleOutputPreset,
  applySwapHorizontalPreset,
  buildApplyCommands,
  createDisplayProfile,
  parseDisplayProfilesFile,
  parseHyprMonitorsJson,
  serializeDisplayProfiles,
  setOutputMode,
  setOutputScale,
  setOutputTransform,
  snapOutputPosition,
  upsertDisplayProfile,
} from "../../src/modules/display-layout/domain.ts"

const HYPR_MONITORS_ALL = JSON.stringify([
  {
    name: "eDP-1",
    description: "Laptop panel",
    width: 1920,
    height: 1200,
    refreshRate: 60.002,
    x: 5120,
    y: 0,
    scale: 1,
    focused: false,
    disabled: true,
    availableModes: ["1920x1200@60.00Hz", "1920x1080@60.00Hz"],
  },
  {
    name: "HDMI-A-1",
    description: "Left monitor",
    width: 2560,
    height: 1080,
    refreshRate: 59.978,
    x: 0,
    y: 0,
    scale: 1,
    focused: true,
    disabled: false,
    availableModes: ["2560x1080@59.98Hz", "1920x1080@60.00Hz"],
  },
  {
    name: "DP-2",
    description: "Right monitor",
    width: 2560,
    height: 1080,
    refreshRate: 59.978,
    x: 2560,
    y: 0,
    scale: 1,
    focused: false,
    disabled: false,
    availableModes: ["2560x1080@59.98Hz", "1920x1080@60.00Hz"],
  },
])

test("parseHyprMonitorsJson parses enabled and disabled outputs", () => {
  const outputs = parseHyprMonitorsJson(HYPR_MONITORS_ALL)

  assert.equal(outputs.length, 3)
  assert.equal(outputs[0].connector, "eDP-1")
  assert.equal(outputs[0].enabled, false)
  assert.equal(outputs[0].mode, "1920x1200@60Hz")
  assert.equal(outputs[1].connector, "HDMI-A-1")
  assert.equal(outputs[1].enabled, true)
  assert.equal(outputs[1].logicalWidth, 2560)
  assert.equal(outputs[1].transform, 0)
  assert.equal(outputs[2].x, 2560)
})

test("setOutputScale recalculates logical size", () => {
  const profile = createDisplayProfile("current", parseHyprMonitorsJson(HYPR_MONITORS_ALL))
  const scaled = setOutputScale(profile, "HDMI-A-1", 1.25)
  const output = scaled.outputs.find((item) => item.connector === "HDMI-A-1")

  assert.ok(output)
  assert.equal(output.scale, 1.25)
  assert.equal(output.logicalWidth, 2048)
  assert.equal(output.logicalHeight, 864)
})

test("setOutputMode updates mode while keeping availableModes", () => {
  const profile = createDisplayProfile("current", parseHyprMonitorsJson(HYPR_MONITORS_ALL))
  const next = setOutputMode(profile, "DP-2", "1920x1080@60.00Hz")
  const output = next.outputs.find((item) => item.connector === "DP-2")

  assert.ok(output)
  assert.equal(output.mode, "1920x1080@60.00Hz")
  assert.equal(output.logicalWidth, 1920)
  assert.ok(output.availableModes.includes("2560x1080@59.98Hz"))
})

test("setOutputTransform stores rotation and recalculates logical size", () => {
  const profile = createDisplayProfile("current", parseHyprMonitorsJson(HYPR_MONITORS_ALL))
  const next = setOutputTransform(profile, "DP-2", 1)
  const output = next.outputs.find((item) => item.connector === "DP-2")

  assert.ok(output)
  assert.equal(output.transform, 1)
  assert.equal(output.logicalWidth, 1080)
  assert.equal(output.logicalHeight, 2560)
  assert.equal(
    buildApplyCommands(next).find((command) => command[3].startsWith("DP-2,"))?.[3],
    "DP-2,2560x1080@59.98,2560x0,1,transform,1",
  )
})

test("applyHorizontalPreset reflows enabled outputs side by side", () => {
  const profile = createDisplayProfile("current", parseHyprMonitorsJson(HYPR_MONITORS_ALL))
  const next = applyHorizontalPreset(profile)

  const left = next.outputs.find((item) => item.connector === "HDMI-A-1")
  const right = next.outputs.find((item) => item.connector === "DP-2")
  const disabled = next.outputs.find((item) => item.connector === "eDP-1")

  assert.ok(left)
  assert.ok(right)
  assert.ok(disabled)
  assert.equal(left.x, 0)
  assert.equal(right.x, left.logicalWidth)
  assert.equal(left.y, 0)
  assert.equal(right.y, 0)
  assert.equal(disabled.enabled, false)
})

test("applySwapHorizontalPreset reverses enabled output order", () => {
  const profile = createDisplayProfile("current", parseHyprMonitorsJson(HYPR_MONITORS_ALL))
  const next = applySwapHorizontalPreset(profile)

  const left = next.outputs.find((item) => item.connector === "HDMI-A-1")
  const right = next.outputs.find((item) => item.connector === "DP-2")

  assert.ok(left)
  assert.ok(right)
  assert.equal(right.x, 0)
  assert.equal(left.x, right.logicalWidth)
})

test("applySingleOutputPreset disables all but selected output", () => {
  const profile = createDisplayProfile("current", parseHyprMonitorsJson(HYPR_MONITORS_ALL))
  const next = applySingleOutputPreset(profile, "DP-2")

  assert.equal(next.outputs.find((item) => item.connector === "DP-2")?.enabled, true)
  assert.equal(next.outputs.find((item) => item.connector === "DP-2")?.x, 0)
  assert.equal(next.outputs.find((item) => item.connector === "DP-2")?.y, 0)
  assert.equal(next.outputs.find((item) => item.connector === "HDMI-A-1")?.enabled, false)
  assert.equal(next.outputs.find((item) => item.connector === "eDP-1")?.enabled, false)
})

test("snapOutputPosition snaps to a neighboring output edge", () => {
  const profile = createDisplayProfile("current", parseHyprMonitorsJson(HYPR_MONITORS_ALL))
  const snapped = snapOutputPosition(profile, "DP-2", 2542, 5)

  assert.deepEqual(snapped, { x: 2560, y: 0 })
})

test("buildApplyCommands normalizes origins and emits enable/disable commands", () => {
  const profile = createDisplayProfile("current", parseHyprMonitorsJson(HYPR_MONITORS_ALL))
  const adjusted = setOutputScale(profile, "DP-2", 1.25)
  const commands = buildApplyCommands(adjusted)

  assert.deepEqual(commands, [
    ["hyprctl", "keyword", "monitor", "HDMI-A-1,2560x1080@59.98,0x0,1,transform,0"],
    ["hyprctl", "keyword", "monitor", "DP-2,2560x1080@59.98,2560x0,1.25,transform,0"],
    ["hyprctl", "keyword", "monitor", "eDP-1,disable"],
  ])
})

test("buildApplyCommands rejects profiles that disable every output", () => {
  const profile = applySingleOutputPreset(
    createDisplayProfile("current", parseHyprMonitorsJson(HYPR_MONITORS_ALL)),
    "DP-2",
  )
  const allDisabled = {
    ...profile,
    outputs: profile.outputs.map((output) => ({ ...output, enabled: false })),
  }

  assert.throws(() => buildApplyCommands(allDisabled), /at least one output/)
})

test("serializeDisplayProfiles and parseDisplayProfilesFile round-trip", () => {
  const current = createDisplayProfile("current", parseHyprMonitorsJson(HYPR_MONITORS_ALL))
  const swapped = applySwapHorizontalPreset(current)
  const stored = upsertDisplayProfile([], { ...swapped, name: "desk-dual" })
  const json = serializeDisplayProfiles(stored)
  const parsed = parseDisplayProfilesFile(json)

  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].name, "desk-dual")
  assert.equal(parsed[0].outputs.find((item) => item.connector === "DP-2")?.x, 0)
})
