import GLib from "gi://GLib?version=2.0"

import { Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { BatterySnapshot } from "../../modules/battery/domain.ts"
import { scopedTimeoutAdd } from "../../shared/runtime/scoped-timeout.ts"

export interface BatteryBarWidgetProps {
  snapshot: Accessor<BatterySnapshot | null>
  onClicked: () => void
}

const BODY_WIDTH = 26
const BODY_HEIGHT = 14
const FILL_MAX_WIDTH = BODY_WIDTH - 4

// Animation: 1s hold → 2s grow (tan curve) → 0.5s fade → repeat
const HOLD_MS = 1000
const GROW_MS = 2000
const FADE_MS = 500
const CYCLE_MS = HOLD_MS + GROW_MS + FADE_MS
const TICK_MS = 30

export default function BatteryBarWidget(props: BatteryBarWidgetProps) {
  const isOnAC = (s: BatterySnapshot | null) =>
    s?.present === true &&
    (s.state === "charging" || s.state === "full" || s.state === "not-charging")

  const isCharging = props.snapshot((s) => isOnAC(s))

  const bodyClass = props.snapshot((s) => {
    if (!s || !s.present) return "BatBody BatBodyEmpty"
    if (s.percent <= 20 && !isOnAC(s)) return "BatBody BatBodyLow"
    return "BatBody"
  })

  let drawingArea: Gtk.DrawingArea | null = null
  let animTime = 0

  scopedTimeoutAdd(GLib.PRIORITY_DEFAULT, TICK_MS, () => {
    animTime += TICK_MS
    if (drawingArea) drawingArea.queue_draw()
    return GLib.SOURCE_CONTINUE
  }, "BatteryBarWidget")

  function setupClick(self: any) {
    const gesture = new Gtk.GestureClick()
    gesture.set_button(1)
    gesture.connect("pressed", () => { props.onClicked() })
    self.add_controller(gesture)
  }

  return (
    <box class="BatIndicator" onRealize={setupClick} valign={Gtk.Align.CENTER} spacing={0}>
      <overlay>
        <box
          class={bodyClass}
          widthRequest={BODY_WIDTH}
          heightRequest={BODY_HEIGHT}
          valign={Gtk.Align.CENTER}
        >
          {/* Fill bar drawn with Cairo for charging animation */}
          <Gtk.DrawingArea
            widthRequest={FILL_MAX_WIDTH}
            heightRequest={BODY_HEIGHT - 4}
            halign={Gtk.Align.START}
            valign={Gtk.Align.CENTER}
            onRealize={(self: Gtk.DrawingArea) => {
              drawingArea = self
              self.set_draw_func((_area: any, cr: any, w: number, h: number) => {
                const s = props.snapshot()
                if (!s || !s.present) return

                const pct = Math.max(0, Math.min(100, s.percent))
                const baseWidth = (pct / 100) * w
                const charging = isOnAC(s)
                const low = pct <= 20 && !charging

                // Base fill color
                if (low) {
                  cr.setSourceRGBA(0.89, 0.65, 0.41, 1) // warning orange
                } else {
                  cr.setSourceRGBA(0.62, 0.81, 0.42, 1) // charging/healthy green
                }

                // Draw base fill
                cr.rectangle(0, 0, baseWidth, h)
                cr.fill()

                // Charging animation: grow beyond current level
                if (charging && pct < 100) {
                  const cycle = animTime % CYCLE_MS
                  const remainWidth = w - baseWidth

                  if (cycle < HOLD_MS) {
                    // Phase 1: hold — no extra fill
                  } else if (cycle < HOLD_MS + GROW_MS) {
                    // Phase 2: tan curve growth to full
                    const t = (cycle - HOLD_MS) / GROW_MS // 0→1
                    const tanMax = Math.tan(Math.PI / 2.5)
                    const progress = Math.min(1, Math.tan(t * Math.PI / 2.5) / tanMax)
                    const extraWidth = remainWidth * progress

                    // Lighter cyan-green for the growing part
                    cr.setSourceRGBA(0.4, 0.9, 0.8, 0.6)
                    cr.rectangle(baseWidth, 0, extraWidth, h)
                    cr.fill()
                  } else {
                    // Phase 3: fade out at full extent
                    const t = (cycle - HOLD_MS - GROW_MS) / FADE_MS // 0→1
                    const opacity = 0.6 * (1 - t)

                    cr.setSourceRGBA(0.4, 0.9, 0.8, opacity)
                    cr.rectangle(baseWidth, 0, remainWidth, h)
                    cr.fill()
                  }
                }
              })
            }}
          />
        </box>
        <label
          $type="overlay"
          class="BatChargingIcon"
          label="󰚥"
          visible={isCharging}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        />
      </overlay>
      <box class="BatNub" widthRequest={3} heightRequest={7} valign={Gtk.Align.CENTER} />
    </box>
  )
}
