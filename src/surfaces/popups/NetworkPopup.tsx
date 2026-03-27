import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { createState, createMemo } from "gnim"
import type { Accessor } from "gnim"

import type { NetworkSnapshot } from "../../modules/network/domain.ts"
import { signalLevel, type WifiSnapshot } from "../../modules/wifi/domain.ts"
import { closeNetworkPopup } from "../../app/network-controller.ts"

const MAX_APS = 50

/** 国コード (2文字) → 国旗絵文字 */
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return ""
  const offset = 0x1F1E6 - 65
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset,
  )
}

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

  // 選択中の AP index (-1 = 未選択)
  const [selectedAp, setSelectedAp] = createState(-1)
  // パスワード入力用の ref
  const passwordRefs: (Gtk.Entry | null)[] = new Array(MAX_APS).fill(null)

  function handleApClick(index: number) {
    const a = props.wifiSnapshot().networks[index]
    if (!a) return

    // 接続中なら何もしない
    if (a.inUse) return

    // Open セキュリティならパスワード不要で即接続
    if (!a.security || a.security === "" || a.security === "Open" || a.security === "--") {
      props.onConnect(a.ssid)
      setSelectedAp(-1)
      return
    }

    // 既に選択中の AP を再クリック → 閉じる
    if (selectedAp() === index) {
      setSelectedAp(-1)
      return
    }

    // パスワード入力を展開
    setSelectedAp(index)
    // フォーカスを entry に
    const ref = passwordRefs[index]
    if (ref) ref.grab_focus()
  }

  function handleConnect(index: number) {
    const a = props.wifiSnapshot().networks[index]
    if (!a) return
    const ref = passwordRefs[index]
    const password = ref?.text ?? ""
    props.onConnect(a.ssid, password || undefined)
    setSelectedAp(-1)
    if (ref) ref.text = ""
  }

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
            if (selectedAp() >= 0) {
              setSelectedAp(-1)
              return true
            }
            closeNetworkPopup()
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <overlay>
        <button class="NetPopupBackdrop" hexpand vexpand onClicked={() => {
          setSelectedAp(-1)
          closeNetworkPopup()
        }} />
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

            {/* Info rows — label left, value right in fixed-width box, left-aligned inside */}
            <box class="NetInfoSection" orientation={Gtk.Orientation.VERTICAL} spacing={3}>
              <box spacing={0}>
                <label class="NetInfoLabel" label="Connected" halign={Gtk.Align.START} hexpand />
                <box class="NetValueBox" widthRequest={180}><label class="NetIpFixed" xalign={0} label={props.wifiSnapshot((s) => s.connected?.ssid ?? "—")} hexpand /></box>
              </box>
              <box spacing={0}>
                <label class="NetInfoLabel" label="Interface" halign={Gtk.Align.START} hexpand />
                <box class="NetValueBox" widthRequest={180}><label class="NetIpFixed NetIpv6" xalign={0} label={props.wifiSnapshot((s) => s.iface?.name ?? "—")} hexpand /></box>
              </box>
              <box spacing={0}>
                <label class="NetInfoLabel" label="IPv4" halign={Gtk.Align.START} hexpand />
                <box class="NetValueBox" widthRequest={180}><label class="NetIpFixed" xalign={0} label={props.wifiSnapshot((s) => s.iface?.ipv4 ?? "—")} hexpand /></box>
              </box>
              <box spacing={0}>
                <label class="NetInfoLabel" label="IPv6" halign={Gtk.Align.START} hexpand />
                <box class="NetValueBox" widthRequest={180}><label class="NetIpFixed NetIpv6" xalign={0} label={props.wifiSnapshot((s) => s.iface?.ipv6 ?? "—")} hexpand /></box>
              </box>
              <box spacing={0}>
                <label class="NetInfoLabel" label="Gateway" halign={Gtk.Align.START} hexpand />
                <box class="NetValueBox" widthRequest={180}><label class="NetIpFixed" xalign={0} label={props.wifiSnapshot((s) => s.iface?.gateway ?? "—")} hexpand /></box>
              </box>
              <box spacing={0}>
                <label class="NetInfoLabel" label="Global IP" halign={Gtk.Align.START} hexpand />
                <box class="NetValueBox" widthRequest={180}><label class="NetIpFixed" xalign={0} label={props.wifiSnapshot((s) => s.globalIp?.ip ?? "—")} hexpand /></box>
              </box>
              <label
                class="NetGeoLabel"
                label={props.wifiSnapshot((s) => {
                  const g = s.globalIp
                  if (!g) return ""
                  const flag = g.country ? countryFlag(g.country) + " " : ""
                  const parts = [g.city, g.country].filter(Boolean)
                  const loc = parts.length > 0 ? parts.join(", ") : null
                  return flag + [loc, g.org].filter(Boolean).join(" · ")
                })}
                halign={Gtk.Align.END}
              />
              <box spacing={0}>
                <label class="NetInfoLabel NetTorLabel" label="Tor IP" halign={Gtk.Align.START} hexpand />
                <box class="NetValueBox" widthRequest={180}><label class="NetIpFixed NetTorIp" xalign={0} label={props.wifiSnapshot((s) => s.torIp?.ip ?? "—")} hexpand /></box>
              </box>
              <label
                class="NetGeoLabel NetTorGeo"
                label={props.wifiSnapshot((s) => {
                  const g = s.torIp
                  if (!g) return ""
                  const flag = g.country ? countryFlag(g.country) + " " : ""
                  const parts = [g.city, g.country].filter(Boolean)
                  const loc = parts.length > 0 ? parts.join(", ") : null
                  return flag + [loc, g.org].filter(Boolean).join(" · ")
                })}
                halign={Gtk.Align.END}
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

            {/* AP list */}
            <Gtk.ScrolledWindow
              class="NetApScroll"
              vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
              hscrollbarPolicy={Gtk.PolicyType.NEVER}
              vexpand
              minContentHeight={200}
              maxContentHeight={500}
            >
              <box class="NetApList" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                {Array.from({ length: MAX_APS }).map((_, i) => {
                  const ap = createMemo(() => props.wifiSnapshot().networks[i] ?? null)
                  const rowVisible = createMemo(() => ap() != null)
                  const ssid = createMemo(() => ap()?.ssid ?? "")
                  const security = createMemo(() => ap()?.security ?? "")
                  const bssid = createMemo(() => ap()?.bssid ?? "")
                  const signal = createMemo(() => ap()?.signal ?? 0)
                  const inUse = createMemo(() => ap()?.inUse ?? false)
                  const rowClass = createMemo(() =>
                    ap()?.inUse ? "NetApRow NetApRowActive" : "NetApRow"
                  )
                  const sigLevel = createMemo(() => signalLevel(signal()))
                  const sigIconLabel = createMemo(() => signalIcon(sigLevel()))
                  const sigClass = createMemo(() => `NetApSignal ${signalColorClass(sigLevel())}`)
                  const sigPct = createMemo(() => `${signal()}%`)
                  const showPassword = createMemo(() => selectedAp() === i)

                  return (
                    <box orientation={Gtk.Orientation.VERTICAL} visible={rowVisible} spacing={0}>
                      <button
                        class={rowClass}
                        onClicked={() => handleApClick(i)}
                      >
                        <box spacing={10} valign={Gtk.Align.CENTER}>
                          <label class={sigClass} label={sigIconLabel} valign={Gtk.Align.CENTER} />
                          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} hexpand>
                            <label class="NetApSsid" label={ssid} halign={Gtk.Align.START} />
                            <box spacing={8}>
                              <label class="NetApMeta" label={security} halign={Gtk.Align.START} />
                              <label class="NetApBssid" label={bssid} halign={Gtk.Align.START} />
                            </box>
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
                      {/* Password input */}
                      <box
                        class="NetApPassword"
                        visible={showPassword}
                        spacing={6}
                      >
                        <entry
                          class="NetApPasswordEntry"
                          hexpand
                          placeholder_text="Password"
                          visibility={false}
                          onActivate={() => handleConnect(i)}
                          onRealize={(self: Gtk.Entry) => {
                            passwordRefs[i] = self
                          }}
                        />
                        <button
                          class="NetApConnectBtn"
                          onClicked={() => handleConnect(i)}
                        >
                          <label label="Connect" />
                        </button>
                      </box>
                    </box>
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
