import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { SessionSnapshot } from "../../runtime/session-source.ts"
import InfoRow from "../../shared/ui/InfoRow.tsx"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"

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
      <SectionHeader label="SESSION" />
      <InfoRow label="Uptime" value={duration} tone="accent" />
      <InfoRow label="Reconnects" value={reconnects} />
      <InfoRow label="Last Drop" value={lastDrop} />
    </box>
  )
}
