import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { WorkspaceSnapshot } from "../../modules/workspace/domain.ts"
import WorkspaceView from "./WorkspaceView.tsx"

export interface WorkspaceWindowProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  monitorIndex: number
  snapshot: Accessor<WorkspaceSnapshot | null>
  onClose: () => void
}

export default function WorkspaceWindow(props: WorkspaceWindowProps) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor

  return (
    <window
      name={`dashboard:${props.monitor}`}
      class="WsOverview"
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={TOP | LEFT | RIGHT | BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.OVERLAY}
      onRealize={(self: any) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            props.onClose()
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <overlay>
        <button class="WsBackdrop" hexpand vexpand onClicked={props.onClose} />
        <box $type="overlay" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
          <WorkspaceView snapshot={props.snapshot} />
        </box>
      </overlay>
    </window>
  )
}
