import assert from "node:assert/strict"
import test from "node:test"

import { computeMonitorDiff } from "../../src/shared/monitor-diff.ts"

test("empty registry + 1 current monitor → toAdd only", () => {
  const diff = computeMonitorDiff([], ["eDP-1"])
  assert.deepEqual(diff.toAdd, ["eDP-1"])
  assert.deepEqual(diff.toRemove, [])
})

test("disappearing monitor is marked for removal", () => {
  const diff = computeMonitorDiff(["eDP-1", "DP-1"], ["DP-1"])
  assert.deepEqual(diff.toAdd, [])
  assert.deepEqual(diff.toRemove, ["eDP-1"])
})

test("newly-plugged monitor is marked for add", () => {
  const diff = computeMonitorDiff(["eDP-1"], ["eDP-1", "HDMI-A-1"])
  assert.deepEqual(diff.toAdd, ["HDMI-A-1"])
  assert.deepEqual(diff.toRemove, [])
})

test("simultaneous add and remove are detected in one pass", () => {
  const diff = computeMonitorDiff(["eDP-1", "DP-1"], ["DP-1", "HDMI-A-1"])
  assert.deepEqual(diff.toRemove, ["eDP-1"])
  assert.deepEqual(diff.toAdd, ["HDMI-A-1"])
})

test("identical sets produce empty diff", () => {
  const diff = computeMonitorDiff(["eDP-1", "DP-1", "DP-2"], ["DP-2", "eDP-1", "DP-1"])
  assert.deepEqual(diff.toAdd, [])
  assert.deepEqual(diff.toRemove, [])
})

test("works with arbitrary iterables (Map.keys())", () => {
  const registry = new Map([
    ["eDP-1", {}],
    ["DP-1", {}],
  ])
  const current = new Set(["DP-1"])
  const diff = computeMonitorDiff(registry.keys(), current)
  assert.deepEqual(diff.toRemove, ["eDP-1"])
  assert.deepEqual(diff.toAdd, [])
})
