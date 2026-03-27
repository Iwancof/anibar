import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { LatencySnapshot } from "../../runtime/latency-source.ts"

const MAX_MS = 200

export interface LatencySectionProps {
  latencySnapshot: Accessor<LatencySnapshot>
}

function latencyColor(ms: number): string {
  if (ms < 0) return "NpLatencyUnknown"
  if (ms < 30) return "NpLatencyGood"
  if (ms < 100) return "NpLatencyWarn"
  return "NpLatencyBad"
}

export default function LatencySection(props: LatencySectionProps) {
  const cards = Array.from({ length: 4 }, (_, i) => {
    const target = createMemo(() => props.latencySnapshot().targets[i])
    const label = createMemo(() => target()?.label ?? "—")
    const msText = createMemo(() => {
      const ms = target()?.ms ?? -1
      if (ms < 0) return "—"
      return ms < 1 ? "<1ms" : `${ms.toFixed(1)}ms`
    })
    const fraction = createMemo(() => {
      const ms = target()?.ms ?? -1
      if (ms < 0) return 0
      return Math.min(1, ms / MAX_MS)
    })
    const colorClass = createMemo(() => latencyColor(target()?.ms ?? -1))
    return { label, msText, fraction, colorClass }
  })

  return (
    <box class="NpSection" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <box class="NpSectionHeader" spacing={6}>
        <label class="NpSectionLabel" label="LATENCY" />
        <box class="NpSectionLine" hexpand valign={Gtk.Align.CENTER} />
      </box>
      <box class="NpLatencyGrid" orientation={Gtk.Orientation.VERTICAL} spacing={3} marginTop={2}>
        {cards.map((card) => (
          <box class="NpLatencyCard" spacing={0} orientation={Gtk.Orientation.VERTICAL}>
            <box spacing={0}>
              <label class="NpLatencyLabel" label={card.label} halign={Gtk.Align.START} hexpand />
              <label class={card.colorClass} label={card.msText} halign={Gtk.Align.END} />
            </box>
            <Gtk.LevelBar
              class="NpLatencyBar"
              minValue={0}
              maxValue={1}
              value={card.fraction}
              heightRequest={3}
              marginTop={2}
            />
          </box>
        ))}
      </box>
    </box>
  )
}
