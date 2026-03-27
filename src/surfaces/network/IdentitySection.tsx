import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { WifiSnapshot } from "../../modules/wifi/domain.ts"

export interface IdentitySectionProps {
  wifiSnapshot: Accessor<WifiSnapshot>
}

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return ""
  const offset = 0x1F1E6 - 65
  return String.fromCodePoint(code.charCodeAt(0) + offset, code.charCodeAt(1) + offset)
}

function InfoRow(props: { label: string; value: Accessor<string>; valueClass?: string }) {
  return (
    <box class="NpInfoRow" spacing={0}>
      <label class="NpInfoLabel" label={props.label} halign={Gtk.Align.START} widthRequest={80} />
      <label class={props.valueClass ?? "NpInfoValue"} label={props.value} xalign={0} hexpand />
    </box>
  )
}

export default function IdentitySection(props: IdentitySectionProps) {
  const ssid = createMemo(() => props.wifiSnapshot()?.connected?.ssid ?? "—")
  const ifaceName = createMemo(() => props.wifiSnapshot()?.iface?.name ?? "—")
  const ipv4 = createMemo(() => props.wifiSnapshot()?.iface?.ipv4 ?? "—")
  const ipv6 = createMemo(() => props.wifiSnapshot()?.iface?.ipv6 ?? "—")
  const gateway = createMemo(() => props.wifiSnapshot()?.iface?.gateway ?? "—")
  const globalIp = createMemo(() => props.wifiSnapshot()?.globalIp?.ip ?? "—")
  const globalGeo = createMemo(() => {
    const g = props.wifiSnapshot()?.globalIp
    if (!g) return ""
    const flag = g.country ? countryFlag(g.country) + " " : ""
    const parts = [g.city, g.country].filter(Boolean)
    const loc = parts.length > 0 ? parts.join(", ") : null
    return flag + [loc, g.org].filter(Boolean).join(" · ")
  })
  const torIp = createMemo(() => props.wifiSnapshot()?.torIp?.ip ?? "—")
  const torGeo = createMemo(() => {
    const g = props.wifiSnapshot()?.torIp
    if (!g) return ""
    const flag = g.country ? countryFlag(g.country) + " " : ""
    const parts = [g.city, g.country].filter(Boolean)
    const loc = parts.length > 0 ? parts.join(", ") : null
    return flag + [loc, g.org].filter(Boolean).join(" · ")
  })

  return (
    <box class="NpSection" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <box class="NpSectionHeader" spacing={6}>
        <label class="NpSectionLabel" label="IDENTITY" />
        <box class="NpSectionLine" hexpand valign={Gtk.Align.CENTER} />
      </box>
      <InfoRow label="SSID" value={ssid} />
      <InfoRow label="Interface" value={ifaceName} valueClass="NpInfoValueDim" />
      <InfoRow label="IPv4" value={ipv4} valueClass="NpInfoValueCyan" />
      <InfoRow label="IPv6" value={ipv6} valueClass="NpInfoValueSmall" />
      <InfoRow label="Gateway" value={gateway} />
      <InfoRow label="Global IP" value={globalIp} valueClass="NpInfoValueCyan" />
      <label class="NpGeoLabel" label={globalGeo} halign={Gtk.Align.START} marginStart={80} />
      <InfoRow label="Tor Exit" value={torIp} valueClass="NpInfoValueMagenta" />
      <label class="NpGeoLabel NpGeoTor" label={torGeo} halign={Gtk.Align.START} marginStart={80} />
    </box>
  )
}
