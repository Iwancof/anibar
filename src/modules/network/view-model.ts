import { formatBytesPerSecond } from "../../shared/format.ts"
import type { HealthTone } from "../../shared/health.ts"

import { networkTone, type NetworkLinkKind, type NetworkSnapshot } from "./domain.ts"

export interface NetworkViewModel {
  title: string
  headline: string
  detail: string
  meta: string
  footer: string
  tone: HealthTone
}

function labelForKind(kind: NetworkLinkKind): string {
  switch (kind) {
    case "wifi":
      return "Wi-Fi"
    case "ethernet":
      return "Ethernet"
    case "vpn":
      return "VPN"
    case "other":
      return "Network"
    case "offline":
      return "Offline"
  }
}

export function toNetworkViewModel(snapshot: NetworkSnapshot): NetworkViewModel {
  if (!snapshot.online) {
    return {
      title: "Network",
      headline: "Offline",
      detail: "No active uplink is available.",
      meta: "Bring a link up to start throughput sampling.",
      footer: snapshot.tailscaleOnline ? "Tailscale still reachable." : "Tailscale is down.",
      tone: "critical",
    }
  }

  const headline = snapshot.connectionName ?? snapshot.interfaceName ?? "Connected"

  return {
    title: "Network",
    headline,
    detail: `${labelForKind(snapshot.linkKind)} • ↓ ${formatBytesPerSecond(snapshot.downBps)} • ↑ ${formatBytesPerSecond(snapshot.upBps)}`,
    meta: `Interface: ${snapshot.interfaceName ?? "unknown"} • Tailscale ${snapshot.tailscaleOnline ? "up" : "down"}`,
    footer: snapshot.tailscaleOnline
      ? "Primary link and tailnet look healthy."
      : "Primary link is up, but tailnet is unavailable.",
    tone: networkTone(snapshot),
  }
}
