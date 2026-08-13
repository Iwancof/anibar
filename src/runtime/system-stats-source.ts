import { createState, type Accessor } from "gnim"

import { parseTopOutput, type SystemStatsSnapshot } from "../modules/system-stats/domain.ts"
import type { SystemStatsSource } from "../modules/system-stats/ports.ts"
import { safeExec } from "./command.ts"
import { readNumberFile, readTextFile } from "./fs.ts"
import { pollWhile } from "./visibility-gate.ts"

import GLib from "gi://GLib?version=2.0"

const POLL_MS = 3_000
const TOP_N = 3
const NUM_CPUS = GLib.get_num_processors()

let prevIdle = 0
let prevTotal = 0

// hwmon の index はブートごとに変わるので name で解決する
function findHwmon(name: string): string | null {
  const base = "/sys/class/hwmon"
  try {
    const dir = GLib.Dir.open(base, 0)
    let entry: string | null
    while ((entry = dir.read_name()) !== null) {
      if (readTextFile(`${base}/${entry}/name`) === name) return `${base}/${entry}`
    }
  } catch {
    // hwmon 不在 (コンテナ等) は温度なしで動く
  }
  return null
}

const CPU_TEMP_PATH = findHwmon("k10temp")
const NVME_TEMP_PATH = findHwmon("nvme")
const FAN_PATH = findHwmon("thinkpad")

function readTempC(hwmonPath: string | null): number | null {
  if (!hwmonPath) return null
  const milli = readNumberFile(`${hwmonPath}/temp1_input`)
  return milli != null ? Math.round(milli / 1000) : null
}

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
  const topOut = await safeExec(["top", "-bn1", "-o", "%CPU"])
  const topProcesses = parseTopOutput(topOut, TOP_N, NUM_CPUS)
  return {
    cpuPercent,
    topProcesses,
    cpuTempC: readTempC(CPU_TEMP_PATH),
    nvmeTempC: readTempC(NVME_TEMP_PATH),
    fanRpm: FAN_PATH ? readNumberFile(`${FAN_PATH}/fan1_input`) : null,
  }
}

export function createSystemStatsSource(active: Accessor<boolean>): SystemStatsSource {
  const [snapshot, setSnapshot] = createState<SystemStatsSnapshot | null>(null)

  // top -bn1 は全プロセス走査で重いので、表示パネルが開いている間のみ実行
  pollWhile(active, POLL_MS, () => {
    readSnapshot().then(setSnapshot)
  })

  return { snapshot }
}
