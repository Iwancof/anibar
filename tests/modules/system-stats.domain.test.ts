import assert from "node:assert/strict"
import test from "node:test"

import { parseTopOutput } from "../../src/modules/system-stats/domain.ts"

const SAMPLE_TOP = `top - 08:33:47 up  3:00,  1 user,  load average: 1.23, 1.45, 0.94
Tasks: 312 total, 1 running, 311 sleeping, 0 stopped, 0 zombie
%Cpu(s):  3.4 us,  4.6 sy,  0.0 ni, 91.6 id,  0.0 wa,  0.2 hi,  0.2 si,  0.0 st
MiB Mem :  88127.3 total,  76466.7 free,   6853.8 used,   5110.7 buff/cache
MiB Swap: 102400.0 total, 102400.0 free,      0.0 used.  81273.5 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 106211 iwancof   20   0  457940  14456   8544 S  43.4   0.0   0:56.75 btop
  16020 iwancof   20   0   73.3g   1.0g 174628 S  19.7   1.2  14:34.33 claude
    129 root     -51   0       0      0      0 S   7.9   0.0  33:00.96 irq/9-a+
  49639 root      20   0  319568  13520   9756 S   7.9   0.0  10:55.34 upowerd
    682 root      20   0   39104  12576   8124 S   3.9   0.0   3:19.32 systemd+`

test("parseTopOutput parses top -bn1 output correctly", () => {
  const result = parseTopOutput(SAMPLE_TOP, 3, 16)
  assert.equal(result.length, 3)

  assert.equal(result[0].pid, 106211)
  assert.equal(result[0].cpu, 2.7) // 43.4 / 16
  assert.equal(result[0].name, "btop")

  assert.equal(result[1].pid, 16020)
  assert.equal(result[1].cpu, 1.2) // 19.7 / 16
  assert.equal(result[1].name, "claude")

  assert.equal(result[2].pid, 129)
  assert.equal(result[2].cpu, 0.5) // 7.9 / 16
  assert.equal(result[2].name, "irq/9-a")
})

test("parseTopOutput with numCpus=1 keeps raw values", () => {
  const result = parseTopOutput(SAMPLE_TOP, 1, 1)
  assert.equal(result[0].cpu, 43.4)
})

test("parseTopOutput handles truncated command names", () => {
  const result = parseTopOutput(SAMPLE_TOP, 5, 1)
  assert.equal(result[3].name, "upowerd")
  assert.equal(result[4].name, "systemd")
})

test("parseTopOutput respects limit", () => {
  const result = parseTopOutput(SAMPLE_TOP, 2, 1)
  assert.equal(result.length, 2)
})

test("parseTopOutput handles empty input", () => {
  const result = parseTopOutput("", 3, 1)
  assert.equal(result.length, 0)
})
