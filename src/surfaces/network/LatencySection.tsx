import GLib from "gi://GLib?version=2.0"

import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { LatencySnapshot } from "../../runtime/latency-source.ts"
import { scopedTimeoutAdd } from "../../shared/runtime/scoped-timeout.ts"

const MAX_MS = 200

export interface LatencySectionProps {
  latencySnapshot: Accessor<LatencySnapshot>
}

function latencyColorRgb(ms: number): [number, number, number] {
  if (ms < 0) return [0.36, 0.42, 0.5]     // dim
  if (ms < 30) return [0, 1, 0.62]           // green
  if (ms < 100) return [1, 0.71, 0.15]       // amber
  return [1, 0.24, 0.24]                      // red
}

function latencyColorClass(ms: number): string {
  if (ms < 0) return "NpLatencyMs"
  if (ms < 30) return "NpLatencyMs NpLatencyGood"
  if (ms < 100) return "NpLatencyMs NpLatencyWarn"
  return "NpLatencyMs NpLatencyBad"
}

export default function LatencySection(props: LatencySectionProps) {
  const drawingAreas: (Gtk.DrawingArea | null)[] = [null, null, null, null]

  // 2秒ごとにバーを再描画
  scopedTimeoutAdd(GLib.PRIORITY_DEFAULT, 2000, () => {
    for (const da of drawingAreas) {
      if (da) da.queue_draw()
    }
    return GLib.SOURCE_CONTINUE
  }, "LatencySection")

  const cards = Array.from({ length: 4 }, (_, i) => {
    const target = createMemo(() => props.latencySnapshot().targets[i])
    const label = createMemo(() => target()?.label ?? "—")
    const msText = createMemo(() => {
      const ms = target()?.ms ?? -1
      if (ms < 0) return "  —  "
      return ms < 1 ? " <1ms" : `${ms.toFixed(0).padStart(3)}ms`
    })
    const colorClass = createMemo(() => latencyColorClass(target()?.ms ?? -1))
    return { label, msText, colorClass, index: i }
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
              <label class={card.colorClass} label={card.msText} halign={Gtk.Align.END} widthRequest={60} xalign={1} />
            </box>
            <Gtk.DrawingArea
              heightRequest={3}
              hexpand
              marginTop={2}
              onRealize={(self: Gtk.DrawingArea) => {
                drawingAreas[card.index] = self
                self.set_draw_func((_area: any, cr: any, w: number, _h: number) => {
                  const t = props.latencySnapshot().targets[card.index]
                  const ms = t?.ms ?? -1

                  // Background
                  cr.setSourceRGBA(0.1, 0.14, 0.21, 0.5)
                  cr.rectangle(0, 0, w, 3)
                  cr.fill()

                  if (ms >= 0) {
                    const frac = Math.min(1, ms / MAX_MS)
                    const [r, g, b] = latencyColorRgb(ms)
                    cr.setSourceRGBA(r, g, b, 0.7)
                    cr.rectangle(0, 0, w * frac, 3)
                    cr.fill()
                  }
                })
              }}
            />
          </box>
        ))}
      </box>
    </box>
  )
}
