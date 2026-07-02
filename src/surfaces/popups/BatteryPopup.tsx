import { Astal, Gdk, Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { BatterySnapshot } from "../../modules/battery/domain.ts"
import type { SystemStatsSnapshot } from "../../modules/system-stats/domain.ts"
import type { PwsaveStatus, MeasureName, LidAction } from "../../modules/power-save/domain.ts"
import { closeBatteryPopup } from "../../app/controllers.ts"
import PopupShell from "../../shared/ui/PopupShell.tsx"
import BatteryHudView from "./BatteryHudView.tsx"

export interface BatteryPopupProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  snapshot: Accessor<BatterySnapshot | null>
  systemStats: Accessor<SystemStatsSnapshot | null>
  pwsaveStatus: Accessor<PwsaveStatus | null>
  lidAction: Accessor<LidAction>
  onToggleMeasure: (name: MeasureName, enable: boolean) => void
  onToggleAll: (enable: boolean) => void
  onSetLidAction: (action: LidAction) => void
}

export default function BatteryPopup(props: BatteryPopupProps) {
  return (
    <PopupShell
      name={`battery-popup:${props.monitor}`}
      windowClass="BatPopup"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.NORMAL}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.TOP}
      contentHalign={Gtk.Align.END}
      contentValign={Gtk.Align.START}
      onClose={closeBatteryPopup}
    >
      <box class="BatPopupPanel UiPanel">
        <BatteryHudView
          snapshot={props.snapshot}
          systemStats={props.systemStats}
          pwsaveStatus={props.pwsaveStatus}
          lidAction={props.lidAction}
          onToggleMeasure={props.onToggleMeasure}
          onToggleAll={props.onToggleAll}
          onSetLidAction={props.onSetLidAction}
        />
      </box>
    </PopupShell>
  )
}
