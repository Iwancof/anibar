import { createState, type Accessor } from "gnim"
import { safeExec } from "./command.ts"
import { pollWhile } from "./visibility-gate.ts"

const SESSION_POLL_MS = 5_000

export interface SessionSnapshot {
  connectedSeconds: number
  reconnects: number
  lastDropAgo: string
}

const EMPTY: SessionSnapshot = {
  connectedSeconds: 0,
  reconnects: 0,
  lastDropAgo: "—",
}

async function fetchActiveWifiInterface(): Promise<string | null> {
  const out = await safeExec(["nmcli", "-t", "-f", "DEVICE,TYPE,STATE", "device", "status"])
  for (const line of out.split("\n")) {
    const [device, type, state] = line.split(":")
    if (state?.trim() === "connected" && type?.trim() === "wifi") {
      return device?.trim() ?? null
    }
  }
  return null
}

function parseStationDump(raw: string): number {
  const match = raw.match(/connected time:\s*(\d+)\s*seconds/)
  return match ? parseInt(match[1], 10) : 0
}

let prevConnectedSeconds = 0
let reconnectCount = 0
let lastDropTime: number | null = null

async function fetchSession(): Promise<SessionSnapshot> {
  const iface = await fetchActiveWifiInterface()
  if (!iface) return EMPTY

  const raw = await safeExec(["iw", "dev", iface, "station", "dump"])
  const connectedSeconds = parseStationDump(raw)

  // Detect reconnect: connected time decreased
  if (prevConnectedSeconds > 0 && connectedSeconds < prevConnectedSeconds - 10) {
    reconnectCount++
    lastDropTime = Date.now()
  }
  prevConnectedSeconds = connectedSeconds

  let lastDropAgo = "—"
  if (lastDropTime != null) {
    const agoSec = Math.floor((Date.now() - lastDropTime) / 1000)
    if (agoSec < 60) lastDropAgo = `${agoSec}s ago`
    else if (agoSec < 3600) lastDropAgo = `${Math.floor(agoSec / 60)}m ago`
    else lastDropAgo = `${Math.floor(agoSec / 3600)}h ago`
  }

  return { connectedSeconds, reconnects: reconnectCount, lastDropAgo }
}

export interface SessionSource {
  snapshot: Accessor<SessionSnapshot>
}

export function createSessionSource(active: Accessor<boolean>): SessionSource {
  const [snapshot, setSnapshot] = createState<SessionSnapshot>(EMPTY)

  // パネル可視時のみポーリング (nmcli + iw の fork を常時走らせない)。
  // 注: reconnect 検出も可視時のみ観測になる (閉じている間の切断は数えない)
  pollWhile(active, SESSION_POLL_MS, () => {
    fetchSession().then(setSnapshot)
  })

  return { snapshot }
}
