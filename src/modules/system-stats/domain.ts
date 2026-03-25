export interface ProcessInfo {
  pid: number
  name: string
  cpu: number
}

export interface SystemStatsSnapshot {
  cpuPercent: number
  topProcesses: ProcessInfo[]
}

// top -bn1 format: PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ COMMAND
// Header lines (7) are skipped by caller
export function parseTopOutput(output: string, limit: number): ProcessInfo[] {
  const lines = output.split("\n")
  // Skip header lines (everything before the PID line)
  const dataStart = lines.findIndex((l) => l.trimStart().startsWith("PID"))
  if (dataStart < 0) return []

  return lines
    .slice(dataStart + 1)
    .filter((line) => line.trim().length > 0)
    .slice(0, limit)
    .map((line) => {
      const parts = line.trim().split(/\s+/)
      const pid = parseInt(parts[0], 10)
      const cpu = parseFloat(parts[8])
      const command = (parts[11] ?? "").replace(/\+$/, "")
      const cleaned = command.replace(/[[\]()]/g, "")
      // Only extract basename for absolute paths (starting with /)
      const name = cleaned.startsWith("/") ? cleaned.replace(/^.*\//, "") : cleaned
      return { pid, name, cpu }
    })
    .filter((p) => !isNaN(p.pid) && !isNaN(p.cpu) && p.name.length > 0)
}
