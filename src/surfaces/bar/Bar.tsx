import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo } from "gnim"

import type { Accessor } from "gnim"

import type { BatterySnapshot } from "../../modules/battery/domain.ts"
import {
  bluetoothTone as bluetoothHealthTone,
  connectedDevices,
  type BluetoothSnapshot,
} from "../../modules/bluetooth/domain.ts"
import type { VolumeSnapshot } from "../../modules/volume/domain.ts"
import type { WorkspaceSnapshot } from "../../modules/workspace/domain.ts"
import type { ImeSnapshot } from "../../runtime/ime-source.ts"
import { switchToWorkspace } from "../../runtime/workspace-source.ts"
import type { NetworkSnapshot } from "../../modules/network/domain.ts"
import { signalIcon, signalLevel, type WifiSnapshot } from "../../modules/wifi/domain.ts"
import Icon from "../../shared/ui/Icon.tsx"
import { ICONS } from "../../shared/ui/icons.ts"
import type { PlayerSource } from "../../runtime/player-source.ts"
import BarModule, { type BarModuleTone } from "./BarModule.tsx"
import BatteryBarWidget from "./BatteryBarWidget.tsx"
import SpectrumWidget from "./SpectrumWidget.tsx"
import PlayerWidget from "./PlayerWidget.tsx"

export interface BarProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  clock: Accessor<string>
  volumeSnapshot: Accessor<VolumeSnapshot | null>
  batterySnapshot: Accessor<BatterySnapshot | null>
  imeSnapshot: Accessor<ImeSnapshot | null>
  workspaceSnapshot: Accessor<WorkspaceSnapshot | null>
  spectrumBars: Accessor<number[]>
  player: PlayerSource
  networkSnapshot: Accessor<NetworkSnapshot>
  wifiSnapshot: Accessor<WifiSnapshot>
  bluetoothSnapshot: Accessor<BluetoothSnapshot>
  notifUnreadCount: Accessor<number>
  onToggleDashboard: () => void
  onToggleBatteryPopup: () => void
  onToggleBluetoothPopup: () => void
  onToggleNotifCenter: () => void
  onToggleNetworkPopup: () => void
}

const MAX_WS_DOTS = 9

function volumeIcon(snapshot: VolumeSnapshot | null): string {
  if (!snapshot || snapshot.sinkMuted) return ICONS.volumeMuted
  const pct = Math.round(snapshot.sinkVolume * 100)
  if (pct <= 0) return ICONS.volumeLow
  if (pct <= 50) return ICONS.volumeMedium
  return ICONS.volumeHigh
}

function volumeValue(snapshot: VolumeSnapshot | null): string {
  if (!snapshot || snapshot.sinkMuted) return ""
  return `${Math.max(0, Math.round(snapshot.sinkVolume * 100))}`
}

function volumeTone(snapshot: VolumeSnapshot | null): BarModuleTone {
  if (!snapshot || snapshot.sinkMuted) return "muted"
  if (snapshot.sinkVolume > 1.0) return "warn"
  return "normal"
}

function wifiTone(snapshot: NetworkSnapshot): BarModuleTone {
  return snapshot.online ? "normal" : "muted"
}

function bluetoothIcon(snapshot: BluetoothSnapshot): string {
  if (!snapshot.available || !snapshot.adapters.some((adapter) => adapter.powered)) {
    return ICONS.btOff
  }

  return connectedDevices(snapshot).length > 0 ? ICONS.btConnected : ICONS.bluetooth
}

function bluetoothValue(snapshot: BluetoothSnapshot): string {
  const count = connectedDevices(snapshot).length
  return count > 0 ? `${count}` : ""
}

function bluetoothTone(snapshot: BluetoothSnapshot): BarModuleTone {
  const tone = bluetoothHealthTone(snapshot)
  if (tone === "warning") return "warn"
  if (tone === "critical") return "crit"
  if (tone === "muted") return "muted"
  return connectedDevices(snapshot).length > 0 ? "accent" : "normal"
}

export default function Bar(props: BarProps) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  const imeLabel = props.imeSnapshot((s) => {
    if (!s) return "A"
    return s.active ? "あ" : "A"
  })

  const imeClass = props.imeSnapshot((s) =>
    s?.active ? "ImeIndicator ImeActive" : "ImeIndicator",
  )

  return (
    <window
      visible
      name={`bar:${props.monitor}`}
      class="Bar"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
    >
      <centerbox cssName="centerbox">
        <box $type="start" spacing={8} halign={Gtk.Align.START} valign={Gtk.Align.CENTER}>
          <SpectrumWidget bars={props.spectrumBars} />
          <PlayerWidget player={props.player} />
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
            const dotLabel = `${wsId}`
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
        <box $type="end" class="BarRightModules" spacing={0} halign={Gtk.Align.END} valign={Gtk.Align.CENTER}>
          <box class="BarGroup" spacing={4} valign={Gtk.Align.CENTER}>
            <BarModule
              icon={props.volumeSnapshot(volumeIcon)}
              value={props.volumeSnapshot(volumeValue)}
              tone={props.volumeSnapshot(volumeTone)}
            />
            <button
              class="NetBarBtn"
              valign={Gtk.Align.CENTER}
              onClicked={props.onToggleNetworkPopup}
            >
              <BarModule
                icon={createMemo(() => {
                  const net = props.networkSnapshot()
                  if (!net.online) return ICONS.wifiDisconnected
                  if (net.linkKind !== "wifi") return ICONS.wired
                  const ws = props.wifiSnapshot()
                  const sig = ws?.connected?.signal ?? 0
                  const level = signalLevel(sig)
                  return signalIcon(level)
                })}
                value={createMemo(() => {
                  const ws = props.wifiSnapshot()
                  return ws?.connected?.ssid ?? ""
                })}
                tone={props.networkSnapshot(wifiTone)}
              />
            </button>
            <button
              class="BtBarBtn"
              valign={Gtk.Align.CENTER}
              onClicked={props.onToggleBluetoothPopup}
            >
              <BarModule
                icon={props.bluetoothSnapshot(bluetoothIcon)}
                value={props.bluetoothSnapshot(bluetoothValue)}
                tone={props.bluetoothSnapshot(bluetoothTone)}
              />
            </button>
          </box>

          <box class="BarSeparator" valign={Gtk.Align.CENTER} />

          <box class="BarGroup" spacing={4} valign={Gtk.Align.CENTER}>
            <button
              class="NotifBellBtn"
              valign={Gtk.Align.CENTER}
              onClicked={props.onToggleNotifCenter}
            >
              <BarModule
                icon={ICONS.bell}
                value={props.notifUnreadCount((c) => c > 0 ? `${c}` : "")}
                tone={props.notifUnreadCount((c) => c > 0 ? "accent" : "muted")}
              />
            </button>
            <label class={imeClass} label={imeLabel} valign={Gtk.Align.CENTER} />
          </box>

          <box class="BarSeparator" valign={Gtk.Align.CENTER} />

          <box class="BarGroup" spacing={4} valign={Gtk.Align.CENTER}>
            <BatteryBarWidget
              snapshot={props.batterySnapshot}
              onClicked={props.onToggleBatteryPopup}
            />
          </box>
        </box>
      </centerbox>
    </window>
  )
}
