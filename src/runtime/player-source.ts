import { subprocess } from "ags/process"
import { createState, createMemo, type Accessor } from "gnim"

import { safeExec } from "./command.ts"

export interface PlayerSnapshot {
  artist: string
  title: string
  status: "Playing" | "Paused" | "Stopped"
}

export interface PlayerSource {
  snapshot: Accessor<PlayerSnapshot | null>
  isPlaying: Accessor<boolean>
  label: Accessor<string>
  playPause: () => void
  next: () => void
  previous: () => void
}

export function createPlayerSource(): PlayerSource {
  const [snapshot, setSnapshot] = createState<PlayerSnapshot | null>(null)

  function parseLine(line: string): PlayerSnapshot | null {
    const parts = line.split("|||")
    if (parts.length < 3) return null
    const status = parts[2] as PlayerSnapshot["status"]
    if (!["Playing", "Paused", "Stopped"].includes(status)) return null
    return { artist: parts[0], title: parts[1], status }
  }

  subprocess(
    ["playerctl", "metadata", "--format", "{{artist}}|||{{title}}|||{{status}}", "--follow"],
    (line) => {
      const parsed = parseLine(line)
      if (parsed) setSnapshot(parsed)
    },
  )

  const isPlaying = createMemo(() => snapshot()?.status === "Playing")

  const label = createMemo(() => {
    const s = snapshot()
    if (!s) return ""
    const artist = s.artist || "Unknown"
    const title = s.title || "Unknown"
    return `${artist} - ${title}`
  })

  return {
    snapshot,
    isPlaying,
    label,
    playPause: () => safeExec(["playerctl", "play-pause"]),
    next: () => safeExec(["playerctl", "next"]),
    previous: () => safeExec(["playerctl", "previous"]),
  }
}
