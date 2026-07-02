import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import { countryBadge, type GlobalIpInfo, type WifiSnapshot } from "../../modules/wifi/domain.ts"
import InfoRow from "../../shared/ui/InfoRow.tsx"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"

export interface IdentitySectionProps {
  wifiSnapshot: Accessor<WifiSnapshot>
}

function geoText(info: GlobalIpInfo | null | undefined): string {
  if (!info) return ""
  return [[info.city].filter(Boolean).join(", "), info.org].filter(Boolean).join(" · ")
}

function GeoLine(props: { badge: Accessor<string>; value: Accessor<string>; class?: string }) {
  const hasBadge = createMemo(() => props.badge().length > 0)
  const rowClass = props.class ? `NpGeoLine ${props.class}` : "NpGeoLine"

  return (
    <box class={rowClass} spacing={6}>
      <label class="UiCountryBadge" label={props.badge} visible={hasBadge} />
      <label class="NpGeoLabel" label={props.value} halign={Gtk.Align.START} />
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
    return geoText(g)
  })
  const globalBadge = createMemo(() => countryBadge(props.wifiSnapshot()?.globalIp?.country))
  const torIp = createMemo(() => props.wifiSnapshot()?.torIp?.ip ?? "—")
  const torGeo = createMemo(() => {
    const g = props.wifiSnapshot()?.torIp
    return geoText(g)
  })
  const torBadge = createMemo(() => countryBadge(props.wifiSnapshot()?.torIp?.country))

  return (
    <box class="NpSection" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <SectionHeader label="IDENTITY" />
      <InfoRow label="SSID" value={ssid} />
      <InfoRow label="Interface" value={ifaceName} tone="dim" />
      <InfoRow label="IPv4" value={ipv4} tone="accent" />
      <InfoRow label="IPv6" value={ipv6} tone="small" />
      <InfoRow label="Gateway" value={gateway} />
      <InfoRow label="Global IP" value={globalIp} tone="accent" />
      <GeoLine badge={globalBadge} value={globalGeo} />
      <InfoRow label="Tor Exit" value={torIp} tone="magenta" />
      <GeoLine badge={torBadge} value={torGeo} class="NpGeoTor" />
    </box>
  )
}
