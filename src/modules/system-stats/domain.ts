export interface ProcessInfo {
  pid: number
  name: string
  cpu: number
}

export interface SystemStatsSnapshot {
  cpuPercent: number
  topProcesses: ProcessInfo[]
}

export function parsePsOutput(output: string, limit: number): ProcessInfo[] {
  return output
    .split("\n")
    .slice(1) // skip header
    .filter((line) => line.trim().length > 0)
    .slice(0, limit)
    .map((line) => {
      const parts = line.trim().split(/\s+/)
      const pid = parseInt(parts[0], 10)
      const cpu = parseFloat(parts[1])
      const name = (parts[2] ?? "").replace(/^.*\//, "").replace(/[[\]()]/g, "")
      return { pid, name, cpu }
    })
    .filter((p) => !isNaN(p.pid) && !isNaN(p.cpu))
}
