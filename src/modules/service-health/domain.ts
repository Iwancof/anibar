import type { HealthTone } from "../../shared/health.ts"

export type ServiceState = "active" | "activating" | "inactive" | "failed" | "unknown"

export interface ServiceSnapshot {
  name: string
  displayName: string
  state: ServiceState
}

export interface ServiceHealthSnapshot {
  services: ServiceSnapshot[]
}

export function normalizeServiceState(raw: string | null | undefined): ServiceState {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "active":
      return "active"
    case "activating":
      return "activating"
    case "inactive":
      return "inactive"
    case "failed":
      return "failed"
    default:
      return "unknown"
  }
}

export function serviceHealthTone(snapshot: ServiceHealthSnapshot): HealthTone {
  if (snapshot.services.length === 0) {
    return "muted"
  }

  if (snapshot.services.some((service) => service.state === "failed" || service.state === "inactive")) {
    return "critical"
  }

  if (snapshot.services.some((service) => service.state === "activating" || service.state === "unknown")) {
    return "warning"
  }

  return "healthy"
}

export function countHealthyServices(snapshot: ServiceHealthSnapshot): number {
  return snapshot.services.filter((service) => service.state === "active").length
}
