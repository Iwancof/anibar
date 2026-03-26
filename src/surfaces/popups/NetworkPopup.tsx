import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { NetworkSnapshot } from "../../modules/network/domain.ts"
import type { WifiAccessPoint, WifiSnapshot } from "../../runtime/wifi-source.ts"
import { closeNetworkPopup } from "../../app/popup-controller.ts"

export interface NetworkPopupProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  networkSnapshot: Accessor<NetworkSnapshot>
  wifiSnapshot: Accessor<WifiSnapshot>
  onConnect: (ssid: string) => void
}

function signalIcon(signal: number): string {
  if (signal >= 75) return "󰤨"  // nf-md-wifi_strength_4
  if (signal >= 50) return "󰤥"  // nf-md-wifi_strength_3
  if (signal >= 25) return "󰤢"  // nf-md-wifi_strength_2
  return "󰤟"                    // nf-md-wifi_strength_1
}

function signalClass(signal: number): string {
  if (signal >= 75) return "NetApSignalHigh"
  if (signal >= 50) return "NetApSignalMid"
  if (signal >= 25) return "NetApSignalLow"
  return "NetApSignalWeak"
}

function ApRow({ ap, onConnect }: { ap: WifiAccessPoint; onConnect: (ssid: string) => void }) {
  return (
    <button
      class={ap.inUse ? "NetApRow NetApRowActive" : "NetApRow"}
      onClicked={() => { if (!ap.inUse) onConnect(ap.ssid) }}
    >
      <box spacing={10} valign={Gtk.Align.CENTER}>
        <label
          class={`NetApSignal ${signalClass(ap.signal)}`}
          label={signalIcon(ap.signal)}
          valign={Gtk.Align.CENTER}
        />
        <box vertical valign={Gtk.Align.CENTER} hexpand>
          <label class="NetApSsid" label={ap.ssid} halign={Gtk.Align.START} />
          <label
            class="NetApMeta"
            label={ap.security || "Open"}
            halign={Gtk.Align.START}
          />
        </box>
        {ap.inUse && (
          <label class="NetApCheck" label="󰄬" valign={Gtk.Align.CENTER} />
        )}
        <label
          class="NetApSignalPct"
          label={`${ap.signal}%`}
          valign={Gtk.Align.CENTER}
        />
      </box>
    </button>
  )
}

export default function NetworkPopup(props: NetworkPopupProps) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor

  return (
    <window
      name={`network-popup:${props.monitorIndex}`}
      class="NetPopup"
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
        <button class="NetPopupBackdrop" hexpand vexpand onClicked={closeNetworkPopup} />
        <box
          $type="overlay"
          halign={Gtk.Align.END}
          valign={Gtk.Align.START}
        >
          <box class="NetPopupPanel" vertical>
            {/* Header */}
            <box class="NetPopupHeader" spacing={8}>
              <label class="NetPopupTitle" label="NETWORK" hexpand halign={Gtk.Align.START} />
              <label
                class="NetPopupStatus"
                label={props.networkSnapshot((s) =>
                  s.online
                    ? `${s.connectionName ?? s.interfaceName ?? "Connected"}`
                    : "Offline"
                )}
                halign={Gtk.Align.END}
              />
            </box>

            {/* Global IP */}
            <box class="NetIpRow" spacing={8}>
              <label class="NetIpLabel" label="Global IP" halign={Gtk.Align.START} />
              <label
                class="NetIpValue"
                label={props.wifiSnapshot((s) => s.globalIp ?? "—")}
                halign={Gtk.Align.END}
                hexpand
                selectable
              />
            </box>

            {/* Interface info */}
            <box class="NetIfRow" spacing={8}>
              <label
                class="NetIfLabel"
                label={props.networkSnapshot((s) =>
                  s.online
                    ? `${s.linkKind.toUpperCase()} • ${s.interfaceName ?? ""}`
                    : "No active interface"
                )}
                halign={Gtk.Align.START}
                hexpand
              />
              <label
                class="NetTailscale"
                label={props.networkSnapshot((s) =>
                  s.tailscaleOnline ? "󰒒 TS" : ""
                )}
                halign={Gtk.Align.END}
              />
            </box>

            {/* Wi-Fi AP list */}
            <box class="NetApHeader" spacing={4}>
              <label class="NetApHeaderLabel" label="WI-FI NETWORKS" halign={Gtk.Align.START} hexpand />
            </box>

            <scrollable
              class="NetApScroll"
              vscrollbar-policy={Gtk.PolicyType.AUTOMATIC}
              hscrollbar-policy={Gtk.PolicyType.NEVER}
              vexpand
            >
              <box class="NetApList" vertical spacing={2}>
                {props.wifiSnapshot((s) => {
                  if (s.accessPoints.length === 0) {
                    return <label class="NetApEmpty" label="No Wi-Fi networks found" />
                  }
                  return s.accessPoints.map((ap) => (
                    <ApRow ap={ap} onConnect={props.onConnect} />
                  ))
                })}
              </box>
            </scrollable>
          </box>
        </box>
      </overlay>
    </window>
  )
}
