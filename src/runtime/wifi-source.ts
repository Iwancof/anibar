import { createPoll } from "ags/time"

import type { Accessor } from "gnim"
import { safeExec } from "./command.ts"

const WIFI_POLL_MS = 5_000
const IP_POLL_MS = 30_000

export interface WifiAccessPoint {
  ssid: string
  signal: number
  security: string
  inUse: boolean
}

export interface WifiSnapshot {
  accessPoints: WifiAccessPoint[]
  globalIp: string | null
}

export interface WifiSource {
  snapshot: Accessor<WifiSnapshot>
  connect: (ssid: string) => Promise<boolean>
}

function parseWifiList(output: string): WifiAccessPoint[] {
  if (!output.trim()) return []

  const seen = new Set<string>()
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      // nmcli -t uses : as separator — SSID:SIGNAL:SECURITY:IN-USE
      const parts = line.split(":")
      if (parts.length < 4) return null

      const inUseRaw = parts.pop()!.trim()
      const security = parts.pop()!.trim()
      const signalRaw = parts.pop()!.trim()
      // remaining parts are SSID (may contain colons)
      const ssid = parts.join(":").trim()

      if (!ssid) return null

      const signal = parseInt(signalRaw, 10) || 0
      const inUse = inUseRaw === "*"

      return { ssid, signal, security, inUse }
    })
    .filter((ap): ap is WifiAccessPoint => {
      if (!ap) return false
      if (seen.has(ap.ssid)) return false
      seen.add(ap.ssid)
      return true
    })
    .sort((a, b) => {
      // Connected first, then by signal strength
      if (a.inUse !== b.inUse) return a.inUse ? -1 : 1
      return b.signal - a.signal
    })
}

let cachedGlobalIp: string | null = null
let lastIpFetchMs = 0

async function fetchGlobalIp(): Promise<string | null> {
  const now = Date.now()
  if (cachedGlobalIp && now - lastIpFetchMs < IP_POLL_MS) {
    return cachedGlobalIp
  }
  const ip = await safeExec(["curl", "-s", "--max-time", "3", "https://ifconfig.me"])
  if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    cachedGlobalIp = ip
    lastIpFetchMs = now
  }
  return cachedGlobalIp
}

const EMPTY: WifiSnapshot = { accessPoints: [], globalIp: null }

export function createWifiSource(): WifiSource {
  const snapshot = createPoll<WifiSnapshot>(EMPTY, WIFI_POLL_MS, async () => {
    const [wifiOutput, globalIp] = await Promise.all([
      safeExec(["nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY,IN-USE", "device", "wifi", "list", "--rescan", "no"]),
      fetchGlobalIp(),
    ])

    return {
      accessPoints: parseWifiList(wifiOutput),
      globalIp,
    }
  })

  async function connect(ssid: string): Promise<boolean> {
    const result = await safeExec(["nmcli", "device", "wifi", "connect", ssid])
    return result.includes("successfully")
  }

  return { snapshot, connect }
}
