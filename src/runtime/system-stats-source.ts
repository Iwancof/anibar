import { createPoll } from "ags/time"

import { parsePsOutput, type SystemStatsSnapshot } from "../modules/system-stats/domain.ts"
import type { SystemStatsSource } from "../modules/system-stats/ports.ts"
import { safeExec } from "./command.ts"
import { readTextFile } from "./fs.ts"

const POLL_MS = 3_000
const TOP_N = 3

let prevIdle = 0
let prevTotal = 0

function readCpuPercent(): number {
  const line = readTextFile("/proc/stat")
  if (!line) return 0

  const cpuLine = line.split("\n")[0]
  const parts = cpuLine.replace(/^cpu\s+/, "").split(/\s+/).map(Number)
  const idle = parts[3] + (parts[4] ?? 0)
  const total = parts.reduce((a, b) => a + b, 0)

  const dIdle = idle - prevIdle
  const dTotal = total - prevTotal
  prevIdle = idle
  prevTotal = total

  if (dTotal === 0) return 0
  return Math.round(((dTotal - dIdle) / dTotal) * 100)
}

async function readSnapshot(): Promise<SystemStatsSnapshot> {
  const cpuPercent = readCpuPercent()
  const psOut = await safeExec(["ps", "aux", "--sort=-%cpu"])
  const topProcesses = parsePsOutput(psOut, TOP_N)
  return { cpuPercent, topProcesses }
}

export function createSystemStatsSource(): SystemStatsSource {
  const snapshot = createPoll<SystemStatsSnapshot | null>(null, POLL_MS, readSnapshot)
  return { snapshot }
}
