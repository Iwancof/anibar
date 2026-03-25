import { subprocess } from "ags/process"
import { createState } from "gnim"

import { parseWpctlVolume, type VolumeSnapshot } from "../modules/volume/domain.ts"
import type { VolumeSource } from "../modules/volume/ports.ts"
import { safeExec } from "./command.ts"

async function readVolumeSnapshot(): Promise<VolumeSnapshot | null> {
  const [sinkOut, sourceOut] = await Promise.all([
    safeExec(["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"]),
    safeExec(["wpctl", "get-volume", "@DEFAULT_AUDIO_SOURCE@"]),
  ])

  if (!sinkOut) return null

  const sink = parseWpctlVolume(sinkOut)
  const source = parseWpctlVolume(sourceOut)

  return {
    sinkVolume: sink.volume,
    sinkMuted: sink.muted,
    sourceVolume: source.volume,
    sourceMuted: source.muted,
  }
}

export function createVolumeSource(): VolumeSource {
  const [snapshot, setSnapshot] = createState<VolumeSnapshot | null>(null)

  // 初回読み込み
  readVolumeSnapshot().then(setSnapshot)

  // pactl subscribe で sink/source の変更イベントを監視し、即時更新
  subprocess(
    ["pactl", "subscribe"],
    (line) => {
      if (line.includes("sink") || line.includes("source") || line.includes("server")) {
        readVolumeSnapshot().then(setSnapshot)
      }
    },
  )

  return { snapshot }
}
