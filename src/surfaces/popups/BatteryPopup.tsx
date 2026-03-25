import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { BatterySnapshot } from "../../modules/battery/domain.ts"
import { closeBatteryPopup } from "../../app/popup-controller.ts"
import BatteryHudView from "./BatteryHudView.tsx"

export interface BatteryPopupProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  snapshot: Accessor<BatterySnapshot | null>
}

export default function BatteryPopup(props: BatteryPopupProps) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor

  return (
    <window
      name={`battery-popup:${props.monitorIndex}`}
      class="BatPopup"
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={TOP | LEFT | RIGHT | BOTTOM}
      exclusivity={Astal.Exclusivity.NORMAL}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.TOP}
      onRealize={(self: any) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            closeBatteryPopup()
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <overlay>
        <button class="BatPopupBackdrop" hexpand vexpand onClicked={closeBatteryPopup} />
        <box
          $type="overlay"
          halign={Gtk.Align.END}
          valign={Gtk.Align.START}
        >
          <box class="BatPopupPanel" >
            <BatteryHudView snapshot={props.snapshot} />
          </box>
        </box>
      </overlay>
    </window>
  )
}
