import assert from "node:assert/strict"
import test from "node:test"

import {
  formatBytesPerSecond,
  formatDurationMinutes,
  formatPercent,
  placeholder,
  timeAgo,
} from "../../src/shared/format.ts"

test("formatPercent clamps values to 0..100", () => {
  assert.equal(formatPercent(-4), "0%")
  assert.equal(formatPercent(52.4), "52%")
  assert.equal(formatPercent(132), "100%")
})

test("formatBytesPerSecond scales values with binary units", () => {
  assert.equal(formatBytesPerSecond(0), "0.00 B/s")
  assert.equal(formatBytesPerSecond(1536), "1.50 KiB/s")
  assert.equal(formatBytesPerSecond(5_242_880), "5.00 MiB/s")
})

test("formatDurationMinutes renders short human labels", () => {
  assert.equal(formatDurationMinutes(15), "15m")
  assert.equal(formatDurationMinutes(60), "1h")
  assert.equal(formatDurationMinutes(125), "2h 5m")
})

test("placeholder renders empty data with the design-system dash", () => {
  assert.equal(placeholder(null), "—")
  assert.equal(placeholder(undefined), "—")
  assert.equal(placeholder("hci0"), "hci0")
})

test("timeAgo renders compact notification ages", () => {
  const now = Math.floor(Date.now() / 1000)

  assert.equal(timeAgo(now), "now")
  assert.equal(timeAgo(now - 5 * 60), "5m")
  assert.equal(timeAgo(now - 2 * 3600), "2h")
  assert.equal(timeAgo(now - 3 * 86400), "3d")
})
