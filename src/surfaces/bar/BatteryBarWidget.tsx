import { Gtk } from "ags/gtk4"
import { onCleanup } from "gnim"

import type { Accessor } from "gnim"

import { isOnAC, type BatterySnapshot } from "../../modules/battery/domain.ts"
import { COLORS } from "../../shared/theme-tokens.ts"
import { ICONS } from "../../shared/ui/icons.ts"

export interface BatteryBarWidgetProps {
  snapshot: Accessor<BatterySnapshot | null>
  onClicked: () => void
}

// ── セルゲージの形状 ──
const BODY_W = 28
const BODY_H = 14
const NUB_W = 3
const NUB_H = 7
const TOTAL_W = BODY_W + NUB_W
const PAD = 2
const CELLS = 5
const CELL_GAP = 1
const CELL_W = (BODY_W - PAD * 2 - CELL_GAP * (CELLS - 1)) / CELLS

const C_OK = COLORS.rgb["bar-battery-green"]
const C_WARN = COLORS.rgb["bar-battery-amber"]
const C_CRIT = COLORS.rgb["colors-critical"]
const C_CHARGE = COLORS.rgb["bar-battery-charge"]
const C_FRAME = COLORS.rgb["np-text-sec"]
const C_EMPTY = COLORS.rgb["chart-dim"]

// 計器式の位置固定色 (dB メーター方式): 埋まったセルは自分の位置色で光る。
// 本数と色並びの両方で残量が読める。ユーザ裁定 2026-08-11 (design-system の
// 「虹色ゲージ禁止」より優先、decisions.md 参照)
const CELL_COLORS: ReadonlyArray<readonly [number, number, number]> = [
  C_CRIT,
  C_WARN,
  C_OK,
  C_OK,
  C_CHARGE,
]

export default function BatteryBarWidget(props: BatteryBarWidgetProps) {
  const isCharging = props.snapshot((s) => isOnAC(s))
  const percentLabel = props.snapshot((s) =>
    s && s.present ? `${Math.round(Math.max(0, Math.min(100, s.percent)))}` : "",
  )
  const moduleClass = props.snapshot((s) => {
    if (!s || !s.present) return "BatIndicator BarModule BarModuleToneMuted"
    if (s.percent <= 20 && !isOnAC(s)) return "BatIndicator BarModule BarModuleToneWarn"
    return "BatIndicator BarModule BarModuleToneNormal"
  })

  // 残量に応じて数値の色も変える (充電中は charge cyan)
  const valueClass = props.snapshot((s) => {
    const base = "BarModuleValue BatValue"
    if (!s || !s.present) return base
    if (isOnAC(s)) return `${base} BatValueCharge`
    if (s.percent <= 20) return `${base} BatValueCrit`
    if (s.percent <= 40) return `${base} BatValueWarn`
    return `${base} BatValueOk`
  })

  let drawingArea: Gtk.DrawingArea | null = null

  onCleanup(props.snapshot.subscribe(() => {
    if (drawingArea) drawingArea.queue_draw()
  }))

  function setupClick(self: any) {
    const gesture = new Gtk.GestureClick()
    gesture.set_button(1)
    gesture.connect("pressed", () => { props.onClicked() })
    self.add_controller(gesture)
  }

  return (
    <box class={moduleClass} onRealize={setupClick} valign={Gtk.Align.CENTER} spacing={4}>
      <overlay>
        <Gtk.DrawingArea
          widthRequest={TOTAL_W}
          heightRequest={BODY_H}
          valign={Gtk.Align.CENTER}
          onRealize={(self: Gtk.DrawingArea) => {
            drawingArea = self
            self.set_draw_func((_area: any, cr: any, _w: number, h: number) => {
              const s = props.snapshot()
              const present = s?.present ?? false
              const pct = present ? Math.max(0, Math.min(100, s!.percent)) : 0
              const top = (h - BODY_H) / 2

              // 外枠 (1px) + ノブ
              const frameAlpha = present ? 0.9 : 0.4
              cr.setSourceRGBA(C_FRAME[0], C_FRAME[1], C_FRAME[2], frameAlpha)
              cr.setLineWidth(1)
              cr.rectangle(0.5, top + 0.5, BODY_W - 1, BODY_H - 1)
              cr.stroke()
              cr.rectangle(BODY_W, top + (BODY_H - NUB_H) / 2, NUB_W, NUB_H)
              cr.fill()

              if (!present) return

              const filled = Math.max(0, Math.min(CELLS, Math.round((pct / 100) * CELLS)))

              for (let i = 0; i < CELLS; i++) {
                const x = PAD + i * (CELL_W + CELL_GAP)
                const y = top + PAD
                const ch = BODY_H - PAD * 2

                if (i < filled) {
                  const c = CELL_COLORS[i]
                  cr.setSourceRGBA(c[0], c[1], c[2], 1)
                } else {
                  // 空セルもスロットとして薄く見せる (HUD の固定スロット感)
                  cr.setSourceRGBA(C_EMPTY[0], C_EMPTY[1], C_EMPTY[2], 0.18)
                }
                cr.rectangle(x, y, CELL_W, ch)
                cr.fill()
              }
            })
          }}
        />
        <label
          $type="overlay"
          class="BatChargingIcon"
          label={ICONS.batteryCharging}
          visible={isCharging}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        />
      </overlay>
      <label class={valueClass} label={percentLabel} valign={Gtk.Align.CENTER} />
    </box>
  )
}
