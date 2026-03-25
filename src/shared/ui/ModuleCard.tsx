import { Gtk } from "ags/gtk4"

import type { Accessor } from "gnim"

import type { HealthTone } from "../health.ts"
import { toneClass } from "../health.ts"

type TextBinding = string | Accessor<string>
type ToneBinding = HealthTone | Accessor<HealthTone>

export interface ModuleCardProps {
  title: TextBinding
  headline: TextBinding
  detail: TextBinding
  tone: ToneBinding
  meta?: TextBinding
  footer?: TextBinding
  children?: any
}

function bindToneClass(tone: ToneBinding): string | Accessor<string> {
  if (typeof tone === "function") {
    return tone((value) => `ModuleCard ${toneClass(value)}`)
  }

  return `ModuleCard ${toneClass(tone)}`
}

export default function ModuleCard(props: ModuleCardProps) {
  return (
    <box class={bindToneClass(props.tone)} orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
        <label class="ModuleCardTitle" halign={Gtk.Align.START} xalign={0} label={props.title} />
        <label class="ModuleCardHeadline" halign={Gtk.Align.START} xalign={0} label={props.headline} />
        <label class="ModuleCardDetail" halign={Gtk.Align.START} xalign={0} label={props.detail} wrap />
      </box>
      {props.meta ? (
        <label class="ModuleCardMeta" halign={Gtk.Align.START} xalign={0} label={props.meta} wrap />
      ) : null}
      {props.children}
      {props.footer ? (
        <label class="ModuleCardFooter" halign={Gtk.Align.START} xalign={0} label={props.footer} wrap />
      ) : null}
    </box>
  )
}
