import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

export interface PanelHeaderProps {
  title: string | Accessor<string>
  meta?: string | Accessor<string>
  dotClass?: string | Accessor<string>
}

export default function PanelHeader(props: PanelHeaderProps) {
  const dotClass = props.dotClass ?? "UiPanelHeaderDot UiPanelHeaderDotAccent"

  return (
    <box class="UiPanelHeader" spacing={8}>
      <box class={dotClass} widthRequest={7} heightRequest={7} valign={Gtk.Align.CENTER} />
      <label class="UiPanelHeaderTitle" label={props.title} halign={Gtk.Align.START} hexpand />
      <label
        class="UiPanelHeaderMeta"
        label={props.meta ?? ""}
        visible={props.meta ? true : false}
        halign={Gtk.Align.END}
      />
    </box>
  )
}
