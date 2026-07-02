import GLib from "gi://GLib?version=2.0"

import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

import { scopedTimeoutAdd } from "../../shared/runtime/scoped-timeout.ts"
import { COLORS } from "../../shared/theme-tokens.ts"

const BAR_WIDTH = 8
const BAR_GAP = 3
const BAR_MAX_HEIGHT = 48
const SPECTRUM_HIGH = COLORS.rgb["chart-green"]
const SPECTRUM_MID = COLORS.rgb["chart-cyan"]
const SPECTRUM_LOW = COLORS.rgb["chart-dim"]

export interface WideSpectrumProps {
  bars: Accessor<number[]>
}

export default function WideSpectrum(props: WideSpectrumProps) {
  let drawingArea: Gtk.DrawingArea | null = null

  scopedTimeoutAdd(GLib.PRIORITY_DEFAULT, 33, () => {
    if (drawingArea) drawingArea.queue_draw()
    return GLib.SOURCE_CONTINUE
  }, "WideSpectrum")

  return (
    <Gtk.DrawingArea
      class="DmSpectrum"
      widthRequest={800}
      heightRequest={BAR_MAX_HEIGHT + 4}
      hexpand
      halign={Gtk.Align.CENTER}
      onRealize={(self: Gtk.DrawingArea) => {
        drawingArea = self
        self.set_draw_func((_area: any, cr: any, w: number, h: number) => {
          const values = props.bars()
          const numBars = values.length
          if (numBars === 0) return

          const totalWidth = numBars * (BAR_WIDTH + BAR_GAP) - BAR_GAP
          const offsetX = (w - totalWidth) / 2

          for (let i = 0; i < numBars; i++) {
            const v = values[i] ?? 0
            const barH = Math.max(1, Math.round((v / 100) * BAR_MAX_HEIGHT))
            const x = offsetX + i * (BAR_WIDTH + BAR_GAP)
            const y = h - barH

            // Color based on value
            if (v > 70) {
              cr.setSourceRGBA(SPECTRUM_HIGH[0], SPECTRUM_HIGH[1], SPECTRUM_HIGH[2], 0.9)
            } else if (v > 35) {
              cr.setSourceRGBA(SPECTRUM_MID[0], SPECTRUM_MID[1], SPECTRUM_MID[2], 0.7)
            } else {
              cr.setSourceRGBA(SPECTRUM_LOW[0], SPECTRUM_LOW[1], SPECTRUM_LOW[2], 0.4)
            }

            cr.rectangle(x, y, BAR_WIDTH, barH)
            cr.fill()
          }
        })
      }}
    />
  )
}
