import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { BatteryViewModel } from "../../modules/battery/view-model.ts"
import { closeBatteryPopup } from "../../app/popup-controller.ts"

export interface BatteryPopupProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  viewModel: Accessor<BatteryViewModel>
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
      onKeyPressed={(self: any, keyval: number) => {
        if (keyval === Gdk.KEY_Escape) {
          closeBatteryPopup()
        }
      }}
    >
      <overlay>
        <button class="BatPopupBackdrop" hexpand vexpand onClicked={closeBatteryPopup} />
        <box
          $type="overlay"
          halign={Gtk.Align.END}
          valign={Gtk.Align.START}
        >
          <box class="BatPopupPanel" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
            <label
              class="BatPopupTitle"
              halign={Gtk.Align.START}
              xalign={0}
              label={props.viewModel((vm) => vm.title)}
            />
            <label
              class="BatPopupHeadline"
              halign={Gtk.Align.START}
              xalign={0}
              label={props.viewModel((vm) => vm.headline)}
            />
            <label
              class="BatPopupDetail"
              halign={Gtk.Align.START}
              xalign={0}
              wrap
              label={props.viewModel((vm) => vm.detail)}
            />
            <label
              class="BatPopupMeta"
              halign={Gtk.Align.START}
              xalign={0}
              wrap
              label={props.viewModel((vm) => vm.meta)}
            />
            <label
              class="BatPopupFooter"
              halign={Gtk.Align.START}
              xalign={0}
              wrap
              label={props.viewModel((vm) => vm.footer)}
            />
          </box>
        </box>
      </overlay>
    </window>
  )
}
