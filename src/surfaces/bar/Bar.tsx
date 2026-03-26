import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo } from "gnim"

import type { Accessor } from "gnim"

import type { BarIndicatorViewModel } from "../../shared/bar-indicator.ts"
import type { BatterySnapshot } from "../../modules/battery/domain.ts"
import type { WorkspaceSnapshot } from "../../modules/workspace/domain.ts"
import type { ImeSnapshot } from "../../runtime/ime-source.ts"
import { switchToWorkspace } from "../../runtime/workspace-source.ts"
import BarIndicatorStrip from "./BarIndicatorStrip.tsx"
import BatteryBarWidget from "./BatteryBarWidget.tsx"

export interface BarProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  clock: Accessor<string>
  indicators: Accessor<BarIndicatorViewModel>[]
  batterySnapshot: Accessor<BatterySnapshot | null>
  imeSnapshot: Accessor<ImeSnapshot | null>
  workspaceSnapshot: Accessor<WorkspaceSnapshot | null>
  onToggleDashboard: () => void
  onToggleBatteryPopup: () => void
}

const MAX_WS_DOTS = 9

export default function Bar(props: BarProps) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  const imeLabel = props.imeSnapshot((s) => {
    if (!s) return "?"
    return s.active ? "あ" : "A"
  })

  const imeClass = props.imeSnapshot((s) =>
    s?.active ? "ImeIndicator ImeActive" : "ImeIndicator",
  )

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
        <box $type="start" spacing={4} halign={Gtk.Align.START} valign={Gtk.Align.CENTER}>
          {Array.from({ length: MAX_WS_DOTS }).map((_, i) => {
            const wsId = i + 1
            const dotClass = createMemo(() => {
              const s = props.workspaceSnapshot()
              if (!s) return "WsDot WsDotEmpty"
              const exists = s.workspaces.some((w) => w.id === wsId)
              const active = s.activeId === wsId
              if (active) return "WsDot WsDotActive"
              if (exists) return "WsDot WsDotOccupied"
              return "WsDot WsDotEmpty"
            })
            const dotLabel = createMemo(() => {
              const s = props.workspaceSnapshot()
              if (!s) return `${wsId}`
              const active = s.activeId === wsId
              const exists = s.workspaces.some((w) => w.id === wsId)
              if (active || exists) return `${wsId}`
              return `${wsId}`
            })
            const visible = createMemo(() => {
              const s = props.workspaceSnapshot()
              if (!s) return wsId <= 5
              // Show: active, occupied, or up to the highest occupied
              const maxId = Math.max(...s.workspaces.map((w) => w.id), 1)
              return wsId <= Math.max(maxId, s.activeId)
            })

            return (
              <button
                class={dotClass}
                visible={visible}
                valign={Gtk.Align.CENTER}
                onClicked={() => switchToWorkspace(wsId)}
              >
                <label label={dotLabel} />
              </button>
            )
          })}
        </box>
        <label $type="center" class="BarClock" label={props.clock} />
        <box $type="end" spacing={10} halign={Gtk.Align.END} valign={Gtk.Align.CENTER}>
          <BarIndicatorStrip indicators={props.indicators} />
          <label class={imeClass} label={imeLabel} valign={Gtk.Align.CENTER} />
          <BatteryBarWidget
            snapshot={props.batterySnapshot}
            onClicked={props.onToggleBatteryPopup}
          />
        </box>
      </centerbox>
    </window>
  )
}
