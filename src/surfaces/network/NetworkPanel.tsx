import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
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

import { closeNetworkPopup } from "../../app/network-controller.ts"
import HeaderSection from "./HeaderSection.tsx"
import IdentitySection from "./IdentitySection.tsx"
import BandwidthSection from "./BandwidthSection.tsx"
import QualitySection from "./QualitySection.tsx"
import DnsSection from "./DnsSection.tsx"
import LatencySection from "./LatencySection.tsx"
import SessionSection from "./SessionSection.tsx"
import ConnectionsSection from "./ConnectionsSection.tsx"
import TabArea from "./TabArea.tsx"

export interface NetworkPanelProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  clock: Accessor<string>
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
  onRescan: () => void
}

export default function NetworkPanel(props: NetworkPanelProps) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor

  return (
    <window
      name={`network-popup:${props.monitorIndex}`}
      class="NpWindow"
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={TOP | LEFT | RIGHT | BOTTOM}
      exclusivity={Astal.Exclusivity.NORMAL}
      keymode={Astal.Keymode.ON_DEMAND}
      layer={Astal.Layer.TOP}
      onRealize={(self: any) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            closeNetworkPopup()
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <overlay>
        <button class="NpBackdrop" hexpand vexpand onClicked={closeNetworkPopup} />
        <box
          $type="overlay"
          halign={Gtk.Align.END}
          valign={Gtk.Align.START}
        >
          <box class="NpPanel" orientation={Gtk.Orientation.VERTICAL} widthRequest={420} heightRequest={680}>
            <HeaderSection clock={props.clock} wifiSnapshot={props.wifiSnapshot} />
            <Gtk.ScrolledWindow
              class="NpScrollArea"
              vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
              hscrollbarPolicy={Gtk.PolicyType.NEVER}
              vexpand
            >
              <box class="NpContent" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <IdentitySection wifiSnapshot={props.wifiSnapshot} />
                <DnsSection dnsSnapshot={props.dnsSnapshot} />
                <BandwidthSection bandwidthSnapshot={props.bandwidthSnapshot} />
                <QualitySection qualitySnapshot={props.qualitySnapshot} />
                <LatencySection latencySnapshot={props.latencySnapshot} />
                <SessionSection sessionSnapshot={props.sessionSnapshot} />
                <ConnectionsSection connectionsSnapshot={props.connectionsSnapshot} />
              </box>
            </Gtk.ScrolledWindow>
            <TabArea
              wifiSnapshot={props.wifiSnapshot}
              flows={props.flows}
              logs={props.logs}
            />
          </box>
        </box>
      </overlay>
    </window>
  )
}
