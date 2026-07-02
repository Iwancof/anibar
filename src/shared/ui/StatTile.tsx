import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

export type StatTileTone = "normal" | "info" | "accent" | "good" | "charge" | "warn" | "crit" | "muted"

type ToneValue = StatTileTone | Accessor<StatTileTone>

export interface StatTileProps {
  label: string
  value: string | Accessor<string>
  unit?: string | Accessor<string>
  tone?: ToneValue
  hexpand?: boolean
}

function toneClass(tone?: ToneValue): string | Accessor<string> {
  if (!tone) return "UiStatTile UiStatTileToneNormal"
  if (typeof tone === "function") {
    return tone((value) => `UiStatTile UiStatTileTone${capitalize(value)}`)
  }
  return `UiStatTile UiStatTileTone${capitalize(tone)}`
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function StatTile(props: StatTileProps) {
  return (
    <box class={toneClass(props.tone)} orientation={Gtk.Orientation.VERTICAL} spacing={1} hexpand={props.hexpand ?? true}>
      <box class="UiStatTileReadout" spacing={3}>
        <label class="UiStatTileValue" label={props.value} halign={Gtk.Align.START} />
        <label class="UiStatTileUnit" label={props.unit ?? ""} visible={props.unit ? true : false} valign={Gtk.Align.END} />
      </box>
      <label class="UiStatTileLabel" label={props.label} halign={Gtk.Align.START} />
    </box>
  )
}
