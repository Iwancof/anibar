import type { BarIndicatorViewModel } from "../../shared/bar-indicator.ts"
import { formatPercent } from "../../shared/format.ts"
import { volumeTone, type VolumeSnapshot } from "./domain.ts"

function volumeIcon(snapshot: VolumeSnapshot | null): string {
  if (!snapshot) return "VOL?"
  if (snapshot.sinkMuted) return "MUTE"
  if (snapshot.sinkVolume > 1.0) return "VOL!"
  if (snapshot.sinkVolume > 0.5) return "VOL"
  if (snapshot.sinkVolume > 0) return "VOL_"
  return "VOL0"
}

export function toVolumeBarIndicator(
  snapshot: VolumeSnapshot | null,
): BarIndicatorViewModel {
  return {
    id: "volume",
    icon: volumeIcon(snapshot),
    label: snapshot
      ? snapshot.sinkMuted
        ? "Mute"
        : formatPercent(snapshot.sinkVolume * 100)
      : "--",
    tone: volumeTone(snapshot),
  }
}
