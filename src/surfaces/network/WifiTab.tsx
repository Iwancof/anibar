import { Gdk, Gtk } from "ags/gtk4"
import { createMemo, createState } from "gnim"
import type { Accessor } from "gnim"
import { signalLevel, type WifiSnapshot } from "../../modules/wifi/domain.ts"

const MAX_APS = 50

export interface WifiTabProps {
  wifiSnapshot: Accessor<WifiSnapshot>
  visible: Accessor<boolean>
  onConnect: (ssid: string, password?: string) => void
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
  if (level >= 3) return "NpApSignalHigh"
  if (level >= 2) return "NpApSignalMid"
  if (level >= 1) return "NpApSignalLow"
  return "NpApSignalWeak"
}

export default function WifiTab(props: WifiTabProps) {
  const networks = createMemo(() => props.wifiSnapshot()?.networks ?? [])

  // 選択中の AP index (-1 = 未選択)
  const [selectedAp, setSelectedAp] = createState(-1)
  // パスワード入力用の ref
  const passwordRefs: (Gtk.Entry | null)[] = new Array(MAX_APS).fill(null)

  function handleApClick(index: number) {
    const a = networks()[index]
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
    const ref = passwordRefs[index]
    if (ref) ref.grab_focus()
  }

  function handleConnect(index: number) {
    const a = networks()[index]
    if (!a) return
    const ref = passwordRefs[index]
    const password = ref?.text ?? ""
    props.onConnect(a.ssid, password || undefined)
    setSelectedAp(-1)
    if (ref) ref.text = ""
  }

  return (
    <box
      class="NpTabContent"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={0}
      visible={props.visible}
      onRealize={(self: Gtk.Widget) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape && selectedAp() >= 0) {
            setSelectedAp(-1)
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      {Array.from({ length: MAX_APS }).map((_, i) => {
        const ap = createMemo(() => networks()[i] ?? null)
        const rowVisible = createMemo(() => ap() != null)
        const ssid = createMemo(() => ap()?.ssid ?? "")
        const security = createMemo(() => ap()?.security ?? "")
        const bssid = createMemo(() => ap()?.bssid ?? "")
        const signal = createMemo(() => ap()?.signal ?? 0)
        const inUse = createMemo(() => ap()?.inUse ?? false)
        const rowClass = createMemo(() =>
          ap()?.inUse ? "NpApRow NpApRowActive" : "NpApRow"
        )
        const sigLevel = createMemo(() => signalLevel(signal()))
        const sigIconLabel = createMemo(() => signalIcon(sigLevel()))
        const sigClass = createMemo(() => `NpApSignal ${signalColorClass(sigLevel())}`)
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
                  <label class="NpApSsid" label={ssid} halign={Gtk.Align.START} />
                  <box spacing={8}>
                    <label class="NpApMeta" label={security} halign={Gtk.Align.START} />
                    <label class="NpApBssid" label={bssid} halign={Gtk.Align.START} />
                  </box>
                </box>
                <label
                  class="NpApCheck"
                  label="󰄬"
                  visible={inUse}
                  valign={Gtk.Align.CENTER}
                />
                <label class="NpApSignalPct" label={sigPct} valign={Gtk.Align.CENTER} />
              </box>
            </button>
            {/* パスワード入力欄 */}
            <box
              class="NpApPassword"
              visible={showPassword}
              spacing={6}
            >
              <entry
                class="NpApPasswordEntry"
                hexpand
                placeholder_text="Password"
                visibility={false}
                onActivate={() => handleConnect(i)}
                onRealize={(self: Gtk.Entry) => {
                  passwordRefs[i] = self
                }}
              />
              <button
                class="NpApConnectBtn"
                onClicked={() => handleConnect(i)}
              >
                <label label="Connect" />
              </button>
            </box>
          </box>
        )
      })}
    </box>
  )
}
