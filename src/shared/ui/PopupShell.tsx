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

        // Hyprland はパネルのマップ直後、カーソルが動くまでポインタフォーカスを
        // このパネル面に残す。その間バー上でクリックすると press は領域外の
        // 負座標でここへ届く (バーには届かない)。領域外 press は「外側クリック」
        // として閉じる — 開いたボタンを動かさず再クリックで閉じられるようにする。
        const outsidePress = new Gtk.GestureClick()
        outsidePress.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        outsidePress.connect("pressed", (_g: Gtk.GestureClick, _n: number, x: number, y: number) => {
          const w = self.get_width()
          const h = self.get_height()
          if (x < 0 || y < 0 || x >= w || y >= h) {
            console.log(`[click] ${props.name} outside press (${x.toFixed(0)},${y.toFixed(0)}) -> close`)
            props.onClose()
          }
        })
        self.add_controller(outsidePress)
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
