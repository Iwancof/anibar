import { createPoll } from "ags/time"

import type { Accessor } from "gnim"

import {
  parseWifiList,
  parseNmcliIpInfo,
  parseIpInfoJson,
  type WifiSnapshot,
  type GlobalIpInfo,
} from "../modules/wifi/domain.ts"
import { safeExec } from "./command.ts"

const WIFI_POLL_MS = 30_000
const IP_CACHE_MS = 60_000

export interface WifiSource {
  snapshot: Accessor<WifiSnapshot>
  connect: (ssid: string, password?: string) => Promise<boolean>
  rescan: () => Promise<void>
}

let cachedGlobalIp: GlobalIpInfo | null = null
let lastIpFetchMs = 0

async function fetchGlobalIp(): Promise<GlobalIpInfo | null> {
  const now = Date.now()
  if (cachedGlobalIp && now - lastIpFetchMs < IP_CACHE_MS) {
    return cachedGlobalIp
  }
  const raw = await safeExec(["curl", "-s", "--connect-timeout", "5", "https://ipinfo.io/json"])
  const parsed = parseIpInfoJson(raw)
  if (parsed) {
    cachedGlobalIp = parsed
    lastIpFetchMs = now
  }
  return cachedGlobalIp
}

async function fetchActiveInterface(): Promise<string | null> {
  const out = await safeExec(["nmcli", "-t", "-f", "DEVICE,TYPE,STATE", "device", "status"])
  for (const line of out.split("\n")) {
    const [device, type, state] = line.split(":")
    if (state?.trim() === "connected" && type?.trim() === "wifi") {
      return device?.trim() ?? null
    }
  }
  return null
}

async function fetchIpInfo(iface: string): Promise<{ localIp: string | null; gateway: string | null }> {
  const out = await safeExec(["nmcli", "-t", "-f", "IP4.ADDRESS,IP4.GATEWAY", "device", "show", iface])
  return parseNmcliIpInfo(out)
}

const EMPTY: WifiSnapshot = {
  connected: null,
  networks: [],
  localIp: null,
  gateway: null,
  globalIp: null,
}

export function createWifiSource(): WifiSource {
  const snapshot = createPoll<WifiSnapshot>(EMPTY, WIFI_POLL_MS, async () => {
    const [wifiOutput, globalIp, activeIface] = await Promise.all([
      safeExec(["nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY,BSSID,IN-USE", "device", "wifi", "list", "--rescan", "no"]),
      fetchGlobalIp(),
      fetchActiveInterface(),
    ])

    const networks = parseWifiList(wifiOutput)
    const connected = networks.find((n) => n.inUse) ?? null

    let localIp: string | null = null
    let gateway: string | null = null
    if (activeIface) {
      const ipInfo = await fetchIpInfo(activeIface)
      localIp = ipInfo.localIp
      gateway = ipInfo.gateway
    }

    return { connected, networks, localIp, gateway, globalIp }
  })

  async function connect(ssid: string, password?: string): Promise<boolean> {
    const args = ["nmcli", "device", "wifi", "connect", ssid]
    if (password) {
      args.push("password", password)
    }
    const result = await safeExec(args)
    return result.includes("successfully")
  }

  async function rescan(): Promise<void> {
    await safeExec(["nmcli", "device", "wifi", "rescan"])
  }

  return { snapshot, connect, rescan }
}
