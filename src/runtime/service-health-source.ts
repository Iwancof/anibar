import { createPoll } from "ags/time"

import {
  normalizeServiceState,
  type ServiceHealthSnapshot,
} from "../modules/service-health/domain.ts"
import type { ServiceHealthSource } from "../modules/service-health/ports.ts"
import { safeExec } from "./command.ts"

const SERVICE_HEALTH_POLL_MS = 5_000

const WATCHED_SERVICES = [
  { name: "NetworkManager", displayName: "NetworkManager" },
  { name: "systemd-resolved", displayName: "resolved" },
  { name: "dnscrypt-proxy", displayName: "dnscrypt" },
  { name: "tailscaled", displayName: "tailscaled" },
]

export function createServiceHealthSource(): ServiceHealthSource {
  const snapshot = createPoll<ServiceHealthSnapshot>(
    { services: [] },
    SERVICE_HEALTH_POLL_MS,
    async () => {
      const services = await Promise.all(
        WATCHED_SERVICES.map(async (service) => ({
          ...service,
          state: normalizeServiceState(await safeExec(["systemctl", "is-active", service.name])),
        })),
      )

      return { services }
    },
  )

  return { snapshot }
}
