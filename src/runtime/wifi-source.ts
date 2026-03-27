import GLib from "gi://GLib?version=2.0"

import { createState, type Accessor } from "gnim"

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
let cachedTorIp: GlobalIpInfo | null = null
let lastTorFetchMs = 0

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

async function fetchTorIp(): Promise<GlobalIpInfo | null> {
  const now = Date.now()
  if (cachedTorIp && now - lastTorFetchMs < IP_CACHE_MS) {
    return cachedTorIp
  }
  const raw = await safeExec([
    "curl", "-s", "--socks5-hostname", "127.0.0.1:9050",
    "--connect-timeout", "10", "https://ipinfo.io/json",
  ])
  const parsed = parseIpInfoJson(raw)
  if (parsed) {
    cachedTorIp = parsed
    lastTorFetchMs = now
  }
  return cachedTorIp
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
  torIp: null,
}

async function fetchSnapshot(): Promise<WifiSnapshot> {
  const [wifiOutput, globalIp, torIp, activeIface] = await Promise.all([
    safeExec(["nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY,BSSID,IN-USE", "device", "wifi", "list", "--rescan", "no"]),
    fetchGlobalIp(),
    fetchTorIp(),
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

  return { connected, networks, localIp, gateway, globalIp, torIp }
}

export function createWifiSource(): WifiSource {
  const [snapshot, setSnapshot] = createState<WifiSnapshot>(EMPTY)

  // 初回取得
  fetchSnapshot().then(setSnapshot)

  // 定期ポーリング
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, WIFI_POLL_MS, () => {
    fetchSnapshot().then(setSnapshot)
    return GLib.SOURCE_CONTINUE
  })

  async function refresh() {
    const snap = await fetchSnapshot()
    setSnapshot(snap)
  }

  async function connect(ssid: string, password?: string): Promise<boolean> {
    const args = ["nmcli", "device", "wifi", "connect", ssid]
    if (password) {
      args.push("password", password)
    }
    const result = await safeExec(args)
    // 接続後に即更新
    await refresh()
    return result.includes("successfully")
  }

  async function rescan(): Promise<void> {
    await safeExec(["nmcli", "device", "wifi", "rescan"])
    // rescan 完了後少し待ってからリスト再取得
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
      refresh()
      return GLib.SOURCE_REMOVE
    })
  }

  return { snapshot, connect, rescan }
}
