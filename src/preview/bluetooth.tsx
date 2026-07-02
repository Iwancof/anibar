import { Gtk } from "ags/gtk4"
import { createState } from "gnim"

import { bluetoothPreviewStates } from "../modules/bluetooth/mocks.ts"
import type { BluetoothSnapshot } from "../modules/bluetooth/domain.ts"
import type { BtActionResult } from "../modules/bluetooth/ports.ts"
import { BluetoothPopupView } from "../surfaces/popups/BluetoothPopup.tsx"
import PreviewWindow from "./PreviewWindow.tsx"
import { startPreviewApp } from "./startPreview.ts"

const okResult: BtActionResult = { ok: true }

function PreviewPanel(props: { name: string; state: BluetoothSnapshot }) {
  const [snapshot] = createState(props.state)

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
      <label class="BtPreviewLabel" label={props.name.toUpperCase()} halign={Gtk.Align.START} />
      <box class="BtPopupPanel UiPanel BtPreviewPanel">
        <BluetoothPopupView
          snapshot={snapshot}
          onSetPowered={async () => okResult}
          onConnectDevice={async () => okResult}
          onDisconnectDevice={async () => okResult}
          onStartDiscovery={async () => okResult}
          onStopDiscovery={async () => okResult}
        />
      </box>
    </box>
  )
}

startPreviewApp({
  instanceName: "ags-preview-bluetooth",
  main() {
    return (
      <PreviewWindow
        title="Bluetooth popup preview"
        subtitle="Unavailable, power, empty, connected, and scanning states."
        width={920}
        height={820}
      >
        <Gtk.ScrolledWindow
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          vexpand
        >
          <box class="BtPreviewList" orientation={Gtk.Orientation.VERTICAL} spacing={16}>
            {Object.entries(bluetoothPreviewStates).map(([name, state]) => (
              <PreviewPanel name={name} state={state} />
            ))}
          </box>
        </Gtk.ScrolledWindow>
      </PreviewWindow>
    )
  },
})
