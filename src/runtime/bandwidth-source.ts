import GLib from "gi://GLib?version=2.0"
import { createState, type Accessor } from "gnim"
import { readTextFile } from "./fs.ts"
import { safeExec } from "./command.ts"

const POLL_MS = 500
const BUFFER_SIZE = 80

export interface BandwidthSample {
  txBps: number
  rxBps: number
}

export interface BandwidthSnapshot {
  iface: string | null
  currentTx: number
  currentRx: number
  history: BandwidthSample[]
}

const EMPTY: BandwidthSnapshot = {
  iface: null,
  currentTx: 0,
  currentRx: 0,
  history: [],
}

async function detectDefaultIface(): Promise<string | null> {
  const out = await safeExec(["ip", "route", "get", "1.1.1.1"])
  const match = out.match(/dev\s+(\S+)/)
  return match?.[1] ?? null
}

function readBytes(iface: string, direction: "rx" | "tx"): number | null {
  const path = `/sys/class/net/${iface}/statistics/${direction}_bytes`
  const raw = readTextFile(path)
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export interface BandwidthSource {
  snapshot: Accessor<BandwidthSnapshot>
}

export function createBandwidthSource(): BandwidthSource {
  const [snapshot, setSnapshot] = createState<BandwidthSnapshot>(EMPTY)

  const ringBuffer: BandwidthSample[] = []
  let prevTx: number | null = null
  let prevRx: number | null = null
  let currentIface: string | null = null

  // Detect interface then start polling
  detectDefaultIface().then((iface) => {
    currentIface = iface
    if (!iface) return

    // Read initial values
    prevTx = readBytes(iface, "tx")
    prevRx = readBytes(iface, "rx")

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_MS, () => {
      if (!currentIface) return GLib.SOURCE_REMOVE

      const nowTx = readBytes(currentIface, "tx")
      const nowRx = readBytes(currentIface, "rx")

      if (nowTx != null && nowRx != null && prevTx != null && prevRx != null) {
        const dtx = Math.max(0, nowTx - prevTx)
        const drx = Math.max(0, nowRx - prevRx)
        // Convert to bytes/sec (poll interval is 500ms)
        const txBps = dtx * (1000 / POLL_MS)
        const rxBps = drx * (1000 / POLL_MS)

        ringBuffer.push({ txBps, rxBps })
        if (ringBuffer.length > BUFFER_SIZE) {
          ringBuffer.shift()
        }

        setSnapshot({
          iface: currentIface,
          currentTx: txBps,
          currentRx: rxBps,
          history: [...ringBuffer],
        })
      }

      prevTx = nowTx
      prevRx = nowRx
      return GLib.SOURCE_CONTINUE
    })

    // Re-detect interface every 30s
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30_000, () => {
      detectDefaultIface().then((iface) => {
        if (iface && iface !== currentIface) {
          currentIface = iface
          prevTx = readBytes(iface, "tx")
          prevRx = readBytes(iface, "rx")
          ringBuffer.length = 0
        }
      })
      return GLib.SOURCE_CONTINUE
    })
  })

  return { snapshot }
}
