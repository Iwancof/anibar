import type { HealthTone } from "../../shared/health.ts"

export interface VolumeSnapshot {
  sinkVolume: number   // 0.0–1.0+ (wpctl allows >1.0)
  sinkMuted: boolean
  sourceVolume: number
  sourceMuted: boolean
}

export function volumeTone(snapshot: VolumeSnapshot | null): HealthTone {
  if (!snapshot) return "muted"
  if (snapshot.sinkMuted) return "muted"
  if (snapshot.sinkVolume > 1.0) return "warning"
  return "healthy"
}

export function parseWpctlVolume(output: string): { volume: number; muted: boolean } {
  // Format: "Volume: 0.40" or "Volume: 0.40 [MUTED]"
  const match = output.match(/Volume:\s+([\d.]+)/)
  const volume = match ? parseFloat(match[1]) : 0
  const muted = output.includes("[MUTED]")
  return { volume, muted }
}
