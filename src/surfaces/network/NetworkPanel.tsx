import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

import type { NetworkSnapshot } from "../../modules/network/domain.ts"
import type { WifiSnapshot } from "../../modules/wifi/domain.ts"
import { closeNetworkPopup } from "../../app/network-controller.ts"
import HeaderSection from "./HeaderSection.tsx"
import IdentitySection from "./IdentitySection.tsx"

export interface NetworkPanelProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  clock: Accessor<string>
  networkSnapshot: Accessor<NetworkSnapshot>
  wifiSnapshot: Accessor<WifiSnapshot>
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
          <box class="NpPanel" orientation={Gtk.Orientation.VERTICAL} widthRequest={420}>
            <HeaderSection clock={props.clock} wifiSnapshot={props.wifiSnapshot} />
            <Gtk.ScrolledWindow
              class="NpScrollArea"
              vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
              hscrollbarPolicy={Gtk.PolicyType.NEVER}
              vexpand
              minContentHeight={400}
            >
              <box class="NpContent" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <IdentitySection wifiSnapshot={props.wifiSnapshot} />
                {/* Phase 2: BandwidthSection, QualitySection */}
                {/* Phase 3: DnsSection, LatencySection, SessionSection, ConnectionsSection */}
              </box>
            </Gtk.ScrolledWindow>
            {/* Phase 4: TabArea */}
          </box>
        </box>
      </overlay>
    </window>
  )
}
