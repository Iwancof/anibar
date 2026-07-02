import { Gtk } from "ags/gtk4"

export default function HeaderSection() {
  return (
    <box class="NpHeader" spacing={6} halign={Gtk.Align.START} valign={Gtk.Align.CENTER}>
      <label class="NpHeaderTitle" label="NETWORK" />
      <box class="NpLiveDot" widthRequest={5} heightRequest={5} valign={Gtk.Align.CENTER} />
    </box>
  )
}
