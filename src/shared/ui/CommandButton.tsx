import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

import Icon from "./Icon.tsx"

type LabelValue = string | Accessor<string>
type ClassValue = string | Accessor<string>

export interface CommandButtonProps {
  label: LabelValue
  icon?: LabelValue
  class?: ClassValue
  visible?: boolean | Accessor<boolean>
  widthRequest?: number
  halign?: Gtk.Align
  valign?: Gtk.Align
  onClicked: () => void
}

function buttonClass(extra?: ClassValue): string | Accessor<string> {
  if (!extra) return "UiCommandButton"
  if (typeof extra === "function") {
    return extra((klass) => `UiCommandButton ${klass}`)
  }
  return `UiCommandButton ${extra}`
}

export default function CommandButton(props: CommandButtonProps) {
  return (
    <button
      class={buttonClass(props.class)}
      visible={props.visible ?? true}
      widthRequest={props.widthRequest}
      halign={props.halign}
      valign={props.valign ?? Gtk.Align.CENTER}
      onClicked={props.onClicked}
    >
      <box spacing={5} valign={Gtk.Align.CENTER}>
        {props.icon ? <Icon class="UiCommandButtonIcon" icon={props.icon} /> : null}
        <label class="UiCommandButtonLabel" label={props.label} />
      </box>
    </button>
  )
}
