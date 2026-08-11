import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"

export interface PopupShellProps {
  name: string
  windowClass: string
  gdkmonitor: Gdk.Monitor
  onClose: () => void
  anchor?: number
  layer?: number
  keymode?: number
  exclusivity?: number
  contentClass?: string
  contentHalign?: Gtk.Align
  contentValign?: Gtk.Align
  contentOrientation?: Gtk.Orientation
  contentSpacing?: number
  contentHexpand?: boolean
  contentVexpand?: boolean
  children?: unknown
}

export default function PopupShell(props: PopupShellProps) {
  const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor

  return (
    <window
      name={props.name}
      class={props.windowClass}
      visible={false}
      application={app}
      gdkmonitor={props.gdkmonitor}
      anchor={props.anchor ?? (TOP | LEFT | RIGHT | BOTTOM)}
      exclusivity={props.exclusivity ?? Astal.Exclusivity.NORMAL}
      keymode={props.keymode ?? Astal.Keymode.ON_DEMAND}
      layer={props.layer ?? Astal.Layer.TOP}
      onRealize={(self: Gtk.Window) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_ctrl: Gtk.EventControllerKey, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) {
            props.onClose()
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)

        // クリック配送調査ログ: このパネル面のどこに press が届いたか
        const clickLog = new Gtk.GestureClick()
        clickLog.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        clickLog.connect("pressed", (_g: Gtk.GestureClick, _n: number, x: number, y: number) => {
          console.log(`[click] ${props.name} press at (${x.toFixed(0)},${y.toFixed(0)})`)
        })
        self.add_controller(clickLog)
      }}
    >
      <overlay>
        <button class="UiBackdrop" hexpand vexpand onClicked={props.onClose} />
        <box
          $type="overlay"
          class={props.contentClass ?? ""}
          halign={props.contentHalign ?? Gtk.Align.CENTER}
          valign={props.contentValign ?? Gtk.Align.CENTER}
          orientation={props.contentOrientation ?? Gtk.Orientation.HORIZONTAL}
          spacing={props.contentSpacing ?? 0}
          hexpand={props.contentHexpand ?? false}
          vexpand={props.contentVexpand ?? false}
        >
          {props.children}
        </box>
      </overlay>
    </window>
  )
}
