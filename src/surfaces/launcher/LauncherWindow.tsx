import { Astal, Gdk, Gtk } from "ags/gtk4"

import { closeLauncher } from "../../app/controllers.ts"
import PopupShell from "../../shared/ui/PopupShell.tsx"
import LauncherView from "./LauncherView.tsx"

export interface LauncherWindowProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
}

export default function LauncherWindow(props: LauncherWindowProps) {
  return (
    <PopupShell
      name={`launcher:${props.monitor}`}
      windowClass="Launcher"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.EXCLUSIVE}
      layer={Astal.Layer.OVERLAY}
      contentHalign={Gtk.Align.CENTER}
      contentValign={Gtk.Align.START}
      onClose={closeLauncher}
    >
      <LauncherView />
    </PopupShell>
  )
}
