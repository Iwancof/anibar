import { Astal, Gdk, Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

import type { NetworkSnapshot } from "../../modules/network/domain.ts"
import type { WifiSnapshot } from "../../modules/wifi/domain.ts"
import type { BatterySnapshot } from "../../modules/battery/domain.ts"
import type { BandwidthSnapshot } from "../../runtime/bandwidth-source.ts"
import type { QualitySnapshot } from "../../runtime/quality-source.ts"
import type { DnsSnapshot } from "../../runtime/dns-source.ts"
import type { LatencySnapshot } from "../../runtime/latency-source.ts"
import type { SessionSnapshot } from "../../runtime/session-source.ts"
import type { ConnectionsSnapshot } from "../../runtime/connections-source.ts"
import type { SystemStatsSnapshot } from "../../modules/system-stats/domain.ts"
import type { PwsaveStatus, MeasureName, LidAction } from "../../modules/power-save/domain.ts"
import type { FlowEntry, LogEntry } from "../../runtime/netmon-source.ts"
import type { PlayerSource } from "../../runtime/player-source.ts"

import { closeDashboardMode } from "../../app/controllers.ts"
import PlayerControls from "../../shared/ui/PlayerControls.tsx"
import PopupShell from "../../shared/ui/PopupShell.tsx"
import WideSpectrum from "./WideSpectrum.tsx"

// Network sections (reuse from network panel)
import HeaderSection from "../network/HeaderSection.tsx"
import IdentitySection from "../network/IdentitySection.tsx"
import DnsSection from "../network/DnsSection.tsx"
import BandwidthSection from "../network/BandwidthSection.tsx"
import QualitySection from "../network/QualitySection.tsx"
import LatencySection from "../network/LatencySection.tsx"
import SessionSection from "../network/SessionSection.tsx"
import ConnectionsSection from "../network/ConnectionsSection.tsx"
import TabArea from "../network/TabArea.tsx"

// Battery HUD (reuse)
import BatteryHudView from "../popups/BatteryHudView.tsx"

export interface DashboardModeProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
  clock: Accessor<string>
  // Network
  networkSnapshot: Accessor<NetworkSnapshot>
  wifiSnapshot: Accessor<WifiSnapshot>
  bandwidthSnapshot: Accessor<BandwidthSnapshot>
  qualitySnapshot: Accessor<QualitySnapshot>
  dnsSnapshot: Accessor<DnsSnapshot>
  latencySnapshot: Accessor<LatencySnapshot>
  sessionSnapshot: Accessor<SessionSnapshot>
  connectionsSnapshot: Accessor<ConnectionsSnapshot>
  flows: Accessor<FlowEntry[]>
  logs: Accessor<LogEntry[]>
  // Battery
  batterySnapshot: Accessor<BatterySnapshot | null>
  systemStats: Accessor<SystemStatsSnapshot | null>
  pwsaveStatus: Accessor<PwsaveStatus | null>
  lidAction: Accessor<LidAction>
  onToggleMeasure: (name: MeasureName, enable: boolean) => void
  onToggleAll: (enable: boolean) => void
  onSetLidAction: (action: LidAction) => void
  // Player + Spectrum
  player: PlayerSource
  spectrumBars: Accessor<number[]>
}

export default function DashboardMode(props: DashboardModeProps) {
  return (
    <PopupShell
      name={`dashboard-mode:${props.monitor}`}
      windowClass="DmWindow"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.EXCLUSIVE}
      layer={Astal.Layer.OVERLAY}
      contentClass="DmBackdrop"
      contentOrientation={Gtk.Orientation.VERTICAL}
      contentHalign={Gtk.Align.FILL}
      contentValign={Gtk.Align.FILL}
      contentHexpand
      contentVexpand
      onClose={closeDashboardMode}
    >
      {/* 上部: 時計 */}
      <box class="DmClockArea" halign={Gtk.Align.CENTER} valign={Gtk.Align.START}>
        <label class="DmClock" label={props.clock} />
      </box>

      {/* 音楽 + スペクトラム */}
      <box class="DmMusicArea" orientation={Gtk.Orientation.VERTICAL} spacing={8} halign={Gtk.Align.CENTER}>
        <WideSpectrum bars={props.spectrumBars} />
        <box spacing={12} halign={Gtk.Align.CENTER}>
          <label class="DmMusicTitle" label={props.player.label} />
          <PlayerControls
            class="DmMusicControls"
            isPlaying={props.player.isPlaying}
            onPrevious={() => props.player.previous()}
            onPlayPause={() => props.player.playPause()}
            onNext={() => props.player.next()}
          />
        </box>
      </box>

      {/* メイン: 左=ネットワーク 右=バッテリー */}
      <box class="DmMainArea" spacing={16} hexpand vexpand>
        {/* 左: ネットワーク */}
        <box class="DmNetPanel" orientation={Gtk.Orientation.VERTICAL} widthRequest={520} vexpand>
          <HeaderSection />
          <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
            <IdentitySection wifiSnapshot={props.wifiSnapshot} />
            <DnsSection dnsSnapshot={props.dnsSnapshot} />
            <BandwidthSection bandwidthSnapshot={props.bandwidthSnapshot} />
            <QualitySection qualitySnapshot={props.qualitySnapshot} />
            <LatencySection latencySnapshot={props.latencySnapshot} />
            <box spacing={12}>
              <box hexpand><SessionSection sessionSnapshot={props.sessionSnapshot} /></box>
              <box hexpand><ConnectionsSection connectionsSnapshot={props.connectionsSnapshot} /></box>
            </box>
          </box>
          <TabArea flows={props.flows} logs={props.logs} />
        </box>

        {/* 右: バッテリー */}
        <box class="DmBatPanel" orientation={Gtk.Orientation.VERTICAL} widthRequest={480} vexpand>
          <BatteryHudView
            snapshot={props.batterySnapshot}
            systemStats={props.systemStats}
            pwsaveStatus={props.pwsaveStatus}
            lidAction={props.lidAction}
            onToggleMeasure={props.onToggleMeasure}
            onToggleAll={props.onToggleAll}
            onSetLidAction={props.onSetLidAction}
          />
        </box>
      </box>
    </PopupShell>
  )
}
