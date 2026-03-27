import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"
import type { WifiSnapshot } from "../../modules/wifi/domain.ts"

export interface HeaderSectionProps {
  wifiSnapshot: Accessor<WifiSnapshot>
}

export default function HeaderSection(_props: HeaderSectionProps) {
  return (
    <box class="NpHeader" spacing={6} halign={Gtk.Align.START} valign={Gtk.Align.CENTER}>
      <label class="NpHeaderTitle" label="NETWORK" />
      <box class="NpLiveDot" widthRequest={5} heightRequest={5} valign={Gtk.Align.CENTER} />
    </box>
  )
}
