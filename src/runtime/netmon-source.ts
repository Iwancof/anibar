import GLib from "gi://GLib?version=2.0"

import { subprocess } from "ags/process"
import { createState, type Accessor } from "gnim"

import { safeExec } from "./command.ts"

// ── Config ──

interface NetworkPanelConfig {
  logFilter: string[]
  reverseDnsCacheTtlMs: number
}

const DEFAULT_CONFIG: NetworkPanelConfig = {
  logFilter: ["127.0.0.1", "::1"],
  reverseDnsCacheTtlMs: 300_000,
}

function loadConfig(): NetworkPanelConfig {
  const path = `${GLib.get_home_dir()}/.config/ags/network-panel.json`
  try {
    const [ok, contents] = GLib.file_get_contents(path)
    if (!ok || !contents) return DEFAULT_CONFIG
    const decoder = new TextDecoder()
    const parsed = JSON.parse(decoder.decode(contents))
    return {
      logFilter: parsed.logFilter ?? DEFAULT_CONFIG.logFilter,
      reverseDnsCacheTtlMs:
        parsed.reverseDnsCacheTtlMs ?? DEFAULT_CONFIG.reverseDnsCacheTtlMs,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

const config = loadConfig()

// ── Reverse DNS Cache ──

interface DnsCacheEntry {
  hostname: string
  expiry: number
}

const dnsCache = new Map<string, DnsCacheEntry>()

async function resolveHostname(ip: string): Promise<string> {
  const now = GLib.get_monotonic_time() / 1000 // ms
  const cached = dnsCache.get(ip)
  if (cached && cached.expiry > now) return cached.hostname

  const result = await safeExec(["getent", "hosts", ip])
  // getent hosts output: "8.8.8.8         dns.google"
  const parts = result.trim().split(/\s+/)
  const hostname = parts.length >= 2 ? parts[1] : ip

  dnsCache.set(ip, {
    hostname,
    expiry: now + config.reverseDnsCacheTtlMs,
  })
  return hostname
}

// ── Flows ──

export interface FlowEntry {
  proto: string
  srcIp: string
  srcPort: string
  dstIp: string
  dstPort: string
  state: string
  hostname: string
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
      hostname: "",
    })
  }
  return entries
}

async function resolveFlowHostnames(entries: FlowEntry[]): Promise<FlowEntry[]> {
  const uniqueIps = [...new Set(entries.map((e) => e.dstIp))]
  const resolved = new Map<string, string>()
  await Promise.all(
    uniqueIps.map(async (ip) => {
      resolved.set(ip, await resolveHostname(ip))
    }),
  )
  return entries.map((e) => ({
    ...e,
    hostname: resolved.get(e.dstIp) ?? e.dstIp,
  }))
}

const FLOW_POLL_MS = 2_000

export interface FlowsSource {
  flows: Accessor<FlowEntry[]>
}

export function createFlowsSource(): FlowsSource {
  const [flows, setFlows] = createState<FlowEntry[]>([])

  // 初回取得
  safeExec(["sudo", "netmonctl", "flows"]).then(async (out) => {
    const entries = parseFlows(out)
    setFlows(entries)
    setFlows(await resolveFlowHostnames(entries))
  })

  // 定期ポーリング
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, FLOW_POLL_MS, () => {
    safeExec(["sudo", "netmonctl", "flows"]).then(async (out) => {
      const entries = parseFlows(out)
      setFlows(entries)
      setFlows(await resolveFlowHostnames(entries))
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
  /\[(\d+\.\d+)\]\s+\[(\w+)\]\s+\w+\s+\d+\s+\d+\s+(\w+)\s+src=(\S+)\s+dst=(\S+)\s+sport=\d+\s+dport=(\d+)/

function shouldFilterLog(line: string): boolean {
  for (const filter of config.logFilter) {
    if (line.includes(`src=${filter}`) || line.includes(`dst=${filter}`)) {
      return true
    }
  }
  return false
}

function parseEvent(line: string): LogEntry | null {
  const m = line.match(EVENT_RE)
  if (!m) return null
  return {
    timestamp: new Date(parseFloat(m[1]) * 1000)
      .toLocaleTimeString("en-GB", { hour12: false }),
    event: m[2],
    state: m[3],
    dstIp: m[5],
    dstPort: m[6],
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
      if (shouldFilterLog(line)) return
      const entry = parseEvent(line)
      if (!entry) return
      setLogs((prev) => [entry, ...prev].slice(0, MAX_LOG_BUFFER))
    },
  )

  return { logs }
}
