import type { HealthTone } from "../../shared/health.ts"

export type BatteryState = "charging" | "discharging" | "full" | "not-charging" | "unknown"

export interface BatterySnapshot {
  present: boolean
  percent: number
  state: BatteryState
  energyNowWh: number | null
  energyFullWh: number | null
  powerNowW: number | null
}

export function normalizeBatteryState(raw: string | null | undefined): BatteryState {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "charging":
      return "charging"
    case "discharging":
      return "discharging"
    case "full":
      return "full"
    case "not charging":
      return "not-charging"
    default:
      return "unknown"
  }
}

export function estimateBatteryMinutes(snapshot: BatterySnapshot): number | null {
  if (!snapshot.present || snapshot.powerNowW == null || snapshot.powerNowW <= 0) {
    return null
  }

  if (snapshot.state === "discharging" && snapshot.energyNowWh != null) {
    return (snapshot.energyNowWh / snapshot.powerNowW) * 60
  }

  if (
    snapshot.state === "charging" &&
    snapshot.energyNowWh != null &&
    snapshot.energyFullWh != null &&
    snapshot.energyFullWh >= snapshot.energyNowWh
  ) {
    return ((snapshot.energyFullWh - snapshot.energyNowWh) / snapshot.powerNowW) * 60
  }

  return null
}

export function batteryTone(snapshot: BatterySnapshot | null): HealthTone {
  if (!snapshot || !snapshot.present) {
    return "muted"
  }

  if (snapshot.state === "charging" || snapshot.state === "full" || snapshot.state === "not-charging") {
    return "healthy"
  }

  if (snapshot.percent <= 15) {
    return "critical"
  }

  if (snapshot.percent <= 35) {
    return "warning"
  }

  return "healthy"
}
