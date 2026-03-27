import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { NetworkSnapshot } from "../../modules/network/domain.ts"
import { signalLevel, type WifiNetwork, type WifiSnapshot } from "../../modules/wifi/domain.ts"
import { closeNetworkPopup } from "../../app/network-controller.ts"

export interface NetworkPopupProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  networkSnapshot: Accessor<NetworkSnapshot>
  wifiSnapshot: Accessor<WifiSnapshot>
  onConnect: (ssid: string, password?: string) => void
  onRescan: () => void
}

function signalIcon(signal: number): string {
  const level = signalLevel(signal)
  switch (level) {
    case 4: return "󰤨"
    case 3: return "󰤥"
    case 2: return "󰤢"
    case 1: return "󰤟"
    default: return "󰤯"
  }
}

function signalClass(signal: number): string {
  const level = signalLevel(signal)
  if (level >= 3) return "NetApSignalHigh"
  if (level >= 2) return "NetApSignalMid"
  if (level >= 1) return "NetApSignalLow"
  return "NetApSignalWeak"
}

function ApRow({ ap, onConnect }: { ap: WifiNetwork; onConnect: (ssid: string) => void }) {
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
        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} hexpand>
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
          <box class="NetPopupPanel" orientation={Gtk.Orientation.VERTICAL}>
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

            {/* Connected section */}
            <box class="NetConnectedSection" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
              <box spacing={8}>
                <label class="NetConnectedLabel" label="Connected" halign={Gtk.Align.START} />
                <label
                  class="NetConnectedSsid"
                  label={props.wifiSnapshot((s) => s.connected?.ssid ?? "—")}
                  halign={Gtk.Align.END}
                  hexpand
                />
              </box>
              <box spacing={8}>
                <label class="NetIpLabel" label="Local IP" halign={Gtk.Align.START} />
                <label
                  class="NetIpValue"
                  label={props.wifiSnapshot((s) => s.localIp ?? "—")}
                  halign={Gtk.Align.END}
                  hexpand
                  selectable
                />
              </box>
            </box>

            {/* Global IP */}
            <box class="NetIpRow" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
              <box spacing={8}>
                <label class="NetIpLabel" label="Global IP" halign={Gtk.Align.START} />
                <label
                  class="NetIpValue"
                  label={props.wifiSnapshot((s) => s.globalIp?.ip ?? "—")}
                  halign={Gtk.Align.END}
                  hexpand
                  selectable
                />
              </box>
              <label
                class="NetGeoLabel"
                label={props.wifiSnapshot((s) => {
                  const g = s.globalIp
                  if (!g) return ""
                  const parts = [g.city, g.country].filter(Boolean)
                  const loc = parts.length > 0 ? parts.join(", ") : null
                  return [loc, g.org].filter(Boolean).join(" • ")
                })}
                halign={Gtk.Align.START}
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
              <button class="NetRescanBtn" onClicked={props.onRescan}>
                <label class="NetRescanIcon" label="󰑐" />
              </button>
            </box>

            <Gtk.ScrolledWindow
              class="NetApScroll"
              vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
              hscrollbarPolicy={Gtk.PolicyType.NEVER}
              vexpand
              minContentHeight={100}
            >
              <box class="NetApList" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                {props.wifiSnapshot((s) => {
                  if (s.networks.length === 0) {
                    return <label class="NetApEmpty" label="No Wi-Fi networks found" />
                  }
                  return s.networks.map((ap) => (
                    <ApRow ap={ap} onConnect={(ssid) => props.onConnect(ssid)} />
                  ))
                })}
              </box>
            </Gtk.ScrolledWindow>
          </box>
        </box>
      </overlay>
    </window>
  )
}
