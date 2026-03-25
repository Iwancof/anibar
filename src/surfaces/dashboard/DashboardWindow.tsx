import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"

import type { Accessor } from "gnim"

import DashboardView from "./DashboardView.tsx"
import type { AppModules } from "../../modules/index.ts"

export interface DashboardWindowProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  modules: AppModules
  clock: Accessor<string>
  hostname: string
  onClose: () => void
}

export default function DashboardWindow(props: DashboardWindowProps) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor

  return (
    <window
      name={`dashboard:${props.monitorIndex}`}
      class="Dashboard"
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={TOP | LEFT | RIGHT | BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.OVERLAY}
    >
      <box class="DashboardBackdrop" hexpand vexpand>
        <DashboardView
          modules={props.modules}
          clock={props.clock}
          hostname={props.hostname}
          onClose={props.onClose}
        />
      </box>
    </window>
  )
}
