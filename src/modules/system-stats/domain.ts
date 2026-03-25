export interface ProcessInfo {
  pid: number
  name: string
  cpu: number
}

export interface SystemStatsSnapshot {
  cpuPercent: number
  topProcesses: ProcessInfo[]
}

// ps aux format: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND...
export function parsePsOutput(output: string, limit: number): ProcessInfo[] {
  return output
    .split("\n")
    .slice(1) // skip header
    .filter((line) => line.trim().length > 0)
    .slice(0, limit)
    .map((line) => {
      const parts = line.trim().split(/\s+/)
      const pid = parseInt(parts[1], 10)
      const cpu = parseFloat(parts[2])
      const command = parts.slice(10).join(" ")
      const isWrapped = /^[[\(]/.test(command)
      const cleaned = command.replace(/[[\]()]/g, "")
      const name = isWrapped ? cleaned.split(/\s/)[0] : cleaned.replace(/^.*\//, "").split(/\s/)[0]
      return { pid, name, cpu }
    })
    .filter((p) => !isNaN(p.pid) && !isNaN(p.cpu) && p.name.length > 0)
}
