import { Gtk } from "ags/gtk4"
import type { Accessor } from "gnim"

import Icon from "./Icon.tsx"
import { ICONS } from "./icons.ts"

export interface PlayerControlsProps {
  isPlaying: Accessor<boolean>
  onPrevious: () => void
  onPlayPause: () => void
  onNext: () => void
  class?: string
}

export default function PlayerControls(props: PlayerControlsProps) {
  const playPauseIcon = props.isPlaying((playing) => playing ? ICONS.pause : ICONS.play)

  return (
    <box class={props.class ? `UiPlayerControls ${props.class}` : "UiPlayerControls"} spacing={6} valign={Gtk.Align.CENTER}>
      <button class="UiPlayerBtn" valign={Gtk.Align.CENTER} onClicked={props.onPrevious}>
        <Icon icon={ICONS.previous} />
      </button>
      <button class="UiPlayerBtn" valign={Gtk.Align.CENTER} onClicked={props.onPlayPause}>
        <Icon icon={playPauseIcon} />
      </button>
      <button class="UiPlayerBtn" valign={Gtk.Align.CENTER} onClicked={props.onNext}>
        <Icon icon={ICONS.next} />
      </button>
    </box>
  )
}
