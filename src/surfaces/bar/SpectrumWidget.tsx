import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"

const NUM_BARS = 10
const BAR_MAX_HEIGHT = 18

export interface SpectrumWidgetProps {
  bars: Accessor<number[]>
}

export default function SpectrumWidget(props: SpectrumWidgetProps) {
  return (
    <box class="Spectrum" spacing={1} valign={Gtk.Align.CENTER}>
      {Array.from({ length: NUM_BARS }).map((_, i) => {
        const height = createMemo(() => {
          const values = props.bars()
          const v = values[i] ?? 0
          return Math.max(2, Math.round((v / 100) * BAR_MAX_HEIGHT))
        })

        const barClass = createMemo(() => {
          const values = props.bars()
          const v = values[i] ?? 0
          if (v > 70) return "SpectrumBar SpectrumBarHigh"
          if (v > 35) return "SpectrumBar SpectrumBarMid"
          return "SpectrumBar SpectrumBarLow"
        })

        return (
          <box
            class={barClass}
            valign={Gtk.Align.END}
            heightRequest={height}
          />
        )
      })}
    </box>
  )
}
