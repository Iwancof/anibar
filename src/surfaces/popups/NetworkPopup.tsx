import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"

import type { NetworkSnapshot } from "../../modules/network/domain.ts"
import { signalLevel, type WifiSnapshot } from "../../modules/wifi/domain.ts"
import { closeNetworkPopup } from "../../app/network-controller.ts"

const MAX_APS = 15

export interface NetworkPopupProps {
  gdkmonitor: Gdk.Monitor
  monitorIndex: number
  networkSnapshot: Accessor<NetworkSnapshot>
  wifiSnapshot: Accessor<WifiSnapshot>
  onConnect: (ssid: string, password?: string) => void
  onRescan: () => void
}

function signalIcon(level: number): string {
  switch (level) {
    case 4: return "󰤨"
    case 3: return "󰤥"
    case 2: return "󰤢"
    case 1: return "󰤟"
    default: return "󰤯"
  }
}

function signalColorClass(level: number): string {
  if (level >= 3) return "NetApSignalHigh"
  if (level >= 2) return "NetApSignalMid"
  if (level >= 1) return "NetApSignalLow"
  return "NetApSignalWeak"
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
          <box class="NetPopupPanel" orientation={Gtk.Orientation.VERTICAL} widthRequest={380}>
            {/* Header */}
            <box class="NetPopupHeader" spacing={8}>
              <label class="NetPopupTitle" label="NETWORK" hexpand halign={Gtk.Align.START} />
              <label
                class="NetPopupStatus"
                label={props.networkSnapshot((s) =>
                  s.online ? (s.connectionName ?? "Connected") : "Offline"
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
                />
              </box>
              <label
                class="NetGeoLabel"
                label={props.wifiSnapshot((s) => {
                  const g = s.globalIp
                  if (!g) return ""
                  const parts = [g.city, g.country].filter(Boolean)
                  const loc = parts.length > 0 ? parts.join(", ") : null
                  return [loc, g.org].filter(Boolean).join(" · ")
                })}
                halign={Gtk.Align.START}
              />
            </box>

            {/* Interface + Tailscale */}
            <box class="NetIfRow" spacing={8}>
              <label
                class="NetIfLabel"
                label={props.networkSnapshot((s) =>
                  s.online ? `${s.linkKind.toUpperCase()} · ${s.interfaceName ?? ""}` : "No interface"
                )}
                halign={Gtk.Align.START}
                hexpand
              />
              <label
                class="NetTailscale"
                label={props.networkSnapshot((s) => s.tailscaleOnline ? "󰒒 TS" : "")}
                halign={Gtk.Align.END}
              />
            </box>

            {/* AP list header */}
            <box class="NetApHeader" spacing={4}>
              <label class="NetApHeaderLabel" label="WI-FI NETWORKS" halign={Gtk.Align.START} hexpand />
              <button class="NetRescanBtn" onClicked={props.onRescan}>
                <label class="NetRescanIcon" label="󰑐" />
              </button>
            </box>

            {/* AP list — pre-created rows */}
            <Gtk.ScrolledWindow
              class="NetApScroll"
              vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
              hscrollbarPolicy={Gtk.PolicyType.NEVER}
              vexpand
              minContentHeight={100}
              maxContentHeight={300}
            >
              <box class="NetApList" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                {Array.from({ length: MAX_APS }).map((_, i) => {
                  const ap = createMemo(() => props.wifiSnapshot().networks[i] ?? null)
                  const rowVisible = createMemo(() => ap() != null)
                  const ssid = createMemo(() => ap()?.ssid ?? "")
                  const security = createMemo(() => ap()?.security ?? "")
                  const signal = createMemo(() => ap()?.signal ?? 0)
                  const inUse = createMemo(() => ap()?.inUse ?? false)
                  const rowClass = createMemo(() =>
                    ap()?.inUse ? "NetApRow NetApRowActive" : "NetApRow"
                  )
                  const sigLevel = createMemo(() => signalLevel(signal()))
                  const sigIconLabel = createMemo(() => signalIcon(sigLevel()))
                  const sigClass = createMemo(() => `NetApSignal ${signalColorClass(sigLevel())}`)
                  const sigPct = createMemo(() => `${signal()}%`)

                  return (
                    <button
                      class={rowClass}
                      visible={rowVisible}
                      onClicked={() => {
                        const a = ap()
                        if (a && !a.inUse) props.onConnect(a.ssid)
                      }}
                    >
                      <box spacing={10} valign={Gtk.Align.CENTER}>
                        <label class={sigClass} label={sigIconLabel} valign={Gtk.Align.CENTER} />
                        <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} hexpand>
                          <label class="NetApSsid" label={ssid} halign={Gtk.Align.START} />
                          <label class="NetApMeta" label={security} halign={Gtk.Align.START} />
                        </box>
                        <label
                          class="NetApCheck"
                          label="󰄬"
                          visible={inUse}
                          valign={Gtk.Align.CENTER}
                        />
                        <label class="NetApSignalPct" label={sigPct} valign={Gtk.Align.CENTER} />
                      </box>
                    </button>
                  )
                })}
              </box>
            </Gtk.ScrolledWindow>
          </box>
        </box>
      </overlay>
    </window>
  )
}
