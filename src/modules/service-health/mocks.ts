import { createState } from "gnim"

import type { ServiceHealthSnapshot } from "./domain.ts"
import type { ServiceHealthSource } from "./ports.ts"

export const serviceHealthPreviewStates: ServiceHealthSnapshot[] = [
  {
    services: [
      { name: "NetworkManager", displayName: "NetworkManager", state: "active" },
      { name: "systemd-resolved", displayName: "resolved", state: "active" },
      { name: "dnscrypt-proxy", displayName: "dnscrypt", state: "active" },
      { name: "tailscaled", displayName: "tailscaled", state: "active" },
    ],
  },
  {
    services: [
      { name: "NetworkManager", displayName: "NetworkManager", state: "active" },
      { name: "systemd-resolved", displayName: "resolved", state: "active" },
      { name: "dnscrypt-proxy", displayName: "dnscrypt", state: "failed" },
      { name: "tailscaled", displayName: "tailscaled", state: "active" },
    ],
  },
  {
    services: [
      { name: "NetworkManager", displayName: "NetworkManager", state: "active" },
      { name: "systemd-resolved", displayName: "resolved", state: "unknown" },
      { name: "dnscrypt-proxy", displayName: "dnscrypt", state: "activating" },
      { name: "tailscaled", displayName: "tailscaled", state: "inactive" },
    ],
  },
]

export function createMockServiceHealthSource(
  initial = serviceHealthPreviewStates[0],
): ServiceHealthSource {
  const [snapshot] = createState(initial)
  return { snapshot }
}
