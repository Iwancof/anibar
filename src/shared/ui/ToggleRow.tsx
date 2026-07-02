import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

export interface ToggleRowProps {
  label: string
  subLabel: string
  active: Accessor<boolean>
  onToggle: (active: boolean) => void
  emphasis?: boolean
}

export default function ToggleRow(props: ToggleRowProps) {
  const rowClass = props.emphasis ? "UiToggleRow UiToggleRowEmphasis" : "UiToggleRow"
  const trackClass = props.active((on) =>
    on ? "UiToggleTrack UiToggleTrackOn" : "UiToggleTrack",
  )
  const knobClass = props.active((on) =>
    on ? "UiToggleKnob UiToggleKnobOn" : "UiToggleKnob",
  )

  return (
    <box class={rowClass} spacing={0}>
      <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.START} valign={Gtk.Align.CENTER}>
        <label class="UiToggleLabel" label={props.label} halign={Gtk.Align.START} />
        <label class="UiToggleSub" label={props.subLabel} halign={Gtk.Align.START} />
      </box>
      <button
        class="UiToggleSwitchBtn"
        onClicked={() => props.onToggle(!props.active())}
        valign={Gtk.Align.CENTER}
      >
        <box class={trackClass}>
          <box class={knobClass} />
        </box>
      </button>
    </box>
  )
}
