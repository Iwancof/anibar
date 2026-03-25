import assert from "node:assert/strict"
import test from "node:test"

import { parseWpctlVolume, volumeTone } from "../../src/modules/volume/domain.ts"
import { toVolumeViewModel } from "../../src/modules/volume/view-model.ts"
import { toVolumeBarIndicator } from "../../src/modules/volume/bar-view-model.ts"

test("parseWpctlVolume parses normal output", () => {
  const result = parseWpctlVolume("Volume: 0.40")
  assert.equal(result.volume, 0.4)
  assert.equal(result.muted, false)
})

test("parseWpctlVolume parses muted output", () => {
  const result = parseWpctlVolume("Volume: 0.40 [MUTED]")
  assert.equal(result.volume, 0.4)
  assert.equal(result.muted, true)
})

test("volumeTone returns muted when sink is muted", () => {
  assert.equal(
    volumeTone({ sinkVolume: 0.5, sinkMuted: true, sourceVolume: 1, sourceMuted: false }),
    "muted",
  )
})

test("volumeTone returns warning when volume exceeds 100%", () => {
  assert.equal(
    volumeTone({ sinkVolume: 1.2, sinkMuted: false, sourceVolume: 1, sourceMuted: false }),
    "warning",
  )
})

test("volumeTone returns healthy for normal volume", () => {
  assert.equal(
    volumeTone({ sinkVolume: 0.4, sinkMuted: false, sourceVolume: 1, sourceMuted: false }),
    "healthy",
  )
})

test("toVolumeViewModel shows Muted headline when muted", () => {
  const vm = toVolumeViewModel({ sinkVolume: 0.4, sinkMuted: true, sourceVolume: 1, sourceMuted: false })
  assert.equal(vm.headline, "Muted")
  assert.equal(vm.tone, "muted")
})

test("toVolumeBarIndicator shows percentage", () => {
  const bi = toVolumeBarIndicator({ sinkVolume: 0.4, sinkMuted: false, sourceVolume: 1, sourceMuted: false })
  assert.equal(bi.id, "volume")
  assert.equal(bi.label, "40%")
  assert.equal(bi.tone, "healthy")
})

test("toVolumeBarIndicator shows Mute when muted", () => {
  const bi = toVolumeBarIndicator({ sinkVolume: 0.4, sinkMuted: true, sourceVolume: 1, sourceMuted: false })
  assert.equal(bi.label, "Mute")
})
