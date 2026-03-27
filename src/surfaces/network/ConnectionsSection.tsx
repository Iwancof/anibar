import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { ConnectionsSnapshot } from "../../runtime/connections-source.ts"

export interface ConnectionsSectionProps {
  connectionsSnapshot: Accessor<ConnectionsSnapshot>
}

export default function ConnectionsSection(props: ConnectionsSectionProps) {
  const established = createMemo(() => String(props.connectionsSnapshot().established))
  const listening = createMemo(() => String(props.connectionsSnapshot().listening))
  const openPorts = createMemo(() => String(props.connectionsSnapshot().openPorts))

  return (
    <box class="NpSection" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <box class="NpSectionHeader" spacing={6}>
        <label class="NpSectionLabel" label="CONNECTIONS" />
        <box class="NpSectionLine" hexpand valign={Gtk.Align.CENTER} />
      </box>
      <box class="NpConnCards" spacing={6} marginTop={2}>
        <box class="NpConnCard" orientation={Gtk.Orientation.VERTICAL} spacing={1} hexpand>
          <label class="NpConnCardValue NpConnCardCyan" label={established} />
          <label class="NpConnCardLabel" label="Established" />
        </box>
        <box class="NpConnCard" orientation={Gtk.Orientation.VERTICAL} spacing={1} hexpand>
          <label class="NpConnCardValue" label={listening} />
          <label class="NpConnCardLabel" label="Listening" />
        </box>
        <box class="NpConnCard" orientation={Gtk.Orientation.VERTICAL} spacing={1} hexpand>
          <label class="NpConnCardValue" label={openPorts} />
          <label class="NpConnCardLabel" label="Open Ports" />
        </box>
      </box>
    </box>
  )
}
