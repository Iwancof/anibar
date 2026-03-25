import assert from "node:assert/strict"
import test from "node:test"

import { parsePsOutput } from "../../src/modules/system-stats/domain.ts"

const SAMPLE_PS = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         129 18.4  0.0      0     0 ?        S    05:32  31:56 [irq/9-acpi]
root       54498 14.4  0.0  39108 14104 ?        S    07:01  12:11 (udev-worker)
root       49639 11.6  0.0 319568 13512 ?        Ssl  06:56  10:28 /usr/lib/upowerd
iwancof    16020  8.6  1.2 1234567 89012 ?       Sl   06:00   5:30 /usr/bin/claude --arg
iwancof     1842  4.2  3.1  456789 12345 ?       Sl   05:40   3:12 /usr/lib/firefox/firefox`

test("parsePsOutput parses ps aux output correctly", () => {
  const result = parsePsOutput(SAMPLE_PS, 3)
  assert.equal(result.length, 3)

  assert.equal(result[0].pid, 129)
  assert.equal(result[0].cpu, 18.4)
  assert.equal(result[0].name, "irq/9-acpi")

  assert.equal(result[1].pid, 54498)
  assert.equal(result[1].cpu, 14.4)
  assert.equal(result[1].name, "udev-worker")

  assert.equal(result[2].pid, 49639)
  assert.equal(result[2].cpu, 11.6)
  assert.equal(result[2].name, "upowerd")
})

test("parsePsOutput extracts command basename", () => {
  const result = parsePsOutput(SAMPLE_PS, 5)

  assert.equal(result[3].name, "claude")
  assert.equal(result[4].name, "firefox")
})

test("parsePsOutput respects limit", () => {
  const result = parsePsOutput(SAMPLE_PS, 2)
  assert.equal(result.length, 2)
})

test("parsePsOutput handles empty input", () => {
  const result = parsePsOutput("", 3)
  assert.equal(result.length, 0)
})
