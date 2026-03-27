import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { SessionSnapshot } from "../../runtime/session-source.ts"

export interface SessionSectionProps {
  sessionSnapshot: Accessor<SessionSnapshot>
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00"
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

export default function SessionSection(props: SessionSectionProps) {
  const duration = createMemo(() => formatDuration(props.sessionSnapshot().connectedSeconds))
  const reconnects = createMemo(() => String(props.sessionSnapshot().reconnects))
  const lastDrop = createMemo(() => props.sessionSnapshot().lastDropAgo || "—")

  return (
    <box class="NpSection" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <box class="NpSectionHeader" spacing={6}>
        <label class="NpSectionLabel" label="SESSION" />
        <box class="NpSectionLine" hexpand valign={Gtk.Align.CENTER} />
      </box>
      <box spacing={4}>
        <label class="NpInfoLabel" label="Uptime" />
        <label class="NpInfoValueCyan" label={duration} />
      </box>
      <box spacing={8}>
        <box spacing={4}>
          <label class="NpInfoLabel" label="Reconnects" />
          <label class="NpInfoValue" label={reconnects} />
        </box>
        <box spacing={4}>
          <label class="NpInfoLabel" label="Last Drop" />
          <label class="NpInfoValue" label={lastDrop} />
        </box>
      </box>
    </box>
  )
}
