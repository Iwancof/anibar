import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { WifiSnapshot, WifiNetwork } from "../../modules/wifi/domain.ts"

const MAX_APS = 30
const BAR_HEIGHTS = [3, 5.5, 8, 10.5]

export interface WifiTabProps {
  wifiSnapshot: Accessor<WifiSnapshot>
  visible: Accessor<boolean>
}

function SignalBars(props: { signal: Accessor<number> }) {
  const level = createMemo(() => {
    const s = props.signal()
    if (s >= 75) return 4
    if (s >= 50) return 3
    if (s >= 25) return 2
    if (s > 0) return 1
    return 0
  })

  return (
    <box class="NpWifiSignal" spacing={1} valign={Gtk.Align.CENTER}>
      {BAR_HEIGHTS.map((h, i) => {
        const barClass = createMemo(() =>
          i < level() ? "NpWifiBar NpWifiBarActive" : "NpWifiBar"
        )
        return (
          <box
            class={barClass}
            widthRequest={3}
            heightRequest={h}
            valign={Gtk.Align.END}
          />
        )
      })}
    </box>
  )
}

function ApRow(props: { ap: Accessor<WifiNetwork | null> }) {
  const visible = createMemo(() => props.ap() != null)
  const ssid = createMemo(() => props.ap()?.ssid ?? "")
  const security = createMemo(() => props.ap()?.security ?? "")
  const signal = createMemo(() => props.ap()?.signal ?? 0)
  const signalText = createMemo(() => {
    const s = props.ap()?.signal
    return s != null ? `${s}%` : ""
  })
  const inUse = createMemo(() => props.ap()?.inUse ?? false)
  const rowClass = createMemo(() =>
    inUse() ? "NpWifiRow NpWifiRowActive" : "NpWifiRow"
  )
  const checkLabel = createMemo(() => (inUse() ? "✓" : ""))

  return (
    <box class={rowClass} spacing={6} visible={visible}>
      <SignalBars signal={signal} />
      <label class="NpWifiSsid" label={ssid} hexpand xalign={0} ellipsize={3} />
      <label class="NpWifiCheck" label={checkLabel} />
      <label class="NpWifiSecurity" label={security} widthRequest={50} xalign={1} />
      <label class="NpWifiSignalPct" label={signalText} widthRequest={32} xalign={1} />
    </box>
  )
}

export default function WifiTab(props: WifiTabProps) {
  const networks = createMemo(() => props.wifiSnapshot()?.networks ?? [])

  return (
    <box
      class="NpTabContent"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={0}
      visible={props.visible}
    >
      {Array.from({ length: MAX_APS }).map((_, i) => {
        const ap = createMemo(() => networks()[i] ?? null)
        return <ApRow ap={ap} />
      })}
    </box>
  )
}
