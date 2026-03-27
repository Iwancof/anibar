import GLib from "gi://GLib?version=2.0"
import { createState, type Accessor } from "gnim"
import { safeExec } from "./command.ts"

const PING_INTERVAL_MS = 2_000
const IW_INTERVAL_MS = 5_000
const JITTER_WINDOW = 10

export interface QualitySnapshot {
  rtt: number | null
  jitter: number | null
  loss: number
  linkSpeed: number | null
  rssi: number | null
  channel: number | null
}

const EMPTY: QualitySnapshot = {
  rtt: null,
  jitter: null,
  loss: 0,
  linkSpeed: null,
  rssi: null,
  channel: null,
}

export interface QualitySource {
  snapshot: Accessor<QualitySnapshot>
}

async function detectWifiIface(): Promise<string | null> {
  const out = await safeExec(["nmcli", "-t", "-f", "DEVICE,TYPE,STATE", "device", "status"])
  for (const line of out.split("\n")) {
    const [device, type, state] = line.split(":")
    if (state?.trim() === "connected" && type?.trim() === "wifi") {
      return device?.trim() ?? null
    }
  }
  return null
}

function parsePingRtt(output: string): number | null {
  // "time=12.3 ms"
  const match = output.match(/time=([\d.]+)\s*ms/)
  return match ? Number(match[1]) : null
}

function parseStationDump(output: string): { linkSpeed: number | null; rssi: number | null } {
  let linkSpeed: number | null = null
  let rssi: number | null = null

  for (const line of output.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("signal:")) {
      const m = trimmed.match(/signal:\s*(-?\d+)/)
      if (m) rssi = Number(m[1])
    }
    if (trimmed.startsWith("tx bitrate:")) {
      const m = trimmed.match(/tx bitrate:\s*([\d.]+)/)
      if (m) linkSpeed = Number(m[1])
    }
  }
  return { linkSpeed, rssi }
}

function parseIwInfo(output: string): { channel: number | null } {
  for (const line of output.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("channel")) {
      const m = trimmed.match(/channel\s+(\d+)/)
      if (m) return { channel: Number(m[1]) }
    }
  }
  return { channel: null }
}

export function createQualitySource(): QualitySource {
  const [snapshot, setSnapshot] = createState<QualitySnapshot>(EMPTY)

  let rttHistory: number[] = []
  let pingLossCount = 0
  let pingTotalCount = 0
  let wifiIface: string | null = null

  // Detect Wi-Fi interface
  detectWifiIface().then((iface) => {
    wifiIface = iface
  })

  // Re-detect Wi-Fi interface every 30s
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30_000, () => {
    detectWifiIface().then((iface) => {
      wifiIface = iface
    })
    return GLib.SOURCE_CONTINUE
  })

  // Ping polling
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, PING_INTERVAL_MS, () => {
    safeExec(["ping", "-c", "1", "-W", "1", "1.1.1.1"]).then((out) => {
      pingTotalCount++
      const rtt = parsePingRtt(out)

      if (rtt == null) {
        pingLossCount++
      } else {
        rttHistory.push(rtt)
        if (rttHistory.length > JITTER_WINDOW) {
          rttHistory = rttHistory.slice(-JITTER_WINDOW)
        }
      }

      // Calculate jitter as mean absolute deviation of recent RTTs
      let jitter: number | null = null
      if (rttHistory.length >= 2) {
        const mean = rttHistory.reduce((a, b) => a + b, 0) / rttHistory.length
        jitter = rttHistory.reduce((a, b) => a + Math.abs(b - mean), 0) / rttHistory.length
      }

      const loss = pingTotalCount > 0 ? (pingLossCount / pingTotalCount) * 100 : 0

      const prev = snapshot()
      setSnapshot({
        ...prev,
        rtt: rtt ?? prev.rtt,
        jitter,
        loss,
      })
    })
    return GLib.SOURCE_CONTINUE
  })

  // iw polling
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, IW_INTERVAL_MS, () => {
    if (!wifiIface) return GLib.SOURCE_CONTINUE

    Promise.all([
      safeExec(["iw", "dev", wifiIface, "station", "dump"]),
      safeExec(["iw", "dev", wifiIface, "info"]),
    ]).then(([stationOut, infoOut]) => {
      const { linkSpeed, rssi } = parseStationDump(stationOut)
      const { channel } = parseIwInfo(infoOut)

      const prev = snapshot()
      setSnapshot({
        ...prev,
        linkSpeed,
        rssi,
        channel,
      })
    })
    return GLib.SOURCE_CONTINUE
  })

  return { snapshot }
}
