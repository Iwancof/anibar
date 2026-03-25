import { createState } from "gnim"

import type { NetworkSnapshot } from "./domain.ts"
import type { NetworkSource } from "./ports.ts"

export const networkPreviewStates: NetworkSnapshot[] = [
  {
    online: true,
    interfaceName: "wlan0",
    connectionName: "home-wifi",
    linkKind: "wifi",
    downBps: 7_200_000,
    upBps: 820_000,
    tailscaleOnline: true,
  },
  {
    online: true,
    interfaceName: "enp3s0",
    connectionName: "dock-ethernet",
    linkKind: "ethernet",
    downBps: 31_500_000,
    upBps: 4_800_000,
    tailscaleOnline: false,
  },
  {
    online: false,
    interfaceName: null,
    connectionName: null,
    linkKind: "offline",
    downBps: 0,
    upBps: 0,
    tailscaleOnline: false,
  },
]

export function createMockNetworkSource(initial = networkPreviewStates[0]): NetworkSource {
  const [snapshot] = createState(initial)
  return { snapshot }
}
