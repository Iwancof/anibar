import type { BarIndicatorViewModel } from "../../shared/bar-indicator.ts"
import { formatPercent } from "../../shared/format.ts"
import { batteryTone, type BatterySnapshot } from "./domain.ts"

function batteryIcon(snapshot: BatterySnapshot | null): string {
  if (!snapshot || !snapshot.present) return "BAT?"

  if (snapshot.state === "charging") return "BAT+"

  if (snapshot.percent <= 15) return "BAT!"
  if (snapshot.percent <= 35) return "BAT_"
  return "BAT"
}

export function toBatteryBarIndicator(
  snapshot: BatterySnapshot | null,
): BarIndicatorViewModel {
  return {
    id: "battery",
    icon: batteryIcon(snapshot),
    label: snapshot?.present ? formatPercent(snapshot.percent) : "--",
    tone: batteryTone(snapshot),
  }
}
