import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

type ClassValue = string | Accessor<string>

export interface IconProps {
  icon: string | Accessor<string>
  class?: ClassValue
  visible?: boolean | Accessor<boolean>
  widthRequest?: number
  halign?: Gtk.Align
  valign?: Gtk.Align
}

function withUiIcon(value?: ClassValue): string | Accessor<string> {
  if (!value) return "UiIcon"
  if (typeof value === "function") {
    return value((klass) => `UiIcon ${klass}`)
  }
  return `UiIcon ${value}`
}

export default function Icon(props: IconProps) {
  return (
    <label
      class={withUiIcon(props.class)}
      label={props.icon}
      visible={props.visible ?? true}
      widthRequest={props.widthRequest}
      halign={props.halign}
      valign={props.valign}
    />
  )
}
