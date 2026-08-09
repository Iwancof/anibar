import { Astal, Gdk, Gtk } from "ags/gtk4"

import { closeWsGoto } from "../../app/controllers.ts"
import { switchToWorkspace } from "../../runtime/workspace-source.ts"
import PopupShell from "../../shared/ui/PopupShell.tsx"

export interface WsGotoWindowProps {
  gdkmonitor: Gdk.Monitor
  monitor: string
}

export default function WsGotoWindow(props: WsGotoWindowProps) {
  let entryRef: any = null

  function onActivate(self: any) {
    const n = Number.parseInt(self.text ?? "", 10)
    if (Number.isInteger(n) && n >= 1) {
      switchToWorkspace(n)
    }
    closeWsGoto()
  }

  return (
    <PopupShell
      name={`ws-goto:${props.monitor}`}
      windowClass="WsGoto"
      gdkmonitor={props.gdkmonitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.EXCLUSIVE}
      layer={Astal.Layer.OVERLAY}
      contentHalign={Gtk.Align.CENTER}
      contentValign={Gtk.Align.CENTER}
      onClose={closeWsGoto}
    >
      <box
        class="WsGotoPanel"
        spacing={10}
        widthRequest={220}
        onRealize={(self: any) => {
          // 開くたびに入力をリセットしてフォーカスする
          self.connect("map", () => {
            if (entryRef) {
              entryRef.text = ""
              entryRef.grab_focus()
            }
          })
        }}
      >
        <label class="LauncherSearchIcon" label="#" />
        <entry
          class="LauncherEntry"
          hexpand
          placeholder_text="WS::GOTO"
          onActivate={onActivate}
          onRealize={(self: any) => {
            entryRef = self
            self.grab_focus()
          }}
        />
      </box>
    </PopupShell>
  )
}
