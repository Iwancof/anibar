import GLib from "gi://GLib?version=2.0"

import { subprocess } from "ags/process"
import { createState, type Accessor } from "gnim"

import { safeExec } from "./command.ts"

// ── Flows ──

export interface FlowEntry {
  proto: string
  srcIp: string
  srcPort: string
  dstIp: string
  dstPort: string
  state: string
}

const FLOW_RE =
  /ESTABLISHED\s+src=(\S+)\s+dst=(\S+)\s+sport=(\d+)\s+dport=(\d+)/

function parseFlows(output: string): FlowEntry[] {
  if (!output.trim()) return []
  const entries: FlowEntry[] = []
  for (const line of output.split("\n")) {
    if (!line.trim()) continue
    const m = line.match(FLOW_RE)
    if (!m) continue
    const proto = line.startsWith("ipv6") ? "tcp6" : "tcp"
    entries.push({
      proto,
      srcIp: m[1],
      srcPort: m[3],
      dstIp: m[2],
      dstPort: m[4],
      state: "ESTABLISHED",
    })
  }
  return entries
}

const FLOW_POLL_MS = 2_000

export interface FlowsSource {
  flows: Accessor<FlowEntry[]>
}

export function createFlowsSource(): FlowsSource {
  const [flows, setFlows] = createState<FlowEntry[]>([])

  // 初回取得
  safeExec(["sudo", "netmonctl", "flows"]).then((out) => {
    setFlows(parseFlows(out))
  })

  // 定期ポーリング
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, FLOW_POLL_MS, () => {
    safeExec(["sudo", "netmonctl", "flows"]).then((out) => {
      setFlows(parseFlows(out))
    })
    return GLib.SOURCE_CONTINUE
  })

  return { flows }
}

// ── Log (Events) ──

export interface LogEntry {
  timestamp: string
  event: string // "NEW" | "UPDATE" | "DESTROY"
  state: string // "ESTABLISHED" | "SYN_SENT" | "FIN_WAIT" | "CLOSE" etc.
  dstIp: string
  dstPort: string
}

const EVENT_RE =
  /\[(\d+\.\d+)\]\s+\[(\w+)\]\s+\w+\s+\d+\s+\d+\s+(\w+)\s+src=\S+\s+dst=(\S+)\s+sport=\d+\s+dport=(\d+)/

function parseEvent(line: string): LogEntry | null {
  const m = line.match(EVENT_RE)
  if (!m) return null
  return {
    timestamp: new Date(parseFloat(m[1]) * 1000)
      .toLocaleTimeString("en-GB", { hour12: false }),
    event: m[2],
    state: m[3],
    dstIp: m[4],
    dstPort: m[5],
  }
}

const MAX_LOG_BUFFER = 30

export interface LogSource {
  logs: Accessor<LogEntry[]>
}

export function createLogSource(): LogSource {
  const [logs, setLogs] = createState<LogEntry[]>([])

  subprocess(
    ["sudo", "netmonctl", "events"],
    (line) => {
      const entry = parseEvent(line)
      if (!entry) return
      setLogs((prev) => [entry, ...prev].slice(0, MAX_LOG_BUFFER))
    },
  )

  return { logs }
}
