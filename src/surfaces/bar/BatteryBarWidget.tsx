import { Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { BatterySnapshot } from "../../modules/battery/domain.ts"

export interface BatteryBarWidgetProps {
  snapshot: Accessor<BatterySnapshot | null>
  onClicked: () => void
}

const BODY_WIDTH = 26
const BODY_HEIGHT = 14
const FILL_MAX_WIDTH = BODY_WIDTH - 4

export default function BatteryBarWidget(props: BatteryBarWidgetProps) {
  const fillWidth = props.snapshot((s) => {
    if (!s || !s.present) return 0
    const clamped = Math.max(0, Math.min(100, s.percent))
    return Math.round((clamped / 100) * FILL_MAX_WIDTH)
  })

  const isOnAC = (s: BatterySnapshot | null) =>
    s?.present === true &&
    (s.state === "charging" || s.state === "full" || s.state === "not-charging")

  const fillClass = props.snapshot((s) => {
    if (!s || !s.present) return "BatFill"
    if (s.percent <= 20 && !isOnAC(s)) return "BatFill BatFillLow"
    if (isOnAC(s)) return "BatFill BatFillCharging"
    return "BatFill"
  })

  const bodyClass = props.snapshot((s) => {
    if (!s || !s.present) return "BatBody BatBodyEmpty"
    if (s.percent <= 20 && !isOnAC(s)) return "BatBody BatBodyLow"
    return "BatBody"
  })

  const isCharging = props.snapshot((s) => isOnAC(s))

  function setupClick(self: any) {
    const gesture = new Gtk.GestureClick()
    gesture.set_button(1)
    gesture.connect("pressed", () => {
      props.onClicked()
    })
    self.add_controller(gesture)
  }

  return (
    <box class="BatButton" onRealize={setupClick} valign={Gtk.Align.CENTER}>
      <box class="BatIndicator" spacing={0} valign={Gtk.Align.CENTER}>
        <overlay>
          <box
            class={bodyClass}
            widthRequest={BODY_WIDTH}
            heightRequest={BODY_HEIGHT}
            valign={Gtk.Align.CENTER}
          >
            <box
              class={fillClass}
              widthRequest={fillWidth}
              heightRequest={BODY_HEIGHT - 4}
              halign={Gtk.Align.START}
              valign={Gtk.Align.CENTER}
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
    </box>
  )
}
