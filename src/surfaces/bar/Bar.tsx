import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { BarIndicatorViewModel } from "../../shared/bar-indicator.ts"
import type { BatterySnapshot } from "../../modules/battery/domain.ts"
import BarIndicatorStrip from "./BarIndicatorStrip.tsx"
import BatteryBarWidget from "./BatteryBarWidget.tsx"

export interface BarProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  clock: Accessor<string>
  indicators: Accessor<BarIndicatorViewModel>[]
  batterySnapshot: Accessor<BatterySnapshot | null>
  onToggleDashboard: () => void
  onToggleBatteryPopup: () => void
}

export default function Bar(props: BarProps) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <window
      visible
      name={`bar:${props.monitorIndex}`}
      class="Bar"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
    >
      <centerbox cssName="centerbox">
        <button
          $type="start"
          class="BarButton"
          onClicked={props.onToggleDashboard}
          halign={Gtk.Align.START}
        >
          <label label="Dashboard" />
        </button>
        <label $type="center" class="BarClock" label={props.clock} />
        <box $type="end" spacing={14} halign={Gtk.Align.END} valign={Gtk.Align.CENTER}>
          <BarIndicatorStrip indicators={props.indicators} />
          <BatteryBarWidget
            snapshot={props.batterySnapshot}
            onClicked={props.onToggleBatteryPopup}
          />
        </box>
      </centerbox>
    </window>
  )
}
