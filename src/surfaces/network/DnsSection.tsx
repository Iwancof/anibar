import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { DnsSnapshot } from "../../runtime/dns-source.ts"

const MAX_DNS_SERVERS = 4

export interface DnsSectionProps {
  dnsSnapshot: Accessor<DnsSnapshot>
}

export default function DnsSection(props: DnsSectionProps) {
  const dotLabel = createMemo(() => props.dnsSnapshot().dot ? "DoT" : "Plain")
  const dotClass = createMemo(() =>
    props.dnsSnapshot().dot ? "NpDnsBadgeOn" : "NpDnsBadgeOff"
  )
  const dnssecLabel = createMemo(() => props.dnsSnapshot().dnssec ? "DNSSEC" : "No DNSSEC")
  const dnssecClass = createMemo(() =>
    props.dnsSnapshot().dnssec ? "NpDnsBadgeOn" : "NpDnsBadgeOff"
  )

  const serverChips = Array.from({ length: MAX_DNS_SERVERS }, (_, i) => {
    const server = createMemo(() => props.dnsSnapshot().servers[i] ?? null)
    const visible = createMemo(() => server() != null)
    const label = createMemo(() => server() ?? "")
    return { visible, label }
  })

  return (
    <box class="NpSection" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <box class="NpSectionHeader" spacing={6}>
        <label class="NpSectionLabel" label="DNS" />
        <box class="NpSectionLine" hexpand valign={Gtk.Align.CENTER} />
      </box>
      <box spacing={6} marginTop={2}>
        <label class={dotClass} label={dotLabel} />
        <label class={dnssecClass} label={dnssecLabel} />
      </box>
      <box class="NpDnsChips" spacing={4} marginTop={4}>
        {serverChips.map((chip) => (
          <label
            class="NpDnsChip"
            label={chip.label}
            visible={chip.visible}
          />
        ))}
      </box>
    </box>
  )
}
