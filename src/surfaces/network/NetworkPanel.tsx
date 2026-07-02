import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"

import type { NetworkSnapshot } from "../../modules/network/domain.ts"
import type { WifiSnapshot } from "../../modules/wifi/domain.ts"
import type { BandwidthSnapshot } from "../../runtime/bandwidth-source.ts"
import type { QualitySnapshot } from "../../runtime/quality-source.ts"
import type { DnsSnapshot } from "../../runtime/dns-source.ts"
import type { LatencySnapshot } from "../../runtime/latency-source.ts"
import type { SessionSnapshot } from "../../runtime/session-source.ts"
import type { ConnectionsSnapshot } from "../../runtime/connections-source.ts"
import type { FlowEntry } from "../../runtime/netmon-source.ts"
import type { LogEntry } from "../../runtime/netmon-source.ts"

import { closeNetworkPopup } from "../../app/controllers.ts"
import PopupShell from "../../shared/ui/PopupShell.tsx"
import PanelHeader from "../../shared/ui/PanelHeader.tsx"
import HeaderSection from "./HeaderSection.tsx"
import IdentitySection from "./IdentitySection.tsx"
import BandwidthSection from "./BandwidthSection.tsx"
import QualitySection from "./QualitySection.tsx"
import DnsSection from "./DnsSection.tsx"
import LatencySection from "./LatencySection.tsx"
import SessionSection from "./SessionSection.tsx"
import ConnectionsSection from "./ConnectionsSection.tsx"
import TabArea from "./TabArea.tsx"
import WifiTab from "./WifiTab.tsx"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"

export interface NetworkPanelProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
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
  onConnect: (ssid: string, password?: string) => void
}

export default function NetworkPanel(props: NetworkPanelProps) {
  const apCount = createMemo(() => `${props.wifiSnapshot().networks.length}`)

  return (
    <PopupShell
      name={`network-popup:${props.monitor}`}
      windowClass="NpWindow"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.NORMAL}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.TOP}
      contentHalign={Gtk.Align.END}
      contentValign={Gtk.Align.FILL}
      contentSpacing={0}
      onClose={closeNetworkPopup}
    >
      {/* 左パネル: メイン情報 + Flows/Log */}
      <box class="NpPanel UiPanel" orientation={Gtk.Orientation.VERTICAL} widthRequest={520} vexpand>
        <HeaderSection networkSnapshot={props.networkSnapshot} wifiSnapshot={props.wifiSnapshot} />
        <box class="NpBody UiPanelBody" orientation={Gtk.Orientation.VERTICAL} spacing={0} vexpand>
          <box class="NpContent" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
            <IdentitySection wifiSnapshot={props.wifiSnapshot} />
            <DnsSection dnsSnapshot={props.dnsSnapshot} />
            <BandwidthSection bandwidthSnapshot={props.bandwidthSnapshot} />
            <box spacing={8}>
              <box hexpand><QualitySection qualitySnapshot={props.qualitySnapshot} /></box>
            </box>
            <box spacing={8}>
              <box hexpand><LatencySection latencySnapshot={props.latencySnapshot} /></box>
            </box>
            <box class="NpCompactRow" spacing={12}>
              <box hexpand><SessionSection sessionSnapshot={props.sessionSnapshot} /></box>
              <box hexpand><ConnectionsSection connectionsSnapshot={props.connectionsSnapshot} /></box>
            </box>
          </box>
          <TabArea
            flows={props.flows}
            logs={props.logs}
          />
        </box>
      </box>
      {/* 右パネル: APs 専用 */}
      <box class="NpApPanel UiPanel" orientation={Gtk.Orientation.VERTICAL} widthRequest={380} vexpand>
        <PanelHeader title="NET::AP" meta={apCount} />
        <box class="NpApPanelBody UiPanelBody" orientation={Gtk.Orientation.VERTICAL} spacing={8} vexpand>
          <SectionHeader label="ACCESS POINTS" />
          <Gtk.ScrolledWindow
            class="NpApPanelScroll"
            vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
            hscrollbarPolicy={Gtk.PolicyType.NEVER}
            vexpand
          >
            <WifiTab
              wifiSnapshot={props.wifiSnapshot}
              onConnect={props.onConnect}
            />
          </Gtk.ScrolledWindow>
        </box>
      </box>
    </PopupShell>
  )
}
