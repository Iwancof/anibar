import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

import { DIM } from "../theme-tokens.ts"

export type InfoRowTone = "normal" | "accent" | "magenta" | "dim" | "small"

type ToneValue = InfoRowTone | Accessor<InfoRowTone>

export interface InfoRowProps {
  label: string
  value: string | Accessor<string>
  tone?: ToneValue
  labelWidth?: number
}

function toneClass(tone?: ToneValue): string | Accessor<string> {
  if (!tone) return "UiInfoRowValue UiInfoRowToneNormal"
  if (typeof tone === "function") {
    return tone((value) => `UiInfoRowValue UiInfoRowTone${capitalize(value)}`)
  }
  return `UiInfoRowValue UiInfoRowTone${capitalize(tone)}`
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function InfoRow(props: InfoRowProps) {
  return (
    <box class="UiInfoRow" spacing={0}>
      <label
        class="UiInfoRowLabel"
        label={props.label}
        halign={Gtk.Align.START}
        widthRequest={props.labelWidth ?? DIM["label-sm"]}
      />
      <label class={toneClass(props.tone)} label={props.value} xalign={0} hexpand />
    </box>
  )
}
