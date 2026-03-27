import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"
import { createMemo } from "gnim"
import type { WifiSnapshot } from "../../modules/wifi/domain.ts"

export interface HeaderSectionProps {
  clock: Accessor<string>
  wifiSnapshot: Accessor<WifiSnapshot>
}

export default function HeaderSection(props: HeaderSectionProps) {
  const macBadge = createMemo(() => {
    const iface = props.wifiSnapshot()?.iface
    return iface?.mac?.slice(0, 8)?.toUpperCase() ?? "——:——:——"
  })

  return (
    <box class="NpHeader" spacing={0}>
      <box spacing={6} halign={Gtk.Align.START} hexpand valign={Gtk.Align.CENTER}>
        <label class="NpHeaderTitle" label="NETWORK" />
        <box class="NpLiveDot" widthRequest={5} heightRequest={5} valign={Gtk.Align.CENTER} />
        <label class="NpHeaderTime" label={props.clock} valign={Gtk.Align.CENTER} />
      </box>
      <label class="NpHeaderMac" label={macBadge} halign={Gtk.Align.END} valign={Gtk.Align.CENTER} />
    </box>
  )
}
