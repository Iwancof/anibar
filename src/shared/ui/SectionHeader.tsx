import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

export interface SectionHeaderProps {
  label: string | Accessor<string>
  meta?: string | Accessor<string>
  class?: string
}

export default function SectionHeader(props: SectionHeaderProps) {
  return (
    <box class={props.class ? `UiSectionHeader ${props.class}` : "UiSectionHeader"} spacing={6}>
      <label class="UiSectionHeaderLabel" label={props.label} halign={Gtk.Align.START} />
      <box class="UiSectionHeaderRule" hexpand valign={Gtk.Align.CENTER} />
      <label
        class="UiSectionHeaderMeta"
        label={props.meta ?? ""}
        visible={props.meta ? true : false}
        halign={Gtk.Align.END}
      />
    </box>
  )
}
