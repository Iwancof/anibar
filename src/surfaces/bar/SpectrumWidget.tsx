import { Gtk } from "ags/gtk4"
import { onCleanup } from "gnim"
import type { Accessor } from "gnim"

import { COLORS } from "../../shared/theme-tokens.ts"

const NUM_BARS = 10
const BAR_WIDTH = 7
const BAR_GAP = 1
const BAR_MAX_HEIGHT = 18
const WIDGET_WIDTH = NUM_BARS * (BAR_WIDTH + BAR_GAP) - BAR_GAP
const LOW_RGB = COLORS.rgb["colors-muted"]
const MID_RGB = COLORS.rgb["colors-accent"]
const HIGH_RGB = COLORS.rgb["hud-cyan"]

export interface SpectrumWidgetProps {
  bars: Accessor<number[]>
}

// 個別 box の heightRequest 更新はバー全体の relayout を毎フレーム誘発するため、
// 単一 DrawingArea への再描画のみで済ませる (レイアウト不変)。
export default function SpectrumWidget(props: SpectrumWidgetProps) {
  let drawingArea: Gtk.DrawingArea | null = null

  const unsubscribe = props.bars.subscribe(() => {
    if (drawingArea?.get_mapped()) drawingArea.queue_draw()
  })
  onCleanup(unsubscribe)

  return (
    <box class="Spectrum" valign={Gtk.Align.CENTER}>
      <Gtk.DrawingArea
        widthRequest={WIDGET_WIDTH}
        heightRequest={BAR_MAX_HEIGHT}
        valign={Gtk.Align.CENTER}
        onRealize={(self: Gtk.DrawingArea) => {
          drawingArea = self
          self.set_draw_func((_area: any, cr: any, _w: number, h: number) => {
            const values = props.bars()
            for (let i = 0; i < NUM_BARS; i++) {
              const v = values[i] ?? 0
              const barH = Math.max(2, Math.round((v / 100) * BAR_MAX_HEIGHT))
              if (v > 70) {
                cr.setSourceRGBA(HIGH_RGB[0], HIGH_RGB[1], HIGH_RGB[2], 1)
              } else if (v > 35) {
                cr.setSourceRGBA(MID_RGB[0], MID_RGB[1], MID_RGB[2], 0.6)
              } else {
                cr.setSourceRGBA(LOW_RGB[0], LOW_RGB[1], LOW_RGB[2], 0.3)
              }
              cr.rectangle(i * (BAR_WIDTH + BAR_GAP), h - barH, BAR_WIDTH, barH)
              cr.fill()
            }
          })
        }}
      />
    </box>
  )
}
