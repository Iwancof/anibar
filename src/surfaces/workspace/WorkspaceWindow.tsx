import { Astal, Gdk, Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { WorkspaceSnapshot } from "../../modules/workspace/domain.ts"
import PopupShell from "../../shared/ui/PopupShell.tsx"
import WorkspaceView from "./WorkspaceView.tsx"

export interface WorkspaceWindowProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  snapshot: Accessor<WorkspaceSnapshot | null>
  onClose: () => void
}

export default function WorkspaceWindow(props: WorkspaceWindowProps) {
  return (
    <PopupShell
      name={`workspace:${props.monitor}`}
      windowClass="WsOverview"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.OVERLAY}
      contentHalign={Gtk.Align.CENTER}
      contentValign={Gtk.Align.CENTER}
      onClose={props.onClose}
    >
      <WorkspaceView snapshot={props.snapshot} />
    </PopupShell>
  )
}
