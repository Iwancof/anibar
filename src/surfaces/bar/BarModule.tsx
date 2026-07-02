import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

import Icon from "../../shared/ui/Icon.tsx"

export type BarModuleTone = "normal" | "accent" | "muted" | "warn" | "crit" | "good"

type ToneValue = BarModuleTone | Accessor<BarModuleTone>
type LabelValue = string | Accessor<string>

export interface BarModuleProps {
  icon: LabelValue
  value?: LabelValue
  tone?: ToneValue
  class?: string
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function moduleClass(tone?: ToneValue, extra?: string): string | Accessor<string> {
  const base = extra ? `BarModule ${extra}` : "BarModule"
  if (!tone) return `${base} BarModuleToneNormal`
  if (typeof tone === "function") {
    return tone((value) => `${base} BarModuleTone${capitalize(value)}`)
  }
  return `${base} BarModuleTone${capitalize(tone)}`
}

function valueVisible(value?: LabelValue): boolean | Accessor<boolean> {
  if (value == null) return false
  if (typeof value === "function") return value((label) => label.length > 0)
  return value.length > 0
}

export default function BarModule(props: BarModuleProps) {
  return (
    <box class={moduleClass(props.tone, props.class)} spacing={4} valign={Gtk.Align.CENTER}>
      <Icon class="BarModuleIcon" icon={props.icon} valign={Gtk.Align.CENTER} />
      <label
        class="BarModuleValue"
        label={props.value ?? ""}
        visible={valueVisible(props.value)}
        valign={Gtk.Align.CENTER}
      />
    </box>
  )
}
