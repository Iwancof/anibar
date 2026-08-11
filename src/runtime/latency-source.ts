import { createState, type Accessor } from "gnim"
import { safeExec } from "./command.ts"
import { pollWhile } from "./visibility-gate.ts"

const LATENCY_POLL_MS = 2_000

export interface LatencyTarget {
  label: string
  key: string
  ms: number
}

export interface LatencySnapshot {
  targets: LatencyTarget[]
}

const LABELS: Record<string, string> = {
  gw: "Gateway",
  cf: "Cloudflare",
  google: "Google",
  tor: "Tor",
}

const EMPTY: LatencySnapshot = {
  targets: [
    { label: "Gateway", key: "gw", ms: -1 },
    { label: "Cloudflare", key: "cf", ms: -1 },
    { label: "Google", key: "google", ms: -1 },
    { label: "Tor", key: "tor", ms: -1 },
  ],
}

function parsePingMulti(raw: string): LatencySnapshot {
  if (!raw) return EMPTY
  try {
    const obj = JSON.parse(raw) as Record<string, number>
    const targets: LatencyTarget[] = []
    for (const key of ["gw", "cf", "google", "tor"]) {
      const ms = obj[key] ?? -1
      targets.push({ label: LABELS[key] ?? key, key, ms })
    }
    return { targets }
  } catch {
    return EMPTY
  }
}

async function fetchLatency(): Promise<LatencySnapshot> {
  const raw = await safeExec(["sudo", "netmonctl", "ping-multi"])
  return parsePingMulti(raw)
}

export interface LatencySource {
  snapshot: Accessor<LatencySnapshot>
}

export function createLatencySource(active: Accessor<boolean>): LatencySource {
  const [snapshot, setSnapshot] = createState<LatencySnapshot>(EMPTY)

  // パネル可視時のみ実行 (sudo netmonctl ping-multi を常時 2秒毎に叩かない)
  pollWhile(active, LATENCY_POLL_MS, () => {
    fetchLatency().then(setSnapshot)
  })

  return { snapshot }
}
