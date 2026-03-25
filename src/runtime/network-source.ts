import { createPoll } from "ags/time"

import { parseNmcliDeviceStatus, type NetworkSnapshot } from "../modules/network/domain.ts"
import type { NetworkSource } from "../modules/network/ports.ts"
import { safeExec } from "./command.ts"
import { fileExists, readNumberFile, readTextFile } from "./fs.ts"

const NETWORK_POLL_MS = 2_000

const OFFLINE_SNAPSHOT: NetworkSnapshot = {
  online: false,
  interfaceName: null,
  connectionName: null,
  linkKind: "offline",
  downBps: 0,
  upBps: 0,
  tailscaleOnline: false,
}

function readInterfaceBytes(interfaceName: string, direction: "rx" | "tx"): number | null {
  return readNumberFile(`/sys/class/net/${interfaceName}/statistics/${direction}_bytes`)
}

function isTailscaleOnline(): boolean {
  const operstatePath = "/sys/class/net/tailscale0/operstate"
  if (!fileExists(operstatePath)) {
    return false
  }

  const state = readTextFile(operstatePath)
  return state === "up" || state === "unknown"
}

export function createNetworkSource(): NetworkSource {
  let lastSample:
    | {
        interfaceName: string
        rxBytes: number
        txBytes: number
        timestampMs: number
      }
    | null = null

  const snapshot = createPoll<NetworkSnapshot>(OFFLINE_SNAPSHOT, NETWORK_POLL_MS, async () => {
    const summary = parseNmcliDeviceStatus(
      await safeExec(["nmcli", "-t", "-f", "DEVICE,TYPE,STATE,CONNECTION", "device", "status"]),
    )

    if (!summary || !summary.interfaceName) {
      lastSample = null
      return {
        ...OFFLINE_SNAPSHOT,
        tailscaleOnline: isTailscaleOnline(),
      }
    }

    const rxBytes = readInterfaceBytes(summary.interfaceName, "rx")
    const txBytes = readInterfaceBytes(summary.interfaceName, "tx")
    const timestampMs = Date.now()
    const tailscaleOnline = isTailscaleOnline()

    let downBps = 0
    let upBps = 0

    if (
      rxBytes != null &&
      txBytes != null &&
      lastSample != null &&
      lastSample.interfaceName === summary.interfaceName
    ) {
      const elapsedSeconds = Math.max(1, (timestampMs - lastSample.timestampMs) / 1000)
      downBps = Math.max(0, (rxBytes - lastSample.rxBytes) / elapsedSeconds)
      upBps = Math.max(0, (txBytes - lastSample.txBytes) / elapsedSeconds)
    }

    if (rxBytes != null && txBytes != null) {
      lastSample = {
        interfaceName: summary.interfaceName,
        rxBytes,
        txBytes,
        timestampMs,
      }
    } else {
      lastSample = null
    }

    return {
      ...summary,
      downBps,
      upBps,
      tailscaleOnline,
    }
  })

  return { snapshot }
}
