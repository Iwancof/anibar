import { createState } from "gnim"

import type { VolumeSnapshot } from "./domain.ts"
import type { VolumeSource } from "./ports.ts"

export const volumePreviewStates: VolumeSnapshot[] = [
  {
    sinkVolume: 0.4,
    sinkMuted: false,
    sourceVolume: 1.0,
    sourceMuted: false,
  },
  {
    sinkVolume: 0.0,
    sinkMuted: true,
    sourceVolume: 0.5,
    sourceMuted: false,
  },
  {
    sinkVolume: 1.2,
    sinkMuted: false,
    sourceVolume: 1.0,
    sourceMuted: true,
  },
]

export function createMockVolumeSource(initial = volumePreviewStates[0]): VolumeSource {
  const [snapshot] = createState<VolumeSnapshot | null>(initial)
  return { snapshot }
}
