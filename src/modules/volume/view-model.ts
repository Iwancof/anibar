import { formatPercent } from "../../shared/format.ts"
import type { HealthTone } from "../../shared/health.ts"

import { volumeTone, type VolumeSnapshot } from "./domain.ts"

export interface VolumeViewModel {
  title: string
  headline: string
  detail: string
  meta: string | null
  footer: string | null
  tone: HealthTone
}

export function toVolumeViewModel(snapshot: VolumeSnapshot | null): VolumeViewModel {
  if (!snapshot) {
    return {
      title: "Volume",
      headline: "--",
      detail: "No audio data available.",
      meta: null,
      footer: null,
      tone: "muted",
    }
  }

  const sinkPct = formatPercent(snapshot.sinkVolume * 100)
  const sourcePct = formatPercent(snapshot.sourceVolume * 100)

  return {
    title: "Volume",
    headline: snapshot.sinkMuted ? "Muted" : sinkPct,
    detail: snapshot.sinkMuted ? `Output muted (${sinkPct})` : `Output ${sinkPct}`,
    meta: `Mic: ${snapshot.sourceMuted ? "Muted" : sourcePct}`,
    footer: snapshot.sinkVolume > 1.0 ? "Output exceeds 100%." : null,
    tone: volumeTone(snapshot),
  }
}
