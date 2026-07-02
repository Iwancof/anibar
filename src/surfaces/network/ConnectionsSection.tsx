import { Gtk } from "ags/gtk4"
import { createMemo } from "gnim"
import type { Accessor } from "gnim"
import type { ConnectionsSnapshot } from "../../runtime/connections-source.ts"
import SectionHeader from "../../shared/ui/SectionHeader.tsx"
import StatTile from "../../shared/ui/StatTile.tsx"

export interface ConnectionsSectionProps {
  connectionsSnapshot: Accessor<ConnectionsSnapshot>
}

export default function ConnectionsSection(props: ConnectionsSectionProps) {
  const established = createMemo(() => String(props.connectionsSnapshot().established))
  const listening = createMemo(() => String(props.connectionsSnapshot().listening))
  const openPorts = createMemo(() => String(props.connectionsSnapshot().openPorts))

  return (
    <box class="NpSection" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
      <SectionHeader label="CONNECTIONS" />
      <box class="NpConnCards" spacing={6} marginTop={2}>
        <StatTile label="Established" value={established} tone="accent" />
        <StatTile label="Listening" value={listening} />
        <StatTile label="Open Ports" value={openPorts} />
      </box>
    </box>
  )
}
