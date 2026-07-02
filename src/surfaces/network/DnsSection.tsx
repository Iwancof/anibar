import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { DnsSnapshot } from "../../runtime/dns-source.ts"
import { fixedSlots } from "../../shared/fixed-slots.ts"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"

const MAX_DNS_SERVERS = 4
const MAX_PROTOCOLS = 4

export interface DnsSectionProps {
  dnsSnapshot: Accessor<DnsSnapshot>
}

export default function DnsSection(props: DnsSectionProps) {
  const serverChips = fixedSlots(MAX_DNS_SERVERS).map((i) => {
    const server = createMemo(() => props.dnsSnapshot().servers[i] ?? null)
    const visible = createMemo(() => server() != null)
    const label = createMemo(() => server() ?? "")
    return { visible, label }
  })

  const protocolChips = fixedSlots(MAX_PROTOCOLS).map((i) => {
    const proto = createMemo(() => props.dnsSnapshot().protocols[i] ?? null)
    const visible = createMemo(() => proto() != null)
    const label = createMemo(() => proto() ?? "")
    return { visible, label }
  })

  const linkDns = createMemo(() => {
    const link = props.dnsSnapshot().linkDns
    return link ? `Link DNS: ${link}` : ""
  })
  const hasLinkDns = createMemo(() => props.dnsSnapshot().linkDns != null)

  return (
    <box class="NpSection" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <SectionHeader label="DNS" />
      <box spacing={4} marginTop={2}>
        {protocolChips.map((chip) => (
          <label class="NpDnsBadgeOn" label={chip.label} visible={chip.visible} />
        ))}
      </box>
      <box class="NpDnsChips" spacing={4} marginTop={4}>
        {serverChips.map((chip) => (
          <label class="NpDnsChip" label={chip.label} visible={chip.visible} />
        ))}
      </box>
      <label
        class="NpDnsLinkInfo"
        label={linkDns}
        visible={hasLinkDns}
        halign={Gtk.Align.START}
      />
    </box>
  )
}
