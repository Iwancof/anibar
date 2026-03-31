import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"

import { closeLauncher } from "../../app/launcher-controller.ts"
import LauncherView from "./LauncherView.tsx"

export interface LauncherWindowProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
}

export default function LauncherWindow(props: LauncherWindowProps) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor
  const monitorName = props.gdkmonitor.connector || `${props.monitorIndex}`

  return (
    <window
      name={`launcher:${monitorName}`}
      class="Launcher"
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={TOP | LEFT | RIGHT | BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.EXCLUSIVE}
      layer={Astal.Layer.OVERLAY}
      onRealize={(self: any) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            closeLauncher()
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <overlay>
        <button class="LauncherBackdrop" hexpand vexpand onClicked={closeLauncher} />
        <box
          $type="overlay"
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.START}
        >
          <LauncherView />
        </box>
      </overlay>
    </window>
  )
}
