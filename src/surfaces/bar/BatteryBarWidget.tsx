import GLib from "gi://GLib?version=2.0"

import { Gtk } from "ags/gtk4"

import { onCleanup } from "gnim"
import type { Accessor } from "gnim"

import { isOnAC, type BatterySnapshot } from "../../modules/battery/domain.ts"
import { scopedTimeoutWhile } from "../../shared/runtime/scoped-timeout.ts"
import { COLORS } from "../../shared/theme-tokens.ts"
import { ICONS } from "../../shared/ui/icons.ts"

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
// 3.5s 周期・22px 幅のゆっくりしたアニメなので 10fps で十分滑らか。
// 30ms (33fps) だと充電中ずっとバー全体の再合成が走り CPU を数%食う
const TICK_MS = 100
const BATTERY_GREEN = COLORS.rgb["bar-battery-green"]
const BATTERY_AMBER = COLORS.rgb["bar-battery-amber"]
const BATTERY_CHARGE = COLORS.rgb["bar-battery-charge"]

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

  const bodyClass = props.snapshot((s) => {
    if (!s || !s.present) return "BatBody BatBodyEmpty"
    if (s.percent <= 20 && !isOnAC(s)) return "BatBody BatBodyLow"
    return "BatBody"
  })

  let drawingArea: Gtk.DrawingArea | null = null
  let animTime = 0

  // アニメーション (grow/fade) は充電中かつ 100% 未満のときだけ描かれるので、
  // tick もその間だけ回す。静的な残量変化は snapshot 購読で再描画。
  const animActive = props.snapshot(
    (s) => s != null && s.present && isOnAC(s) && s.percent < 100,
  )
  onCleanup(props.snapshot.subscribe(() => {
    if (drawingArea) drawingArea.queue_draw()
  }))

  scopedTimeoutWhile(GLib.PRIORITY_DEFAULT, TICK_MS, animActive, () => {
    animTime += TICK_MS
    if (drawingArea) drawingArea.queue_draw()
  }, "BatteryBarWidget")

  function setupClick(self: any) {
    const gesture = new Gtk.GestureClick()
    gesture.set_button(1)
    gesture.connect("pressed", () => { props.onClicked() })
    self.add_controller(gesture)
  }

  return (
    <box class={moduleClass} onRealize={setupClick} valign={Gtk.Align.CENTER} spacing={4}>
      <box class="BatGlyph" valign={Gtk.Align.CENTER} spacing={0}>
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
                    cr.setSourceRGBA(BATTERY_AMBER[0], BATTERY_AMBER[1], BATTERY_AMBER[2], 1)
                  } else {
                    cr.setSourceRGBA(BATTERY_GREEN[0], BATTERY_GREEN[1], BATTERY_GREEN[2], 1)
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
                      cr.setSourceRGBA(BATTERY_CHARGE[0], BATTERY_CHARGE[1], BATTERY_CHARGE[2], 0.6)
                      cr.rectangle(baseWidth, 0, extraWidth, h)
                      cr.fill()
                    } else {
                      // Phase 3: fade out at full extent
                      const t = (cycle - HOLD_MS - GROW_MS) / FADE_MS // 0→1
                      const opacity = 0.6 * (1 - t)

                      cr.setSourceRGBA(BATTERY_CHARGE[0], BATTERY_CHARGE[1], BATTERY_CHARGE[2], opacity)
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
            label={ICONS.batteryCharging}
            visible={isCharging}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
          />
        </overlay>
        <box class="BatNub" widthRequest={3} heightRequest={7} valign={Gtk.Align.CENTER} />
      </box>
      <label class="BarModuleValue BatValue" label={percentLabel} valign={Gtk.Align.CENTER} />
    </box>
  )
}
