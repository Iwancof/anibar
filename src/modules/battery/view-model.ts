import { formatDurationMinutes, formatPercent, formatWatts } from "../../shared/format.ts"
import type { HealthTone } from "../../shared/health.ts"

import { batteryTone, estimateBatteryMinutes, type BatterySnapshot } from "./domain.ts"

export interface BatteryViewModel {
  title: string
  headline: string
  detail: string
  meta: string
  footer: string
  tone: HealthTone
}

export function toBatteryViewModel(snapshot: BatterySnapshot | null): BatteryViewModel {
  if (!snapshot || !snapshot.present) {
    return {
      title: "Battery",
      headline: "No battery",
      detail: "No system battery was detected.",
      meta: "Attach power data later if this is a desktop profile.",
      footer: "Source: /sys/class/power_supply/BAT*",
      tone: "muted",
    }
  }

  const eta = estimateBatteryMinutes(snapshot)
  const stateLabel =
    snapshot.state === "charging"
      ? "Charging"
      : snapshot.state === "discharging"
        ? "On battery"
        : snapshot.state === "full"
          ? "Fully charged"
          : snapshot.state === "not-charging"
            ? "On AC (not charging)"
            : "Battery state unknown"

  const etaLabel =
    eta == null
      ? stateLabel
      : snapshot.state === "charging"
        ? `${stateLabel} • ${formatDurationMinutes(eta)} to full`
        : `${stateLabel} • ${formatDurationMinutes(eta)} remaining`

  const energyLabel =
    snapshot.energyNowWh != null && snapshot.energyFullWh != null
      ? `${snapshot.energyNowWh.toFixed(1)} / ${snapshot.energyFullWh.toFixed(1)} Wh`
      : "Energy data unavailable"

  return {
    title: "Battery",
    headline: formatPercent(snapshot.percent),
    detail: etaLabel,
    meta: `${energyLabel} • ${formatWatts(snapshot.powerNowW)}`,
    footer: snapshot.percent <= 15 ? "Low battery threshold reached." : "Battery telemetry healthy.",
    tone: batteryTone(snapshot),
  }
}
