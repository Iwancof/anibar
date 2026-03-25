import type { HealthTone } from "../../shared/health.ts"

import {
  countHealthyServices,
  serviceHealthTone,
  type ServiceHealthSnapshot,
} from "./domain.ts"

export interface ServiceHealthRowViewModel {
  label: string
  state: string
}

export interface ServiceHealthViewModel {
  title: string
  headline: string
  detail: string
  meta: string
  footer: string
  tone: HealthTone
  rows: ServiceHealthRowViewModel[]
}

export function toServiceHealthViewModel(snapshot: ServiceHealthSnapshot): ServiceHealthViewModel {
  if (snapshot.services.length === 0) {
    return {
      title: "Services",
      headline: "No services",
      detail: "No service health checks are configured yet.",
      meta: "Add systemd units to the runtime adapter.",
      footer: "Service card is currently idle.",
      tone: "muted",
      rows: [],
    }
  }

  const healthy = countHealthyServices(snapshot)
  const failing = snapshot.services.filter(
    (service) => service.state === "failed" || service.state === "inactive",
  )

  return {
    title: "Services",
    headline: `${healthy}/${snapshot.services.length} healthy`,
    detail:
      failing.length > 0
        ? `${failing.map((service) => service.displayName).join(", ")} need attention.`
        : "Critical desktop services are healthy.",
    meta: "Watching NetworkManager, resolved, dnscrypt-proxy and tailscaled.",
    footer:
      failing.length > 0
        ? "Investigate failed or inactive units first."
        : "No degraded units detected in the starter set.",
    tone: serviceHealthTone(snapshot),
    rows: snapshot.services.map((service) => ({
      label: service.displayName,
      state: service.state,
    })),
  }
}
