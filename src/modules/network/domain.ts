import type { HealthTone } from "../../shared/health.ts"

export type NetworkLinkKind = "wifi" | "ethernet" | "vpn" | "other" | "offline"

export interface NetworkSnapshot {
  online: boolean
  interfaceName: string | null
  connectionName: string | null
  linkKind: NetworkLinkKind
  downBps: number
  upBps: number
  tailscaleOnline: boolean
}

export function networkTone(snapshot: NetworkSnapshot): HealthTone {
  if (!snapshot.online) {
    return "critical"
  }

  if (!snapshot.tailscaleOnline) {
    return "warning"
  }

  return "healthy"
}

export function mapNmcliType(raw: string): NetworkLinkKind {
  switch (raw.trim().toLowerCase()) {
    case "wifi":
      return "wifi"
    case "ethernet":
      return "ethernet"
    case "tun":
    case "wireguard":
      return "vpn"
    default:
      return "other"
  }
}

export function parseNmcliDeviceStatus(output: string): Pick<
  NetworkSnapshot,
  "online" | "interfaceName" | "connectionName" | "linkKind"
> | null {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return null
  }

  const ranked = lines
    .map((line) => {
      const [device = "", type = "", state = "", ...connectionParts] = line.split(":")
      const connectionName = connectionParts.join(":").trim() || null

      return {
        device: device.trim(),
        type: type.trim(),
        state: state.trim().toLowerCase(),
        connectionName,
      }
    })
    .filter((line) => line.device.length > 0)
    .sort((left, right) => {
      const leftScore = left.state === "connected" ? 2 : left.state === "connecting" ? 1 : 0
      const rightScore = right.state === "connected" ? 2 : right.state === "connecting" ? 1 : 0
      return rightScore - leftScore
    })

  const active = ranked.find((line) => line.state === "connected" || line.state === "connecting")
  if (!active) {
    return null
  }

  return {
    online: active.state === "connected" || active.state === "connecting",
    interfaceName: active.device,
    connectionName: active.connectionName,
    linkKind: mapNmcliType(active.type),
  }
}
